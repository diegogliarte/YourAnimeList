<script lang="ts">
	import { goto } from '$app/navigation';
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

	import { fetchAnimeRankings } from '$lib/api/anime';
	import { PAGE_SIZE } from '$lib/constants/anime';
	import { getAnimeCacheContext } from '$lib/state/anime-cache.svelte';
	import { filterByTitle, mergeUniqueById } from '$lib/utils/anime';
	import { buildAnimeRankingsHref, parseAnimeRankingsQuery } from '$lib/utils/anime-query';

	import type { AnimeRankingType, ApiAnimeStatus } from '$lib/types/anime';

	const cache = getAnimeCacheContext();
	const rankingsState = cache.rankings;
	const initialQuery = parseAnimeRankingsQuery(page.url);

	rankingsState.hydrate(initialQuery);

	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let sentinelEl = $state<HTMLDivElement | null>(null);

	const hasMore = $derived(rankingsState.nextOffset !== null);
	const filteredAnimes = $derived(
		filterByTitle(rankingsState.data?.animes ?? [], rankingsState.search)
	);

	const syncUrl = (
		overrides: Partial<{
			username: string;
			search: string;
			rankingType: AnimeRankingType;
			excludedStatuses: ApiAnimeStatus[];
			showScore: boolean;
		}> = {},
		replaceState = true
	) => {
		const href = buildAnimeRankingsHref({
			username: rankingsState.loadedUsername || rankingsState.username,
			search: rankingsState.search,
			rankingType: rankingsState.rankingType,
			excludedStatuses: rankingsState.excludedStatuses,
			showScore: rankingsState.showScore,
			...overrides
		});

		void goto(href, {
			replaceState,
			noScroll: true,
			keepFocus: true
		});
	};

	const loadRankings = async ({
		targetUsername = rankingsState.username,
		offset = 0,
		append = false,
		requestRankingType = rankingsState.rankingType,
		requestExcludedStatuses = rankingsState.excludedStatuses
	}: {
		targetUsername?: string;
		offset?: number;
		append?: boolean;
		requestRankingType?: AnimeRankingType;
		requestExcludedStatuses?: ApiAnimeStatus[];
	} = {}) => {
		const trimmedUsername = targetUsername.trim();

		if (!trimmedUsername) {
			error = 'Enter a username.';
			return;
		}

		if (append) {
			if (loading || loadingMore || rankingsState.nextOffset === null) return;
			loadingMore = true;
		} else {
			loading = true;
			rankingsState.startNewSearch(trimmedUsername);
		}

		try {
			error = null;

			const result = await fetchAnimeRankings({
				username: trimmedUsername,
				rankingType: requestRankingType,
				excludedStatuses: requestExcludedStatuses,
				limit: PAGE_SIZE,
				offset
			});

			if (append && rankingsState.data) {
				const mergedAnimes = mergeUniqueById(rankingsState.data.animes, result.animes);

				rankingsState.appendResult(result, mergedAnimes);
			} else {
				rankingsState.setResult(result, trimmedUsername);
			}

			syncUrl(
				{
					username: rankingsState.loadedUsername,
					rankingType: requestRankingType,
					excludedStatuses: requestExcludedStatuses
				},
				false
			);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error.';
		} finally {
			loading = false;
			loadingMore = false;
		}
	};

	const reloadRankings = ({
		nextRankingType = rankingsState.rankingType,
		nextExcludedStatuses = rankingsState.excludedStatuses
	}: {
		nextRankingType?: AnimeRankingType;
		nextExcludedStatuses?: ApiAnimeStatus[];
	} = {}) => {
		const targetUsername = rankingsState.loadedUsername || rankingsState.username;

		if (!targetUsername.trim()) return;

		void loadRankings({
			targetUsername,
			offset: 0,
			append: false,
			requestRankingType: nextRankingType,
			requestExcludedStatuses: nextExcludedStatuses
		});
	};

	const loadMoreRankings = () => {
		if (rankingsState.nextOffset === null) return;

		void loadRankings({
			targetUsername: rankingsState.loadedUsername || rankingsState.username,
			offset: rankingsState.nextOffset,
			append: true
		});
	};

	const handleSubmit = () => {
		void loadRankings({
			targetUsername: rankingsState.username,
			offset: 0,
			append: false
		});
	};

	const handleRankingTypeChange = (nextRankingType: AnimeRankingType) => {
		rankingsState.rankingType = nextRankingType;

		syncUrl({ rankingType: nextRankingType });

		reloadRankings({
			nextRankingType
		});
	};

	const handleExcludedStatusesChange = (nextExcludedStatuses: ApiAnimeStatus[]) => {
		rankingsState.excludedStatuses = nextExcludedStatuses;

		syncUrl({ excludedStatuses: nextExcludedStatuses });

		reloadRankings({
			nextExcludedStatuses
		});
	};

	const handleScoreVisibilityToggle = () => {
		const nextShowScore = !rankingsState.showScore;

		rankingsState.showScore = nextShowScore;
		syncUrl({ showScore: nextShowScore });
	};

	const handleSearchChange = (nextSearch: string) => {
		rankingsState.search = nextSearch;
		syncUrl({ search: nextSearch });
	};

	$effect(() => {
		const element = sentinelEl;

		if (!element || !rankingsState.data || !hasMore || loading || loadingMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					loadMoreRankings();
				}
			},
			{
				rootMargin: '600px 0px'
			}
		);

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	});

	onMount(() => {
		const initialUsername = initialQuery.username.trim();

		if (!initialUsername) return;

		const alreadyLoadedSameUser =
			rankingsState.data && rankingsState.loadedUsername === initialUsername;

		if (!alreadyLoadedSameUser) {
			void loadRankings({
				targetUsername: initialUsername,
				offset: 0,
				append: false
			});
		}
	});
</script>

<svelte:head>
	<title>Anime Rankings</title>
	<meta name="description" content="MyAnimeList ranking-based anime rankings." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="rankings"
		bind:username={rankingsState.username}
		query={rankingsState.search}
		loading={loading || loadingMore}
		onSubmit={handleSubmit}
	/>

	<ErrorBanner message={error} />

	{#if loading}
		<LoadingState message="fetching rankings" />
	{:else if rankingsState.data}
		<ResultsPanel>
			<AnimeRankingControls
				username={rankingsState.loadedUsername}
				visibleCount={filteredAnimes.length}
				search={rankingsState.search}
				rankingType={rankingsState.rankingType}
				excludedStatuses={rankingsState.excludedStatuses}
				showScore={rankingsState.showScore}
				onSearchChange={handleSearchChange}
				onRankingTypeChange={handleRankingTypeChange}
				onExcludedStatusesChange={handleExcludedStatusesChange}
				onScoreVisibilityToggle={handleScoreVisibilityToggle}
			/>

			<AnimeTable
				mode="ranking"
				animes={filteredAnimes}
				showScore={rankingsState.showScore}
				emptyMessage="No rankings."
			/>

			{#if hasMore}
				<div bind:this={sentinelEl} class="px-3 py-4 text-center text-xs text-neutral-500">
					{#if loadingMore}
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
