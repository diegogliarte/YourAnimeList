<script lang="ts" module>
	import type {
		AnimeDetails,
		AnimeListStatusName,
		AnimeRankingEdge,
		UserAnimeListEdge
	} from '$lib/types/anime';
	import type { AnimeDbEntry } from '$lib/types/anime-db';

	export type AnimeTableAnime =
		| UserAnimeListEdge
		| AnimeRankingEdge
		| AnimeDetails
		| AnimeDbEntry;

	type SortDirection = 'asc' | 'desc';

	type ColumnValue =
		| 'rank'
		| 'title'
		| 'relation'
		| 'score'
		| 'mal_score'
		| 'progress'
		| 'episodes'
		| 'season'
		| 'popularity'
		| 'media_type'
		| 'anime_status'
		| 'source'
		| 'rating'
		| 'nsfw'
		| 'average_duration'
		| 'total_duration'
		| 'start_date'
		| 'end_date';

	type CellValue = string | number | null;

	type Column = {
		label: string;
		value: ColumnValue;
		align?: 'left' | 'right' | 'center';
		width?: string;
		hideable?: boolean;
	};

	type AnimeRow = {
		key: string;
		item: AnimeTableAnime;
		originalIndex: number;
		id: number | null;
		title: string;
		url: string | null;
		franchiseUrl: string | null;
		imageUrl: string | null;
		subtitle: string;
		subtitleExtra: string | null;
		userStatus: AnimeListStatusName | null;
		hasUserEntry: boolean;
		relationSource: string | null;
		rank: number | null;
		cells: Record<ColumnValue, CellValue>;
		sorts: Record<ColumnValue, CellValue>;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import {
		formatProgress,
		formatSeason,
		getAnimeUrl,
		getProgressValue,
		getSeasonValue
	} from '$lib/utils/anime.utils';
	import { formatDecimal, formatDuration, formatLabel, formatNumber } from '$lib/utils/format.utils';

	type Props = {
		items: AnimeTableAnime[];
		filterPlaceholder?: string;
		showFilter?: boolean;
		showColumnControls?: boolean;
		showFranchiseLink?: boolean;
		getSubtitleExtra?: (item: AnimeTableAnime) => string | null | undefined;
		class?: string;
	};

	const STORAGE_KEY = 'your-anime-list:anime-table:hidden-columns';

	const columns: Column[] = [
		{ label: '#', value: 'rank', width: '1rem' },
		{ label: 'Anime', value: 'title', width: '24rem', hideable: false },
		{ label: 'Relation', value: 'relation', width: '10rem' },
		{ label: 'Score', value: 'score', align: 'center', width: '4.5rem' },
		{ label: 'MAL', value: 'mal_score', align: 'center', width: '4.5rem' },
		{ label: 'Progress', value: 'progress', align: 'center', width: '5.5rem' },
		{ label: 'Episodes', value: 'episodes', align: 'center', width: '5.5rem' },
		{ label: 'Season', value: 'season', align: 'center', width: '6rem' },
		{ label: 'Popularity', value: 'popularity', align: 'center', width: '6rem' },
		{ label: 'Type', value: 'media_type', align: 'center', width: '5.5rem' },
		{ label: 'Anime Status', value: 'anime_status', align: 'center', width: '7rem' },
		{ label: 'Source', value: 'source', align: 'center', width: '7rem' },
		{ label: 'Rating', value: 'rating', align: 'center', width: '6rem' },
		{ label: 'NSFW', value: 'nsfw', align: 'center', width: '5rem' },
		{ label: 'Avg Ep', value: 'average_duration', align: 'center', width: '6rem' },
		{ label: 'Total Time', value: 'total_duration', align: 'center', width: '7rem' },
		{ label: 'Start Date', value: 'start_date', align: 'center', width: '7rem' },
		{ label: 'End Date', value: 'end_date', align: 'center', width: '7rem' }
	];

	const defaultVisibleColumns: ColumnValue[] = [
		'rank',
		'title',
		'score',
		'mal_score',
		'episodes',
		'season',
		'total_duration'
	];

	let {
		items,
		filterPlaceholder = 'Filter anime...',
		showFilter = true,
		showColumnControls = true,
		showFranchiseLink = true,
		getSubtitleExtra,
		class: className = ''
	}: Props = $props();

	let query = $state('');
	let selectedSort = $state<ColumnValue | null>(null);
	let direction = $state<SortDirection | null>(null);
	let hiddenColumns = $state<ColumnValue[]>(getDefaultHiddenColumns());

	const userEntryByAnimeId = $derived.by(() => {
		return new Map(animeData.userList.map((entry) => [entry.node.id, entry]));
	});

	const rows = $derived.by(() => {
		return items.map((item, originalIndex) => createRow(item, originalIndex));
	});

	const relevantColumns = $derived.by(() => {
		return columns.filter((column) => {
			if (column.value === 'title') return true;

			return rows.some((row) => isRelevant(row, column.value));
		});
	});

	const visibleColumns = $derived.by(() => {
		return relevantColumns.filter((column) => {
			return column.hideable === false || !hiddenColumns.includes(column.value);
		});
	});

	const filteredRows = $derived.by(() => {
		if (!showFilter || !query.trim()) return rows;

		const normalizedQuery = normalize(query);

		return rows.filter((row) => normalize(getFilterText(row)).includes(normalizedQuery));
	});

	const sortedRows = $derived.by(() => {
		if (!selectedSort || !direction || !isVisible(selectedSort)) return filteredRows;

		return [...filteredRows].sort((a, b) => {
			const result = compareValues(a.sorts[selectedSort], b.sorts[selectedSort]);

			return direction === 'desc' ? -result : result;
		});
	});

	const tableWidth = $derived.by(() => {
		const widths = visibleColumns
			.map((column) => column.width)
			.filter((width): width is string => Boolean(width));

		return widths.length === visibleColumns.length
			? `max(100%, calc(${widths.join(' + ')}))`
			: '100%';
	});

	onMount(() => {
		hiddenColumns = loadHiddenColumns();
	});

	$effect(() => {
		if (selectedSort && !isVisible(selectedSort)) {
			selectedSort = null;
			direction = null;
		}
	});

	function createRow(item: AnimeTableAnime, originalIndex: number): AnimeRow {
		const base = getBaseAnime(item);
		const id = numberOrNull(base.id);
		const title = String(base.title ?? '-');
		const userEntry = getUserEntry(item, id);
		const rank = isRankingEntry(item) ? (item.ranking?.rank ?? null) : null;

		const malScore = getMalScore(item);
		const episodes = getEpisodes(item);
		const averageDuration = getAverageEpisodeDuration(item);
		const totalDuration = getTotalDuration(item, episodes, averageDuration);
		const popularity = getPopularity(item);
		const startDate = getStartDate(item);
		const endDate = getEndDate(item);
		const seasonText = getSeasonText(item);
		const seasonSort = getSeasonSortValue(item);

		const subtitle = [
			label(getMediaType(item)),
			episodes ? `${formatNumber(episodes)} eps` : null,
			averageDuration ? `${formatDuration(averageDuration)}/ep` : null,
			totalDuration ? formatDuration(totalDuration) : null
		]
			.filter(Boolean)
			.join(' · ');

		const subtitleExtra = getSubtitleExtra?.(item) ?? null;

		const cells: Record<ColumnValue, CellValue> = {
			rank: rank ?? originalIndex + 1,
			title,
			relation: getRelationText(id),
			score: userEntry?.list_status?.display_score ?? null,
			mal_score: typeof malScore === 'number' ? formatDecimal(malScore, 2) : null,
			progress: userEntry ? formatProgress(userEntry) : null,
			episodes: episodes ? formatNumber(episodes) : null,
			season: seasonText,
			popularity: popularity ? `#${formatNumber(popularity)}` : null,
			media_type: label(getMediaType(item)),
			anime_status: label(getAnimeStatus(item)),
			source: isDbEntry(item) ? label(item.source) : null,
			rating: isDbEntry(item) ? label(item.rating) : null,
			nsfw: isDbEntry(item) ? label(item.nsfw) : null,
			average_duration: averageDuration ? `${formatDuration(averageDuration)}/ep` : null,
			total_duration: totalDuration ? formatDuration(totalDuration) : null,
			start_date: startDate,
			end_date: endDate
		};

		const sorts: Record<ColumnValue, CellValue> = {
			rank: rank ?? originalIndex + 1,
			title,
			relation: cells.relation,
			score: userEntry?.list_status?.sort_score ?? null,
			mal_score: malScore,
			progress: userEntry ? getProgressValue(userEntry) : null,
			episodes,
			season: seasonSort,
			popularity,
			media_type: cells.media_type,
			anime_status: cells.anime_status,
			source: cells.source,
			rating: cells.rating,
			nsfw: cells.nsfw,
			average_duration: averageDuration,
			total_duration: totalDuration,
			start_date: yearFromDate(startDate),
			end_date: yearFromDate(endDate)
		};

		return {
			key: `${id ?? title}-${originalIndex}`,
			item,
			originalIndex,
			id,
			title,
			url: getUrl(item, id),
			franchiseUrl: getFranchiseUrl(id),
			imageUrl: getImageUrl(item),
			subtitle,
			subtitleExtra,
			userStatus: userEntry?.list_status?.status ?? null,
			hasUserEntry: Boolean(userEntry),
			relationSource: getRelationSourceText(id),
			rank,
			cells,
			sorts
		};
	}

	function toggleSort(column: Column) {
		if (selectedSort !== column.value) {
			selectedSort = column.value;
			direction = 'asc';
			return;
		}

		if (direction === 'asc') {
			direction = 'desc';
			return;
		}

		selectedSort = null;
		direction = null;
	}

	function toggleColumn(column: Column) {
		if (isColumnDisabled(column)) return;

		hiddenColumns = hiddenColumns.includes(column.value)
			? hiddenColumns.filter((value) => value !== column.value)
			: [...hiddenColumns, column.value];

		saveHiddenColumns();
	}

	function cell(row: AnimeRow, value: ColumnValue, displayIndex: number) {
		if (value === 'rank') return row.rank ?? displayIndex + 1;

		return row.cells[value] ?? null;
	}

	function isRelevant(row: AnimeRow, value: ColumnValue) {
		if (value === 'relation') {
			return hasValue(row.cells.relation) || hasValue(row.relationSource);
		}

		if (value === 'score' || value === 'progress') {
			return row.hasUserEntry;
		}

		return hasValue(row.cells[value]);
	}

	function isVisible(value: ColumnValue) {
		return visibleColumns.some((column) => column.value === value);
	}

	function isColumnDisabled(column: Column) {
		return column.hideable === false || (isVisible(column.value) && visibleColumns.length <= 1);
	}

	function getFilterText(row: AnimeRow) {
		return [row.title, row.subtitle, row.subtitleExtra, row.relationSource, ...Object.values(row.cells)]
			.filter(Boolean)
			.join(' ');
	}

	function getDefaultHiddenColumns() {
		return columns
			.filter((column) => column.hideable !== false && !defaultVisibleColumns.includes(column.value))
			.map((column) => column.value);
	}

	function loadHiddenColumns() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);

			return raw ? sanitizeColumnValues(JSON.parse(raw)) : getDefaultHiddenColumns();
		} catch {
			localStorage.removeItem(STORAGE_KEY);

			return getDefaultHiddenColumns();
		}
	}

	function saveHiddenColumns() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenColumns));
		} catch {
			// Ignore storage failures.
		}
	}

	function sanitizeColumnValues(value: unknown) {
		if (!Array.isArray(value)) return getDefaultHiddenColumns();

		const validColumns = new Set(columns.map((column) => column.value));

		return value.filter((item): item is ColumnValue => {
			return typeof item === 'string' && validColumns.has(item as ColumnValue);
		});
	}

	function isNodeAnime(item: AnimeTableAnime): item is UserAnimeListEdge | AnimeRankingEdge {
		return 'node' in item;
	}

	function isUserListEntry(item: AnimeTableAnime): item is UserAnimeListEdge {
		return isNodeAnime(item) && 'list_status' in item;
	}

	function isRankingEntry(item: AnimeTableAnime): item is AnimeRankingEdge {
		return isNodeAnime(item) && 'ranking' in item;
	}

	function isDbEntry(item: AnimeTableAnime): item is AnimeDbEntry {
		return 'mainPicture' in item || 'mediaType' in item || 'numEpisodes' in item;
	}

	function getBaseAnime(item: AnimeTableAnime) {
		return (isNodeAnime(item) ? item.node : item) as Record<string, unknown>;
	}

	function getUserEntry(item: AnimeTableAnime, id: number | null) {
		if (isUserListEntry(item)) return item;

		return id ? userEntryByAnimeId.get(id) : undefined;
	}

	function getUrl(item: AnimeTableAnime, id: number | null) {
		if (isDbEntry(item)) return item.malUrl ?? null;

		return id ? getAnimeUrl(id) : null;
	}

	function getFranchiseUrl(id: number | null) {
		return showFranchiseLink && id ? `/franchises/${id}` : null;
	}

	function getImageUrl(item: AnimeTableAnime) {
		if (isDbEntry(item)) {
			return item.mainPicture?.medium ?? item.mainPicture?.large ?? null;
		}

		const picture = getBaseAnime(item).main_picture as
			| { medium?: string; large?: string }
			| undefined;

		return picture?.medium ?? picture?.large ?? null;
	}

	function getRelationText(id: number | null) {
		if (!id || !animeData.hasFranchise) return null;
		if (animeData.franchiseSeedId === id) return 'Seed';

		const relations = animeData.franchiseRelations.filter((relation) => relation.toId === id);

		return relations.length
			? relations
				.slice(0, 2)
				.map((relation) => relation.relationLabel)
				.join(', ')
			: null;
	}

	function getRelationSourceText(id: number | null) {
		if (!id) return null;

		const relation = animeData.franchiseRelations.find((relation) => relation.toId === id);
		const source = relation ? animeData.franchiseAnimeById[relation.fromId] : null;

		return source ? `from ${source.title}` : null;
	}

	function getMalScore(item: AnimeTableAnime) {
		if (isDbEntry(item)) {
			const dbItem = item as AnimeDbEntry & {
				mean?: number | null;
				malScore?: number | null;
				mal_score?: number | null;
			};

			return dbItem.malScore ?? dbItem.mal_score ?? dbItem.mean ?? null;
		}

		return numberOrNull(getBaseAnime(item).mean);
	}

	function getEpisodes(item: AnimeTableAnime) {
		return isDbEntry(item)
			? positiveNumber(item.numEpisodes)
			: positiveNumber(getBaseAnime(item).num_episodes);
	}

	function getPopularity(item: AnimeTableAnime) {
		return isDbEntry(item)
			? positiveNumber(item.popularity)
			: positiveNumber(getBaseAnime(item).popularity);
	}

	function getMediaType(item: AnimeTableAnime) {
		return isDbEntry(item) ? item.mediaType : getBaseAnime(item).media_type;
	}

	function getAnimeStatus(item: AnimeTableAnime) {
		return isDbEntry(item) ? item.status : getBaseAnime(item).status;
	}

	function getSeasonText(item: AnimeTableAnime) {
		if (isDbEntry(item)) return formatDbSeason(item);
		if (isNodeAnime(item)) return formatSeason(item);

		return formatSeason({ node: item } as UserAnimeListEdge);
	}

	function getSeasonSortValue(item: AnimeTableAnime) {
		if (isDbEntry(item)) return getDbSeasonValue(item);
		if (isNodeAnime(item)) return getSeasonValue(item);

		return getSeasonValue({ node: item } as UserAnimeListEdge);
	}

	function getAverageEpisodeDuration(item: AnimeTableAnime) {
		if (isDbEntry(item)) {
			const dbItem = item as AnimeDbEntry & {
				averageEpisodeDuration?: number | null;
				average_episode_duration?: number | null;
			};

			return positiveNumber(dbItem.averageEpisodeDuration ?? dbItem.average_episode_duration);
		}

		return positiveNumber(getBaseAnime(item).average_episode_duration);
	}

	function getTotalDuration(
		item: AnimeTableAnime,
		episodes: number | null,
		averageDuration: number | null
	) {
		if (isDbEntry(item)) return positiveNumber(item.totalDuration);

		return episodes && averageDuration ? episodes * averageDuration : null;
	}

	function getStartDate(item: AnimeTableAnime) {
		return isDbEntry(item)
			? (item.startDate ?? null)
			: ((getBaseAnime(item).start_date as string | null | undefined) ?? null);
	}

	function getEndDate(item: AnimeTableAnime) {
		if (isDbEntry(item)) {
			const dbItem = item as AnimeDbEntry & { endDate?: string | null };

			return dbItem.endDate ?? null;
		}

		return (getBaseAnime(item).end_date as string | null | undefined) ?? null;
	}

	function formatDbSeason(anime: AnimeDbEntry) {
		const year = anime.startSeason?.year ?? yearFromDate(anime.startDate);
		const season = anime.startSeason?.season;

		if (!year) return null;

		return season ? `${capitalize(season)} ${year}` : String(year);
	}

	function getDbSeasonValue(anime: AnimeDbEntry) {
		const year = anime.startSeason?.year ?? yearFromDate(anime.startDate);

		if (!year) return null;

		return year * 10 + getSeasonOrder(anime.startSeason?.season);
	}

	function getSeasonOrder(season?: string | null) {
		if (season === 'winter') return 1;
		if (season === 'spring') return 2;
		if (season === 'summer') return 3;
		if (season === 'fall') return 4;

		return 0;
	}

	function compareValues(a: unknown, b: unknown) {
		const aMissing = isMissing(a);
		const bMissing = isMissing(b);

		if (aMissing && bMissing) return 0;
		if (aMissing) return 1;
		if (bMissing) return -1;

		if (typeof a === 'number' && typeof b === 'number') {
			return a - b;
		}

		return String(a).localeCompare(String(b), undefined, {
			numeric: true,
			sensitivity: 'base'
		});
	}

	function isMissing(value: unknown) {
		return value === null || value === undefined || value === '' || value === '-';
	}

	function hasValue(value: unknown) {
		return !isMissing(value) && String(value).trim() !== '';
	}

	function label(value: unknown) {
		return typeof value === 'string' && value ? formatLabel(value) : null;
	}

	function positiveNumber(value: unknown) {
		return typeof value === 'number' && value > 0 ? value : null;
	}

	function numberOrNull(value: unknown) {
		return typeof value === 'number' ? value : null;
	}

	function yearFromDate(date?: string | null) {
		return date ? Number(date.slice(0, 4)) || null : null;
	}

	function capitalize(value: string) {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	function sortIcon(column: Column) {
		if (selectedSort !== column.value) return '△';

		return direction === 'desc' ? '▽' : '△';
	}

	function alignClass(align: Column['align']) {
		if (align === 'right') return 'text-right';
		if (align === 'center') return 'text-center';

		return 'text-left';
	}

	function cellClass(column: Column) {
		return [
			'px-3 py-2 whitespace-nowrap text-text-soft',
			alignClass(column.align),
			column.value === 'rank' && 'font-mono text-xs text-text-muted',
			(column.value === 'score' || column.value === 'mal_score') && 'font-medium text-primary'
		]
			.filter(Boolean)
			.join(' ');
	}

	function normalize(value: string) {
		return value
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.trim();
	}
</script>

<div class={`min-w-0 max-w-full overflow-hidden rounded-md border border-border bg-surface ${className}`}>
	{#if showFilter || showColumnControls}
		<div class="grid min-w-0 gap-2 border-b border-border bg-surface p-2">
			{#if showFilter}
				<Input bind:value={query} placeholder={filterPlaceholder} class="min-w-0" />
			{/if}

			{#if showColumnControls}
				<div class="flex min-w-0 flex-wrap gap-1">
					{#each relevantColumns as column (column.value)}
						<Checkbox
							label={column.label}
							checked={isVisible(column.value)}
							disabled={isColumnDisabled(column)}
							onchange={() => toggleColumn(column)}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<div class="min-w-0 max-w-full overflow-x-auto">
		<table class="table-fixed border-collapse text-sm" style:width={tableWidth}>
			<colgroup>
				{#each visibleColumns as column (column.value)}
					<col style:width={column.width} />
				{/each}
			</colgroup>

			<thead class="bg-surface-soft text-xs text-text-muted">
			<tr>
				{#each visibleColumns as column (column.value)}
					<th class={`px-3 py-2 font-medium whitespace-nowrap ${alignClass(column.align)}`}>
						<button
							type="button"
							class="inline-flex cursor-pointer items-center gap-1 text-inherit transition hover:text-text"
							onclick={() => toggleSort(column)}
						>
							<span>{column.label}</span>

							<span
								class={`inline-block w-3 text-right text-primary ${
										selectedSort === column.value ? 'opacity-100' : 'opacity-0'
									}`}
							>
									{sortIcon(column)}
								</span>
						</button>
					</th>
				{/each}
			</tr>
			</thead>

			<tbody class="divide-y divide-border">
			{#if sortedRows.length}
				{#each sortedRows as row, displayIndex (row.key)}
					<tr class="transition hover:bg-surface-soft">
						{#each visibleColumns as column (column.value)}
							{#if column.value === 'title'}
								<td class="max-w-96 px-3 py-2">
									<div class="group flex min-w-0 items-center gap-3 text-text">
										{#if row.url}
											<a href={row.url} target="_blank" rel="noreferrer" class="shrink-0">
												{#if row.imageUrl}
													<img
														src={row.imageUrl}
														alt={row.title}
														class="size-9 rounded-md object-cover"
													/>
												{:else}
													<div class="size-9 rounded-md bg-surface-soft"></div>
												{/if}
											</a>
										{:else}
											{#if row.imageUrl}
												<img
													src={row.imageUrl}
													alt={row.title}
													class="size-9 shrink-0 rounded-md object-cover"
												/>
											{:else}
												<div class="size-9 shrink-0 rounded-md bg-surface-soft"></div>
											{/if}
										{/if}

										<div class="min-w-0 flex-1">
											{#if row.url}
												<a
													href={row.url}
													target="_blank"
													rel="noreferrer"
													class="block truncate font-medium transition hover:text-primary"
												>
													{row.title}
												</a>
											{:else}
												<span class="block truncate font-medium">{row.title}</span>
											{/if}

											{#if row.subtitle || row.userStatus || row.franchiseUrl}
												<div class="flex min-w-0 items-center gap-2 text-xs text-text-muted">
						<span class="flex min-w-0 items-center gap-1">
							{#if row.userStatus}
								<StatusBadge class="mt-0.5" status={row.userStatus} />
							{/if}

							{#if row.subtitle}
								<span class="truncate">{row.subtitle}</span>
							{/if}
						</span>

													{#if row.franchiseUrl}
							<span
								class="
									pointer-events-none hidden shrink-0 items-center gap-1 opacity-0 transition
									group-hover:pointer-events-auto group-hover:flex group-hover:opacity-100
									group-focus-within:pointer-events-auto group-focus-within:flex group-focus-within:opacity-100
								"
							>
								<a
									href={row.franchiseUrl}
									target="_blank"
									rel="noreferrer"
									class="
										rounded border border-border px-1 py-0.5 text-[10px] leading-none text-text-muted
										transition hover:border-primary hover:text-primary
										focus:opacity-100
									"
									title={`Open franchise for ${row.title}`}
									aria-label={`Open franchise for ${row.title}`}
								>
									Franchise
								</a>
							</span>
													{/if}
												</div>
											{/if}

											{#if row.subtitleExtra}
					<span class="block truncate text-[10px] text-text-muted">
						{row.subtitleExtra}
					</span>
											{/if}
										</div>
									</div>
								</td>
							{:else if column.value === 'relation'}
								<td class="px-3 py-2 text-text-soft">
									<div class="max-w-44">
										<p class="truncate">{cell(row, column.value, displayIndex) ?? '-'}</p>

										{#if row.relationSource}
											<p class="truncate text-xs text-text-muted">{row.relationSource}</p>
										{/if}
									</div>
								</td>
							{:else}
								<td class={cellClass(column)}>
									{cell(row, column.value, displayIndex) ?? '-'}
								</td>
							{/if}
						{/each}
					</tr>
				{/each}
			{:else}
				<tr>
					<td
						colspan={Math.max(visibleColumns.length, 1)}
						class="px-3 py-8 text-center text-text-muted"
					>
						No results.
					</td>
				</tr>
			{/if}
			</tbody>
		</table>
	</div>
</div>