/** Normaliza nomes para comparação: sem acento, minúsculo, espaços colapsados. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Ana", "Ana e Bia", "Ana, Bia e Caio" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
