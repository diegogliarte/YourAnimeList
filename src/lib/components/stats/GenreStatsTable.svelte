<script lang="ts">
	import type { GenreStat } from '$lib/utils/anime-stats';

	type Props = {
		title: string;
		items: GenreStat[];
		emptyMessage?: string;
	};

	let { title, items, emptyMessage = 'No genre data.' }: Props = $props();
</script>

<section class="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
	<div class="border-b border-white/10 px-3 py-2">
		<h2 class="text-sm font-medium text-white">
			{title}
		</h2>
	</div>

	{#if items.length === 0}
		<p class="px-3 py-2 text-sm text-neutral-500">
			{emptyMessage}
		</p>
	{:else}
		<table class="w-full text-left text-xs">
			<thead class="border-b border-white/10 text-neutral-500">
			<tr>
				<th class="px-3 py-1.5 font-medium">genre</th>
				<th class="px-3 py-1.5 text-right font-medium">entries</th>
				<th class="px-3 py-1.5 text-right font-medium">avg</th>
				<th class="hidden px-3 py-1.5 text-right font-medium sm:table-cell">eps</th>
				<th class="hidden px-3 py-1.5 text-right font-medium md:table-cell">runtime</th>
			</tr>
			</thead>

			<tbody>
			{#each items as item (item.genre)}
				<tr class="border-b border-white/5 last:border-b-0">
					<td class="px-3 py-1.5 text-neutral-300">
						{item.genre}
					</td>

					<td class="px-3 py-1.5 text-right text-neutral-400">
						{item.count}
					</td>

					<td class="px-3 py-1.5 text-right text-neutral-400">
						{item.averageScoreLabel}
					</td>

					<td class="hidden px-3 py-1.5 text-right text-neutral-500 sm:table-cell">
						{item.episodes}
					</td>

					<td class="hidden px-3 py-1.5 text-right text-neutral-500 md:table-cell">
						{item.runtimeLabel}
					</td>
				</tr>
			{/each}
			</tbody>
		</table>
	{/if}
</section>