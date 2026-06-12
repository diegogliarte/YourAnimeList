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
		| 'start_date';

	type Column = {
		label: string;
		value: ColumnValue;
		align?: 'left' | 'right' | 'center';
		width?: string;
		hideable?: boolean;
	};
</script>

<script lang="ts">
	import { onMount, tick } from 'svelte';
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
		{ label: 'Start', value: 'start_date', align: 'center', width: '7rem' }
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
		class: className = ''
	}: Props = $props();

	let query = $state('');
	let selectedSort = $state<ColumnValue | null>(null);
	let direction = $state<SortDirection | null>(null);
	let hiddenColumns = $state<ColumnValue[]>(getDefaultHiddenColumns());

	const userEntryByAnimeId = $derived.by(() => {
		const entries = new Map<number, UserAnimeListEdge>();

		for (const entry of animeData.userList) {
			entries.set(entry.node.id, entry);
		}

		return entries;
	});

	const relevantColumns = $derived.by(() => {
		return columns.filter((column) => {
			if (column.value === 'title') return true;

			return items.some((item) => isColumnRelevant(item, column.value));
		});
	});

	const visibleColumns = $derived.by(() => {
		return relevantColumns.filter((column) => {
			if (column.hideable === false) return true;

			return !hiddenColumns.includes(column.value);
		});
	});

	const filteredRows = $derived.by(() => {
		const normalizedQuery = normalize(query);

		return items
			.map((item, originalIndex) => ({
				item,
				originalIndex,
				key: `${getAnimeId(item)}-${originalIndex}`
			}))
			.filter((row) => {
				if (!showFilter || !normalizedQuery) return true;

				return normalize(getFilterText(row.item)).includes(normalizedQuery);
			});
	});

	const sortedRows = $derived.by(() => {
		if (!selectedSort || !direction) return filteredRows;

		const sortColumnIsVisible = visibleColumns.some((column) => column.value === selectedSort);

		if (!sortColumnIsVisible) return filteredRows;

		return [...filteredRows].sort((a, b) => {
			const result = compareValues(
				getSortValue(a.item, selectedSort, a.originalIndex),
				getSortValue(b.item, selectedSort, b.originalIndex)
			);

			return direction === 'desc' ? -result : result;
		});
	});

	onMount(() => {
		hiddenColumns = loadHiddenColumns();
	});

	$effect(() => {
		if (!selectedSort) return;

		const sortColumnIsVisible = visibleColumns.some((column) => column.value === selectedSort);

		if (!sortColumnIsVisible) {
			selectedSort = null;
			direction = null;
		}
	});

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

	function getDefaultHiddenColumns() {
		return columns
			.filter((column) => {
				if (column.hideable === false) return false;

				return !defaultVisibleColumns.includes(column.value);
			})
			.map((column) => column.value);
	}

	function loadHiddenColumns() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);

			if (!raw) return getDefaultHiddenColumns();

			return sanitizeColumnValues(JSON.parse(raw));
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

	function isColumnVisible(value: ColumnValue) {
		return visibleColumns.some((column) => column.value === value);
	}

	function isColumnDisabled(column: Column) {
		if (column.hideable === false) return true;

		return isColumnVisible(column.value) && visibleColumns.length <= 1;
	}

	function getSortIcon(column: Column) {
		if (selectedSort !== column.value) return '△';
		if (direction === 'asc') return '△';
		if (direction === 'desc') return '▽';

		return '△';
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

	function getBaseAnime(item: AnimeTableAnime): Record<string, any> {
		if (isNodeAnime(item)) return item.node as Record<string, any>;

		return item as Record<string, any>;
	}

	function getAnimeId(item: AnimeTableAnime) {
		return getBaseAnime(item).id;
	}

	function getTitle(item: AnimeTableAnime) {
		return String(getBaseAnime(item).title ?? '-');
	}

	function getUrl(item: AnimeTableAnime) {
		if (isDbEntry(item)) return item.malUrl;

		const id = getAnimeId(item);

		return typeof id === 'number' ? getAnimeUrl(id) : null;
	}

	function getImageUrl(item: AnimeTableAnime) {
		if (isDbEntry(item)) {
			return item.mainPicture?.medium ?? item.mainPicture?.large ?? null;
		}

		const anime = getBaseAnime(item);

		return anime.main_picture?.medium ?? anime.main_picture?.large ?? null;
	}

	function getUserEntry(item: AnimeTableAnime) {
		if (isUserListEntry(item)) return item;

		const id = getAnimeId(item);

		if (typeof id !== 'number') return undefined;

		return userEntryByAnimeId.get(id);
	}

	function getUserStatusName(item: AnimeTableAnime): AnimeListStatusName | null {
		return getUserEntry(item)?.list_status?.status ?? null;
	}

	function getUserScoreText(item: AnimeTableAnime) {
		return getUserEntry(item)?.list_status?.display_score ?? null;
	}

	function getUserScoreValue(item: AnimeTableAnime) {
		return getUserEntry(item)?.list_status?.sort_score ?? null;
	}

	function getProgressText(item: AnimeTableAnime) {
		const userEntry = getUserEntry(item);

		return userEntry ? formatProgress(userEntry) : null;
	}

	function getProgressSortValue(item: AnimeTableAnime) {
		const userEntry = getUserEntry(item);

		return userEntry ? getProgressValue(userEntry) : null;
	}

	function getRelationText(item: AnimeTableAnime) {
		const id = getAnimeId(item);

		if (typeof id !== 'number') return null;
		if (!animeData.hasFranchise) return null;
		if (animeData.franchiseSeedId === id) return 'Seed';

		const relations = animeData.franchiseRelations.filter((relation) => relation.toId === id);

		if (relations.length === 0) return null;

		return relations
			.slice(0, 2)
			.map((relation) => relation.relationLabel)
			.join(', ');
	}

	function getRelationSourceText(item: AnimeTableAnime) {
		const id = getAnimeId(item);

		if (typeof id !== 'number') return null;

		const relation = animeData.franchiseRelations.find((relation) => relation.toId === id);

		if (!relation) return null;

		const source = animeData.franchiseAnimeById[relation.fromId];

		return source ? `from ${source.title}` : null;
	}

	function getMalScoreValue(item: AnimeTableAnime) {
		if (isDbEntry(item)) {
			const dbItem = item as AnimeDbEntry & {
				mean?: number | null;
				malScore?: number | null;
				mal_score?: number | null;
			};

			return dbItem.malScore ?? dbItem.mal_score ?? dbItem.mean ?? null;
		}

		return getBaseAnime(item).mean ?? null;
	}

	function getMalScoreText(item: AnimeTableAnime) {
		const malScore = getMalScoreValue(item);

		return typeof malScore === 'number' ? formatDecimal(malScore, 2) : null;
	}

	function getEpisodesValue(item: AnimeTableAnime) {
		if (isDbEntry(item)) return item.numEpisodes;

		return getBaseAnime(item).num_episodes ?? null;
	}

	function getEpisodesText(item: AnimeTableAnime) {
		const episodes = getEpisodesValue(item);

		if (typeof episodes !== 'number') return null;

		return episodes > 0 ? formatNumber(episodes) : '?';
	}

	function getPopularityValue(item: AnimeTableAnime) {
		const popularity = isDbEntry(item) ? item.popularity : (getBaseAnime(item).popularity ?? null);

		return typeof popularity === 'number' && popularity > 0 ? popularity : null;
	}

	function getPopularityText(item: AnimeTableAnime) {
		const popularity = getPopularityValue(item);

		return typeof popularity === 'number' ? `#${formatNumber(popularity)}` : 'No pop';
	}

	function getMediaTypeRaw(item: AnimeTableAnime) {
		if (isDbEntry(item)) return item.mediaType;

		return getBaseAnime(item).media_type ?? null;
	}

	function getMediaTypeText(item: AnimeTableAnime) {
		return formatOptionalLabel(getMediaTypeRaw(item));
	}

	function getAnimeStatusRaw(item: AnimeTableAnime) {
		if (isDbEntry(item)) return item.status;

		return getBaseAnime(item).status ?? null;
	}

	function getAnimeStatusText(item: AnimeTableAnime) {
		return formatOptionalLabel(getAnimeStatusRaw(item));
	}

	function getSourceText(item: AnimeTableAnime) {
		return isDbEntry(item) ? formatOptionalLabel(item.source) : null;
	}

	function getRatingText(item: AnimeTableAnime) {
		return isDbEntry(item) ? formatOptionalLabel(item.rating) : null;
	}

	function getNsfwText(item: AnimeTableAnime) {
		return isDbEntry(item) ? formatOptionalLabel(item.nsfw) : null;
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

	function getAverageEpisodeDurationValue(item: AnimeTableAnime) {
		if (isDbEntry(item)) {
			const dbItem = item as AnimeDbEntry & {
				averageEpisodeDuration?: number | null;
				average_episode_duration?: number | null;
			};

			return dbItem.averageEpisodeDuration ?? dbItem.average_episode_duration ?? null;
		}

		return getBaseAnime(item).average_episode_duration ?? null;
	}

	function getAverageEpisodeDurationText(item: AnimeTableAnime) {
		const duration = getAverageEpisodeDurationValue(item);

		return duration && duration > 0 ? `${formatDuration(duration)}/ep` : null;
	}

	function getTotalDurationValue(item: AnimeTableAnime) {
		if (isDbEntry(item)) return item.totalDuration ?? null;

		const episodes = getEpisodesValue(item) ?? 0;
		const duration = getAverageEpisodeDurationValue(item) ?? 0;

		if (episodes <= 0 || duration <= 0) return null;

		return episodes * duration;
	}

	function getTotalDurationText(item: AnimeTableAnime) {
		const totalDuration = getTotalDurationValue(item);

		return totalDuration && totalDuration > 0 ? formatDuration(totalDuration) : null;
	}

	function getStartDateRaw(item: AnimeTableAnime) {
		if (isDbEntry(item)) return item.startDate;

		return getBaseAnime(item).start_date ?? null;
	}

	function getStartDateText(item: AnimeTableAnime) {
		return getStartDateRaw(item) ?? null;
	}

	function getStartDateSortValue(item: AnimeTableAnime) {
		return getYearFromDate(getStartDateRaw(item));
	}

	function getRankText(item: AnimeTableAnime, displayIndex: number) {
		if (isRankingEntry(item)) return item.ranking?.rank ?? displayIndex + 1;

		return displayIndex + 1;
	}

	function getRankSortValue(item: AnimeTableAnime, originalIndex: number) {
		if (isRankingEntry(item)) return item.ranking?.rank ?? 999999;

		return originalIndex + 1;
	}

	function getSubtitle(item: AnimeTableAnime) {
		const parts = [
			getMediaTypeText(item),
			isDbEntry(item) ? getSourceText(item) : null,
			isDbEntry(item) ? getRatingText(item) : null,
			!isDbEntry(item) ? getSeasonText(item) : null,
			getEpisodesText(item) ? `${getEpisodesText(item)} eps` : null,
			getAverageEpisodeDurationText(item),
			getTotalDurationText(item)
		];

		return parts.filter(Boolean).join(' · ');
	}

	function getFilterText(item: AnimeTableAnime) {
		const values = columns.map((column) => getCellText(item, column.value, 0));

		return [getTitle(item), getSubtitle(item), ...values].filter(Boolean).join(' ');
	}

	function getCellText(item: AnimeTableAnime, value: ColumnValue, displayIndex: number) {
		if (value === 'rank') return getRankText(item, displayIndex);
		if (value === 'title') return getTitle(item);
		if (value === 'relation') return getRelationText(item);
		if (value === 'score') return getUserScoreText(item);
		if (value === 'mal_score') return getMalScoreText(item);
		if (value === 'progress') return getProgressText(item);
		if (value === 'episodes') return getEpisodesText(item);
		if (value === 'season') return getSeasonText(item);
		if (value === 'popularity') return getPopularityText(item);
		if (value === 'media_type') return getMediaTypeText(item);
		if (value === 'anime_status') return getAnimeStatusText(item);
		if (value === 'source') return getSourceText(item);
		if (value === 'rating') return getRatingText(item);
		if (value === 'nsfw') return getNsfwText(item);
		if (value === 'average_duration') return getAverageEpisodeDurationText(item);
		if (value === 'total_duration') return getTotalDurationText(item);
		if (value === 'start_date') return getStartDateText(item);

		return null;
	}

	function getSortValue(item: AnimeTableAnime, value: ColumnValue, originalIndex: number) {
		if (value === 'rank') return getRankSortValue(item, originalIndex);
		if (value === 'title') return getTitle(item);
		if (value === 'relation') return getRelationText(item);
		if (value === 'score') return getUserScoreValue(item);
		if (value === 'mal_score') return getMalScoreValue(item);
		if (value === 'progress') return getProgressSortValue(item);
		if (value === 'episodes') return getEpisodesValue(item);
		if (value === 'season') return getSeasonSortValue(item);
		if (value === 'popularity') return getPopularityValue(item);
		if (value === 'media_type') return getMediaTypeText(item);
		if (value === 'anime_status') return getAnimeStatusText(item);
		if (value === 'source') return getSourceText(item);
		if (value === 'rating') return getRatingText(item);
		if (value === 'nsfw') return getNsfwText(item);
		if (value === 'average_duration') return getAverageEpisodeDurationValue(item);
		if (value === 'total_duration') return getTotalDurationValue(item);
		if (value === 'start_date') return getStartDateSortValue(item);

		return null;
	}

	function isColumnRelevant(item: AnimeTableAnime, value: ColumnValue) {
		if (value === 'relation') {
			return hasValue(getRelationText(item)) || hasValue(getRelationSourceText(item));
		}

		if (value === 'score' || value === 'progress') {
			return Boolean(getUserEntry(item));
		}

		return hasValue(getCellText(item, value, 0));
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
		if (isMissing(value)) return false;

		return String(value).trim() !== '';
	}

	function formatOptionalLabel(value: string | null | undefined) {
		return value ? formatLabel(value) : null;
	}

	function formatDbSeason(anime: AnimeDbEntry) {
		const year = anime.startSeason.year ?? getYearFromDate(anime.startDate);
		const season = anime.startSeason.season;

		if (!year) return null;
		if (!season) return String(year);

		return `${capitalize(season)} ${year}`;
	}

	function getDbSeasonValue(anime: AnimeDbEntry) {
		const year = anime.startSeason.year ?? getYearFromDate(anime.startDate);

		if (!year) return null;

		return year * 10 + getSeasonOrder(anime.startSeason.season);
	}

	function getSeasonOrder(season?: string | null) {
		if (season === 'winter') return 1;
		if (season === 'spring') return 2;
		if (season === 'summer') return 3;
		if (season === 'fall') return 4;

		return 0;
	}

	function getYearFromDate(date?: string | null) {
		if (!date) return null;

		return Number(date.slice(0, 4)) || null;
	}

	function capitalize(value: string) {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	function alignClass(align: Column['align']) {
		if (align === 'right') return 'text-right';
		if (align === 'center') return 'text-center';

		return 'text-left';
	}

	function normalize(value: string) {
		return value
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.trim();
	}

	const tableWidth = $derived.by(() => {
		const widths = visibleColumns
			.map((column) => column.width)
			.filter((width): width is string => Boolean(width));

		if (widths.length !== visibleColumns.length) {
			return '100%';
		}

		return `max(100%, calc(${widths.join(' + ')}))`;
	});
</script>

<div class={`min-w-0 max-w-full overflow-hidden rounded-md border border-border bg-surface ${className}`}>
	{#if showFilter || showColumnControls}
		<div class="grid min-w-0 gap-2 border-b border-border bg-surface p-2">
			{#if showFilter}
				<Input bind:value={query} placeholder={filterPlaceholder} class="min-w-0" />
			{/if}

			{#if showColumnControls}
				<div class="grid min-w-0 gap-1">
					<div class="flex min-w-0 flex-wrap gap-1">
						{#each relevantColumns as column (column.value)}
							<Checkbox
								label={column.label}
								checked={isColumnVisible(column.value)}
								disabled={isColumnDisabled(column)}
								onchange={() => toggleColumn(column)}
							/>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="min-w-0 max-w-full overflow-x-scroll overscroll-x-contain [scrollbar-gutter:stable]">
		<table
			class="table-fixed border-collapse text-sm"
			style:width={tableWidth}
		>
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
								class={`
										inline-block w-3 text-right text-primary
										${selectedSort === column.value ? 'opacity-100' : 'opacity-0'}
									`}
							>
									{getSortIcon(column)}
								</span>
						</button>
					</th>
				{/each}
			</tr>
			</thead>

			<tbody class="divide-y divide-border">
			{#if sortedRows.length > 0}
				{#each sortedRows as row, displayIndex (row.key)}
					<tr class="transition hover:bg-surface-soft">
						{#each visibleColumns as column (column.value)}
							{#if column.value === 'title'}
								<td class="max-w-96 px-3 py-2">
									{#if getUrl(row.item)}
										<a
											href={getUrl(row.item)}
											target="_blank"
											rel="noreferrer"
											class="flex min-w-0 items-center gap-3 text-text transition hover:text-primary"
										>
											{#if getImageUrl(row.item)}
												<img
													src={getImageUrl(row.item)}
													alt={getTitle(row.item)}
													class="size-9 shrink-0 rounded-md object-cover"
												/>
											{:else}
												<div class="size-9 shrink-0 rounded-md bg-surface-soft"></div>
											{/if}

											<div class="min-w-0">
													<span class="block truncate font-medium">
														{getTitle(row.item)}
													</span>

												{#if getSubtitle(row.item) || getUserStatusName(row.item)}
														<span class="flex min-w-0 items-center gap-1 text-xs text-text-muted">
															{#if getUserStatusName(row.item)}
																<StatusBadge
																	class="mt-0.5"
																	status={getUserStatusName(row.item)}
																/>
															{/if}

															{#if getSubtitle(row.item)}
																<span class="truncate">{getSubtitle(row.item)}</span>
															{/if}
														</span>
												{/if}
											</div>
										</a>
									{:else}
										<div class="flex min-w-0 items-center gap-3">
											{#if getImageUrl(row.item)}
												<img
													src={getImageUrl(row.item)}
													alt={getTitle(row.item)}
													class="size-9 shrink-0 rounded-md object-cover"
												/>
											{:else}
												<div class="size-9 shrink-0 rounded-md bg-surface-soft"></div>
											{/if}

											<div class="min-w-0">
													<span class="block truncate font-medium text-text">
														{getTitle(row.item)}
													</span>

												{#if getSubtitle(row.item) || getUserStatusName(row.item)}
														<span class="flex min-w-0 items-center gap-1 text-xs text-text-muted">
															{#if getUserStatusName(row.item)}
																<StatusBadge
																	class="mt-0.5"
																	status={getUserStatusName(row.item)}
																/>
															{/if}

															{#if getSubtitle(row.item)}
																<span class="truncate">{getSubtitle(row.item)}</span>
															{/if}
														</span>
												{/if}
											</div>
										</div>
									{/if}
								</td>
							{:else if column.value === 'relation'}
								<td class="px-3 py-2 text-text-soft">
									<div class="max-w-44">
										<p class="truncate">
											{getCellText(row.item, column.value, displayIndex) ?? '-'}
										</p>

										{#if getRelationSourceText(row.item)}
											<p class="truncate text-xs text-text-muted">
												{getRelationSourceText(row.item)}
											</p>
										{/if}
									</div>
								</td>
							{:else}
								<td
									class={`px-3 py-2 whitespace-nowrap text-text-soft ${alignClass(column.align)} ${
											column.value === 'rank' ? 'font-mono text-xs text-text-muted' : ''
										} ${
											column.value === 'score' || column.value === 'mal_score'
												? 'font-medium text-primary'
												: ''
										}`}
								>
									{getCellText(row.item, column.value, displayIndex) ?? '-'}
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