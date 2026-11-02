import { site, switchLanguage } from "./config.js";
import {
  applyDocumentLanguage, bindLanguageMenu, fillI18n, paintLanguageMenu, readLanguage, rememberLanguage, renderFooter, text,
} from "./shell.js";

const state = { language: readLanguage(window.location.search) };

function render() {
  applyDocumentLanguage(state.language);
  rememberLanguage(state.language);
  document.title = `${site.name} — ${text(state.language, "missingTitle")}`;
  fillI18n(state.language);
  paintLanguageMenu(state.language);
  renderFooter(state.language);
}

bindLanguageMenu((language) => {
  if (!switchLanguage(state, language)) return;
  render();
});

render();
