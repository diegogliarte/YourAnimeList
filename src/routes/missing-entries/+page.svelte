<script lang="ts">
	import AnimeTable, {
		type AnimeTableAnime,
		type AnimeTableExtraColumn
	} from '$lib/components/ui/AnimeTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { MissingEntry } from '$lib/types/anime-db';

	const entryByAnimeId = $derived(
		new Map(animeData.missingEntries.map((entry) => [entry.anime.id, entry]))
	);
	const items = $derived(animeData.missingEntries.map((entry) => entry.anime));

	const extraColumns: AnimeTableExtraColumn[] = [
		{
			label: 'Related from',
			value: 'related_from',
			width: '16rem',
			getCell: (item) => getEntry(item)?.sources.map((source) => source.title).join(', ') ?? null
		},
		{
			label: 'Relation',
			value: 'direct_relation',
			width: '10rem',
			getCell: (item) => getRelationLabels(getEntry(item)),
			getSort: (item) => getRelationLabels(getEntry(item))
		}
	];

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

	function getEntry(item: AnimeTableAnime) {
		return entryByAnimeId.get(getAnimeId(item));
	}

	function getAnimeId(item: AnimeTableAnime) {
		return 'node' in item ? item.node.id : item.id;
	}

	function getRelationLabels(entry?: MissingEntry) {
		if (!entry) return null;

		return [...new Set(entry.sources.map((source) => source.relationLabel))].join(', ');
	}
</script>

<div class="grid gap-4">
	<Panel title="Missing entries">
		<p class="text-sm text-text-muted">
			Anime absent from {animeData.loadedUsername || 'the loaded user'}'s list that are directly
			related to at least one entry on it.
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
	{:else if items.length === 0}
		<Panel>
			<p class="text-sm text-text-muted">No directly related missing entries found.</p>
		</Panel>
	{:else}
		<AnimeTable
			{items}
			{extraColumns}
			filterPlaceholder="Filter missing entries..."
			defaultSort="related_from"
			defaultDirection="asc"
		/>
	{/if}
</div>
