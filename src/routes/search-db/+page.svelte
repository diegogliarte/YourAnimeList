<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { fetchAnimeDbFacets, fetchAnimeDbPage } from '$lib/api/anime-db.api';
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import SelectInput, { type SelectOption } from '$lib/components/ui/SelectInput.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Table, { type TableColumn } from '$lib/components/ui/Table.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type {
		AnimeDbEntry,
		AnimeDbFacetItem,
		AnimeDbFacetsResponse,
		AnimeDbFilters,
		AnimeDbNamedFacetItem
	} from '$lib/types/anime-db';
	import type { AnimeListStatusName, UserAnimeListEdge } from '$lib/types/anime';
	import {
		formatDecimal,
		formatDuration,
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

	let showMalScore = $state(true);
	let sentinel = $state<HTMLDivElement | null>(null);

	let hasInitialized = $state(false);
	let requestId = 0;
	let lastFilterSignature = '';
	let filterDebounce: ReturnType<typeof setTimeout> | null = null;

	const userEntryByAnimeId = $derived.by(() => {
		const entries = new Map<number, UserAnimeListEdge>();

		for (const entry of animeData.userList) {
			entries.set(entry.node.id, entry);
		}

		return entries;
	});

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

	const columns: TableColumn<AnimeDbEntry>[] = $derived.by(() => {
		const baseColumns: TableColumn<AnimeDbEntry>[] = [
			{
				label: '#',
				value: 'index',
				width: '3rem'
			},
			{
				label: 'Anime',
				value: 'title',
				width: '24rem'
			}
		];

		if (showMalScore) {
			baseColumns.push({
				label: 'MAL',
				value: 'mean',
				align: 'center',
				width: '4.5rem'
			});
		}

		baseColumns.push(
			{
				label: 'Popularity',
				value: 'popularity',
				align: 'center',
				width: '6rem'
			},
			{
				label: 'Episodes',
				value: 'episodes',
				align: 'center',
				width: '5rem'
			},
			{
				label: 'Season',
				value: 'season',
				align: 'center',
				width: '6rem'
			},
			{
				label: 'Runtime',
				value: 'runtime',
				align: 'right',
				width: '6rem'
			}
		);

		return baseColumns;
	});

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

	function getUserEntry(animeId: number) {
		return userEntryByAnimeId.get(animeId);
	}

	function getUserStatus(animeId: number): AnimeListStatusName | null {
		return getUserEntry(animeId)?.list_status?.status ?? null;
	}

	function getImageUrl(anime: AnimeDbEntry) {
		return anime.mainPicture.medium ?? anime.mainPicture.large;
	}

	function getSubtitle(anime: AnimeDbEntry) {
		return [
			anime.mediaType ?? 'unknown',
			anime.status ? formatLabel(anime.status) : '',
			anime.source ? formatLabel(anime.source) : '',
			anime.rating ? formatLabel(anime.rating) : ''
		]
			.filter(Boolean)
			.join(' · ');
	}

	function formatDbSeason(anime: AnimeDbEntry) {
		const year = anime.startSeason.year ?? getYearFromDate(anime.startDate);
		const season = anime.startSeason.season;

		if (!year) return '-';
		if (!season) return String(year);

		return `${capitalize(season)} ${year}`;
	}

	function getYearFromDate(date?: string | null) {
		if (!date) return 0;

		return Number(date.slice(0, 4)) || 0;
	}

	function capitalize(value: string) {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	function formatMean(value: number | null) {
		return typeof value === 'number' ? formatDecimal(value, 2) : '-';
	}

	function formatPopularity(value: number | null) {
		return typeof value === 'number' ? `#${formatNumber(value)}` : '-';
	}

	function formatRuntime(value: number | null) {
		return value && value > 0 ? formatDuration(value) : '-';
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

				<Toggle bind:checked={showMalScore} label="MAL score" class="ml-auto" />
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

		<Table items={items} {columns}>
			{#snippet children(anime, index)}
				<tr class="transition hover:bg-surface-soft">
					<td class="w-12 px-3 py-2 text-left font-mono text-xs text-text-muted">
						{index + 1}
					</td>

					<td class="w-96 max-w-96 px-3 py-2">
						<div class="flex min-w-0 items-center gap-3">
							{#if getImageUrl(anime)}
								<img
									src={getImageUrl(anime)}
									alt={anime.title}
									class="size-9 shrink-0 rounded-md object-cover"
								/>
							{:else}
								<div class="size-9 shrink-0 rounded-md bg-surface-soft"></div>
							{/if}

							<div class="min-w-0">
								<a
									href={anime.malUrl}
									target="_blank"
									rel="noreferrer"
									class="block max-w-80 truncate font-medium text-text hover:text-primary"
								>
									{anime.title}
								</a>

								<span class="flex min-w-0 items-center gap-1 text-xs text-text-muted">
									<StatusBadge status={getUserStatus(anime.id)} />

									<span class="truncate">
										{getSubtitle(anime)}
									</span>
								</span>
							</div>
						</div>
					</td>

					{#if showMalScore}
						<td class="px-3 py-2 text-center font-medium text-primary">
							{formatMean(anime.mean)}
						</td>
					{/if}

					<td class="px-3 py-2 text-center text-text-soft">
						{formatPopularity(anime.popularity)}
					</td>

					<td class="px-3 py-2 text-center text-text-soft">
						{anime.numEpisodes || '?'}
					</td>

					<td class="whitespace-nowrap px-3 py-2 text-center text-text-soft">
						{formatDbSeason(anime)}
					</td>

					<td class="whitespace-nowrap px-3 py-2 text-right text-text-soft">
						{formatRuntime(anime.totalDuration)}
					</td>
				</tr>
			{/snippet}
		</Table>

		<div bind:this={sentinel} class="h-6"></div>

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