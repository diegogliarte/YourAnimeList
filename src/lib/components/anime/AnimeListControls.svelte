<script lang="ts">
	import ControlRow from '$lib/components/ui/ControlRow.svelte';
	import PillButton from '$lib/components/ui/PillButton.svelte';
	import SearchSummaryBar from '$lib/components/ui/SearchSummaryBar.svelte';

	import { SORT_OPTIONS, STATUS_FILTERS } from '$lib/constants/anime';

	import type { AnimeSortMetric, SortDirection } from '$lib/types/anime';
	import type { AnimeStatusSelection } from '$lib/constants/anime';

	type Props = {
		username: string;
		visibleCount: number;
		totalCount: number;
		search: string;
		selectedStatus: AnimeStatusSelection;
		sortMetric: AnimeSortMetric;
		sortDirection: SortDirection;
		onSearchChange: (value: string) => void;
		onStatusChange: (status: AnimeStatusSelection) => void;
		onSortChange: (sort: AnimeSortMetric) => void;
		onDirectionToggle: () => void;
	};

	let {
		username,
		visibleCount,
		totalCount,
		search,
		selectedStatus,
		sortMetric,
		sortDirection,
		onSearchChange,
		onStatusChange,
		onSortChange,
		onDirectionToggle
	}: Props = $props();
</script>

<div class="border-b border-white/10 bg-background px-3 py-2">
	<div class="flex flex-col gap-2">
		<SearchSummaryBar
			{username}
			{visibleCount}
			{totalCount}
			{search}
			onSearchChange={onSearchChange}
		/>

		<ControlRow label="filter">
			{#each STATUS_FILTERS as option (option.value)}
				<PillButton
					active={selectedStatus === option.value}
					onclick={() => onStatusChange(option.value)}
				>
					{option.label}
				</PillButton>
			{/each}
		</ControlRow>

		<ControlRow label="sort">
			{#each SORT_OPTIONS as option (option.value)}
				<PillButton
					active={sortMetric === option.value}
					onclick={() => onSortChange(option.value)}
				>
					{option.label}
				</PillButton>
			{/each}

			<button
				type="button"
				class="h-7 cursor-pointer rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent transition hover:bg-accent/20"
				onclick={onDirectionToggle}
			>
				{sortDirection}
			</button>
		</ControlRow>
	</div>
</div>