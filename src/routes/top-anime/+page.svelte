<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import Table, { type TableColumn } from '$lib/components/ui/Table.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { AnimeListStatusName, AnimeRankingEdge, AnimeRankingType } from '$lib/types/anime';
	import {
		formatSeason,
		getAnimeUrl,
		getRankingFilterText,
		getSeasonValue
	} from '$lib/utils/anime.utils';
	import { formatDecimal, formatLabel, formatNumber } from '$lib/utils/format.utils';
	import { SvelteMap } from 'svelte/reactivity';

	type RankingTypeOption = {
		label: string;
		value: AnimeRankingType;
	};

	const rankingTypes: RankingTypeOption[] = [
		{ label: 'Top', value: 'all' },
		{ label: 'Airing', value: 'airing' },
		{ label: 'Upcoming', value: 'upcoming' },
		{ label: 'TV', value: 'tv' },
		{ label: 'Movies', value: 'movie' },
		{ label: 'OVA', value: 'ova' },
		{ label: 'Specials', value: 'special' },
		{ label: 'Popular', value: 'bypopularity' },
		{ label: 'Favorites', value: 'favorite' }
	];

	const excludeStatusOptions: { label: string; value: AnimeListStatusName }[] = [
		{ label: 'Watching', value: 'watching' },
		{ label: 'Completed', value: 'completed' },
		{ label: 'On Hold', value: 'on_hold' },
		{ label: 'Dropped', value: 'dropped' },
		{ label: 'Plan to Watch', value: 'plan_to_watch' }
	];

	let showMalScore = $state(true);
	let excludedStatuses = $state<AnimeListStatusName[]>([]);

	const userStatusByAnimeId = $derived.by(() => {
		const statuses = new SvelteMap<number, AnimeListStatusName>();

		for (const entry of animeData.userList) {
			if (entry.list_status?.status) {
				statuses.set(entry.node.id, entry.list_status.status);
			}
		}

		return statuses;
	});

	const filteredRanking = $derived.by(() => {
		if (excludedStatuses.length === 0 || !animeData.hasUserList) {
			return animeData.rankingData;
		}

		return animeData.rankingData.filter((entry) => {
			const userStatus = userStatusByAnimeId.get(entry.node.id);

			if (!userStatus) return true;

			return !excludedStatuses.includes(userStatus);
		});
	});

	const columns: TableColumn<AnimeRankingEdge>[] = $derived.by(() => {
		const baseColumns: TableColumn<AnimeRankingEdge>[] = [
			{
				label: '#',
				value: 'rank',
				align: 'left',
				width: '3rem',
				compare: (a, b) => getRank(a) - getRank(b)
			},
			{
				label: 'Anime',
				value: 'title',
				width: '20rem',
				compare: (a, b) => a.node.title.localeCompare(b.node.title)
			}
		];

		if (showMalScore) {
			baseColumns.push({
				label: 'MAL',
				value: 'mal_score',
				align: 'center',
				width: '4.5rem',
				compare: (a, b) => (a.node.mean ?? 0) - (b.node.mean ?? 0)
			});
		}

		baseColumns.push(
			{
				label: 'Popularity',
				value: 'popularity',
				align: 'center',
				width: '6rem',
				compare: (a, b) => (a.node.popularity ?? 999999) - (b.node.popularity ?? 999999)
			},
			{
				label: 'Episodes',
				value: 'episodes',
				align: 'center',
				width: '5.5rem',
				compare: (a, b) => (a.node.num_episodes ?? 0) - (b.node.num_episodes ?? 0)
			},
			{
				label: 'Season',
				value: 'season',
				align: 'center',
				width: '6rem',
				compare: (a, b) => getSeasonValue(a) - getSeasonValue(b)
			}
		);

		return baseColumns;
	});

	$effect(() => {
		void animeData.loadAnimeRanking(animeData.rankingType);
	});

	function handleWindowScroll() {
		const distanceToBottom =
			document.documentElement.scrollHeight - window.scrollY - window.innerHeight;

		if (distanceToBottom < 700) {
			void animeData.loadMoreAnimeRanking();
		}
	}

	function setRankingType(type: AnimeRankingType) {
		animeData.rankingType = type;
	}

	function toggleExcludedStatus(status: AnimeListStatusName) {
		if (excludedStatuses.includes(status)) {
			excludedStatuses = excludedStatuses.filter((currentStatus) => currentStatus !== status);
			return;
		}

		excludedStatuses = [...excludedStatuses, status];
	}

	function clearExcludedStatuses() {
		excludedStatuses = [];
	}

	function getRank(entry: AnimeRankingEdge) {
		return entry.ranking?.rank ?? 999999;
	}

	function getUserStatus(entry: AnimeRankingEdge) {
		return userStatusByAnimeId.get(entry.node.id);
	}

	function getUserStatusLabel(entry: AnimeRankingEdge) {
		const status = getUserStatus(entry);

		return status ? formatLabel(status) : '-';
	}

	function getAnimeSubtitle(entry: AnimeRankingEdge) {
		const parts: string[] = [
			entry.node.media_type || 'unknown',
			entry.node.status || 'unknown'
		];

		if (animeData.hasUserList) {
			const userStatus = getUserStatusLabel(entry);

			if (userStatus !== '-') {
				parts.push(userStatus);
			}
		}

		return parts.join(' · ');
	}

	function getFilterText(entry: AnimeRankingEdge) {
		return getRankingFilterText(entry, getUserStatusLabel(entry));
	}
</script>

<svelte:window onscroll={handleWindowScroll} />

<div class="grid gap-4">
	<Panel title="Top Anime">
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap gap-2">
				{#each rankingTypes as option (option.value)}
					<button
						type="button"
						class={`
							cursor-pointer rounded-md border px-2 py-1 text-xs transition
							${
								animeData.rankingType === option.value
									? 'border-primary bg-primary text-background'
									: 'border-border bg-surface-soft text-text-soft hover:text-text'
							}
						`}
						onclick={() => setRankingType(option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>

			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-xs text-text-muted">Exclude:</span>

					{#each excludeStatusOptions as option (option.value)}
						<button
							type="button"
							disabled={!animeData.hasUserList}
							class={`
								cursor-pointer rounded-md border px-2 py-1 text-xs transition
								disabled:cursor-not-allowed disabled:opacity-40
								${
									excludedStatuses.includes(option.value)
										? 'border-primary bg-primary text-background'
										: 'border-border bg-surface-soft text-text-soft hover:text-text'
								}
							`}
							onclick={() => toggleExcludedStatus(option.value)}
						>
							{option.label}
						</button>
					{/each}

					{#if excludedStatuses.length > 0}
						<button
							type="button"
							class="cursor-pointer rounded-md border border-border bg-surface-soft px-2 py-1 text-xs text-text-muted transition hover:text-text"
							onclick={clearExcludedStatuses}
						>
							Clear
						</button>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<Button
						onclick={() => animeData.refreshAnimeRanking()}
						disabled={animeData.rankingLoading}
					>
						Refresh
					</Button>

					<Button onclick={() => (showMalScore = !showMalScore)}>
						{showMalScore ? 'Hide MAL score' : 'Show MAL score'}
					</Button>
				</div>
			</div>

			{#if !animeData.hasUserList}
				<p class="text-xs text-text-muted">
					Load your MAL user in the navbar to exclude anime from your own list.
				</p>
			{/if}
		</div>
	</Panel>

	{#if animeData.rankingLoading}
		<Panel>Loading ranking...</Panel>
	{:else if animeData.rankingError}
		<Panel>
			<p class="text-sm text-primary">{animeData.rankingError}</p>
		</Panel>
	{:else}
		<Table
			items={filteredRanking}
			{columns}
			filterText={getFilterText}
			filterPlaceholder="Filter ranking..."
		>
			{#snippet children(entry, index)}
				<tr class="transition hover:bg-surface-soft">
					<td class="w-12 px-3 py-2 text-left font-mono text-xs text-text-muted">
						{entry.ranking?.rank ?? index + 1}
					</td>

					<td class="w-80 max-w-80 px-3 py-2">
						<div class="flex min-w-0 items-center gap-3">
							{#if entry.node.main_picture?.medium}
								<img
									src={entry.node.main_picture.medium}
									alt={entry.node.title}
									class="size-9 shrink-0 rounded-md object-cover"
								/>
							{:else}
								<div class="size-9 shrink-0 rounded-md bg-surface-soft"></div>
							{/if}

							<div class="min-w-0">
								<a
									href={getAnimeUrl(entry.node.id)}
									target="_blank"
									rel="noreferrer"
									class="block max-w-80 truncate font-medium text-text hover:text-primary"
								>
									{entry.node.title}
								</a>

								<span class="text-xs text-text-muted">
									{getAnimeSubtitle(entry)}
								</span>
							</div>
						</div>
					</td>

					{#if showMalScore}
						<td class="px-3 py-2 text-center font-medium text-primary">
							{entry.node.mean ? formatDecimal(entry.node.mean, 2) : '-'}
						</td>
					{/if}

					<td class="px-3 py-2 text-center text-text-soft">
						{entry.node.popularity ? `#${formatNumber(entry.node.popularity)}` : '-'}
					</td>

					<td class="px-3 py-2 text-center text-text-soft">
						{entry.node.num_episodes || '?'}
					</td>

					<td class="px-3 py-2 text-center whitespace-nowrap text-text-soft">
						{formatSeason(entry)}
					</td>
				</tr>
			{/snippet}
		</Table>

		{#if animeData.rankingLoadingMore}
			<Panel>
				<p class="text-sm text-text-muted">Loading more...</p>
			</Panel>
		{:else if animeData.rankingNextOffset === null && animeData.rankingData.length > 0}
			<p class="py-3 text-center text-xs text-text-muted">End of ranking.</p>
		{/if}
	{/if}
</div>
