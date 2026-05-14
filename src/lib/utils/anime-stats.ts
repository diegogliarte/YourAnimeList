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
	numberOfTimesRewatched: number;
	totalWatches: number;
	episodeDurationSeconds: number;
	totalRuntimeSeconds: number;
	watchedRuntimeSeconds: number;
	totalRuntimeLabel: string;
	watchedRuntimeLabel: string;
};

export type RewatchAnimeStat = {
	id: Anime['id'];
	title: string;
	score: string;
	numberOfTimesRewatched: number;
	totalWatches: number;
	totalEpisodes: number;
	baseWatchedEpisodes: number;
	effectiveWatchedEpisodes: number;
	averageEpisodeDurationSeconds: number | null;
	effectiveWatchedRuntimeSeconds: number | null;
	effectiveWatchedRuntimeLabel: string;
};

export type GenreStat = {
	genre: string;
	count: number;
	ratedCount: number;
	episodes: number;
	runtimeSeconds: number;
	averageScore: number | null;
	averageScoreLabel: string;
	runtimeLabel: string;
};

export type AnimeStats = {
	cards: StatCardValue[];
	statusDistribution: ChartDatum[];
	scoreDistribution: ChartDatum[];
	mediaTypeDistribution: ChartDatum[];
	episodeDistribution: ChartDatum[];
	genreDistribution: ChartDatum[];
	topYears: ChartDatum[];
	topTags: ChartDatum[];
	genreStats: GenreStat[];
	bestGenres: GenreStat[];
	longestRuntime: RuntimeAnimeStat[];
	topRewatches: RewatchAnimeStat[];
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
	{ label: '53-99', min: 53, max: 99 },
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
	return value.toFixed(digits);
};

const toPercentage = (value: number, total: number) => {
	if (total === 0) return '0.0%';

	return `${formatDecimal((value / total) * 100, 1)}%`;
};

const formatSignedDecimal = (value: number, digits = 2) => {
	const formatted = formatDecimal(Math.abs(value), digits);

	if (value > 0) return `+${formatted}`;
	if (value < 0) return `-${formatted}`;

	return '0';
};

const formatDuration = (seconds: number | null | undefined) => {
	if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '—';

	const minutes = seconds / 60;
	const hours = seconds / 3600;
	const days = hours / 24;

	if (days >= 1) {
		return `${formatDecimal(days, 1)}d`;
	}

	if (hours >= 1) {
		return `${formatDecimal(hours, 1)}h`;
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

const getRewatchCount = (anime: Anime) => {
	const rewatches = anime.numberOfTimesRewatched ?? 0;

	if (!Number.isFinite(rewatches) || rewatches <= 0) {
		return 0;
	}

	return Math.trunc(rewatches);
};

const getWatchMultiplier = (anime: Anime) => {
	return 1 + getRewatchCount(anime);
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

const getEffectiveWatchedEpisodes = (anime: Anime) => {
	return getWatchedEpisodes(anime) * getWatchMultiplier(anime);
};

const getAverageEpisodeDurationSeconds = (anime: Anime) => {
	const value = anime.averageEpisodeDuration;

	if (typeof value !== 'number' || value <= 0) {
		return null;
	}

	return value;
};

const getEffectiveWatchedRuntimeSeconds = (anime: Anime) => {
	const watchedEpisodes = getEffectiveWatchedEpisodes(anime);
	const episodeDurationSeconds = getAverageEpisodeDurationSeconds(anime);

	if (!watchedEpisodes || !episodeDurationSeconds) {
		return null;
	}

	return watchedEpisodes * episodeDurationSeconds;
};

const getUniqueTotalRuntimeSeconds = (anime: Anime) => {
	const totalEpisodes = getTotalEpisodes(anime);
	const episodeDurationSeconds = getAverageEpisodeDurationSeconds(anime);

	if (!totalEpisodes || !episodeDurationSeconds) {
		return null;
	}

	return totalEpisodes * episodeDurationSeconds;
};

const getUserScore = (anime: Anime) => {
	return anime.score > 0 ? anime.score : null;
};

const getIntegerScore = (anime: Anime) => {
	const score = getUserScore(anime);

	if (!score) return null;

	return Math.floor(score);
};

const getYear = (anime: Anime) => {
	return anime.startSeason?.year ?? null;
};

const getGenres = (anime: Anime) => {
	return anime.genres.map((genre) => genre.name.trim()).filter(Boolean);
};

const getTags = (anime: Anime) => {
	return anime.tags.map((tag) => tag.trim().toLowerCase());
};

const getStandardDeviation = (values: number[]) => {
	if (values.length === 0) return 0;

	const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

	const variance =
		values.reduce((sum, value) => {
			return sum + (value - mean) ** 2;
		}, 0) / values.length;

	return Math.sqrt(variance);
};

const buildRuntimeRow = (anime: Anime): RuntimeAnimeStat | null => {
	const episodes = getTotalEpisodes(anime);
	const episodeDurationSeconds = getAverageEpisodeDurationSeconds(anime);

	if (!episodes || !episodeDurationSeconds) {
		return null;
	}

	const watchedEpisodes = getEffectiveWatchedEpisodes(anime);
	const totalRuntimeSeconds = episodes * episodeDurationSeconds;
	const watchedRuntimeSeconds = watchedEpisodes * episodeDurationSeconds;
	const numberOfTimesRewatched = getRewatchCount(anime);

	return {
		id: anime.id,
		title: anime.title,
		episodes,
		watchedEpisodes,
		numberOfTimesRewatched,
		totalWatches: getWatchMultiplier(anime),
		episodeDurationSeconds,
		totalRuntimeSeconds,
		watchedRuntimeSeconds,
		totalRuntimeLabel: formatDuration(totalRuntimeSeconds),
		watchedRuntimeLabel: formatDuration(watchedRuntimeSeconds)
	};
};

const buildRewatchRow = (anime: Anime): RewatchAnimeStat | null => {
	const numberOfTimesRewatched = getRewatchCount(anime);

	if (numberOfTimesRewatched <= 0) {
		return null;
	}

	const totalEpisodes = getTotalEpisodes(anime);
	const baseWatchedEpisodes = getWatchedEpisodes(anime);
	const effectiveWatchedEpisodes = getEffectiveWatchedEpisodes(anime);
	const averageEpisodeDurationSeconds = getAverageEpisodeDurationSeconds(anime);
	const effectiveWatchedRuntimeSeconds = getEffectiveWatchedRuntimeSeconds(anime);

	return {
		id: anime.id,
		title: anime.title,
		score: anime.displayScore || String(anime.score || '—'),
		numberOfTimesRewatched,
		totalWatches: getWatchMultiplier(anime),
		totalEpisodes,
		baseWatchedEpisodes,
		effectiveWatchedEpisodes,
		averageEpisodeDurationSeconds,
		effectiveWatchedRuntimeSeconds,
		effectiveWatchedRuntimeLabel: formatDuration(effectiveWatchedRuntimeSeconds)
	};
};

type GenreAccumulator = {
	genre: string;
	count: number;
	ratedCount: number;
	scoreTotal: number;
	episodes: number;
	runtimeSeconds: number;
};

const getOrCreateGenreAccumulator = (map: Map<string, GenreAccumulator>, genre: string) => {
	const existing = map.get(genre);

	if (existing) return existing;

	const created: GenreAccumulator = {
		genre,
		count: 0,
		ratedCount: 0,
		scoreTotal: 0,
		episodes: 0,
		runtimeSeconds: 0
	};

	map.set(genre, created);

	return created;
};

const buildGenreStats = (map: Map<string, GenreAccumulator>): GenreStat[] => {
	return [...map.values()]
		.map((item) => {
			const averageScore = item.ratedCount > 0 ? item.scoreTotal / item.ratedCount : null;

			return {
				genre: item.genre,
				count: item.count,
				ratedCount: item.ratedCount,
				episodes: item.episodes,
				runtimeSeconds: item.runtimeSeconds,
				averageScore,
				averageScoreLabel: averageScore === null ? '—' : formatDecimal(averageScore, 2),
				runtimeLabel: formatDuration(item.runtimeSeconds)
			};
		})
		.sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
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
	const genreMap = new Map<string, number>();
	const genreAccumulatorMap = new Map<string, GenreAccumulator>();

	let droppedCount = 0;
	let plannedCount = 0;

	let watchedEpisodeTotal = 0;
	let watchedRuntimeSeconds = 0;
	let watchedRuntimeEntries = 0;

	let uniqueCompletedEpisodeTotal = 0;
	let effectiveCompletedEpisodeTotal = 0;
	let uniqueCompletedRuntimeSeconds = 0;
	let effectiveCompletedRuntimeSeconds = 0;
	let completedRuntimeEntries = 0;

	let completedScoreTotal = 0;
	let completedRatedCount = 0;
	let completedMeanGapTotal = 0;
	let completedMeanGapCount = 0;

	let rewatchedEntryCount = 0;
	let totalRewatchCount = 0;

	const completedScores: number[] = [];
	const completedRuntimeRows: RuntimeAnimeStat[] = [];
	const rewatchRows: RewatchAnimeStat[] = [];

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

		const rewatchCount = getRewatchCount(anime);

		if (rewatchCount > 0) {
			rewatchedEntryCount += 1;
			totalRewatchCount += rewatchCount;

			const rewatchRow = buildRewatchRow(anime);

			if (rewatchRow) {
				rewatchRows.push(rewatchRow);
			}
		}

		const effectiveWatchedEpisodes = getEffectiveWatchedEpisodes(anime);
		const effectiveWatchedRuntime = getEffectiveWatchedRuntimeSeconds(anime);

		watchedEpisodeTotal += effectiveWatchedEpisodes;

		if (effectiveWatchedEpisodes > 0 && effectiveWatchedRuntime !== null) {
			watchedRuntimeSeconds += effectiveWatchedRuntime;
			watchedRuntimeEntries += 1;
		}
	}

	for (const anime of completedAnimes) {
		increment(mediaTypeMap, normalizeMediaType(anime.mediaType));

		const score = getUserScore(anime);
		const integerScore = getIntegerScore(anime);

		if (score !== null) {
			completedRatedCount += 1;
			completedScoreTotal += score;
			completedScores.push(score);
		}

		if (score !== null && typeof anime.mean === 'number' && anime.mean > 0) {
			completedMeanGapTotal += score - anime.mean;
			completedMeanGapCount += 1;
		}

		if (integerScore !== null) {
			increment(scoreMap, integerScore);
		}

		const year = getYear(anime);

		if (year) {
			increment(yearMap, year);
		}

		const totalEpisodes = getTotalEpisodes(anime);
		const effectiveWatchedEpisodes = getEffectiveWatchedEpisodes(anime);

		uniqueCompletedEpisodeTotal += totalEpisodes;
		effectiveCompletedEpisodeTotal += effectiveWatchedEpisodes;

		if (totalEpisodes > 0) {
			const bucket = EPISODE_BUCKETS.find((item) => {
				return totalEpisodes >= item.min && totalEpisodes <= item.max;
			});

			if (bucket) {
				increment(episodeBucketMap, bucket.label);
			}
		}

		for (const tag of getTags(anime)) {
			increment(tagMap, tag);
		}

		const runtimeRow = buildRuntimeRow(anime);
		const uniqueRuntime = getUniqueTotalRuntimeSeconds(anime);
		const effectiveRuntime = getEffectiveWatchedRuntimeSeconds(anime);

		if (runtimeRow && uniqueRuntime !== null && effectiveRuntime !== null) {
			uniqueCompletedRuntimeSeconds += uniqueRuntime;
			effectiveCompletedRuntimeSeconds += effectiveRuntime;
			completedRuntimeEntries += 1;
			completedRuntimeRows.push(runtimeRow);
		}

		const genres = getGenres(anime);

		for (const genre of genres) {
			increment(genreMap, genre);

			const genreAccumulator = getOrCreateGenreAccumulator(genreAccumulatorMap, genre);

			genreAccumulator.count += 1;
			genreAccumulator.episodes += effectiveWatchedEpisodes;

			if (score !== null) {
				genreAccumulator.ratedCount += 1;
				genreAccumulator.scoreTotal += score;
			}

			if (effectiveRuntime !== null) {
				genreAccumulator.runtimeSeconds += effectiveRuntime;
			}
		}
	}

	const averageCompletedScore =
		completedRatedCount > 0 ? completedScoreTotal / completedRatedCount : 0;

	const scoreStandardDeviation = getStandardDeviation(completedScores);

	const averageCompletedEpisodes =
		completedTotal > 0 ? effectiveCompletedEpisodeTotal / completedTotal : 0;

	const averageMeanGap =
		completedMeanGapCount > 0 ? completedMeanGapTotal / completedMeanGapCount : 0;

	const genreStats = buildGenreStats(genreAccumulatorMap);

	const bestGenres = [...genreStats]
		.filter((genre) => genre.ratedCount >= 3 && genre.averageScore !== null)
		.sort((a, b) => {
			const scoreDiff = (b.averageScore ?? 0) - (a.averageScore ?? 0);

			if (scoreDiff !== 0) return scoreDiff;

			return b.count - a.count || a.genre.localeCompare(b.genre);
		})
		.slice(0, 12);

	const topRewatches = rewatchRows
		.sort((a, b) => {
			const rewatchDiff = b.numberOfTimesRewatched - a.numberOfTimesRewatched;

			if (rewatchDiff !== 0) return rewatchDiff;

			const runtimeDiff =
				(b.effectiveWatchedRuntimeSeconds ?? 0) - (a.effectiveWatchedRuntimeSeconds ?? 0);

			if (runtimeDiff !== 0) return runtimeDiff;

			return a.title.localeCompare(b.title);
		})
		.slice(0, 10);

	const cards: StatCardValue[] = [
		{
			label: 'entries',
			value: formatNumber(completedTotal),
			help: `${formatNumber(totalEntries)} total entries`
		},
		{
			label: 'eps watched',
			value: formatNumber(watchedEpisodeTotal),
			help: 'includes rewatches'
		},
		{
			label: 'watched time',
			value: formatDuration(watchedRuntimeSeconds),
			help: `${formatNumber(watchedRuntimeEntries)} entries with duration`
		},
		{
			label: 'avg score',
			value: completedRatedCount > 0 ? formatDecimal(averageCompletedScore, 2) : '—',
			help: `${formatNumber(completedRatedCount)} completed rated`
		},
		{
			label: 'completion',
			value: toPercentage(completedTotal, totalEntries),
			help: `${formatNumber(plannedCount)} planned`
		},
		{
			label: 'score spread',
			value: completedScores.length > 0 ? formatDecimal(scoreStandardDeviation, 2) : '—',
			help: 'standard deviation'
		},
		{
			label: 'vs MAL mean',
			value: completedMeanGapCount > 0 ? formatSignedDecimal(averageMeanGap, 2) : '—',
			help: `${formatNumber(completedMeanGapCount)} comparable`
		},
		{
			label: 'completed eps',
			value: formatNumber(effectiveCompletedEpisodeTotal),
			help: `${formatNumber(uniqueCompletedEpisodeTotal)} unique`
		},
		{
			label: 'completed runtime',
			value: formatDuration(effectiveCompletedRuntimeSeconds),
			help: `${formatDuration(uniqueCompletedRuntimeSeconds)} unique`
		},
		{
			label: 'genres',
			value: formatNumber(genreStats.length),
			help: 'completed entries'
		},
		{
			label: 'runtime coverage',
			value: toPercentage(completedRuntimeEntries, completedTotal),
			help: 'completed with duration'
		},
		{
			label: 'rewatchers',
			value: formatNumber(rewatchedEntryCount),
			help: `${formatNumber(totalRewatchCount)} extra watches`
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
			detail: toPercentage(value, completedRatedCount)
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

	const genreDistribution = toSortedChartData(genreMap, {
		total: completedTotal,
		limit: 10
	});

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
		.slice(0, 12);

	return {
		cards,
		statusDistribution,
		scoreDistribution,
		mediaTypeDistribution,
		episodeDistribution,
		genreDistribution,
		topYears,
		topTags,
		genreStats: genreStats.slice(0, 12),
		bestGenres,
		longestRuntime,
		topRewatches
	};
};