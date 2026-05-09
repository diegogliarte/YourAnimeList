<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import AnimeHeader from '$lib/components/anime/AnimeHeader.svelte';
	import AnimeTable from '$lib/components/anime/AnimeTable.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';

	import type {
		Anime,
		AnimeApiResponse,
		AnimeSortMetric,
		ApiAnimeStatus,
		SortDirection
	} from '$lib/types/anime';

	type Option<T extends string> = {
		value: T;
		label: string;
	};

	type AnimeStatusSelection = ApiAnimeStatus | 'all';

	const STATUS_FILTERS: Array<Option<AnimeStatusSelection>> = [
		{ value: 'all', label: 'all' },
		{ value: 'completed', label: 'completed' },
		{ value: 'watching', label: 'watching' },
		{ value: 'on_hold', label: 'on hold' },
		{ value: 'dropped', label: 'dropped' },
		{ value: 'plan_to_watch', label: 'plan to watch' }
	];

	const SORT_OPTIONS: Array<Option<AnimeSortMetric>> = [
		{ value: 'score', label: 'score' },
		{ value: 'title', label: 'title' },
		{ value: 'year', label: 'year' },
		{ value: 'totalEpisodes', label: 'eps' }
	];

	const STATUS_VALUES = STATUS_FILTERS.map((status) => status.value);
	const SORT_VALUES = SORT_OPTIONS.map((sort) => sort.value);
	const DIRECTION_VALUES: SortDirection[] = ['asc', 'desc'];

	const isAnimeStatusSelection = (value: string | null): value is AnimeStatusSelection => {
		return STATUS_VALUES.includes(value as AnimeStatusSelection);
	};

	const isAnimeSortMetric = (value: string | null): value is AnimeSortMetric => {
		return SORT_VALUES.includes(value as AnimeSortMetric);
	};

	const isSortDirection = (value: string | null): value is SortDirection => {
		return DIRECTION_VALUES.includes(value as SortDirection);
	};

	const initialUsername = page.url.searchParams.get('username') ?? '';
	const initialSearch = page.url.searchParams.get('q') ?? '';
	const initialStatus = page.url.searchParams.get('status');
	const initialSort = page.url.searchParams.get('sort');
	const initialDirection = page.url.searchParams.get('dir');

	let username = $state(initialUsername);
	let loadedUsername = $state('');
	let selectedStatus = $state<AnimeStatusSelection>(
		isAnimeStatusSelection(initialStatus) ? initialStatus : 'all'
	);
	let search = $state(initialSearch);
	let sortMetric = $state<AnimeSortMetric>(
		isAnimeSortMetric(initialSort) ? initialSort : 'score'
	);
	let sortDirection = $state<SortDirection>(
		isSortDirection(initialDirection) ? initialDirection : 'desc'
	);
	let data = $state<AnimeApiResponse | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	const SEASON_ORDER: Record<string, number> = {
		winter: 1,
		spring: 2,
		summer: 3,
		fall: 4
	};

	const getSortValue = (
		anime: Anime,
		metric: AnimeSortMetric
	): string | number | null => {
		switch (metric) {
			case 'score':
				return anime.customScore && anime.customScore > 0 ? anime.customScore : null;

			case 'title':
				return anime.title.toLowerCase();

			case 'year': {
				const year = anime.startSeason?.year;
				if (!year) return null;

				const season = anime.startSeason?.season
					? SEASON_ORDER[anime.startSeason.season.toLowerCase()] ?? 0
					: 0;

				return year * 10 + season;
			}

			case 'totalEpisodes':
				return anime.totalEpisodes;
		}
	};

	const filteredAnimes = $derived.by(() => {
		if (!data?.animes) return [];

		const normalizedSearch = search.trim().toLowerCase();

		return [...data.animes]
			.filter((anime) => selectedStatus === 'all' || anime.status === selectedStatus)
			.filter((anime) => {
				if (!normalizedSearch) return true;

				return anime.title.toLowerCase().includes(normalizedSearch);
			})
			.sort((a, b) => {
				const aValue = getSortValue(a, sortMetric);
				const bValue = getSortValue(b, sortMetric);

				const aMissing = aValue === null;
				const bMissing = bValue === null;

				if (aMissing || bMissing) {
					if (aMissing && bMissing) return a.title.localeCompare(b.title);

					return aMissing ? 1 : -1;
				}

				if (typeof aValue === 'string' && typeof bValue === 'string') {
					const result = aValue.localeCompare(bValue);

					if (result !== 0) {
						return sortDirection === 'asc' ? result : -result;
					}

					return a.title.localeCompare(b.title);
				}

				const result = Number(aValue) - Number(bValue);

				if (result !== 0) {
					return sortDirection === 'asc' ? result : -result;
				}

				return a.title.localeCompare(b.title);
			});
	});

	const updateUrl = ({
											 nextUsername = loadedUsername || username,
											 nextSearch = search,
											 nextStatus = selectedStatus,
											 nextSort = sortMetric,
											 nextDirection = sortDirection,
											 replaceState = true
										 }: {
		nextUsername?: string;
		nextSearch?: string;
		nextStatus?: AnimeStatusSelection;
		nextSort?: AnimeSortMetric;
		nextDirection?: SortDirection;
		replaceState?: boolean;
	} = {}) => {
		const params = new URLSearchParams();

		const trimmedUsername = nextUsername.trim();
		const trimmedSearch = nextSearch.trim();

		if (trimmedUsername) params.set('username', trimmedUsername);
		if (trimmedSearch) params.set('q', trimmedSearch);
		if (nextStatus !== 'all') params.set('status', nextStatus);
		if (nextSort !== 'score') params.set('sort', nextSort);
		if (nextDirection !== 'desc') params.set('dir', nextDirection);

		const href = params.toString() ? `/?${params.toString()}` : '/';

		void goto(href, {
			replaceState,
			noScroll: true,
			keepFocus: true
		});
	};

	const loadAnimes = async (targetUsername = username) => {
		const trimmedUsername = targetUsername.trim();

		if (!trimmedUsername) {
			error = 'Enter a username.';
			return;
		}

		try {
			loading = true;
			error = null;
			data = null;

			/**
			 * Important:
			 * Always fetch the full anime list.
			 * Status filtering is only a frontend filter.
			 *
			 * If we send status=dropped to the backend, then switching
			 * to completed/all later cannot work because those entries
			 * were never loaded.
			 */
			const params = new URLSearchParams({
				username: trimmedUsername
			});

			const response = await fetch(`/api/animes?${params.toString()}`);
			const result = (await response.json()) as AnimeApiResponse & {
				error?: string;
				detail?: string;
			};

			if (!response.ok) {
				throw new Error(result.detail || result.error || `Request failed with ${response.status}`);
			}

			data = result;
			username = result.username;
			loadedUsername = result.username;

			updateUrl({
				nextUsername: result.username,
				replaceState: false
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error.';
		} finally {
			loading = false;
		}
	};

	const handleSubmit = () => {
		void loadAnimes();
	};

	const handleStatusChange = (status: AnimeStatusSelection) => {
		selectedStatus = status;

		updateUrl({
			nextStatus: status
		});
	};

	const handleSortChange = (metric: AnimeSortMetric) => {
		sortMetric = metric;

		updateUrl({
			nextSort: metric
		});
	};

	const handleDirectionToggle = () => {
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';

		updateUrl({
			nextDirection: sortDirection
		});
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
			void loadAnimes(initialUsername);
		}
	});
</script>

<svelte:head>
	<title>Your Anime List</title>
	<meta name="description" content="Compact MyAnimeList viewer." />
</svelte:head>

<Shell>
	<AnimeHeader
		activeTab="list"
		bind:username
		query={search}
		{loading}
		onSubmit={handleSubmit}
	/>

	{#if error}
		<div class="mb-3 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-accent">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="mx-auto mt-8 animate-pulse text-center text-xl text-accent">fetching data</div>
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
						<span class="w-12 py-1 text-xs font-medium text-accent">filter</span>

						{#each STATUS_FILTERS as status}
							<button
								type="button"
								class={[
									'cursor-pointer rounded px-2 py-1 text-xs font-medium transition',
									selectedStatus === status.value
										? 'bg-accent/10 text-accent'
										: 'bg-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-white'
								]
									.filter(Boolean)
									.join(' ')}
								onclick={() => handleStatusChange(status.value)}
							>
								{status.label}
							</button>
						{/each}
					</div>

					<div class="flex flex-wrap items-center gap-1.5">
						<span class="w-12 py-1 text-xs font-medium text-accent">sort</span>

						<div class="flex flex-wrap gap-2">
							{#each SORT_OPTIONS as option}
								<button
									type="button"
									class={[
										'cursor-pointer rounded px-2 py-1 text-xs font-medium transition',
										sortMetric === option.value
											? 'bg-accent/10 text-accent'
											: 'bg-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-white'
									]
										.filter(Boolean)
										.join(' ')}
									onclick={() => handleSortChange(option.value)}
								>
									{option.label}
								</button>
							{/each}
						</div>

						<button
							type="button"
							class="h-7 cursor-pointer rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent transition hover:bg-accent/20"
							onclick={handleDirectionToggle}
						>
							{sortDirection}
						</button>
					</div>
				</div>
			</div>

			<AnimeTable
				mode="list"
				animes={filteredAnimes}
				emptyMessage="No results."
			/>
		</section>
	{:else}
		<section class="rounded-lg border border-white/10 bg-neutral-900/90 px-3 py-10 text-center shadow-xl shadow-black/20">
			<h1 class="text-base font-medium text-white">Search a MyAnimeList profile.</h1>
			<p class="mt-1 text-sm text-neutral-500">
				Try <span class="text-neutral-300">diego</span>.
			</p>
		</section>
	{/if}
</Shell>