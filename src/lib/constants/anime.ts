import type {
	AnimeRankingType,
	AnimeSortMetric,
	ApiAnimeStatus,
	SortDirection
} from '$lib/types/anime';

export type SelectOption<T extends string = string> = {
	value: T;
	label: string;
};

export type AnimeStatusSelection = ApiAnimeStatus | 'all';

export const PAGE_SIZE = 100;

export const DEFAULT_STATUS: AnimeStatusSelection = 'completed';
export const DEFAULT_SORT_METRIC: AnimeSortMetric = 'score';
export const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';
export const DEFAULT_RANKING_TYPE: AnimeRankingType = 'all';
export const DEFAULT_EXCLUDED_STATUSES: ApiAnimeStatus[] = [];

export const STATUS_FILTERS: Array<SelectOption<AnimeStatusSelection>> = [
	{ value: 'all', label: 'all' },
	{ value: 'completed', label: 'completed' },
	{ value: 'watching', label: 'watching' },
	{ value: 'on_hold', label: 'on hold' },
	{ value: 'dropped', label: 'dropped' },
	{ value: 'plan_to_watch', label: 'plan to watch' }
];

export const SORT_OPTIONS: Array<SelectOption<AnimeSortMetric>> = [
	{ value: 'score', label: 'score' },
	{ value: 'title', label: 'title' },
	{ value: 'year', label: 'year' },
	{ value: 'totalEpisodes', label: 'eps' }
];

export const RANKING_TYPES: Array<SelectOption<AnimeRankingType>> = [
	{ value: 'all', label: 'top' },
	{ value: 'airing', label: 'airing' },
	{ value: 'upcoming', label: 'upcoming' },
	{ value: 'tv', label: 'tv' },
	{ value: 'movie', label: 'movies' },
	{ value: 'ova', label: 'ova' },
	{ value: 'special', label: 'specials' },
	{ value: 'bypopularity', label: 'popular' },
	{ value: 'favorite', label: 'favorites' }
];

export const EXCLUDE_STATUS_OPTIONS: Array<SelectOption<ApiAnimeStatus>> = [
	{ value: 'completed', label: 'completed' },
	{ value: 'watching', label: 'watching' },
	{ value: 'on_hold', label: 'on hold' },
	{ value: 'dropped', label: 'dropped' },
	{ value: 'plan_to_watch', label: 'plan to watch' }
];

export const DIRECTION_VALUES: SortDirection[] = ['asc', 'desc'];

export const STATUS_VALUES = STATUS_FILTERS.map((option) => option.value);
export const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);
export const RANKING_TYPE_VALUES = RANKING_TYPES.map((option) => option.value);
export const EXCLUDE_STATUS_VALUES = EXCLUDE_STATUS_OPTIONS.map((option) => option.value);

export const SEASON_ORDER: Record<string, number> = {
	winter: 1,
	spring: 2,
	summer: 3,
	fall: 4
};

const isOneOf = <T extends string>(values: readonly T[], value: string | null): value is T => {
	return typeof value === 'string' && values.includes(value as T);
};

export const isAnimeStatusSelection = (value: string | null): value is AnimeStatusSelection => {
	return isOneOf(STATUS_VALUES, value);
};

export const isAnimeSortMetric = (value: string | null): value is AnimeSortMetric => {
	return isOneOf(SORT_VALUES, value);
};

export const isAnimeRankingType = (value: string | null): value is AnimeRankingType => {
	return isOneOf(RANKING_TYPE_VALUES, value);
};

export const isApiAnimeStatus = (value: string | null): value is ApiAnimeStatus => {
	return isOneOf(EXCLUDE_STATUS_VALUES, value);
};

export const isSortDirection = (value: string | null): value is SortDirection => {
	return isOneOf(DIRECTION_VALUES, value);
};
