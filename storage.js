export function loadLocal(key, fallback = []) {
  try {
    const value = localStorage.getItem(`cusachs:${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal(key, value) {
  localStorage.setItem(`cusachs:${key}`, JSON.stringify(value));
}

export function makeId() {
  return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
