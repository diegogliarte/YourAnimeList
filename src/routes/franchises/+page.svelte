<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Table, { type TableColumn } from '$lib/components/ui/Table.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { AnimeDetails, AnimeListStatusName, UserAnimeListEdge } from '$lib/types/anime';
	import {
		formatProgress,
		formatSeason,
		getAnimeUrl,
		getRankingFilterText
	} from '$lib/utils/anime.utils';
	import {
		formatDecimal,
		formatDuration,
		formatLabel,
		formatNumber
	} from '$lib/utils/format.utils';

	type Stat = {
		label: string;
		value: string | number;
		hint?: string;
	};

	let showSearch = $state(false);
	let showMalScore = $state(true);
	let autoAccept = $state(false);

	const autoAcceptingAnimeIds = new Set<number>();

	$effect(() => {
		if (!autoAccept) return;

		for (const candidate of animeData.franchisePendingList) {
			if (autoAcceptingAnimeIds.has(candidate.animeId)) continue;

			autoAcceptingAnimeIds.add(candidate.animeId);

			void animeData
				.acceptFranchiseCandidate(candidate.animeId)
				.finally(() => {
					autoAcceptingAnimeIds.delete(candidate.animeId);
				});
		}
	});

	const columns: TableColumn<AnimeDetails>[] = $derived.by(() => {
		const baseColumns: TableColumn<AnimeDetails>[] = [
			{
				label: '#',
				value: 'index',
				width: '3rem'
			},
			{
				label: 'Anime',
				value: 'title',
				width: '26rem',
				compare: (a, b) => a.title.localeCompare(b.title)
			},
			{
				label: 'Score',
				value: 'score',
				align: 'center',
				width: '4.5rem',
				compare: (a, b) => getUserScore(a.id) - getUserScore(b.id)
			},
			{
				label: 'Progress',
				value: 'progress',
				align: 'center',
				width: '5.5rem'
			},
			{
				label: 'Episodes',
				value: 'episodes',
				align: 'center',
				width: '5rem',
				compare: (a, b) => (a.num_episodes ?? 0) - (b.num_episodes ?? 0)
			}
		];

		if (showMalScore) {
			baseColumns.push({
				label: 'MAL',
				value: 'mal',
				align: 'center',
				width: '4.5rem',
				compare: (a, b) => (a.mean ?? 0) - (b.mean ?? 0)
			});
		}

		return baseColumns;
	});

	const userEntryByAnimeId = $derived.by(() => {
		const entries = new Map<number, UserAnimeListEdge>();

		for (const entry of animeData.userList) {
			entries.set(entry.node.id, entry);
		}

		return entries;
	});

	const shouldShowSearch = $derived(!animeData.hasFranchise || showSearch);

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
	}

	function getUserEntry(animeId: number) {
		return userEntryByAnimeId.get(animeId);
	}

	function getUserStatus(animeId: number): AnimeListStatusName | null {
		return getUserEntry(animeId)?.list_status?.status ?? null;
	}

	function getUserStatusLabel(animeId: number) {
		const status = getUserStatus(animeId);

		return status ? formatLabel(status) : 'Not in list';
	}

	function getUserScore(animeId: number) {
		return getUserEntry(animeId)?.list_status?.sort_score ?? 0;
	}

	function getDisplayScore(animeId: number) {
		return getUserEntry(animeId)?.list_status?.display_score ?? '-';
	}

	function getDisplayProgress(animeId: number) {
		const userEntry = getUserEntry(animeId);

		if (!userEntry) return '-';

		return formatProgress(userEntry);
	}

	function getRelationLabel(animeId: number) {
		if (animeData.franchiseSeedId === animeId) return 'Seed';

		const relations = animeData.franchiseRelations.filter((relation) => relation.toId === animeId);

		if (relations.length === 0) return '-';

		return relations
			.slice(0, 2)
			.map((relation) => relation.relationLabel)
			.join(', ');
	}

	function getRelationSource(animeId: number) {
		const relation = animeData.franchiseRelations.find((relation) => relation.toId === animeId);

		if (!relation) return '';

		const source = animeData.franchiseAnimeById[relation.fromId];

		return source ? `from ${source.title}` : '';
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
		const episodes = anime.num_episodes ?? 0;
		const duration = anime.average_episode_duration ?? 0;

		if (episodes <= 0 || duration <= 0) return '';

		return `${formatDuration(episodes * duration)} total`;
	}

	function getFilterText(anime: AnimeDetails) {
		return [
			getRankingFilterText({ node: anime }),
			getRelationLabel(anime.id),
			getRelationSource(anime.id),
			getUserStatusLabel(anime.id),
			getSubtitle(anime)
		]
			.filter(Boolean)
			.join(' ');
	}

	function getImageUrl(anime: AnimeDetails) {
		return anime.main_picture?.medium ?? anime.main_picture?.large;
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
					<TextInput
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

			<div class="ml-auto flex items-center gap-3">
				<Toggle bind:checked={autoAccept} label="Auto accept" />
				<Toggle bind:checked={showMalScore} label="MAL score" />
			</div>		</div>
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
		<Panel title="Pending relations">
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
		<Table
			items={animeData.franchiseAnimeList}
			{columns}
			filterText={getFilterText}
			filterPlaceholder="Filter franchise..."
		>
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
								<div class="flex min-w-0 items-center gap-2">
									<a
										href={getAnimeUrl(anime.id)}
										target="_blank"
										rel="noreferrer"
										class="block max-w-72 truncate font-medium text-text hover:text-primary"
									>
										{anime.title}
									</a>
								</div>

								<span class="block text-xs text-text-muted">
									<StatusBadge class="mr-1" status={getUserStatus(anime.id)} />
									{getSubtitle(anime)}
								</span>
							</div>
						</div>
					</td>

					<td class="px-3 py-2 text-center font-medium text-primary">
						{getDisplayScore(anime.id)}
					</td>

					<td class="px-3 py-2 text-center text-text-soft">
						{getDisplayProgress(anime.id)}
					</td>

					<td class="px-3 py-2 text-center text-text-soft">
						{anime.num_episodes || '?'}
					</td>

					{#if showMalScore}
						<td class="px-3 py-2 text-center text-text-soft">
							{anime.mean ? formatDecimal(anime.mean, 2) : '-'}
						</td>
					{/if}
				</tr>
			{/snippet}
		</Table>
	{:else if !animeData.franchiseSearchResults.length}
		<Panel>
			<p class="text-sm text-text-muted">
				Search for an anime, then select one result to crawl its franchise.
			</p>
		</Panel>
	{/if}
</div>