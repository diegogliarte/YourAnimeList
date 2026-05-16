<script lang="ts">
	import type { Anime } from '$lib/types/anime';

	type Props = {
		title: string;
		animes: Anime[];
		valueLabel: string;
		getValue: (anime: Anime) => string | number;
		emptyMessage?: string;
	};

	let { title, animes, valueLabel, getValue, emptyMessage = 'No data.' }: Props = $props();
</script>

<section class="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
	<div class="border-b border-white/10 px-3 py-2">
		<h2 class="text-sm font-medium text-white">
			{title}
		</h2>
	</div>

	{#if animes.length === 0}
		<p class="px-3 py-3 text-sm text-neutral-500">
			{emptyMessage}
		</p>
	{:else}
		<table class="w-full text-left text-xs">
			<thead class="border-b border-white/10 text-neutral-500">
				<tr>
					<th class="px-3 py-2 font-medium">title</th>
					<th class="px-3 py-2 text-right font-medium">{valueLabel}</th>
				</tr>
			</thead>

			<tbody>
				{#each animes as anime (anime.id)}
					<tr class="border-b border-white/5 last:border-b-0">
						<td class="px-3 py-2 text-neutral-300">
							<span class="line-clamp-1">{anime.title}</span>
						</td>
						<td class="px-3 py-2 text-right text-neutral-400">
							{getValue(anime)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>
