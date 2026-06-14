import type { AnimeDetails } from '$lib/types/anime';
import { EXCLUDED_FRANCHISE_RELATIONS } from '$lib/utils/anime.utils';

type Fetch = typeof fetch;

export type AnimeDbFranchiseRelatedEdge = {
	node: AnimeDetails;
	relation_type: string;
	relation_type_formatted: string;
	stopped?: boolean;
	direction?: 'outgoing' | 'incoming';
	from_id?: number;
	to_id?: number;
};

export type AnimeDbFranchiseNode = AnimeDetails & {
	related_anime?: AnimeDbFranchiseRelatedEdge[];
};

export type AnimeDbFranchiseGraph = {
	seedId: number;
	stopTypes: string[];
	maxNodes: number;
	limited: boolean;
	count: number;
	nodes: AnimeDbFranchiseNode[];
};

export type AnimeDbFranchiseResponse = {
	data: AnimeDbFranchiseGraph;
};

export type AnimeDbRecommendationSource = {
	animeId: number;
	title: string;
	count: number;
};

export type AnimeDbRecommendationBranch = {
	anime: unknown;
	count: number;
	sourceAnimeId: number;
};

export type AnimeDbRecommendationRoot = {
	anime: unknown;
	count: number;
	recommendations: AnimeDbRecommendationBranch[];
};

export type AnimeDbRecommendationResult = {
	anime: unknown;
	kind: 'seed' | 'direct' | 'related';
	score: number;
	sourceCount: number;
	totalCount: number;
	sources: AnimeDbRecommendationSource[];
};

export type AnimeDbRecommendationsGraph = {
	seed: unknown;
	rootLimit: number;
	branchLimit: number;
	minSources: number;
	roots: AnimeDbRecommendationRoot[];
	recommendations: AnimeDbRecommendationResult[];
};

export type AnimeDbRecommendationsResponse = {
	data: AnimeDbRecommendationsGraph;
};

const ANIME_DB_API_URL = process.env.PUBLIC_ANIME_DB_API_URL || 'http://localhost:3001';
const ANIME_DB_TIMEOUT_MS = 1500;
const ANIME_DB_FRANCHISE_MAX_NODES = 1000;

export async function tryFetchAnimeDbFranchise(
	fetcher: Fetch,
	animeId: number
): Promise<AnimeDbFranchiseResponse | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), ANIME_DB_TIMEOUT_MS);

	try {
		const url = new URL(`${ANIME_DB_API_URL}/franchise/${animeId}`);

		url.searchParams.set('stop', getFranchiseStopTypes().join(','));
		url.searchParams.set('max', String(ANIME_DB_FRANCHISE_MAX_NODES));

		const response = await fetcher(url.toString(), {
			headers: {
				accept: 'application/json'
			},
			signal: controller.signal
		});

		if (!response.ok) return null;

		const result = (await response.json()) as AnimeDbFranchiseResponse;

		if (!result.data?.nodes?.length) return null;

		return result;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

export async function tryFetchAnimeDbRecommendations(
	fetcher: Fetch,
	animeId: number,
	params = new URLSearchParams()
): Promise<AnimeDbRecommendationsResponse | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), ANIME_DB_TIMEOUT_MS);

	try {
		const url = new URL(`${ANIME_DB_API_URL}/recommendations/${animeId}`);

		for (const [key, value] of params) {
			url.searchParams.append(key, value);
		}

		const response = await fetcher(url.toString(), {
			headers: {
				accept: 'application/json'
			},
			signal: controller.signal
		});

		if (!response.ok) return null;

		const result = (await response.json()) as AnimeDbRecommendationsResponse;

		if (!result.data?.seed) return null;

		return result;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

function getFranchiseStopTypes() {
	const stopTypes = new Set<string>(EXCLUDED_FRANCHISE_RELATIONS);

	stopTypes.add('character');
	stopTypes.add('other');

	return [...stopTypes].sort();
}