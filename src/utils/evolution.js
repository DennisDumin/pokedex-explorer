import { translate, translateType } from '../i18n/i18n.js';

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
      evolutionDetails: Array.isArray(node?.evolution_details)
        ? node.evolution_details
        : [],
      id,
      isBaby: node?.is_baby === true,
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

function formatName(value) {
  const name = typeof value === 'string' ? value : value?.name;

  if (typeof name !== 'string' || name.trim() === '') return '';

  return name
    .trim()
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function addCondition(conditions, condition) {
  if (condition && !conditions.includes(condition)) conditions.push(condition);
}

function hasMinimum(value) {
  return Number.isFinite(value) && value >= 0;
}

function formatGender(gender, language) {
  if (gender === 1) return translate(language, 'evolution.female');
  if (gender === 2) return translate(language, 'evolution.male');
  if (Number.isInteger(gender)) {
    return translate(language, 'evolution.gender', { value: gender });
  }

  return '';
}

function formatStatRelation(relation, language) {
  if (relation === 1) return translate(language, 'evolution.attackGreater');
  if (relation === 0) return translate(language, 'evolution.attackEqual');
  if (relation === -1) return translate(language, 'evolution.attackLower');

  return '';
}

function formatTypeName(value, language) {
  const typeName = typeof value === 'string' ? value : value?.name;

  if (typeof typeName !== 'string' || typeName.trim() === '') return '';

  const normalizedTypeName = typeName.trim().toLowerCase();
  const translationKey = `type.${normalizedTypeName}`;
  const localizedTypeName = translateType(language, normalizedTypeName);

  return localizedTypeName === translationKey
    ? formatName(normalizedTypeName)
    : localizedTypeName;
}

function formatTimeOfDay(value, language) {
  if (typeof value !== 'string' || value.trim() === '') return '';

  const timeOfDay = value.trim().toLowerCase();
  const translationKey = `time.${timeOfDay}`;
  const localizedTime = translate(language, translationKey);

  return localizedTime === translationKey ? timeOfDay : localizedTime;
}

function formatEvolutionAlternative(detail, language) {
  const conditions = [];
  const trigger = detail?.trigger?.name;
  const item = formatName(detail?.item);
  const heldItem = formatName(detail?.held_item);
  const tradeSpecies = formatName(detail?.trade_species);

  if (trigger === 'use-item') {
    addCondition(
      conditions,
      item
        ? translate(language, 'evolution.use', { name: item })
        : translate(language, 'evolution.useItem'),
    );
  } else if (trigger === 'trade') {
    addCondition(
      conditions,
      tradeSpecies
        ? translate(language, 'evolution.tradeFor', { name: tradeSpecies })
        : translate(language, 'evolution.trade'),
    );
  } else if (trigger && trigger !== 'level-up') {
    addCondition(conditions, formatName(trigger));
  }

  if (trigger !== 'use-item' && item) {
    addCondition(conditions, translate(language, 'evolution.use', { name: item }));
  }
  if (hasMinimum(detail?.min_level)) {
    addCondition(
      conditions,
      translate(language, 'evolution.level', { value: detail.min_level }),
    );
  }
  if (heldItem) {
    addCondition(conditions, translate(language, 'evolution.hold', { name: heldItem }));
  }
  if (hasMinimum(detail?.min_happiness)) {
    addCondition(
      conditions,
      translate(language, 'evolution.happiness', {
        value: detail.min_happiness,
      }),
    );
  }
  if (hasMinimum(detail?.min_affection)) {
    addCondition(
      conditions,
      translate(language, 'evolution.affection', {
        value: detail.min_affection,
      }),
    );
  }
  if (hasMinimum(detail?.min_beauty)) {
    addCondition(
      conditions,
      translate(language, 'evolution.beauty', { value: detail.min_beauty }),
    );
  }

  const timeOfDay = formatTimeOfDay(detail?.time_of_day, language);
  if (timeOfDay) {
    addCondition(
      conditions,
      translate(language, 'evolution.atTime', { time: timeOfDay }),
    );
  }

  addCondition(conditions, formatGender(detail?.gender, language));

  const knownMove = formatName(detail?.known_move);
  if (knownMove) {
    addCondition(
      conditions,
      translate(language, 'evolution.knowMove', { name: knownMove }),
    );
  }

  const knownMoveType = formatTypeName(detail?.known_move_type, language);
  if (knownMoveType) {
    addCondition(
      conditions,
      translate(language, 'evolution.knowTypeMove', { type: knownMoveType }),
    );
  }

  const location = formatName(detail?.location);
  if (location) {
    addCondition(
      conditions,
      translate(language, 'evolution.atLocation', { name: location }),
    );
  }
  if (detail?.needs_overworld_rain === true) {
    addCondition(conditions, translate(language, 'evolution.rain'));
  }
  if (detail?.near_special_rock === true) {
    addCondition(conditions, translate(language, 'evolution.specialRock'));
  }

  const partySpecies = formatName(detail?.party_species);
  if (partySpecies) {
    addCondition(
      conditions,
      translate(language, 'evolution.partySpecies', { name: partySpecies }),
    );
  }

  const partyType = formatTypeName(detail?.party_type, language);
  if (partyType) {
    addCondition(
      conditions,
      translate(language, 'evolution.partyType', { type: partyType }),
    );
  }

  addCondition(conditions, formatStatRelation(detail?.relative_physical_stats, language));
  if (detail?.turn_upside_down === true) {
    addCondition(conditions, translate(language, 'evolution.upsideDown'));
  }

  if (trigger === 'level-up' && conditions.length === 0) {
    addCondition(conditions, translate(language, 'evolution.levelUp'));
  }

  return {
    conditionCount: conditions.length,
    text:
      conditions.join(` ${translate(language, 'evolution.and')} `) ||
      translate(language, 'common.notAvailable'),
  };
}

function formatEvolutionConditions(details, language = 'en') {
  if (!Array.isArray(details) || details.length === 0) {
    return translate(language, 'common.notAvailable');
  }

  const alternatives = [];
  const seenAlternatives = new Set();

  for (const detail of details) {
    const alternative = formatEvolutionAlternative(detail, language);

    if (seenAlternatives.has(alternative.text)) continue;

    seenAlternatives.add(alternative.text);
    alternatives.push(alternative);
  }

  if (alternatives.length === 1) return alternatives[0].text;

  return alternatives
    .map(({ conditionCount, text }) => (conditionCount > 1 ? `(${text})` : text))
    .join(` ${translate(language, 'evolution.or')} `);
}

function collectEvolutionIds(stages) {
  return [...new Set(stages.flat().map((pokemon) => pokemon.id))];
}

export {
  collectEvolutionIds,
  formatEvolutionConditions,
  getSpeciesId,
  parseEvolutionChain,
};
