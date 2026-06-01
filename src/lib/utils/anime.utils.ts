import type { AnimeEdge, AnimeListStatusName, UserAnimeListEdge } from '$lib/types/anime';
import { capitalize } from './format.utils';

export type StatusFilter = 'all' | AnimeListStatusName;

export const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
	{ label: 'All', value: 'all' },
	{ label: 'Watching', value: 'watching' },
	{ label: 'Completed', value: 'completed' },
	{ label: 'On Hold', value: 'on_hold' },
	{ label: 'Dropped', value: 'dropped' },
	{ label: 'Plan to Watch', value: 'plan_to_watch' }
];

export const INCLUDED_FRANCHISE_RELATIONS = new Set([
	'prequel',
	'sequel',
	'alternative_version',
	'side_story',
	'summary',
	'full_story',
	'parent_story',
]);

export const EXCLUDED_FRANCHISE_RELATIONS = new Set([
	'alternative_setting',
	'character',
	'other'
]);

export const SHOWCASE_MEDIA_TYPES = new Set(['tv', 'movie', 'ova']);

export function getAnimeUrl(id: number) {
	return `https://myanimelist.net/anime/${id}`;
}

export function getYearFromDate(date?: string | null) {
	if (!date) return 0;

	return Number(date.slice(0, 4)) || 0;
}

export function getYear(entry: AnimeEdge) {
	if (entry.node.start_season?.year) return entry.node.start_season.year;
	if (entry.node.start_date) return getYearFromDate(entry.node.start_date);

	return 0;
}

export function getSeasonValue(entry: AnimeEdge) {
	const year = getYear(entry);
	const season = entry.node.start_season?.season;

	const seasonValue =
		season === 'winter'
			? 1
			: season === 'spring'
				? 2
				: season === 'summer'
					? 3
					: season === 'fall'
						? 4
						: 0;

	return year * 10 + seasonValue;
}

export function formatSeason(entry: AnimeEdge) {
	const year = getYear(entry);
	const season = entry.node.start_season?.season;

	if (!year) return '-';
	if (!season) return String(year);

	return `${capitalize(season)} ${year}`;
}

export function getDuration(entry: AnimeEdge) {
	return entry.node.average_episode_duration ?? 0;
}

export function isShowcaseMedia(entry: AnimeEdge) {
	return SHOWCASE_MEDIA_TYPES.has(entry.node.media_type ?? '');
}

export function compareAnimeRelease(a: AnimeEdge, b: AnimeEdge) {
	const dateA = getSortableAnimeDate(a);
	const dateB = getSortableAnimeDate(b);

	const dateDiff = dateA.localeCompare(dateB);

	if (dateDiff !== 0) return dateDiff;

	return a.node.title.localeCompare(b.node.title);
}

export function getSortableAnimeDate(entry: AnimeEdge) {
	if (entry.node.start_date) return entry.node.start_date;

	const year = entry.node.start_season?.year;

	if (!year) return '9999-99-99';

	const season = entry.node.start_season?.season;

	const month =
		season === 'winter'
			? '01'
			: season === 'spring'
				? '04'
				: season === 'summer'
					? '07'
					: season === 'fall'
						? '10'
						: '99';

	return `${year}-${month}-01`;
}

export function getProgressValue(entry: UserAnimeListEdge) {
	const watched = entry.list_status?.num_episodes_watched ?? 0;
	const total = entry.node.num_episodes ?? 0;

	if (total <= 0) return watched;

	return watched / total;
}

export function formatProgress(entry: UserAnimeListEdge) {
	const watched = entry.list_status?.num_episodes_watched ?? 0;
	const total = entry.node.num_episodes;

	return `${watched}/${total || '?'}`;
}

export function getUniqueWatchedEpisodes(entry: UserAnimeListEdge) {
	return entry.list_status?.num_episodes_watched ?? 0;
}

export function getRewatchEpisodes(entry: UserAnimeListEdge) {
	const rewatches = entry.list_status?.num_times_rewatched ?? 0;
	const totalEpisodes = entry.node.num_episodes ?? 0;

	return rewatches * totalEpisodes;
}

export function getWatchedEpisodes(entry: UserAnimeListEdge) {
	return getUniqueWatchedEpisodes(entry) + getRewatchEpisodes(entry);
}

export function getUserScore(entry: UserAnimeListEdge) {
	return entry.list_status?.sort_score ?? entry.list_status?.score ?? 0;
}

export function getRawUserScore(entry: UserAnimeListEdge) {
	return entry.list_status?.score ?? 0;
}

export function getDisplayUserScore(entry: UserAnimeListEdge) {
	return entry.list_status?.display_score ?? String(entry.list_status?.score ?? '-');
}

export function getAnimeFilterText(entry: UserAnimeListEdge) {
	return [
		entry.node.title,
		entry.node.alternative_titles?.en,
		entry.node.alternative_titles?.ja,
		entry.node.media_type,
		entry.list_status?.status,
		entry.list_status?.display_score,
		entry.node.mean,
		formatSeason(entry),
		entry.node.genres?.map((genre) => genre.name).join(' ')
	]
		.filter(Boolean)
		.join(' ');
}

export function getRankingFilterText(entry: AnimeEdge, extraText = '') {
	return [
		entry.node.title,
		entry.node.alternative_titles?.en,
		entry.node.alternative_titles?.ja,
		entry.node.media_type,
		entry.node.status,
		entry.node.mean,
		entry.node.popularity,
		formatSeason(entry),
		entry.node.genres?.map((genre) => genre.name).join(' '),
		extraText
	]
		.filter(Boolean)
		.join(' ');
}