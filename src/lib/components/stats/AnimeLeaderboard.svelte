<script lang="ts" module>
	export type AnimeLeaderboardColumn<Row> = {
		label: string;
		align?: 'left' | 'center' | 'right';
		class?: string;
		value: (row: Row) => string | number;
	};
</script>

<script lang="ts" generics="Row">
	import Panel from '$lib/components/ui/Panel.svelte';

	type Props = {
		title: string;
		rows: Row[];
		columns: AnimeLeaderboardColumn<Row>[];
		getHref?: (row: Row) => string;
	};

	let { title, rows, columns, getHref }: Props = $props();

	function alignClass(align: AnimeLeaderboardColumn<Row>['align']) {
		if (align === 'right') return 'text-right';
		if (align === 'center') return 'text-center';
		return 'text-left';
	}
</script>

<Panel class="p-0!">
	<div class="border-b border-border p-3">
		<h2 class="text-sm font-semibold text-text">{title}</h2>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-max border-collapse text-sm">
			<thead class="bg-surface-soft text-xs text-text-muted">
				<tr>
					{#each columns as column}
						<th class={`px-3 py-2 font-medium ${alignClass(column.align)} ${column.class ?? ''}`}>
							{column.label}
						</th>
					{/each}
				</tr>
			</thead>

			<tbody class="divide-y divide-border">
				{#each rows as row}
					<tr class="transition hover:bg-surface-soft">
						{#each columns as column, index}
							<td class={`px-2 py-1 ${alignClass(column.align)} ${column.class ?? ''}`}>
								{#if index === 0 && getHref}
									<a
										href={getHref(row)}
										target="_blank"
										rel="noreferrer"
										class="block max-w-64 truncate text-text hover:text-primary"
									>
										{column.value(row)}
									</a>
								{:else}
									<span class={index === 0 ? 'text-text' : 'text-text-soft'}>
										{column.value(row)}
									</span>
								{/if}
							</td>
						{/each}
					</tr>
				{:else}
					<tr>
						<td colspan={columns.length} class="px-3 py-8 text-center text-text-muted">
							No data.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Panel>
