import { translations } from './translations.js';

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = Object.freeze(['en', 'de']);

function normalizeLanguage(language) {
  if (typeof language !== 'string') return DEFAULT_LANGUAGE;

  const normalizedLanguage = language.trim().toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(normalizedLanguage)
    ? normalizedLanguage
    : DEFAULT_LANGUAGE;
}

function interpolate(template, parameters) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(parameters, key)
      ? String(parameters[key])
      : match,
  );
}

function translate(language, key, parameters = {}) {
  const normalizedLanguage = normalizeLanguage(language);
  const template =
    translations[normalizedLanguage]?.[key] ??
    translations[DEFAULT_LANGUAGE]?.[key] ??
    key;

  return interpolate(template, parameters);
}

function translateType(language, type) {
  const typeName = typeof type === 'string' ? type.trim().toLowerCase() : '';
  if (!typeName) return translate(language, 'common.notAvailable');

  const normalizedLanguage = normalizeLanguage(language);
  const key = `type.${typeName}`;
  return (
    translations[normalizedLanguage]?.[key] ??
    translations[DEFAULT_LANGUAGE]?.[key] ??
    typeName.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  translate,
  translateType,
};
