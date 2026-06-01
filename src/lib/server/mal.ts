import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type {
	AnimeDetails,
	AnimeRankingEdge,
	AnimeRankingType,
	AnimeSearchEdge,
	UserAnimeListEdge
} from '$lib/types/anime';

const MAL_API = 'https://api.myanimelist.net/v2';

type Fetch = typeof fetch;

type MalPagedResponse<Edge> = {
	data?: Edge[];
	paging?: {
		previous?: string;
		next?: string;
	};
};

export const RANKING_TYPES = new Set<AnimeRankingType>([
	'all',
	'airing',
	'upcoming',
	'tv',
	'ova',
	'movie',
	'special',
	'bypopularity',
	'favorite'
]);

const USER_ANIME_FIELDS = [
	'id',
	'title',
	'main_picture',
	'alternative_titles',
	'start_date',
	'end_date',
	'mean',
	'rank',
	'popularity',
	'num_list_users',
	'num_scoring_users',
	'genres',
	'media_type',
	'status',
	'num_episodes',
	'start_season',
	'source',
	'average_episode_duration',
	'studios'
];

const RANKING_ANIME_FIELDS = [
	'id',
	'title',
	'main_picture',
	'alternative_titles',
	'start_date',
	'mean',
	'popularity',
	'genres',
	'media_type',
	'status',
	'num_episodes',
	'start_season'
];

const SEARCH_ANIME_FIELDS = [
	'id',
	'title',
	'main_picture',
	'media_type',
	'start_date',
	'start_season'
];

const DETAILS_ANIME_FIELDS = [
	'id',
	'title',
	'main_picture',
	'alternative_titles',
	'start_date',
	'end_date',
	'mean',
	'popularity',
	'genres',
	'media_type',
	'status',
	'num_episodes',
	'start_season',
	'average_episode_duration',
	'related_anime'
];

const LIST_STATUS_FIELD =
	'list_status{status,score,num_episodes_watched,is_rewatching,start_date,finish_date,priority,num_times_rewatched,rewatch_value,tags,updated_at}';

export const ANIME_FIELDS = USER_ANIME_FIELDS.join(',');

export const USER_ANIME_LIST_FIELDS = [...USER_ANIME_FIELDS, LIST_STATUS_FIELD].join(',');

export const ANIME_RANKING_FIELDS = RANKING_ANIME_FIELDS.join(',');

export const ANIME_SEARCH_FIELDS = SEARCH_ANIME_FIELDS.join(',');

export const ANIME_DETAILS_FIELDS = DETAILS_ANIME_FIELDS.join(',');

const MAL_REQUEST_INTERVAL_MS = 250;

let malRequestQueue = Promise.resolve();

export function getMalHeaders(): HeadersInit {
	if (!env.MAL_CLIENT_ID) {
		error(500, 'Missing MAL_CLIENT_ID');
	}

	return {
		'X-MAL-CLIENT-ID': env.MAL_CLIENT_ID
	};
}

async function waitForMalRateLimit() {
	const previousQueue = malRequestQueue;

	let releaseCurrentRequest: () => void;

	malRequestQueue = new Promise<void>((resolve) => {
		releaseCurrentRequest = resolve;
	});

	await previousQueue;
	await sleep(MAL_REQUEST_INTERVAL_MS);

	releaseCurrentRequest!();
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchMalJson<T>(
	fetcher: Fetch,
	path: string,
	params: Record<string, string | number | boolean | null | undefined>,
	errorMessage: string
): Promise<T> {
	const apiUrl = new URL(`${MAL_API}${path}`);

	for (const [key, value] of Object.entries(params)) {
		if (value === null || value === undefined) continue;

		apiUrl.searchParams.set(key, String(value));
	}

	await waitForMalRateLimit();

	const response = await fetcher(apiUrl, {
		headers: getMalHeaders()
	});

	if (!response.ok) {
		const message = await response.text();
		error(response.status, message || errorMessage);
	}

	return (await response.json()) as T;
}

export async function fetchUserAnimeList(fetcher: Fetch, username: string) {
	const data: UserAnimeListEdge[] = [];
	let offset = 0;
	const limit = 1000;

	while (true) {
		const body = await fetchMalJson<MalPagedResponse<UserAnimeListEdge>>(
			fetcher,
			`/users/${encodeURIComponent(username)}/animelist`,
			{
				fields: USER_ANIME_LIST_FIELDS,
				limit,
				offset,
				nsfw: true
			},
			'Failed to fetch MAL anime list'
		);

		const pageData = body.data ?? [];

		data.push(...pageData);

		if (!body.paging?.next || pageData.length < limit) {
			break;
		}

		offset += limit;
	}

	return enrichUserAnimeList(data);
}

export async function fetchAnimeRanking(
	fetcher: Fetch,
	rankingType: AnimeRankingType,
	limit: number,
	offset: number
) {
	const body = await fetchMalJson<MalPagedResponse<AnimeRankingEdge>>(
		fetcher,
		'/anime/ranking',
		{
			ranking_type: rankingType,
			fields: ANIME_RANKING_FIELDS,
			limit,
			offset,
			nsfw: true
		},
		'Failed to fetch anime ranking'
	);

	return {
		data: body.data ?? [],
		nextOffset: getNextOffset(body.paging?.next)
	};
}

export async function fetchAnimeSearch(
	fetcher: Fetch,
	query: string,
	limit: number,
	offset: number
) {
	const body = await fetchMalJson<MalPagedResponse<AnimeSearchEdge>>(
		fetcher,
		'/anime',
		{
			q: query,
			fields: ANIME_SEARCH_FIELDS,
			limit,
			offset,
			nsfw: true
		},
		'Failed to search anime'
	);

	return {
		data: body.data ?? [],
		nextOffset: getNextOffset(body.paging?.next)
	};
}

export async function fetchAnimeDetails(fetcher: Fetch, animeId: number) {
	return await fetchMalJson<AnimeDetails>(
		fetcher,
		`/anime/${animeId}`,
		{
			fields: ANIME_DETAILS_FIELDS,
			nsfw: true
		},
		'Failed to fetch anime details'
	);
}

export function enrichUserAnimeList(data: UserAnimeListEdge[]) {
	return data.map((entry) => {
		const score = entry.list_status?.score ?? 0;
		const tags = entry.list_status?.tags ?? [];

		const hasPlus = tags.includes('plus');
		const hasMinus = tags.includes('minus');

		const displayScore = score === 0 ? '-' : `${score}${hasPlus ? '+' : hasMinus ? '-' : ''}`;
		const sortScore = score + (hasPlus ? 0.25 : hasMinus ? -0.25 : 0);

		return {
			...entry,
			list_status: {
				...entry.list_status,
				display_score: displayScore,
				sort_score: sortScore
			}
		};
	});
}

export function isRankingType(value: string): value is AnimeRankingType {
	return RANKING_TYPES.has(value as AnimeRankingType);
}

export function clampNumber(value: number, min: number, max: number) {
	if (!Number.isFinite(value)) return max;

	return Math.min(Math.max(value, min), max);
}

export function getNextOffset(next?: string) {
	if (!next) return null;

	try {
		const nextUrl = new URL(next);
		const offset = Number(nextUrl.searchParams.get('offset'));

		return Number.isFinite(offset) ? offset : null;
	} catch {
		return null;
	}
}
