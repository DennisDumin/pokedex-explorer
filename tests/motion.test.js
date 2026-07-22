import { describe, expect, it, vi } from 'vitest';

import { prefersReducedMotion } from '../src/utils/motion.js';

describe('prefersReducedMotion', () => {
  it('reads the reduced-motion media query', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));

    expect(prefersReducedMotion(matchMedia)).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('falls back safely when matchMedia is unavailable or throws', () => {
    expect(prefersReducedMotion(null)).toBe(false);
    expect(
      prefersReducedMotion(() => {
        throw new Error('blocked');
      }),
    ).toBe(false);
  });
});
