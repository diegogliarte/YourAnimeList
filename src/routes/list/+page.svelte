<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import Table, { type TableColumn } from '$lib/components/ui/Table.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { UserAnimeListEdge } from '$lib/types/anime';
	import {
		STATUS_FILTERS,
		type StatusFilter,
		formatProgress,
		formatSeason,
		getAnimeFilterText,
		getAnimeUrl,
		getProgressValue,
		getSeasonValue
	} from '$lib/utils/anime.utils';

	let statusFilter = $state<StatusFilter>('completed');
	let showMalScore = $state(true);

	const filteredList = $derived.by(() => {
		if (statusFilter === 'all') return animeData.userList;

		return animeData.userList.filter((entry) => entry.list_status?.status === statusFilter);
	});

	const columns: TableColumn<UserAnimeListEdge>[] = $derived.by(() => {
		const baseColumns: TableColumn<UserAnimeListEdge>[] = [
			{
				label: '#',
				value: 'index',
				align: 'left',
				width: '3rem'
			},
			{
				label: 'Anime',
				value: 'title',
				width: '20rem',
				compare: (a, b) => a.node.title.localeCompare(b.node.title)
			},
			{
				label: 'Score',
				value: 'score',
				align: 'center',
				width: '4.5rem',
				compare: (a, b) => (a.list_status?.sort_score ?? 0) - (b.list_status?.sort_score ?? 0)
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
				label: 'Progress',
				value: 'progress',
				align: 'center',
				width: '5.5rem',
				compare: (a, b) => {
					const progressDiff = getProgressValue(a) - getProgressValue(b);

					if (progressDiff !== 0) return progressDiff;

					return (a.node.num_episodes ?? 0) - (b.node.num_episodes ?? 0);
				}
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
</script>

<div class="grid gap-4">
	<Panel title="Anime List">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap gap-2">
				{#each STATUS_FILTERS as filter (filter)}
					<button
						type="button"
						class={`
							cursor-pointer rounded-md border px-2 py-1 text-xs transition
							${
								statusFilter === filter.value
									? 'border-primary bg-primary text-background'
									: 'border-border bg-surface-soft text-text-soft hover:text-text'
							}
						`}
						onclick={() => (statusFilter = filter.value)}
					>
						{filter.label}
					</button>
				{/each}
			</div>

			<Button onclick={() => (showMalScore = !showMalScore)}>
				{showMalScore ? 'Hide MAL score' : 'Show MAL score'}
			</Button>
		</div>
	</Panel>

	{#if animeData.userListLoading}
		<Panel>Loading anime list...</Panel>
	{:else if animeData.userListError}
		<Panel>
			<p class="text-sm text-primary">{animeData.userListError}</p>
		</Panel>
	{:else if !animeData.hasUserList}
		<Panel>
			<p class="text-sm text-text-muted">Load a MAL username from the navbar first.</p>
		</Panel>
	{:else}
		<Table
			items={filteredList}
			{columns}
			filterText={getAnimeFilterText}
			filterPlaceholder="Filter anime..."
		>
			{#snippet children(entry, index)}
				<tr class="transition hover:bg-surface-soft">
					<td class="w-12 px-3 py-2 text-left font-mono text-xs text-text-muted">
						{index + 1}
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
									{entry.node.media_type ?? 'unknown'} · {entry.list_status?.status}
								</span>
							</div>
						</div>
					</td>

					<td class="px-3 py-2 text-center font-medium text-primary">
						{entry.list_status?.display_score ?? '-'}
					</td>

					{#if showMalScore}
						<td class="px-3 py-2 text-center text-text-soft">
							{entry.node.mean ?? '-'}
						</td>
					{/if}

					<td class="px-3 py-2 text-center text-text-soft">
						{formatProgress(entry)}
					</td>

					<td class="px-3 py-2 text-center text-text-soft">
						{entry.node.num_episodes || '?'}
					</td>

					<td class="whitespace-nowrap px-3 py-2 text-center text-text-soft">
						{formatSeason(entry)}
					</td>
				</tr>
			{/snippet}
		</Table>
	{/if}
</div>