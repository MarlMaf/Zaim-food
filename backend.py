"""SQLite-backed menu and order storage for the local Zaïm Kebab site."""

from contextlib import contextmanager
from datetime import datetime, timezone
import hmac
import json
from pathlib import Path
import re
import sqlite3
import uuid

ROOT = Path(__file__).resolve().parent
DEFAULT_CATALOG = ROOT / "data" / "menu.json"
DEFAULT_DATABASE = ROOT / "data" / "zaim.sqlite3"
LANGUAGES = ("fr", "ar", "en")
ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,59}$")
ORDER_STATUSES = {"whatsapp_requested", "confirmed", "completed", "cancelled"}


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def _localized_text(value, label, max_length):
    if not isinstance(value, dict):
        raise ApiError(400, f"{label} must include French, Arabic, and English text.")
    cleaned = {}
    for language in LANGUAGES:
        text = value.get(language)
        if not isinstance(text, str) or not text.strip() or len(text) > max_length:
            raise ApiError(400, f"{label} needs valid {language} text.")
        cleaned[language] = text.strip()
    return cleaned


def validate_menu(items, categories):
    if not isinstance(items, list) or not items or len(items) > 300:
        raise ApiError(400, "Menu must contain between 1 and 300 dishes.")
    category_ids = {row.get("id") for row in categories if row.get("id") != "all"}
    cleaned = []
    seen = set()
    highlights = 0
    for item in items:
        if not isinstance(item, dict):
            raise ApiError(400, "Each menu entry must be an object.")
        item_id = item.get("id")
        if not isinstance(item_id, str) or not ID_PATTERN.fullmatch(item_id) or item_id in seen:
            raise ApiError(400, "Dish IDs must be unique lowercase letters, numbers, and hyphens.")
        seen.add(item_id)
        if item.get("category") not in category_ids:
            raise ApiError(400, f"{item_id} uses an unknown category.")
        price = item.get("price")
        if isinstance(price, bool) or not isinstance(price, int) or not 0 <= price <= 100000:
            raise ApiError(400, f"{item_id} needs a whole-number price from 0 to 100000 MAD.")
        if not isinstance(item.get("popular"), bool) or not isinstance(item.get("highlight"), bool):
            raise ApiError(400, f"{item_id} needs valid popular and highlight values.")
        highlights += int(item["highlight"])
        image = item.get("image")
        if not isinstance(image, dict):
            raise ApiError(400, f"{item_id} needs an image.")
        source = image.get("src")
        if (not isinstance(source, str) or not source.startswith("./assets/")
                or ".." in source or "\\" in source or ":" in source):
            raise ApiError(400, f"{item_id} image must be a local asset under assets/.")
        if image.get("kind") not in {"placeholder", "photo"}:
            raise ApiError(400, f"{item_id} image kind must be placeholder or photo.")
        extras = item.get("extras", [])
        if not isinstance(extras, list) or len(extras) > 30:
            raise ApiError(400, f"{item_id} extras must be a list of at most 30 entries.")
        cleaned_extras = []
        extra_ids = set()
        for extra in extras:
            if not isinstance(extra, dict) or not isinstance(extra.get("id"), str):
                raise ApiError(400, f"{item_id} has an invalid extra.")
            extra_id = extra["id"]
            extra_price = extra.get("price")
            if (not ID_PATTERN.fullmatch(extra_id) or extra_id in extra_ids
                    or isinstance(extra_price, bool) or not isinstance(extra_price, int)
                    or not 0 <= extra_price <= 100000):
                raise ApiError(400, f"{item_id} has an invalid extra ID or price.")
            extra_ids.add(extra_id)
            cleaned_extras.append({
                "id": extra_id,
                "price": extra_price,
                "name": _localized_text(extra.get("name"), f"{item_id} extra name", 120),
            })
        cleaned.append({
            "id": item_id,
            "category": item["category"],
            "price": price,
            "popular": item["popular"],
            "highlight": item["highlight"],
            "extras": cleaned_extras,
            "name": _localized_text(item.get("name"), f"{item_id} name", 120),
            "description": _localized_text(item.get("description"), f"{item_id} description", 500),
            "image": {
                "src": source,
                "kind": image["kind"],
                "alt": _localized_text(image.get("alt"), f"{item_id} image alt text", 240),
            },
        })
    if highlights > 1:
        raise ApiError(400, "Only one dish can be the featured highlight.")
    return cleaned


class Database:
    def __init__(self, path=None, catalog_path=DEFAULT_CATALOG):
        self.path = Path(path or DEFAULT_DATABASE)
        self.catalog_path = Path(catalog_path)
        catalog = json.loads(self.catalog_path.read_text(encoding="utf-8"))
        self.categories = catalog["categories"]
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute("""
                CREATE TABLE IF NOT EXISTS menu_items (
                    id TEXT PRIMARY KEY,
                    position INTEGER NOT NULL,
                    payload TEXT NOT NULL
                )
            """)
            connection.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id TEXT PRIMARY KEY,
                    request_key TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    table_number INTEGER,
                    language TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    note TEXT NOT NULL,
                    status TEXT NOT NULL,
                    total INTEGER NOT NULL,
                    lines TEXT NOT NULL
                )
            """)
            count = connection.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
        if count == 0:
            self.replace_menu(catalog["menuItems"])

    @contextmanager
    def connection(self):
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def get_menu(self):
        with self.connection() as connection:
            rows = connection.execute("SELECT payload FROM menu_items ORDER BY position").fetchall()
        return {"categories": self.categories, "items": [json.loads(row["payload"]) for row in rows]}

    def replace_menu(self, items):
        cleaned = validate_menu(items, self.categories)
        with self.connection() as connection:
            connection.execute("DELETE FROM menu_items")
            connection.executemany(
                "INSERT INTO menu_items (id, position, payload) VALUES (?, ?, ?)",
                [(item["id"], index, json.dumps(item, ensure_ascii=False)) for index, item in enumerate(cleaned)],
            )
        return cleaned

    def create_order(self, payload):
        if not isinstance(payload, dict):
            raise ApiError(400, "Order must be an object.")
        language = payload.get("language", "fr")
        if language not in LANGUAGES:
            raise ApiError(400, "Unsupported order language.")
        table_number = payload.get("tableNumber")
        if table_number is not None and (isinstance(table_number, bool) or not isinstance(table_number, int) or not 1 <= table_number <= 999):
            raise ApiError(400, "Table number must be from 1 to 999.")
        customer_name = payload.get("customerName", "")
        note = payload.get("note", "")
        if not isinstance(customer_name, str) or len(customer_name) > 60:
            raise ApiError(400, "Customer name must be 60 characters or fewer.")
        if not isinstance(note, str) or len(note) > 240:
            raise ApiError(400, "Order note must be 240 characters or fewer.")
        raw_lines = payload.get("items")
        if not isinstance(raw_lines, list) or not raw_lines or len(raw_lines) > 50:
            raise ApiError(400, "Order must contain between 1 and 50 lines.")
        request_key = payload.get("requestKey")
        try:
            request_key = str(uuid.UUID(request_key)) if request_key else str(uuid.uuid4())
        except (ValueError, TypeError, AttributeError) as error:
            raise ApiError(400, "Invalid order request key.") from error

        menu = self.get_menu()["items"]
        by_id = {item["id"]: item for item in menu}
        lines = []
        total = 0
        for line in raw_lines:
            if not isinstance(line, dict):
                raise ApiError(400, "Each order line must be an object.")
            item = by_id.get(line.get("itemId"))
            quantity = line.get("quantity")
            if not item or isinstance(quantity, bool) or not isinstance(quantity, int) or not 1 <= quantity <= 99:
                raise ApiError(400, "Order contains an unknown dish or invalid quantity.")
            selected_ids = line.get("extraIds", [])
            if not isinstance(selected_ids, list) or len(selected_ids) > 30:
                raise ApiError(400, "Invalid dish extras.")
            extras = {extra["id"]: extra for extra in item["extras"]}
            if any(extra_id not in extras for extra_id in selected_ids):
                raise ApiError(400, "Order contains an unavailable extra.")
            selected = [extras[extra_id] for extra_id in dict.fromkeys(selected_ids)]
            unit_price = item["price"] + sum(extra["price"] for extra in selected)
            line_total = unit_price * quantity
            total += line_total
            lines.append({
                "itemId": item["id"],
                "name": item["name"],
                "quantity": quantity,
                "extras": selected,
                "unitPrice": unit_price,
                "lineTotal": line_total,
            })
        order_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self.connection() as connection:
            existing = connection.execute("SELECT id, created_at, total FROM orders WHERE request_key = ?", (request_key,)).fetchone()
            if existing:
                return {"id": existing["id"], "createdAt": existing["created_at"], "total": existing["total"]}
            connection.execute("""
                INSERT INTO orders
                  (id, request_key, created_at, table_number, language, customer_name, note, status, total, lines)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (order_id, request_key, created_at, table_number, language, customer_name.strip(), note.strip(),
                  "whatsapp_requested", total, json.dumps(lines, ensure_ascii=False)))
        return {"id": order_id, "createdAt": created_at, "total": total}

    def list_orders(self, limit=100):
        with self.connection() as connection:
            rows = connection.execute(
                "SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [{
            "id": row["id"],
            "createdAt": row["created_at"],
            "tableNumber": row["table_number"],
            "language": row["language"],
            "customerName": row["customer_name"],
            "note": row["note"],
            "status": row["status"],
            "total": row["total"],
            "items": json.loads(row["lines"]),
        } for row in rows]

    def set_order_status(self, order_id, status):
        if status not in ORDER_STATUSES:
            raise ApiError(400, "Unknown order status.")
        with self.connection() as connection:
            result = connection.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
        if result.rowcount == 0:
            raise ApiError(404, "Order not found.")
        return {"id": order_id, "status": status}


def verify_admin_token(token, expected):
    return bool(token) and hmac.compare_digest(token.encode("utf-8"), expected.encode("utf-8"))