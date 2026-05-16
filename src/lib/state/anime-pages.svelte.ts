import { goto } from '$app/navigation';

import { fetchAnimeList, fetchAnimeRankings } from '$lib/api/anime';
import {
	DEFAULT_SORT_DIRECTION,
	DEFAULT_SORT_METRIC,
	DEFAULT_STATUS,
	PAGE_SIZE
} from '$lib/constants/anime';
import { getAnimeCacheContext } from '$lib/state/anime-cache.svelte';
import { filterAndSortAnimes, filterByTitle, mergeUniqueById } from '$lib/utils/anime';
import { buildAnimeStats } from '$lib/utils/anime-stats';

import type { AnimeStatusSelection } from '$lib/constants/anime';
import type { AnimeRankingType, ApiAnimeStatus, SortDirection } from '$lib/types/anime';
import type {
	AnimeListQueryState,
	AnimeRankingsQueryState,
	AnimeStatsQueryState
} from '$lib/utils/anime-query';

type AnimeListPatch = Partial<AnimeListQueryState>;
type AnimeRankingsPatch = Partial<AnimeRankingsQueryState>;

const go = (href: string, replaceState = true) => {
	void goto(href, {
		replaceState,
		noScroll: true,
		keepFocus: true
	});
};

const getErrorMessage = (err: unknown) => {
	return err instanceof Error ? err.message : 'Unknown error.';
};

const getListDefaults = (username = ''): AnimeListQueryState => ({
	username,
	search: '',
	status: DEFAULT_STATUS,
	sort: DEFAULT_SORT_METRIC,
	direction: DEFAULT_SORT_DIRECTION
});

const hasLoadedUser = (
	state: {
		data: unknown;
		loadedUsername: string;
	},
	username: string
) => {
	return Boolean(state.data && state.loadedUsername === username);
};

export const createAnimeListPage = ({
																			query,
																			buildHref
																		}: {
	query: AnimeListQueryState;
	buildHref: (query: AnimeListQueryState) => string;
}) => {
	const listState = getAnimeCacheContext().list;

	listState.hydrate(query);

	let loading = $state(false);
	let error = $state<string | null>(null);

	const filteredAnimes = $derived(
		filterAndSortAnimes({
			animes: listState.data?.animes ?? [],
			status: listState.selectedStatus,
			query: listState.search,
			sortMetric: listState.sortMetric,
			sortDirection: listState.sortDirection
		})
	);

	const getQuery = (patch: AnimeListPatch = {}): AnimeListQueryState => ({
		username: listState.loadedUsername || listState.username,
		search: listState.search,
		status: listState.selectedStatus,
		sort: listState.sortMetric,
		direction: listState.sortDirection,
		...patch
	});

	const syncUrl = (patch: AnimeListPatch = {}, replaceState = true) => {
		go(buildHref(getQuery(patch)), replaceState);
	};

	const update = (patch: AnimeListPatch) => {
		if (patch.username !== undefined) listState.username = patch.username;
		if (patch.search !== undefined) listState.search = patch.search;
		if (patch.status !== undefined) listState.selectedStatus = patch.status;
		if (patch.sort !== undefined) listState.sortMetric = patch.sort;
		if (patch.direction !== undefined) listState.sortDirection = patch.direction;

		syncUrl(patch);
	};

	const toggleDirection = () => {
		update({
			direction: listState.sortDirection === 'asc' ? 'desc' : 'asc'
		});
	};

	const load = async (targetUsername = listState.username) => {
		const username = targetUsername.trim();

		if (!username) {
			error = 'Enter a username.';
			return;
		}

		try {
			loading = true;
			error = null;

			listState.startNewSearch(username);

			const result = await fetchAnimeList(username);

			listState.setResult(result);
			syncUrl({ username: result.username }, false);
		} catch (err) {
			error = getErrorMessage(err);
		} finally {
			loading = false;
		}
	};

	const loadInitial = () => {
		const username = query.username.trim();

		if (!username || hasLoadedUser(listState, username)) return;

		void load(username);
	};

	return {
		listState,

		get loading() {
			return loading;
		},

		get error() {
			return error;
		},

		get filteredAnimes() {
			return filteredAnimes;
		},

		load,
		loadInitial,
		update,
		toggleDirection
	};
};

export const createAnimeStatsPage = ({
																			 query,
																			 buildHref
																		 }: {
	query: AnimeStatsQueryState;
	buildHref: (query: AnimeStatsQueryState) => string;
}) => {
	const listState = getAnimeCacheContext().list;

	if (!listState.initialized) {
		listState.hydrate(getListDefaults(query.username));
	} else if (query.username) {
		listState.username = query.username;
	}

	let loading = $state(false);
	let error = $state<string | null>(null);

	const stats = $derived(listState.data ? buildAnimeStats(listState.data.animes) : null);

	const syncUrl = (username = listState.loadedUsername || listState.username, replaceState = true) => {
		go(buildHref({ username }), replaceState);
	};

	const load = async (targetUsername = listState.username) => {
		const username = targetUsername.trim();

		if (!username) {
			error = 'Enter a username.';
			return;
		}

		try {
			loading = true;
			error = null;

			listState.startNewSearch(username);

			const result = await fetchAnimeList(username);

			listState.setResult(result);
			syncUrl(result.username, false);
		} catch (err) {
			error = getErrorMessage(err);
		} finally {
			loading = false;
		}
	};

	const loadInitial = () => {
		const username = query.username.trim();

		if (!username || hasLoadedUser(listState, username)) return;

		void load(username);
	};

	return {
		listState,

		get loading() {
			return loading;
		},

		get error() {
			return error;
		},

		get stats() {
			return stats;
		},

		load,
		loadInitial
	};
};

export const createAnimeRankingsPage = ({
																					query,
																					buildHref
																				}: {
	query: AnimeRankingsQueryState;
	buildHref: (query: AnimeRankingsQueryState) => string;
}) => {
	const rankingsState = getAnimeCacheContext().rankings;

	rankingsState.hydrate(query);

	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);

	const hasMore = $derived(rankingsState.nextOffset !== null);

	const filteredAnimes = $derived(
		filterByTitle(rankingsState.data?.animes ?? [], rankingsState.search)
	);

	const getQuery = (patch: AnimeRankingsPatch = {}): AnimeRankingsQueryState => ({
		username: rankingsState.loadedUsername || rankingsState.username,
		search: rankingsState.search,
		rankingType: rankingsState.rankingType,
		excludedStatuses: rankingsState.excludedStatuses,
		showScore: rankingsState.showScore,
		...patch
	});

	const syncUrl = (patch: AnimeRankingsPatch = {}, replaceState = true) => {
		go(buildHref(getQuery(patch)), replaceState);
	};

	const update = (patch: AnimeRankingsPatch) => {
		if (patch.username !== undefined) rankingsState.username = patch.username;
		if (patch.search !== undefined) rankingsState.search = patch.search;
		if (patch.rankingType !== undefined) rankingsState.rankingType = patch.rankingType;
		if (patch.excludedStatuses !== undefined) rankingsState.excludedStatuses = patch.excludedStatuses;
		if (patch.showScore !== undefined) rankingsState.showScore = patch.showScore;

		syncUrl(patch);
	};

	const load = async ({
												targetUsername = rankingsState.username,
												offset = 0,
												append = false,
												rankingType = rankingsState.rankingType,
												excludedStatuses = rankingsState.excludedStatuses
											}: {
		targetUsername?: string;
		offset?: number;
		append?: boolean;
		rankingType?: AnimeRankingType;
		excludedStatuses?: ApiAnimeStatus[];
	} = {}) => {
		const username = targetUsername.trim();

		if (!username) {
			error = 'Enter a username.';
			return;
		}

		if (append) {
			if (loading || loadingMore || rankingsState.nextOffset === null) return;
			loadingMore = true;
		} else {
			loading = true;
			rankingsState.startNewSearch(username);
		}

		try {
			error = null;

			const result = await fetchAnimeRankings({
				username,
				rankingType,
				excludedStatuses,
				limit: PAGE_SIZE,
				offset
			});

			if (append && rankingsState.data) {
				const mergedAnimes = mergeUniqueById(rankingsState.data.animes, result.animes);
				rankingsState.appendResult(result, mergedAnimes);
			} else {
				rankingsState.setResult(result, username);
			}

			syncUrl(
				{
					username: rankingsState.loadedUsername,
					rankingType,
					excludedStatuses
				},
				false
			);
		} catch (err) {
			error = getErrorMessage(err);
		} finally {
			loading = false;
			loadingMore = false;
		}
	};

	const reload = ({
										rankingType = rankingsState.rankingType,
										excludedStatuses = rankingsState.excludedStatuses
									}: {
		rankingType?: AnimeRankingType;
		excludedStatuses?: ApiAnimeStatus[];
	} = {}) => {
		const username = rankingsState.loadedUsername || rankingsState.username;

		if (!username.trim()) return;

		void load({
			targetUsername: username,
			offset: 0,
			append: false,
			rankingType,
			excludedStatuses
		});
	};

	const loadMore = () => {
		if (rankingsState.nextOffset === null) return;

		void load({
			targetUsername: rankingsState.loadedUsername || rankingsState.username,
			offset: rankingsState.nextOffset,
			append: true
		});
	};

	const setRankingType = (rankingType: AnimeRankingType) => {
		update({ rankingType });
		reload({ rankingType });
	};

	const setExcludedStatuses = (excludedStatuses: ApiAnimeStatus[]) => {
		update({ excludedStatuses });
		reload({ excludedStatuses });
	};

	const setSearch = (search: string) => {
		update({ search });
	};

	const toggleScore = () => {
		update({ showScore: !rankingsState.showScore });
	};

	const submit = () => {
		void load({
			targetUsername: rankingsState.username,
			offset: 0,
			append: false
		});
	};

	const observeSentinel = (element: HTMLDivElement | null) => {
		if (!element || !rankingsState.data || !hasMore || loading || loadingMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					loadMore();
				}
			},
			{
				rootMargin: '600px 0px'
			}
		);

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	};

	const loadInitial = () => {
		const username = query.username.trim();

		if (!username || hasLoadedUser(rankingsState, username)) return;

		void load({
			targetUsername: username,
			offset: 0,
			append: false
		});
	};

	return {
		rankingsState,

		get loading() {
			return loading;
		},

		get loadingMore() {
			return loadingMore;
		},

		get error() {
			return error;
		},

		get hasMore() {
			return hasMore;
		},

		get filteredAnimes() {
			return filteredAnimes;
		},

		submit,
		loadInitial,
		observeSentinel,
		setSearch,
		setRankingType,
		setExcludedStatuses,
		toggleScore
	};
};