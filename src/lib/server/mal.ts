import { env } from '$env/dynamic/private';

import type {
	Anime,
	AnimeApiResponse,
	AnimeGenre,
	AnimeRankingApiResponse,
	AnimeRankingType,
	ApiAnimeStatus,
	RankedAnime
} from '$lib/types/anime';

type MalGenre = {
	id: number;
	name: string;
};

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
	average_episode_duration?: number;
	media_type?: string;
	status?: string;
	start_season?: {
		year?: number;
		season?: string;
	};
	genres?: MalGenre[];
};

type MalListStatus = {
	status: ApiAnimeStatus;
	score: number;
	num_episodes_watched: number;
	num_times_rewatched: number;
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

const USER_STATUS_CACHE_MS = 5 * 60 * 1000;
const USER_ANIME_LIST_LIMIT = 1000;
const RANKING_LIMIT_MIN = 1;
const RANKING_LIMIT_MAX = 500;

const ANIME_LIST_FIELDS = [
	'main_picture',
	'list_status{status,score,num_episodes_watched,tags,num_times_rewatched}',
	'mean',
	'num_episodes',
	'average_episode_duration',
	'media_type',
	'status',
	'start_season',
	'genres'
].join(',');

const ANIME_RANKING_FIELDS = [
	'main_picture',
	'mean',
	'rank',
	'popularity',
	'num_episodes',
	'average_episode_duration',
	'media_type',
	'status',
	'start_season',
	'genres'
].join(',');

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

const userStatusCache = new Map<
	string,
	{
		expiresAt: number;
		statusMap: Map<number, ApiAnimeStatus>;
	}
>();

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

const resolveUsername = (username: string) => {
	const publicUsername = username.trim();

	if (!publicUsername) {
		throw new Error('Missing MyAnimeList username.');
	}

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

const normalizeGenres = (genres?: MalGenre[]): AnimeGenre[] => {
	if (!genres) return [];

	return genres
		.filter((genre) => genre.name?.trim())
		.map((genre) => ({
			id: genre.id,
			name: genre.name.trim()
		}));
};

const getScoreModifier = (tags: string[]) => {
	const normalizedTags = tags.map((tag) => tag.toLowerCase());

	if (normalizedTags.includes('plus')) return 0.25;
	if (normalizedTags.includes('minus')) return -0.25;

	return 0;
};

const getDisplayScore = (score: number, tags: string[]) => {
	if (score === 0) return '-';

	const normalizedTags = tags.map((tag) => tag.toLowerCase());

	if (normalizedTags.includes('plus')) return `${score}+`;
	if (normalizedTags.includes('minus')) return `${score}-`;

	return String(score);
};

const getImage = (node: MalAnimeNode) => {
	return node.main_picture?.large ?? node.main_picture?.medium ?? null;
};

const normalizeLimit = (limit: number) => {
	if (!Number.isFinite(limit)) return RANKING_LIMIT_MAX;

	return Math.max(RANKING_LIMIT_MIN, Math.min(Math.trunc(limit), RANKING_LIMIT_MAX));
};

const normalizeOffset = (offset: number) => {
	if (!Number.isFinite(offset)) return 0;

	return Math.max(0, Math.trunc(offset));
};

const parseNextOffset = (nextUrl?: string): number | null => {
	if (!nextUrl) return null;

	try {
		const url = new URL(nextUrl);
		const rawOffset = url.searchParams.get('offset');
		const offset = Number(rawOffset);

		if (!Number.isFinite(offset)) return null;

		return Math.max(0, Math.trunc(offset));
	} catch {
		return null;
	}
};

const fetchMalJson = async <T>(url: string, clientId: string): Promise<T> => {
	const response = await fetch(url, {
		headers: {
			'X-MAL-CLIENT-ID': clientId
		}
	});

	if (!response.ok) {
		let detail = '';

		try {
			const payload = (await response.json()) as {
				error?: string;
				message?: string;
			};

			detail = payload.message || payload.error || '';
		} catch {
			// MAL sometimes returns empty/non-JSON error bodies.
		}

		throw new Error(
			detail
				? `MyAnimeList returned ${response.status}: ${detail}`
				: `MyAnimeList returned ${response.status}.`
		);
	}

	return response.json() as Promise<T>;
};

const mapAnimeEntry = (entry: MalAnimeEntry): Anime => {
	const score = entry.list_status.score;
	const tags = normalizeTags(entry.list_status.tags);
	const customScore = score === 0 ? 0 : score + getScoreModifier(tags);

	return {
		id: entry.node.id,
		title: entry.node.title,
		image: getImage(entry.node),
		score,
		displayScore: getDisplayScore(score, tags),
		customScore,
		status: entry.list_status.status,
		episodesWatched: entry.list_status.num_episodes_watched,
		totalEpisodes: entry.node.num_episodes ?? null,
		averageEpisodeDuration: entry.node.average_episode_duration ?? null,
		mean: entry.node.mean ?? null,
		mediaType: entry.node.media_type ?? null,
		animeStatus: entry.node.status ?? null,
		startSeason: entry.node.start_season ?? null,
		genres: normalizeGenres(entry.node.genres),
		tags,
		numberOfTimesRewatched: entry.list_status.num_times_rewatched
	};
};

const mapRankingEntry = (
	entry: MalRankingEntry,
	userStatus: ApiAnimeStatus | null
): RankedAnime => {
	return {
		id: entry.node.id,
		title: entry.node.title,
		image: getImage(entry.node),
		rank: entry.ranking?.rank ?? entry.node.rank ?? null,
		popularity: entry.node.popularity ?? null,
		mean: entry.node.mean ?? null,
		totalEpisodes: entry.node.num_episodes ?? null,
		averageEpisodeDuration: entry.node.average_episode_duration ?? null,
		mediaType: entry.node.media_type ?? null,
		animeStatus: entry.node.status ?? null,
		startSeason: entry.node.start_season ?? null,
		genres: normalizeGenres(entry.node.genres),
		userStatus
	};
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

	firstUrl.searchParams.set('limit', String(USER_ANIME_LIST_LIMIT));
	firstUrl.searchParams.set('sort', 'list_score');
	firstUrl.searchParams.set('nsfw', 'true');
	firstUrl.searchParams.set('fields', ANIME_LIST_FIELDS);

	if (status) {
		firstUrl.searchParams.set('status', status);
	}

	const animes: Anime[] = [];
	let nextUrl: string | undefined = firstUrl.toString();

	while (nextUrl) {
		const page = await fetchMalJson<MalAnimeListResponse>(nextUrl, clientId);

		for (const entry of page.data) {
			animes.push(mapAnimeEntry(entry));
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

const fetchUserStatusMap = async (malUsername: string): Promise<Map<number, ApiAnimeStatus>> => {
	const cacheKey = malUsername.toLowerCase();
	const cached = userStatusCache.get(cacheKey);

	if (cached && cached.expiresAt > Date.now()) {
		return cached.statusMap;
	}

	const userList = await fetchUserAnimeList({
		username: malUsername
	});

	const statusMap = new Map<number, ApiAnimeStatus>();

	for (const anime of userList.animes) {
		statusMap.set(anime.id, anime.status);
	}

	userStatusCache.set(cacheKey, {
		expiresAt: Date.now() + USER_STATUS_CACHE_MS,
		statusMap
	});

	return statusMap;
};

export const fetchAnimeRanking = async ({
																					username,
																					rankingType = 'all',
																					excludedStatuses = ['completed'],
																					limit = 100,
																					offset = 0
																				}: {
	username?: string;
	rankingType?: AnimeRankingType;
	excludedStatuses?: ApiAnimeStatus[];
	limit?: number;
	offset?: number;
}): Promise<AnimeRankingApiResponse> => {
	const clientId = getClientId();

	const normalizedLimit = normalizeLimit(limit);
	const normalizedOffset = normalizeOffset(offset);
	const uniqueExcludedStatuses = [...new Set(excludedStatuses)];

	const trimmedUsername = username?.trim() || null;
	const resolvedUsername = trimmedUsername ? resolveUsername(trimmedUsername) : null;

	const userStatusMap = resolvedUsername
		? await fetchUserStatusMap(resolvedUsername.malUsername)
		: new Map<number, ApiAnimeStatus>();

	const url = new URL(`${MAL_API_BASE_URL}/anime/ranking`);

	url.searchParams.set('ranking_type', rankingType);
	url.searchParams.set('limit', String(normalizedLimit));
	url.searchParams.set('offset', String(normalizedOffset));
	url.searchParams.set('nsfw', 'true');
	url.searchParams.set('fields', ANIME_RANKING_FIELDS);

	const page = await fetchMalJson<MalAnimeRankingResponse>(url.toString(), clientId);

	const animes: RankedAnime[] = page.data
		.map((entry) => {
			const userStatus = userStatusMap.get(entry.node.id) ?? null;

			return mapRankingEntry(entry, userStatus);
		})
		.filter((anime) => {
			if (!anime.userStatus) return true;

			return !uniqueExcludedStatuses.includes(anime.userStatus);
		});

	return {
		username: resolvedUsername?.publicUsername ?? null,
		rankingType,
		excludedStatuses: uniqueExcludedStatuses,
		offset: normalizedOffset,
		nextOffset: parseNextOffset(page.paging?.next),
		count: animes.length,
		animes
	};
};