const STANDARD_TYPE_ORDER = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
];

const DEFENSIVE_RELATIONS = [
  ['no_damage_from', 0],
  ['half_damage_from', 0.5],
  ['double_damage_from', 2],
];

function getTypeName(resource) {
  const name = resource?.name;

  return typeof name === 'string' && name.trim() !== ''
    ? name.trim().toLowerCase()
    : null;
}

function calculateTypeMatchups(typeResources) {
  const multipliers = new Map(STANDARD_TYPE_ORDER.map((type) => [type, 1]));
  const resources = Array.isArray(typeResources) ? typeResources : [];

  for (const resource of resources) {
    const damageRelations = resource?.damage_relations;

    for (const [relationName, factor] of DEFENSIVE_RELATIONS) {
      const relatedTypes = damageRelations?.[relationName];

      if (!Array.isArray(relatedTypes)) continue;

      for (const relatedType of relatedTypes) {
        const typeName = getTypeName(relatedType);

        if (!typeName) continue;

        const currentMultiplier = multipliers.get(typeName) ?? 1;
        multipliers.set(typeName, currentMultiplier * factor);
      }
    }
  }

  return Object.fromEntries(multipliers);
}

export { calculateTypeMatchups };
