<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import AnimeHeader from '$lib/components/anime/AnimeHeader.svelte';
	import AnimeRankingControls from '$lib/components/anime/AnimeRankingControls.svelte';
	import AnimeTable from '$lib/components/anime/AnimeTable.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ui/ErrorBanner.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import ResultsPanel from '$lib/components/ui/ResultsPanel.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';

	import { createAnimeRankingsPage } from '$lib/state/anime-pages.svelte';
	import { buildAnimeRankingsHref, parseAnimeRankingsQuery } from '$lib/utils/anime-query';

	const rankings = createAnimeRankingsPage({
		query: parseAnimeRankingsQuery(page.url),
		buildHref: buildAnimeRankingsHref
	});

	let sentinelEl = $state<HTMLDivElement | null>(null);

	$effect(() => rankings.observeSentinel(sentinelEl));

	onMount(rankings.loadInitial);
</script>

<svelte:head>
	<title>Anime Rankings</title>
	<meta name="description" content="MyAnimeList ranking-based anime rankings." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="rankings"
		bind:username={rankings.rankingsState.username}
		query={rankings.rankingsState.search}
		loading={rankings.loading || rankings.loadingMore}
		onSubmit={rankings.submit}
	/>

	<ErrorBanner message={rankings.error} />

	{#if rankings.loading}
		<LoadingState message="fetching rankings" />
	{:else if rankings.rankingsState.data}
		<ResultsPanel>
			<AnimeRankingControls
				username={rankings.rankingsState.loadedUsername}
				visibleCount={rankings.filteredAnimes.length}
				search={rankings.rankingsState.search}
				rankingType={rankings.rankingsState.rankingType}
				excludedStatuses={rankings.rankingsState.excludedStatuses}
				showScore={rankings.rankingsState.showScore}
				onSearchChange={rankings.setSearch}
				onRankingTypeChange={rankings.setRankingType}
				onExcludedStatusesChange={rankings.setExcludedStatuses}
				onScoreVisibilityToggle={rankings.toggleScore}
			/>

			<AnimeTable
				mode="ranking"
				animes={rankings.filteredAnimes}
				showScore={rankings.rankingsState.showScore}
				emptyMessage="No rankings."
			/>

			{#if rankings.hasMore}
				<div bind:this={sentinelEl} class="px-3 py-4 text-center text-xs text-neutral-500">
					{#if rankings.loadingMore}
						<span class="text-accent">loading more</span>
					{:else}
						scroll for more
					{/if}
				</div>
			{:else}
				<div class="px-3 py-4 text-center text-xs text-neutral-600">end of rankings</div>
			{/if}
		</ResultsPanel>
	{:else}
		<EmptyState
			title="Search a MyAnimeList profile."
			description="Rankings use MAL rankings and can hide entries already in your list."
		/>
	{/if}
</Shell>