<script module lang="ts">
	export type BarChartDetailsByLabel = Record<string, string[]>;
</script>

<script lang="ts">
	import type { ChartDatum } from '$lib/utils/anime-stats';

	type Props = {
		title: string;
		items: ChartDatum[];
		detailsByLabel?: BarChartDetailsByLabel;
		emptyMessage?: string;
	};

	let {
		title,
		items,
		detailsByLabel = {},
		emptyMessage = 'No data.'
	}: Props = $props();

	let expandedLabel = $state<string | null>(null);

	const maxValue = $derived(Math.max(...items.map((item) => item.value), 0));

	const getRows = (label: string) => detailsByLabel[label] ?? [];

	const toggleExpanded = (label: string) => {
		const rows = getRows(label);

		if (rows.length === 0) return;

		expandedLabel = expandedLabel === label ? null : label;
	};
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
				{@const rows = getRows(item.label)}
				{@const expanded = expandedLabel === item.label}

				<div>
					<button
						type="button"
						class="grid w-full cursor-pointer grid-cols-[4.75rem_1fr_4rem] items-center gap-2 rounded text-left text-xs transition hover:bg-white/[0.03]"
						aria-expanded={expanded}
						onclick={() => toggleExpanded(item.label)}
					>
						<span class="truncate text-neutral-400" title={item.label}>
							{item.label}
						</span>

						<div class="h-1.5 overflow-hidden rounded-full bg-white/10">
							<div
								class="h-full rounded-full bg-accent"
								style={`width: ${(item.value / maxValue) * 100}%`}
							></div>
						</div>

						<span class="flex justify-end gap-2 text-right text-neutral-400">
							{item.value}

							{#if item.detail}
								<span class="text-neutral-600">
									{item.detail}
								</span>
							{/if}
						</span>
					</button>

					{#if expanded}
						<div class="mt-2">
							<div class="space-y-1">
								{#each rows as title}
									<p class="line-clamp-1 text-xs text-neutral-300" title={title}>
										{title}
									</p>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>