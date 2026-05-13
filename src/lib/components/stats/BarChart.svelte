<script lang="ts">
	import type { ChartDatum } from '$lib/utils/anime-stats';

	type Props = {
		title: string;
		items: ChartDatum[];
		emptyMessage?: string;
	};

	let { title, items, emptyMessage = 'No data.' }: Props = $props();

	const maxValue = $derived(Math.max(...items.map((item) => item.value), 0));
</script>

<section class="rounded-lg border border-white/10 bg-white/[0.03] p-3">
	<h2 class="text-sm font-medium text-white">
		{title}
	</h2>

	{#if items.length === 0 || maxValue === 0}
		<p class="mt-2 text-sm text-neutral-500">
			{emptyMessage}
		</p>
	{:else}
		<div class="mt-2 space-y-1.5">
			{#each items as item (item.label)}
				<div class="grid grid-cols-[4.75rem_1fr_4rem] items-center gap-2 text-xs">
					<span class="truncate text-neutral-400" title={item.label}>
						{item.label}
					</span>

					<div class="h-1.5 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full bg-accent"
							style={`width: ${(item.value / maxValue) * 100}%`}
						></div>
					</div>

					<span class="flex flex-row gap-2 p-2text-right text-neutral-400">
						{item.value}
						{#if item.detail}
							<span class="text-neutral-600">{item.detail}</span>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</section>