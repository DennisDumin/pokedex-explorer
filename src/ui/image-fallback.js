let imageFallbackInitialized = false;

function resolveImageUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;

  try {
    const url = new URL(value, document.baseURI);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function handleImageError(event) {
  const image = event.target;
  if (!image?.matches?.('img[data-image-fallback]')) return;

  const fallbackUrl = resolveImageUrl(image.dataset.imageFallback);
  const finalFallbackUrl = resolveImageUrl(image.dataset.imageFinalFallback);
  image.removeAttribute('data-image-fallback');
  image.removeAttribute('data-image-final-fallback');
  image.classList.remove('is-animated');

  if (fallbackUrl && fallbackUrl !== image.currentSrc && fallbackUrl !== image.src) {
    if (finalFallbackUrl && finalFallbackUrl !== fallbackUrl) {
      image.dataset.imageFallback = finalFallbackUrl;
    }

    image.src = fallbackUrl;
    return;
  }

  if (
    finalFallbackUrl &&
    finalFallbackUrl !== image.currentSrc &&
    finalFallbackUrl !== image.src
  ) {
    image.src = finalFallbackUrl;
  }
}

function initImageFallbacks() {
  if (imageFallbackInitialized) return;

  document.addEventListener('error', handleImageError, true);
  imageFallbackInitialized = true;
}

export { initImageFallbacks };
