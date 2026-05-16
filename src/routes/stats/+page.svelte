<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import AnimeHeader from '$lib/components/anime/AnimeHeader.svelte';
	import BarChart from '$lib/components/stats/BarChart.svelte';
	import SpotlightGrid from '$lib/components/stats/SpotlightGrid.svelte';
	import StatCard from '$lib/components/stats/StatCard.svelte';
	import StatsTable from '$lib/components/stats/StatsTable.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ui/ErrorBanner.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import ResultsPanel from '$lib/components/ui/ResultsPanel.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';

	import { createAnimeStatsPage } from '$lib/state/anime-pages.svelte';
	import { buildAnimeStatsHref, parseAnimeStatsQuery } from '$lib/utils/anime-query';

	const statsPage = createAnimeStatsPage({
		query: parseAnimeStatsQuery(page.url),
		buildHref: buildAnimeStatsHref
	});

	onMount(statsPage.loadInitial);
</script>

<svelte:head>
	<title>Anime Stats</title>
	<meta name="description" content="MyAnimeList account statistics and KPIs." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="stats"
		bind:username={statsPage.listState.username}
		query=""
		loading={statsPage.loading}
		onSubmit={() => void statsPage.load()}
	/>

	<ErrorBanner message={statsPage.error} />

	{#if statsPage.loading}
		<LoadingState message="calculating stats" />
	{:else if statsPage.stats && statsPage.listState.data}
		<ResultsPanel>
			<div class="border-b border-white/10 bg-background px-3 py-2">
				<p class="truncate text-sm text-neutral-300">
					<span class="font-medium text-white">{statsPage.listState.loadedUsername}</span>
					<span class="ml-2 text-neutral-500">
						{statsPage.listState.data.count} entries analysed
					</span>
				</p>
			</div>

			<div class="space-y-2 p-2 sm:p-3">
				<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
					{#each statsPage.stats.cards as card (card.label)}
						<StatCard {...card} />
					{/each}
				</div>

				<div class="grid gap-2 lg:grid-cols-2">
					<BarChart
						title="status"
						items={statsPage.stats.charts.status}
						detailsByLabel={statsPage.stats.details.status}
					/>

					<BarChart
						title="completed scores"
						items={statsPage.stats.charts.scores}
						detailsByLabel={statsPage.stats.details.scores}
					/>

					<BarChart
						title="completed genres"
						items={statsPage.stats.charts.genres}
						detailsByLabel={statsPage.stats.details.genres}
					/>

					<BarChart
						title="completed media"
						items={statsPage.stats.charts.mediaTypes}
						detailsByLabel={statsPage.stats.details.mediaTypes}
					/>

					<BarChart
						title="completed episodes"
						items={statsPage.stats.charts.episodes}
						detailsByLabel={statsPage.stats.details.episodes}
					/>

					<BarChart
						title="completed decades"
						items={statsPage.stats.charts.decades}
						detailsByLabel={statsPage.stats.details.decades}
					/>

					<BarChart
						title="completed years"
						items={statsPage.stats.charts.years}
						detailsByLabel={statsPage.stats.details.years}
					/>
				</div>

				<div class="grid gap-2 lg:grid-cols-2">
					<StatsTable
						title="longest completed runtime"
						headers={['title', 'eps', 'total']}
						rows={statsPage.stats.tables.longestRuntime}
						emptyMessage="No average_episode_duration data. Add it to your /api/animes fields."
					/>

					<StatsTable
						title="top rewatches"
						headers={['title', 'rewatches', 'watched eps', 'time']}
						rows={statsPage.stats.tables.topRewatches}
						emptyMessage="No anime have been rewatched."
					/>

					<StatsTable
						title="completed tags"
						headers={['tag', 'uses']}
						rows={statsPage.stats.tables.tags}
						emptyMessage="No MAL tags found."
					/>

					<StatsTable
						title="genre breakdown"
						headers={['genre', 'entries', 'avg', 'eps', 'runtime']}
						rows={statsPage.stats.tables.genres}
						emptyMessage="No genre data. Add genres to your /api/animes fields."
					/>

					<StatsTable
						title="highest rated genres"
						headers={['genre', 'entries', 'avg', 'eps', 'runtime']}
						rows={statsPage.stats.tables.bestGenres}
						emptyMessage="No genres with at least 3 rated completed entries."
					/>
				</div>

				<div class="grid gap-2 lg:grid-cols-2">
					<SpotlightGrid
						title="hidden gems"
						description="Completed anime you rated much higher than the MAL mean."
						items={statsPage.stats.spotlights.hiddenGems}
						emptyMessage="No clear hidden gems found yet."
					/>

					<SpotlightGrid
						title="overrated by MAL"
						description="Completed anime where the MAL mean is much higher than your score."
						items={statsPage.stats.spotlights.overratedByMal}
						emptyMessage="No clearly overrated picks found yet."
					/>

					<SpotlightGrid
						title="most obscure"
						description="Completed anime with 8+ score and popularity rank over #1,000."
						items={statsPage.stats.spotlights.mostObscure}
						emptyMessage="No obscure high-rated picks found yet."
						footerMetric="popularity"
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