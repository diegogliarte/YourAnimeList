import { SEASON_ORDER } from '$lib/constants/anime';

import type { Anime, AnimeSortMetric, SortDirection } from '$lib/types/anime';
import type { AnimeStatusSelection } from '$lib/constants/anime';

type SortableValue = string | number | null;

type FilterAndSortAnimesParams = {
	animes: Anime[];
	status: AnimeStatusSelection;
	query: string;
	sortMetric: AnimeSortMetric;
	sortDirection: SortDirection;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const byTitle = (a: { title: string }, b: { title: string }) => {
	return a.title.localeCompare(b.title);
};

const applyDirection = (value: number, direction: SortDirection) => {
	return direction === 'asc' ? value : -value;
};

const animeSortValue: Record<AnimeSortMetric, (anime: Anime) => SortableValue> = {
	score: (anime) => {
		return anime.customScore && anime.customScore > 0 ? anime.customScore : null;
	},

	title: (anime) => {
		return anime.title.toLowerCase();
	},

	year: (anime) => {
		const year = anime.startSeason?.year;

		if (!year) return null;

		const season = anime.startSeason?.season?.toLowerCase();
		const seasonWeight = season ? (SEASON_ORDER[season] ?? 0) : 0;

		return year * 10 + seasonWeight;
	},

	totalEpisodes: (anime) => {
		return anime.totalEpisodes;
	}
};

export const filterByTitle = <T extends { title: string }>(items: T[], query: string) => {
	const normalizedQuery = normalizeText(query);

	if (!normalizedQuery) return items;

	return items.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
};

export const getAnimeSortValue = (anime: Anime, metric: AnimeSortMetric) => {
	return animeSortValue[metric](anime);
};

export const sortAnimes = (
	animes: Anime[],
	sortMetric: AnimeSortMetric,
	sortDirection: SortDirection
) => {
	return [...animes].sort((a, b) => {
		const aValue = getAnimeSortValue(a, sortMetric);
		const bValue = getAnimeSortValue(b, sortMetric);

		if (aValue === null || bValue === null) {
			if (aValue === null && bValue === null) return byTitle(a, b);
			return aValue === null ? 1 : -1;
		}

		const result =
			typeof aValue === 'string' && typeof bValue === 'string'
				? aValue.localeCompare(bValue)
				: Number(aValue) - Number(bValue);

		return result === 0 ? byTitle(a, b) : applyDirection(result, sortDirection);
	});
};

export const filterAndSortAnimes = ({
																			animes,
																			status,
																			query,
																			sortMetric,
																			sortDirection
																		}: FilterAndSortAnimesParams) => {
	const statusFiltered =
		status === 'all' ? animes : animes.filter((anime) => anime.status === status);

	return sortAnimes(filterByTitle(statusFiltered, query), sortMetric, sortDirection);
};

export const mergeUniqueById = <T extends { id: string | number }>(current: T[], incoming: T[]) => {
	const seenIds = new Set(current.map((item) => item.id));

	return [...current, ...incoming.filter((item) => !seenIds.has(item.id))];
};