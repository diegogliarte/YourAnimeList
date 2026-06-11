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
	import { formatLabel, formatNumber } from '$lib/utils/format.utils';
	import MultiSelect from '$lib/components/ui/MultiSelect.svelte';

	const PAGE_SIZE = 50;
	const FILTER_DEBOUNCE_MS = 350;

	const seasonOptions: SelectOption[] = [
		{ value: 'winter', label: 'Winter' },
		{ value: 'spring', label: 'Spring' },
		{ value: 'summer', label: 'Summer' },
		{ value: 'fall', label: 'Fall' }
	];

	const relationModeOptions: SelectOption[] = [
		{ value: 'all', label: 'Match all' },
		{ value: 'any', label: 'Match any' }
	];

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

	let genreIds = $state<string[]>([]);
	let genreMode = $state<'any' | 'all'>('all');

	let studioIds = $state<string[]>([]);
	let studioMode = $state<'any' | 'all'>('any');

	let season = $state('');

	let yearMin = $state('');
	let yearMax = $state('');

	let malScoreMin = $state('');
	let malScoreMax = $state('');

	let popularityMin = $state('');
	let popularityMax = $state('');

	let episodesMin = $state('');
	let episodesMax = $state('');

	let usersMin = $state('');
	let usersMax = $state('');

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
			genreIds,
			genreMode,
			studioIds,
			studioMode,
			season,
			yearMin,
			yearMax,
			malScoreMin,
			malScoreMax,
			popularityMin,
			popularityMax,
			episodesMin,
			episodesMax,
			usersMin,
			usersMax
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

		genreIds = [];
		genreMode = 'all';

		studioIds = [];
		studioMode = 'any';

		season = '';

		yearMin = '';
		yearMax = '';

		malScoreMin = '';
		malScoreMax = '';

		popularityMin = '';
		popularityMax = '';

		episodesMin = '';
		episodesMax = '';

		usersMin = '';
		usersMax = '';
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

			genre_ids: genreIds.join(','),
			genre_mode: genreMode,

			studio_ids: studioIds.join(','),
			studio_mode: studioMode,

			season,

			year_min: yearMin,
			year_max: yearMax,

			mal_score_min: malScoreMin,
			mal_score_max: malScoreMax,

			popularity_min: popularityMin,
			popularity_max: popularityMax,

			episodes_min: episodesMin,
			episodes_max: episodesMax,

			users_min: usersMin,
			users_max: usersMax
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
		if (value === 'oldest_first') return 'Oldest first';
		if (value === 'newest_first') return 'Newest first';
		if (value === 'lowest_mal_score') return 'Lowest MAL score';
		if (value === 'highest_mal_score') return 'Highest MAL score';
		if (value === 'most_popular') return 'Most popular';
		if (value === 'least_popular') return 'Least popular';
		if (value === 'most_favorites') return 'Most favorites';
		if (value === 'most_listed') return 'Most listed';
		if (value === 'most_episodes') return 'Most episodes';
		if (value === 'fewest_episodes') return 'Fewest episodes';
		if (value === 'longest_runtime') return 'Longest runtime';
		if (value === 'shortest_runtime') return 'Shortest runtime';
		if (value === 'title_asc') return 'Title';

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
				<SelectInput label="Season" bind:value={season} options={seasonOptions} />
				<SelectInput label="Rating" bind:value={rating} options={ratingOptions} />
				<SelectInput label="NSFW" bind:value={nsfw} options={nsfwOptions} />
			</div>

			<div class="grid min-w-0 gap-2 lg:grid-cols-2">
				<div class="grid min-w-0 gap-2 rounded-md border border-border bg-surface-soft/40 p-2">
					<div class="flex min-w-0 items-center justify-between gap-2">
						<div class="min-w-0">
							<p class="truncate text-xs font-medium text-text">Genres</p>
							<p class="truncate text-[11px] text-text-muted">
								Select one or more genres to narrow the DB.
							</p>
						</div>

						{#if genreIds.length > 0}
				<span class="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
					{genreIds.length}
				</span>
						{/if}
					</div>

					<div class="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
						<MultiSelect
							label="Genre filter"
							bind:value={genreIds}
							options={genreOptions}
							placeholder="Any genre"
							searchPlaceholder="Search genres..."
						/>

						<SelectInput label="Mode" bind:value={genreMode} options={relationModeOptions} />
					</div>
				</div>

				<div class="grid min-w-0 gap-2 rounded-md border border-border bg-surface-soft/40 p-2">
					<div class="flex min-w-0 items-center justify-between gap-2">
						<div class="min-w-0">
							<p class="truncate text-xs font-medium text-text">Studios</p>
							<p class="truncate text-[11px] text-text-muted">
								Filter by one or more production studios.
							</p>
						</div>

						{#if studioIds.length > 0}
				<span class="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
					{studioIds.length}
				</span>
						{/if}
					</div>

					<div class="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
						<MultiSelect
							label="Studio filter"
							bind:value={studioIds}
							options={studioOptions}
							placeholder="Any studio"
							searchPlaceholder="Search studios..."
						/>

						<SelectInput label="Mode" bind:value={studioMode} options={relationModeOptions} />
					</div>
				</div>
			</div>

			<div class="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
						<span>MAL score min</span>
						<Input
							bind:value={malScoreMin}
							type="number"
							step="0.1"
							placeholder="0"
							class="w-full min-w-0"
						/>
					</label>

					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>MAL score max</span>
						<Input
							bind:value={malScoreMax}
							type="number"
							step="0.1"
							placeholder="10"
							class="w-full min-w-0"
						/>
					</label>
				</div>

				<div class="grid min-w-0 grid-cols-2 gap-2">
					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>Popularity min</span>
						<Input
							bind:value={popularityMin}
							type="number"
							placeholder="1"
							class="w-full min-w-0"
						/>
					</label>

					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>Popularity max</span>
						<Input
							bind:value={popularityMax}
							type="number"
							placeholder="10000"
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

				<div class="grid min-w-0 grid-cols-2 gap-2">
					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>List users min</span>
						<Input
							bind:value={usersMin}
							type="number"
							placeholder="0"
							class="w-full min-w-0"
						/>
					</label>

					<label class="grid min-w-0 gap-1 text-xs text-text-muted">
						<span>List users max</span>
						<Input
							bind:value={usersMax}
							type="number"
							placeholder="1000000"
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