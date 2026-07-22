import { t } from '../i18n/index.js';
import { languageStore } from '../state/language.js';

let languageSwitcherInitialized = false;

function applyTranslations(root = document) {
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }

  const translatedAttributes = [
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-title', 'title'],
  ];

  for (const [dataAttribute, attribute] of translatedAttributes) {
    for (const element of root.querySelectorAll(`[${dataAttribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(dataAttribute)));
    }
  }
}

function renderLanguage(language = languageStore.getLanguage()) {
  document.documentElement.lang = language;
  document.title = t('meta.title');
  const description = document.querySelector('meta[name="description"]');
  const manifest = document.querySelector('link[rel="manifest"]');
  const languageSelect = document.getElementById('language-select');

  if (description) description.content = t('meta.description');
  if (manifest) {
    const manifestName =
      language === 'de' ? 'manifest.de.webmanifest' : 'manifest.webmanifest';
    manifest.href = new URL(manifestName, document.baseURI).href;
  }
  if (languageSelect) languageSelect.value = language;
  applyTranslations();
}

function initLanguageSwitcher() {
  if (languageSwitcherInitialized) return;

  const languageSelect = document.getElementById('language-select');

  if (!languageSelect) return;

  renderLanguage();
  languageSelect.addEventListener('change', () => {
    languageStore.setLanguage(languageSelect.value);
  });
  languageStore.subscribe(renderLanguage);
  languageSwitcherInitialized = true;
}

export { applyTranslations, initLanguageSwitcher };
