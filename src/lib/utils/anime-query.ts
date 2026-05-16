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

export type AnimeFranchiseQueryState = {
	search: string;
	id: number | null;
};

const getTextParam = (url: URL, key: string) => {
	return url.searchParams.get(key)?.trim() ?? '';
};

const getRawParam = (url: URL, key: string) => {
	return url.searchParams.get(key);
};

const getNumberParam = (url: URL, key: string) => {
	const value = Number(url.searchParams.get(key));

	if (!Number.isFinite(value)) return null;

	const normalizedValue = Math.trunc(value);

	return normalizedValue > 0 ? normalizedValue : null;
};

const setOptionalParam = (
	params: URLSearchParams,
	key: string,
	value: string | undefined,
	defaultValue = ''
) => {
	const trimmedValue = value?.trim();

	if (!trimmedValue || trimmedValue === defaultValue) return;

	params.set(key, trimmedValue);
};

const buildHref = (path: string, params: URLSearchParams) => {
	const query = params.toString();

	return query ? `${path}?${query}` : path;
};

const sameStatuses = (a: readonly ApiAnimeStatus[], b: readonly ApiAnimeStatus[]) => {
	return a.length === b.length && a.every((status, index) => status === b[index]);
};

const encodeExcludedStatuses = (statuses: ApiAnimeStatus[]) => {
	if (statuses.length === 0) return 'none';
	if (sameStatuses(statuses, DEFAULT_EXCLUDED_STATUSES)) return undefined;

	return statuses.join(',');
};

export const parseExcludedStatuses = (value: string | null): ApiAnimeStatus[] => {
	if (!value) return [...DEFAULT_EXCLUDED_STATUSES];
	if (value.trim() === 'none') return [];

	return [
		...new Set(
			value
				.split(',')
				.map((status) => status.trim())
				.filter(isApiAnimeStatus)
		)
	];
};

export const parseAnimeListQuery = (url: URL): AnimeListQueryState => {
	const status = getRawParam(url, 'status');
	const sort = getRawParam(url, 'sort');
	const direction = getRawParam(url, 'dir');

	return {
		username: getTextParam(url, 'username'),
		search: getTextParam(url, 'q'),
		status: isAnimeStatusSelection(status) ? status : DEFAULT_STATUS,
		sort: isAnimeSortMetric(sort) ? sort : DEFAULT_SORT_METRIC,
		direction: isSortDirection(direction) ? direction : DEFAULT_SORT_DIRECTION
	};
};

export const parseAnimeRankingsQuery = (url: URL): AnimeRankingsQueryState => {
	const rankingType = getRawParam(url, 'rankingType');

	return {
		username: getTextParam(url, 'username'),
		search: getTextParam(url, 'q'),
		rankingType: isAnimeRankingType(rankingType) ? rankingType : DEFAULT_RANKING_TYPE,
		excludedStatuses: parseExcludedStatuses(getRawParam(url, 'exclude')),
		showScore: getRawParam(url, 'score') !== 'hide'
	};
};

export const parseAnimeStatsQuery = (url: URL): AnimeStatsQueryState => {
	return {
		username: getTextParam(url, 'username')
	};
};

export const parseAnimeFranchiseQuery = (url: URL): AnimeFranchiseQueryState => {
	return {
		search: getTextParam(url, 'q'),
		id: getNumberParam(url, 'id')
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

	setOptionalParam(params, 'username', username);
	setOptionalParam(params, 'q', search);
	setOptionalParam(params, 'status', status, DEFAULT_STATUS);
	setOptionalParam(params, 'sort', sort, DEFAULT_SORT_METRIC);
	setOptionalParam(params, 'dir', direction, DEFAULT_SORT_DIRECTION);

	return buildHref('/list', params);
};

export const buildAnimeRankingsHref = ({
																				 username,
																				 search,
																				 rankingType,
																				 excludedStatuses,
																				 showScore
																			 }: AnimeRankingsQueryState) => {
	const params = new URLSearchParams();

	setOptionalParam(params, 'username', username);
	setOptionalParam(params, 'q', search);
	setOptionalParam(params, 'rankingType', rankingType, DEFAULT_RANKING_TYPE);

	const encodedExcludedStatuses = encodeExcludedStatuses(excludedStatuses);

	if (encodedExcludedStatuses) {
		params.set('exclude', encodedExcludedStatuses);
	}

	if (!showScore) {
		params.set('score', 'hide');
	}

	return buildHref('/rankings', params);
};

export const buildAnimeStatsHref = ({ username }: AnimeStatsQueryState) => {
	const params = new URLSearchParams();

	setOptionalParam(params, 'username', username);

	return buildHref('/stats', params);
};

export const buildAnimeFranchiseHref = ({ search, id }: AnimeFranchiseQueryState) => {
	const params = new URLSearchParams();

	setOptionalParam(params, 'q', search);

	if (id) {
		params.set('id', String(id));
	}

	return buildHref('/franchise', params);
};