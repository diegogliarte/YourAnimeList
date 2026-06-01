<script lang="ts" module>
	import type { UserAnimeListEdge } from '$lib/types/anime';

	export type AnimeBreakdownRow = {
		name: string;
		count: number;
		avgScore: number;
		avgRuntimeSeconds: number;
		items: UserAnimeListEdge[];
	};
</script>

<script lang="ts">
	import Panel from '$lib/components/ui/Panel.svelte';

	type SortDirection = 'asc' | 'desc';

	type SortColumn = {
		label: string;
		value: string;
		align?: 'left' | 'right' | 'center';
		width?: string;
		compare?: (a: AnimeBreakdownRow, b: AnimeBreakdownRow) => number;
	};

	type Props = {
		title: string;
		rows: AnimeBreakdownRow[];
		maxRows?: number;
		class?: string;
	};

	let { title, rows, maxRows = 10, class: className = '' }: Props = $props();

	let selectedSort = $state<string | null>('count');
	let direction = $state<SortDirection | null>('desc');
	let selectedName = $state<string | null>(null);

	const columns: SortColumn[] = [
		{
			label: 'Name',
			value: 'name',
			width: '6rem',
			compare: (a, b) => a.name.localeCompare(b.name)
		},
		{
			label: 'Count',
			value: 'count',
			align: 'center',
			width: '5rem',
			compare: (a, b) => a.count - b.count
		},
		{
			label: 'Avg score',
			value: 'avgScore',
			align: 'center',
			width: '5rem',
			compare: (a, b) => a.avgScore - b.avgScore
		},
		{
			label: 'Total time',
			value: 'totalRuntimeSeconds',
			align: 'center',
			width: '5rem',
			compare: (a, b) => a.avgRuntimeSeconds * a.count - b.avgRuntimeSeconds * b.count
		},
		{
			label: 'Avg time',
			value: 'avgRuntimeSeconds',
			align: 'center',
			width: '5rem',
			compare: (a, b) => a.avgRuntimeSeconds - b.avgRuntimeSeconds
		}
	];

	const sortedRows = $derived.by(() => {
		if (!selectedSort || !direction) {
			return rows;
		}

		const column = columns.find((column) => column.value === selectedSort);
		const sorted = [...rows];

		if (!column?.compare) {
			return sorted;
		}

		sorted.sort(column.compare);

		if (direction === 'desc') {
			sorted.reverse();
		}

		return sorted;
	});

	const visibleRows = $derived(sortedRows.slice(0, maxRows));

	function toggleSort(column: SortColumn) {
		if (!column.compare) return;

		if (selectedSort !== column.value) {
			selectedSort = column.value;
			direction = 'asc';
			return;
		}

		if (direction === 'asc') {
			direction = 'desc';
			return;
		}

		selectedSort = null;
		direction = null;
	}

	function toggleSelected(name: string) {
		selectedName = selectedName === name ? null : name;
	}

	function getSortIcon(column: SortColumn) {
		if (selectedSort !== column.value) return '△';
		if (direction === 'asc') return '△';
		if (direction === 'desc') return '▽';
		return '△';
	}

	function alignClass(align: SortColumn['align']) {
		if (align === 'right') return 'text-right';
		if (align === 'center') return 'text-center';
		return 'text-left';
	}

	function getAnimeUrl(id: number) {
		return `https://myanimelist.net/anime/${id}`;
	}

	function formatDecimal(value: number, decimals = 1) {
		return value.toFixed(decimals);
	}

	function formatScore(value: number) {
		if (!Number.isFinite(value) || value <= 0) return '-';

		return formatDecimal(value, 2);
	}

	function formatDuration(seconds: number) {
		if (!Number.isFinite(seconds) || seconds <= 0) return '-';
		if (seconds < 60) return `${formatDecimal(seconds)}s`;
		if (seconds < 60 * 60) return `${formatDecimal(seconds / 60)}m`;
		if (seconds < 60 * 60 * 24) return `${formatDecimal(seconds / 60 / 60)}h`;

		return `${formatDecimal(seconds / 60 / 60 / 24)}d`;
	}
</script>

<Panel class={`p-0! ${className}`}>
	<div class="border-b border-border p-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-sm font-semibold text-text">{title}</h2>

			{#if rows.length > maxRows}
				<p class="text-xs text-text-muted">Top {maxRows}</p>
			{/if}
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="w-max min-w-full border-collapse text-sm">
			<colgroup>
				{#each columns as column (column.value)}
					<col style:width={column.width} style:min-width={column.width} />
				{/each}
			</colgroup>

			<thead class="bg-surface-soft text-xs text-text-muted">
				<tr>
					{#each columns as column (column.value)}
						<th class={`px-2 py-1 font-medium whitespace-nowrap ${alignClass(column.align)}`}>
							{#if column.compare}
								<button
									type="button"
									class="inline-flex cursor-pointer items-center gap-1 text-inherit transition hover:text-text"
									onclick={() => toggleSort(column)}
								>
									<span>{column.label}</span>

									<span
										class={`
											inline-block w-3 text-right text-primary
											${selectedSort === column.value ? 'opacity-100' : 'opacity-0'}
										`}
									>
										{getSortIcon(column)}
									</span>
								</button>
							{:else}
								{column.label}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>

			<tbody class="divide-y divide-border">
				{#if visibleRows.length > 0}
					{#each visibleRows as row (row.name)}
						<tr
							class="cursor-pointer transition hover:bg-surface-soft"
							onclick={() => toggleSelected(row.name)}
						>
							<td class="max-w-56 truncate px-2 py-1 text-text">
								{row.name}
							</td>

							<td class="px-2 py-1 text-center text-text-soft">
								{row.count}
							</td>

							<td class="px-2 py-1 text-center text-primary">
								{formatScore(row.avgScore)}
							</td>

							<td class="px-2 py-1 text-center text-text-soft">
								{formatDuration(row.avgRuntimeSeconds * row.count)}
							</td>

							<td class="px-2 py-1 text-center text-text-soft">
								{formatDuration(row.avgRuntimeSeconds)}
							</td>
						</tr>

						{#if selectedName === row.name}
							<tr>
								<td colspan={columns.length} class="bg-background px-2 py-1">
									<div
										class="max-h-56 w-full max-w-[calc(100vw-3rem)] overflow-x-hidden overflow-y-auto pr-1"
									>
										<div class="grid gap-1">
											{#each row.items as entry (entry.node.id)}
												<a
													href={getAnimeUrl(entry.node.id)}
													target="_blank"
													rel="noreferrer"
													class="block min-w-0 truncate rounded-md px-2 py-1 text-sm text-text-soft hover:bg-surface-soft hover:text-primary"
												>
													{entry.node.title}
												</a>
											{/each}
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				{:else}
					<tr>
						<td colspan={columns.length} class="px-2 py-8 text-center text-text-muted">
							No results.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</Panel>
