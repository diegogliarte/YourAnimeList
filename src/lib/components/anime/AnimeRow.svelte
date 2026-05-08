<script lang="ts">
	import type { Anime, AnimeViewStatus } from '$lib/types/anime';

	type Props = {
		anime: Anime;
		index: number;
		selectedStatus: AnimeViewStatus;
		season: string | null;
	};

	let { anime, index, selectedStatus, season }: Props = $props();

	const getMalUrl = (id: number) => {
		return `https://myanimelist.net/anime/${id}`;
	};

	const getMetric = (anime: Anime, status: AnimeViewStatus) => {
		if (status === 'completed') {
			return anime.displayScore;
		}

		if (status === 'watching' || status === 'dropped') {
			return `${anime.episodesWatched}/${anime.totalEpisodes ?? '?'}`;
		}

		return `${anime.totalEpisodes ?? '?'}`;
	};
</script>

<li>
	<a
		href={getMalUrl(anime.id)}
		target="_blank"
		rel="noreferrer"
		class="group grid cursor-pointer grid-cols-[2.5rem_3rem_2.25rem_minmax(0,1fr)] items-center gap-3 px-3 py-1 transition hover:bg-white/[0.045]"
	>
		<span class=" text-xs text-neutral-600">
			{String(index + 1).padStart(3, '0')}
		</span>

		<span class="w-16  text-sm font-semibold tabular-nums text-accent">
			{getMetric(anime, selectedStatus)}
		</span>

		<div class="h-10 w-10 overflow-hidden rounded border border-white/10 bg-neutral-950 opacity-85 transition group-hover:opacity-100">
			{#if anime.image}
				<img class="h-full w-full object-cover" src={anime.image} alt="" loading="lazy" />
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
				{season ?? 'unknown season'}
			</p>
		</div>
	</a>
</li>