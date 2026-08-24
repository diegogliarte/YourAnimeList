<script lang="ts">
	import AnimeTable, {
		type AnimeTableAnime,
		type AnimeTableExtraColumn
	} from '$lib/components/ui/AnimeTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { MissingEntry } from '$lib/types/anime-db';

	type MissingEntriesGroup = {
		animeId: number;
		title: string;
		entries: MissingEntry[];
	};

	let expandedSourceIds = $state<number[]>([]);

	const groups = $derived.by(() => {
		const groupsBySourceId = new Map<number, MissingEntriesGroup>();

		for (const entry of animeData.missingEntries) {
			for (const source of entry.sources) {
				const group = groupsBySourceId.get(source.animeId) ?? {
					animeId: source.animeId,
					title: source.title,
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

	function getAnimeId(item: AnimeTableAnime) {
		return 'node' in item ? item.node.id : item.id;
	}

	function getEntry(group: MissingEntriesGroup, item: AnimeTableAnime) {
		return group.entries.find((entry) => entry.anime.id === getAnimeId(item));
	}

	function getRelationLabels(entry: MissingEntry | undefined, sourceAnimeId: number) {
		if (!entry) return null;

		return [
			...new Set(
				entry.sources
					.filter((source) => source.animeId === sourceAnimeId)
					.map((source) => source.relationLabel)
			)
		].join(', ');
	}

	function getExtraColumns(group: MissingEntriesGroup): AnimeTableExtraColumn[] {
		return [
			{
				label: 'Relation',
				value: 'direct_relation',
				width: '10rem',
				getCell: (item) => getRelationLabels(getEntry(group, item), group.animeId),
				getSort: (item) => getRelationLabels(getEntry(group, item), group.animeId)
			}
		];
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
						class="flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left transition hover:bg-surface-soft"
						onclick={() => toggleSource(group.animeId)}
						aria-expanded={expanded}
					>
						<span class="min-w-0 truncate text-sm font-semibold text-text">{group.title}</span>
						<span class="shrink-0 text-xs text-text-muted">
							{group.entries.length} missing · {expanded ? 'Hide' : 'Show'}
						</span>
					</button>

					{#if expanded}
						<div class="border-t border-border">
							<AnimeTable
								items={group.entries.map((entry) => entry.anime)}
								extraColumns={getExtraColumns(group)}
								filterPlaceholder={`Filter entries related to ${group.title}...`}
								defaultSort="direct_relation"
								defaultDirection="asc"
								class="rounded-none border-0"
							/>
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</div>
