import { pokemonNamesDe } from '../data/pokemon-names-de.js';
import { formatPokemonName } from '../utils/formatters.js';
import { normalizeLanguage } from './i18n.js';

function getPositiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function getResourceId(url) {
  if (typeof url !== 'string') return null;

  return getPositiveInteger(url.match(/\/(\d+)\/?$/)?.[1]);
}

function getPokemonSpeciesId(pokemon) {
  const speciesId =
    getPositiveInteger(pokemon?.species?.id) ?? getResourceId(pokemon?.species?.url);

  if (speciesId !== null) return speciesId;

  const pokemonId = getPositiveInteger(pokemon?.id);
  return pokemonId !== null && pokemonId < pokemonNamesDe.length ? pokemonId : null;
}

function getCanonicalSpeciesName(pokemon) {
  return typeof pokemon?.species?.name === 'string'
    ? pokemon.species.name.trim().toLowerCase()
    : '';
}

function getFormSuffix(pokemonName, speciesName) {
  const prefix = `${speciesName}-`;
  return pokemonName.startsWith(prefix) ? pokemonName.slice(prefix.length) : '';
}

function getLocalizedPokemonName(pokemon, language = 'en') {
  const pokemonName = typeof pokemon?.name === 'string' ? pokemon.name.trim() : '';
  const normalizedLanguage = normalizeLanguage(language);

  if (!pokemonName || normalizedLanguage !== 'de') {
    return formatPokemonName(pokemonName, normalizedLanguage);
  }

  const localizedSpeciesName = pokemonNamesDe[getPokemonSpeciesId(pokemon)];

  if (!localizedSpeciesName) {
    return formatPokemonName(pokemonName, normalizedLanguage);
  }

  const speciesName = getCanonicalSpeciesName(pokemon);

  if (!speciesName || pokemonName.toLowerCase() === speciesName) {
    return localizedSpeciesName;
  }

  const formSuffix = getFormSuffix(pokemonName.toLowerCase(), speciesName);
  return formSuffix
    ? `${localizedSpeciesName} ${formatPokemonName(formSuffix, normalizedLanguage)}`
    : formatPokemonName(pokemonName, normalizedLanguage);
}

export { getLocalizedPokemonName, getPokemonSpeciesId };
