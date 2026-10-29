import { restaurantConfig, parseTableNumber, shouldLoadHeroVideo, switchLanguage } from "./config.js";
import { categories, menuItems as demoMenuItems } from "./menu-data.js";
import { loadMenuCatalog } from "./catalog.js";
import { buildOrderMessage, createWhatsAppUrl, getCartTotals } from "./order.js";

let menuItems = demoMenuItems;
let catalogReadError = false;

const translations = {
  fr: {
    tagline: "Le menu, à votre rythme.", welcome: "Les bonnes choses se partagent.",
    demoWelcome: "Parcourez le menu démo, composez votre commande et envoyez-la via WhatsApp.",
    demoPrice: "Prix et contenu illustratifs", language: "Langue", menu: "Le menu",
    menuIntro: "Une envie en tête ?", search: "Rechercher un plat", searchLabel: "Rechercher dans le menu",
    extras: "Personnalisez", add: "Ajouter", added: "Ajouté", emptyCategory: "Aucun plat dans cette catégorie pour le moment.",
    noResults: "Aucun plat ne correspond à cette recherche.", table: "Votre table", tableMissing: "Choisissez votre table pour commencer",
    tableHelp: "Indiquez le numéro affiché sur votre table.", tableNumber: "Numéro de table",
    saveTable: "Valider", tableError: "Saisissez un numéro de table entre 1 et 999.",
    cart: "Votre commande", cartEmpty: "Votre panier est encore vide.", cartHint: "Les plats ajoutés apparaîtront ici.",
    quantity: "Quantité", remove: "Retirer", subtotal: "Sous-total", total: "Total",
    review: "Relire ma commande", close: "Fermer", reviewTitle: "Un dernier coup d’œil",
    reviewHelp: "Vérifiez votre commande avant de continuer vers WhatsApp.",
    customerName: "Votre prénom (facultatif)", note: "Une note pour le restaurant (facultatif)",
    notePlaceholder: "Écrivez une courte note", whatsapp: "Continuer sur WhatsApp",
    sendReminder: "WhatsApp s’ouvrira avec votre message prérempli. Appuyez sur « Envoyer » dans WhatsApp pour transmettre la commande. L’ouverture de WhatsApp ne confirme pas la réception.",
    numberMissing: "Le numéro WhatsApp du restaurant n’est pas encore configuré. Vous pouvez copier le message ci-dessous.",
    copyMessage: "Copier le message", copyReady: "Message prêt à copier.", copySuccess: "Message copié. Collez-le dans la conversation WhatsApp du restaurant, puis appuyez sur Envoyer.",
    copyFailure: "La copie automatique n’a pas fonctionné. Sélectionnez et copiez le texte ci-dessous, puis collez-le dans WhatsApp.",
    openHint: "Si WhatsApp ne s’ouvre pas, copiez le message et collez-le dans WhatsApp.",
    itemCount: "articles", demoLabel: "DÉMO", provisional: "Traductions provisoires", extrasPrice: "en plus",
    addToCart: "Ajouter au panier", cartButton: "Voir la commande", emptyMenu: "Le menu est en préparation.",
    skipMenu: "Aller au menu", categoryLabel: "Catégories du menu", menuSection: "02 / LA CARTE",
    orderSection: "03 / VOTRE SÉLECTION", reviewSection: "04 / RÉCAPITULATIF",
    demoNotice: "Menu de démonstration — les plats, textes et prix sont illustratifs.",
    tableLink: "Choisir ma table", tableMenu: "Découvrir la carte", searchHint: "TROUVER",
    primaryNavigation: "Navigation principale",
    scrollExplore: "DÉFILER POUR EXPLORER", orderIntro: "Votre sélection, votre table, votre rythme.",
    footerDemo: "Menu de démonstration — contenu à valider par le restaurant.",
    reviewTable: "Table", closeReview: "Fermer", countLabel: "articles", cartShortcut: "Voir la commande",
    demoImage: "Illustration de démonstration",
    heroMediaCredit: "Vidéo démo : « Abadir Nomadic Berber Pizza », Mustafa Malo · CC BY-SA 4.0 · non filmée chez Zaim Food",
    manageMenu: "Gestion propriétaire", catalogReadError: "Les produits de cette session n’ont pas pu être chargés. Le menu de démonstration est affiché.",
  },
  ar: {
    tagline: "قائمتك، على راحتك.", welcome: "الطعام يجمعنا.",
    demoWelcome: "تصفّح القائمة التجريبية، اختر طلبك وأرسله عبر واتساب.",
    demoPrice: "الأسعار والمحتوى للتوضيح", language: "اللغة", menu: "القائمة",
    menuIntro: "ماذا تشتهي اليوم؟", search: "ابحث عن طبق", searchLabel: "البحث في القائمة",
    extras: "أضف ما تحب", add: "أضف", added: "تمت الإضافة", emptyCategory: "لا توجد أطباق في هذا القسم حالياً.",
    noResults: "لا توجد أطباق تطابق بحثك.", table: "طاولتك", tableMissing: "اختر رقم الطاولة للبدء",
    tableHelp: "أدخل الرقم الظاهر على طاولتك.", tableNumber: "رقم الطاولة",
    saveTable: "تأكيد", tableError: "أدخل رقم طاولة من 1 إلى 999.",
    cart: "طلبك", cartEmpty: "سلتك فارغة حالياً.", cartHint: "ستظهر الأطباق التي تضيفها هنا.",
    quantity: "الكمية", remove: "إزالة", subtotal: "المجموع الفرعي", total: "الإجمالي",
    review: "مراجعة الطلب", close: "إغلاق", reviewTitle: "مراجعة أخيرة",
    reviewHelp: "راجع طلبك قبل المتابعة إلى واتساب.",
    customerName: "اسمك الأول (اختياري)", note: "ملاحظة للمطعم (اختياري)",
    notePlaceholder: "اكتب ملاحظة قصيرة", whatsapp: "المتابعة إلى واتساب",
    sendReminder: "سيفتح واتساب برسالة جاهزة للمراجعة. اضغط «إرسال» في واتساب لإرسال الطلب. فتح واتساب لا يؤكد استلام المطعم للطلب.",
    numberMissing: "لم يتم إعداد رقم واتساب المطعم بعد. يمكنك نسخ الرسالة أدناه.",
    copyMessage: "نسخ الرسالة", copyReady: "الرسالة جاهزة للنسخ.", copySuccess: "تم نسخ الرسالة. الصقها في محادثة المطعم على واتساب ثم اضغط إرسال.",
    copyFailure: "تعذر النسخ تلقائياً. حدد النص أدناه وانسخه ثم الصقه في واتساب.",
    openHint: "إذا لم يفتح واتساب، انسخ الرسالة والصقها في واتساب.",
    itemCount: "أصناف", demoLabel: "تجريبي", provisional: "ترجمات أولية", extrasPrice: "إضافي",
    addToCart: "أضف إلى السلة", cartButton: "عرض الطلب", emptyMenu: "القائمة قيد الإعداد.",
    skipMenu: "انتقل إلى القائمة", categoryLabel: "أقسام القائمة", menuSection: "02 / القائمة",
    orderSection: "03 / طلبك", reviewSection: "04 / المراجعة",
    demoNotice: "قائمة تجريبية — الأطباق والنصوص والأسعار أمثلة توضيحية.",
    tableLink: "اختر طاولتك", tableMenu: "اكتشف القائمة", searchHint: "ابحث",
    primaryNavigation: "التنقل الرئيسي",
    scrollExplore: "مرّر للاستكشاف", orderIntro: "اختيارك، وطاولتك، كما تحب.",
    footerDemo: "قائمة تجريبية — المحتوى بانتظار اعتماد المطعم.",
    reviewTable: "الطاولة", closeReview: "إغلاق", countLabel: "أصناف", cartShortcut: "عرض الطلب",
    demoImage: "صورة توضيحية تجريبية",
    heroMediaCredit: "فيديو تجريبي: «Abadir Nomadic Berber Pizza» لمصطفى ملو · CC BY-SA 4.0 · ليس من Zaim Food",
    manageMenu: "إدارة القائمة", catalogReadError: "تعذر تحميل منتجات هذه الجلسة. تظهر قائمة العرض التجريبية.",
  },
  en: {
    tagline: "The menu, at your pace.", welcome: "Good things are better shared.",
    demoWelcome: "Explore the demo menu, build your order and send it through WhatsApp.",
    demoPrice: "Illustrative prices & content", language: "Language", menu: "The menu",
    menuIntro: "What sounds good?", search: "Find a dish", searchLabel: "Search the menu",
    extras: "Make it yours", add: "Add", added: "Added", emptyCategory: "No dishes in this category just yet.",
    noResults: "No dishes match your search.", table: "Your table", tableMissing: "Choose your table to get started",
    tableHelp: "Enter the number shown at your table.", tableNumber: "Table number",
    saveTable: "Set table", tableError: "Enter a table number from 1 to 999.",
    cart: "Your order", cartEmpty: "Your cart is looking a little empty.", cartHint: "Dishes you add will show up here.",
    quantity: "Quantity", remove: "Remove", subtotal: "Subtotal", total: "Total",
    review: "Review your order", close: "Close", reviewTitle: "One last look",
    reviewHelp: "Check everything before continuing to WhatsApp.",
    customerName: "Your first name (optional)", note: "A note for the restaurant (optional)",
    notePlaceholder: "Write a short note", whatsapp: "Continue to WhatsApp",
    sendReminder: "WhatsApp will open with your message ready to review. Press Send in WhatsApp to place the order. Opening WhatsApp does not confirm that the restaurant received it.",
    numberMissing: "The restaurant's WhatsApp number is not configured yet. You can copy the message below.",
    copyMessage: "Copy order message", copyReady: "Your message is ready to copy.", copySuccess: "Message copied. Paste it into the restaurant's WhatsApp chat, then press Send.",
    copyFailure: "Automatic copy did not work. Select and copy the text below, then paste it into WhatsApp.",
    openHint: "If WhatsApp does not open, copy the message and paste it into WhatsApp.",
    itemCount: "items", demoLabel: "DEMO", provisional: "Provisional translations", extrasPrice: "extra",
    addToCart: "Add to order", cartButton: "View order", emptyMenu: "The menu is being prepared.",
    skipMenu: "Skip to menu", categoryLabel: "Menu categories", menuSection: "02 / THE MENU",
    orderSection: "03 / YOUR SELECTION", reviewSection: "04 / REVIEW",
    demoNotice: "Demo menu — dishes, copy and prices are illustrative.",
    tableLink: "Choose my table", tableMenu: "Explore the menu", searchHint: "FIND",
    primaryNavigation: "Main navigation",
    scrollExplore: "SCROLL TO EXPLORE", orderIntro: "Your picks, your table, your pace.",
    footerDemo: "Demo menu — content awaiting restaurant approval.",
    reviewTable: "Table", closeReview: "Close", countLabel: "items", cartShortcut: "View order",
    demoImage: "Demo illustration",
    heroMediaCredit: "Demo: “Abadir Nomadic Berber Pizza” · Mustafa Malo · CC BY-SA 4.0 · not filmed at Zaim Food",
    manageMenu: "Owner menu panel", catalogReadError: "Session products could not be loaded. The demo menu is shown.",
  },
};

const state = {
  language: restaurantConfig.defaultLanguage,
  tableNumber: parseTableNumber(new URLSearchParams(window.location.search).get("table")),
  category: "all",
  search: "",
  cart: [],
  openingWhatsApp: false,
};

const elements = {
  page: document.documentElement,
  header: document.querySelector("#site-header"),
  categoryNav: document.querySelector("#category-nav"),
  menuGrid: document.querySelector("#menu-grid"),
  search: document.querySelector("#menu-search"),
  cart: document.querySelector("#cart-content"),
  cartCount: document.querySelector("#cart-count"),
  tableForm: document.querySelector("#table-form"),
  tableInput: document.querySelector("#table-input"),
  tableStatus: document.querySelector("#table-status"),
  tableError: document.querySelector("#table-error"),
  reviewDialog: document.querySelector("#review-dialog"),
  review: document.querySelector("#review-content"),
  reviewTable: document.querySelector("#review-table"),
  nameInput: document.querySelector("#customer-name"),
  noteInput: document.querySelector("#customer-note"),
  checkoutStatus: document.querySelector("#checkout-status"),
  messageFallback: document.querySelector("#message-fallback"),
  copyButton: document.querySelector("#copy-message"),
  orderMessage: document.querySelector("#order-message"),
  whatsappButton: document.querySelector("#whatsapp-button"),
};

function t(key) {
  return translations[state.language][key];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function formatPrice(amount) {
  return `${amount} ${restaurantConfig.currency}`;
}

function renderHeader() {
  elements.header.innerHTML = `
    <a class="brand" href="#top" aria-label="${restaurantConfig.name}">
      <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
      <span class="brand-copy"><strong>${restaurantConfig.name}</strong><small>${t("tagline")}</small></span>
    </a>
    <nav class="header-nav" aria-label="${t("primaryNavigation")}">
      <a href="#menu">${t("menu")}</a>
      <a href="#table-panel">${t("table")}</a>
      <a class="header-order-link" href="#cart-section"><span id="header-cart-label">${t("cartButton")}</span><span class="header-cart-count" id="header-cart-count">0</span></a>
    </nav>
    <div class="header-tools">
      <span class="language-label">${t("language")}</span>
      <div class="language-switch" role="group" aria-label="${t("language")}">
        ${restaurantConfig.supportedLanguages.map((code) => [code, { fr: "FR", ar: "عربي", en: "EN" }[code] ?? code.toUpperCase()]).map(([code, label]) => `
          <button type="button" class="language-button ${state.language === code ? "is-active" : ""}"
            data-language="${code}" aria-pressed="${state.language === code}">${label}</button>`).join("")}
      </div>
    </div>`;
}

function renderTable() {
  const missing = !state.tableNumber;
  const tableValue = state.tableNumber ?? "";
  elements.tableStatus.innerHTML = `
    <div class="table-copy">
      <span class="table-kicker">${t("table")}</span>
      <strong>${missing ? t("tableMissing") : `#${state.tableNumber}`}</strong>
      <span>${t("tableHelp")}</span>
    </div>
    <form class="table-form ${missing ? "" : "table-form-compact"}" id="table-form">
      <label class="sr-only" for="table-input">${t("tableNumber")}</label>
      <input id="table-input" name="table" type="number" inputmode="numeric" min="1" max="${restaurantConfig.maxTableNumber}"
        value="${tableValue}" placeholder="5" aria-describedby="table-error" required>
      <button class="button button-dark" type="submit">${t("saveTable")}</button>
      <span id="table-error" class="form-error" aria-live="polite"></span>
    </form>`;
  elements.tableForm = document.querySelector("#table-form");
  elements.tableInput = document.querySelector("#table-input");
  elements.tableError = document.querySelector("#table-error");
  elements.tableForm.addEventListener("submit", setTableNumber);
}

function renderCategories() {
  elements.categoryNav.innerHTML = categories.map(({ id, label }) => `
    <button class="category-button ${state.category === id ? "is-active" : ""}" type="button"
      data-category="${id}" aria-pressed="${state.category === id}">${escapeHtml(label[state.language])}</button>`).join("");
}

function renderMenu() {
  const searchTerm = state.search.toLocaleLowerCase(state.language);
  const filtered = menuItems.filter((item) => {
    const matchesCategory = state.category === "all" || item.category === state.category;
    const searchable = `${item.name[state.language]} ${item.description[state.language]}`.toLocaleLowerCase(state.language);
    return matchesCategory && searchable.includes(searchTerm);
  });
  if (!filtered.length) {
    elements.menuGrid.innerHTML = `<p class="empty-menu" role="status">${menuItems.length ? (state.search ? t("noResults") : t("emptyCategory")) : t("emptyMenu")}</p>`;
    return;
  }

  elements.menuGrid.innerHTML = filtered.map((item, index) => `
    <article class="menu-card">
      <div class="dish-visual dish-visual-${index % 4} ${item.image ? "has-image" : ""}">
        ${item.image ? `<img class="dish-photo" src="${escapeHtml(item.image.src)}" ${item.image.srcSet ? `srcset="${escapeHtml(item.image.srcSet)}" sizes="${escapeHtml(item.image.sizes ?? "(max-width: 560px) 104px, (max-width: 820px) 50vw, 350px")}"` : ""} alt="${escapeHtml(item.image.alt[state.language] ?? item.image.alt.en)}" width="640" height="440" loading="lazy" decoding="async">` : ""}
        <div class="dish-art-placeholder" aria-hidden="true">
          <span class="dish-orbit"></span><span class="dish-center">${["✳", "◉", "✦", "◌"][index % 4]}</span>
        </div>
        ${item.image?.kind === "demo" ? `<span class="visual-caption" aria-hidden="true">${t("demoImage")}</span>` : ""}
      </div>
      <div class="dish-content">
        <div class="dish-heading">
          <h3>${escapeHtml(item.name[state.language])}</h3>
          <strong class="dish-price">${formatPrice(item.price)}</strong>
        </div>
        <p class="dish-description">${escapeHtml(item.description[state.language])}</p>
        ${item.extras.length ? `<fieldset class="extras-fieldset"><legend>${t("extras")}</legend>
          ${item.extras.map((extra) => `<label class="extra-option">
            <input type="checkbox" data-extra="${extra.id}" data-item="${item.id}">
            <span>${escapeHtml(extra.name[state.language])}</span><small>+${formatPrice(extra.price)}</small>
          </label>`).join("")}</fieldset>` : ""}
        <button class="button button-add" type="button" data-add="${item.id}">
          <span aria-hidden="true">＋</span> ${t("addToCart")}
        </button>
      </div>
    </article>`).join("");
  elements.menuGrid.querySelectorAll(".dish-photo").forEach((image) => {
    image.addEventListener("error", () => {
      const visual = image.closest(".dish-visual");
      visual.classList.add("image-failed");
      visual.setAttribute("role", "img");
      visual.setAttribute("aria-label", image.alt);
      image.remove();
    }, { once: true });
  });
}

function lineMarkup(line, index) {
  const { item, quantity, unitPrice, lineTotal, extraIds } = line;
  const extras = [...new Set(extraIds)]
    .map((id) => item.extras.find((extra) => extra.id === id))
    .filter(Boolean);
  return `<li class="cart-line">
    <div class="cart-line-heading">
      <div><h3>${escapeHtml(item.name[state.language])}</h3>
        ${extras.length ? `<p class="cart-extras">${extras.map((extra) => escapeHtml(extra.name[state.language])).join(" · ")}</p>` : ""}
        <span class="cart-unit">${formatPrice(unitPrice)} / ${state.language === "fr" ? "unité" : state.language === "ar" ? "للوحدة" : "each"}</span>
      </div>
      <strong class="line-total">${formatPrice(lineTotal)}</strong>
    </div>
    <div class="cart-line-actions">
      <div class="quantity-control" role="group" aria-label="${t("quantity")}: ${escapeHtml(item.name[state.language])}">
        <button type="button" data-quantity="-1" data-index="${index}" aria-label="${state.language === "fr" ? "Diminuer" : state.language === "ar" ? "تقليل" : "Decrease"}">−</button>
        <span aria-live="polite">${quantity}</span>
        <button type="button" data-quantity="1" data-index="${index}" aria-label="${state.language === "fr" ? "Augmenter" : state.language === "ar" ? "زيادة" : "Increase"}">＋</button>
      </div>
      <button class="text-button" type="button" data-remove="${index}">${t("remove")}</button>
    </div>
  </li>`;
}

function renderCart() {
  const totals = getCartTotals(state.cart, menuItems);
  const count = totals.lines.reduce((sum, line) => sum + line.quantity, 0);
  document.querySelector("#cart-table-label").textContent = t("table");
  document.querySelector("#cart-table").textContent = state.tableNumber ? `#${state.tableNumber}` : "—";
  elements.cartCount.textContent = String(count);
  elements.cartCount.setAttribute("aria-label", `${count} ${t("itemCount")}`);
  document.querySelector("#cart-count-word").textContent = t("countLabel");
  document.querySelector("#mobile-cart-count").textContent = String(count);
  document.querySelector("#header-cart-count").textContent = String(count);
  document.querySelector("#header-cart-count").setAttribute("aria-label", `${count} ${t("itemCount")}`);
  document.querySelector("#header-cart-label").textContent = t("cartButton");
  document.querySelector(".mobile-cart-button").setAttribute("aria-label", `${t("cartShortcut")}: ${count}`);

  if (!totals.lines.length) {
    elements.cart.innerHTML = `<div class="cart-empty"><span class="empty-bowl" aria-hidden="true">◯</span>
      <h3>${t("cartEmpty")}</h3><p>${t("cartHint")}</p></div>`;
    return;
  }
  elements.cart.innerHTML = `
    <ul class="cart-lines">${totals.lines.map(lineMarkup).join("")}</ul>
    <div class="totals">
      <div><span>${t("subtotal")}</span><strong>${formatPrice(totals.subtotal)}</strong></div>
      <div class="total-row"><span>${t("total")}</span><strong>${formatPrice(totals.total)}</strong></div>
    </div>
    <button class="button button-primary review-button" type="button" id="review-order">${t("review")}</button>`;
  document.querySelector("#review-order").addEventListener("click", openReview);
}

function renderReview() {
  const { lines, subtotal, total } = getCartTotals(state.cart, menuItems);
  elements.reviewTable.textContent = state.tableNumber ? `#${state.tableNumber}` : t("tableMissing");
  elements.review.innerHTML = `
    <ul class="review-lines">${lines.map(({ item, quantity, unitPrice, lineTotal, extraIds }) => {
      const selectedExtras = [...new Set(extraIds)]
        .map((id) => item.extras.find((extra) => extra.id === id))
        .filter(Boolean);
      return `<li><div><strong>${quantity} × ${escapeHtml(item.name[state.language])}</strong>
        ${selectedExtras.length ? `<span>${selectedExtras.map((extra) => escapeHtml(extra.name[state.language])).join(" · ")}</span>` : ""}
        <small>${formatPrice(unitPrice)} × ${quantity}</small></div><b>${formatPrice(lineTotal)}</b></li>`;
    }).join("")}</ul>
    <div class="totals review-totals">
      <div><span>${t("subtotal")}</span><strong>${formatPrice(subtotal)}</strong></div>
      <div class="total-row"><span>${t("total")}</span><strong>${formatPrice(total)}</strong></div>
    </div>`;
  elements.whatsappButton.textContent = t("whatsapp");
  elements.whatsappButton.disabled = state.openingWhatsApp;
  elements.copyButton.textContent = t("copyMessage");
  document.querySelector("#review-title").textContent = t("reviewTitle");
  document.querySelector("#review-help").textContent = t("reviewHelp");
  document.querySelector("#review-table-label").textContent = t("reviewTable");
  document.querySelector("#close-review").setAttribute("aria-label", t("closeReview"));
  document.querySelector("#send-reminder").textContent = t("sendReminder");
  document.querySelector("#name-label").textContent = t("customerName");
  document.querySelector("#note-label").textContent = t("note");
  document.querySelector("#message-label").textContent = t("copyMessage");
  elements.noteInput.placeholder = t("notePlaceholder");
  const numberMissing = !/^\d+$/.test(restaurantConfig.whatsappNumber);
  document.querySelector("#number-missing").hidden = !numberMissing;
  document.querySelector("#number-missing").textContent = t("numberMissing");
  elements.whatsappButton.hidden = numberMissing;
}

function render() {
  const language = translations[state.language] ? state.language : restaurantConfig.defaultLanguage;
  state.language = language;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.title = `${restaurantConfig.name} — ${language === "fr" ? "Menu" : language === "ar" ? "القائمة" : "Menu"}`;
  document.querySelector('meta[name="description"]').content = translations[language].demoWelcome;
  renderHeader();
  renderTable();
  renderCategories();
  renderMenu();
  renderCart();
  if (elements.reviewDialog.open) renderReview();
  document.querySelector("#welcome-title").textContent = t("welcome");
  document.querySelector("#welcome-copy").textContent = t("demoWelcome");
  document.querySelector("#demo-price-label").textContent = t("demoPrice");
  document.querySelector("#menu-title").textContent = t("menu");
  document.querySelector("#menu-intro").textContent = t("menuIntro");
  elements.search.placeholder = t("search");
  elements.search.setAttribute("aria-label", t("searchLabel"));
  document.querySelector("#cart-title").textContent = t("cart");
  document.querySelector("#cart-shortcut-label").textContent = t("cartButton");
  document.querySelector("#provisional-label").textContent = t("provisional");
  document.querySelector("#menu-eyebrow").textContent = t("menuSection");
  document.querySelector("#cart-eyebrow").textContent = t("orderSection");
  document.querySelector("#review-eyebrow").textContent = t("reviewSection");
  document.querySelector("#menu-link-label").textContent = t("menu");
  document.querySelector("#table-link-label").textContent = t("tableLink");
  document.querySelector("#table-menu-label").textContent = t("tableMenu");
  document.querySelector(".table-menu-link").setAttribute("aria-label", t("tableMenu"));
  document.querySelector("#search-hint").textContent = t("searchHint");
  document.querySelector("#scroll-label").textContent = t("scrollExplore");
  document.querySelector(".hero-scroll").setAttribute("aria-label", t("scrollExplore"));
  document.querySelector("#order-intro").textContent = t("orderIntro");
  document.querySelector("#demo-notice-copy").textContent = t("demoNotice");
  document.querySelector("#demo-notice").setAttribute("aria-label", t("demoPrice"));
  document.querySelector("#demo-tag").textContent = t("demoLabel");
  document.querySelector("#footer-demo").textContent = t("footerDemo");
  document.querySelector(".skip-link").textContent = t("skipMenu");
  document.querySelector("#category-nav").setAttribute("aria-label", t("categoryLabel"));
  document.querySelector("#table-panel").setAttribute("aria-label", t("table"));
  document.querySelector("#hero-media-credit-label").textContent = t("heroMediaCredit");
  document.querySelector("#manage-menu-link").textContent = t("manageMenu");
  document.querySelector("#catalog-warning").hidden = !catalogReadError;
  document.querySelector("#catalog-warning").textContent = catalogReadError ? t("catalogReadError") : "";
  const adminUrl = new URL("./admin.html", window.location.href);
  if (state.tableNumber) adminUrl.searchParams.set("table", String(state.tableNumber));
  document.querySelector("#manage-menu-link").href = `${adminUrl.pathname.split("/").pop()}${adminUrl.search}`;
  document.querySelector(".hero-poster").src = restaurantConfig.media.heroPosterUrl;
  document.querySelector(".hero-video").poster = restaurantConfig.media.heroPosterUrl;
  document.querySelector(".hero-media-credit").href = restaurantConfig.media.videoCreditUrl;
}

function initializeHeroVideo() {
  const hero = document.querySelector(".hero");
  const video = document.querySelector(".hero-video");
  const connection = navigator.connection;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const smallViewport = window.matchMedia("(max-width: 700px)");
  const isConstrained = () => !shouldLoadHeroVideo({
    reduceMotion: motionPreference.matches,
    smallViewport: smallViewport.matches,
    saveData: connection?.saveData ?? false,
    effectiveType: connection?.effectiveType ?? "",
  });
  if (isConstrained()) return;

  const stopVideo = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    hero.classList.remove("video-playing");
  };
  motionPreference.addEventListener("change", (event) => {
    if (event.matches) stopVideo();
  });
  smallViewport.addEventListener("change", (event) => {
    if (event.matches) stopVideo();
  });
  connection?.addEventListener?.("change", () => {
    if (isConstrained()) stopVideo();
  });

  const startVideo = () => {
    if (!hero.isConnected || video.src || isConstrained()) return;
    video.muted = true;
    video.playsInline = true;
    video.src = restaurantConfig.media.heroVideoUrl;
    video.addEventListener("error", () => {
      hero.classList.remove("video-playing");
      video.removeAttribute("src");
      video.load();
    }, { once: true });
    video.addEventListener("canplay", () => {
      video.play().then(() => hero.classList.add("video-playing")).catch(() => {
        hero.classList.remove("video-playing");
      });
    }, { once: true });
    video.load();
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      window.setTimeout(startVideo, 250);
    }, { rootMargin: "160px" });
    observer.observe(hero);
  } else {
    window.setTimeout(startVideo, 1000);
  }
}

function setTableNumber(event) {
  event.preventDefault();
  const table = parseTableNumber(elements.tableInput.value);
  if (!table) {
    elements.tableError.textContent = t("tableError");
    elements.tableInput.setAttribute("aria-invalid", "true");
    elements.tableInput.focus();
    return;
  }
  state.tableNumber = table;
  elements.tableError.textContent = "";
  const url = new URL(window.location.href);
  url.searchParams.set("table", String(table));
  window.history.replaceState(null, "", url);
  try {
    menuItems = loadMenuCatalog(window.sessionStorage);
  } catch (error) {
    catalogReadError = true;
    console.error("Could not read the owner menu from this browser session.", error);
  }
  render();
  initializeHeroVideo();
}

function addToCart(itemId, extraIds) {
  const normalizedExtras = [...new Set(extraIds)].sort();
  const existing = state.cart.find((line) => line.itemId === itemId
    && JSON.stringify([...line.extraIds].sort()) === JSON.stringify(normalizedExtras));
  if (existing) existing.quantity += 1;
  else state.cart.push({ itemId, extraIds: normalizedExtras, quantity: 1 });
  renderCart();
}

function changeQuantity(index, amount) {
  const line = state.cart[index];
  if (!line) return;
  line.quantity += amount;
  if (line.quantity < 1) state.cart.splice(index, 1);
  renderCart();
}

function openReview() {
  if (!state.cart.length) return;
  if (!state.tableNumber) {
    elements.tableError.textContent = t("tableError");
    elements.tableInput.focus();
    document.querySelector("#table-panel").scrollIntoView({ block: "center" });
    return;
  }
  elements.checkoutStatus.textContent = "";
  elements.messageFallback.hidden = true;
  renderReview();
  elements.reviewDialog.showModal();
}

function currentMessage() {
  return buildOrderMessage({
    restaurantName: restaurantConfig.name,
    tableNumber: state.tableNumber,
    cart: state.cart,
    items: menuItems,
    customerName: elements.nameInput.value,
    note: elements.noteInput.value,
    language: state.language,
    currency: restaurantConfig.currency,
  });
}

function continueToWhatsApp() {
  if (state.openingWhatsApp) return;
  const table = parseTableNumber(state.tableNumber);
  if (!table) {
    elements.reviewDialog.close();
    elements.tableError.textContent = t("tableError");
    elements.tableInput.focus();
    return;
  }
  const message = currentMessage();
  const url = createWhatsAppUrl(restaurantConfig.whatsappNumber, message);
  if (!url) {
    elements.checkoutStatus.textContent = t("numberMissing");
    elements.messageFallback.hidden = false;
    elements.orderMessage.value = message;
    elements.orderMessage.focus();
    return;
  }

  state.openingWhatsApp = true;
  renderReview();
  elements.messageFallback.hidden = false;
  elements.orderMessage.value = message;
  elements.checkoutStatus.textContent = t("openHint");
  try {
    const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!openedWindow) elements.checkoutStatus.textContent = t("openHint");
  } catch {
    state.openingWhatsApp = false;
    renderReview();
    elements.checkoutStatus.textContent = t("openHint");
    return;
  }
  window.setTimeout(() => {
    state.openingWhatsApp = false;
    if (elements.reviewDialog.open) renderReview();
  }, 1000);
}

async function copyOrderMessage() {
  const message = elements.orderMessage.value || currentMessage();
  elements.messageFallback.hidden = false;
  elements.orderMessage.value = message;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(message);
    elements.checkoutStatus.textContent = t("copySuccess");
  } catch {
    elements.orderMessage.focus();
    elements.orderMessage.select();
    const copied = document.execCommand("copy");
    elements.checkoutStatus.textContent = copied ? t("copySuccess") : t("copyFailure");
  }
}

elements.header.addEventListener("click", (event) => {
  const button = event.target.closest("[data-language]");
  if (!button) return;
  if (!switchLanguage(state, button.dataset.language)) return;
  render();
});
elements.categoryNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderMenu();
});
elements.search.addEventListener("input", () => {
  state.search = elements.search.value;
  renderMenu();
});
elements.menuGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const selectedExtras = [...elements.menuGrid.querySelectorAll(`input[data-item="${button.dataset.add}"]:checked`)]
    .map((input) => input.dataset.extra);
  addToCart(button.dataset.add, selectedExtras);
  button.classList.add("is-added");
  button.setAttribute("aria-label", `${t("added")}: ${menuItems.find((item) => item.id === button.dataset.add).name[state.language]}`);
  window.setTimeout(() => {
    if (button.isConnected) {
      button.classList.remove("is-added");
      button.setAttribute("aria-label", t("addToCart"));
    }
  }, 900);
});
elements.cart.addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");
  if (quantityButton) changeQuantity(Number(quantityButton.dataset.index), Number(quantityButton.dataset.quantity));
  if (removeButton) {
    state.cart.splice(Number(removeButton.dataset.remove), 1);
    renderCart();
  }
});
elements.whatsappButton.addEventListener("click", continueToWhatsApp);
elements.copyButton.addEventListener("click", copyOrderMessage);
document.querySelector("#close-review").addEventListener("click", () => elements.reviewDialog.close());
elements.reviewDialog.addEventListener("click", (event) => {
  if (event.target === elements.reviewDialog) elements.reviewDialog.close();
});
document.addEventListener("keydown", (event) => {
  const isTextEntry = event.target instanceof HTMLElement
    && (event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName));
  if (event.key === "/" && !event.altKey && !event.ctrlKey && !event.metaKey && !isTextEntry && !elements.reviewDialog.open) {
    event.preventDefault();
    elements.search.focus();
  }
});
elements.nameInput.addEventListener("input", () => {
  if (elements.reviewDialog.open && !elements.messageFallback.hidden) elements.orderMessage.value = currentMessage();
});
elements.noteInput.addEventListener("input", () => {
  if (elements.reviewDialog.open && !elements.messageFallback.hidden) elements.orderMessage.value = currentMessage();
});

render();
