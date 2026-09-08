type BrowserRecord = {
  id: string;
};

const canUseBrowserStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readRawValue = (storageKey: string) => {
  if (!canUseBrowserStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

export const loadCollection = <T>(storageKey: string): T[] => {
  const rawValue = readRawValue(storageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
};

export const saveCollection = <T>(storageKey: string, items: T[]) => {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // Ignore storage errors and keep the UI usable.
  }
};

export const createCollectionId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const upsertCollectionItem = <T extends BrowserRecord>(
  storageKey: string,
  item: T,
): T => {
  const items = loadCollection<T>(storageKey);
  const nextItems = items.some((entry) => entry.id === item.id)
    ? items.map((entry) => (entry.id === item.id ? item : entry))
    : [...items, item];

  saveCollection(storageKey, nextItems);

  return item;
};

export const replaceCollectionItem = <T extends BrowserRecord>(
  storageKey: string,
  id: string,
  item: Omit<T, 'id'>,
): T => {
  const nextItem = { id, ...item } as T;

  return upsertCollectionItem(storageKey, nextItem);
};

export const deleteCollectionItem = (storageKey: string, id: string) => {
  const items = loadCollection<BrowserRecord>(storageKey);
  const nextItems = items.filter((entry) => entry.id !== id);

  saveCollection(storageKey, nextItems);
};
