# Zaim Food menu demo

A mobile-first, static QR menu and WhatsApp order handoff demo. It uses plain HTML, CSS and browser-native JavaScript modules; there is no framework, build pipeline, database, or runtime dependency.

All dishes, copy and MAD prices in this project are illustrative demo content—not Zaim Food's verified menu. Arabic, French and English demo translations are provisional and should be replaced with owner-approved wording. The illustrated menu tiles are neutral placeholders, not photos of restaurant dishes.

## Run locally

Use Node.js 18 or newer for the built-in test runner. Serve the project directory over HTTP so the browser can load JavaScript modules:

```sh
python3 -m http.server 4173
```

Open [http://localhost:4173/?table=5](http://localhost:4173/?table=5), or try [http://localhost:4173/menu?table=5](http://localhost:4173/menu?table=5). The `/menu` entry redirects to the main page while preserving the table query. Without a valid table number, use the on-page table form.

Run the checks:

```sh
npm test
npm run lint
```

This static site has no compilation step or TypeScript, so a build and type-check are not applicable.

## Editable content and settings

- [`src/config.js`](./src/config.js) — restaurant name, WhatsApp contact, published base URL, supported languages, currency and accepted table-number range.
- [`src/menu-data.js`](./src/menu-data.js) — menu categories and dishes, translated names/descriptions, demo MAD prices and optional extras. Replace each `price` and extra `price` with owner-approved values. Add an optional `image` URL/path to a dish to use a real supplied image; failed image loads fall back to the neutral placeholder. Do not add allergen or dietary claims unless the restaurant verifies them.
- [`src/app.js`](./src/app.js) — provisional interface translations and menu/cart/review rendering. Keep the `fr`, `ar` and `en` interface strings complete when editing. Arabic automatically uses right-to-left layout.
- [`styles.css`](./styles.css) — layout, colors, responsive behavior and neutral visual placeholders.

The WhatsApp number is intentionally blank in `restaurantConfig.whatsappNumber`. Before launch, replace it with the restaurant-provided number in international format using digits only, including the country code (no `+`, spaces, or punctuation). It is configuration, not a secret. The page shows a copy-message fallback until a valid digits-only value is configured.

Set `restaurantConfig.publicBaseUrl` to the final published site origin and any deployment path, for example the exact URL supplied by the owner/hosting provider. It is intentionally blank; do not generate production QR codes until this value and the published URL have been confirmed. `createTableUrl()` in `src/config.js` builds a distinct `/menu?table=N` destination from that setting.

## Publish and make table QR codes

Publish the project files as a static site, preserving `index.html`, `menu/index.html`, `src/` and `styles.css`. The `/menu` entry redirects to the main page with the query string intact; verify this route on the chosen host before printing QR codes. No production domain is assumed here.

After publication, replace `<PUBLISHED_BASE_URL>` below with the confirmed base URL and make a separate QR code for each table:

```text
<PUBLISHED_BASE_URL>/menu?table=1
<PUBLISHED_BASE_URL>/menu?table=2
<PUBLISHED_BASE_URL>/menu?table=3
...
```

All QR codes use the same menu; only the positive table number changes. Table numbers from 1 through 999 are accepted. A missing or invalid number prompts the customer to enter it. A table number identifies the table for this demo; it is not authentication.

## WhatsApp order handoff

Checkout opens WhatsApp with a URL-encoded, prefilled itemized message containing the restaurant name, table, quantities, selected extras, line totals, subtotal and total. Optional name and note fields are included only when entered. The customer must review the message and tap **Send** in WhatsApp to place the order. Opening WhatsApp does not submit, confirm, or indicate that the restaurant received an order.

The cart, optional name and note exist only in the active page session; the demo does not save them to local storage or a server. If WhatsApp cannot open, the customer can copy the generated message and paste it into WhatsApp. The cart remains on the page so checkout can be retried.

## Intentionally not included

This demo has no online payment, POS integration, database, reservation or delivery workflow, customer accounts, admin dashboard, automatic/silent WhatsApp sending, order acceptance tracking, or verified restaurant details.
