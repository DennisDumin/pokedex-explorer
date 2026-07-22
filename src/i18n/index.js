import { translate, translateType as translateTypeName } from './i18n.js';
import { languageStore } from '../state/language.js';

function getLanguage() {
  return languageStore.getLanguage();
}

function t(key, parameters) {
  return translate(getLanguage(), key, parameters);
}

function translateType(type) {
  return translateTypeName(getLanguage(), type);
}

function onLanguageChange(subscriber) {
  return languageStore.subscribe(subscriber);
}

export { getLanguage, onLanguageChange, t, translateType };
