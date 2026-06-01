<script lang="ts" module>
	import type { UserAnimeListEdge } from '$lib/types/anime';

	export type AnimeBarChartDatum = {
		key: string;
		label: string;
		value: number;
		items: UserAnimeListEdge[];
	};
</script>

<script lang="ts">
	import Panel from '$lib/components/ui/Panel.svelte';

	type Props = {
		title: string;
		data: AnimeBarChartDatum[];
		maxRows?: number;
	};

	let { title, data, maxRows }: Props = $props();

	let selectedKey = $state<string | null>(null);

	const visibleData = $derived(maxRows ? data.slice(0, maxRows) : data);
	const maxValue = $derived(Math.max(1, ...visibleData.map((item) => item.value)));
	const totalValue = $derived(data.reduce((total, item) => total + item.value, 0));

	const selected = $derived(visibleData.find((item) => item.key === selectedKey) ?? null);

	function toggleSelected(key: string) {
		selectedKey = selectedKey === key ? null : key;
	}

	function width(value: number) {
		return `${Math.max((value / maxValue) * 100, 1.5)}%`;
	}

	function percent(value: number) {
		if (totalValue <= 0) return '0.0%';

		return `${((value / totalValue) * 100).toFixed(1)}%`;
	}

	function getAnimeUrl(id: number) {
		return `https://myanimelist.net/anime/${id}`;
	}
</script>

<Panel class="p-2!">
	<div class="mb-3 flex items-center justify-between gap-3">
		<h2 class="text-sm font-semibold text-text">{title}</h2>

		{#if maxRows && data.length > maxRows}
			<p class="text-xs text-text-muted">Top {maxRows}</p>
		{/if}
	</div>

	<div class="grid gap-2">
		{#each visibleData as item (item.key)}
			<button
				type="button"
				class="group grid cursor-pointer grid-cols-[7rem_1fr_5.5rem] items-center gap-3 text-left text-sm"
				onclick={() => toggleSelected(item.key)}
			>
				<span class="truncate text-xs text-text-soft group-hover:text-text">
					{item.label}
				</span>

				<span class="h-1.5 overflow-hidden rounded-full bg-surface-soft">
					<span
						class={`
							block h-full rounded-full transition-all
							${selectedKey === item.key ? 'bg-accent' : 'bg-primary/70 group-hover:bg-primary'}
						`}
						style:width={width(item.value)}
					></span>
				</span>

				<span class="text-right font-mono text-xs text-text-muted group-hover:text-text">
					{item.value} · {percent(item.value)}
				</span>
			</button>
		{/each}
	</div>

	{#if selected}
		<div class="mt-3 rounded-md border border-border bg-background p-2">
			<p class="mb-2 text-xs text-text-muted">
				{selected.label} · {selected.items.length} anime · {percent(selected.value)}
			</p>

			<div class="max-h-64 overflow-y-auto">
				{#each selected.items as entry (entry.node.id)}
					<a
						href={getAnimeUrl(entry.node.id)}
						target="_blank"
						rel="noreferrer"
						class="block truncate rounded-md px-2 py-1 text-sm text-text-soft hover:bg-surface-soft hover:text-primary"
					>
						{entry.node.title}
					</a>
				{/each}
			</div>
		</div>
	{/if}
</Panel>
