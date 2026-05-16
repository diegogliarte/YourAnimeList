<script lang="ts">
	import ControlRow from '$lib/components/ui/ControlRow.svelte';
	import PillButton from '$lib/components/ui/PillButton.svelte';
	import SearchSummaryBar from '$lib/components/ui/SearchSummaryBar.svelte';

	import { EXCLUDE_STATUS_OPTIONS, RANKING_TYPES } from '$lib/constants/anime';

	import type { AnimeRankingType, ApiAnimeStatus } from '$lib/types/anime';

	type Props = {
		username: string;
		visibleCount: number;
		search: string;
		rankingType: AnimeRankingType;
		excludedStatuses: ApiAnimeStatus[];
		showScore: boolean;
		onSearchChange: (value: string) => void;
		onRankingTypeChange: (rankingType: AnimeRankingType) => void;
		onExcludedStatusesChange: (statuses: ApiAnimeStatus[]) => void;
		onScoreVisibilityToggle: () => void;
	};

	let {
		username,
		visibleCount,
		search,
		rankingType,
		excludedStatuses,
		showScore,
		onSearchChange,
		onRankingTypeChange,
		onExcludedStatusesChange,
		onScoreVisibilityToggle
	}: Props = $props();

	const excludedStatusSet = $derived(new Set(excludedStatuses));

	const toggleExcludedStatus = (status: ApiAnimeStatus) => {
		if (excludedStatusSet.has(status)) {
			onExcludedStatusesChange(
				excludedStatuses.filter((excludedStatus) => excludedStatus !== status)
			);
			return;
		}

		onExcludedStatusesChange([...excludedStatuses, status]);
	};
</script>

<div class="border-b border-white/10 bg-background px-3 py-2">
	<div class="flex flex-col gap-2">
		<SearchSummaryBar {username} {visibleCount} totalLabel="loaded" {search} {onSearchChange} />

		<ControlRow label="type">
			{#each RANKING_TYPES as option (option.value)}
				<PillButton
					active={rankingType === option.value}
					onclick={() => onRankingTypeChange(option.value)}
				>
					{option.label}
				</PillButton>
			{/each}
		</ControlRow>

		<ControlRow label="exclude">
			<PillButton
				active={excludedStatuses.length === 0}
				onclick={() => onExcludedStatusesChange([])}
			>
				none
			</PillButton>

			{#each EXCLUDE_STATUS_OPTIONS as option (option.value)}
				<PillButton
					active={excludedStatusSet.has(option.value)}
					onclick={() => toggleExcludedStatus(option.value)}
				>
					{option.label}
				</PillButton>
			{/each}
		</ControlRow>

		<ControlRow label="view">
			<PillButton active={showScore} onclick={onScoreVisibilityToggle}>
				{showScore ? 'score shown' : 'score hidden'}
			</PillButton>
		</ControlRow>
	</div>
</div>
