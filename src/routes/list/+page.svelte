<script lang="ts">
	import { goto } from '$app/navigation';
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

	import { fetchAnimeList } from '$lib/api/anime';
	import { getAnimeCacheContext } from '$lib/state/anime-cache.svelte';
	import { filterAndSortAnimes } from '$lib/utils/anime';
	import { buildAnimeListHref, parseAnimeListQuery } from '$lib/utils/anime-query';

	import type { AnimeSortMetric, SortDirection } from '$lib/types/anime';
	import type { AnimeStatusSelection } from '$lib/constants/anime';

	const cache = getAnimeCacheContext();
	const listState = cache.list;
	const initialQuery = parseAnimeListQuery(page.url);

	listState.hydrate(initialQuery);

	let loading = $state(false);
	let error = $state<string | null>(null);

	const filteredAnimes = $derived(
		filterAndSortAnimes({
			animes: listState.data?.animes ?? [],
			status: listState.selectedStatus,
			query: listState.search,
			sortMetric: listState.sortMetric,
			sortDirection: listState.sortDirection
		})
	);

	const syncUrl = (
		overrides: Partial<{
			username: string;
			search: string;
			status: AnimeStatusSelection;
			sort: AnimeSortMetric;
			direction: SortDirection;
		}> = {},
		replaceState = true
	) => {
		const href = buildAnimeListHref({
			username: listState.loadedUsername || listState.username,
			search: listState.search,
			status: listState.selectedStatus,
			sort: listState.sortMetric,
			direction: listState.sortDirection,
			...overrides
		});

		void goto(href, {
			replaceState,
			noScroll: true,
			keepFocus: true
		});
	};

	const loadAnimes = async (targetUsername = listState.username) => {
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

			syncUrl({ username: result.username }, false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error.';
		} finally {
			loading = false;
		}
	};

	const handleSubmit = () => {
		void loadAnimes();
	};

	const handleStatusChange = (status: AnimeStatusSelection) => {
		listState.selectedStatus = status;
		syncUrl({ status });
	};

	const handleSortChange = (sort: AnimeSortMetric) => {
		listState.sortMetric = sort;
		syncUrl({ sort });
	};

	const handleDirectionToggle = () => {
		const direction: SortDirection = listState.sortDirection === 'asc' ? 'desc' : 'asc';

		listState.sortDirection = direction;
		syncUrl({ direction });
	};

	const handleSearchChange = (nextSearch: string) => {
		listState.search = nextSearch;
		syncUrl({ search: nextSearch });
	};

	onMount(() => {
		const initialUsername = initialQuery.username.trim();

		if (!initialUsername) return;

		const alreadyLoadedSameUser = listState.data && listState.loadedUsername === initialUsername;

		if (!alreadyLoadedSameUser) {
			void loadAnimes(initialUsername);
		}
	});
</script>

<svelte:head>
	<title>YourAnimeList</title>
	<meta name="description" content="Compact MyAnimeList viewer." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="list"
		bind:username={listState.username}
		query={listState.search}
		{loading}
		onSubmit={handleSubmit}
	/>

	<ErrorBanner message={error} />

	{#if loading}
		<LoadingState message="fetching data" />
	{:else if listState.data}
		<ResultsPanel>
			<AnimeListControls
				username={listState.loadedUsername}
				visibleCount={filteredAnimes.length}
				totalCount={listState.data.count}
				search={listState.search}
				selectedStatus={listState.selectedStatus}
				sortMetric={listState.sortMetric}
				sortDirection={listState.sortDirection}
				onSearchChange={handleSearchChange}
				onStatusChange={handleStatusChange}
				onSortChange={handleSortChange}
				onDirectionToggle={handleDirectionToggle}
			/>

			<AnimeTable mode="list" animes={filteredAnimes} emptyMessage="No results." />
		</ResultsPanel>
	{:else}
		<EmptyState title="Search a MyAnimeList profile." description="Try diego." />
	{/if}
</Shell>