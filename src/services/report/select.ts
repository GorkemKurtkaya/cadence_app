// Rapora girecek commit'lerin seçili SHA'lara göre süzülmesi (saf; I/O yok).

/**
 * Commit listesini seçili SHA'lara göre süzer.
 * `shas` boş/undefined ise tüm commit'ler döner (geriye dönük uyumlu "hepsi" davranışı).
 */
export function filterBySelectedShas<T extends { sha: string }>(
  commits: T[],
  shas?: string[],
): T[] {
  if (!shas || shas.length === 0) return commits;
  const set = new Set(shas);
  return commits.filter((c) => set.has(c.sha));
}
