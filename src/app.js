import {
  canUseHeroVideo, copy, categories, dishProblems, findSiteProblems, isSafeHttpUrl, menuItems, parseTableNumber, replaceMenuItems, site, switchLanguage,
} from "./config.js";
import { buildOrderMessage, createWhatsAppUrl, getCartTotals } from "./order.js";
import {
  applyDocumentLanguage, bindLanguageMenu, fillI18n, paintLanguageMenu, readLanguage, rememberLanguage, renderFooter,
} from "./shell.js";
import { apiUrl, hasBackend } from "./api.js";

const state = {
  language: site.defaultLanguage,
  tableNumber: null,
  category: "all",
  search: "",
  cart: [],
  justAdded: "",
  dialogMode: "cart",
  pendingCart: [],
  pendingOrderKey: "",
};

const elements = {};

function t(key) {
  const value = copy[state.language]?.[key] ?? copy[site.defaultLanguage]?.[key];
  if (typeof value !== "string") {
    console.error(`Missing translation: ${state.language}.${key}`);
    return "";
  }
  return value;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function formatPrice(amount) {
  return `${amount} ${site.currency}`;
}

function applyTheme() {
  for (const [name, value] of Object.entries(site.theme)) {
    document.documentElement.style.setProperty(name, value);
  }
}

function showError(message) {
  elements.error.hidden = false;
  elements.error.textContent = message;
}

function setStatus(message) {
  elements.pageStatus.hidden = !message;
  elements.pageStatus.textContent = message;
}

function applyCopy() {
  applyDocumentLanguage(state.language);
  rememberLanguage(state.language);
  document.title = `${site.name} — ${t("pageTitle")}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("metaDescription"));
  fillI18n(state.language);
  paintLanguageMenu(state.language);
  renderFooter(state.language);
  elements.menuNotice.hidden = site.menuConfirmed;
  elements.heroCaption.hidden = site.media.heroPosterKind === "photo";
}

let catalogChecked = false;

function usableItems() {
  if (!catalogChecked) {
    catalogChecked = true;
    const problems = findSiteProblems();
    if (problems.length) {
      console.error(problems);
      showError(t("loadError"));
    }
  }
  return menuItems.filter((item) => dishProblems(item, categories, site.supportedLanguages).length === 0);
}

function bindImages(root) {
  root.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => {
      const visual = image.closest(".dish-visual");
      if (!visual) return;
      visual.classList.add("image-failed");
      image.remove();
    }, { once: true });
  });
}

function dishById(id) {
  return menuItems.find((item) => item.id === id) ?? null;
}

function orderMessage(cart = state.cart) {
  return buildOrderMessage({
    restaurantName: site.name,
    tableNumber: state.tableNumber,
    cart,
    items: menuItems,
    customerName: elements.customerName.value,
    note: elements.note.value,
    language: state.language,
    currency: site.currency,
  });
}

async function recordOrder(cart, requestKey) {
  const response = await fetch(apiUrl("/api/orders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestKey,
      language: state.language,
      tableNumber: state.tableNumber,
      customerName: elements.customerName.value,
      note: elements.note.value,
      items: cart.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        extraIds: line.extraIds ?? [],
      })),
    }),
  });
  if (!response.ok) throw new Error(`Order API returned ${response.status}.`);
}

async function loadServerMenu() {
  if (!hasBackend) return;
  try {
    const response = await fetch(apiUrl("/api/menu"), { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    if (!Array.isArray(payload.items)) return;
    replaceMenuItems(payload.items);
    render();
  } catch (error) {
    console.warn("Using the bundled menu because the backend is unavailable.", error);
  }
}

function revealFallback(hint) {
  elements.orderMessage.hidden = false;
  elements.reminder.textContent = hint;
  setStatus(hint);
}

function openWhatsApp(cart) {
  const retryingMessage = elements.dialog.open && state.dialogMode === "message";
  state.pendingCart = cart;
  if (hasBackend && cart.length) {
    if (!retryingMessage) state.pendingOrderKey = crypto.randomUUID();
    recordOrder(cart, state.pendingOrderKey)
      .then(() => setStatus(t("orderSaved")))
      .catch((error) => {
        console.error(error);
        setStatus(t("orderSaveFailed"));
      });
  }
  const message = orderMessage(cart);
  elements.orderMessage.value = message;
  const url = createWhatsAppUrl(site.whatsappNumber, message);
  if (!url) {
    if (state.dialogMode !== "cart" || !elements.dialog.open) openMessageDialog(message);
    revealFallback(t("numberMissing"));
    return;
  }
  const popup = window.open(url, "_blank", "noopener,noreferrer");
  if (!popup) {
    if (!elements.dialog.open) openMessageDialog(message);
    revealFallback(t("openHint"));
    return;
  }
  if (elements.dialog.open) elements.dialog.close();
  setStatus(t("sendReminder"));
}

function renderCartDialog() {
  elements.dialogTitle.textContent = t("reviewTitle");
  elements.reminder.textContent = t("reviewHelp");
  elements.customerFields.hidden = false;
  elements.reviewBlock.hidden = false;
  elements.whatsappButton.hidden = false;
  elements.whatsappButton.textContent = t("review");
  elements.copyButton.textContent = t("copyMessage");
  elements.closeButton.setAttribute("aria-label", t("close"));
  elements.closeButton.textContent = "×";
  elements.messageLabel.textContent = t("messageLabel");
  const { lines, subtotal, total } = getCartTotals(state.cart, menuItems);
  if (!lines.length) {
    elements.reviewBlock.innerHTML = `<p class="cart-empty">${escapeHtml(t("cartEmpty"))}</p><p>${escapeHtml(t("cartHint"))}</p>`;
    return;
  }
  elements.reviewBlock.innerHTML = `
    <ul class="cart-lines">${lines.map((line, index) => {
      const extras = [...new Set(line.extraIds)]
        .map((id) => (line.item.extras ?? []).find((extra) => extra.id === id))
        .filter(Boolean);
      return `<li>
        <div>
          <strong>${line.quantity} × ${escapeHtml(line.item.name[state.language])}</strong>
          ${extras.length ? `<span>${extras.map((extra) => escapeHtml(extra.name[state.language])).join(" · ")}</span>` : ""}
          <small>${escapeHtml(formatPrice(line.unitPrice))} × ${line.quantity}</small>
        </div>
        <b dir="ltr">${escapeHtml(formatPrice(line.lineTotal))}</b>
        <div class="quantity-control" role="group" aria-label="${escapeHtml(t("quantity"))}: ${escapeHtml(line.item.name[state.language])}">
          <button type="button" data-quantity="-1" data-index="${index}" aria-label="${escapeHtml(t("decrease"))}">−</button>
          <span>${line.quantity}</span>
          <button type="button" data-quantity="1" data-index="${index}" aria-label="${escapeHtml(t("increase"))}">+</button>
        </div>
        <button class="text-button" type="button" data-remove="${index}">${escapeHtml(t("remove"))}</button>
      </li>`;
    }).join("")}</ul>
    <div class="totals">
      <div><span>${escapeHtml(t("subtotal"))}</span><strong dir="ltr">${escapeHtml(formatPrice(subtotal))}</strong></div>
      <div class="total-row"><span>${escapeHtml(t("total"))}</span><strong dir="ltr">${escapeHtml(formatPrice(total))}</strong></div>
    </div>`;
}

function openCartDialog() {
  state.dialogMode = "cart";
  elements.orderMessage.hidden = true;
  renderCartDialog();
  if (!elements.dialog.open) elements.dialog.showModal();
}

function openMessageDialog(message) {
  state.dialogMode = "message";
  elements.customerFields.hidden = true;
  elements.reviewBlock.hidden = true;
  elements.dialogTitle.textContent = t("whatsappCta");
  elements.orderMessage.hidden = false;
  elements.orderMessage.value = message;
  elements.whatsappButton.hidden = !createWhatsAppUrl(site.whatsappNumber, message);
  elements.whatsappButton.textContent = t("whatsappCta");
  elements.copyButton.textContent = t("copyMessage");
  elements.closeButton.setAttribute("aria-label", t("close"));
  elements.messageLabel.textContent = t("messageLabel");
  elements.reminder.textContent = t("numberMissing");
  if (!elements.dialog.open) elements.dialog.showModal();
}

function renderTablePill() {
  elements.tablePill.hidden = !state.tableNumber;
  elements.tablePill.textContent = state.tableNumber ? `${t("tableChip")} ${state.tableNumber}` : "";
}

function formatLocalPhone(digits) {
  const local = String(digits).startsWith("212") ? `0${String(digits).slice(3)}` : String(digits);
  return local.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

function placeExternalLink(node, href, label) {
  if (!node) return;
  const ready = isSafeHttpUrl(href);
  node.hidden = !ready;
  if (!ready) return;
  node.href = href;
  node.textContent = label;
}

function renderVisit() {
  elements.address.textContent = site.address[state.language] ?? site.address[site.defaultLanguage];
  if (elements.phoneLink) {
    const ready = /^\d+$/.test(site.phoneNumber ?? "");
    elements.phoneLink.hidden = !ready;
    if (ready) {
      elements.phoneLink.href = `tel:+${site.phoneNumber}`;
      elements.phoneLink.textContent = `${t("phoneLabel")} ${formatLocalPhone(site.phoneNumber)}`;
    }
  }
  placeExternalLink(elements.mapsLink, site.mapsUrl, t("mapsCta"));
  placeExternalLink(elements.directionsLink, site.directionsUrl, t("directionsCta"));
  placeExternalLink(elements.facebookLink, site.facebookUrl, t("facebookCta"));
  placeExternalLink(elements.instagramLink, site.instagramUrl, t("instagramCta"));
  placeExternalLink(elements.yassirLink, site.yassirUrl, t("yassirCta"));
  if (elements.visitMap) {
    const ready = isSafeHttpUrl(site.mapEmbedUrl);
    elements.visitMap.hidden = !ready;
    if (ready) {
      elements.visitMap.src = site.mapEmbedUrl;
      elements.visitMap.title = t("mapFrameTitle");
    }
  }
  if (elements.serviceList) {
    const services = Array.isArray(site.services) ? site.services : [];
    elements.serviceList.hidden = services.length === 0;
    elements.serviceList.innerHTML = services.map((service) => `<li>${escapeHtml(service[state.language] ?? service.fr ?? "")}</li>`).join("");
  }
  const hours = Array.isArray(site.hours) ? site.hours : [];
  elements.hoursPending.hidden = hours.length > 0;
  elements.hoursList.hidden = hours.length === 0;
  elements.hoursPending.textContent = t("hoursPending");
  elements.hoursList.innerHTML = hours.map((row) => {
    const when = row.allDay ? t("openAlways") : `${row.open}–${row.close}`;
    return `<li><span>${escapeHtml(row.days?.[state.language] ?? "")}</span><strong dir="ltr">${escapeHtml(when)}</strong></li>`;
  }).join("");
  if (elements.glovoText) elements.glovoText.textContent = t("glovoText");
  placeExternalLink(elements.glovoLink, site.glovoUrl, t("glovoCta"));
}

function dishActions(item) {
  const added = state.justAdded === item.id;
  return `<div class="dish-actions">
    <button class="button button-primary" type="button" data-order="${escapeHtml(item.id)}">${escapeHtml(t("whatsappCta"))}</button>
    <button class="button button-quiet" type="button" data-add="${escapeHtml(item.id)}">${escapeHtml(added ? t("added") : t("addToCart"))}</button>
  </div>`;
}

function dishFigure(item) {
  const alt = item.image.alt[state.language] ?? item.image.alt.en;
  return `<div class="dish-visual">
    <img src="${escapeHtml(item.image.src)}" alt="${escapeHtml(alt)}" width="800" height="640" loading="lazy" decoding="async">
    ${item.popular ? `<span class="badge">${escapeHtml(t("popular"))}</span>` : ""}
  </div>`;
}

function renderFeatured() {
  const item = menuItems.find((candidate) => candidate.highlight);
  const show = item && !state.search && (state.category === "all" || state.category === item.category);
  if (!show) {
    elements.featured.hidden = true;
    elements.featured.innerHTML = "";
    return;
  }
  elements.featured.hidden = false;
  elements.featured.innerHTML = `
    <p class="eyebrow">${escapeHtml(t("featuredEyebrow"))}</p>
    <div class="featured-layout">
      ${dishFigure(item)}
      <div class="featured-copy">
        <h3>${escapeHtml(item.name[state.language])}</h3>
        <p>${escapeHtml(item.description[state.language])}</p>
        <strong class="dish-price" dir="ltr">${escapeHtml(formatPrice(item.price))}</strong>
        ${dishActions(item)}
      </div>
    </div>`;
  bindImages(elements.featured);
  watchReveals(elements.featured);
}

function renderCategories() {
  elements.categoryNav.innerHTML = categories.map((category) => `
    <button class="category-button ${state.category === category.id ? "is-active" : ""}" type="button"
      data-category="${escapeHtml(category.id)}" aria-pressed="${state.category === category.id}">
      ${escapeHtml(category.label[state.language])}
    </button>`).join("");
}

function renderMenu() {
  const query = state.search.toLocaleLowerCase(state.language);
  const visible = usableItems().filter((item) => {
    if (item.highlight && !query && (state.category === "all" || state.category === item.category)) return false;
    const inCategory = state.category === "all" || item.category === state.category;
    const haystack = `${item.name[state.language]} ${item.description[state.language]}`.toLocaleLowerCase(state.language);
    return inCategory && haystack.includes(query);
  });
  if (!visible.length) {
    elements.menuGrid.innerHTML = `<p class="empty-menu" role="status">${escapeHtml(state.search ? t("noResults") : t("emptyCategory"))}</p>`;
    return;
  }
  elements.menuGrid.innerHTML = visible.map((item) => `
    <article class="menu-card reveal">
      ${dishFigure(item)}
      <div class="dish-body">
        <div class="dish-heading">
          <h3>${escapeHtml(item.name[state.language])}</h3>
          <strong class="dish-price" dir="ltr">${escapeHtml(formatPrice(item.price))}</strong>
        </div>
        <p>${escapeHtml(item.description[state.language])}</p>
        ${dishActions(item)}
      </div>
    </article>`).join("");
  bindImages(elements.menuGrid);
  watchReveals(elements.menuGrid);
}

function watchReveals(root) {
  const nodes = [...root.querySelectorAll(".reveal")];
  if (root.classList.contains("reveal")) nodes.unshift(root);
  if (!nodes.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    for (const node of nodes) node.classList.add("is-in");
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.16 });
  for (const node of nodes) observer.observe(node);
}

function renderCartDock() {
  const { lines, total } = getCartTotals(state.cart, menuItems);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const visible = count > 0;
  elements.cartDock.hidden = !visible;
  document.body.classList.toggle("has-cart", visible);
  elements.cartDock.innerHTML = visible
    ? `<span>${escapeHtml(t("cartDock"))}</span><strong>${count}</strong><b dir="ltr">${escapeHtml(formatPrice(total))}</b>`
    : "";
  elements.cartDock.setAttribute("aria-label", `${t("cartDock")}: ${count}, ${formatPrice(total)}`);
}

function render() {
  applyCopy();
  renderTablePill();
  renderVisit();
  renderFeatured();
  renderCategories();
  renderMenu();
  renderCartDock();
  if (elements.dialog.open && state.dialogMode === "cart") renderCartDialog();
}

function changeQuantity(index, delta) {
  const line = state.cart[index];
  if (!line) return;
  line.quantity += delta;
  if (line.quantity < 1) state.cart.splice(index, 1);
  render();
}

function addDish(id) {
  if (!dishById(id)) return;
  const existing = state.cart.find((line) => line.itemId === id && (line.extraIds ?? []).length === 0);
  if (existing) existing.quantity += 1;
  else state.cart.push({ itemId: id, extraIds: [], quantity: 1 });
  state.justAdded = id;
  render();
  window.setTimeout(() => {
    if (state.justAdded !== id) return;
    state.justAdded = "";
    render();
  }, 1100);
}

async function copyMessage() {
  const message = orderMessage(state.dialogMode === "cart" ? state.cart : state.pendingCart);
  elements.orderMessage.value = message;
  elements.orderMessage.hidden = false;
  try {
    await navigator.clipboard.writeText(message);
    setStatus(t("copySuccess"));
    elements.reminder.textContent = t("copySuccess");
  } catch (error) {
    console.error(error);
    elements.orderMessage.focus();
    elements.orderMessage.select();
    setStatus(t("copyFailure"));
    elements.reminder.textContent = t("copyFailure");
  }
}

function bindHeroVideo() {
  const connection = navigator.connection ?? {};
  const allowed = canUseHeroVideo(site.media.heroVideoUrl, {
    smallViewport: window.matchMedia("(max-width: 480px)").matches,
    saveData: Boolean(connection.saveData),
    effectiveType: connection.effectiveType || "4g",
  });
  if (!allowed) return;
  const video = elements.heroVideo;
  const source = document.createElement("source");
  source.src = site.media.heroVideoUrl;
  source.type = site.media.heroVideoUrl.endsWith(".webm") ? "video/webm" : "video/mp4";
  video.append(source);
  video.addEventListener("canplay", () => {
    video.classList.add("is-ready");
    video.closest(".hero-media")?.classList.add("is-playing");
  }, { once: true });
  video.addEventListener("error", () => video.remove(), { once: true });
  const play = () => { video.play().catch(() => video.remove()); };
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      play();
      observer.disconnect();
    });
    observer.observe(elements.hero);
  } else {
    play();
  }
}

function cacheElements() {
  elements.error = document.querySelector("#app-error");
  elements.pageStatus = document.querySelector("#page-status");
  elements.menuNotice = document.querySelector("#menu-notice");
  elements.heroCaption = document.querySelector("#hero-caption");
  elements.hero = document.querySelector(".hero");
  elements.heroVideo = document.querySelector("#hero-video");
  elements.footerNote = document.querySelector("#footer-note");
  elements.footerYear = document.querySelector("#footer-year");
  elements.tablePill = document.querySelector("#table-pill");
  elements.address = document.querySelector("#address-line");
  elements.phoneLink = document.querySelector("#phone-link");
  elements.mapsLink = document.querySelector("#maps-link");
  elements.directionsLink = document.querySelector("#directions-link");
  elements.facebookLink = document.querySelector("#facebook-link");
  elements.instagramLink = document.querySelector("#instagram-link");
  elements.visitMap = document.querySelector("#visit-map");
  elements.serviceList = document.querySelector("#service-list");
  elements.hoursList = document.querySelector("#hours-list");
  elements.hoursPending = document.querySelector("#hours-pending");
  elements.yassirLink = document.querySelector("#yassir-link");
  elements.glovoLink = document.querySelector("#glovo-link");
  elements.glovoText = document.querySelector("#glovo-text");
  elements.featured = document.querySelector("#featured");
  elements.categoryNav = document.querySelector("#category-nav");
  elements.menuGrid = document.querySelector("#menu-grid");
  elements.cartDock = document.querySelector("#cart-dock");
  elements.dialog = document.querySelector("#order-dialog");
  elements.dialogTitle = document.querySelector("#dialog-title");
  elements.customerFields = document.querySelector("#customer-fields");
  elements.customerName = document.querySelector("#customer-name");
  elements.note = document.querySelector("#customer-note");
  elements.reviewBlock = document.querySelector("#review-block");
  elements.whatsappButton = document.querySelector("#whatsapp-button");
  elements.copyButton = document.querySelector("#copy-button");
  elements.closeButton = document.querySelector("#close-order");
  elements.orderMessage = document.querySelector("#order-message");
  elements.messageLabel = document.querySelector("#message-label");
  elements.reminder = document.querySelector("#dialog-help");
}

function readEntryState() {
  const params = new URLSearchParams(window.location.search);
  state.tableNumber = parseTableNumber(params.get("table"));
  state.language = readLanguage(window.location.search);
}

function bindEvents() {
  bindLanguageMenu((language) => {
    if (!switchLanguage(state, language)) return;
    render();
  });

  document.querySelector("#menu-search").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderFeatured();
    renderMenu();
  });

  for (const opener of document.querySelectorAll("[data-whatsapp-open]")) {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      openWhatsApp([]);
    });
  }

  document.querySelector("main").addEventListener("click", (event) => {
    const category = event.target.closest("[data-category]");
    if (category) {
      state.category = category.dataset.category;
      renderCategories();
      renderFeatured();
      renderMenu();
      return;
    }
    const order = event.target.closest("[data-order]");
    if (order) {
      openWhatsApp([{ itemId: order.dataset.order, extraIds: [], quantity: 1 }]);
      return;
    }
    const add = event.target.closest("[data-add]");
    if (add) addDish(add.dataset.add);
  });

  elements.cartDock.addEventListener("click", openCartDialog);
  elements.whatsappButton.addEventListener("click", () => {
    openWhatsApp(state.dialogMode === "cart" ? state.cart : state.pendingCart);
  });
  elements.copyButton.addEventListener("click", () => { copyMessage(); });
  elements.closeButton.addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("click", (event) => {
    const quantity = event.target.closest("[data-quantity]");
    if (quantity) {
      changeQuantity(Number(quantity.dataset.index), Number(quantity.dataset.quantity));
      return;
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      state.cart.splice(Number(remove.dataset.remove), 1);
      render();
    }
  });
}

function scrollMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function scrollToTarget(target, hash) {
  target.scrollIntoView({ behavior: scrollMotion(), block: "start" });
  if (hash) history.pushState(null, "", hash);
}

function bindPageMotion() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link || link.hasAttribute("data-whatsapp-open")) return;
    const hash = link.getAttribute("href");
    const target = hash ? document.querySelector(hash) : null;
    if (!target) return;
    event.preventDefault();
    scrollToTarget(target, hash);
  });

  const topButton = document.querySelector("#to-top");
  if (!topButton) return;
  const update = () => { topButton.hidden = window.scrollY < 480; };
  update();
  window.addEventListener("scroll", update, { passive: true });
  topButton.addEventListener("click", () => {
    const target = document.querySelector("#top");
    if (target) scrollToTarget(target, "#top");
  });
}

function bindHeaderSettle() {
  const header = document.querySelector(".site-header");
  if (!header || document.body.dataset.page !== "menu") return;
  const update = () => header.classList.toggle("is-settled", window.scrollY > 48);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function start() {
  cacheElements();
  applyTheme();
  readEntryState();
  bindEvents();
  bindHeaderSettle();
  bindPageMotion();
  render();
  loadServerMenu();
  bindHeroVideo();
}

if (typeof document !== "undefined") {
  try {
    start();
  } catch (error) {
    console.error(error);
    const alert = document.querySelector("#app-error");
    if (alert) {
      alert.hidden = false;
      alert.textContent = copy[site.defaultLanguage].loadError;
    }
  }
}
