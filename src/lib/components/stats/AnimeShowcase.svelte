<script lang="ts" module>
	import type { UserAnimeListEdge } from '$lib/types/anime';

	export type AnimeShowcaseItem = {
		entry: UserAnimeListEdge;
		userScore: number;
		malScore?: number | null;
		diff?: number | null;
		popularity?: number | null;
	};
</script>

<script lang="ts">
	import Panel from '$lib/components/ui/Panel.svelte';
	import { getAnimeUrl } from '$lib/utils/anime.utils';
	import { formatDecimal, formatNumber, formatSigned } from '$lib/utils/format.utils';

	type Props = {
		title: string;
		description?: string;
		items: AnimeShowcaseItem[];
		metric?: 'diff' | 'popularity';
	};

	let { title, description, items, metric = 'diff' }: Props = $props();

	const visibleItems = $derived(items.slice(0, 8));

	function imageUrl(item: AnimeShowcaseItem) {
		return item.entry.node.main_picture?.medium ?? item.entry.node.main_picture?.large;
	}

	function formatUserScore(item: AnimeShowcaseItem) {
		const score = item.entry.list_status?.score ?? 0;

		return score > 0 ? String(score) : '-';
	}
</script>

<Panel class="p-3">
	<div class="mb-3">
		<h2 class="text-sm font-semibold text-text">{title}</h2>

		{#if description}
			<p class="mt-1 text-xs text-text-muted">{description}</p>
		{/if}
	</div>

	<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
		{#each visibleItems as item (item.entry.node.id)}
			<a
				href={getAnimeUrl(item.entry.node.id)}
				target="_blank"
				rel="noreferrer"
				class="group overflow-hidden rounded-md border border-border bg-background transition hover:border-primary/70 hover:bg-surface-soft"
			>
				<div class="h-56 w-full overflow-hidden bg-surface-soft">
					{#if imageUrl(item)}
						<img
							src={imageUrl(item)}
							alt={item.entry.node.title}
							class="h-full w-full object-cover transition group-hover:scale-105"
						/>
					{:else}
						<div class="grid h-full w-full place-items-center text-xs text-text-muted">
							No image
						</div>
					{/if}
				</div>

				<div class="p-2">
					<p class="truncate text-sm font-semibold text-text group-hover:text-primary">
						{item.entry.node.title}
					</p>

					<div class="mt-2 grid grid-cols-2 gap-1 text-xs">
						<p class="text-text-muted">
							you <span class="text-primary">{formatUserScore(item)}</span>
						</p>

						{#if metric === 'popularity'}
							<p class="text-right text-text-muted">
								pop <span class="text-text">#{formatNumber(item.popularity ?? 0)}</span>
							</p>

							<p class="text-text-muted">
								MAL <span class="text-text-soft">{formatDecimal(item.malScore ?? 0, 2)}</span>
							</p>
						{:else}
							<p
								class={`text-right ${
									(item.diff ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
								}`}
							>
								{formatSigned(item.diff ?? 0)}
							</p>

							<p class="text-text-muted">
								MAL <span class="text-text-soft">{formatDecimal(item.malScore ?? 0, 2)}</span>
							</p>
						{/if}
					</div>
				</div>
			</a>
		{/each}
	</div>
</Panel>