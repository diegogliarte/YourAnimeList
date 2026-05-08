<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	import AnimeLoading from '$lib/components/anime/AnimeLoading.svelte';
	import AnimeRow from '$lib/components/anime/AnimeRow.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Shell from '$lib/components/ui/Shell.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';

	import type {
		Anime,
		AnimeApiResponse,
		AnimeSortMetric,
		AnimeViewStatus,
		SortDirection
	} from '$lib/types/anime';

	type Option<T extends string> = {
		value: T;
		label: string;
	};

	const STATUS_FILTERS: Array<Option<AnimeViewStatus>> = [
		{ value: 'completed', label: 'completed' },
		{ value: 'watching', label: 'watching' },
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

	const isAnimeViewStatus = (value: string | null): value is AnimeViewStatus => {
		return STATUS_VALUES.includes(value as AnimeViewStatus);
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
	let selectedStatus = $state<AnimeViewStatus>(
		isAnimeViewStatus(initialStatus) ? initialStatus : 'completed'
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

	const effectiveSortMetric = $derived<AnimeSortMetric>(
		selectedStatus === 'completed' || sortMetric !== 'score' ? sortMetric : 'year'
	);

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

	const getSortValue = (
		anime: Anime,
		metric: AnimeSortMetric
	): string | number | null => {
		switch (metric) {
			case 'score':
				return anime.customScore;

			case 'title':
				return anime.title.toLowerCase();

			case 'year':
				return anime.startSeason?.year ?? null;

			case 'totalEpisodes':
				return anime.totalEpisodes;

			case 'episodesWatched':
				return anime.episodesWatched;
		}
	};

	const filteredAnimes = $derived.by(() => {
		if (!data?.animes) return [];

		const normalizedSearch = search.trim().toLowerCase();

		return data.animes
			.filter((anime) => anime.status === selectedStatus)
			.filter((anime) => {
				if (!normalizedSearch) return true;

				return anime.title.toLowerCase().includes(normalizedSearch);
			})
			.sort((a, b) => {
				const aValue = getSortValue(a, effectiveSortMetric);
				const bValue = getSortValue(b, effectiveSortMetric);

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
		nextStatus?: AnimeViewStatus;
		nextSort?: AnimeSortMetric;
		nextDirection?: SortDirection;
		replaceState?: boolean;
	} = {}) => {
		const params = new URLSearchParams();

		const trimmedUsername = nextUsername.trim();
		const trimmedSearch = nextSearch.trim();

		if (trimmedUsername) params.set('username', trimmedUsername);
		if (trimmedSearch) params.set('q', trimmedSearch);
		if (nextStatus !== 'completed') params.set('status', nextStatus);
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

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		void loadAnimes();
	};

	const handleStatusChange = (status: AnimeViewStatus) => {
		selectedStatus = status;

		let nextSort = sortMetric;

		if (status !== 'completed' && sortMetric === 'score') {
			sortMetric = 'title';
			nextSort = 'title';
		}

		updateUrl({
			nextStatus: status,
			nextSort
		});
	};

	const handleSortChange = (metric: AnimeSortMetric) => {
		if (metric === 'score' && selectedStatus !== 'completed') return;

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
						active: true
					},
					{
						label: 'recommendations',
						href: '/recommendations',
						active: false
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
		<AnimeLoading />
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

					<div class="flex gap-2">
						<span class="text-xs py-1 font-medium text-accent w-12">filter</span>
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
						<span class="text-xs py-1 font-medium text-accent w-12">sort</span>

						<div class="flex gap-2">
							{#each SORT_OPTIONS as option}
								{@const disabled = option.value === 'score' && selectedStatus !== 'completed'}

								<button
									type="button"
									disabled={disabled}
									title={disabled ? 'Score is only available for completed anime.' : undefined}
									class={[
										'rounded px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35',
										disabled ? '' : 'cursor-pointer',
										effectiveSortMetric === option.value
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

			{#if filteredAnimes.length === 0}
				<div class="px-3 py-10 text-center text-sm text-neutral-500">
					No results.
				</div>
			{:else}
				<ol class="divide-y divide-white/[0.07]">
					{#each filteredAnimes as anime, index}
						<AnimeRow
							{anime}
							{index}
							{selectedStatus}
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
				Try <span class=" text-neutral-300">diego</span>.
			</p>
		</section>
	{/if}
</Shell>