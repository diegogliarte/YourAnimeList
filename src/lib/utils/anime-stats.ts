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

export type StatsTableRow = {
	key: string | number;
	values: Array<string | number>;
};

export type DetailsByLabel = Record<string, string[]>;

export type AnimeStatItem = {
	id: Anime['id'];
	title: string;
	image: Anime['image'];
	href: string;

	status: ApiAnimeStatus;
	statusLabel: string;
	completed: boolean;

	score: number | null;
	scoreLabel: string;
	scoreBucket: string | null;

	mean: number | null;
	meanLabel: string;
	gap: number | null;
	gapLabel: string;
	meanGapBucket: string | null;

	popularity: number | null;
	popularityLabel: string | null;

	mediaType: string;

	year: number | null;
	yearLabel: string | null;
	decadeLabel: string | null;
	seasonLabel: string | null;

	episodes: number;
	episodeBucket: string | null;

	baseWatchedEpisodes: number;
	effectiveWatchedEpisodes: number;

	rewatchCount: number;
	totalWatches: number;

	episodeDurationSeconds: number | null;
	totalRuntimeSeconds: number | null;
	watchedRuntimeSeconds: number | null;
	totalRuntimeLabel: string;
	watchedRuntimeLabel: string;

	genres: string[];
	tags: string[];

	labels: {
		status: string;
		score: string | null;
		genre: string[];
		mediaType: string;
		episodeBucket: string | null;
		year: string | null;
		season: string | null;
		decade: string | null;
		meanGap: string | null;
		tag: string[];
	};
};

export type AnimeSpotlightStat = AnimeStatItem & {
	score: number;
	mean: number;
	gap: number;
	meanGapBucket: string;
};

export type AnimeStats = {
	items: AnimeStatItem[];
	completedItems: AnimeStatItem[];

	cards: StatCardValue[];

	charts: {
		status: ChartDatum[];
		scores: ChartDatum[];
		genres: ChartDatum[];
		mediaTypes: ChartDatum[];
		episodes: ChartDatum[];
		decades: ChartDatum[];
		years: ChartDatum[];
		seasons: ChartDatum[];
		meanGap: ChartDatum[];
		tags: ChartDatum[];
	};

	details: {
		status: DetailsByLabel;
		scores: DetailsByLabel;
		genres: DetailsByLabel;
		mediaTypes: DetailsByLabel;
		episodes: DetailsByLabel;
		decades: DetailsByLabel;
		years: DetailsByLabel;
		seasons: DetailsByLabel;
		meanGap: DetailsByLabel;
	};

	tables: {
		longestRuntime: StatsTableRow[];
		topRewatches: StatsTableRow[];
		tags: StatsTableRow[];
		genres: StatsTableRow[];
		bestGenres: StatsTableRow[];
	};

	spotlights: {
		hiddenGems: AnimeSpotlightStat[];
		overratedByMal: AnimeSpotlightStat[];
		mostObscure: AnimeSpotlightStat[];
	};
};

type LabelGetter<T> = (
	item: T
) => string | null | undefined | Array<string | null | undefined>;

type GenreSummary = {
	genre: string;
	count: number;
	ratedCount: number;
	scoreTotal: number;
	episodes: number;
	runtimeSeconds: number;
	averageScore: number | null;
};

const STATUS_ORDER: ApiAnimeStatus[] = [
	'completed',
	'watching',
	'on_hold',
	'dropped',
	'plan_to_watch'
];

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
	{ label: '100-999', min: 100, max: 999 },
	{ label: '1000+', min: 1000, max: Number.POSITIVE_INFINITY }
];

const SEASON_ORDER = ['winter', 'spring', 'summer', 'fall'];

const SEASON_LABELS: Record<string, string> = {
	winter: 'winter',
	spring: 'spring',
	summer: 'summer',
	fall: 'fall'
};

const MEAN_GAP_BUCKETS = [
	{ label: 'you +2', min: 2, max: Number.POSITIVE_INFINITY },
	{ label: 'you +1', min: 1, max: 2 },
	{ label: 'close', min: -1, max: 1 },
	{ label: 'MAL +1', min: -2, max: -1 },
	{ label: 'MAL +2', min: Number.NEGATIVE_INFINITY, max: -2 }
];

const COMPARABLE_MEDIA_TYPES = new Set(['tv', 'movie', 'ova']);

const STATUS_CHART_ORDER = STATUS_ORDER.map((status) => STATUS_LABELS[status]);
const SCORE_CHART_ORDER = Array.from({ length: 10 }, (_, index) => String(10 - index));
const EPISODE_CHART_ORDER = EPISODE_BUCKETS.map((bucket) => bucket.label);
const SEASON_CHART_ORDER = SEASON_ORDER.map((season) => SEASON_LABELS[season]);
const MEAN_GAP_CHART_ORDER = MEAN_GAP_BUCKETS.map((bucket) => bucket.label);

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

const formatDecimal = (value: number, digits = 1) => value.toFixed(digits);

const formatSignedDecimal = (value: number, digits = 2) => {
	if (value > 0) return `+${formatDecimal(value, digits)}`;
	if (value < 0) return `-${formatDecimal(Math.abs(value), digits)}`;

	return '0';
};

const toPercentage = (value: number, total: number) => {
	if (total <= 0) return '0.0%';

	return `${formatDecimal((value / total) * 100, 1)}%`;
};

const formatDuration = (seconds: number | null | undefined) => {
	if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '—';

	const minutes = seconds / 60;
	const hours = seconds / 3600;
	const days = hours / 24;

	if (days >= 1) return `${formatDecimal(days, 1)}d`;
	if (hours >= 1) return `${formatDecimal(hours, 1)}h`;

	return `${Math.round(minutes)}m`;
};

const normalizeMediaType = (mediaType: string | null | undefined) => {
	return mediaType?.replaceAll('_', ' ').toLowerCase() || 'unknown';
};

const average = (total: number, count: number) => {
	return count > 0 ? total / count : 0;
};

const standardDeviation = (values: number[]) => {
	if (values.length === 0) return 0;

	const mean = average(
		values.reduce((sum, value) => sum + value, 0),
		values.length
	);

	const variance = average(
		values.reduce((sum, value) => sum + (value - mean) ** 2, 0),
		values.length
	);

	return Math.sqrt(variance);
};

const byTitle = <T extends { title: string }>(a: T, b: T) => {
	return a.title.localeCompare(b.title);
};

const takeSorted = <T>(items: T[], compare: (a: T, b: T) => number, limit: number) => {
	return [...items].sort(compare).slice(0, limit);
};

const toLabels = <T>(item: T, getLabels: LabelGetter<T>) => {
	const rawLabels = getLabels(item);
	const labels = Array.isArray(rawLabels) ? rawLabels : [rawLabels];

	return [...new Set(labels.filter(Boolean) as string[])];
};

const countByLabel = <T>(
	items: T[],
	getLabels: LabelGetter<T>,
	order: string[] = []
): Map<string, number> => {
	const map = new Map(order.map((label) => [label, 0]));

	for (const item of items) {
		for (const label of toLabels(item, getLabels)) {
			map.set(label, (map.get(label) ?? 0) + 1);
		}
	}

	return map;
};

const detailsByLabel = <T extends { title: string }>(
	items: T[],
	getLabels: LabelGetter<T>
): DetailsByLabel => {
	const details: DetailsByLabel = {};

	for (const item of items) {
		for (const label of toLabels(item, getLabels)) {
			details[label] ??= [];
			details[label].push(item.title);
		}
	}

	for (const titles of Object.values(details)) {
		titles.sort((a, b) => a.localeCompare(b));
	}

	return details;
};

const chartFromCounts = (
	counts: Map<string, number>,
	options: {
		total?: number;
		limit?: number;
		order?: string[];
		sort?: 'label' | 'value-desc' | 'value-asc';
	} = {}
): ChartDatum[] => {
	const { total, limit, order, sort = 'value-desc' } = options;

	const entries = order
		? order.map((label) => [label, counts.get(label) ?? 0] as const)
		: [...counts.entries()];

	if (!order) {
		entries.sort(([aLabel, aValue], [bLabel, bValue]) => {
			if (sort === 'label') return aLabel.localeCompare(bLabel);
			if (sort === 'value-asc') return aValue - bValue || aLabel.localeCompare(bLabel);

			return bValue - aValue || aLabel.localeCompare(bLabel);
		});
	}

	return entries.slice(0, limit).map(([label, value]) => ({
		label,
		value,
		detail: typeof total === 'number' ? toPercentage(value, total) : undefined
	}));
};

const chartByLabel = <T>(
	items: T[],
	getLabels: LabelGetter<T>,
	options: {
		total?: number;
		limit?: number;
		order?: string[];
		sort?: 'label' | 'value-desc' | 'value-asc';
	} = {}
): ChartDatum[] => {
	return chartFromCounts(countByLabel(items, getLabels, options.order), options);
};

const getRewatchCount = (anime: Anime) => {
	const rewatches = anime.numberOfTimesRewatched ?? 0;

	return Number.isFinite(rewatches) && rewatches > 0 ? Math.trunc(rewatches) : 0;
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

const getWatchedEpisodes = (anime: Anime, totalEpisodes: number) => {
	let watchedEpisodes = 0;

	if (typeof anime.episodesWatched === 'number' && anime.episodesWatched > 0) {
		watchedEpisodes = anime.episodesWatched;
	} else if (anime.status === 'completed') {
		watchedEpisodes = totalEpisodes;
	}

	return totalEpisodes > 0 ? Math.min(watchedEpisodes, totalEpisodes) : watchedEpisodes;
};

const getEpisodeBucket = (episodes: number) => {
	if (episodes <= 0) return null;

	return EPISODE_BUCKETS.find((bucket) => episodes >= bucket.min && episodes <= bucket.max)?.label ?? null;
};

const getSeasonLabel = (anime: Anime) => {
	const season = anime.startSeason?.season?.toLowerCase();

	if (!season) return null;

	return SEASON_LABELS[season] ?? season.replaceAll('_', ' ');
};

const getMeanGapBucket = (gap: number | null) => {
	if (gap === null) return null;

	return MEAN_GAP_BUCKETS.find((bucket) => gap >= bucket.min && gap < bucket.max)?.label ?? 'close';
};

const getGenres = (anime: Anime) => {
	return anime.genres.map((genre) => genre.name.trim()).filter(Boolean);
};

const getTags = (anime: Anime) => {
	return anime.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
};

const toStatItem = (anime: Anime): AnimeStatItem => {
	const score = anime.score > 0 ? anime.score : null;
	const mean = typeof anime.mean === 'number' && anime.mean > 0 ? anime.mean : null;
	const gap = score !== null && mean !== null ? score - mean : null;

	const popularity = anime.popularity ?? null;
	const mediaType = normalizeMediaType(anime.mediaType);

	const year = anime.startSeason?.year ?? null;
	const yearLabel = year ? String(year) : null;
	const decadeLabel = year ? `${Math.floor(year / 10) * 10}s` : null;
	const seasonLabel = getSeasonLabel(anime);

	const episodes = getTotalEpisodes(anime);
	const episodeBucket = getEpisodeBucket(episodes);

	const rewatchCount = getRewatchCount(anime);
	const totalWatches = 1 + rewatchCount;

	const baseWatchedEpisodes = getWatchedEpisodes(anime, episodes);
	const effectiveWatchedEpisodes = baseWatchedEpisodes * totalWatches;

	const episodeDurationSeconds =
		typeof anime.averageEpisodeDuration === 'number' && anime.averageEpisodeDuration > 0
			? anime.averageEpisodeDuration
			: null;

	const totalRuntimeSeconds =
		episodes > 0 && episodeDurationSeconds ? episodes * episodeDurationSeconds : null;

	const watchedRuntimeSeconds =
		effectiveWatchedEpisodes > 0 && episodeDurationSeconds
			? effectiveWatchedEpisodes * episodeDurationSeconds
			: null;

	const statusLabel = STATUS_LABELS[anime.status];
	const scoreBucket = score === null ? null : String(Math.floor(score));
	const meanGapBucket = getMeanGapBucket(gap);

	const genres = getGenres(anime);
	const tags = getTags(anime);

	return {
		id: anime.id,
		title: anime.title,
		image: anime.image,
		href: `https://myanimelist.net/anime/${anime.id}`,

		status: anime.status,
		statusLabel,
		completed: anime.status === 'completed',

		score,
		scoreLabel: score === null ? '—' : anime.displayScore || formatDecimal(score, 1),
		scoreBucket,

		mean,
		meanLabel: mean === null ? '—' : formatDecimal(mean, 2),
		gap,
		gapLabel: gap === null ? '—' : formatSignedDecimal(gap, 2),
		meanGapBucket,

		popularity,
		popularityLabel: popularity === null ? null : `#${formatNumber(popularity)} popularity`,

		mediaType,

		year,
		yearLabel,
		decadeLabel,
		seasonLabel,

		episodes,
		episodeBucket,

		baseWatchedEpisodes,
		effectiveWatchedEpisodes,

		rewatchCount,
		totalWatches,

		episodeDurationSeconds,
		totalRuntimeSeconds,
		watchedRuntimeSeconds,
		totalRuntimeLabel: formatDuration(totalRuntimeSeconds),
		watchedRuntimeLabel: formatDuration(watchedRuntimeSeconds),

		genres,
		tags,

		labels: {
			status: statusLabel,
			score: scoreBucket,
			genre: genres,
			mediaType,
			episodeBucket,
			year: yearLabel,
			season: seasonLabel,
			decade: decadeLabel,
			meanGap: meanGapBucket,
			tag: tags
		}
	};
};

const isComparableSpotlightItem = (item: AnimeStatItem): item is AnimeSpotlightStat => {
	return (
		item.completed &&
		item.score !== null &&
		item.mean !== null &&
		item.gap !== null &&
		item.meanGapBucket !== null &&
		COMPARABLE_MEDIA_TYPES.has(item.mediaType)
	);
};

const buildGenreSummaries = (items: AnimeStatItem[]): GenreSummary[] => {
	const map = new Map<string, Omit<GenreSummary, 'averageScore'>>();

	for (const item of items) {
		for (const genre of item.genres) {
			const current = map.get(genre) ?? {
				genre,
				count: 0,
				ratedCount: 0,
				scoreTotal: 0,
				episodes: 0,
				runtimeSeconds: 0
			};

			current.count += 1;
			current.episodes += item.effectiveWatchedEpisodes;

			if (item.score !== null) {
				current.ratedCount += 1;
				current.scoreTotal += item.score;
			}

			if (item.watchedRuntimeSeconds !== null) {
				current.runtimeSeconds += item.watchedRuntimeSeconds;
			}

			map.set(genre, current);
		}
	}

	return [...map.values()]
		.map((genre) => ({
			...genre,
			averageScore: genre.ratedCount > 0 ? genre.scoreTotal / genre.ratedCount : null
		}))
		.sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
};

const toGenreRow = (genre: GenreSummary): StatsTableRow => ({
	key: genre.genre,
	values: [
		genre.genre,
		genre.count,
		genre.averageScore === null ? '—' : formatDecimal(genre.averageScore, 2),
		genre.episodes,
		formatDuration(genre.runtimeSeconds)
	]
});

export const buildAnimeStats = (animes: Anime[]): AnimeStats => {
	const items = animes.map(toStatItem);
	const completedItems = items.filter((item) => item.completed);
	const comparableItems = items.filter(isComparableSpotlightItem);

	const totalEntries = items.length;
	const completedTotal = completedItems.length;

	const completedScores = completedItems
		.map((item) => item.score)
		.filter((score): score is number => score !== null);

	const completedRatedCount = completedScores.length;
	const completedScoreTotal = completedScores.reduce((sum, score) => sum + score, 0);

	const watchedEpisodeTotal = items.reduce(
		(sum, item) => sum + item.effectiveWatchedEpisodes,
		0
	);

	const watchedRuntimeItems = items.filter(
		(item) => item.effectiveWatchedEpisodes > 0 && item.watchedRuntimeSeconds !== null
	);

	const watchedRuntimeSeconds = watchedRuntimeItems.reduce(
		(sum, item) => sum + (item.watchedRuntimeSeconds ?? 0),
		0
	);

	const completedRuntimeItems = completedItems.filter(
		(item) => item.totalRuntimeSeconds !== null && item.watchedRuntimeSeconds !== null
	);

	const uniqueCompletedEpisodeTotal = completedItems.reduce((sum, item) => sum + item.episodes, 0);

	const effectiveCompletedEpisodeTotal = completedItems.reduce(
		(sum, item) => sum + item.effectiveWatchedEpisodes,
		0
	);

	const uniqueCompletedRuntimeSeconds = completedRuntimeItems.reduce(
		(sum, item) => sum + (item.totalRuntimeSeconds ?? 0),
		0
	);

	const effectiveCompletedRuntimeSeconds = completedRuntimeItems.reduce(
		(sum, item) => sum + (item.watchedRuntimeSeconds ?? 0),
		0
	);

	const meanGaps = comparableItems.map((item) => item.gap);
	const averageMeanGap = average(
		meanGaps.reduce((sum, gap) => sum + gap, 0),
		meanGaps.length
	);

	const rewatchItems = items.filter((item) => item.rewatchCount > 0);
	const totalRewatchCount = rewatchItems.reduce((sum, item) => sum + item.rewatchCount, 0);

	const droppedCount = items.filter((item) => item.status === 'dropped').length;
	const plannedCount = items.filter((item) => item.status === 'plan_to_watch').length;

	const genreSummaries = buildGenreSummaries(completedItems);

	const topTags = chartByLabel(completedItems, (item) => item.labels.tag, {
		limit: 8
	});

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
			help: `${formatNumber(watchedRuntimeItems.length)} entries with duration`
		},
		{
			label: 'avg score',
			value:
				completedRatedCount > 0
					? formatDecimal(average(completedScoreTotal, completedRatedCount), 2)
					: '—',
			help: `${formatNumber(completedRatedCount)} completed rated`
		},
		{
			label: 'rated coverage',
			value: toPercentage(completedRatedCount, completedTotal),
			help: `${formatNumber(completedRatedCount)} / ${formatNumber(completedTotal)} completed`
		},
		{
			label: 'completion',
			value: toPercentage(completedTotal, totalEntries),
			help: `${formatNumber(plannedCount)} planned`
		},
		{
			label: 'score spread',
			value: completedScores.length > 0 ? formatDecimal(standardDeviation(completedScores), 2) : '—',
			help: 'standard deviation'
		},
		{
			label: 'vs MAL mean',
			value: meanGaps.length > 0 ? formatSignedDecimal(averageMeanGap, 2) : '—',
			help: `${formatNumber(meanGaps.length)} comparable`
		},
		{
			label: 'avg eps/anime',
			value:
				completedTotal > 0
					? formatDecimal(average(effectiveCompletedEpisodeTotal, completedTotal), 1)
					: '—',
			help: 'completed, includes rewatches'
		},
		{
			label: 'avg runtime',
			value:
				completedRuntimeItems.length > 0
					? formatDuration(
						average(effectiveCompletedRuntimeSeconds, completedRuntimeItems.length)
					)
					: '—',
			help: 'completed with duration'
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
			label: 'rewatch time',
			value: formatDuration(
				Math.max(0, effectiveCompletedRuntimeSeconds - uniqueCompletedRuntimeSeconds)
			),
			help: 'extra time only'
		},
		{
			label: 'genres',
			value: formatNumber(genreSummaries.length),
			help: 'completed entries'
		},
		{
			label: 'runtime coverage',
			value: toPercentage(completedRuntimeItems.length, completedTotal),
			help: 'completed with duration'
		},
		{
			label: 'rewatchers',
			value: formatNumber(rewatchItems.length),
			help: `${formatNumber(totalRewatchCount)} extra watches`
		},
		{
			label: 'dropped',
			value: formatNumber(droppedCount),
			help: toPercentage(droppedCount, totalEntries)
		}
	];

	return {
		items,
		completedItems,

		cards,

		charts: {
			status: chartByLabel(items, (item) => item.labels.status, {
				total: totalEntries,
				order: STATUS_CHART_ORDER
			}),

			scores: chartByLabel(completedItems, (item) => item.labels.score, {
				total: completedRatedCount,
				order: SCORE_CHART_ORDER
			}),

			genres: chartByLabel(completedItems, (item) => item.labels.genre, {
				total: completedTotal,
				limit: 10
			}),

			mediaTypes: chartByLabel(completedItems, (item) => item.labels.mediaType, {
				total: completedTotal,
				limit: 8
			}),

			episodes: chartByLabel(completedItems, (item) => item.labels.episodeBucket, {
				total: completedTotal,
				order: EPISODE_CHART_ORDER
			}),

			decades: chartByLabel(completedItems, (item) => item.labels.decade, {
				total: completedTotal,
				sort: 'label'
			}),

			years: chartByLabel(completedItems, (item) => item.labels.year, {
				total: completedTotal,
				limit: 8
			}),

			seasons: chartByLabel(completedItems, (item) => item.labels.season, {
				total: completedTotal,
				order: SEASON_CHART_ORDER
			}),

			meanGap: chartByLabel(comparableItems, (item) => item.labels.meanGap, {
				total: comparableItems.length,
				order: MEAN_GAP_CHART_ORDER
			}),

			tags: topTags
		},

		details: {
			status: detailsByLabel(items, (item) => item.labels.status),
			scores: detailsByLabel(completedItems, (item) => item.labels.score),
			genres: detailsByLabel(completedItems, (item) => item.labels.genre),
			mediaTypes: detailsByLabel(completedItems, (item) => item.labels.mediaType),
			episodes: detailsByLabel(completedItems, (item) => item.labels.episodeBucket),
			decades: detailsByLabel(completedItems, (item) => item.labels.decade),
			years: detailsByLabel(completedItems, (item) => item.labels.year),
			seasons: detailsByLabel(completedItems, (item) => item.labels.season),
			meanGap: detailsByLabel(comparableItems, (item) => item.labels.meanGap)
		},

		tables: {
			longestRuntime: takeSorted(
				completedItems.filter((item) => item.totalRuntimeSeconds !== null),
				(a, b) => (b.totalRuntimeSeconds ?? 0) - (a.totalRuntimeSeconds ?? 0) || byTitle(a, b),
				12
			).map((item) => ({
				key: item.id,
				values: [item.title, item.episodes, item.totalRuntimeLabel]
			})),

			topRewatches: takeSorted(
				rewatchItems,
				(a, b) =>
					b.rewatchCount - a.rewatchCount ||
					(b.watchedRuntimeSeconds ?? 0) - (a.watchedRuntimeSeconds ?? 0) ||
					byTitle(a, b),
				10
			).map((item) => ({
				key: item.id,
				values: [
					item.title,
					item.rewatchCount,
					item.effectiveWatchedEpisodes,
					item.watchedRuntimeLabel
				]
			})),

			tags: topTags.map((tag) => ({
				key: tag.label,
				values: [tag.label, tag.value]
			})),

			genres: genreSummaries.slice(0, 12).map(toGenreRow),

			bestGenres: takeSorted(
				genreSummaries.filter((genre) => genre.ratedCount >= 3 && genre.averageScore !== null),
				(a, b) =>
					(b.averageScore ?? 0) - (a.averageScore ?? 0) ||
					b.count - a.count ||
					a.genre.localeCompare(b.genre),
				12
			).map(toGenreRow)
		},

		spotlights: {
			hiddenGems: takeSorted(
				comparableItems.filter((item) => item.score >= 8 && item.mean <= 7.5 && item.gap >= 1),
				(a, b) => b.gap - a.gap || b.score - a.score || byTitle(a, b),
				9
			),

			overratedByMal: takeSorted(
				comparableItems.filter((item) => item.score <= 6 && item.mean >= 8 && item.gap <= -1),
				(a, b) => a.gap - b.gap || b.mean - a.mean || byTitle(a, b),
				9
			),

			mostObscure: takeSorted(
				comparableItems.filter(
					(item) => item.score >= 8 && item.popularity !== null && item.popularity >= 1000
				),
				(a, b) =>
					(b.popularity ?? 0) - (a.popularity ?? 0) ||
					b.score - a.score ||
					b.gap - a.gap ||
					byTitle(a, b),
				6
			)
		}
	};
};