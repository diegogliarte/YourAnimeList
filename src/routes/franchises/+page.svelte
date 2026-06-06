<script lang="ts">
	import AnimeTable from '$lib/components/ui/AnimeTable.svelte';
	import FranchiseGraph from '$lib/components/franchise/FranchiseGraph.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { AnimeDetails, AnimeListStatusName, UserAnimeListEdge } from '$lib/types/anime';
	import {
		compareAnimeRelease,
		formatSeason,
		getAnimeUrl,
	} from '$lib/utils/anime.utils';
	import {
		formatDecimal,
		formatDuration,
		formatNumber
	} from '$lib/utils/format.utils';

	type Stat = {
		label: string;
		value: string | number;
		hint?: string;
	};

	let showSearch = $state(false);
	let autoAccept = $state(false);
	let franchiseView = $state<'list' | 'graph'>('list');
	let pendingCollapsed = $state(false);

	const autoAcceptingAnimeIds = new Set<number>();

	$effect(() => {
		if (!autoAccept) return;

		for (const candidate of animeData.franchisePendingList) {
			if (autoAcceptingAnimeIds.has(candidate.animeId)) continue;

			autoAcceptingAnimeIds.add(candidate.animeId);

			void animeData.acceptFranchiseCandidate(candidate.animeId).finally(() => {
				autoAcceptingAnimeIds.delete(candidate.animeId);
			});
		}
	});

	const userEntryByAnimeId = $derived.by(() => {
		const entries = new Map<number, UserAnimeListEdge>();

		for (const entry of animeData.userList) {
			entries.set(entry.node.id, entry);
		}

		return entries;
	});

	const shouldShowSearch = $derived(!animeData.hasFranchise || showSearch);

	const franchisePendingIds = $derived.by(() => {
		return animeData.franchisePendingCandidates.map((candidate) => candidate.animeId);
	});

	const franchiseGraphAnimeList = $derived.by(() => {
		const ids = new Set<number>([...animeData.franchiseAcceptedIds, ...franchisePendingIds]);

		return [...ids]
			.map((id) => animeData.franchiseAnimeById[id])
			.filter((anime): anime is AnimeDetails => Boolean(anime))
			.sort((a, b) => compareAnimeRelease({ node: a }, { node: b }));
	});

	const franchiseStats = $derived.by<Stat[]>(() => {
		const entries = animeData.franchiseAnimeList;

		const completedCount = entries.filter(
			(anime) => getUserStatus(anime.id) === 'completed'
		).length;

		const knownEpisodeEntries = entries.filter((anime) => (anime.num_episodes ?? 0) > 0);
		const totalEpisodes = knownEpisodeEntries.reduce(
			(total, anime) => total + (anime.num_episodes ?? 0),
			0
		);

		const watchedEpisodes = entries.reduce((total, anime) => {
			return total + (getUserEntry(anime.id)?.list_status?.num_episodes_watched ?? 0);
		}, 0);

		const entriesWithDuration = entries.filter((anime) => {
			return (anime.average_episode_duration ?? 0) > 0 && (anime.num_episodes ?? 0) > 0;
		});

		const totalSeconds = entriesWithDuration.reduce((total, anime) => {
			return total + (anime.num_episodes ?? 0) * (anime.average_episode_duration ?? 0);
		}, 0);

		const watchedSeconds = entriesWithDuration.reduce((total, anime) => {
			const watched = getUserEntry(anime.id)?.list_status?.num_episodes_watched ?? 0;
			const duration = anime.average_episode_duration ?? 0;

			return total + watched * duration;
		}, 0);

		const averageEpisodeDuration =
			totalEpisodes > 0 && totalSeconds > 0 ? totalSeconds / totalEpisodes : 0;

		const averageEpisodesPerAnime =
			knownEpisodeEntries.length > 0 ? totalEpisodes / knownEpisodeEntries.length : 0;

		return [
			{
				label: 'Completed',
				value: `${formatNumber(completedCount)}/${formatNumber(entries.length)}`,
				hint: 'accepted franchise entries'
			},
			{
				label: 'Episodes',
				value: `${formatNumber(watchedEpisodes)}/${formatNumber(totalEpisodes)}`,
				hint: `${formatNumber(knownEpisodeEntries.length)} entries with episode count`
			},
			{
				label: 'Time',
				value: `${formatDuration(watchedSeconds)}/${formatDuration(totalSeconds)}`,
				hint: `${formatNumber(entriesWithDuration.length)} entries with duration`
			},
			{
				label: 'Avg ep duration',
				value: formatDuration(averageEpisodeDuration),
				hint: 'weighted by episode count'
			},
			{
				label: 'Avg eps/anime',
				value: formatDecimal(averageEpisodesPerAnime, 1),
				hint: 'known episode counts'
			}
		];
	});

	function submitSearch() {
		void animeData.searchFranchiseAnime();
	}

	async function selectSearchResult(animeId: number) {
		if (animeData.hasFranchise) {
			await animeData.addAnimeToFranchise(animeId);
		} else {
			await animeData.startFranchise(animeId);
		}

		showSearch = false;
	}

	function startNewSearch() {
		animeData.clearFranchise();
		showSearch = true;
		franchiseView = 'list';
	}

	function getUserEntry(animeId: number) {
		return userEntryByAnimeId.get(animeId);
	}

	function getUserStatus(animeId: number): AnimeListStatusName | null {
		return getUserEntry(animeId)?.list_status?.status ?? null;
	}

	function getSubtitle(anime: AnimeDetails) {
		return [
			anime.media_type ?? 'unknown',
			formatSeason({ node: anime }),
			getEpisodeText(anime),
			getAverageEpisodeDurationText(anime),
			getTotalDurationText(anime)
		]
			.filter(Boolean)
			.join(' · ');
	}

	function getEpisodeText(anime: AnimeDetails) {
		return anime.num_episodes > 0 ? `${formatNumber(anime.num_episodes)} eps` : '';
	}

	function getAverageEpisodeDurationText(anime: AnimeDetails) {
		const duration = anime.average_episode_duration ?? 0;

		if (duration <= 0) return '';

		return `${formatDuration(duration)}/ep`;
	}

	function getTotalDurationText(anime: AnimeDetails) {
		const totalSeconds = getTotalSeconds(anime);

		return totalSeconds > 0 ? `${formatDuration(totalSeconds)} total` : '';
	}

	function getTotalSeconds(anime: AnimeDetails) {
		const episodes = anime.num_episodes ?? 0;
		const duration = anime.average_episode_duration ?? 0;

		if (episodes <= 0 || duration <= 0) return 0;

		return episodes * duration;
	}
</script>

<div class="grid gap-4">
	<Panel title="Franchises">
		<div class="flex flex-wrap items-center justify-between gap-2">
			{#if shouldShowSearch}
				<form
					class="flex min-w-0 flex-wrap items-center gap-2"
					onsubmit={(event) => {
						event.preventDefault();
						submitSearch();
					}}
				>
					<Input
						bind:value={animeData.franchiseQuery}
						placeholder="Search anime..."
						class="w-60"
						disabled={animeData.franchiseSearchLoading || animeData.franchiseCrawling}
					/>

					<Button
						type="submit"
						variant="primary"
						disabled={animeData.franchiseSearchLoading || animeData.franchiseCrawling}
					>
						{animeData.franchiseSearchLoading ? 'Searching...' : 'Search'}
					</Button>

					{#if animeData.hasFranchise}
						<Button type="button" onclick={() => (showSearch = false)}>Cancel</Button>
					{/if}
				</form>
			{:else}
				<div class="flex min-w-0 flex-wrap items-center gap-2">
					<Button type="button" variant="primary" onclick={() => (showSearch = true)}>
						Add anime
					</Button>

					<Button type="button" onclick={startNewSearch}>New franchise</Button>

					{#if animeData.franchiseCrawling}
						<Button type="button" onclick={() => animeData.stopFranchiseCrawl()}>Stop crawl</Button>
					{/if}
				</div>
			{/if}

			<div class="ml-auto flex flex-wrap items-center justify-end gap-2">
				{#if animeData.hasFranchise}
					<div class="flex items-center gap-1">
						<Button
							type="button"
							variant={franchiseView === 'list' ? 'primary' : 'default'}
							onclick={() => (franchiseView = 'list')}
						>
							List
						</Button>

						<Button
							type="button"
							variant={franchiseView === 'graph' ? 'primary' : 'default'}
							onclick={() => (franchiseView = 'graph')}
						>
							Graph
						</Button>
					</div>
				{/if}

				<Toggle bind:checked={autoAccept} label="Auto accept" />
			</div>
		</div>
	</Panel>

	{#if shouldShowSearch && animeData.franchiseSearchResults.length > 0}
		<Panel title={animeData.hasFranchise ? 'Add to franchise' : 'Search results'}>
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each animeData.franchiseSearchResults as result (result.node.id)}
					<button
						type="button"
						class="flex cursor-pointer gap-3 rounded-md border border-border bg-surface p-2 text-left transition hover:border-primary hover:bg-surface-soft"
						disabled={animeData.franchiseCrawling}
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

	{#if animeData.hasFranchise}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
			{#each franchiseStats as stat (stat.label)}
				<StatCard label={stat.label} value={stat.value} hint={stat.hint} />
			{/each}
		</div>
	{/if}

	{#if animeData.franchisePendingList.length > 0}
		<Panel
			title={`Pending relations (${animeData.franchisePendingList.length})`}
			collapsible
			bind:collapsed={pendingCollapsed}
		>
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each animeData.franchisePendingList as candidate (candidate.animeId)}
					<div class="rounded-md border border-border bg-surface p-2">
						<div class="flex gap-3">
							{#if candidate.imageUrl}
								<img
									src={candidate.imageUrl}
									alt={candidate.title}
									class="size-12 shrink-0 rounded-md object-cover"
								/>
							{:else}
								<div class="size-12 shrink-0 rounded-md bg-surface-soft"></div>
							{/if}

							<div class="min-w-0 flex-1">
								<a
									href={getAnimeUrl(candidate.animeId)}
									target="_blank"
									rel="noreferrer"
									class="block truncate text-sm font-medium text-text hover:text-primary"
								>
									{candidate.title}
								</a>

								<p class="mt-1 text-xs text-text-muted">
									{candidate.relationLabel}
								</p>

								{#if animeData.franchiseAnimeById[candidate.fromId]}
									<p class="mt-1 truncate text-xs text-text-muted">
										from {animeData.franchiseAnimeById[candidate.fromId].title}
									</p>
								{/if}
							</div>
						</div>

						<div class="mt-2 flex gap-2">
							<Button
								type="button"
								variant="primary"
								onclick={() => animeData.acceptFranchiseCandidate(candidate.animeId)}
							>
								Accept
							</Button>

							<Button
								type="button"
								onclick={() => animeData.rejectFranchiseCandidate(candidate.animeId)}
							>
								Reject
							</Button>
						</div>
					</div>
				{/each}
			</div>
		</Panel>
	{/if}

	{#if animeData.hasFranchise}
		{#if franchiseView === 'graph'}
			<FranchiseGraph
				animes={franchiseGraphAnimeList}
				relations={animeData.franchiseRelations}
				seedId={animeData.franchiseSeedId}
				pendingIds={franchisePendingIds}
				getUserStatus={getUserStatus}
				getSubtitle={getSubtitle}
			/>
		{:else}
			<AnimeTable items={animeData.franchiseAnimeList} filterPlaceholder="Filter franchise..." />
		{/if}
	{:else if !animeData.franchiseSearchResults.length}
		<Panel>
			<p class="text-sm text-text-muted">
				Search for an anime, then select one result to crawl its franchise.
			</p>
		</Panel>
	{/if}
</div>