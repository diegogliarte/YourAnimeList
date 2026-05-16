import { env } from '$env/dynamic/private';

import type {
	Anime,
	AnimeApiResponse,
	AnimeFranchiseApiResponse,
	AnimeGenre,
	AnimeRankingApiResponse,
	AnimeRankingType,
	ApiAnimeStatus
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
	start_date?: string;
	end_date?: string;
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

type MalAnimeListEntry = {
	node: MalAnimeNode;
	list_status: MalListStatus;
};

type MalRankingEntry = {
	node: MalAnimeNode;
	ranking?: {
		rank?: number;
	};
};

type MalAnimeSearchEntry = {
	node: MalAnimeNode;
};

type MalRelatedAnime = {
	node: MalAnimeNode;
	relation_type?: string;
	relation_type_formatted?: string;
};

type MalAnimeDetailsResponse = MalAnimeNode & {
	related_anime?: MalRelatedAnime[];
};

type MalPagedResponse<T> = {
	data: T[];
	paging?: {
		next?: string;
	};
};

type ResolvedUsername = {
	publicUsername: string;
	malUsername: string;
};

type FranchiseQueueItem = {
	id: number;
	relationType: string | null;
	relationTypeFormatted: string | null;
};

type FranchiseCrawlResult = {
	animes: Anime[];
	limited: boolean;
};

const MAL_API_BASE_URL = 'https://api.myanimelist.net/v2';

const USER_ANIME_CACHE_MS = 5 * 60 * 1000;
const ANIME_DETAILS_CACHE_MS = 60 * 60 * 1000;

const USER_ANIME_LIST_LIMIT = 1000;
const ANIME_SEARCH_LIMIT = 8;
const MAX_FRANCHISE_ANIME = 200;

const RANKING_LIMIT_MIN = 1;
const RANKING_LIMIT_MAX = 500;

const ANIME_NODE_FIELDS = [
	'main_picture',
	'mean',
	'rank',
	'popularity',
	'num_episodes',
	'average_episode_duration',
	'media_type',
	'status',
	'start_date',
	'end_date',
	'start_season',
	'genres'
].join(',');

const ANIME_LIST_FIELDS = [
	ANIME_NODE_FIELDS,
	'list_status{status,score,num_episodes_watched,tags,num_times_rewatched}'
].join(',');

const ANIME_DETAILS_FIELDS = [ANIME_NODE_FIELDS, 'related_anime'].join(',');

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

const SEASON_MONTH: Record<string, number> = {
	winter: 1,
	spring: 4,
	summer: 7,
	fall: 10
};

const userAnimeCache = new Map<
	string,
	{
		expiresAt: number;
		animeMap: Map<number, Anime>;
	}
>();

const animeDetailsCache = new Map<
	number,
	{
		expiresAt: number;
		details: MalAnimeDetailsResponse;
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

const resolveUsername = (username: string): ResolvedUsername => {
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

const normalizeLimit = (limit: number) => {
	if (!Number.isFinite(limit)) return RANKING_LIMIT_MAX;

	return Math.max(RANKING_LIMIT_MIN, Math.min(Math.trunc(limit), RANKING_LIMIT_MAX));
};

const normalizeOffset = (offset: number) => {
	if (!Number.isFinite(offset)) return 0;

	return Math.max(0, Math.trunc(offset));
};

const normalizeAnimeId = (value: number | null | undefined) => {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;

	const animeId = Math.trunc(value);

	return animeId > 0 ? animeId : null;
};

const parseNextOffset = (nextUrl?: string): number | null => {
	if (!nextUrl) return null;

	try {
		const url = new URL(nextUrl);
		const offset = Number(url.searchParams.get('offset'));

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

const normalizeTags = (rawTags?: string[] | string): string[] => {
	if (!rawTags) return [];

	const tags = Array.isArray(rawTags) ? rawTags : rawTags.split(',');

	return tags.map((tag) => tag.trim()).filter(Boolean);
};

const normalizeGenres = (genres?: MalGenre[]): AnimeGenre[] => {
	return (
		genres
			?.filter((genre) => genre.name?.trim())
			.map((genre) => ({
				id: genre.id,
				name: genre.name.trim()
			})) ?? []
	);
};

const getImage = (node: MalAnimeNode) => {
	return node.main_picture?.large ?? node.main_picture?.medium ?? null;
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

const getScoreData = (listStatus?: MalListStatus, userAnime?: Anime | null) => {
	const tags = listStatus ? normalizeTags(listStatus.tags) : (userAnime?.tags ?? []);
	const score = listStatus?.score ?? userAnime?.score ?? 0;
	const customScore = score === 0 ? 0 : score + getScoreModifier(tags);

	return {
		score,
		tags,
		customScore,
		displayScore: getDisplayScore(score, tags)
	};
};

const mapAnime = ({
										node,
										listStatus,
										userAnime,
										rank,
										relationType = null,
										relationTypeFormatted = null
									}: {
	node: MalAnimeNode;
	listStatus?: MalListStatus;
	userAnime?: Anime | null;
	rank?: number | null;
	relationType?: string | null;
	relationTypeFormatted?: string | null;
}): Anime => {
	const scoreData = getScoreData(listStatus, userAnime);
	const genres = normalizeGenres(node.genres);

	const status = listStatus?.status ?? userAnime?.status ?? 'plan_to_watch';
	const userStatus = listStatus?.status ?? userAnime?.userStatus ?? userAnime?.status ?? null;

	return {
		id: node.id,
		title: node.title,
		image: getImage(node),
		href: `https://myanimelist.net/anime/${node.id}`,

		rank: rank ?? node.rank ?? userAnime?.rank ?? null,

		score: scoreData.score,
		displayScore: scoreData.displayScore,
		customScore: scoreData.customScore,

		status,
		userStatus,

		relationType,
		relationTypeFormatted,

		startDate: node.start_date ?? null,
		endDate: node.end_date ?? null,

		episodesWatched: listStatus?.num_episodes_watched ?? userAnime?.episodesWatched ?? 0,

		totalEpisodes: node.num_episodes ?? userAnime?.totalEpisodes ?? null,

		averageEpisodeDuration:
			node.average_episode_duration ?? userAnime?.averageEpisodeDuration ?? null,

		mean: node.mean ?? userAnime?.mean ?? null,
		popularity: node.popularity ?? userAnime?.popularity ?? null,
		mediaType: node.media_type ?? userAnime?.mediaType ?? null,
		animeStatus: node.status ?? userAnime?.animeStatus ?? null,
		startSeason: node.start_season ?? userAnime?.startSeason ?? null,

		genres: genres.length > 0 ? genres : (userAnime?.genres ?? []),

		tags: scoreData.tags,

		numberOfTimesRewatched:
			listStatus?.num_times_rewatched ?? userAnime?.numberOfTimesRewatched ?? 0
	};
};

const buildUserAnimeListUrl = ({
																 malUsername,
																 status
															 }: {
	malUsername: string;
	status?: ApiAnimeStatus;
}) => {
	const url = new URL(`${MAL_API_BASE_URL}/users/${encodeURIComponent(malUsername)}/animelist`);

	url.searchParams.set('limit', String(USER_ANIME_LIST_LIMIT));
	url.searchParams.set('sort', 'list_score');
	url.searchParams.set('nsfw', 'true');
	url.searchParams.set('fields', ANIME_LIST_FIELDS);

	if (status) {
		url.searchParams.set('status', status);
	}

	return url.toString();
};

const buildRankingUrl = ({
													 rankingType,
													 limit,
													 offset
												 }: {
	rankingType: AnimeRankingType;
	limit: number;
	offset: number;
}) => {
	const url = new URL(`${MAL_API_BASE_URL}/anime/ranking`);

	url.searchParams.set('ranking_type', rankingType);
	url.searchParams.set('limit', String(limit));
	url.searchParams.set('offset', String(offset));
	url.searchParams.set('nsfw', 'true');
	url.searchParams.set('fields', ANIME_NODE_FIELDS);

	return url.toString();
};

const buildAnimeSearchUrl = (query: string) => {
	const url = new URL(`${MAL_API_BASE_URL}/anime`);

	url.searchParams.set('q', query);
	url.searchParams.set('limit', String(ANIME_SEARCH_LIMIT));
	url.searchParams.set('nsfw', 'true');
	url.searchParams.set('fields', ANIME_NODE_FIELDS);

	return url.toString();
};

const buildAnimeDetailsUrl = (animeId: number) => {
	const url = new URL(`${MAL_API_BASE_URL}/anime/${animeId}`);

	url.searchParams.set('nsfw', 'true');
	url.searchParams.set('fields', ANIME_DETAILS_FIELDS);

	return url.toString();
};

const sortUserList = (animes: Anime[]) => {
	return animes.sort((a, b) => {
		const scoreDifference = b.customScore - a.customScore;

		if (scoreDifference !== 0) return scoreDifference;

		return a.title.localeCompare(b.title);
	});
};

const getReleaseSortValue = (anime: Anime) => {
	if (anime.startDate) {
		const [year, month = '1', day = '1'] = anime.startDate.split('-');
		const parsedYear = Number(year);
		const parsedMonth = Number(month);
		const parsedDay = Number(day);

		if (Number.isFinite(parsedYear)) {
			return (
				parsedYear * 10000 +
				(Number.isFinite(parsedMonth) ? parsedMonth : 1) * 100 +
				(Number.isFinite(parsedDay) ? parsedDay : 1)
			);
		}
	}

	const season = anime.startSeason?.season?.toLowerCase();
	const seasonMonth = season ? (SEASON_MONTH[season] ?? 1) : 1;

	if (anime.startSeason?.year) {
		return anime.startSeason.year * 10000 + seasonMonth * 100 + 1;
	}

	return Number.POSITIVE_INFINITY;
};

const sortByReleaseOrder = (animes: Anime[]) => {
	return [...animes].sort((a, b) => {
		const releaseDifference = getReleaseSortValue(a) - getReleaseSortValue(b);

		if (releaseDifference !== 0) return releaseDifference;

		return a.title.localeCompare(b.title);
	});
};

const fetchAllUserAnime = async ({
																	 resolvedUsername,
																	 status
																 }: {
	resolvedUsername: ResolvedUsername;
	status?: ApiAnimeStatus;
}) => {
	const clientId = getClientId();

	const animes: Anime[] = [];
	let nextUrl: string | undefined = buildUserAnimeListUrl({
		malUsername: resolvedUsername.malUsername,
		status
	});

	while (nextUrl) {
		const page = await fetchMalJson<MalPagedResponse<MalAnimeListEntry>>(nextUrl, clientId);

		for (const entry of page.data) {
			animes.push(
				mapAnime({
					node: entry.node,
					listStatus: entry.list_status
				})
			);
		}

		nextUrl = page.paging?.next;
	}

	return sortUserList(animes);
};

const fetchUserAnimeMap = async (resolvedUsername: ResolvedUsername) => {
	const cacheKey = resolvedUsername.malUsername.toLowerCase();
	const cached = userAnimeCache.get(cacheKey);

	if (cached && cached.expiresAt > Date.now()) {
		return cached.animeMap;
	}

	const animes = await fetchAllUserAnime({
		resolvedUsername
	});

	const animeMap = new Map(animes.map((anime) => [anime.id, anime]));

	userAnimeCache.set(cacheKey, {
		expiresAt: Date.now() + USER_ANIME_CACHE_MS,
		animeMap
	});

	return animeMap;
};

const fetchAnimeSearchResults = async (query: string, clientId: string) => {
	const trimmedQuery = query.trim();

	if (!trimmedQuery) return [];

	const page = await fetchMalJson<MalPagedResponse<MalAnimeSearchEntry>>(
		buildAnimeSearchUrl(trimmedQuery),
		clientId
	);

	return page.data.map((entry) =>
		mapAnime({
			node: entry.node
		})
	);
};

const fetchAnimeDetails = async (animeId: number, clientId: string) => {
	const cached = animeDetailsCache.get(animeId);

	if (cached && cached.expiresAt > Date.now()) {
		return cached.details;
	}

	const details = await fetchMalJson<MalAnimeDetailsResponse>(buildAnimeDetailsUrl(animeId), clientId);

	animeDetailsCache.set(animeId, {
		expiresAt: Date.now() + ANIME_DETAILS_CACHE_MS,
		details
	});

	return details;
};

type AnimeFranchiseStreamEvent =
	| {
	type: 'selected';
	anime: Anime;
}
	| {
	type: 'anime';
	anime: Anime;
}
	| {
	type: 'done';
	limited: boolean;
};

export const streamAnimeFranchise = async function* ({
																											 animeId
																										 }: {
	animeId: number | null;
}): AsyncGenerator<AnimeFranchiseStreamEvent> {
	const clientId = getClientId();
	const normalizedAnimeId = normalizeAnimeId(animeId);

	if (normalizedAnimeId === null) {
		throw new Error('Missing anime id.');
	}

	const queue: FranchiseQueueItem[] = [
		{
			id: normalizedAnimeId,
			relationType: null,
			relationTypeFormatted: null
		}
	];

	const queuedIds = new Set<number>([normalizedAnimeId]);
	const visitedIds = new Set<number>();

	let cursor = 0;
	let limited = false;

	while (cursor < queue.length) {
		if (visitedIds.size >= MAX_FRANCHISE_ANIME) {
			limited = true;
			break;
		}

		const item = queue[cursor++];

		if (!item || visitedIds.has(item.id)) continue;

		visitedIds.add(item.id);

		const details = await fetchAnimeDetails(item.id, clientId);

		const anime = mapAnime({
			node: details,
			relationType: item.relationType,
			relationTypeFormatted: item.relationTypeFormatted
		});

		yield {
			type: item.id === normalizedAnimeId ? 'selected' : 'anime',
			anime
		};

		for (const relation of details.related_anime ?? []) {
			const relatedId = relation.node.id;

			if (queuedIds.has(relatedId) || visitedIds.has(relatedId)) continue;

			if (visitedIds.size + queue.length - cursor >= MAX_FRANCHISE_ANIME) {
				limited = true;
				break;
			}

			queuedIds.add(relatedId);

			queue.push({
				id: relatedId,
				relationType: relation.relation_type ?? null,
				relationTypeFormatted: relation.relation_type_formatted ?? relation.relation_type ?? null
			});
		}
	}

	yield {
		type: 'done',
		limited
	};
};

const crawlAnimeFranchise = async (
	startAnimeId: number,
	clientId: string
): Promise<FranchiseCrawlResult> => {
	const queue: FranchiseQueueItem[] = [
		{
			id: startAnimeId,
			relationType: null,
			relationTypeFormatted: null
		}
	];

	const queuedIds = new Set<number>([startAnimeId]);
	const visitedIds = new Set<number>();
	const animeById = new Map<number, Anime>();

	let limited = false;

	while (queue.length > 0) {
		if (animeById.size >= MAX_FRANCHISE_ANIME) {
			limited = true;
			break;
		}

		const item = queue.shift();
		if (!item || visitedIds.has(item.id)) continue;

		visitedIds.add(item.id);

		const details = await fetchAnimeDetails(item.id, clientId);

		animeById.set(
			details.id,
			mapAnime({
				node: details,
				relationType: item.relationType,
				relationTypeFormatted: item.relationTypeFormatted
			})
		);

		for (const relation of details.related_anime ?? []) {
			const relatedId = relation.node.id;

			if (queuedIds.has(relatedId) || visitedIds.has(relatedId)) continue;

			if (animeById.size + queue.length >= MAX_FRANCHISE_ANIME) {
				limited = true;
				break;
			}

			queuedIds.add(relatedId);

			queue.push({
				id: relatedId,
				relationType: relation.relation_type ?? null,
				relationTypeFormatted: relation.relation_type_formatted ?? relation.relation_type ?? null
			});
		}
	}

	return {
		animes: sortByReleaseOrder([...animeById.values()]),
		limited
	};
};

export const fetchUserAnimeList = async ({
																					 username,
																					 status
																				 }: {
	username: string;
	status?: ApiAnimeStatus;
}): Promise<AnimeApiResponse> => {
	const resolvedUsername = resolveUsername(username);

	const animes = await fetchAllUserAnime({
		resolvedUsername,
		status
	});

	return {
		username: resolvedUsername.publicUsername,
		status: status ?? 'all',
		count: animes.length,
		animes
	};
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

	const resolvedUsername = username?.trim() ? resolveUsername(username) : null;
	const userAnimeMap = resolvedUsername ? await fetchUserAnimeMap(resolvedUsername) : new Map();

	const page = await fetchMalJson<MalPagedResponse<MalRankingEntry>>(
		buildRankingUrl({
			rankingType,
			limit: normalizedLimit,
			offset: normalizedOffset
		}),
		clientId
	);

	const animes = page.data
		.map((entry) => {
			const userAnime = userAnimeMap.get(entry.node.id) ?? null;

			return mapAnime({
				node: entry.node,
				userAnime,
				rank: entry.ranking?.rank ?? entry.node.rank ?? null
			});
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

export const searchAnimeFranchise = async ({
																						 query = ''
																					 }: {
	query?: string;
}): Promise<AnimeFranchiseApiResponse> => {
	const clientId = getClientId();
	const trimmedQuery = query.trim();

	if (!trimmedQuery) {
		throw new Error('Enter an anime title.');
	}

	const searchResults = await fetchAnimeSearchResults(trimmedQuery, clientId);

	return {
		query: trimmedQuery,
		selectedAnime: null,
		searchResults,
		franchiseAnimes: [],
		relatedAnimes: [],
		count: 0,
		limited: false
	};
};

export const fetchAnimeFranchise = async ({
																						animeId
																					}: {
	animeId: number | null;
}): Promise<AnimeFranchiseApiResponse> => {
	const clientId = getClientId();
	const normalizedAnimeId = normalizeAnimeId(animeId);

	if (normalizedAnimeId === null) {
		throw new Error('Missing anime id.');
	}

	const franchise = await crawlAnimeFranchise(normalizedAnimeId, clientId);
	const selectedAnime = franchise.animes.find((anime) => anime.id === normalizedAnimeId) ?? null;
	const relatedAnimes = franchise.animes.filter((anime) => anime.id !== normalizedAnimeId);

	return {
		query: selectedAnime?.title ?? '',
		selectedAnime,
		searchResults: [],
		franchiseAnimes: franchise.animes,
		relatedAnimes,
		count: franchise.animes.length,
		limited: franchise.limited
	};
};