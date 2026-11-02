"""Static server for Zaïm Kebab. Unknown addresses return 404.html."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import secrets
import socket
import sys
from urllib.parse import unquote, urlsplit

from backend import ApiError, Database, verify_admin_token

ROOT = Path(__file__).resolve().parent
MISSING = ROOT / "404.html"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        if urlsplit(path).path == "/admin":
            return str(ROOT / "admin.html")
        return super().translate_path(path)

    def log_message(self, format, *args):
        # A closed terminal makes stderr writes fail. That used to abort the
        # response before any bytes were sent, so the browser reported ERR_FAILED.
        try:
            super().log_message(format, *args)
        except OSError:
            return

    def send_error(self, code, message=None, explain=None):
        if code != 404 or not MISSING.is_file():
            super().send_error(code, message, explain)
            return
        body = b"" if self.command == "HEAD" else MISSING.read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(MISSING.stat().st_size))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        if urlsplit(self.path).path.startswith("/api/"):
            origin = self.headers.get("Origin", "").rstrip("/")
            if origin and origin in getattr(self.server, "cors_origins", ()):
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
        super().end_headers()

    def read_json(self):
        if self.headers.get_content_type() != "application/json":
            raise ApiError(415, "Content-Type must be application/json.")
        raw_length = self.headers.get("Content-Length", "")
        if not raw_length.isdigit():
            raise ApiError(400, "A valid Content-Length header is required.")
        length = int(raw_length)
        if length > 256_000:
            raise ApiError(413, "Request body is too large.")
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ApiError(400, "Request body must be valid JSON.") from error

    def require_admin(self):
        scheme, separator, token = self.headers.get("Authorization", "").partition(" ")
        if (not separator or scheme.lower() != "bearer"
                or not verify_admin_token(token, self.server.admin_password)):
            raise ApiError(401, "Admin password is missing or incorrect.")

    def handle_api(self, callback):
        try:
            callback()
        except ApiError as error:
            self.send_json(error.status, {"error": error.message})
        except OSError:
            self.send_json(500, {"error": "The backend could not access its database."})
        except Exception:
            self.send_json(500, {"error": "An unexpected backend error occurred."})

    def do_GET(self):
        path = urlsplit(self.path).path
        if not path.startswith("/api/"):
            super().do_GET()
            return

        def respond():
            if path == "/api/menu":
                self.send_json(200, self.server.backend.get_menu())
                return
            if path == "/api/health":
                self.send_json(200, {"status": "ok"})
                return
            if path == "/api/admin/orders":
                self.require_admin()
                self.send_json(200, {"orders": self.server.backend.list_orders()})
                return
            raise ApiError(404, "API route not found.")

        self.handle_api(respond)

    def do_OPTIONS(self):
        if not urlsplit(self.path).path.startswith("/api/"):
            self.send_error(404)
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_POST(self):
        path = urlsplit(self.path).path
        if path != "/api/orders":
            if path.startswith("/api/"):
                self.send_json(404, {"error": "API route not found."})
            else:
                self.send_error(404)
            return

        def respond():
            order = self.server.backend.create_order(self.read_json())
            self.send_json(201, {"order": order})

        self.handle_api(respond)

    def do_PUT(self):
        if urlsplit(self.path).path != "/api/admin/menu":
            self.send_json(404, {"error": "API route not found."})
            return

        def respond():
            self.require_admin()
            payload = self.read_json()
            if not isinstance(payload, dict):
                raise ApiError(400, "Request body must be an object.")
            items = self.server.backend.replace_menu(payload.get("items"))
            self.send_json(200, {"items": items})

        self.handle_api(respond)

    def do_PATCH(self):
        prefix = "/api/admin/orders/"
        path = urlsplit(self.path).path
        if not path.startswith(prefix):
            self.send_json(404, {"error": "API route not found."})
            return

        def respond():
            self.require_admin()
            payload = self.read_json()
            if not isinstance(payload, dict):
                raise ApiError(400, "Request body must be an object.")
            order_id = unquote(path[len(prefix):])
            result = self.server.backend.set_order_status(order_id, payload.get("status"))
            self.send_json(200, {"order": result})

        self.handle_api(respond)


class Server(ThreadingHTTPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = True

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        # Skip HTTPServer's reverse DNS lookup. On Windows getfqdn("::") can
        # stall startup for a long time before the port starts listening.
        if self.allow_reuse_address:
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.socket.bind(self.server_address)
        self.server_address = self.socket.getsockname()
        self.server_name = "localhost"
        self.server_port = self.server_address[1]


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    database_path = os.environ.get("ZAIM_DATABASE_PATH")
    database = Database(database_path) if database_path else Database()
    configured_password = os.environ.get("ZAIM_ADMIN_PASSWORD", "").strip()
    if configured_password and len(configured_password) < 12:
        raise SystemExit("ZAIM_ADMIN_PASSWORD must contain at least 12 characters.")
    admin_password = configured_password or secrets.token_urlsafe(18)
    try:
        httpd = Server(("::", port), Handler)
    except OSError:
        try:
            httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
        except OSError:
            print(f"Port {port} is already in use.", flush=True)
            print("Close the other server window, or run: python serve.py 8080", flush=True)
            raise SystemExit(1)
    httpd.backend = database
    httpd.admin_password = admin_password
    httpd.cors_origins = tuple(
        origin.strip().rstrip("/")
        for origin in os.environ.get("ZAIM_CORS_ORIGINS", "").split(",")
        if origin.strip()
    )
    print(f"Zaïm Kebab on http://localhost:{port}/", flush=True)
    print(f"Admin page: http://localhost:{port}/admin", flush=True)
    print(f"SQLite database: {database.path}", flush=True)
    if not configured_password:
        print(f"Generated admin password (keep private): {admin_password}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
