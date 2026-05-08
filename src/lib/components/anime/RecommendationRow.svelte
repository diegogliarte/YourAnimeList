<script lang="ts">
	import type { RankedAnime } from '$lib/types/anime';

	type Props = {
		anime: RankedAnime;
		index: number;
		season: string | null;
	};

	let { anime, index, season }: Props = $props();

	const getMalUrl = (id: number) => {
		return `https://myanimelist.net/anime/${id}`;
	};

	const formatMean = (mean: number | null) => {
		return mean === null ? '—' : mean.toFixed(2);
	};

	const formatEpisodes = (totalEpisodes: number | null) => {
		return totalEpisodes === null || totalEpisodes === 0 ? '?' : String(totalEpisodes);
	};

	const formatStatus = (status: string) => {
		return status
			.split('_')
			.map((word) => word[0].toUpperCase() + word.slice(1))
			.join(' ');
	};
</script>

<li>
	<a
		href={getMalUrl(anime.id)}
		target="_blank"
		rel="noreferrer"
		aria-label={`Open ${anime.title} on MyAnimeList`}
		class="group grid cursor-pointer grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_4rem_3rem_5.5rem] items-center gap-3 px-3 py-1.5 transition hover:bg-white/[0.045]"
	>
		<span class="text-xs tabular-nums text-neutral-600">
			{anime.rank ?? String(index + 1).padStart(3, '0')}
		</span>

		<div
			class="h-10 w-10 overflow-hidden rounded border border-white/10 bg-neutral-950 opacity-85 transition group-hover:opacity-100"
		>
			{#if anime.image}
				<img
					class="h-full w-full object-cover"
					src={anime.image}
					alt={`Cover for ${anime.title}`}
					loading="lazy"
				/>
			{:else}
				<div class="flex h-full w-full items-center justify-center text-xs text-neutral-600">
					?
				</div>
			{/if}
		</div>

		<div class="min-w-0">
			<h2 class="truncate text-sm font-medium text-neutral-100 transition group-hover:text-white">
				{anime.title}
			</h2>

			<p class="truncate text-xs text-neutral-500">
				{#if anime.userStatus}
					{formatStatus(anime.userStatus)}
				{:else if anime.mediaType}
					{formatStatus(anime.mediaType)}
				{:else}
					not in list
				{/if}
			</p>
		</div>

		<span class="text-left text-sm font-semibold tabular-nums text-accent">
			{formatMean(anime.mean)}
		</span>

		<span class="text-right text-sm tabular-nums text-neutral-300">
			{formatEpisodes(anime.totalEpisodes)}
		</span>

		<span class="text-right text-sm tabular-nums text-neutral-400">
			{season ?? '—'}
		</span>
	</a>
</li>