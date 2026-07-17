async function mapWithConcurrency(
  values,
  mapper,
  { concurrency = 6 } = {},
) {
  if (typeof mapper !== 'function') {
    throw new TypeError('The mapper must be a function.');
  }

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('Concurrency must be a positive integer.');
  }

  const items = Array.from(values);
  const results = new Array(items.length);
  let nextIndex = 0;
  let hasError = false;
  let firstError;

  async function runWorker() {
    while (nextIndex < items.length && !hasError) {
      const index = nextIndex;
      nextIndex += 1;

      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        hasError = true;
        firstError = error;
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => runWorker());
  await Promise.all(workers);

  if (hasError) {
    throw firstError;
  }

  return results;
}

export { mapWithConcurrency };
