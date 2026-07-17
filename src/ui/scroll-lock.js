const activeLocks = new Set();

let previousBodyOverflow = '';
let previousRootOverflow = '';

function acquireScrollLock() {
  const lock = Symbol('scroll-lock');

  if (activeLocks.size === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  activeLocks.add(lock);
  let isReleased = false;

  return function releaseScrollLock() {
    if (isReleased) return;
    isReleased = true;
    activeLocks.delete(lock);

    if (activeLocks.size === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    }
  };
}

export { acquireScrollLock };
