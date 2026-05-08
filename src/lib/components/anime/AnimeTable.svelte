<script lang="ts">
	import type { Anime, ApiAnimeStatus, RankedAnime } from '$lib/types/anime';

	type AnimeTableMode = 'list' | 'ranking';

	type Props = {
		mode: AnimeTableMode;
		animes: Anime[] | RankedAnime[];
		showScore?: boolean;
		emptyMessage?: string;
	};

	let {
		mode,
		animes,
		showScore = true,
		emptyMessage = 'No results.'
	}: Props = $props();

	const getMalUrl = (id: number) => {
		return `https://myanimelist.net/anime/${id}`;
	};

	const formatStatus = (status: string) => {
		return status
			.split('_')
			.map((word) => word[0].toUpperCase() + word.slice(1))
			.join(' ');
	};

	const formatSeason = (season: Anime['startSeason'] | RankedAnime['startSeason']) => {
		if (!season?.year) return '—';
		if (!season.season) return String(season.year);

		return `${formatStatus(season.season)} ${season.year}`;
	};

	const formatListScore = (anime: Anime | RankedAnime) => {
		if (!('customScore' in anime)) return '—';
		if (!anime.customScore || anime.customScore <= 0) return '—';

		return anime.displayScore;
	};

	const formatRankingScore = (anime: Anime | RankedAnime) => {
		if (!('mean' in anime) || anime.mean === null) return '—';

		return anime.mean.toFixed(2);
	};

	const formatEpisodes = (anime: Anime | RankedAnime) => {
		if ('episodesWatched' in anime) {
			return `${anime.episodesWatched}/${anime.totalEpisodes ?? '?'}`;
		}

		return anime.totalEpisodes === null || anime.totalEpisodes === 0
			? '?'
			: String(anime.totalEpisodes);
	};

	const getRank = (anime: Anime | RankedAnime, index: number) => {
		if ('rank' in anime) return anime.rank ?? index + 1;

		return index + 1;
	};

	const getPopularity = (anime: Anime | RankedAnime) => {
		if (!('popularity' in anime)) return '—';

		return anime.popularity ?? '—';
	};

	const getSubtitle = (anime: Anime | RankedAnime) => {
		if ('userStatus' in anime) {
			if (anime.userStatus) return `in list · ${formatStatus(anime.userStatus)}`;
			if (anime.mediaType) return formatStatus(anime.mediaType);

			return 'not in list';
		}

		return formatStatus(anime.status as ApiAnimeStatus);
	};

	const getScore = (anime: Anime | RankedAnime) => {
		return mode === 'list' ? formatListScore(anime) : formatRankingScore(anime);
	};

	const shouldShowScore = () => {
		return mode === 'list' || showScore;
	};
</script>

{#if animes.length === 0}
	<div class="px-3 py-10 text-center text-sm text-neutral-500">
		{emptyMessage}
	</div>
{:else}
	<table class="w-full table-fixed border-collapse text-sm">
		<thead>
		<tr
			class="border-b border-white/[0.07] text-[0.68rem] font-semibold uppercase tracking-wide text-neutral-500"
		>
			{#if mode === 'ranking'}
				<th class="w-12 px-1 py-1 text-left sm:w-16 sm:px-3">rank</th>
				<th class="w-12 px-1 py-1 text-left sm:w-16 sm:px-3">pop</th>
			{:else}
				<th class="w-10 px-1 py-1 text-left sm:px-3">#</th>
			{/if}

			<th class="w-16 px-1 py-1 text-left sm:px-3"></th>
			<th class="px-1 py-1 text-left sm:px-3">title</th>

			{#if shouldShowScore()}
				<th class="w-16 px-1 py-1 text-left sm:px-3">score</th>
			{/if}

			<th class="w-24 px-1 py-1 text-right sm:px-3">eps</th>
			<th class="w-26 px-1 py-1 text-right sm:px-3">season</th>
		</tr>
		</thead>

		<tbody class="divide-y divide-white/[0.07]">
		{#each animes as anime, index (anime.id)}
			<tr class="group transition hover:bg-white/[0.045]">
				{#if mode === 'ranking'}
					<td class="px-2 py-1.5 align-middle text-xs tabular-nums text-neutral-500 sm:px-3">
						{getRank(anime, index)}
					</td>

					<td class="px-2 py-1.5 align-middle text-xs tabular-nums text-neutral-500 sm:px-3">
						{getPopularity(anime)}
					</td>
				{:else}
					<td class="px-2 py-1.5 align-middle text-xs tabular-nums text-neutral-600 sm:px-3">
						{String(index + 1).padStart(3, '0')}
					</td>
				{/if}

				<td class="px-2 py-1.5 align-middle sm:px-3">
					<a
						href={getMalUrl(anime.id)}
						target="_blank"
						rel="noreferrer"
						class="block h-10 w-10 overflow-hidden rounded border border-white/10 bg-neutral-950 opacity-85 transition group-hover:opacity-100"
						aria-label={`Open ${anime.title} on MyAnimeList`}
					>
						{#if anime.image}
							<img
								class="h-full w-full object-cover"
								src={anime.image}
								alt={`Cover for ${anime.title}`}
								loading="lazy"
							/>
						{:else}
								<span class="flex h-full w-full items-center justify-center text-xs text-neutral-600">
									?
								</span>
						{/if}
					</a>
				</td>

				<td class="min-w-0 px-2 py-1.5 align-middle sm:px-3">
					<a
						href={getMalUrl(anime.id)}
						target="_blank"
						rel="noreferrer"
						class="block min-w-0 overflow-hidden"
					>
						<h2
							class="truncate text-[0.8rem] font-medium leading-tight text-neutral-100 transition group-hover:text-white"
						>
							{anime.title}
						</h2>

						<p class="truncate text-[0.68rem] leading-tight text-neutral-500">
							{getSubtitle(anime)}
						</p>
					</a>
				</td>

				{#if shouldShowScore()}
					<td class="px-2 py-1.5 align-middle text-left text-sm font-semibold tabular-nums text-accent sm:px-3">
						{getScore(anime)}
					</td>
				{/if}

				<td class="truncate px-2 py-1.5 align-middle text-right text-sm tabular-nums text-neutral-300 sm:px-3">
					{formatEpisodes(anime)}
				</td>

				<td class="truncate px-2 py-1.5 align-middle text-right text-xs tabular-nums text-neutral-400 sm:px-3">
					{formatSeason(anime.startSeason)}
				</td>
			</tr>
		{/each}
		</tbody>
	</table>
{/if}