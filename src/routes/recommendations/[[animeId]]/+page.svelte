<script lang="ts">
	import { goto } from '$app/navigation';
	import AnimeSearchPanel from '$lib/components/anime/AnimeSearchPanel.svelte';
	import AnimeTable, {
		type AnimeTableAnime,
		type AnimeTableExtraColumn
	} from '$lib/components/ui/AnimeTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let startedAnimeId = $state<number | null>(null);
	let lastRouteAnimeId = $state<number | null | undefined>(undefined);

	const recommendationExtraColumns: AnimeTableExtraColumn[] = [
		{
			label: 'Rec Type',
			value: 'recommendation_kind',
			align: 'center',
			width: '5rem',
			getCell: getRecommendationKind,
			getSort: getRecommendationKindSort
		},
		{
			label: 'Rec Score',
			value: 'recommendation_score',
			align: 'center',
			width: '5rem',
			getCell: getRecommendationScore,
			getSort: getRecommendationScore
		},
		{
			label: 'Recs',
			value: 'recommendation_total',
			align: 'center',
			width: '5rem',
			getCell: getRecommendationTotal,
			getSort: getRecommendationTotal
		}
	];

	const routeAnimeId = $derived.by(() => {
		const raw = params.animeId;

		if (!raw || !/^\d+$/.test(raw)) return null;

		return Number(raw);
	});

	$effect(() => {
		const animeId = routeAnimeId;

		if (lastRouteAnimeId === animeId) return;

		lastRouteAnimeId = animeId;

		if (!animeId) {
			startedAnimeId = null;
			animeData.clearRecommendations();
			animeData.clearRecommendationSearch();
			return;
		}

		if (startedAnimeId === animeId) return;

		startedAnimeId = animeId;

		void animeData.loadRecommendations(animeId);
	});

	function submitSearch() {
		void animeData.searchRecommendationAnime();
	}

	async function selectSearchResult(animeId: number) {
		startedAnimeId = animeId;
		lastRouteAnimeId = animeId;

		await animeData.loadRecommendations(animeId);

		animeData.clearRecommendationSearch();

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
		lastRouteAnimeId = null;

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

	function getRecommendationKind(item: AnimeTableAnime) {
		const kind = getRecommendationForItem(item)?.kind;

		if (kind === 'seed') return 'Seed';
		if (kind === 'direct') return 'Direct';
		if (kind === 'related') return 'Related';

		return null;
	}

	function getRecommendationKindSort(item: AnimeTableAnime) {
		const kind = getRecommendationForItem(item)?.kind;

		if (kind === 'seed') return 0;
		if (kind === 'direct') return 1;
		if (kind === 'related') return 2;

		return null;
	}

	function getRecommendationScore(item: AnimeTableAnime) {
		const result = getRecommendationForItem(item);

		if (!result || result.kind === 'seed') return null;

		return result.score;
	}

	function getRecommendationTotal(item: AnimeTableAnime) {
		const result = getRecommendationForItem(item);

		if (!result || result.kind === 'seed') return null;

		return result.totalCount;
	}
</script>

<AnimeSearchPanel
	title="Recommendations"
	bind:query={animeData.recommendationQuery}
	results={animeData.recommendationSearchResults}
	loading={animeData.recommendationSearchLoading}
	error={animeData.recommendationSearchError}
	disabled={animeData.recommendationLoading}
	selectDisabled={animeData.recommendationLoading}
	resultsTitle="Search results"
	emptyText="Search for an anime to find similar anime through two-step recommendations."
	showEmpty={!animeData.recommendationSeed && !animeData.recommendationLoading}
	onSearch={submitSearch}
	onSelect={selectSearchResult}
>
	{#snippet actions()}
		{#if animeData.recommendationSeed}
			<Button type="button" onclick={startNewSearch}>New search</Button>
		{/if}
	{/snippet}

	{#snippet children()}
		{#if animeData.recommendationLoading}
			<Panel>
				<p class="text-sm text-text-muted">Loading recommendations...</p>
			</Panel>
		{:else if animeData.recommendationError}
			<Panel>
				<p class="text-sm text-primary">{animeData.recommendationError}</p>
			</Panel>
		{:else if animeData.recommendationSeed}
			<AnimeTable
				items={animeData.recommendationAnimeList}
				filterPlaceholder="Filter recommendations..."
				defaultSort="recommendation_score"
				defaultDirection="desc"
				showRecommendationsLink={false}
				extraColumns={recommendationExtraColumns}
			/>
		{/if}
	{/snippet}
</AnimeSearchPanel>
