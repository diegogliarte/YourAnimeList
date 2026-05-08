<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import AnimeHeader from '$lib/components/anime/AnimeHeader.svelte';
	import AnimeTable from '$lib/components/anime/AnimeTable.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';

	import type {
		AnimeRankingApiResponse,
		AnimeRankingType,
		ApiAnimeStatus
	} from '$lib/types/anime';

	type Option<T extends string> = {
		value: T;
		label: string;
	};

	const PAGE_SIZE = 100;

	const RANKING_TYPES: Array<Option<AnimeRankingType>> = [
		{ value: 'all', label: 'top' },
		{ value: 'airing', label: 'airing' },
		{ value: 'upcoming', label: 'upcoming' },
		{ value: 'tv', label: 'tv' },
		{ value: 'movie', label: 'movies' },
		{ value: 'ova', label: 'ova' },
		{ value: 'special', label: 'specials' },
		{ value: 'bypopularity', label: 'popular' },
		{ value: 'favorite', label: 'favorites' }
	];

	const EXCLUDE_STATUS_OPTIONS: Array<Option<ApiAnimeStatus>> = [
		{ value: 'completed', label: 'completed' },
		{ value: 'watching', label: 'watching' },
		{ value: 'on_hold', label: 'on hold' },
		{ value: 'dropped', label: 'dropped' },
		{ value: 'plan_to_watch', label: 'plan to watch' }
	];

	const RANKING_TYPE_VALUES = RANKING_TYPES.map((rankingType) => rankingType.value);
	const EXCLUDE_STATUS_VALUES = EXCLUDE_STATUS_OPTIONS.map((status) => status.value);

	const isAnimeRankingType = (value: string | null): value is AnimeRankingType => {
		return RANKING_TYPE_VALUES.includes(value as AnimeRankingType);
	};

	const isApiAnimeStatus = (value: string | null): value is ApiAnimeStatus => {
		return EXCLUDE_STATUS_VALUES.includes(value as ApiAnimeStatus);
	};

	const parseExcludedStatuses = (value: string | null): ApiAnimeStatus[] => {
		if (!value) return ['completed'];
		if (value === 'none') return [];

		const statuses: ApiAnimeStatus[] = [];

		for (const rawStatus of value.split(',')) {
			const status = rawStatus.trim();

			if (isApiAnimeStatus(status) && !statuses.includes(status)) {
				statuses.push(status);
			}
		}

		return statuses;
	};

	const initialUsername = page.url.searchParams.get('username') ?? '';
	const initialSearch = page.url.searchParams.get('q') ?? '';
	const initialRankingType = page.url.searchParams.get('rankingType');
	const initialExclude = page.url.searchParams.get('exclude');
	const initialScoreVisibility = page.url.searchParams.get('score');

	let username = $state(initialUsername);
	let loadedUsername = $state('');
	let search = $state(initialSearch);
	let rankingType = $state<AnimeRankingType>(
		isAnimeRankingType(initialRankingType) ? initialRankingType : 'all'
	);
	let excludedStatuses = $state<ApiAnimeStatus[]>(parseExcludedStatuses(initialExclude));
	let showScore = $state(initialScoreVisibility !== 'hide');

	let data = $state<AnimeRankingApiResponse | null>(null);
	let nextOffset = $state<number | null>(null);
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let sentinelEl = $state<HTMLDivElement | null>(null);

	const excludedStatusSet = $derived(new Set(excludedStatuses));
	const hasMore = $derived(nextOffset !== null);

	const filteredAnimes = $derived.by(() => {
		if (!data?.animes) return [];

		const normalizedSearch = search.trim().toLowerCase();

		if (!normalizedSearch) return data.animes;

		return data.animes.filter((anime) => {
			return anime.title.toLowerCase().includes(normalizedSearch);
		});
	});

	const updateUrl = ({
											 nextUsername = loadedUsername || username,
											 nextSearch = search,
											 nextRankingType = rankingType,
											 nextExcludedStatuses = excludedStatuses,
											 nextShowScore = showScore,
											 replaceState = true
										 }: {
		nextUsername?: string;
		nextSearch?: string;
		nextRankingType?: AnimeRankingType;
		nextExcludedStatuses?: ApiAnimeStatus[];
		nextShowScore?: boolean;
		replaceState?: boolean;
	} = {}) => {
		const params = new URLSearchParams();

		const trimmedUsername = nextUsername.trim();
		const trimmedSearch = nextSearch.trim();

		if (trimmedUsername) params.set('username', trimmedUsername);
		if (trimmedSearch) params.set('q', trimmedSearch);
		if (nextRankingType !== 'all') params.set('rankingType', nextRankingType);

		if (nextExcludedStatuses.length === 0) {
			params.set('exclude', 'none');
		} else if (
			nextExcludedStatuses.length !== 1 ||
			nextExcludedStatuses[0] !== 'completed'
		) {
			params.set('exclude', nextExcludedStatuses.join(','));
		}

		if (!nextShowScore) {
			params.set('score', 'hide');
		}

		const href = params.toString()
			? `/recommendations?${params.toString()}`
			: '/recommendations';

		void goto(href, {
			replaceState,
			noScroll: true,
			keepFocus: true
		});
	};

	const buildRecommendationParams = ({
																			 targetUsername,
																			 offset
																		 }: {
		targetUsername: string;
		offset: number;
	}) => {
		const params = new URLSearchParams({
			username: targetUsername,
			rankingType,
			limit: String(PAGE_SIZE),
			offset: String(offset)
		});

		if (excludedStatuses.length === 0) {
			params.set('exclude', 'none');
		} else {
			params.set('exclude', excludedStatuses.join(','));
		}

		return params;
	};

	const loadRecommendations = async ({
																			 targetUsername = username,
																			 offset = 0,
																			 append = false
																		 }: {
		targetUsername?: string;
		offset?: number;
		append?: boolean;
	} = {}) => {
		const trimmedUsername = targetUsername.trim();

		if (!trimmedUsername) {
			error = 'Enter a username.';
			return;
		}

		if (append) {
			if (loadingMore || loading || nextOffset === null) return;

			loadingMore = true;
		} else {
			loading = true;
			data = null;
			nextOffset = null;
		}

		try {
			error = null;

			const params = buildRecommendationParams({
				targetUsername: trimmedUsername,
				offset
			});

			const response = await fetch(`/api/recommendations?${params.toString()}`);
			const result = (await response.json()) as AnimeRankingApiResponse & {
				error?: string;
				detail?: string;
			};

			if (!response.ok) {
				throw new Error(result.detail || result.error || `Request failed with ${response.status}`);
			}

			const resultUsername = result.username ?? trimmedUsername;

			username = resultUsername;
			loadedUsername = resultUsername;
			nextOffset = result.nextOffset;

			if (append && data) {
				const existingIds = new Set(data.animes.map((anime) => anime.id));
				const newAnimes = result.animes.filter((anime) => !existingIds.has(anime.id));

				data = {
					...result,
					count: data.count + newAnimes.length,
					animes: [...data.animes, ...newAnimes]
				};
			} else {
				data = result;
			}

			updateUrl({
				nextUsername: resultUsername,
				replaceState: false
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error.';
		} finally {
			loading = false;
			loadingMore = false;
		}
	};

	const reloadRecommendations = () => {
		if (!loadedUsername && !username.trim()) return;

		void loadRecommendations({
			targetUsername: loadedUsername || username,
			offset: 0,
			append: false
		});
	};

	const loadMoreRecommendations = () => {
		if (nextOffset === null) return;

		void loadRecommendations({
			targetUsername: loadedUsername || username,
			offset: nextOffset,
			append: true
		});
	};

	const handleSubmit = () => {
		void loadRecommendations({
			targetUsername: username,
			offset: 0,
			append: false
		});
	};

	const handleRankingTypeChange = (nextRankingType: AnimeRankingType) => {
		rankingType = nextRankingType;

		updateUrl({
			nextRankingType
		});

		reloadRecommendations();
	};

	const handleExcludeNone = () => {
		excludedStatuses = [];

		updateUrl({
			nextExcludedStatuses: []
		});

		reloadRecommendations();
	};

	const handleExcludeStatusToggle = (status: ApiAnimeStatus) => {
		let nextExcludedStatuses: ApiAnimeStatus[];

		if (excludedStatuses.includes(status)) {
			nextExcludedStatuses = excludedStatuses.filter((excludedStatus) => excludedStatus !== status);
		} else {
			nextExcludedStatuses = [...excludedStatuses, status];
		}

		excludedStatuses = nextExcludedStatuses;

		updateUrl({
			nextExcludedStatuses
		});

		reloadRecommendations();
	};

	const handleScoreVisibilityToggle = () => {
		showScore = !showScore;

		updateUrl({
			nextShowScore: showScore
		});
	};

	const handleTitleSearchInput = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;

		search = target.value;

		updateUrl({
			nextSearch: search
		});
	};

	$effect(() => {
		const element = sentinelEl;

		if (!element || !data || !hasMore || loading || loadingMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					loadMoreRecommendations();
				}
			},
			{
				rootMargin: '600px 0px'
			}
		);

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	});

	onMount(() => {
		if (initialUsername.trim()) {
			void loadRecommendations({
				targetUsername: initialUsername,
				offset: 0,
				append: false
			});
		}
	});
</script>

<svelte:head>
	<title>Anime Recommendations</title>
	<meta name="description" content="MyAnimeList ranking-based anime recommendations." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="recommendations"
		bind:username
		query={search}
		loading={loading || loadingMore}
		onSubmit={handleSubmit}
	/>

	{#if error}
		<div class="mb-3 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-accent">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="mx-auto mt-8 animate-pulse text-center text-xl text-accent">
			fetching rankings
		</div>
	{:else if data}
		<section class="overflow-hidden rounded-lg border border-white/10 bg-background shadow-xl shadow-black/20">
			<div class="border-b border-white/10 bg-background px-3 py-2">
				<div class="flex flex-col gap-2">
					<div class="flex min-w-0 items-center gap-2">
						<p class="truncate text-sm text-neutral-300">
							<span class="font-medium text-white">{loadedUsername}</span>
							<span class="text-neutral-600"> · </span>
							<span>{filteredAnimes.length}</span>
							<span class="text-neutral-500"> loaded</span>
						</p>

						<Input
							class="w-40"
							placeholder="filter"
							bind:value={search}
							oninput={handleTitleSearchInput}
						/>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<span class="w-12 py-1 text-xs font-medium text-accent">type</span>

						{#each RANKING_TYPES as option}
							<button
								type="button"
								class={[
									'cursor-pointer rounded px-2 py-1 text-xs font-medium transition',
									rankingType === option.value
										? 'bg-accent/10 text-accent'
										: 'bg-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-white'
								]
									.filter(Boolean)
									.join(' ')}
								onclick={() => handleRankingTypeChange(option.value)}
							>
								{option.label}
							</button>
						{/each}
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<span class="w-12 py-1 text-xs font-medium text-accent">exclude</span>

						<button
							type="button"
							class={[
								'cursor-pointer rounded px-2 py-1 text-xs font-medium transition',
								excludedStatuses.length === 0
									? 'bg-accent/10 text-accent'
									: 'bg-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-white'
							]
								.filter(Boolean)
								.join(' ')}
							onclick={handleExcludeNone}
						>
							none
						</button>

						{#each EXCLUDE_STATUS_OPTIONS as option}
							<button
								type="button"
								class={[
									'cursor-pointer rounded px-2 py-1 text-xs font-medium transition',
									excludedStatusSet.has(option.value)
										? 'bg-accent/10 text-accent'
										: 'bg-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-white'
								]
									.filter(Boolean)
									.join(' ')}
								onclick={() => handleExcludeStatusToggle(option.value)}
							>
								{option.label}
							</button>
						{/each}
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<span class="w-12 py-1 text-xs font-medium text-accent">view</span>

						<button
							type="button"
							class={[
								'cursor-pointer rounded px-2 py-1 text-xs font-medium transition',
								showScore
									? 'bg-accent/10 text-accent'
									: 'bg-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-white'
							]
								.filter(Boolean)
								.join(' ')}
							onclick={handleScoreVisibilityToggle}
						>
							{showScore ? 'score shown' : 'score hidden'}
						</button>
					</div>
				</div>
			</div>

			<AnimeTable
				mode="ranking"
				animes={filteredAnimes}
				{showScore}
				emptyMessage="No recommendations."
			/>

			{#if hasMore}
				<div bind:this={sentinelEl} class="px-3 py-4 text-center text-xs text-neutral-500">
					{#if loadingMore}
						<span class="text-accent">loading more</span>
					{:else}
						scroll for more
					{/if}
				</div>
			{:else}
				<div class="px-3 py-4 text-center text-xs text-neutral-600">
					end of rankings
				</div>
			{/if}
		</section>
	{:else}
		<section class="rounded-lg border border-white/10 bg-neutral-900/90 px-3 py-10 text-center shadow-xl shadow-black/20">
			<h1 class="text-base font-medium text-white">Search a MyAnimeList profile.</h1>
			<p class="mt-1 text-sm text-neutral-500">
				Recommendations use MAL rankings and can hide entries already in your list.
			</p>
		</section>
	{/if}
</Shell>