function prefersReducedMotion(matchMedia = globalThis.matchMedia) {
  if (typeof matchMedia !== 'function') return false;

  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

export { prefersReducedMotion };
