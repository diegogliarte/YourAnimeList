<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import RecommendationRow from '$lib/components/anime/RecommendationRow.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';

	import type {
		Anime,
		AnimeRankingApiResponse,
		AnimeRankingType,
		ApiAnimeStatus,
		RankedAnime
	} from '$lib/types/anime';

	type Option<T extends string> = {
		value: T;
		label: string;
	};

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

	let username = $state(initialUsername);
	let loadedUsername = $state('');
	let search = $state(initialSearch);
	let rankingType = $state<AnimeRankingType>(
		isAnimeRankingType(initialRankingType) ? initialRankingType : 'all'
	);
	let excludedStatuses = $state<ApiAnimeStatus[]>(parseExcludedStatuses(initialExclude));
	let data = $state<AnimeRankingApiResponse | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	const excludedStatusSet = $derived(new Set(excludedStatuses));

	const formatStatus = (status: string) => {
		return status
			.split('_')
			.map((word) => word[0].toUpperCase() + word.slice(1))
			.join(' ');
	};

	const formatSeason = (season: Anime['startSeason']) => {
		if (!season?.year) return null;
		if (!season.season) return String(season.year);

		return `${formatStatus(season.season)} ${season.year}`;
	};

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
											 replaceState = true
										 }: {
		nextUsername?: string;
		nextSearch?: string;
		nextRankingType?: AnimeRankingType;
		nextExcludedStatuses?: ApiAnimeStatus[];
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

		const href = params.toString()
			? `/recommendations?${params.toString()}`
			: '/recommendations';

		void goto(href, {
			replaceState,
			noScroll: true,
			keepFocus: true
		});
	};

	const loadRecommendations = async (targetUsername = username) => {
		const trimmedUsername = targetUsername.trim();

		if (!trimmedUsername) {
			error = 'Enter a username.';
			return;
		}

		try {
			loading = true;
			error = null;
			data = null;

			const params = new URLSearchParams({
				username: trimmedUsername,
				rankingType,
				limit: '100'
			});

			if (excludedStatuses.length === 0) {
				params.set('exclude', 'none');
			} else {
				params.set('exclude', excludedStatuses.join(','));
			}

			const response = await fetch(`/api/recommendations?${params.toString()}`);
			const result = (await response.json()) as AnimeRankingApiResponse & {
				error?: string;
				detail?: string;
			};

			if (!response.ok) {
				throw new Error(result.detail || result.error || `Request failed with ${response.status}`);
			}

			const resultUsername = result.username ?? trimmedUsername;

			data = result;
			username = resultUsername;
			loadedUsername = resultUsername;

			updateUrl({
				nextUsername: resultUsername,
				replaceState: false
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error.';
		} finally {
			loading = false;
		}
	};

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		void loadRecommendations();
	};

	const handleRankingTypeChange = (nextRankingType: AnimeRankingType) => {
		rankingType = nextRankingType;

		updateUrl({
			nextRankingType
		});

		if (loadedUsername) {
			void loadRecommendations(loadedUsername);
		}
	};

	const handleExcludeNone = () => {
		excludedStatuses = [];

		updateUrl({
			nextExcludedStatuses: []
		});

		if (loadedUsername) {
			void loadRecommendations(loadedUsername);
		}
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

		if (loadedUsername) {
			void loadRecommendations(loadedUsername);
		}
	};

	const handleTitleSearchInput = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;

		search = target.value;

		updateUrl({
			nextSearch: search
		});
	};

	onMount(() => {
		if (initialUsername.trim()) {
			void loadRecommendations(initialUsername);
		}
	});
</script>

<svelte:head>
	<title>Anime Recommendations</title>
	<meta name="description" content="MyAnimeList ranking-based anime recommendations." />
</svelte:head>

<Shell>
	<header class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<a href="/" class="cursor-pointer text-sm font-semibold tracking-tight text-white">
				anime
			</a>

			<Tabs
				tabs={[
					{
						label: 'list',
						href: '/',
						active: false
					},
					{
						label: 'recommendations',
						href: '/recommendations',
						active: true
					}
				]}
			/>
		</div>

		<form class="flex gap-2" onsubmit={handleSubmit}>
			<Input
				class="w-44 sm:w-56"
				placeholder="username"
				autocomplete="off"
				bind:value={username}
			/>

			<Button type="submit" variant="solid" disabled={loading}>
				{loading ? '...' : 'search'}
			</Button>
		</form>
	</header>

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
							<span class="text-neutral-500">/{data.count}</span>
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
				</div>
			</div>

			{#if filteredAnimes.length === 0}
				<div class="px-3 py-10 text-center text-sm text-neutral-500">
					No recommendations.
				</div>
			{:else}
				<div
					class="grid grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_4rem_3rem_5.5rem] items-center gap-3 border-b border-white/[0.07] px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-neutral-500"
				>
					<span>rank</span>
					<span></span>
					<span>title</span>
					<span class="text-left">mean</span>
					<span class="text-right">eps</span>
					<span class="text-right">season</span>
				</div>

				<ol class="divide-y divide-white/[0.07]">
					{#each filteredAnimes as anime, index}
						<RecommendationRow
							{anime}
							{index}
							season={formatSeason(anime.startSeason)}
						/>
					{/each}
				</ol>
			{/if}
		</section>
	{:else}
		<section class="rounded-lg border border-white/10 bg-neutral-900/90 px-3 py-10 text-center shadow-xl shadow-black/20">
			<h1 class="text-base font-medium text-white">Search a MyAnimeList profile.</h1>
			<p class="mt-1 text-sm text-neutral-500">
				Recommendations use MAL rankings and remove your excluded list statuses.
			</p>
		</section>
	{/if}
</Shell>