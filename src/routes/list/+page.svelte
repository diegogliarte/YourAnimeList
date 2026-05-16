<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import AnimeHeader from '$lib/components/anime/AnimeHeader.svelte';
	import AnimeListControls from '$lib/components/anime/AnimeListControls.svelte';
	import AnimeTable from '$lib/components/anime/AnimeTable.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ui/ErrorBanner.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import ResultsPanel from '$lib/components/ui/ResultsPanel.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';

	import { createAnimeListPage } from '$lib/state/anime-pages.svelte';
	import { buildAnimeListHref, parseAnimeListQuery } from '$lib/utils/anime-query';

	const list = createAnimeListPage({
		query: parseAnimeListQuery(page.url),
		buildHref: buildAnimeListHref
	});

	onMount(list.loadInitial);
</script>

<svelte:head>
	<title>YourAnimeList</title>
	<meta name="description" content="Compact MyAnimeList viewer." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="list"
		bind:username={list.listState.username}
		query={list.listState.search}
		loading={list.loading}
		onSubmit={() => void list.load()}
	/>

	<ErrorBanner message={list.error} />

	{#if list.loading}
		<LoadingState message="fetching data" />
	{:else if list.listState.data}
		<ResultsPanel>
			<AnimeListControls
				username={list.listState.loadedUsername}
				visibleCount={list.filteredAnimes.length}
				totalCount={list.listState.data.count}
				search={list.listState.search}
				selectedStatus={list.listState.selectedStatus}
				sortMetric={list.listState.sortMetric}
				sortDirection={list.listState.sortDirection}
				onSearchChange={(search) => list.update({ search })}
				onStatusChange={(status) => list.update({ status })}
				onSortChange={(sort) => list.update({ sort })}
				onDirectionToggle={list.toggleDirection}
			/>

			<AnimeTable mode="list" animes={list.filteredAnimes} emptyMessage="No results." />
		</ResultsPanel>
	{:else}
		<EmptyState title="Search a MyAnimeList profile." description="Try diego." />
	{/if}
</Shell>