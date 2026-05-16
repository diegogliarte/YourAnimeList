import { getContext, setContext } from 'svelte';

import {
	DEFAULT_EXCLUDED_STATUSES,
	DEFAULT_RANKING_TYPE,
	DEFAULT_SORT_DIRECTION,
	DEFAULT_SORT_METRIC,
	DEFAULT_STATUS
} from '$lib/constants/anime';

import type {
	AnimeApiResponse,
	AnimeRankingApiResponse,
	AnimeRankingType,
	AnimeSortMetric,
	ApiAnimeStatus,
	SortDirection
} from '$lib/types/anime';

import type { AnimeStatusSelection } from '$lib/constants/anime';
import type { AnimeListQueryState, AnimeRankingsQueryState } from '$lib/utils/anime-query';

class AnimeListCache {
	initialized = $state(false);

	username = $state('');
	loadedUsername = $state('');
	search = $state('');
	selectedStatus = $state<AnimeStatusSelection>(DEFAULT_STATUS);
	sortMetric = $state<AnimeSortMetric>(DEFAULT_SORT_METRIC);
	sortDirection = $state<SortDirection>(DEFAULT_SORT_DIRECTION);

	data = $state<AnimeApiResponse | null>(null);

	hydrate(query: AnimeListQueryState) {
		if (this.initialized) return;

		this.username = query.username;
		this.search = query.search;
		this.selectedStatus = query.status;
		this.sortMetric = query.sort;
		this.sortDirection = query.direction;
		this.initialized = true;
	}

	startNewSearch(username: string) {
		this.username = username;
		this.loadedUsername = '';
		this.data = null;
	}

	setResult(result: AnimeApiResponse) {
		this.username = result.username;
		this.loadedUsername = result.username;
		this.data = result;
	}
}

class AnimeRankingsCache {
	initialized = $state(false);

	username = $state('');
	loadedUsername = $state('');
	search = $state('');
	rankingType = $state<AnimeRankingType>(DEFAULT_RANKING_TYPE);
	excludedStatuses = $state<ApiAnimeStatus[]>([...DEFAULT_EXCLUDED_STATUSES]);
	showScore = $state(true);

	data = $state<AnimeRankingApiResponse | null>(null);
	nextOffset = $state<number | null>(null);

	hydrate(query: AnimeRankingsQueryState) {
		if (this.initialized) return;

		this.username = query.username;
		this.search = query.search;
		this.rankingType = query.rankingType;
		this.excludedStatuses = query.excludedStatuses;
		this.showScore = query.showScore;
		this.initialized = true;
	}

	startNewSearch(username: string) {
		this.username = username;
		this.loadedUsername = '';
		this.data = null;
		this.nextOffset = null;
	}

	setResult(result: AnimeRankingApiResponse, fallbackUsername: string) {
		const resultUsername = result.username ?? fallbackUsername;

		this.username = resultUsername;
		this.loadedUsername = resultUsername;
		this.nextOffset = result.nextOffset;
		this.data = result;
	}

	appendResult(result: AnimeRankingApiResponse, mergedAnimes: AnimeRankingApiResponse['animes']) {
		const resultUsername = (result.username ?? this.loadedUsername) || this.username;

		this.username = resultUsername;
		this.loadedUsername = resultUsername;
		this.nextOffset = result.nextOffset;

		this.data = {
			...result,
			count: mergedAnimes.length,
			animes: mergedAnimes
		};
	}
}

class AnimeCache {
	list = new AnimeListCache();
	rankings = new AnimeRankingsCache();
}

const ANIME_CACHE_CONTEXT_KEY = Symbol('anime-cache');

export const setAnimeCacheContext = () => {
	const cache = new AnimeCache();

	setContext(ANIME_CACHE_CONTEXT_KEY, cache);

	return cache;
};

export const getAnimeCacheContext = () => {
	const cache = getContext<AnimeCache | undefined>(ANIME_CACHE_CONTEXT_KEY);

	if (!cache) {
		throw new Error('Anime cache context was not initialized.');
	}

	return cache;
};
