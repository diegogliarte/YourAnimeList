<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import AnimeHeader from '$lib/components/anime/AnimeHeader.svelte';
	import BarChart from '$lib/components/stats/BarChart.svelte';
	import GenreStatsTable from '$lib/components/stats/GenreStatsTable.svelte';
	import RuntimeStatsTable from '$lib/components/stats/RuntimeStatsTable.svelte';
	import StatCard from '$lib/components/stats/StatCard.svelte';
	import StatsTable from '$lib/components/stats/StatsTable.svelte';
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
	import { buildAnimeStats } from '$lib/utils/anime-stats';
	import { buildAnimeStatsHref, parseAnimeStatsQuery } from '$lib/utils/anime-query';

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

		const alreadyLoadedSameUser =
			listState.data && listState.loadedUsername === initialUsername;

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
					<BarChart title="status" items={stats.statusDistribution} />
					<BarChart title="completed scores" items={stats.scoreDistribution} />
					<BarChart title="completed genres" items={stats.genreDistribution} />
					<BarChart title="completed media" items={stats.mediaTypeDistribution} />
					<BarChart title="completed episodes" items={stats.episodeDistribution} />
				</div>

				<div class="grid gap-2 lg:grid-cols-3">
					<StatsTable
						title="completed years"
						items={stats.topYears}
						labelHeader="year"
						valueHeader="entries"
					/>

					<StatsTable
						title="completed tags"
						items={stats.topTags}
						labelHeader="tag"
						valueHeader="uses"
						emptyMessage="No MAL tags found."
					/>

					<RuntimeStatsTable
						title="longest completed runtime"
						items={stats.longestRuntime}
						emptyMessage="No average_episode_duration data. Add it to your /api/animes fields."
					/>
				</div>

				<div class="grid gap-2 lg:grid-cols-2">
					<GenreStatsTable
						title="genre breakdown"
						items={stats.genreStats}
						emptyMessage="No genre data. Add genres to your /api/animes fields."
					/>

					<GenreStatsTable
						title="highest rated genres"
						items={stats.bestGenres}
						emptyMessage="No genres with at least 3 rated completed entries."
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