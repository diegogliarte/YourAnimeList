<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { MissingEntry } from '$lib/types/anime-db';
	import { getAnimeUrl } from '$lib/utils/anime.utils';
	import { formatLabel } from '$lib/utils/format.utils';

	type MissingEntriesGroup = {
		animeId: number;
		title: string;
		imageUrl: string | null;
		entries: MissingEntry[];
	};

	let expandedSourceIds = $state<number[]>([]);

	const groups = $derived.by(() => {
		const groupsBySourceId = new Map<number, MissingEntriesGroup>();
		const completedEntriesById = new Map(
			animeData.userList
				.filter((entry) => entry.list_status.status === 'completed')
				.map((entry) => [entry.node.id, entry])
		);

		for (const entry of animeData.missingEntries) {
			for (const source of entry.sources) {
				const completedEntry = completedEntriesById.get(source.animeId);
				const group = groupsBySourceId.get(source.animeId) ?? {
					animeId: source.animeId,
					title: source.title,
					imageUrl:
						completedEntry?.node.main_picture?.medium ??
						completedEntry?.node.main_picture?.large ??
						null,
					entries: []
				};

				if (!group.entries.some((current) => current.anime.id === entry.anime.id)) {
					group.entries.push(entry);
				}

				groupsBySourceId.set(source.animeId, group);
			}
		}

		return [...groupsBySourceId.values()].sort((a, b) => a.title.localeCompare(b.title));
	});

	$effect(() => {
		const loadedUsername = animeData.loadedUsername;

		if (
			loadedUsername &&
			animeData.hasUserList &&
			animeData.missingEntriesUsername !== loadedUsername &&
			!animeData.missingEntriesLoading
		) {
			void animeData.loadMissingEntries();
		}
	});

	function toggleSource(animeId: number) {
		expandedSourceIds = expandedSourceIds.includes(animeId)
			? expandedSourceIds.filter((id) => id !== animeId)
			: [...expandedSourceIds, animeId];
	}

	function getRelationLabels(entry: MissingEntry, sourceAnimeId: number) {
		return [
			...new Set(
				entry.sources
					.filter((source) => source.animeId === sourceAnimeId)
					.map((source) => source.relationLabel)
			)
		].join(', ');
	}

	function getMissingImageUrl(entry: MissingEntry) {
		return entry.anime.mainPicture?.medium ?? entry.anime.mainPicture?.large ?? null;
	}

	function getMissingMeta(entry: MissingEntry) {
		const year = entry.anime.startSeason?.year ?? entry.anime.startDate?.slice(0, 4);

		return [
			entry.anime.mediaType ? formatLabel(entry.anime.mediaType) : null,
			year || null,
			entry.anime.numEpisodes ? `${entry.anime.numEpisodes} eps` : null
		]
			.filter(Boolean)
			.join(' · ');
	}
</script>

<div class="grid gap-4">
	<Panel title="Missing entries">
		<p class="text-sm text-text-muted">
			Anime absent from {animeData.loadedUsername || 'the loaded user'}'s list that are directly
			related to a completed entry. Select a completed show to see or hide its missing entries.
		</p>
	</Panel>

	{#if animeData.userListLoading || animeData.missingEntriesLoading}
		<Panel>Loading missing entries...</Panel>
	{:else if animeData.missingEntriesError}
		<Panel>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm text-primary">{animeData.missingEntriesError}</p>
				<Button onclick={() => animeData.loadMissingEntries()}>Retry</Button>
			</div>
		</Panel>
	{:else if !animeData.hasUserList}
		<Panel>
			<p class="text-sm text-text-muted">Load a MAL username from the navbar first.</p>
		</Panel>
	{:else if groups.length === 0}
		<Panel>
			<p class="text-sm text-text-muted">No directly related missing entries found.</p>
		</Panel>
	{:else}
		<div class="grid gap-2">
			{#each groups as group (group.animeId)}
				{@const expanded = expandedSourceIds.includes(group.animeId)}
				<section class="overflow-hidden rounded-md border border-border bg-surface">
					<button
						type="button"
						class="flex w-full cursor-pointer items-center gap-3 p-2 text-left transition hover:bg-surface-soft"
						onclick={() => toggleSource(group.animeId)}
						aria-expanded={expanded}
					>
						{#if group.imageUrl}
							<img
								src={group.imageUrl}
								alt={group.title}
								class="h-20 w-14 shrink-0 rounded object-cover"
							/>
						{:else}
							<span class="h-20 w-14 shrink-0 rounded bg-surface-soft"></span>
						{/if}

						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold text-text">{group.title}</span>
							<span class="mt-1 block text-xs text-text-muted">
								{group.entries.length} missing direct
								{group.entries.length === 1 ? 'entry' : 'entries'}
							</span>
						</span>

						<span class="shrink-0 text-xs font-medium text-primary">
							{expanded ? 'Hide' : 'Show'}
						</span>
					</button>

					{#if expanded}
						<div class="grid gap-2 border-t border-border bg-background/40 p-2 sm:grid-cols-2 lg:grid-cols-3">
							{#each group.entries as entry (entry.anime.id)}
								<div
									class="group flex min-w-0 gap-2 rounded-md border border-border bg-surface p-2 transition hover:border-primary/70 hover:bg-surface-soft"
								>
									{#if getMissingImageUrl(entry)}
										<a
											href={getAnimeUrl(entry.anime.id)}
											target="_blank"
											rel="noreferrer"
											class="h-18 w-12 shrink-0"
										>
											<img
												src={getMissingImageUrl(entry)}
												alt={entry.anime.title}
												class="h-full w-full rounded object-cover"
											/>
										</a>
									{:else}
										<span class="h-18 w-12 shrink-0 rounded bg-surface-soft"></span>
									{/if}

									<span class="min-w-0 flex-1">
										<a
											href={getAnimeUrl(entry.anime.id)}
											target="_blank"
											rel="noreferrer"
											class="line-clamp-2 text-sm font-medium text-text group-hover:text-primary"
										>
											{entry.anime.title}
										</a>
										<span class="mt-1 block text-xs text-text-muted">{getMissingMeta(entry)}</span>
										<span class="mt-1 block text-xs text-primary">
											{getRelationLabels(entry, group.animeId)}
										</span>
										<a
											href={`/franchises/${entry.anime.id}`}
											target="_blank"
											rel="noreferrer"
											class="mt-2 inline-flex rounded border border-border px-1.5 py-1 text-[10px] leading-none text-text-muted transition hover:border-primary hover:text-primary"
										>
											Franchise
										</a>
									</span>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</div>
