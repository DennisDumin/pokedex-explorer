function normalizeMediaUrl(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function getMediaOptions(options) {
  return {
    fallbackUrl: normalizeMediaUrl(options?.fallbackUrl),
    shiny: options?.shiny === true,
  };
}

function findFirstMediaUrl(candidates, fallbackUrl) {
  for (const candidate of candidates) {
    const mediaUrl = normalizeMediaUrl(candidate);
    if (mediaUrl) return mediaUrl;
  }

  return fallbackUrl;
}

function getPokemonArtwork(pokemon, options = {}) {
  const { fallbackUrl, shiny } = getMediaOptions(options);
  const spriteName = shiny ? 'front_shiny' : 'front_default';
  const sprites = pokemon?.sprites;

  return findFirstMediaUrl(
    [
      sprites?.other?.['official-artwork']?.[spriteName],
      sprites?.other?.home?.[spriteName],
      sprites?.[spriteName],
    ],
    fallbackUrl,
  );
}

function getPokemonAnimation(pokemon, options = {}) {
  const { fallbackUrl, shiny } = getMediaOptions(options);
  const spriteName = shiny ? 'front_shiny' : 'front_default';
  const sprites = pokemon?.sprites;

  return findFirstMediaUrl(
    [
      sprites?.other?.showdown?.[spriteName],
      sprites?.versions?.['generation-v']?.['black-white']?.animated?.[spriteName],
    ],
    fallbackUrl,
  );
}

export { getPokemonAnimation, getPokemonArtwork };
