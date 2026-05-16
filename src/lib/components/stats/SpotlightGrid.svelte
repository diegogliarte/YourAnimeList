<script lang="ts">
	import type { AnimeSpotlightStat } from '$lib/utils/anime-stats';

	type FooterMetric = 'mean' | 'popularity';

	type Props = {
		title: string;
		description: string;
		items: AnimeSpotlightStat[];
		emptyMessage: string;
		limit?: number;
		footerMetric?: FooterMetric;
	};

	let {
		title,
		description,
		items,
		emptyMessage,
		limit = 6,
		footerMetric = 'mean'
	}: Props = $props();

	const visibleItems = $derived(items.slice(0, limit));

	const getFooterLabel = (item: AnimeSpotlightStat) => {
		if (footerMetric === 'popularity') {
			return item.popularityLabel ?? 'unknown popularity';
		}

		return `MAL ${item.meanLabel}`;
	};
</script>

<section class="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
	<div class="border-b border-white/10 px-3 py-2">
		<h2 class="text-sm font-medium text-white">{title}</h2>
		<p class="mt-0.5 text-xs text-neutral-500">{description}</p>
	</div>

	{#if visibleItems.length > 0}
		<div class="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
			{#each visibleItems as item (item.id)}
				<a
					href={item.href}
					target="_blank"
					rel="noreferrer"
					class="overflow-hidden rounded-lg border border-white/10 bg-black/20 transition hover:border-white/25 hover:bg-white/[0.04]"
				>
					<div class="aspect-[2/3] bg-neutral-900">
						{#if item.image}
							<img
								src={item.image}
								alt={item.title}
								loading="lazy"
								class="h-full w-full object-cover"
							/>
						{:else}
							<div
								class="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-600"
							>
								no image
							</div>
						{/if}
					</div>

					<div class="space-y-1 p-2">
						<p class="truncate text-xs font-medium text-white" title={item.title}>
							{item.title}
						</p>

						<div class="flex items-center justify-between gap-2 text-[11px]">
							<span class="text-neutral-400">you {item.scoreLabel}</span>
							<span class={item.gap > 0 ? 'text-emerald-300' : 'text-red-300'}>
								{item.gapLabel}
							</span>
						</div>

						<p class="truncate text-[11px] text-neutral-500">
							{getFooterLabel(item)}
						</p>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<p class="px-3 py-6 text-sm text-neutral-500">{emptyMessage}</p>
	{/if}
</section>
