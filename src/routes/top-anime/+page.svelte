<script lang="ts">
	import AnimeTable from '$lib/components/ui/AnimeTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { AnimeListStatusName, AnimeRankingType } from '$lib/types/anime';
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

				<Button onclick={() => animeData.refreshAnimeRanking()} disabled={animeData.rankingLoading}>
					Refresh
				</Button>
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
		<AnimeTable items={filteredRanking} filterPlaceholder="Filter ranking..." />

		{#if animeData.rankingLoadingMore}
			<Panel>
				<p class="text-sm text-text-muted">Loading more...</p>
			</Panel>
		{:else if animeData.rankingNextOffset === null && animeData.rankingData.length > 0}
			<p class="py-3 text-center text-xs text-text-muted">End of ranking.</p>
		{/if}
	{/if}
</div>