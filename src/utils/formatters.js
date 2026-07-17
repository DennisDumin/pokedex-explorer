const MAX_BASE_STAT = 255;

function formatPokemonName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    return 'Unknown Pokémon';
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

function formatHeight(heightInDecimeters) {
  const decimeters = Number(heightInDecimeters);

  if (!Number.isFinite(decimeters) || decimeters <= 0) {
    return 'Not available';
  }

  const meters = decimeters / 10;
  const totalInches = Math.round(meters * 39.3700787);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  const metricHeight =
    meters < 1 ? `${Math.round(meters * 100)} cm` : `${meters.toFixed(1)} m`;

  return `${feet}′ ${inches}″ (${metricHeight})`;
}

function formatWeight(weightInHectograms) {
  const hectograms = Number(weightInHectograms);

  if (!Number.isFinite(hectograms) || hectograms <= 0) {
    return 'Not available';
  }

  const kilograms = hectograms / 10;
  const pounds = kilograms * 2.2046226218;

  return `${pounds.toFixed(1)} lb (${kilograms.toFixed(1)} kg)`;
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
