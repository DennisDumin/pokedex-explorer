import { normalizeLanguage, translate } from '../i18n/i18n.js';

const GENERATION_NUMBERS = Object.freeze({
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
});

function normalizeText(value) {
  if (typeof value !== 'string') return '';

  return value.replace(/\s+/g, ' ').trim();
}

function getLocalizedText(entries, property, language) {
  const requestedLanguage = normalizeLanguage(language);

  if (!Array.isArray(entries)) {
    return translate(requestedLanguage, 'common.notAvailable');
  }

  function findLastText(languageName) {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];

      if (entry?.language?.name !== languageName) continue;

      const text = normalizeText(entry?.[property]);
      if (text) return text;
    }

    return '';
  }

  const localizedText = findLastText(requestedLanguage);
  if (localizedText) return localizedText;

  if (requestedLanguage !== 'en') {
    const englishText = findLastText('en');
    if (englishText) return englishText;
  }

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const text = normalizeText(entries[index]?.[property]);
    if (text) return text;
  }

  return translate(requestedLanguage, 'common.notAvailable');
}

function formatResourceName(resource, language = 'en') {
  const name = normalizeText(resource?.name);

  if (!name) return translate(language, 'common.notAvailable');

  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function formatLocalizedResource(resource, prefix, language) {
  const name = normalizeText(resource?.name).toLowerCase();

  if (!name) return translate(language, 'common.notAvailable');
  if (normalizeLanguage(language) === 'en') return formatResourceName(resource);

  const translationKey = `${prefix}.${name}`;
  const localizedName = translate(language, translationKey);

  return localizedName === translationKey ? formatResourceName(resource) : localizedName;
}

function formatGeneration(generation, language = 'en') {
  const name = normalizeText(generation?.name);

  if (!name) return translate(language, 'common.notAvailable');

  const match = name.match(/^generation-([ivxlcdm]+)$/i);
  if (match) {
    const romanNumber = match[1].toLowerCase();
    const generationNumber = GENERATION_NUMBERS[romanNumber];

    if (generationNumber) {
      return translate(language, `generation.${generationNumber}`);
    }

    return `Generation ${romanNumber.toUpperCase()}`;
  }

  return formatResourceName(generation, language);
}

function formatCaptureRate(captureRate, language = 'en') {
  return Number.isInteger(captureRate) && captureRate >= 0 && captureRate <= 255
    ? `${captureRate} / 255`
    : translate(language, 'common.notAvailable');
}

function getSpeciesSummary(species, language = 'en') {
  const normalizedLanguage = normalizeLanguage(language);

  return {
    genus: getLocalizedText(species?.genera, 'genus', normalizedLanguage),
    flavorText: getLocalizedText(
      species?.flavor_text_entries,
      'flavor_text',
      normalizedLanguage,
    ),
    generation: formatGeneration(species?.generation, normalizedLanguage),
    habitat: formatLocalizedResource(species?.habitat, 'habitat', normalizedLanguage),
    growthRate: formatLocalizedResource(
      species?.growth_rate,
      'growth',
      normalizedLanguage,
    ),
    captureRate: formatCaptureRate(species?.capture_rate, normalizedLanguage),
  };
}

export { getSpeciesSummary };
