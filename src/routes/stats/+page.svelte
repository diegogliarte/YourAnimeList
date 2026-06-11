<script lang="ts">
	import AnimeBarChart, {
		type AnimeBarChartDatum
	} from '$lib/components/stats/AnimeBarChart.svelte';
	import AnimeBreakdownTable, {
		type AnimeBreakdownRow
	} from '$lib/components/stats/AnimeBreakdownTable.svelte';
	import AnimeLeaderboard, {
		type AnimeLeaderboardColumn
	} from '$lib/components/stats/AnimeLeaderboard.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';
	import type { UserAnimeListEdge } from '$lib/types/anime';
	import {
		getAnimeUrl,
		getDuration,
		getRewatchEpisodes,
		getUserScore,
		getWatchedEpisodes,
		getUniqueWatchedEpisodes,
		getYear
	} from '$lib/utils/anime.utils';
	import {
		bucketBy,
		getDecadeBucket,
		getEpisodeBucket,
		getMalScoreBucket,
		getRuntimeBucket,
		groupBy,
		groupByMany,
		makeBreakdown,
		sortYearGroupsByCount
	} from '$lib/utils/anime-stats.utils';
	import {
		formatDecimal,
		formatDuration,
		formatMinutes,
		formatNumber,
		formatPercent,
		formatSigned
	} from '$lib/utils/format.utils';
	import { average, standardDeviation, sum } from '$lib/utils/math.utils';
	import AnimeShowcase, {
		type AnimeShowcaseItem
	} from '$lib/components/stats/AnimeShowcase.svelte';

	type Stat = {
		label: string;
		value: string | number;
		hint?: string;
	};

	type Chart = {
		title: string;
		data: AnimeBarChartDatum[];
		maxRows?: number;
	};

	type RuntimeRow = {
		entry: UserAnimeListEdge;
		episodes: number;
		totalSeconds: number;
	};

	type RewatchRow = {
		entry: UserAnimeListEdge;
		rewatches: number;
		watchedEpisodes: number;
		totalSeconds: number;
	};

	const completedEntries = $derived(
		animeData.userList.filter((entry) => entry.list_status?.status === 'completed')
	);

	const plannedEntries = $derived(
		animeData.userList.filter((entry) => entry.list_status?.status === 'plan_to_watch')
	);

	const droppedEntries = $derived(
		animeData.userList.filter((entry) => entry.list_status?.status === 'dropped')
	);

	const ratedCompletedEntries = $derived(
		completedEntries.filter((entry) => (entry.list_status?.score ?? 0) > 0)
	);

	const comparableEntries = $derived(
		completedEntries.filter(
			(entry) => (entry.list_status?.score ?? 0) > 0 && typeof entry.node.mean === 'number'
		)
	);

	const completedWithDuration = $derived(
		completedEntries.filter((entry) => getDuration(entry) > 0)
	);

	const watchedWithDuration = $derived(
		animeData.userList.filter((entry) => getWatchedEpisodes(entry) > 0 && getDuration(entry) > 0)
	);

	const rewatchEntries = $derived(
		animeData.userList.filter((entry) => (entry.list_status?.num_times_rewatched ?? 0) > 0)
	);

	const totalEntries = $derived(animeData.userList.length);
	const completedCount = $derived(completedEntries.length);
	const plannedCount = $derived(plannedEntries.length);
	const droppedCount = $derived(droppedEntries.length);

	const totalWatchedEpisodes = $derived(sum(animeData.userList, getWatchedEpisodes));
	const rewatchEpisodes = $derived(sum(animeData.userList, getRewatchEpisodes));

	const totalWatchedSeconds = $derived(
		sum(animeData.userList, (entry) => getWatchedEpisodes(entry) * getDuration(entry))
	);

	const completedWatchedSeconds = $derived(
		sum(completedEntries, (entry) => getWatchedEpisodes(entry) * getDuration(entry))
	);

	const completedUniqueSeconds = $derived(
		sum(completedEntries, (entry) => getUniqueWatchedEpisodes(entry) * getDuration(entry))
	);

	const rewatchSeconds = $derived(
		sum(animeData.userList, (entry) => getRewatchEpisodes(entry) * getDuration(entry))
	);

	const extraWatches = $derived(
		sum(animeData.userList, (entry) => entry.list_status?.num_times_rewatched ?? 0)
	);

	const averageScore = $derived(average(ratedCompletedEntries.map((entry) => getUserScore(entry))));

	const scoreSpread = $derived(
		standardDeviation(ratedCompletedEntries.map((entry) => getUserScore(entry)))
	);

	const averageVsMal = $derived(
		average(
			comparableEntries.map((entry) => {
				return getUserScore(entry) - (entry.node.mean ?? 0);
			})
		)
	);

	const averageEpisodesPerCompletedAnime = $derived(
		average(completedEntries.map(getWatchedEpisodes))
	);

	const averageRuntimePerCompletedAnime = $derived(
		average(completedWithDuration.map((entry) => getWatchedEpisodes(entry) * getDuration(entry)))
	);

	const watchedEpisodesWithDuration = $derived(
		sum(
			animeData.userList.filter((entry) => getWatchedEpisodes(entry) > 0 && getDuration(entry) > 0),
			getWatchedEpisodes
		)
	);

	const averageEpisodeDuration = $derived(
		watchedEpisodesWithDuration > 0 ? totalWatchedSeconds / watchedEpisodesWithDuration : 0
	);

	const stats = $derived.by<Stat[]>(() => [
		{
			label: 'Completed',
			value: formatNumber(completedCount),
			hint: `${formatNumber(totalEntries)} total entries`
		},
		{
			label: 'Eps watched',
			value: formatNumber(totalWatchedEpisodes),
			hint: 'includes rewatches'
		},
		{
			label: 'Watched time',
			value: formatDuration(totalWatchedSeconds),
			hint: `${formatNumber(watchedWithDuration.length)} entries with duration`
		},
		{
			label: 'Avg score',
			value: formatDecimal(averageScore, 2),
			hint: `${formatNumber(ratedCompletedEntries.length)} completed rated`
		},
		{
			label: 'Completion',
			value: formatPercent(completedCount, totalEntries),
			hint: `${formatNumber(plannedCount)} planned`
		},
		{
			label: 'Dropped',
			value: formatNumber(droppedCount),
			hint: `${formatPercent(droppedCount, totalEntries)} of total`
		},
		{
			label: 'Completed runtime',
			value: formatDuration(completedWatchedSeconds),
			hint: `${formatDuration(completedUniqueSeconds)} unique`
		},
		{
			label: 'Runtime coverage',
			value: formatPercent(completedWithDuration.length, completedCount),
			hint: `${formatNumber(completedWithDuration.length)} / ${formatNumber(completedCount)} completed`
		},
		{
			label: 'Avg runtime',
			value: formatDuration(averageRuntimePerCompletedAnime),
			hint: 'completed with duration'
		},
		{
			label: 'Avg eps/anime',
			value: formatDecimal(averageEpisodesPerCompletedAnime, 1),
			hint: 'completed, includes rewatches'
		},
		{
			label: 'Avg ep duration',
			value: formatMinutes(averageEpisodeDuration),
			hint: `${formatNumber(watchedEpisodesWithDuration)} eps with duration`
		},
		{
			label: 'Rated coverage',
			value: formatPercent(ratedCompletedEntries.length, completedCount),
			hint: `${formatNumber(ratedCompletedEntries.length)} / ${formatNumber(completedCount)} completed`
		},
		{
			label: 'Score spread',
			value: formatDecimal(scoreSpread, 2),
			hint: 'standard deviation'
		},
		{
			label: 'Vs MAL mean',
			value: formatSigned(averageVsMal),
			hint: `${formatNumber(comparableEntries.length)} comparable`
		},
		{
			label: 'Rewatches',
			value: formatNumber(rewatchEntries.length),
			hint: `${formatNumber(extraWatches)} extra watches`
		},
		{
			label: 'Rewatch time',
			value: formatDuration(rewatchSeconds),
			hint: `${formatNumber(rewatchEpisodes)} extra episodes`
		}
	]);

	const charts = $derived.by<Chart[]>(() => [
		{
			title: 'Status',
			data: groupBy(animeData.userList, (entry) => entry.list_status?.status ?? 'unknown')
		},
		{
			title: 'Scores',
			data: groupBy(
				completedEntries.filter((entry) => (entry.list_status?.score ?? 0) > 0),
				(entry) => String(entry.list_status?.score ?? 0)
			).sort((a, b) => Number(b.key) - Number(a.key))
		},
		{
			title: 'Completed episodes',
			data: bucketBy(completedEntries, getEpisodeBucket)
		},
		{
			title: 'Completed media',
			data: groupBy(completedEntries, (entry) => entry.node.media_type ?? 'unknown')
		},
		{
			title: 'Completed source',
			data: groupBy(completedEntries, (entry) => entry.node.source ?? 'unknown')
		},
		{
			title: 'Completed decades',
			data: bucketBy(completedEntries, getDecadeBucket)
		},
		{
			title: 'Completed years',
			data: sortYearGroupsByCount(
				groupBy(completedEntries, (entry) => String(getYear(entry) || 'unknown'))
			),
			maxRows: 10
		},
		{
			title: 'Completed seasons',
			data: groupBy(completedEntries, (entry) => entry.node.start_season?.season ?? 'unknown')
		},
		{
			title: 'Completed studios',
			data: groupByMany(completedEntries, (entry) => {
				return entry.node.studios?.map((studio) => studio.name) ?? ['unknown'];
			}),
			maxRows: 10
		},
		{
			title: 'Completed genres',
			data: groupByMany(completedEntries, (entry) => {
				return entry.node.genres?.map((genre) => genre.name) ?? ['unknown'];
			}),
			maxRows: 10
		},
		{
			title: 'Completed runtime',
			data: bucketBy(completedEntries, getRuntimeBucket)
		},
		{
			title: 'Completed MAL mean',
			data: bucketBy(
				completedEntries.filter((entry) => typeof entry.node.mean === 'number'),
				getMalScoreBucket
			)
		}
	]);

	const genreBreakdown = $derived.by<AnimeBreakdownRow[]>(() => {
		return makeBreakdown(completedEntries, (entry) => {
			return entry.node.genres?.map((genre) => genre.name) ?? [];
		});
	});

	const studioBreakdown = $derived.by<AnimeBreakdownRow[]>(() => {
		return makeBreakdown(completedEntries, (entry) => {
			return entry.node.studios?.map((studio) => studio.name) ?? [];
		});
	});

	const longestCompletedRuntime = $derived.by<RuntimeRow[]>(() => {
		return completedEntries
			.filter((entry) => getDuration(entry) > 0)
			.map((entry) => ({
				entry,
				episodes: getWatchedEpisodes(entry),
				totalSeconds: getWatchedEpisodes(entry) * getDuration(entry)
			}))
			.sort((a, b) => b.totalSeconds - a.totalSeconds)
			.slice(0, 12);
	});

	const topRewatches = $derived.by<RewatchRow[]>(() => {
		return animeData.userList
			.filter((entry) => (entry.list_status?.num_times_rewatched ?? 0) > 0)
			.map((entry) => {
				const rewatches = entry.list_status?.num_times_rewatched ?? 0;
				const watchedEpisodes = getWatchedEpisodes(entry);

				return {
					entry,
					rewatches,
					watchedEpisodes,
					totalSeconds: watchedEpisodes * getDuration(entry)
				};
			})
			.sort((a, b) => {
				const rewatchDiff = b.rewatches - a.rewatches;

				if (rewatchDiff !== 0) return rewatchDiff;

				return b.totalSeconds - a.totalSeconds;
			})
			.slice(0, 10);
	});

	const longestCompletedRuntimeColumns: AnimeLeaderboardColumn<RuntimeRow>[] = [
		{
			label: 'Title',
			value: (row) => row.entry.node.title,
			class: 'min-w-0 sm:w-64'
		},
		{
			label: 'Eps',
			align: 'center',
			value: (row) => row.episodes
		},
		{
			label: 'Total',
			align: 'right',
			value: (row) => formatDuration(row.totalSeconds)
		}
	];

	const topRewatchColumns: AnimeLeaderboardColumn<RewatchRow>[] = [
		{
			label: 'Title',
			value: (row) => row.entry.node.title,
			class: 'min-w-0 sm:w-64'
		},
		{
			label: 'Rewatches',
			align: 'center',
			value: (row) => row.rewatches
		},
		{
			label: 'Watched eps',
			align: 'center',
			value: (row) => row.watchedEpisodes
		},
		{
			label: 'Time',
			align: 'right',
			value: (row) => formatDuration(row.totalSeconds)
		}
	];

	function isShowcaseMedia(entry: UserAnimeListEdge) {
		return ['tv', 'movie', 'ova'].includes(entry.node.media_type ?? '');
	}

	const hiddenGems = $derived.by<AnimeShowcaseItem[]>(() => {
		return completedEntries
			.filter(isShowcaseMedia)
			.filter((entry) => (entry.list_status?.score ?? 0) >= 8)
			.filter((entry) => typeof entry.node.mean === 'number')
			.filter((entry) => (entry.node.mean ?? 0) < 7.5)
			.map((entry) => {
				const userScore = entry.list_status?.score ?? 0;
				const malScore = entry.node.mean ?? 0;

				return {
					entry,
					userScore,
					malScore,
					diff: userScore - malScore,
					popularity: entry.node.popularity ?? null
				};
			})
			.sort((a, b) => {
				const diffScore = (b.diff ?? 0) - (a.diff ?? 0);

				if (diffScore !== 0) return diffScore;

				return b.userScore - a.userScore;
			})
			.slice(0, 8);
	});

	const hotTakes = $derived.by<AnimeShowcaseItem[]>(() => {
		return completedEntries
			.filter(isShowcaseMedia)
			.filter((entry) => (entry.list_status?.score ?? 0) > 0)
			.filter((entry) => typeof entry.node.mean === 'number')
			.filter((entry) => (entry.node.mean ?? 0) >= 8.0)
			.map((entry) => {
				const userScore = entry.list_status?.score ?? 0;
				const malScore = entry.node.mean ?? 0;

				return {
					entry,
					userScore,
					malScore,
					diff: userScore - malScore,
					popularity: entry.node.popularity ?? null
				};
			})
			.filter((item) => (item.diff ?? 0) < 0)
			.sort((a, b) => (a.diff ?? 0) - (b.diff ?? 0))
			.slice(0, 8);
	});

	const mostObscure = $derived.by<AnimeShowcaseItem[]>(() => {
		return completedEntries
			.filter(isShowcaseMedia)
			.filter((entry) => (entry.list_status?.score ?? 0) >= 8)
			.filter((entry) => (entry.node.popularity ?? 0) > 0)
			.map((entry) => {
				const userScore = entry.list_status?.score ?? 0;
				const malScore = entry.node.mean ?? null;

				return {
					entry,
					userScore,
					malScore,
					diff: typeof malScore === 'number' ? userScore - malScore : null,
					popularity: entry.node.popularity ?? null
				};
			})
			.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
			.slice(0, 8);
	});

	const popularMisses = $derived.by<AnimeShowcaseItem[]>(() => {
		return completedEntries
			.filter(isShowcaseMedia)
			.filter((entry) => (entry.list_status?.score ?? 0) > 0)
			.filter((entry) => (entry.list_status?.score ?? 0) <= 6)
			.filter((entry) => (entry.node.popularity ?? 0) > 0)
			.map((entry) => {
				const userScore = entry.list_status?.score ?? 0;
				const malScore = entry.node.mean ?? null;

				return {
					entry,
					userScore,
					malScore,
					diff: typeof malScore === 'number' ? userScore - malScore : null,
					popularity: entry.node.popularity ?? null
				};
			})
			.sort((a, b) => {
				const popularityDiff = (a.popularity ?? Infinity) - (b.popularity ?? Infinity);

				if (popularityDiff !== 0) return popularityDiff;

				return a.userScore - b.userScore;
			})
			.slice(0, 8);
	});
</script>

<div class="grid min-w-0 gap-2">
	<Panel class="flex min-w-0 flex-col gap-2">
		{#if animeData.userListLoading}
			<p class="text-sm text-text-muted">Loading...</p>
		{:else if animeData.userListError}
			<p class="text-sm text-primary">{animeData.userListError}</p>
		{:else if !animeData.hasUserList}
			<p class="text-sm text-text-muted">Load a MAL username from the navbar first.</p>
		{:else}
			<div class="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
				{#each stats as stat (stat.label)}
					<div class="min-w-0">
						<StatCard label={stat.label} value={stat.value} hint={stat.hint} />
					</div>
				{/each}
			</div>

			<div class="grid min-w-0 gap-2 lg:grid-cols-2">
				{#each charts as chart (chart.title)}
					<div class="min-w-0">
						<AnimeBarChart title={chart.title} data={chart.data} maxRows={chart.maxRows} />
					</div>
				{/each}
			</div>

			<div class="grid min-w-0 gap-2 lg:grid-cols-2">
				<div class="min-w-0">
					<AnimeBreakdownTable title="Genre breakdown" rows={genreBreakdown} maxRows={10} />
				</div>

				<div class="min-w-0">
					<AnimeBreakdownTable title="Studio breakdown" rows={studioBreakdown} maxRows={10} />
				</div>
			</div>

			<div class="grid min-w-0 gap-2 lg:grid-cols-2">
				<div class="min-w-0">
					<AnimeLeaderboard
						title="Longest completed runtime"
						rows={longestCompletedRuntime}
						columns={longestCompletedRuntimeColumns}
						getHref={(row) => getAnimeUrl(row.entry.node.id)}
					/>
				</div>

				<div class="min-w-0">
					<AnimeLeaderboard
						title="Top rewatches"
						rows={topRewatches}
						columns={topRewatchColumns}
						getHref={(row) => getAnimeUrl(row.entry.node.id)}
					/>
				</div>
			</div>

			<div class="grid min-w-0 gap-2 lg:grid-cols-2">
				<div class="min-w-0">
					<AnimeShowcase
						title="Hidden gems"
						description="Completed anime you rated 8+, with MAL mean below 7.9."
						items={hiddenGems}
					/>
				</div>

				<div class="min-w-0">
					<AnimeShowcase
						title="Hot takes"
						description="MAL mean is 8.0+, but your score is lower."
						items={hotTakes}
					/>
				</div>

				<div class="min-w-0">
					<AnimeShowcase
						title="Most obscure"
						description="Completed anime you rated 8+, sorted by popularity rank."
						items={mostObscure}
						metric="popularity"
					/>
				</div>

				<div class="min-w-0">
					<AnimeShowcase
						title="Popular misses"
						description="Popular completed anime you scored 6 or lower."
						items={popularMisses}
						metric="popularity"
					/>
				</div>
			</div>
		{/if}
	</Panel>
</div>