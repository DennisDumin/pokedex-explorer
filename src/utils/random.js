const MAX_MAIN_POKEMON_ID = 10000;

function isMainPokemon(pokemon) {
  return (
    Number.isSafeInteger(pokemon?.id) &&
    pokemon.id > 0 &&
    pokemon.id < MAX_MAIN_POKEMON_ID
  );
}

function getEligiblePokemon(catalog) {
  return Array.isArray(catalog) ? catalog.filter(isMainPokemon) : [];
}

function getBoundedRandomValue(random) {
  if (typeof random !== 'function') {
    throw new TypeError('Random must be a function.');
  }

  const value = random();

  if (!Number.isFinite(value)) {
    throw new RangeError('Random must return a finite number.');
  }

  return Math.min(Math.max(value, 0), 1 - Number.EPSILON);
}

function pickRandomPokemon(catalog, random = Math.random) {
  const eligiblePokemon = getEligiblePokemon(catalog);

  if (eligiblePokemon.length === 0) return null;

  const index = Math.floor(getBoundedRandomValue(random) * eligiblePokemon.length);

  return eligiblePokemon[index];
}

function getUtcDateKey(date) {
  if (!(date instanceof Date)) {
    throw new TypeError('Date must be a Date instance.');
  }

  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Date must be valid.');
  }

  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function hashDateKey(dateKey) {
  let hash = 2166136261;

  for (let index = 0; index < dateKey.length; index += 1) {
    hash ^= dateKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickDailyPokemon(catalog, date = new Date()) {
  const eligiblePokemon = getEligiblePokemon(catalog);

  if (eligiblePokemon.length === 0) return null;

  const dateKey = getUtcDateKey(date);
  const index = hashDateKey(dateKey) % eligiblePokemon.length;

  return eligiblePokemon[index];
}

export { pickDailyPokemon, pickRandomPokemon };
