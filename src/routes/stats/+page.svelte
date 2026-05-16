<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import AnimeHeader from '$lib/components/anime/AnimeHeader.svelte';
	import BarChart, { type BarChartDetailsByLabel } from '$lib/components/stats/BarChart.svelte';
	import SpotlightGrid from '$lib/components/stats/SpotlightGrid.svelte';
	import StatCard from '$lib/components/stats/StatCard.svelte';
	import StatsTable, { type StatsTableRow } from '$lib/components/stats/StatsTable.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ui/ErrorBanner.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import ResultsPanel from '$lib/components/ui/ResultsPanel.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';

	import { fetchAnimeList } from '$lib/api/anime';
	import {
		DEFAULT_SORT_DIRECTION,
		DEFAULT_SORT_METRIC,
		DEFAULT_STATUS
	} from '$lib/constants/anime';
	import { getAnimeCacheContext } from '$lib/state/anime-cache.svelte';
	import { buildAnimeStats, type GenreStat } from '$lib/utils/anime-stats';
	import { buildAnimeStatsHref, parseAnimeStatsQuery } from '$lib/utils/anime-query';
	import type { Anime, ApiAnimeStatus } from '$lib/types/anime';

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

	const normalizeMediaType = (mediaType: string | null | undefined) => {
		if (!mediaType) return 'unknown';

		return mediaType.replaceAll('_', ' ').toLowerCase();
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

	const getEpisodeBucketLabel = (anime: Anime) => {
		const totalEpisodes = getTotalEpisodes(anime);

		if (totalEpisodes <= 0) return null;

		return EPISODE_BUCKETS.find((bucket) => {
			return totalEpisodes >= bucket.min && totalEpisodes <= bucket.max;
		})?.label;
	};

	const getScoreLabel = (anime: Anime) => {
		if (anime.score <= 0) return null;

		return String(Math.floor(anime.score));
	};

	const getYearLabel = (anime: Anime) => {
		return anime.startSeason?.year ? String(anime.startSeason.year) : null;
	};

	const getDecadeLabel = (anime: Anime) => {
		const year = anime.startSeason?.year;

		if (!year) return null;

		return `${Math.floor(year / 10) * 10}s`;
	};

	const getSeasonLabel = (anime: Anime) => {
		const season = anime.startSeason?.season?.toLowerCase();

		if (!season) return null;

		return SEASON_LABELS[season] ?? season.replaceAll('_', ' ');
	};

	const getMeanGapLabel = (anime: Anime) => {
		const score = anime.score > 0 ? anime.score : null;
		const mean = typeof anime.mean === 'number' && anime.mean > 0 ? anime.mean : null;

		if (score === null || mean === null) return null;

		const gap = score - mean;

		return (
			MEAN_GAP_BUCKETS.find((bucket) => {
				return gap >= bucket.min && gap < bucket.max;
			})?.label ?? 'close'
		);
	};

	const getGenreLabels = (anime: Anime) => {
		return anime.genres.map((genre) => genre.name.trim()).filter(Boolean);
	};

	const groupAnimeTitlesByLabel = (
		items: Anime[],
		getLabels: (anime: Anime) => Array<string | null | undefined>
	): BarChartDetailsByLabel => {
		const groups: BarChartDetailsByLabel = {};

		for (const anime of items) {
			const labels = new Set(getLabels(anime).filter(Boolean) as string[]);

			for (const label of labels) {
				groups[label] ??= [];
				groups[label].push(anime.title);
			}
		}

		for (const titles of Object.values(groups)) {
			titles.sort((a, b) => a.localeCompare(b));
		}

		return groups;
	};

	const cache = getAnimeCacheContext();
	const listState = cache.list;
	const initialQuery = parseAnimeStatsQuery(page.url);

	if (!listState.initialized) {
		listState.hydrate({
			username: initialQuery.username,
			search: '',
			status: DEFAULT_STATUS,
			sort: DEFAULT_SORT_METRIC,
			direction: DEFAULT_SORT_DIRECTION
		});
	}

	let loading = $state(false);
	let error = $state<string | null>(null);

	const stats = $derived(listState.data ? buildAnimeStats(listState.data.animes) : null);

	const completedAnime = $derived(
		listState.data?.animes.filter((anime) => anime.status === 'completed') ?? []
	);

	const statusDetails = $derived(
		groupAnimeTitlesByLabel(listState.data?.animes ?? [], (anime) => [
			STATUS_LABELS[anime.status]
		])
	);

	const scoreDetails = $derived(
		groupAnimeTitlesByLabel(completedAnime, (anime) => [getScoreLabel(anime)])
	);

	const genreDetails = $derived(groupAnimeTitlesByLabel(completedAnime, getGenreLabels));

	const mediaTypeDetails = $derived(
		groupAnimeTitlesByLabel(completedAnime, (anime) => [normalizeMediaType(anime.mediaType)])
	);

	const episodeDetails = $derived(
		groupAnimeTitlesByLabel(completedAnime, (anime) => [getEpisodeBucketLabel(anime)])
	);

	const yearDetails = $derived(
		groupAnimeTitlesByLabel(completedAnime, (anime) => [getYearLabel(anime)])
	);

	const seasonDetails = $derived(
		groupAnimeTitlesByLabel(completedAnime, (anime) => [getSeasonLabel(anime)])
	);

	const decadeDetails = $derived(
		groupAnimeTitlesByLabel(completedAnime, (anime) => [getDecadeLabel(anime)])
	);

	const meanGapDetails = $derived(
		groupAnimeTitlesByLabel(completedAnime, (anime) => [getMeanGapLabel(anime)])
	);

	const runtimeRows: StatsTableRow[] = $derived(
		stats?.longestRuntime.map((item) => ({
			key: item.id,
			values: [item.title, item.episodes, item.totalRuntimeLabel]
		})) ?? []
	);

	const rewatchRows: StatsTableRow[] = $derived(
		stats?.topRewatches.map((item) => ({
			key: item.id,
			values: [
				item.title,
				item.numberOfTimesRewatched,
				item.effectiveWatchedEpisodes,
				item.effectiveWatchedRuntimeLabel
			]
		})) ?? []
	);

	const tagRows: StatsTableRow[] = $derived(
		stats?.topTags.map((item) => ({
			key: item.label,
			values: [item.label, item.value]
		})) ?? []
	);

	const toGenreRows = (items: GenreStat[]): StatsTableRow[] =>
		items.map((item) => ({
			key: item.genre,
			values: [item.genre, item.count, item.averageScoreLabel, item.episodes, item.runtimeLabel]
		}));

	const genreRows: StatsTableRow[] = $derived(stats ? toGenreRows(stats.genreStats) : []);
	const bestGenreRows: StatsTableRow[] = $derived(stats ? toGenreRows(stats.bestGenres) : []);

	const syncUrl = (username = listState.loadedUsername || listState.username, replaceState = true) => {
		const href = buildAnimeStatsHref({
			username
		});

		void goto(href, {
			replaceState,
			noScroll: true,
			keepFocus: true
		});
	};

	const loadStats = async (targetUsername = listState.username) => {
		const trimmedUsername = targetUsername.trim();

		if (!trimmedUsername) {
			error = 'Enter a username.';
			return;
		}

		try {
			loading = true;
			error = null;

			listState.startNewSearch(trimmedUsername);

			const result = await fetchAnimeList(trimmedUsername);

			listState.setResult(result);

			syncUrl(result.username, false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error.';
		} finally {
			loading = false;
		}
	};

	const handleSubmit = () => {
		void loadStats();
	};

	onMount(() => {
		const initialUsername = initialQuery.username.trim();

		if (!initialUsername) return;

		const alreadyLoadedSameUser = listState.data && listState.loadedUsername === initialUsername;

		if (!alreadyLoadedSameUser) {
			void loadStats(initialUsername);
		}
	});
</script>

<svelte:head>
	<title>Anime Stats</title>
	<meta name="description" content="MyAnimeList account statistics and KPIs." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="stats"
		bind:username={listState.username}
		query=""
		{loading}
		onSubmit={handleSubmit}
	/>

	<ErrorBanner message={error} />

	{#if loading}
		<LoadingState message="calculating stats" />
	{:else if stats && listState.data}
		<ResultsPanel>
			<div class="border-b border-white/10 bg-background px-3 py-2">
				<p class="truncate text-sm text-neutral-300">
					<span class="font-medium text-white">{listState.loadedUsername}</span>
					<span class="ml-2 text-neutral-500">{listState.data.count} entries analysed</span>
				</p>
			</div>

			<div class="space-y-2 p-2 sm:p-3">
				<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
					{#each stats.cards as card (card.label)}
						<StatCard {...card} />
					{/each}
				</div>

				<div class="grid gap-2 lg:grid-cols-2">
					<BarChart
						title="status"
						items={stats.statusDistribution}
						detailsByLabel={statusDetails}
					/>

					<BarChart
						title="completed scores"
						items={stats.scoreDistribution}
						detailsByLabel={scoreDetails}
					/>

					<BarChart
						title="completed genres"
						items={stats.genreDistribution}
						detailsByLabel={genreDetails}
					/>

					<BarChart
						title="completed media"
						items={stats.mediaTypeDistribution}
						detailsByLabel={mediaTypeDetails}
					/>

					<BarChart
						title="completed episodes"
						items={stats.episodeDistribution}
						detailsByLabel={episodeDetails}
					/>

					<BarChart
						title="completed decades"
						items={stats.decadeDistribution}
						detailsByLabel={decadeDetails}
					/>

					<BarChart
						title="completed years"
						items={stats.topYears}
						detailsByLabel={yearDetails}
					/>
				</div>

				<div class="grid gap-2 lg:grid-cols-2">
					<StatsTable
						title="longest completed runtime"
						headers={['title', 'eps', 'total']}
						rows={runtimeRows}
						emptyMessage="No average_episode_duration data. Add it to your /api/animes fields."
					/>

					<StatsTable
						title="top rewatches"
						headers={['title', 'rewatches', 'watched eps', 'time']}
						rows={rewatchRows}
						emptyMessage="No anime have been rewatched."
					/>

					<StatsTable
						title="completed tags"
						headers={['tag', 'uses']}
						rows={tagRows}
						emptyMessage="No MAL tags found."
					/>

					<StatsTable
						title="genre breakdown"
						headers={['genre', 'entries', 'avg', 'eps', 'runtime']}
						rows={genreRows}
						emptyMessage="No genre data. Add genres to your /api/animes fields."
					/>

					<StatsTable
						title="highest rated genres"
						headers={['genre', 'entries', 'avg', 'eps', 'runtime']}
						rows={bestGenreRows}
						emptyMessage="No genres with at least 3 rated completed entries."
					/>
				</div>

				<div class="grid gap-2 lg:grid-cols-2">
					<SpotlightGrid
						title="hidden gems"
						description="Completed anime you rated much higher than the MAL mean."
						items={stats.hiddenGems}
						emptyMessage="No clear hidden gems found yet."
					/>

					<SpotlightGrid
						title="overrated by MAL"
						description="Completed anime where the MAL mean is much higher than your score."
						items={stats.overratedByMal}
						emptyMessage="No clearly overrated picks found yet."
					/>

					<SpotlightGrid
						title="most obscure"
						description="Completed anime with 8+ score and popularity rank over #1,000."
						items={stats.mostObscure}
						emptyMessage="No obscure high-rated picks found yet."
					/>
				</div>
			</div>
		</ResultsPanel>
	{:else}
		<EmptyState
			title="Search a MyAnimeList profile."
			description="Stats are calculated from the full anime list."
		/>
	{/if}
</Shell>