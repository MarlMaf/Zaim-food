import { restaurantConfig } from "./config.js";
import { categories } from "./menu-data.js";
import { addOwnerProduct, createOwnerProduct, readOwnerProducts, removeOwnerProduct } from "./catalog.js";

const copy = {
  en: {
    skip: "Skip to product form", brand: "Temporary owner menu", back: "View menu",
    eyebrow: "ZAIM FOOD / OWNER DEMO", title: "Add a menu product",
    intro: "Add a dish with a name and description in French, Arabic, and English. Products appear in the menu in this browser tab.",
    warning: "Temporary demo only: products are stored in this tab's session storage. They disappear when this tab's session ends and are not shared with customers, other tabs, or devices. This panel has no login or access control; do not use it as a production admin.",
    details: "Product details", category: "Menu category", categoryPlaceholder: "Choose a category",
    names: "Product name — provide all three translations", descriptions: "Short description — all three translations",
    nameFr: "French name", nameAr: "Arabic name", nameEn: "English name",
    descriptionFr: "French description", descriptionAr: "Arabic description", descriptionEn: "English description",
    price: "Price (MAD)", image: "Dish photo URL (optional)",
    imageHelp: "Use a local relative path or HTTPS URL. If omitted, the category's demo illustration is shown.",
    extras: "Optional extras (optional)", extrasPlaceholder: "Fromage | جبن | Cheese | 8",
    extrasHelp: "One per line: French name | Arabic name | English name | price in MAD.",
    add: "Add product to this session", listEyebrow: "SESSION CATALOG", products: "Products added here",
    count: "products", empty: "No owner products have been added in this tab yet.",
    remove: "Remove", added: "Product added to this tab's session menu.", removed: "Product removed from this session.",
    invalid: "Check the product fields and try again.", storageError: "Session storage is unavailable. Products could not be saved.",
    storeError: "Could not read the products in this tab. The saved menu data may be invalid.",
    demoImage: "Demo illustration",
    errorCategory: "Choose a valid menu category.", errorName: "Enter the product name in French, Arabic, and English.",
    errorDescription: "Enter the product description in French, Arabic, and English.",
    errorPrice: "Enter a price between 0 and 100000 MAD.", errorImage: "Use an HTTPS, HTTP, or relative image URL.",
    errorExtraFormat: "Write each extra as French name | Arabic name | English name | price.",
    errorExtraName: "Enter each extra name in French, Arabic, and English.", errorExtraPrice: "Enter a valid price for every extra.",
    errorDuplicate: "A product with this ID already exists.", errorInvalid: "Cannot save an invalid menu product.",
  },
  fr: {
    skip: "Aller au formulaire", brand: "Menu propriétaire temporaire", back: "Voir le menu",
    eyebrow: "ZAIM FOOD / DÉMO PROPRIÉTAIRE", title: "Ajouter un plat au menu",
    intro: "Ajoutez un plat avec son nom et sa description en français, arabe et anglais. Il apparaîtra dans le menu de cet onglet.",
    warning: "Démo temporaire uniquement : les produits sont enregistrés dans le stockage de session de cet onglet. Ils disparaissent à la fin de la session et ne sont partagés ni avec les clients, ni avec les autres onglets ou appareils. Ce panneau n'a ni connexion ni contrôle d'accès : ne l'utilisez pas comme panneau d'administration en production.",
    details: "Détails du plat", category: "Catégorie du menu", categoryPlaceholder: "Choisir une catégorie",
    names: "Nom du plat — renseignez les trois traductions", descriptions: "Description courte — les trois traductions",
    nameFr: "Nom en français", nameAr: "Nom en arabe", nameEn: "Nom en anglais",
    descriptionFr: "Description en français", descriptionAr: "Description en arabe", descriptionEn: "Description en anglais",
    price: "Prix (MAD)", image: "URL de la photo du plat (facultatif)",
    imageHelp: "Utilisez un chemin relatif local ou une URL HTTPS. Sans photo, l’illustration de démonstration de la catégorie s’affiche.",
    extras: "Suppléments (facultatif)", extrasPlaceholder: "Fromage | جبن | Cheese | 8",
    extrasHelp: "Une ligne par supplément : nom français | nom arabe | nom anglais | prix en MAD.",
    add: "Ajouter à cette session", listEyebrow: "CATALOGUE DE SESSION", products: "Plats ajoutés ici",
    count: "plats", empty: "Aucun plat propriétaire dans cet onglet pour le moment.",
    remove: "Supprimer", added: "Plat ajouté au menu de cet onglet.", removed: "Plat supprimé de cette session.",
    invalid: "Vérifiez les champs du plat et réessayez.", storageError: "Le stockage de session est indisponible. Le plat n’a pas été enregistré.",
    storeError: "Impossible de lire les plats de cet onglet. Les données enregistrées sont peut-être invalides.",
    demoImage: "Illustration de démonstration",
    errorCategory: "Choisissez une catégorie valide.", errorName: "Renseignez le nom du plat en français, arabe et anglais.",
    errorDescription: "Renseignez la description du plat en français, arabe et anglais.",
    errorPrice: "Saisissez un prix entre 0 et 100000 MAD.", errorImage: "Utilisez une URL HTTPS, HTTP ou un chemin relatif.",
    errorExtraFormat: "Chaque supplément doit suivre ce format : nom français | nom arabe | nom anglais | prix.",
    errorExtraName: "Renseignez le nom de chaque supplément en français, arabe et anglais.", errorExtraPrice: "Saisissez un prix valide pour chaque supplément.",
    errorDuplicate: "Un produit portant cet identifiant existe déjà.", errorInvalid: "Le produit ne peut pas être enregistré car il est invalide.",
  },
  ar: {
    skip: "انتقل إلى نموذج المنتج", brand: "إدارة مؤقتة للقائمة", back: "عرض القائمة",
    eyebrow: "ZAIM FOOD / لوحة تجريبية", title: "إضافة منتج إلى القائمة",
    intro: "أضف طبقاً باسمه ووصفه بالفرنسية والعربية والإنجليزية. سيظهر في قائمة هذا التبويب.",
    warning: "للتجربة المؤقتة فقط: تُحفظ المنتجات في تخزين الجلسة لهذا التبويب. تختفي عند انتهاء الجلسة ولا تتم مشاركتها مع العملاء أو التبويبات أو الأجهزة الأخرى. لا توجد حماية دخول أو صلاحيات؛ لا تستخدم هذه اللوحة كإدارة إنتاجية.",
    details: "تفاصيل المنتج", category: "قسم القائمة", categoryPlaceholder: "اختر قسماً",
    names: "اسم المنتج — أدخل الترجمات الثلاث", descriptions: "وصف قصير — باللغات الثلاث",
    nameFr: "الاسم بالفرنسية", nameAr: "الاسم بالعربية", nameEn: "الاسم بالإنجليزية",
    descriptionFr: "الوصف بالفرنسية", descriptionAr: "الوصف بالعربية", descriptionEn: "الوصف بالإنجليزية",
    price: "السعر (MAD)", image: "رابط صورة الطبق (اختياري)",
    imageHelp: "استخدم مساراً محلياً أو رابط HTTPS. عند تركه فارغاً تظهر صورة توضيحية تجريبية للقسم.",
    extras: "إضافات اختيارية", extrasPlaceholder: "Fromage | جبن | Cheese | 8",
    extrasHelp: "سطر لكل إضافة: الاسم الفرنسي | الاسم العربي | الاسم الإنجليزي | السعر بالدرهم.",
    add: "أضف إلى جلسة التصفح", listEyebrow: "قائمة الجلسة", products: "المنتجات المضافة هنا",
    count: "منتجات", empty: "لم تتم إضافة منتجات في هذا التبويب بعد.",
    remove: "حذف", added: "تمت إضافة المنتج إلى قائمة هذا التبويب.", removed: "تم حذف المنتج من الجلسة.",
    invalid: "تحقق من بيانات المنتج ثم حاول مجدداً.", storageError: "تخزين الجلسة غير متاح. لم يتم حفظ المنتج.",
    storeError: "تعذرت قراءة منتجات هذا التبويب. قد تكون البيانات المحفوظة غير صالحة.",
    demoImage: "صورة توضيحية تجريبية",
    errorCategory: "اختر قسماً صالحاً من القائمة.", errorName: "أدخل اسم المنتج بالفرنسية والعربية والإنجليزية.",
    errorDescription: "أدخل وصف المنتج بالفرنسية والعربية والإنجليزية.",
    errorPrice: "أدخل سعراً بين 0 و100000 درهم.", errorImage: "استخدم رابط HTTPS أو HTTP أو مساراً نسبياً.",
    errorExtraFormat: "اكتب كل إضافة بهذا التنسيق: الاسم الفرنسي | الاسم العربي | الاسم الإنجليزي | السعر.",
    errorExtraName: "أدخل اسم كل إضافة بالفرنسية والعربية والإنجليزية.", errorExtraPrice: "أدخل سعراً صالحاً لكل إضافة.",
    errorDuplicate: "يوجد منتج بهذا المعرّف بالفعل.", errorInvalid: "تعذر حفظ منتج غير صالح.",
  },
};

const form = document.querySelector("#product-form");
const status = document.querySelector("#admin-status");
const productList = document.querySelector("#owner-products");
const count = document.querySelector("#products-count");
const languageButtons = document.querySelectorAll("[data-admin-language]");
const categorySelect = document.querySelector("#product-category");
const tableNumber = new URLSearchParams(window.location.search).get("table");
let language = "en";
let products = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function setValue(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function setAdminLanguage(nextLanguage) {
  if (!copy[nextLanguage]) return;
  language = nextLanguage;
  const labels = copy[language];
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  languageButtons.forEach((button) => {
    const active = button.dataset.adminLanguage === language;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector(".admin-header .language-switch").setAttribute("aria-label", labels.language ?? ({
    en: "Interface language", fr: "Langue de l’interface", ar: "لغة الواجهة",
  })[language]);
  document.title = `${restaurantConfig.name} — ${language === "fr" ? "Gestion du menu" : language === "ar" ? "إدارة القائمة" : "Owner menu"}`;
  setValue("admin-skip", labels.skip);
  setValue("admin-brand-caption", labels.brand);
  setValue("back-label", labels.back);
  setValue("admin-eyebrow", labels.eyebrow);
  setValue("admin-title", labels.title);
  setValue("admin-intro-copy", labels.intro);
  setValue("session-warning", labels.warning);
  setValue("product-form-title", labels.details);
  setValue("category-label", labels.category);
  setValue("names-legend", labels.names);
  setValue("descriptions-legend", labels.descriptions);
  setValue("name-fr-label", labels.nameFr);
  setValue("name-ar-label", labels.nameAr);
  setValue("name-en-label", labels.nameEn);
  setValue("description-fr-label", labels.descriptionFr);
  setValue("description-ar-label", labels.descriptionAr);
  setValue("description-en-label", labels.descriptionEn);
  setValue("price-label", labels.price);
  setValue("image-label", labels.image);
  setValue("image-help", labels.imageHelp);
  setValue("extras-label", labels.extras);
  setValue("extras-help", labels.extrasHelp);
  setValue("products-eyebrow", labels.listEyebrow);
  setValue("products-title", labels.products);
  setValue("products-count-label", labels.count);
  setValue("products-empty", labels.empty);
  document.querySelector("#product-extras").placeholder = labels.extrasPlaceholder;
  document.querySelector("#add-product-button").textContent = labels.add;
  document.querySelector("#product-image").setAttribute("aria-describedby", "image-help");
  document.querySelector("#product-extras").setAttribute("aria-describedby", "extras-help");
  document.querySelector("#menu-return").href = returnUrl();
  document.querySelector("#back-to-menu").href = returnUrl();
  renderCategories();
  renderProducts();
}

function localizedError(error) {
  const message = error instanceof Error ? error.message : "";
  const labels = copy[language];
  if (message.includes("valid menu category")) return labels.errorCategory;
  if (message.includes("product name")) return labels.errorName;
  if (message.includes("product description")) return labels.errorDescription;
  if (message.includes("price between")) return labels.errorPrice;
  if (message.includes("image URL")) return labels.errorImage;
  if (message.includes("Write each extra as")) return labels.errorExtraFormat;
  if (message.includes("extra name")) return labels.errorExtraName;
  if (message.includes("price for every extra")) return labels.errorExtraPrice;
  if (message.includes("ID already exists")) return labels.errorDuplicate;
  if (message.includes("invalid menu product")) return labels.errorInvalid;
  return message || labels.invalid;
}

function returnUrl() {
  const url = new URL("./index.html", window.location.href);
  if (tableNumber && /^\d+$/.test(tableNumber)) url.searchParams.set("table", tableNumber);
  return `${url.pathname.split("/").pop()}${url.search}`;
}

function renderCategories() {
  const labels = copy[language];
  const selected = categorySelect.value;
  categorySelect.innerHTML = `<option value="">${escapeHtml(labels.categoryPlaceholder)}</option>`
    + categories.filter((category) => category.id !== "all").map((category) => (
      `<option value="${category.id}">${escapeHtml(category.label[language])}</option>`
    )).join("");
  if (categories.some((category) => category.id === selected)) categorySelect.value = selected;
}

function renderProducts() {
  count.textContent = String(products.length);
  document.querySelector("#products-empty").hidden = products.length > 0;
  productList.innerHTML = products.map((product) => `
    <li class="owner-product">
      <div class="owner-product-copy">
        <strong>${escapeHtml(product.name[language])}</strong>
        <span>${escapeHtml(categories.find((category) => category.id === product.category).label[language])} · ${escapeHtml(String(product.price))} ${restaurantConfig.currency}</span>
        ${product.extras.length ? `<small>${product.extras.length} ${escapeHtml(copy[language].extras.toLocaleLowerCase(language))}</small>` : ""}
      </div>
      <button class="text-button owner-remove" type="button" data-remove-product="${escapeHtml(product.id)}">${escapeHtml(copy[language].remove)}</button>
    </li>`).join("");
}

function formValues() {
  const data = new FormData(form);
  return {
    category: data.get("category"),
    price: data.get("price"),
    imageUrl: data.get("imageUrl"),
    extras: data.get("extras"),
    name: { fr: data.get("name.fr"), ar: data.get("name.ar"), en: data.get("name.en") },
    description: {
      fr: data.get("description.fr"),
      ar: data.get("description.ar"),
      en: data.get("description.en"),
    },
  };
}

function loadProducts() {
  try {
    products = readOwnerProducts(window.sessionStorage);
    return true;
  } catch (error) {
    console.error("Could not read this tab's session menu products.", error);
    status.textContent = copy[language].storeError;
    return false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  status.textContent = "";
  if (!form.reportValidity()) return;
  try {
    const product = createOwnerProduct(formValues());
    addOwnerProduct(product, window.sessionStorage);
    products = readOwnerProducts(window.sessionStorage);
    form.reset();
    renderProducts();
    status.textContent = copy[language].added;
  } catch (error) {
    console.error("Could not add an owner menu product.", error);
    status.textContent = error instanceof Error && error.name === "SecurityError"
      ? copy[language].storageError
      : error instanceof Error && /storage|quota/i.test(error.message)
        ? copy[language].storageError
        : localizedError(error);
  }
});

productList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-product]");
  if (!button) return;
  try {
    removeOwnerProduct(button.dataset.removeProduct, window.sessionStorage);
    products = readOwnerProducts(window.sessionStorage);
    renderProducts();
    status.textContent = copy[language].removed;
  } catch (error) {
    console.error("Could not remove an owner menu product.", error);
    status.textContent = copy[language].storageError;
  }
});

languageButtons.forEach((button) => button.addEventListener("click", () => {
  setAdminLanguage(button.dataset.adminLanguage);
}));

setAdminLanguage(language);
if (loadProducts()) renderProducts();
