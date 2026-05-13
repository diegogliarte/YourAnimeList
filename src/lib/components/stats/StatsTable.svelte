<script lang="ts">
	import type { ChartDatum } from '$lib/utils/anime-stats';

	type Props = {
		title: string;
		items: ChartDatum[];
		labelHeader?: string;
		valueHeader?: string;
		emptyMessage?: string;
	};

	let {
		title,
		items,
		labelHeader = 'item',
		valueHeader = 'count',
		emptyMessage = 'No data.'
	}: Props = $props();
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
				<th class="px-3 py-1.5 font-medium">{labelHeader}</th>
				<th class="px-3 py-1.5 text-right font-medium">{valueHeader}</th>
			</tr>
			</thead>

			<tbody>
			{#each items as item (item.label)}
				<tr class="border-b border-white/5 last:border-b-0">
					<td class="px-3 py-1.5 text-neutral-300">{item.label}</td>
					<td class="px-3 py-1.5 text-right text-neutral-400">{item.value}</td>
				</tr>
			{/each}
			</tbody>
		</table>
	{/if}
</section>