<script module lang="ts">
	export type StatsTableValue = string | number | null | undefined;

	export type StatsTableRow = {
		key: string | number;
		values: StatsTableValue[];
	};
</script>

<script lang="ts">
	type Props = {
		title: string;
		headers: string[];
		rows: StatsTableRow[];
		emptyMessage?: string;
	};

	let { title, headers, rows, emptyMessage = 'No data.' }: Props = $props();
</script>

<section class="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
	<div class="border-b border-white/10 px-3 py-2">
		<h2 class="text-sm font-medium text-white">
			{title}
		</h2>
	</div>

	{#if rows.length === 0}
		<p class="px-3 py-2 text-sm text-neutral-500">
			{emptyMessage}
		</p>
	{:else}
		<table class="w-full text-left text-xs">
			<thead class="border-b border-white/10 text-neutral-500">
				<tr>
					{#each headers as header}
						<th class="px-3 py-1.5 font-medium">
							{header}
						</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#each rows as row (row.key)}
					<tr class="border-b border-white/5 last:border-b-0">
						{#each row.values as value, index}
							<td class="px-3 py-1.5 text-neutral-300">
								<span class={index === 0 ? 'line-clamp-1' : ''} title={String(value ?? '')}>
									{value ?? '-'}
								</span>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>
