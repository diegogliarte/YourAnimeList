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

const compareTitles = (a: Anime, b: Anime) => {
	return a.title.localeCompare(b.title);
};

export const filterByTitle = <T extends { title: string }>(items: T[], query: string) => {
	const normalizedQuery = normalizeText(query);

	if (!normalizedQuery) return items;

	return items.filter((item) => {
		return item.title.toLowerCase().includes(normalizedQuery);
	});
};

export const getAnimeSortValue = (anime: Anime, metric: AnimeSortMetric): SortableValue => {
	switch (metric) {
		case 'score':
			return anime.customScore && anime.customScore > 0 ? anime.customScore : null;

		case 'title':
			return anime.title.toLowerCase();

		case 'year': {
			const year = anime.startSeason?.year;

			if (!year) return null;

			const season = anime.startSeason?.season
				? (SEASON_ORDER[anime.startSeason.season.toLowerCase()] ?? 0)
				: 0;

			return year * 10 + season;
		}

		case 'totalEpisodes':
			return anime.totalEpisodes;
	}
};

export const sortAnimes = (
	animes: Anime[],
	sortMetric: AnimeSortMetric,
	sortDirection: SortDirection
) => {
	return [...animes].sort((a, b) => {
		const aValue = getAnimeSortValue(a, sortMetric);
		const bValue = getAnimeSortValue(b, sortMetric);

		const aMissing = aValue === null;
		const bMissing = bValue === null;

		if (aMissing || bMissing) {
			if (aMissing && bMissing) return compareTitles(a, b);
			return aMissing ? 1 : -1;
		}

		if (typeof aValue === 'string' && typeof bValue === 'string') {
			const result = aValue.localeCompare(bValue);

			if (result !== 0) {
				return sortDirection === 'asc' ? result : -result;
			}

			return compareTitles(a, b);
		}

		const result = Number(aValue) - Number(bValue);

		if (result !== 0) {
			return sortDirection === 'asc' ? result : -result;
		}

		return compareTitles(a, b);
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

	const titleFiltered = filterByTitle(statusFiltered, query);

	return sortAnimes(titleFiltered, sortMetric, sortDirection);
};

export const mergeUniqueById = <T extends { id: string | number }>(current: T[], incoming: T[]) => {
	const seenIds = new Set(current.map((item) => item.id));
	const newItems = incoming.filter((item) => !seenIds.has(item.id));

	return [...current, ...newItems];
};
