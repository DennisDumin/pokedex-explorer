const MAX_COMPARISON_SIZE = 2;

function normalizePokemonId(value) {
  const id =
    typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value;

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function createComparisonSelectionStore() {
  const subscribers = new Set();
  let selectedIds = [];

  function getState() {
    return { selectedIds: [...selectedIds] };
  }

  function notifySubscribers() {
    for (const subscriber of subscribers) subscriber(getState());
  }

  function isSelected(id) {
    const normalizedId = normalizePokemonId(id);
    return normalizedId !== null && selectedIds.includes(normalizedId);
  }

  function toggle(id) {
    const normalizedId = normalizePokemonId(id);

    if (normalizedId === null) return false;

    if (isSelected(normalizedId)) {
      selectedIds = selectedIds.filter((selectedId) => selectedId !== normalizedId);
      notifySubscribers();
      return false;
    }

    if (selectedIds.length >= MAX_COMPARISON_SIZE) return false;

    selectedIds = [...selectedIds, normalizedId];
    notifySubscribers();
    return true;
  }

  function clear() {
    if (selectedIds.length === 0) return;

    selectedIds = [];
    notifySubscribers();
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== 'function') {
      throw new TypeError('Subscriber must be a function.');
    }

    subscribers.add(subscriber);

    return function unsubscribe() {
      subscribers.delete(subscriber);
    };
  }

  return { clear, getState, isSelected, subscribe, toggle };
}

export { MAX_COMPARISON_SIZE, createComparisonSelectionStore };
