<script lang="ts">
	import { goto } from '$app/navigation';
	import AnimeTable, {
		type AnimeTableAnime,
		type AnimeTableExtraColumn
	} from '$lib/components/ui/AnimeTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import { formatSeason } from '$lib/utils/anime.utils';
	import { formatNumber } from '$lib/utils/format.utils';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let startedAnimeId = $state<number | null>(null);

	const recommendationExtraColumns: AnimeTableExtraColumn[] = [
		{
			label: 'Recs',
			value: 'recommendation_total',
			align: 'center',
			width: '3rem',
			getCell: getRecommendationTotal,
			getSort: getRecommendationTotal
		},
		{
			label: 'Sources',
			value: 'recommendation_sources',
			align: 'center',
			width: '3rem',
			getCell: getRecommendationSourceCount,
			getSort: getRecommendationSourceCount
		},
		{
			label: 'Rec Score',
			value: 'recommendation_score',
			align: 'center',
			width: '3rem',
			getCell: getRecommendationScore,
			getSort: getRecommendationScore
		}
	];

	const routeAnimeId = $derived.by(() => {
		const raw = params.animeId;

		if (!raw || !/^\d+$/.test(raw)) return null;

		return Number(raw);
	});

	$effect(() => {
		if (!routeAnimeId) return;
		if (startedAnimeId === routeAnimeId) return;

		startedAnimeId = routeAnimeId;

		void animeData.loadRecommendations(routeAnimeId);
	});

	function submitSearch() {
		void animeData.searchRecommendationAnime();
	}

	async function selectSearchResult(animeId: number) {
		startedAnimeId = animeId;

		await animeData.loadRecommendations(animeId);

		void goto(`/recommendations/${animeId}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	function startNewSearch() {
		animeData.clearRecommendations();
		animeData.clearRecommendationSearch();
		startedAnimeId = null;

		void goto('/recommendations', {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	function getRecommendationForItem(item: AnimeTableAnime) {
		const id = 'node' in item ? item.node.id : item.id;

		return animeData.recommendationResults.find((entry) => entry.anime.id === id) ?? null;
	}

	function getRecommendationScore(item: AnimeTableAnime) {
		return getRecommendationForItem(item)?.score ?? null;
	}

	function getRecommendationTotal(item: AnimeTableAnime) {
		return getRecommendationForItem(item)?.totalCount ?? null;
	}

	function getRecommendationSourceCount(item: AnimeTableAnime) {
		return getRecommendationForItem(item)?.sourceCount ?? null;
	}
</script>

<div class="grid gap-4">
	<Panel title="Recommendations">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<form
				class="flex min-w-0 flex-wrap items-center gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					submitSearch();
				}}
			>
				<Input
					bind:value={animeData.recommendationQuery}
					placeholder="Search anime..."
					class="w-60"
					disabled={animeData.recommendationSearchLoading || animeData.recommendationLoading}
				/>

				<Button
					type="submit"
					variant="primary"
					disabled={animeData.recommendationSearchLoading || animeData.recommendationLoading}
				>
					{animeData.recommendationSearchLoading ? 'Searching...' : 'Search'}
				</Button>

				{#if animeData.recommendationSeed}
					<Button type="button" onclick={startNewSearch}>New search</Button>
				{/if}
			</form>

			{#if animeData.recommendationSeed}
				<p class="text-xs text-text-muted">
					Seed: {animeData.recommendationSeed.title} · {formatNumber(
						animeData.recommendationResults.length
					)}
					results
				</p>
			{/if}
		</div>
	</Panel>

	{#if animeData.recommendationSearchError}
		<Panel>
			<p class="text-sm text-primary">{animeData.recommendationSearchError}</p>
		</Panel>
	{/if}

	{#if animeData.recommendationSearchResults.length > 0}
		<Panel title="Search results">
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each animeData.recommendationSearchResults as result (result.node.id)}
					<button
						type="button"
						class="flex cursor-pointer gap-3 rounded-md border border-border bg-surface p-2 text-left transition hover:border-primary hover:bg-surface-soft"
						disabled={animeData.recommendationLoading}
						onclick={() => selectSearchResult(result.node.id)}
					>
						{#if result.node.main_picture?.medium}
							<img
								src={result.node.main_picture.medium}
								alt={result.node.title}
								class="size-12 shrink-0 rounded-md object-cover"
							/>
						{:else}
							<div class="size-12 shrink-0 rounded-md bg-surface-soft"></div>
						{/if}

						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-text">{result.node.title}</p>
							<p class="mt-1 text-xs text-text-muted">
								{result.node.media_type ?? 'unknown'} · {formatSeason(result)}
							</p>
						</div>
					</button>
				{/each}
			</div>
		</Panel>
	{/if}

	{#if animeData.recommendationLoading}
		<Panel>Loading recommendations...</Panel>
	{:else if animeData.recommendationError}
		<Panel>
			<p class="text-sm text-primary">{animeData.recommendationError}</p>
		</Panel>
	{:else if animeData.recommendationSeed}
		<AnimeTable
			items={animeData.recommendationAnimeList}
			filterPlaceholder="Filter recommendations..."
			defaultSort="season"
			defaultDirection="asc"
			extraColumns={recommendationExtraColumns}
			showRecommendationsLink={false}
		/>
	{:else if !animeData.recommendationSearchResults.length}
		<Panel>
			<p class="text-sm text-text-muted">
				Search for an anime to find similar anime through two-step recommendations.
			</p>
		</Panel>
	{/if}
</div>
