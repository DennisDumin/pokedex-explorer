const BASE_STAT_NAMES = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
];

function normalizePokemonIdentity(pokemon) {
  return {
    id: Number.isSafeInteger(pokemon?.id) && pokemon.id > 0 ? pokemon.id : null,
    name: typeof pokemon?.name === 'string' && pokemon.name.trim() ? pokemon.name : null,
  };
}

function createStatMap(pokemon) {
  const stats = new Map();

  if (!Array.isArray(pokemon?.stats)) return stats;

  for (const entry of pokemon.stats) {
    const name =
      typeof entry?.stat?.name === 'string' ? entry.stat.name.trim().toLowerCase() : '';
    const value = entry?.base_stat;

    if (!BASE_STAT_NAMES.includes(name) || !Number.isFinite(value) || value < 0) continue;

    stats.set(name, value);
  }

  return stats;
}

function getStatOutcome(leftValue, rightValue) {
  if (leftValue === null || rightValue === null) return 'unavailable';
  if (leftValue === rightValue) return 'tie';

  return leftValue > rightValue ? 'left' : 'right';
}

function createSummary(stats) {
  const summary = {
    leftWins: 0,
    rightWins: 0,
    ties: 0,
    unavailable: 0,
    winner: 'unavailable',
  };

  for (const stat of stats) {
    if (stat.outcome === 'left') summary.leftWins += 1;
    if (stat.outcome === 'right') summary.rightWins += 1;
    if (stat.outcome === 'tie') summary.ties += 1;
    if (stat.outcome === 'unavailable') summary.unavailable += 1;
  }

  const comparableStats = summary.leftWins + summary.rightWins + summary.ties;

  if (comparableStats === 0) return summary;

  if (summary.leftWins === summary.rightWins) summary.winner = 'tie';
  if (summary.leftWins > summary.rightWins) summary.winner = 'left';
  if (summary.rightWins > summary.leftWins) summary.winner = 'right';

  return summary;
}

function comparePokemonStats(leftPokemon, rightPokemon) {
  const leftStats = createStatMap(leftPokemon);
  const rightStats = createStatMap(rightPokemon);
  const stats = BASE_STAT_NAMES.map((name) => {
    const leftValue = leftStats.get(name) ?? null;
    const rightValue = rightStats.get(name) ?? null;

    return {
      name,
      leftValue,
      rightValue,
      outcome: getStatOutcome(leftValue, rightValue),
    };
  });

  return {
    left: normalizePokemonIdentity(leftPokemon),
    right: normalizePokemonIdentity(rightPokemon),
    stats,
    summary: createSummary(stats),
  };
}

export { BASE_STAT_NAMES, comparePokemonStats };
