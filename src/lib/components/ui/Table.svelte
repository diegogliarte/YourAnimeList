<script lang="ts" module>
	export type SortDirection = 'asc' | 'desc';

	export type TableColumn<Item> = {
		label: string;
		value: string;
		align?: 'left' | 'right' | 'center';
		width?: string;
		compare?: (a: Item, b: Item) => number;
	};
</script>

<script lang="ts" generics="Item">
	import type { Snippet } from 'svelte';
	import Input from '$lib/components/ui/Input.svelte';

	type Props = {
		items: Item[];
		columns: TableColumn<Item>[];
		filterText?: (item: Item) => string;
		filterPlaceholder?: string;
		class?: string;
		children: Snippet<[Item, number]>;
	};

	let {
		items,
		columns,
		filterText,
		filterPlaceholder = 'Filter...',
		class: className = '',
		children
	}: Props = $props();

	let query = $state('');
	let selectedSort = $state<string | null>(null);
	let direction = $state<SortDirection | null>(null);

	const filteredItems = $derived.by(() => {
		const normalizedQuery = normalize(query);

		if (!filterText || !normalizedQuery) {
			return items;
		}

		return items.filter((item) => normalize(filterText(item)).includes(normalizedQuery));
	});

	const sortedItems = $derived.by(() => {
		if (!selectedSort || !direction) {
			return filteredItems;
		}

		const column = columns.find((column) => column.value === selectedSort);
		const sorted = [...filteredItems];

		if (!column?.compare) {
			return sorted;
		}

		sorted.sort(column.compare);

		if (direction === 'desc') {
			sorted.reverse();
		}

		return sorted;
	});

	function toggleSort(column: TableColumn<Item>) {
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

	function getSortIcon(column: TableColumn<Item>) {
		if (selectedSort !== column.value) return '△';
		if (direction === 'asc') return '△';
		if (direction === 'desc') return '▽';
		return '△';
	}

	function alignClass(align: TableColumn<Item>['align']) {
		if (align === 'right') return 'text-right';
		if (align === 'center') return 'text-center';
		return 'text-left';
	}

	function normalize(value: string) {
		return value
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.trim();
	}
</script>

<div class={`overflow-hidden rounded-md border border-border bg-surface ${className}`}>
	{#if filterText}
		<div class="border-b border-border bg-surface p-2">
			<Input bind:value={query} placeholder={filterPlaceholder} />
		</div>
	{/if}

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
						<th class={`px-3 py-2 font-medium whitespace-nowrap ${alignClass(column.align)}`}>
							{#if column.compare}
								<button
									type="button"
									class="
										inline-flex cursor-pointer items-center gap-1 text-inherit transition
										hover:text-text
									"
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
				{#if sortedItems.length > 0}
					{#each sortedItems as item, index}
						{@render children(item, index)}
					{/each}
				{:else}
					<tr>
						<td colspan={columns.length} class="px-3 py-8 text-center text-text-muted">
							No results.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
