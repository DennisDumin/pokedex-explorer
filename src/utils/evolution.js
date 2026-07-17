function getSpeciesId(url) {
  if (typeof url !== 'string') return null;

  const match = url.match(/\/pokemon-species\/(\d+)\/?$/);
  const id = Number(match?.[1]);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseEvolutionChain(evolutionChain) {
  const stages = [];

  function visit(node, depth, parentId = null) {
    const id = getSpeciesId(node?.species?.url);

    if (!id) return;

    stages[depth] ??= [];
    stages[depth].push({
      id,
      name: node.species?.name ?? '',
      parentId,
    });

    for (const evolution of node.evolves_to ?? []) {
      visit(evolution, depth + 1, id);
    }
  }

  visit(evolutionChain?.chain, 0);

  return stages;
}

function collectEvolutionIds(stages) {
  return [...new Set(stages.flat().map((pokemon) => pokemon.id))];
}

export { collectEvolutionIds, getSpeciesId, parseEvolutionChain };
