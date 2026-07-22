import { normalizeLanguage, translate } from '../i18n/i18n.js';

const MAX_BASE_STAT = 255;

function formatPokemonName(name, language = 'en') {
  if (typeof name !== 'string' || name.trim() === '') {
    return translate(language, 'common.unknownPokemon');
  }

  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPokemonNumber(id) {
  const pokemonId = Number(id);

  if (!Number.isInteger(pokemonId) || pokemonId < 1) {
    return '#???';
  }

  return `#${String(pokemonId).padStart(3, '0')}`;
}

function formatDecimal(value, language) {
  const formattedValue = value.toFixed(1);

  return normalizeLanguage(language) === 'de'
    ? formattedValue.replace('.', ',')
    : formattedValue;
}

function formatHeight(heightInDecimeters, language = 'en') {
  const decimeters = Number(heightInDecimeters);

  if (!Number.isFinite(decimeters) || decimeters <= 0) {
    return translate(language, 'common.notAvailable');
  }

  const meters = decimeters / 10;
  const totalInches = Math.round(meters * 39.3700787);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const metricHeight =
    meters < 1
      ? `${Math.round(meters * 100)} cm`
      : `${formatDecimal(meters, language)} m`;
  const imperialHeight = `${feet}′ ${inches}″`;

  return normalizeLanguage(language) === 'de'
    ? `${metricHeight} (${imperialHeight})`
    : `${imperialHeight} (${metricHeight})`;
}

function formatWeight(weightInHectograms, language = 'en') {
  const hectograms = Number(weightInHectograms);

  if (!Number.isFinite(hectograms) || hectograms <= 0) {
    return translate(language, 'common.notAvailable');
  }

  const kilograms = hectograms / 10;
  const pounds = kilograms * 2.2046226218;

  const metricWeight = `${formatDecimal(kilograms, language)} kg`;
  const imperialWeight = `${formatDecimal(pounds, language)} lb`;

  return normalizeLanguage(language) === 'de'
    ? `${metricWeight} (${imperialWeight})`
    : `${imperialWeight} (${metricWeight})`;
}

function normalizeBaseStat(value) {
  const stat = Number(value);

  if (!Number.isFinite(stat)) return 0;

  return Math.min(Math.max((stat / MAX_BASE_STAT) * 100, 0), 100);
}

function getStatColor(value) {
  const stat = Number(value);

  if (stat >= 55) return '#2f855a';
  if (stat >= 30) return '#c05621';
  return '#c53030';
}

export {
  MAX_BASE_STAT,
  formatHeight,
  formatPokemonName,
  formatPokemonNumber,
  formatWeight,
  getStatColor,
  normalizeBaseStat,
};
