<script lang="ts">
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';

	import AnimeHeader from '$lib/components/anime/AnimeHeader.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorBanner from '$lib/components/ui/ErrorBanner.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import ResultsPanel from '$lib/components/ui/ResultsPanel.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';

	import { fetchAnimeList, searchAnimeFranchise } from '$lib/api/anime';

	import type { Anime, AnimeFranchiseApiResponse, ApiAnimeStatus } from '$lib/types/anime';

	type FranchiseSource = {
		id: number;
		title: string;
		image: string | null;
		limited: boolean;
		done: boolean;
	};

	type FranchiseAnime = Anime & {
		sourceIds: Set<number>;
	};

	type UserAnimeMap = Map<number, Anime>;

	type StreamAnimeEvent = {
		type: 'selected' | 'anime';
		anime: Anime;
	};

	type StreamDoneEvent = {
		type: 'done';
		limited: boolean;
	};

	type StreamErrorEvent = {
		message?: string;
	};

	const STATUS_LABELS: Record<ApiAnimeStatus | 'none', string> = {
		completed: 'completed',
		watching: 'watching',
		on_hold: 'on hold',
		dropped: 'dropped',
		plan_to_watch: 'plan to watch',
		none: 'not in list'
	};

	const STATUS_CLASSES: Record<ApiAnimeStatus | 'none', string> = {
		completed: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
		watching: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
		on_hold: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
		dropped: 'border-red-400/40 bg-red-400/10 text-red-200',
		plan_to_watch: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
		none: 'border-white/10 bg-white/[0.03] text-neutral-500'
	};

	const SEARCH_RESULT_IN_FRANCHISE_CLASS = 'border-accent/50 bg-accent/10 text-white';
	const SEARCH_RESULT_DEFAULT_CLASS =
		'border-white/10 bg-black/20 text-neutral-300 hover:border-white/25 hover:bg-white/[0.04] hover:text-white';

	const SOURCE_CLASSES = [
		'border-accent/50 bg-accent/10 text-accent',
		'border-sky-400/40 bg-sky-400/10 text-sky-200',
		'border-violet-400/40 bg-violet-400/10 text-violet-200',
		'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
		'border-amber-400/40 bg-amber-400/10 text-amber-200',
		'border-pink-400/40 bg-pink-400/10 text-pink-200'
	];

	let username = $state('');
	let animeSearch = $state('');

	let loadingUser = $state(false);
	let loadingSearch = $state(false);
	let error = $state<string | null>(null);

	let userAnimeMap = $state<UserAnimeMap>(new Map());
	let selectedSources = $state<FranchiseSource[]>([]);
	let searchResults = $state<Anime[]>([]);
	let franchiseResponses = $state<AnimeFranchiseApiResponse[]>([]);
	let streamingSourceIds = $state(new Set<number>());

	const activeStreams = new Map<number, EventSource>();

	const loading = $derived(loadingUser || loadingSearch);
	const streaming = $derived(streamingSourceIds.size > 0);

	const addedSourceIds = $derived(new Set(selectedSources.map((source) => source.id)));

	const mergedFranchiseAnimes = $derived.by<FranchiseAnime[]>(() => {
		const map = new Map<number, FranchiseAnime>();

		for (const response of franchiseResponses) {
			const sourceId = response.selectedAnime?.id;

			if (!sourceId) continue;

			for (const anime of response.franchiseAnimes ?? []) {
				const existing = map.get(anime.id);

				if (existing) {
					existing.sourceIds.add(sourceId);
					continue;
				}

				map.set(anime.id, {
					...anime,
					sourceIds: new Set([sourceId])
				});
			}
		}

		return [...map.values()].sort((a, b) => {
			const dateDiff = getReleaseSortValue(a) - getReleaseSortValue(b);

			if (dateDiff !== 0) return dateDiff;

			return a.title.localeCompare(b.title);
		});
	});

	const franchiseAnimeIds = $derived(new Set(mergedFranchiseAnimes.map((anime) => anime.id)));
	const franchiseCount = $derived(mergedFranchiseAnimes.length);

	const watchedCount = $derived(
		mergedFranchiseAnimes.filter((anime) => getUserAnime(anime)?.status === 'completed').length
	);

	const totalRuntimeSeconds = $derived(
		mergedFranchiseAnimes.reduce((sum, anime) => {
			const episodes = anime.totalEpisodes ?? 0;
			const duration = anime.averageEpisodeDuration ?? 0;

			return sum + episodes * duration;
		}, 0)
	);

	const watchedRuntimeSeconds = $derived(
		mergedFranchiseAnimes.reduce((sum, anime) => {
			const userAnime = getUserAnime(anime);
			const watchedEpisodes = userAnime?.episodesWatched ?? 0;
			const duration = anime.averageEpisodeDuration ?? 0;

			return sum + watchedEpisodes * duration;
		}, 0)
	);

	const setSourceStreaming = (sourceId: number, active: boolean) => {
		const next = new Set(streamingSourceIds);

		if (active) {
			next.add(sourceId);
		} else {
			next.delete(sourceId);
		}

		streamingSourceIds = next;
	};

	const parseStreamEvent = <T>(event: Event) => {
		return JSON.parse((event as MessageEvent<string>).data) as T;
	};

	const updateSource = (sourceId: number, patch: Partial<FranchiseSource>) => {
		selectedSources = selectedSources.map((source) => {
			if (source.id !== sourceId) return source;

			return {
				...source,
				...patch
			};
		});
	};

	const upsertFranchiseResponse = (source: FranchiseSource) => {
		if (franchiseResponses.some((response) => response.selectedAnime?.id === source.id)) return;

		franchiseResponses = [
			...franchiseResponses,
			{
				query: source.title,
				selectedAnime: {
					id: source.id,
					title: source.title,
					image: source.image,
					href: `https://myanimelist.net/anime/${source.id}`,
					rank: null,
					score: 0,
					displayScore: '-',
					customScore: 0,
					status: 'plan_to_watch',
					userStatus: null,
					relationType: null,
					relationTypeFormatted: null,
					startDate: null,
					endDate: null,
					episodesWatched: 0,
					totalEpisodes: null,
					averageEpisodeDuration: null,
					mean: null,
					popularity: null,
					mediaType: null,
					animeStatus: null,
					startSeason: null,
					genres: [],
					tags: [],
					numberOfTimesRewatched: 0
				},
				searchResults: [],
				franchiseAnimes: [],
				relatedAnimes: [],
				count: 0,
				limited: false
			}
		];
	};

	const upsertFranchiseAnime = (sourceId: number, anime: Anime) => {
		franchiseResponses = franchiseResponses.map((response) => {
			if (response.selectedAnime?.id !== sourceId) return response;

			const exists = response.franchiseAnimes.some((item) => item.id === anime.id);

			const franchiseAnimes = exists
				? response.franchiseAnimes.map((item) => (item.id === anime.id ? anime : item))
				: [...response.franchiseAnimes, anime];

			return {
				...response,
				selectedAnime: anime.id === sourceId ? anime : response.selectedAnime,
				franchiseAnimes,
				relatedAnimes: franchiseAnimes.filter((item) => item.id !== sourceId),
				count: franchiseAnimes.length
			};
		});
	};

	const finishFranchiseStream = (sourceId: number, limited: boolean) => {
		updateSource(sourceId, {
			done: true,
			limited
		});

		franchiseResponses = franchiseResponses.map((response) => {
			if (response.selectedAnime?.id !== sourceId) return response;

			return {
				...response,
				limited
			};
		});

		setSourceStreaming(sourceId, false);

		activeStreams.get(sourceId)?.close();
		activeStreams.delete(sourceId);
	};

	const getUserAnime = (anime: Anime) => {
		return userAnimeMap.get(anime.id) ?? null;
	};

	const getStatus = (anime: Anime): ApiAnimeStatus | 'none' => {
		return getUserAnime(anime)?.status ?? 'none';
	};

	const getStatusLabel = (anime: Anime) => {
		return STATUS_LABELS[getStatus(anime)];
	};

	const getStatusClass = (anime: Anime) => {
		return STATUS_CLASSES[getStatus(anime)];
	};

	const getSourceClass = (sourceId: number) => {
		const index = selectedSources.findIndex((source) => source.id === sourceId);

		return SOURCE_CLASSES[Math.max(0, index) % SOURCE_CLASSES.length];
	};

	const formatDecimal = (value: number, digits = 1) => {
		return value.toFixed(digits);
	};

	const formatDuration = (seconds: number | null | undefined) => {
		if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '—';

		if (seconds < 60) return `${Math.round(seconds)}s`;

		const minutes = seconds / 60;
		const hours = seconds / 3600;
		const days = hours / 24;

		if (days >= 1) return `${formatDecimal(days, 1)}d`;
		if (hours >= 1) return `${formatDecimal(hours, 1)}h`;

		return `${Math.round(minutes)}m`;
	};

	const formatMediaType = (mediaType: string | null) => {
		return mediaType?.replaceAll('_', ' ') ?? 'unknown';
	};

	const formatEpisodes = (anime: Anime) => {
		const episodes = anime.totalEpisodes ?? 0;

		if (episodes <= 0) return 'unknown eps';

		return `${episodes} eps`;
	};

	const formatWatchedEpisodes = (anime: Anime) => {
		const userAnime = getUserAnime(anime);
		const watched = userAnime?.episodesWatched ?? 0;
		const total = anime.totalEpisodes ?? userAnime?.totalEpisodes ?? 0;

		if (!userAnime) return null;
		if (total <= 0) return `${watched} watched`;

		return `${watched}/${total} watched`;
	};

	const formatEpisodeDuration = (seconds: number | null) => {
		const duration = formatDuration(seconds);

		if (duration === '—') return null;

		return `${duration}/ep`;
	};

	const getTotalDuration = (anime: Anime) => {
		const episodes = anime.totalEpisodes ?? 0;
		const duration = anime.averageEpisodeDuration ?? 0;

		return formatDuration(episodes * duration);
	};

	const formatDate = (date: string | null | undefined) => {
		return date?.trim() || null;
	};

	const formatReleaseRange = (anime: Anime) => {
		const startDate = formatDate(anime.startDate);
		const endDate = formatDate(anime.endDate);

		if (startDate && endDate) return `${startDate} → ${endDate}`;
		if (startDate) return startDate;

		const season = anime.startSeason?.season;
		const year = anime.startSeason?.year;

		if (season && year) return `${season} ${year}`;
		if (year) return String(year);

		return 'unknown date';
	};

	const getReleaseSortValue = (anime: Anime) => {
		if (anime.startDate) {
			const [year, month = '1', day = '1'] = anime.startDate.split('-');
			const parsedYear = Number(year);
			const parsedMonth = Number(month);
			const parsedDay = Number(day);

			if (Number.isFinite(parsedYear)) {
				return (
					parsedYear * 10000 +
					(Number.isFinite(parsedMonth) ? parsedMonth : 1) * 100 +
					(Number.isFinite(parsedDay) ? parsedDay : 1)
				);
			}
		}

		const seasonMonth: Record<string, number> = {
			winter: 1,
			spring: 4,
			summer: 7,
			fall: 10
		};

		const season = anime.startSeason?.season?.toLowerCase();
		const month = season ? (seasonMonth[season] ?? 1) : 1;

		if (anime.startSeason?.year) {
			return anime.startSeason.year * 10000 + month * 100 + 1;
		}

		return Number.POSITIVE_INFINITY;
	};

	const searchAnime = async () => {
		const query = animeSearch.trim();

		if (!query) {
			error = 'Enter an anime title.';
			return;
		}

		try {
			loadingSearch = true;
			error = null;

			const response = await searchAnimeFranchise(query);

			searchResults = response.searchResults;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error.';
		} finally {
			loadingSearch = false;
		}
	};

	const loadUser = async () => {
		const trimmedUsername = username.trim();

		if (!trimmedUsername) {
			userAnimeMap = new Map();
			return;
		}

		try {
			loadingUser = true;
			error = null;

			const result = await fetchAnimeList(trimmedUsername);

			userAnimeMap = new Map(result.animes.map((anime) => [anime.id, anime]));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error.';
		} finally {
			loadingUser = false;
		}
	};

	const addFranchise = (anime: Anime) => {
		if (addedSourceIds.has(anime.id)) {
			searchResults = [];
			animeSearch = '';
			return;
		}

		const source: FranchiseSource = {
			id: anime.id,
			title: anime.title,
			image: anime.image,
			limited: false,
			done: false
		};

		selectedSources = [...selectedSources, source];
		upsertFranchiseResponse(source);
		searchResults = [];
		animeSearch = '';

		setSourceStreaming(source.id, true);

		const stream = new EventSource(`/api/franchise/stream?id=${source.id}`);

		activeStreams.set(source.id, stream);

		stream.addEventListener('selected', (event) => {
			const payload = parseStreamEvent<StreamAnimeEvent>(event);

			updateSource(source.id, {
				title: payload.anime.title,
				image: payload.anime.image
			});

			upsertFranchiseAnime(source.id, payload.anime);
		});

		stream.addEventListener('anime', (event) => {
			const payload = parseStreamEvent<StreamAnimeEvent>(event);

			upsertFranchiseAnime(source.id, payload.anime);
		});

		stream.addEventListener('done', (event) => {
			const payload = parseStreamEvent<StreamDoneEvent>(event);

			finishFranchiseStream(source.id, payload.limited);
		});

		stream.addEventListener('error', (event) => {
			try {
				const payload = parseStreamEvent<StreamErrorEvent>(event);

				error = payload.message ?? 'Franchise stream failed.';
			} catch {
				error = 'Franchise stream failed.';
			}

			finishFranchiseStream(source.id, false);
		});

		stream.onerror = () => {
			if (!streamingSourceIds.has(source.id)) return;

			error = 'Franchise stream disconnected.';
			finishFranchiseStream(source.id, false);
		};
	};

	const removeFranchise = (sourceId: number) => {
		activeStreams.get(sourceId)?.close();
		activeStreams.delete(sourceId);

		setSourceStreaming(sourceId, false);

		selectedSources = selectedSources.filter((source) => source.id !== sourceId);

		franchiseResponses = franchiseResponses.filter((response) => {
			return response.selectedAnime?.id !== sourceId;
		});
	};

	onMount(() => {
		const initialUsername = page.url.searchParams.get('username')?.trim() ?? '';
		const initialQuery = page.url.searchParams.get('q')?.trim() ?? '';

		username = initialUsername;
		animeSearch = initialQuery;

		if (initialUsername) {
			void loadUser();
		}

		if (initialQuery) {
			void searchAnime();
		}
	});

	onDestroy(() => {
		for (const stream of activeStreams.values()) {
			stream.close();
		}

		activeStreams.clear();
	});
</script>

<svelte:head>
	<title>Anime Franchise</title>
	<meta name="description" content="Search anime franchises and compare them with a MAL user list." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="franchise"
		bind:username
		query={animeSearch}
		loading={loadingUser}
		inputPlaceholder="MAL username"
		onSubmit={() => void loadUser()}
	/>

	<ErrorBanner message={error} />

	{#if loading && selectedSources.length === 0 && searchResults.length === 0}
		<LoadingState message="loading franchise data" />
	{:else}
		<ResultsPanel>
			<div class="border-b border-white/10 bg-background px-3 py-2">
				<p class="truncate text-sm text-neutral-300">
					<span class="font-medium text-white">{franchiseCount}</span>
					<span class="ml-1 text-neutral-500">entries</span>

					{#if username.trim()}
						<span class="ml-3 font-medium text-white">{watchedCount}</span>
						<span class="ml-1 text-neutral-500">completed by {username.trim()}</span>
					{/if}

					{#if totalRuntimeSeconds > 0}
						<span class="ml-3 text-neutral-500">total {formatDuration(totalRuntimeSeconds)}</span>
					{/if}

					{#if watchedRuntimeSeconds > 0}
						<span class="ml-3 text-neutral-500">watched {formatDuration(watchedRuntimeSeconds)}</span>
					{/if}

					{#if streaming}
						<span class="ml-3 text-accent">streaming…</span>
					{/if}
				</p>
			</div>

			<div class="space-y-3 p-2 sm:p-3">
				<section class="rounded-xl border border-white/10 bg-white/[0.02]">
					<div class="border-b border-white/10 px-3 py-2">
						<h2 class="text-sm font-medium text-white">anime search</h2>
					</div>

					<form
						class="grid gap-2 p-2 sm:grid-cols-[1fr_auto]"
						onsubmit={(event) => {
							event.preventDefault();
							void searchAnime();
						}}
					>
						<input
							bind:value={animeSearch}
							placeholder="anime title"
							disabled={loadingSearch}
							class="min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
						/>

						<button
							type="submit"
							disabled={loadingSearch}
							class="cursor-pointer rounded-lg border border-accent/50 bg-accent px-3 py-2 text-sm font-medium text-black transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loadingSearch ? 'searching' : 'search anime'}
						</button>
					</form>
				</section>

				{#if selectedSources.length > 0}
					<section class="rounded-xl border border-white/10 bg-white/[0.02]">
						<div class="border-b border-white/10 px-3 py-2">
							<h2 class="text-sm font-medium text-white">selected franchises</h2>
						</div>

						<div class="flex flex-wrap gap-2 p-2">
							{#each selectedSources as source (source.id)}
								<button
									type="button"
									class={[
										'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition hover:border-white/30 hover:text-white',
										getSourceClass(source.id)
									]}
									onclick={() => removeFranchise(source.id)}
								>
									{#if source.image}
										<img src={source.image} alt={source.title} class="h-7 w-7 rounded object-cover" />
									{/if}

									<span class="max-w-40 truncate">{source.title}</span>

									{#if streamingSourceIds.has(source.id)}
										<span class="text-accent">loading…</span>
									{:else if source.limited}
										<span class="text-amber-300">limited</span>
									{:else}
										<span class="text-neutral-500">×</span>
									{/if}
								</button>
							{/each}
						</div>
					</section>
				{/if}

				{#if searchResults.length > 0}
					<section class="rounded-xl border border-white/10 bg-white/[0.02]">
						<div class="border-b border-white/10 px-3 py-2">
							<h2 class="text-sm font-medium text-white">anime search results</h2>
							<p class="mt-0.5 text-xs text-neutral-500">
								Highlighted entries are already present in the merged franchise list.
							</p>
						</div>

						<div class="divide-y divide-white/10">
							{#each searchResults as anime (anime.id)}
								{@const alreadyInFranchise = franchiseAnimeIds.has(anime.id)}
								<button
									type="button"
									class={[
										'grid w-full cursor-pointer grid-cols-[44px_1fr] items-center gap-3 border-l-2 px-3 py-2 text-left transition',
										alreadyInFranchise ? SEARCH_RESULT_IN_FRANCHISE_CLASS : SEARCH_RESULT_DEFAULT_CLASS
									]}
									onclick={() => addFranchise(anime)}
								>
									{#if anime.image}
										<img src={anime.image} alt={anime.title} class="h-11 w-11 rounded object-cover" />
									{:else}
										<div class="h-11 w-11 rounded border border-white/10 bg-black/30"></div>
									{/if}

									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{anime.title}</p>
										<p class="truncate text-xs text-neutral-500">
											{formatReleaseRange(anime)} · {formatMediaType(anime.mediaType)} · {formatEpisodes(anime)}
										</p>
									</div>
								</button>
							{/each}
						</div>
					</section>
				{/if}

				{#if mergedFranchiseAnimes.length > 0}
					<section class="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
						<div class="border-b border-white/10 px-3 py-2">
							<h2 class="text-sm font-medium text-white">release order</h2>
							<p class="mt-0.5 text-xs text-neutral-500">
								Entries are appended as MAL details finish loading, then sorted by release date.
							</p>
						</div>

						<div class="divide-y divide-white/10">
							{#each mergedFranchiseAnimes as anime, index (anime.id)}
								{@const userAnime = getUserAnime(anime)}
								{@const watchedLabel = formatWatchedEpisodes(anime)}

								<a
									href={anime.href}
									target="_blank"
									rel="noreferrer"
									class="grid gap-3 px-3 py-2 transition hover:bg-white/[0.03] sm:grid-cols-[36px_56px_170px_1fr_auto]"
								>
									<div class="pt-2 text-right font-mono text-[11px] text-neutral-600">
										{String(index + 1).padStart(2, '0')}
									</div>

									{#if anime.image}
										<img src={anime.image} alt={anime.title} class="h-14 w-14 rounded object-cover" />
									{:else}
										<div class="h-14 w-14 rounded border border-white/10 bg-black/30"></div>
									{/if}

									<div class="hidden pt-1 sm:block">
										<p class="font-mono flex flex-col text-xs text-accent">
											<span>{anime.startDate ?? 'unknown start date'}</span>
											<span>{anime.endDate ?? 'unknown end date'}</span>
										</p>
										<p class="mt-1 truncate text-[11px] text-neutral-500">
											{formatMediaType(anime.mediaType)}
										</p>
									</div>

									<div class="min-w-0 pt-1">
										<h3 class="min-w-0 truncate text-sm font-medium text-white">{anime.title}</h3>

										<p class="mt-1 truncate text-xs text-neutral-500 sm:hidden">
											{formatReleaseRange(anime)} · {formatMediaType(anime.mediaType)}
										</p>

										<p class="mt-1 truncate text-xs text-neutral-500">
											{formatEpisodes(anime)}
											{#if formatEpisodeDuration(anime.averageEpisodeDuration)}
												· {formatEpisodeDuration(anime.averageEpisodeDuration)}
											{/if}
											{#if getTotalDuration(anime) !== '—'}
												· total {getTotalDuration(anime)}
											{/if}
											{#if watchedLabel}
												· {watchedLabel}
											{/if}
											{#if userAnime?.displayScore && userAnime.displayScore !== '-'}
												· score {userAnime.displayScore}
											{/if}
										</p>

										{#if anime.sourceIds.size > 1}
											<div class="mt-1 flex flex-wrap gap-1">
												{#each [...anime.sourceIds] as sourceId (sourceId)}
													{@const source = selectedSources.find((item) => item.id === sourceId)}
													{#if source}
														<span class={['rounded border px-1.5 py-0.5 text-[10px]', getSourceClass(sourceId)]}>
															{source.title}
														</span>
													{/if}
												{/each}
											</div>
										{/if}
									</div>

									<div class="hidden pt-1 text-right sm:block">
										<p class={['rounded border px-2 py-1 text-[11px]', getStatusClass(anime)]}>
											{getStatusLabel(anime)}
										</p>
									</div>
								</a>
							{/each}
						</div>
					</section>
				{:else}
					<EmptyState
						title="Search an anime."
						description="Load a MAL user, search an anime, then add one or more franchises."
					/>
				{/if}
			</div>
		</ResultsPanel>
	{/if}
</Shell>