import { PUBLIC_ANIME_DB_API_URL } from '$env/static/public';
import type {
	AnimeDbAnimeResponse,
	AnimeDbFacetsResponse,
	AnimeDbFilters
} from '$lib/types/anime-db';

const API_URL = PUBLIC_ANIME_DB_API_URL?.replace(/\/$/, '');

export async function fetchAnimeDbFacets() {
	return fetchAnimeDb<AnimeDbFacetsResponse>('/facets');
}

export async function fetchAnimeDbPage(filters: AnimeDbFilters) {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(filters)) {
		if (value === null || value === undefined || value === '') continue;

		params.set(key, String(value));
	}

	return fetchAnimeDb<AnimeDbAnimeResponse>(`/anime?${params.toString()}`);
}

async function fetchAnimeDb<T>(path: string): Promise<T> {
	if (!API_URL) {
		throw new Error('Missing PUBLIC_ANIME_DB_API_URL');
	}

	const response = await fetch(`${API_URL}${path}`);

	if (!response.ok) {
		throw new Error(`Anime DB returned ${response.status}`);
	}

	return (await response.json()) as T;
}
