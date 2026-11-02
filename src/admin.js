import { apiUrl } from "./api.js";

const state = { token: "", categories: [], items: [], orders: [] };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function message(target, text, isError = false) {
  target.textContent = text;
  target.classList.toggle("is-error", isError);
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status}).`);
  return payload;
}

function inputField(label, name, value, options = {}) {
  const tag = options.multiline ? "textarea" : "input";
  const type = options.type ?? "text";
  const direction = options.language === "ar" ? ' dir="rtl" lang="ar"' : "";
  const attributes = `name="${escapeHtml(name)}"${tag === "input" ? ` type="${type}"` : ""}${options.required ? " required" : ""}${direction}`;
  const control = tag === "textarea"
    ? `<textarea ${attributes}>${escapeHtml(value)}</textarea>`
    : `<input ${attributes} value="${escapeHtml(value)}">`;
  return `<label>${escapeHtml(label)}${control}</label>`;
}

function translatedFields(item, field, title, multiline = false) {
  return `<div class="translations"><h3>${title}</h3>${["fr", "ar", "en"].map((language) => inputField(
    `${language.toUpperCase()} ${field === "name" ? "Nom" : field === "description" ? "Description" : "Texte alternatif"}`,
    `${field}.${language}`,
    item[field]?.[language] ?? "",
    { multiline, language, required: true },
  )).join("")}</div>`;
}

function renderMenuEditor() {
  $("#menu-editor").innerHTML = state.items.map((item, index) => `
    <form class="menu-item-form" data-index="${index}">
      <div class="item-topline">
        ${inputField("Identifiant", "id", item.id, { required: true })}
        <label>Catégorie<select name="category">${state.categories.filter((category) => category.id !== "all").map((category) => `
          <option value="${escapeHtml(category.id)}"${item.category === category.id ? " selected" : ""}>${escapeHtml(category.label.fr)}</option>`).join("")}</select></label>
        ${inputField("Prix (MAD)", "price", item.price, { type: "number", required: true })}
        <div class="item-flags">
          <label class="checkbox-label"><input type="checkbox" name="popular"${item.popular ? " checked" : ""}> Populaire</label>
          <label class="checkbox-label"><input type="checkbox" name="highlight"${item.highlight ? " checked" : ""}> À la une</label>
        </div>
      </div>
      ${translatedFields(item, "name", "Nom du plat")}
      ${translatedFields(item, "description", "Description", true)}
      <div class="image-fields">
        ${inputField("Image locale (chemin sous assets/)", "image.src", item.image?.src ?? "./assets/hero/kebab-hero.jpg", { required: true })}
        <label>Type d'image<select name="image.kind"><option value="placeholder"${item.image?.kind === "placeholder" ? " selected" : ""}>Exemple</option><option value="photo"${item.image?.kind === "photo" ? " selected" : ""}>Photo</option></select></label>
      </div>
      ${translatedFields(item.image ?? {}, "alt", "Texte alternatif")}
      <button class="remove-dish" type="button" data-remove="${index}">Supprimer ce plat</button>
    </form>`).join("");
}

function readField(form, name) {
  return $(`[name="${name}"]`, form)?.value.trim() ?? "";
}

function readMenuEditor() {
  return $$(".menu-item-form").map((form) => {
    const index = Number(form.dataset.index);
    const previous = state.items[index];
    const localized = (field) => Object.fromEntries(["fr", "ar", "en"].map((language) => [
      language, readField(form, `${field}.${language}`),
    ]));
    return {
      id: readField(form, "id"),
      category: readField(form, "category"),
      price: Number(readField(form, "price")),
      popular: $("[name=popular]", form).checked,
      highlight: $("[name=highlight]", form).checked,
      extras: previous?.extras ?? [],
      name: localized("name"),
      description: localized("description"),
      image: {
        src: readField(form, "image.src"),
        kind: readField(form, "image.kind"),
        alt: localized("alt"),
      },
    };
  });
}

function renderOrders() {
  $("#order-count").textContent = String(state.orders.length);
  const statuses = [
    ["whatsapp_requested", "WhatsApp demandé"],
    ["confirmed", "Confirmée par le restaurant"],
    ["completed", "Terminée"],
    ["cancelled", "Annulée"],
  ];
  $("#orders-list").innerHTML = state.orders.length ? state.orders.map((order) => {
    const lang = order.language || "fr";
    const lines = order.items.map((item) => {
      const extras = item.extras.map((extra) => ` + ${extra.name[lang] ?? extra.name.fr}`).join("");
      return `<li>${item.quantity} × ${escapeHtml(item.name[lang] ?? item.name.fr)}${escapeHtml(extras)} · ${item.lineTotal} MAD</li>`;
    }).join("");
    return `<article class="order-record">
      <div><h3>${escapeHtml(order.customerName || "Commande sans prénom")} · ${order.total} MAD</h3>
        <p>${escapeHtml(new Date(order.createdAt).toLocaleString())} · ${order.tableNumber ? `Table ${order.tableNumber}` : "Sans numéro de table"}</p>
        <ul>${lines}</ul>${order.note ? `<p>Note : ${escapeHtml(order.note)}</p>` : ""}</div>
      <label>Statut<select data-order-status="${escapeHtml(order.id)}">${statuses.map(([value, label]) => `
        <option value="${value}"${order.status === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
    </article>`;
  }).join("") : '<p class="empty-orders">Aucune commande enregistrée.</p>';
}

async function refreshOrders() {
  const payload = await request("/api/admin/orders");
  state.orders = payload.orders;
  renderOrders();
}

$("#admin-login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("#admin-password").value;
  state.token = password;
  message($("#login-message"), "Vérification en cours…");
  try {
    const [menu] = await Promise.all([request("/api/menu"), refreshOrders()]);
    state.categories = menu.categories;
    state.items = menu.items;
    renderMenuEditor();
    $("#admin-login").hidden = true;
    $("#admin-dashboard").hidden = false;
    $("#admin-password").value = "";
  } catch (error) {
    state.token = "";
    message($("#login-message"), error.message, true);
  }
});

$("#add-dish").addEventListener("click", () => {
  const blank = { fr: "", ar: "", en: "" };
  state.items.push({
    id: `plat-${crypto.randomUUID().slice(0, 8)}`,
    category: "kebabs",
    price: 0,
    popular: false,
    highlight: false,
    extras: [],
    name: { ...blank },
    description: { ...blank },
    image: { src: "./assets/hero/kebab-hero.jpg", kind: "placeholder", alt: { ...blank } },
  });
  renderMenuEditor();
  $(".menu-item-form:last-child input[name=id]").focus();
});

$("#menu-editor").addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  if (!remove) return;
  state.items.splice(Number(remove.dataset.remove), 1);
  renderMenuEditor();
});

$("#menu-editor").addEventListener("submit", (event) => event.preventDefault());

$("#save-menu").addEventListener("click", async () => {
  const button = $("#save-menu");
  button.disabled = true;
  message($("#admin-message"), "Enregistrement…");
  try {
    const payload = await request("/api/admin/menu", {
      method: "PUT",
      body: JSON.stringify({ items: readMenuEditor() }),
    });
    state.items = payload.items;
    renderMenuEditor();
    message($("#admin-message"), "Carte enregistrée.");
  } catch (error) {
    message($("#admin-message"), error.message, true);
  } finally {
    button.disabled = false;
  }
});

$("#refresh-orders").addEventListener("click", async () => {
  try {
    await refreshOrders();
    message($("#admin-message"), "Commandes actualisées.");
  } catch (error) {
    message($("#admin-message"), error.message, true);
  }
});

$("#orders-list").addEventListener("change", async (event) => {
  const select = event.target.closest("[data-order-status]");
  if (!select) return;
  try {
    await request(`/api/admin/orders/${encodeURIComponent(select.dataset.orderStatus)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value }),
    });
    const order = state.orders.find((item) => item.id === select.dataset.orderStatus);
    if (order) order.status = select.value;
    message($("#admin-message"), "Statut mis à jour.");
  } catch (error) {
    message($("#admin-message"), error.message, true);
  }
});

function selectTab(name) {
  const menuSelected = name === "menu";
  $("#menu-panel").hidden = !menuSelected;
  $("#orders-panel").hidden = menuSelected;
  $("#tab-menu").classList.toggle("is-active", menuSelected);
  $("#tab-orders").classList.toggle("is-active", !menuSelected);
  $("#tab-menu").setAttribute("aria-selected", String(menuSelected));
  $("#tab-orders").setAttribute("aria-selected", String(!menuSelected));
}

$("#tab-menu").addEventListener("click", () => selectTab("menu"));
$("#tab-orders").addEventListener("click", () => selectTab("orders"));
$("#admin-logout").addEventListener("click", () => {
  state.token = "";
  state.items = [];
  state.orders = [];
  $("#admin-dashboard").hidden = true;
  $("#admin-login").hidden = false;
  selectTab("menu");
});
