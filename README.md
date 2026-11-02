# Zaïm Kebab

A lightweight restaurant site for Zaïm Kebab, near Casa Voyageurs. The browser stays framework-free; the local Python server provides a small SQLite-backed menu and order API.

The dishes, prices, and illustrations shipped here are examples. Replace them before calling the menu final. Set `menuConfirmed` to `true` in `src/config.js` when the owner has approved them.

## Run locally

Run the local site and backend with Python 3:

```sh
python serve.py
```

Open [http://localhost:4173/](http://localhost:4173/). The server prints the admin URL and a generated admin password at startup. Open [http://localhost:4173/admin](http://localhost:4173/admin) to edit the menu or review order requests. The page is separate from the public menu; `/admin.html` also remains available. To use your own password, set `ZAIM_ADMIN_PASSWORD` to at least 12 characters before starting the server, for example `ZAIM_ADMIN_PASSWORD='your-long-password' python serve.py`.

The SQLite database is created at `data/zaim.sqlite3` and persists menu edits and WhatsApp order attempts between restarts. The initial menu is seeded from `data/menu.json`. A table QR uses [http://localhost:4173/menu?table=5](http://localhost:4173/menu?table=5). Unknown addresses return `404.html`.

Keep this backend on a trusted local machine. Do not expose the development server or its admin password to a public network. An order row records that the customer started WhatsApp ordering; it does not prove the message was sent or received. Customers still need to press Send in WhatsApp.

```sh
npm test
npm run lint
```

The tests cover both the browser-side order helpers and the Python API/SQLite behavior. Node.js 22.23.4 or newer and Python 3 are needed to run the checks and backend.

## What to edit

`src/config.js` is the door. It re-exports the menu and the sentences.

- `src/config.js` — name, colors, WhatsApp number, Maps link, Glovo link, hours, address, and hero media. Colors are repeated in `styles.css` so the first paint matches. `npm test` fails if they drift.
- `src/content.js` — interface sentences in French, Arabic, and English. Keep the three lists in step.
- `data/menu.json` — the initial categories and dishes shared by the browser and SQLite seed.
- `src/menu-data.js` — menu validation and the static fallback import.
- `backend.py` and `serve.py` — SQLite persistence and the local JSON API.
- `admin.html` and `src/admin.js` — password-protected local menu editor and order list.
- `src/order.js` — the WhatsApp message.
- `src/app.js` — rendering and the page behavior.

The logo used on the page is `assets/brand/logo.png`, made from `public/ZaimLogo.jpg`.

`whatsappNumber` and `phoneNumber` are digits only, with the country code and no plus sign. `mapsUrl`, `directionsUrl`, `facebookUrl`, and `instagramUrl` are the public https links. `yassirUrl` is the restaurant page. `glovoUrl` is the public Glovo link until a store page exists. `hours` is open all day. The hero plays `./assets/hero/intro-web.mp4`. `intro.mp4` is the 4K source and is not what the page downloads. A phone keeps the still photo. A wider screen plays the clip unless data-saver or a 2g connection is on.

## Publish

GitHub Pages hosts the frontend; Render hosts the Python API and its persistent SQLite disk. Static hosting alone does not provide saved orders or admin editing. Do not expose the development backend publicly without production-grade HTTPS, rate limiting, backups, and monitoring.

1. Push the repository to GitHub and create a Render Blueprint from `render.yaml`. The blueprint uses a persistent 1 GB disk, which may incur a Render charge. Keep the generated `ZAIM_ADMIN_PASSWORD` private.
2. After Render deploys, verify `https://<your-render-service>.onrender.com/api/health` returns `{"status":"ok"}`.
3. In the GitHub repository, add the Actions variable `BACKEND_API_URL` with the Render service origin, such as `https://zaim-food-api.onrender.com` (no trailing slash).
4. In repository Settings → Pages, select GitHub Actions as the build and deployment source, then run the `Deploy GitHub Pages` workflow.

The Pages workflow runs tests, injects the API origin, and deploys a clean static artifact. The expected project URL is `https://marlmaf.github.io/Zaim-food/`; the standalone admin page is at `/Zaim-food/admin/`. The `admin.html` route remains available too. Render CORS is restricted to the Pages origin and local development.

If the backend is intentionally not deployed, the bundled catalog remains available and WhatsApp can still open, but saved orders and admin editing will not work. Set `publicBaseUrl` to the published origin, then print one QR code per table:

```text
<PUBLISHED_BASE_URL>/menu?table=1
```

Table numbers from 1 to 999 are accepted. Without one, the order message simply has no table line. Opening WhatsApp does not confirm that the restaurant received the order. The customer still has to press Send.
