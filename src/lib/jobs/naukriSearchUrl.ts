function safeSlug(value: string | undefined, fallback: string): string {
  const normalized = (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;

  return encodeURIComponent(normalized);
}

export function buildNaukriSearchUrl(keywords?: string, location?: string): string {
  const keywordSlug = safeSlug(keywords, 'jobs');
  const locationSlug = safeSlug(location, 'india');
  return new URL(`/${keywordSlug}-jobs-in-${locationSlug}`, 'https://www.naukri.com').toString();
}
