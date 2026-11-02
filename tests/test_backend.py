import json
from http.server import ThreadingHTTPServer
import threading
import tempfile
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import uuid

from backend import ApiError, Database
from serve import Handler


class BackendHttpTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = Database(Path(self.temp_dir.name) / "test.sqlite3")
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.server.backend = self.database
        self.server.admin_password = "test-password-long-enough"
        self.server.cors_origins = ("https://marlmaf.github.io",)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp_dir.cleanup()

    def request(self, path, method="GET", payload=None, token=None):
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = Request(f"{self.base_url}{path}", data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=2) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            with error:
                return error.code, json.loads(error.read())

    def test_public_menu_and_admin_protection(self):
        with urlopen(f"{self.base_url}/admin", timeout=2) as response:
            self.assertEqual(response.status, 200)
            self.assertIn("text/html", response.headers.get("Content-Type", ""))
        status, menu = self.request("/api/menu")
        self.assertEqual(status, 200)
        self.assertEqual(len(menu["items"]), 13)
        status, body = self.request("/api/admin/orders")
        self.assertEqual(status, 401)
        self.assertIn("error", body)
        status, orders = self.request("/api/admin/orders", token=self.server.admin_password)
        self.assertEqual(status, 200)
        self.assertEqual(orders["orders"], [])

    def test_api_cors_is_limited_to_the_pages_origin(self):
        allowed = Request(
            f"{self.base_url}/api/menu",
            headers={"Origin": "https://marlmaf.github.io"},
        )
        with urlopen(allowed, timeout=2) as response:
            self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://marlmaf.github.io")

        denied = Request(
            f"{self.base_url}/api/menu",
            headers={"Origin": "https://example.invalid"},
        )
        with urlopen(denied, timeout=2) as response:
            self.assertIsNone(response.headers.get("Access-Control-Allow-Origin"))

        preflight = Request(
            f"{self.base_url}/api/orders",
            headers={"Origin": "https://marlmaf.github.io", "Access-Control-Request-Method": "POST"},
            method="OPTIONS",
        )
        with urlopen(preflight, timeout=2) as response:
            self.assertEqual(response.status, 204)
            self.assertIn("POST", response.headers.get("Access-Control-Allow-Methods", ""))

    def test_order_uses_database_prices_and_is_idempotent(self):
        payload = {
            "requestKey": str(uuid.uuid4()),
            "language": "fr",
            "tableNumber": 5,
            "customerName": "Sam",
            "items": [{"itemId": "kebab-classique", "quantity": 2, "price": 1}],
        }
        first_status, first = self.request("/api/orders", method="POST", payload=payload)
        second_status, second = self.request("/api/orders", method="POST", payload=payload)
        self.assertEqual(first_status, 201)
        self.assertEqual(second_status, 201)
        self.assertEqual(first["order"]["total"], 70)
        self.assertEqual(first["order"]["id"], second["order"]["id"])
        status, orders = self.request("/api/admin/orders", token=self.server.admin_password)
        self.assertEqual(status, 200)
        self.assertEqual(len(orders["orders"]), 1)
        self.assertEqual(orders["orders"][0]["tableNumber"], 5)

    def test_admin_can_persist_menu_and_change_order_status(self):
        menu = self.database.get_menu()
        menu["items"][0]["price"] = 42
        status, saved = self.request(
            "/api/admin/menu", method="PUT", payload={"items": menu["items"]}, token=self.server.admin_password,
        )
        self.assertEqual(status, 200)
        self.assertEqual(saved["items"][0]["price"], 42)
        reloaded = Database(self.database.path)
        self.assertEqual(reloaded.get_menu()["items"][0]["price"], 42)

        _, created = self.request("/api/orders", method="POST", payload={
            "requestKey": str(uuid.uuid4()),
            "items": [{"itemId": "kebab-classique", "quantity": 2}],
        })
        order_id = created["order"]["id"]
        status, updated = self.request(
            f"/api/admin/orders/{order_id}", method="PATCH", payload={"status": "confirmed"},
            token=self.server.admin_password,
        )
        self.assertEqual(status, 200)
        self.assertEqual(updated["order"]["status"], "confirmed")

    def test_invalid_order_and_menu_updates_are_rejected(self):
        status, error = self.request("/api/orders", method="POST", payload={
            "items": [{"itemId": "kebab-classique", "quantity": 1000}],
        })
        self.assertEqual(status, 400)
        self.assertIn("error", error)

        previous = self.database.get_menu()["items"]
        invalid = [dict(previous[0], price=-1), *previous[1:]]
        with self.assertRaises(ApiError):
            self.database.replace_menu(invalid)
        self.assertEqual(self.database.get_menu()["items"], previous)


if __name__ == "__main__":
    unittest.main()
