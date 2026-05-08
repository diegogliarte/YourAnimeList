import { env } from '$env/dynamic/private';

import type {
	Anime,
	AnimeApiResponse,
	AnimeRankingApiResponse,
	AnimeRankingType,
	ApiAnimeStatus,
	RankedAnime
} from '$lib/types/anime';

type MalAnimeNode = {
	id: number;
	title: string;
	main_picture?: {
		medium?: string;
		large?: string;
	};
	mean?: number;
	rank?: number;
	popularity?: number;
	num_episodes?: number;
	media_type?: string;
	status?: string;
	start_season?: {
		year?: number;
		season?: string;
	};
};

type MalListStatus = {
	status: ApiAnimeStatus;
	score: number;
	num_episodes_watched: number;
	tags?: string[] | string;
};

type MalAnimeEntry = {
	node: MalAnimeNode;
	list_status: MalListStatus;
};

type MalAnimeListResponse = {
	data: MalAnimeEntry[];
	paging?: {
		next?: string;
	};
};

type MalRankingEntry = {
	node: MalAnimeNode;
	ranking?: {
		rank?: number;
	};
};

type MalAnimeRankingResponse = {
	data: MalRankingEntry[];
	paging?: {
		next?: string;
	};
};

const MAL_API_BASE_URL = 'https://api.myanimelist.net/v2';

const ANIME_STATUS_VALUES: ApiAnimeStatus[] = [
	'watching',
	'completed',
	'on_hold',
	'dropped',
	'plan_to_watch'
];

const ANIME_RANKING_TYPES: AnimeRankingType[] = [
	'all',
	'airing',
	'upcoming',
	'tv',
	'ova',
	'movie',
	'special',
	'bypopularity',
	'favorite'
];

const RANKING_PAGE_LIMIT = 500;
const MAX_RANKING_PAGES = 4;

export const isApiAnimeStatus = (value: string | null): value is ApiAnimeStatus => {
	return ANIME_STATUS_VALUES.includes(value as ApiAnimeStatus);
};

export const isAnimeRankingType = (value: string | null): value is AnimeRankingType => {
	return ANIME_RANKING_TYPES.includes(value as AnimeRankingType);
};

const getClientId = () => {
	const clientId = env.MAL_CLIENT_ID?.trim();

	if (!clientId) {
		throw new Error('Missing MAL_CLIENT_ID environment variable.');
	}

	return clientId;
};

const normalizeTags = (rawTags?: string[] | string): string[] => {
	if (!rawTags) return [];

	if (Array.isArray(rawTags)) {
		return rawTags.map((tag) => tag.trim()).filter(Boolean);
	}

	return rawTags
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
};

const getScoreModifier = (tags: string[]): number => {
	const normalizedTags = tags.map((tag) => tag.toLowerCase());

	if (normalizedTags.includes('plus')) return 0.25;
	if (normalizedTags.includes('minus')) return -0.25;

	return 0;
};

const getDisplayScore = (score: number, tags: string[]): string => {
	if (score === 0) return '-';

	const normalizedTags = tags.map((tag) => tag.toLowerCase());

	if (normalizedTags.includes('plus')) return `${score}+`;
	if (normalizedTags.includes('minus')) return `${score}-`;

	return String(score);
};

const resolveUsername = (username: string) => {
	const publicUsername = username.trim();

	if (publicUsername.toLowerCase() !== 'diego') {
		return {
			publicUsername,
			malUsername: publicUsername
		};
	}

	const malUsername = env.MAL_USERNAME?.trim();

	if (!malUsername) {
		throw new Error('The diego alias is not configured.');
	}

	return {
		publicUsername: 'diego',
		malUsername
	};
};

const fetchMalJson = async <T>(url: string, clientId: string): Promise<T> => {
	const response = await fetch(url, {
		headers: {
			'X-MAL-CLIENT-ID': clientId
		}
	});

	if (!response.ok) {
		throw new Error(`MyAnimeList returned ${response.status}.`);
	}

	return response.json() as Promise<T>;
};

const fetchAnimePage = async (
	url: string,
	clientId: string
): Promise<MalAnimeListResponse> => {
	return fetchMalJson<MalAnimeListResponse>(url, clientId);
};

const fetchRankingPage = async (
	url: string,
	clientId: string
): Promise<MalAnimeRankingResponse> => {
	return fetchMalJson<MalAnimeRankingResponse>(url, clientId);
};

export const fetchUserAnimeList = async ({
																					 username,
																					 status
																				 }: {
	username: string;
	status?: ApiAnimeStatus;
}): Promise<AnimeApiResponse> => {
	const clientId = getClientId();
	const { publicUsername, malUsername } = resolveUsername(username);

	const firstUrl = new URL(
		`${MAL_API_BASE_URL}/users/${encodeURIComponent(malUsername)}/animelist`
	);

	firstUrl.searchParams.set('limit', '1000');
	firstUrl.searchParams.set('sort', 'list_score');
	firstUrl.searchParams.set('nsfw', 'true');

	if (status) {
		firstUrl.searchParams.set('status', status);
	}

	firstUrl.searchParams.set(
		'fields',
		[
			'main_picture',
			'list_status{status,score,num_episodes_watched,tags}',
			'mean',
			'num_episodes',
			'media_type',
			'status',
			'start_season'
		].join(',')
	);

	const animes: Anime[] = [];
	let nextUrl: string | undefined = firstUrl.toString();

	while (nextUrl) {
		const page = await fetchAnimePage(nextUrl, clientId);

		for (const entry of page.data) {
			const score = entry.list_status.score;
			const tags = normalizeTags(entry.list_status.tags);
			const customScore = score === 0 ? 0 : score + getScoreModifier(tags);

			animes.push({
				id: entry.node.id,
				title: entry.node.title,
				image: entry.node.main_picture?.large ?? entry.node.main_picture?.medium ?? null,
				score,
				displayScore: getDisplayScore(score, tags),
				customScore,
				status: entry.list_status.status,
				episodesWatched: entry.list_status.num_episodes_watched,
				totalEpisodes: entry.node.num_episodes ?? null,
				mean: entry.node.mean ?? null,
				mediaType: entry.node.media_type ?? null,
				animeStatus: entry.node.status ?? null,
				startSeason: entry.node.start_season ?? null,
				tags
			});
		}

		nextUrl = page.paging?.next;
	}

	animes.sort((a, b) => {
		const scoreDifference = b.customScore - a.customScore;

		if (scoreDifference !== 0) return scoreDifference;

		return a.title.localeCompare(b.title);
	});

	return {
		username: publicUsername,
		status: status ?? 'all',
		count: animes.length,
		animes
	};
};

const fetchUserStatusMap = async (username: string): Promise<Map<number, ApiAnimeStatus>> => {
	const userList = await fetchUserAnimeList({ username });
	const statusMap = new Map<number, ApiAnimeStatus>();

	for (const anime of userList.animes) {
		statusMap.set(anime.id, anime.status);
	}

	return statusMap;
};

export const fetchAnimeRanking = async ({
																					username,
																					rankingType = 'all',
																					excludedStatuses = ['completed'],
																					limit = 100
																				}: {
	username?: string;
	rankingType?: AnimeRankingType;
	excludedStatuses?: ApiAnimeStatus[];
	limit?: number;
}): Promise<AnimeRankingApiResponse> => {
	const clientId = getClientId();
	const trimmedUsername = username?.trim() || null;
	const resolvedUsername = trimmedUsername ? resolveUsername(trimmedUsername) : null;

	const normalizedLimit = Math.max(1, Math.min(Math.trunc(limit), 200));
	const uniqueExcludedStatuses = [...new Set(excludedStatuses)];

	const userStatusMap =
		resolvedUsername && uniqueExcludedStatuses.length > 0
			? await fetchUserStatusMap(resolvedUsername.malUsername)
			: new Map<number, ApiAnimeStatus>();

	const firstUrl = new URL(`${MAL_API_BASE_URL}/anime/ranking`);

	firstUrl.searchParams.set('ranking_type', rankingType);
	firstUrl.searchParams.set('limit', String(RANKING_PAGE_LIMIT));
	firstUrl.searchParams.set('nsfw', 'true');
	firstUrl.searchParams.set(
		'fields',
		[
			'main_picture',
			'mean',
			'rank',
			'popularity',
			'num_episodes',
			'media_type',
			'status',
			'start_season'
		].join(',')
	);

	const animes: RankedAnime[] = [];
	let nextUrl: string | undefined = firstUrl.toString();
	let pagesFetched = 0;

	while (nextUrl && animes.length < normalizedLimit && pagesFetched < MAX_RANKING_PAGES) {
		const page = await fetchRankingPage(nextUrl, clientId);

		for (const entry of page.data) {
			const userStatus = userStatusMap.get(entry.node.id) ?? null;

			if (userStatus && uniqueExcludedStatuses.includes(userStatus)) {
				continue;
			}

			animes.push({
				id: entry.node.id,
				title: entry.node.title,
				image: entry.node.main_picture?.large ?? entry.node.main_picture?.medium ?? null,
				rank: entry.ranking?.rank ?? entry.node.rank ?? null,
				mean: entry.node.mean ?? null,
				popularity: entry.node.popularity ?? null,
				totalEpisodes: entry.node.num_episodes ?? null,
				mediaType: entry.node.media_type ?? null,
				animeStatus: entry.node.status ?? null,
				startSeason: entry.node.start_season ?? null,
				userStatus
			});

			if (animes.length >= normalizedLimit) {
				break;
			}
		}

		nextUrl = page.paging?.next;
		pagesFetched += 1;
	}

	return {
		username: resolvedUsername?.publicUsername ?? null,
		rankingType,
		excludedStatuses: uniqueExcludedStatuses,
		count: animes.length,
		animes
	};
};