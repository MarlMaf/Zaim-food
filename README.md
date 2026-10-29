# Zaim Food menu demo

A mobile-first, static QR menu and WhatsApp order handoff demo. It uses plain HTML, CSS and browser-native JavaScript modules; there is no framework, build pipeline, database, or runtime dependency.

All dishes, copy and MAD prices in this project are illustrative demo content—not Zaim Food's verified menu. Arabic, French and English demo translations are provisional and should be replaced with owner-approved wording. The current menu pictures are original vector illustrations, clearly labeled as demo imagery; they are not photos of Zaim Food's actual dishes.

The customer menu uses a full-screen, editorial-style hero with restrained entrance motion, followed by a table-first menu and a focused order summary. On phones, reduced-motion settings, or constrained connections, the hero stays on its local poster instead of loading the demo video.

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

## Temporary owner menu panel

Open [`admin.html`](./admin.html) from the **Owner menu panel** link in the menu footer (or visit `/admin.html`). Enter the product name and description in French, Arabic and English, choose an existing category, set its MAD price, and optionally add an image URL and extras. Extras use one line each in this format: `French name | Arabic name | English name | price`. Products can be removed from the current session on the panel. Returning to the menu in the same browser tab shows added products and uses them for cart and WhatsApp orders.

Products are stored only in `sessionStorage` for this browser tab and origin. They survive refreshes and same-tab navigation, but are cleared when the tab's session ends. They are **not** shared with a customer's device, another tab, or the restaurant owner on another device. This is a local demo editing convenience—not a production catalog or synchronized menu. The panel has no authentication or access control; do not expose it as a production owner dashboard. A real shared owner menu needs an authenticated server-side catalog.

## Editable content and settings

- [`src/config.js`](./src/config.js) — restaurant name, WhatsApp contact, published base URL, supported languages, currency and accepted table-number range.
- [`src/menu-data.js`](./src/menu-data.js) — built-in menu categories and dishes, translated names/descriptions, demo MAD prices and optional extras. Replace each `price` and extra `price` with owner-approved values. Each built-in dish's `image.src` points to a replaceable image, with an `image.alt` translation for each language. The current illustrations live in `assets/menu/`; replace each dish's image reference with owner-approved dish photography and update its alt text. Optional `srcSet` and `sizes` fields can point to responsive variants. Prefer AVIF or WebP around 400–800 px wide, sized for the displayed card and ideally under 150 KB per variant. Keep the 640 × 440 display ratio (or change the image dimensions in `src/app.js` and matching styles together). Failed image loads reveal a neutral fallback.
- [`src/catalog.js`](./src/catalog.js) — validates and loads owner-added products in addition to the built-in menu. The owner panel saves them under `zaim-food-owner-products-v1` in the current tab's `sessionStorage`.
- [`src/app.js`](./src/app.js) — provisional interface translations and menu/cart/review rendering. Keep the `fr`, `ar` and `en` interface strings complete when editing. Arabic automatically uses right-to-left layout.
- [`styles.css`](./styles.css) — layout, colors, responsive behavior and neutral visual placeholders.

### Hero video and poster

The hero media settings are together in `restaurantConfig.media` in [`src/config.js`](./src/config.js):

- `heroVideoUrl` is currently an 18-second excerpt of **“Abadir Nomadic Berber Pizza”** from Wikimedia Commons. This is explicitly demo footage, not filmed at Zaim Food; its visible credit links to the source. It is licensed **CC BY-SA 4.0**, attributed to **Mustafa Malo**. See the [Commons file and license details](https://commons.wikimedia.org/wiki/File:Abadir_Nomadic_Berber_PIzza.webm).
- `heroPosterUrl` points to the original, local `assets/hero/pizza-prep-demo.svg` illustration. It stays visible when video is unsupported, fails to load, is blocked from autoplay, or motion is reduced.
- `videoCreditUrl` should be changed along with the video source. For owner-approved footage, place an optimized local video under `assets/hero/` and point `heroVideoUrl` to it; update or remove the visible source credit as appropriate.

The video is muted, loops inline, and only starts after the hero comes into view on a viewport wider than 700 px. It is not downloaded when reduced motion is enabled or the browser reports a constrained/save-data connection. The demo video is externally hosted; production footage should be a short, compressed WebM or MP4 (ideally 720p or smaller and only a few MB) with a matching optimized poster. The poster loads immediately so the hero remains useful if video is unavailable.

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

This demo has no online payment, POS integration, database, reservation or delivery workflow, customer accounts, production or authenticated admin dashboard, cross-device catalog synchronization, automatic/silent WhatsApp sending, order acceptance tracking, or verified restaurant details.
