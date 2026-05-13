import { EXCLUDE_STATUS_OPTIONS } from '$lib/constants/anime';

import type { Anime, ApiAnimeStatus } from '$lib/types/anime';

export type StatCardValue = {
	label: string;
	value: string;
	help?: string;
};

export type ChartDatum = {
	label: string;
	value: number;
	detail?: string;
};

export type RuntimeAnimeStat = {
	id: Anime['id'];
	title: string;
	episodes: number;
	watchedEpisodes: number;
	episodeDurationSeconds: number;
	totalRuntimeSeconds: number;
	watchedRuntimeSeconds: number;
	totalRuntimeLabel: string;
	watchedRuntimeLabel: string;
};

export type AnimeStats = {
	cards: StatCardValue[];
	statusDistribution: ChartDatum[];
	scoreDistribution: ChartDatum[];
	mediaTypeDistribution: ChartDatum[];
	episodeDistribution: ChartDatum[];
	topYears: ChartDatum[];
	topTags: ChartDatum[];
	longestRuntime: RuntimeAnimeStat[];
};

type AnimeWithRuntime = Anime & {
	averageEpisodeDuration?: number | null;
	averageEpisodeDurationSeconds?: number | null;
	durationSeconds?: number | null;
};

const STATUS_LABELS: Record<ApiAnimeStatus, string> = {
	completed: 'completed',
	watching: 'watching',
	on_hold: 'on hold',
	dropped: 'dropped',
	plan_to_watch: 'plan to watch'
};

const EPISODE_BUCKETS = [
	{ label: '1', min: 1, max: 1 },
	{ label: '2-6', min: 2, max: 6 },
	{ label: '7-13', min: 7, max: 13 },
	{ label: '14-26', min: 14, max: 26 },
	{ label: '27-52', min: 27, max: 52 },
	{ label: '53+', min: 53, max: 99 },
	{ label: '100+', min: 100, max: Number.POSITIVE_INFINITY }
];

const normalizeMediaType = (mediaType: string | null | undefined) => {
	if (!mediaType) return 'unknown';

	return mediaType.replaceAll('_', ' ').toLowerCase();
};

const formatNumber = (value: number) => {
	return new Intl.NumberFormat('en-US').format(value);
};

const formatDecimal = (value: number, digits = 1) => {
	return value.toFixed(digits).replace(/\.?0+$/, '');
};

const toPercentage = (value: number, total: number) => {
	if (total === 0) return '0%';

	return `${formatDecimal((value / total) * 100)}%`;
};

const formatDuration = (seconds: number) => {
	if (!Number.isFinite(seconds) || seconds <= 0) return '—';

	const minutes = seconds / 60;
	const hours = seconds / 3600;
	const days = hours / 24;

	if (days >= 1) {
		return `${formatDecimal(days)}d`;
	}

	if (hours >= 1) {
		return `${formatDecimal(hours)}h`;
	}

	return `${Math.round(minutes)}m`;
};

const increment = <T extends string | number>(map: Map<T, number>, key: T, amount = 1) => {
	map.set(key, (map.get(key) ?? 0) + amount);
};

const toSortedChartData = <T extends string | number>(
	map: Map<T, number>,
	options: {
		total?: number;
		limit?: number;
		label?: (value: T) => string;
		sort?: 'label' | 'value-desc' | 'value-asc';
	} = {}
): ChartDatum[] => {
	const { total, limit, label = String, sort = 'value-desc' } = options;

	const items = [...map.entries()].map(([key, value]) => ({
		label: label(key),
		value,
		detail: typeof total === 'number' ? toPercentage(value, total) : undefined
	}));

	items.sort((a, b) => {
		if (sort === 'label') return a.label.localeCompare(b.label);
		if (sort === 'value-asc') return a.value - b.value;

		return b.value - a.value || a.label.localeCompare(b.label);
	});

	return typeof limit === 'number' ? items.slice(0, limit) : items;
};

const getTotalEpisodes = (anime: Anime) => {
	if (typeof anime.totalEpisodes === 'number' && anime.totalEpisodes > 0) {
		return anime.totalEpisodes;
	}

	if (anime.status === 'completed' && typeof anime.episodesWatched === 'number') {
		return anime.episodesWatched;
	}

	return 0;
};

const getRawWatchedEpisodes = (anime: Anime) => {
	if (typeof anime.episodesWatched === 'number' && anime.episodesWatched > 0) {
		return anime.episodesWatched;
	}

	if (anime.status === 'completed') {
		return getTotalEpisodes(anime);
	}

	return 0;
};

const getWatchedEpisodes = (anime: Anime) => {
	const watchedEpisodes = getRawWatchedEpisodes(anime);
	const totalEpisodes = getTotalEpisodes(anime);

	if (totalEpisodes <= 0) return watchedEpisodes;

	return Math.min(watchedEpisodes, totalEpisodes);
};

const getAverageEpisodeDurationSeconds = (anime: Anime) => {
	const runtimeAnime = anime as AnimeWithRuntime;

	const value =
		runtimeAnime.averageEpisodeDuration ??
		runtimeAnime.averageEpisodeDurationSeconds ??
		runtimeAnime.durationSeconds ??
		null;

	if (typeof value !== 'number' || value <= 0) {
		return null;
	}

	return value;
};

const getScore = (anime: Anime) => {
	return anime.score && anime.score > 0 ? anime.score : null;
};

const getIntegerScore = (anime: Anime) => {
	const score = getScore(anime);

	if (!score) return null;

	return Math.floor(score);
};

const getYear = (anime: Anime) => {
	return anime.startSeason?.year ?? null;
};

const getTags = (anime: Anime) => {
	return Array.isArray(anime.tags) ? anime.tags : [];
};

const buildRuntimeRow = (anime: Anime): RuntimeAnimeStat | null => {
	const episodes = getTotalEpisodes(anime);
	const episodeDurationSeconds = getAverageEpisodeDurationSeconds(anime);

	if (!episodes || !episodeDurationSeconds) {
		return null;
	}

	const watchedEpisodes = getWatchedEpisodes(anime);
	const totalRuntimeSeconds = episodes * episodeDurationSeconds;
	const watchedRuntimeSeconds = watchedEpisodes * episodeDurationSeconds;

	return {
		id: anime.id,
		title: anime.title,
		episodes,
		watchedEpisodes,
		episodeDurationSeconds,
		totalRuntimeSeconds,
		watchedRuntimeSeconds,
		totalRuntimeLabel: formatDuration(totalRuntimeSeconds),
		watchedRuntimeLabel: formatDuration(watchedRuntimeSeconds)
	};
};

export const buildAnimeStats = (animes: Anime[]): AnimeStats => {
	const totalEntries = animes.length;
	const completedAnimes = animes.filter((anime) => anime.status === 'completed');
	const completedTotal = completedAnimes.length;

	const statusMap = new Map<ApiAnimeStatus, number>();
	const scoreMap = new Map<number, number>();
	const mediaTypeMap = new Map<string, number>();
	const episodeBucketMap = new Map<string, number>();
	const yearMap = new Map<number, number>();
	const tagMap = new Map<string, number>();

	let ratedCompletedCount = 0;
	let completedScoreTotal = 0;
	let droppedCount = 0;
	let plannedCount = 0;

	let watchedRuntimeSeconds = 0;
	let watchedRuntimeEntries = 0;
	let completedRuntimeSeconds = 0;
	let completedRuntimeEntries = 0;

	const completedRuntimeRows: RuntimeAnimeStat[] = [];

	for (const option of EXCLUDE_STATUS_OPTIONS) {
		statusMap.set(option.value, 0);
	}

	for (const bucket of EPISODE_BUCKETS) {
		episodeBucketMap.set(bucket.label, 0);
	}

	for (const anime of animes) {
		increment(statusMap, anime.status);

		if (anime.status === 'dropped') droppedCount += 1;
		if (anime.status === 'plan_to_watch') plannedCount += 1;

		const episodeDurationSeconds = getAverageEpisodeDurationSeconds(anime);
		const watchedEpisodes = getWatchedEpisodes(anime);

		if (episodeDurationSeconds && watchedEpisodes > 0) {
			watchedRuntimeSeconds += watchedEpisodes * episodeDurationSeconds;
			watchedRuntimeEntries += 1;
		}
	}

	for (const anime of completedAnimes) {
		increment(mediaTypeMap, normalizeMediaType(anime.mediaType));

		const score = getScore(anime);
		const integerScore = getIntegerScore(anime);

		if (score !== null) {
			ratedCompletedCount += 1;
			completedScoreTotal += score;
		}

		if (integerScore !== null) {
			increment(scoreMap, integerScore);
		}

		const year = getYear(anime);

		if (year) {
			increment(yearMap, year);
		}

		const totalEpisodes = getTotalEpisodes(anime);

		if (totalEpisodes > 0) {
			const bucket = EPISODE_BUCKETS.find((item) => {
				return totalEpisodes >= item.min && totalEpisodes <= item.max;
			});

			if (bucket) {
				increment(episodeBucketMap, bucket.label);
			}
		}

		for (const tag of getTags(anime)) {
			const normalizedTag = tag.trim().toLowerCase();

			if (normalizedTag) {
				increment(tagMap, normalizedTag);
			}
		}

		const runtimeRow = buildRuntimeRow(anime);

		if (runtimeRow) {
			completedRuntimeSeconds += runtimeRow.totalRuntimeSeconds;
			completedRuntimeEntries += 1;
			completedRuntimeRows.push(runtimeRow);
		}
	}

	const averageCompletedScore =
		ratedCompletedCount > 0 ? completedScoreTotal / ratedCompletedCount : 0;

	const cards: StatCardValue[] = [
		{
			label: 'entries',
			value: formatNumber(totalEntries),
			help: `${formatNumber(completedTotal)} completed`
		},
		{
			label: 'completion',
			value: toPercentage(completedTotal, totalEntries),
			help: `${formatNumber(plannedCount)} planned`
		},
		{
			label: 'avg score',
			value: ratedCompletedCount > 0 ? formatDecimal(averageCompletedScore, 2) : '—',
			help: `${formatNumber(ratedCompletedCount)} completed rated`
		},
		{
			label: 'watched time',
			value: formatDuration(watchedRuntimeSeconds),
			help: `${formatNumber(watchedRuntimeEntries)} entries with watched eps`
		},
		{
			label: 'completed runtime',
			value: formatDuration(completedRuntimeSeconds),
			help: `${formatNumber(completedRuntimeEntries)} completed with duration`
		},
		{
			label: 'dropped',
			value: formatNumber(droppedCount),
			help: toPercentage(droppedCount, totalEntries)
		}
	];

	const statusDistribution = [...statusMap.entries()].map(([status, value]) => ({
		label: STATUS_LABELS[status],
		value,
		detail: toPercentage(value, totalEntries)
	}));

	const scoreDistribution = Array.from({ length: 10 }, (_, index) => {
		const score = 10 - index;
		const value = scoreMap.get(score) ?? 0;

		return {
			label: String(score),
			value,
			detail: toPercentage(value, ratedCompletedCount)
		};
	});

	const mediaTypeDistribution = toSortedChartData(mediaTypeMap, {
		total: completedTotal,
		limit: 8
	});

	const episodeDistribution = [...episodeBucketMap.entries()].map(([label, value]) => ({
		label,
		value,
		detail: toPercentage(value, completedTotal)
	}));

	const topYears = toSortedChartData(yearMap, {
		total: completedTotal,
		limit: 8,
		label: String
	});

	const topTags = toSortedChartData(tagMap, {
		limit: 8
	});

	const longestRuntime = completedRuntimeRows
		.sort((a, b) => {
			const runtimeDiff = b.totalRuntimeSeconds - a.totalRuntimeSeconds;

			if (runtimeDiff !== 0) return runtimeDiff;

			return a.title.localeCompare(b.title);
		})
		.slice(0, 8);

	return {
		cards,
		statusDistribution,
		scoreDistribution,
		mediaTypeDistribution,
		episodeDistribution,
		topYears,
		topTags,
		longestRuntime
	};
};