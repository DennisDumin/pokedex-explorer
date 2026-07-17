function createRequestCache() {
  const values = new Map();
  const inFlight = new Map();

  function get(key, loader) {
    if (values.has(key)) {
      return Promise.resolve(values.get(key));
    }

    if (inFlight.has(key)) {
      return inFlight.get(key);
    }

    const request = Promise.resolve()
      .then(loader)
      .then((value) => {
        if (inFlight.get(key) === request) {
          values.set(key, value);
        }
        return value;
      })
      .finally(() => {
        if (inFlight.get(key) === request) {
          inFlight.delete(key);
        }
      });

    inFlight.set(key, request);
    return request;
  }

  function set(key, value) {
    inFlight.delete(key);
    values.set(key, value);
  }

  function has(key) {
    return values.has(key);
  }

  function remove(key) {
    values.delete(key);
    inFlight.delete(key);
  }

  function clear() {
    values.clear();
    inFlight.clear();
  }

  return { clear, get, has, remove, set };
}

export { createRequestCache };
