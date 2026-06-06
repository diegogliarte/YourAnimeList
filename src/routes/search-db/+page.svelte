<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { fetchAnimeDbFacets, fetchAnimeDbPage } from '$lib/api/anime-db.api';
	import AnimeTable from '$lib/components/ui/AnimeTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import SelectInput, { type SelectOption } from '$lib/components/ui/SelectInput.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import type {
		AnimeDbEntry,
		AnimeDbFacetItem,
		AnimeDbFacetsResponse,
		AnimeDbFilters,
		AnimeDbNamedFacetItem
	} from '$lib/types/anime-db';
	import {
		formatLabel,
		formatNumber
	} from '$lib/utils/format.utils';

	const PAGE_SIZE = 50;
	const FILTER_DEBOUNCE_MS = 350;

	let items = $state<AnimeDbEntry[]>([]);
	let facets = $state<AnimeDbFacetsResponse | null>(null);

	let loading = $state(false);
	let loadingMore = $state(false);
	let facetsLoading = $state(false);
	let error = $state<string | null>(null);

	let total = $state(0);
	let nextOffset = $state<number | null>(0);

	let query = $state('');
	let sort = $state('');

	let mediaType = $state('');
	let status = $state('');
	let source = $state('');
	let rating = $state('');
	let nsfw = $state('');
	let genreId = $state('');
	let studioId = $state('');

	let yearMin = $state('');
	let yearMax = $state('');
	let meanMin = $state('');
	let meanMax = $state('');
	let episodesMin = $state('');
	let episodesMax = $state('');

	let sentinel = $state<HTMLDivElement | null>(null);

	let hasInitialized = $state(false);
	let requestId = 0;
	let lastFilterSignature = '';
	let filterDebounce: ReturnType<typeof setTimeout> | null = null;

	const filterSignature = $derived(
		JSON.stringify({
			query,
			sort,
			mediaType,
			status,
			source,
			rating,
			nsfw,
			genreId,
			studioId,
			yearMin,
			yearMax,
			meanMin,
			meanMax,
			episodesMin,
			episodesMax
		})
	);

	const sortOptions = $derived(
		(facets?.sorts ?? []).map((value) => ({
			value,
			label: formatFacetLabel(value)
		}))
	);

	const mediaTypeOptions = $derived(makeFacetOptions(facets?.mediaTypes ?? []));
	const statusOptions = $derived(makeFacetOptions(facets?.statuses ?? []));
	const sourceOptions = $derived(makeFacetOptions(facets?.sources ?? []));
	const ratingOptions = $derived(makeFacetOptions(facets?.ratings ?? []));
	const nsfwOptions = $derived(makeFacetOptions(facets?.nsfw ?? []));
	const genreOptions = $derived(makeNamedFacetOptions(facets?.genres ?? []));
	const studioOptions = $derived(makeNamedFacetOptions(facets?.studios ?? []));

	onMount(() => {
		void initialize();
	});

	$effect(() => {
		if (!browser || !sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					void loadAnime(false);
				}
			},
			{
				rootMargin: '700px'
			}
		);

		observer.observe(sentinel);

		return () => observer.disconnect();
	});

	$effect(() => {
		const currentFilterSignature = filterSignature;

		if (!hasInitialized) return;
		if (currentFilterSignature === lastFilterSignature) return;

		lastFilterSignature = currentFilterSignature;

		if (filterDebounce) {
			clearTimeout(filterDebounce);
		}

		filterDebounce = setTimeout(() => {
			void loadAnime(true);
		}, FILTER_DEBOUNCE_MS);

		return () => {
			if (filterDebounce) {
				clearTimeout(filterDebounce);
			}
		};
	});

	async function initialize() {
		await loadFacets();

		lastFilterSignature = filterSignature;
		hasInitialized = true;

		await loadAnime(true);
	}

	async function loadFacets() {
		facetsLoading = true;

		try {
			const result = await fetchAnimeDbFacets();

			facets = result;

			if (!sort || !result.sorts.includes(sort)) {
				sort = result.sorts[0] ?? '';
			}
		} catch {
			facets = null;
		} finally {
			facetsLoading = false;
		}
	}

	async function loadAnime(reset: boolean) {
		if (!reset && (loading || loadingMore)) return;
		if (!reset && nextOffset === null) return;

		const currentRequestId = ++requestId;

		if (reset) {
			loading = true;
			loadingMore = false;
			items = [];
			total = 0;
			nextOffset = 0;
		} else {
			loadingMore = true;
		}

		error = null;

		try {
			const result = await fetchAnimeDbPage(getFilters(reset ? 0 : nextOffset ?? 0));

			if (currentRequestId !== requestId) return;

			items = reset ? result.data : mergeAnime(items, result.data);
			total = result.total;
			nextOffset = result.nextOffset;
		} catch {
			if (currentRequestId !== requestId) return;

			error = 'The anime DB is down.';
		} finally {
			if (currentRequestId === requestId) {
				loading = false;
				loadingMore = false;
			}
		}
	}

	function submitForm() {
		lastFilterSignature = filterSignature;

		if (filterDebounce) {
			clearTimeout(filterDebounce);
		}

		void loadAnime(true);
	}

	function resetFilters() {
		query = '';
		sort = facets?.sorts[0] ?? '';

		mediaType = '';
		status = '';
		source = '';
		rating = '';
		nsfw = '';
		genreId = '';
		studioId = '';

		yearMin = '';
		yearMax = '';
		meanMin = '';
		meanMax = '';
		episodesMin = '';
		episodesMax = '';
	}

	function getFilters(offset: number): AnimeDbFilters {
		return {
			q: query.trim(),
			sort,
			limit: PAGE_SIZE,
			offset,

			media_type: mediaType,
			status,
			source,
			rating,
			nsfw,

			genre_id: genreId,
			studio_id: studioId,

			year_min: yearMin,
			year_max: yearMax,

			mean_min: meanMin,
			mean_max: meanMax,

			episodes_min: episodesMin,
			episodes_max: episodesMax
		};
	}

	function mergeAnime(current: AnimeDbEntry[], incoming: AnimeDbEntry[]) {
		const existingIds = new Set(current.map((anime) => anime.id));
		const uniqueIncoming = incoming.filter((anime) => !existingIds.has(anime.id));

		return [...current, ...uniqueIncoming];
	}

	function makeFacetOptions(items: AnimeDbFacetItem[]): SelectOption[] {
		return items.map((item) => ({
			value: item.value,
			label: `${formatFacetLabel(item.value)} (${formatNumber(item.count)})`
		}));
	}

	function makeNamedFacetOptions(items: AnimeDbNamedFacetItem[]): SelectOption[] {
		return items.map((item) => ({
			value: String(item.id),
			label: `${item.name} (${formatNumber(item.count)})`
		}));
	}

	function formatFacetLabel(value: string) {
		return formatLabel(value);
	}
</script>

<div class="grid gap-4">
	<Panel title="Search DB">
		<form
			class="grid min-w-0 gap-3"
			onsubmit={(event) => {
				event.preventDefault();
				submitForm();
			}}
		>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div class="flex min-w-0 flex-wrap items-center gap-2">
					<Input bind:value={query} placeholder="Search anime..." class="w-60" />

					<Button type="button" onclick={resetFilters} disabled={loading}>
						Reset
					</Button>

					{#if loading}
						<span class="text-xs text-text-muted">Updating...</span>
					{/if}
				</div>
			</div>

			<div class="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
				<SelectInput
					label="Sort"
					bind:value={sort}
					options={sortOptions}
					placeholder={sortOptions.length === 0 ? 'Loading...' : ''}
					disabled={sortOptions.length === 0}
				/>

				<SelectInput label="Media" bind:value={mediaType} options={mediaTypeOptions} />
				<SelectInput label="Status" bind:value={status} options={statusOptions} />
				<SelectInput label="Source" bind:value={source} options={sourceOptions} />
				<SelectInput label="Genre" bind:value={genreId} options={genreOptions} />
				<SelectInput label="Studio" bind:value={studioId} options={studioOptions} />
				<SelectInput label="Rating" bind:value={rating} options={ratingOptions} />
				<SelectInput label="NSFW" bind:value={nsfw} options={nsfwOptions} />
			</div>

			<div class="grid min-w-0 gap-2 sm:grid-cols-3">
				<div class="grid min-w-0 grid-cols-2 gap-2">
					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>Year min</span>
						<Input
							bind:value={yearMin}
							type="number"
							placeholder={facets?.ranges.minYear ? String(facets.ranges.minYear) : ''}
							class="w-full min-w-0"
						/>
					</label>

					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>Year max</span>
						<Input
							bind:value={yearMax}
							type="number"
							placeholder={facets?.ranges.maxYear ? String(facets.ranges.maxYear) : ''}
							class="w-full min-w-0"
						/>
					</label>
				</div>

				<div class="grid min-w-0 grid-cols-2 gap-2">
					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>Mean min</span>
						<Input
							bind:value={meanMin}
							type="number"
							step="0.1"
							placeholder="0"
							class="w-full min-w-0"
						/>
					</label>

					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>Mean max</span>
						<Input
							bind:value={meanMax}
							type="number"
							step="0.1"
							placeholder="10"
							class="w-full min-w-0"
						/>
					</label>
				</div>

				<div class="grid min-w-0 grid-cols-2 gap-2">
					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>Episodes min</span>
						<Input
							bind:value={episodesMin}
							type="number"
							placeholder="1"
							class="w-full min-w-0"
						/>
					</label>

					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>Episodes max</span>
						<Input
							bind:value={episodesMax}
							type="number"
							placeholder={facets?.ranges.maxEpisodes ? String(facets.ranges.maxEpisodes) : ''}
							class="w-full min-w-0"
						/>
					</label>
				</div>
			</div>

			{#if facetsLoading}
				<p class="text-xs text-text-muted">Loading filters...</p>
			{/if}
		</form>
	</Panel>

	{#if error}
		<Panel>
			<p class="text-sm text-primary">{error}</p>
		</Panel>
	{:else if loading}
		<Panel>
			<p class="text-sm text-text-muted">Loading anime...</p>
		</Panel>
	{:else}
		<div class="flex items-center justify-between gap-3 text-xs text-text-muted">
			<p>
				Showing {formatNumber(items.length)} / {formatNumber(total)}
			</p>

			<p>{sort ? formatFacetLabel(sort) : 'Default sort'}</p>
		</div>

		<AnimeTable items={items} showFilter={false} />

		<div bind:this={sentinel}></div>

		{#if loadingMore}
			<Panel>
				<p class="text-sm text-text-muted">Loading more...</p>
			</Panel>
		{:else if nextOffset !== null && items.length > 0}
			<div class="flex justify-center">
				<Button type="button" onclick={() => loadAnime(false)}>Load more</Button>
			</div>
		{:else if items.length > 0}
			<p class="py-3 text-center text-xs text-text-muted">
				End of the MAL dump.
			</p>
		{:else}
			<Panel>
				<p class="text-sm text-text-muted">No anime found.</p>
			</Panel>
		{/if}
	{/if}
</div>