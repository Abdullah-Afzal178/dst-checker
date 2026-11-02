/** Place names. Pure. */

/**
 * The API's city when it matches the search, else what was typed. A search
 * for "Casablanca" can come back as the city district's full local name.
 */
export function nameFor(typed: string, city: string): string {
  const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const first = typed.split(",")[0].trim();

  return fold(city).includes(fold(first)) || fold(first).includes(fold(city)) ? city : first;
}
