<script lang="ts">
	import AnimeTable from '$lib/components/ui/AnimeTable.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import { STATUS_FILTERS, type StatusFilter } from '$lib/utils/anime.utils';

	let statusFilter = $state<StatusFilter>('completed');

	const filteredList = $derived.by(() => {
		if (statusFilter === 'all') return animeData.userList;

		return animeData.userList.filter((entry) => entry.list_status?.status === statusFilter);
	});
</script>

<div class="grid gap-4">
	<Panel title="Anime List">
		<div class="flex flex-wrap gap-2">
			{#each STATUS_FILTERS as filter (filter.value)}
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
		<AnimeTable items={filteredList} filterPlaceholder="Filter anime..." />
	{/if}
</div>
