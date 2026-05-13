import {
	DEFAULT_EXCLUDED_STATUSES,
	DEFAULT_RANKING_TYPE,
	DEFAULT_SORT_DIRECTION,
	DEFAULT_SORT_METRIC,
	DEFAULT_STATUS,
	isAnimeRankingType,
	isAnimeSortMetric,
	isAnimeStatusSelection,
	isApiAnimeStatus,
	isSortDirection
} from '$lib/constants/anime';

import type {
	AnimeRankingType,
	AnimeSortMetric,
	ApiAnimeStatus,
	SortDirection
} from '$lib/types/anime';
import type { AnimeStatusSelection } from '$lib/constants/anime';

export type AnimeListQueryState = {
	username: string;
	search: string;
	status: AnimeStatusSelection;
	sort: AnimeSortMetric;
	direction: SortDirection;
};

export type AnimeRankingsQueryState = {
	username: string;
	search: string;
	rankingType: AnimeRankingType;
	excludedStatuses: ApiAnimeStatus[];
	showScore: boolean;
};

export type AnimeStatsQueryState = {
	username: string;
};

const getParam = (url: URL, key: string) => url.searchParams.get(key);

const withOptionalParam = (
	params: URLSearchParams,
	key: string,
	value: string | undefined,
	defaultValue?: string
) => {
	const trimmedValue = value?.trim();

	if (!trimmedValue || trimmedValue === defaultValue) return;

	params.set(key, trimmedValue);
};

export const parseExcludedStatuses = (value: string | null): ApiAnimeStatus[] => {
	if (!value) return [...DEFAULT_EXCLUDED_STATUSES];
	if (value === 'none') return [];

	const statuses: ApiAnimeStatus[] = [];

	for (const rawStatus of value.split(',')) {
		const status = rawStatus.trim();

		if (isApiAnimeStatus(status) && !statuses.includes(status)) {
			statuses.push(status);
		}
	}

	return statuses;
};

export const parseAnimeListQuery = (url: URL): AnimeListQueryState => {
	const status = getParam(url, 'status');
	const sort = getParam(url, 'sort');
	const direction = getParam(url, 'dir');

	return {
		username: getParam(url, 'username') ?? '',
		search: getParam(url, 'q') ?? '',
		status: isAnimeStatusSelection(status) ? status : DEFAULT_STATUS,
		sort: isAnimeSortMetric(sort) ? sort : DEFAULT_SORT_METRIC,
		direction: isSortDirection(direction) ? direction : DEFAULT_SORT_DIRECTION
	};
};

export const parseAnimeRankingsQuery = (url: URL): AnimeRankingsQueryState => {
	const rankingType = getParam(url, 'rankingType');

	return {
		username: getParam(url, 'username') ?? '',
		search: getParam(url, 'q') ?? '',
		rankingType: isAnimeRankingType(rankingType) ? rankingType : DEFAULT_RANKING_TYPE,
		excludedStatuses: parseExcludedStatuses(getParam(url, 'exclude')),
		showScore: getParam(url, 'score') !== 'hide'
	};
};

export const parseAnimeStatsQuery = (url: URL): AnimeStatsQueryState => {
	return {
		username: getParam(url, 'username') ?? ''
	};
};

export const buildAnimeListHref = ({
																		 username,
																		 search,
																		 status,
																		 sort,
																		 direction
																	 }: AnimeListQueryState) => {
	const params = new URLSearchParams();

	withOptionalParam(params, 'username', username);
	withOptionalParam(params, 'q', search);
	withOptionalParam(params, 'status', status, DEFAULT_STATUS);
	withOptionalParam(params, 'sort', sort, DEFAULT_SORT_METRIC);
	withOptionalParam(params, 'dir', direction, DEFAULT_SORT_DIRECTION);

	const query = params.toString();

	return query ? `/list?${query}` : '/list';
};

export const buildAnimeRankingsHref = ({
																				 username,
																				 search,
																				 rankingType,
																				 excludedStatuses,
																				 showScore
																			 }: AnimeRankingsQueryState) => {
	const params = new URLSearchParams();

	withOptionalParam(params, 'username', username);
	withOptionalParam(params, 'q', search);
	withOptionalParam(params, 'rankingType', rankingType, DEFAULT_RANKING_TYPE);

	if (excludedStatuses.length === 0) {
		params.set('exclude', 'none');
	} else if (
		excludedStatuses.length !== DEFAULT_EXCLUDED_STATUSES.length ||
		excludedStatuses[0] !== DEFAULT_EXCLUDED_STATUSES[0]
	) {
		params.set('exclude', excludedStatuses.join(','));
	}

	if (!showScore) {
		params.set('score', 'hide');
	}

	const query = params.toString();

	return query ? `/rankings?${query}` : '/rankings';
};

export const buildAnimeStatsHref = ({ username }: AnimeStatsQueryState) => {
	const params = new URLSearchParams();

	withOptionalParam(params, 'username', username);

	const query = params.toString();

	return query ? `/stats?${query}` : '/stats';
};