<script lang="ts">
	import type {
		Anime,
		AnimeApiResponse,
		AnimeSortMetric,
		AnimeViewStatus,
		SortDirection
	} from '$lib/types/anime';

	const STATUS_FILTERS: Array<{
		value: AnimeViewStatus;
		label: string;
	}> = [
		{ value: 'watching', label: 'watching' },
		{ value: 'completed', label: 'completed' },
		{ value: 'dropped', label: 'dropped' },
		{ value: 'plan_to_watch', label: 'plan to watch' }
	];

	const SORT_OPTIONS: Array<{
		value: AnimeSortMetric;
		label: string;
	}> = [
		{ value: 'score', label: 'score' },
		{ value: 'title', label: 'title' },
		{ value: 'year', label: 'year' },
		{ value: 'totalEpisodes', label: 'episodes' }
	];

	let username = $state('');
	let loadedUsername = $state('');
	let selectedStatus = $state<AnimeViewStatus>('completed');
	let search = $state('');
	let sortMetric = $state<AnimeSortMetric>('score');
	let sortDirection = $state<SortDirection>('desc');
	let data = $state<AnimeApiResponse | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	const effectiveSortMetric = $derived<AnimeSortMetric>(
		selectedStatus === 'completed' || sortMetric !== 'score' ? sortMetric : 'year'
	);

	const getMalUrl = (id: number) => {
		return `https://myanimelist.net/anime/${id}`;
	};

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
					if (aMissing && bMissing) {
						return a.title.localeCompare(b.title);
					}

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

	const setStatus = (status: AnimeViewStatus) => {
		selectedStatus = status;

		if (status !== 'completed' && sortMetric === 'score') {
			sortMetric = 'title';
		}
	};

	const loadAnimes = async () => {
		const trimmedUsername = username.trim();

		if (!trimmedUsername) {
			error = 'Type a MyAnimeList username first.';
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
			loadedUsername = trimmedUsername;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	};

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		void loadAnimes();
	};
</script>

<svelte:head>
	<title>Your Anime List</title>
	<meta
		name="description"
		content="Explore public MyAnimeList anime lists with better filtering and sorting."
	/>
</svelte:head>

<main class="min-h-screen bg-neutral-950 text-neutral-100">
	<section class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
		<header class="mb-8">
			<p class="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-violet-300">
				anime.diegogliarte.com
			</p>

			<h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
				Your anime list, cleaner.
			</h1>

			<p class="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
				Type a public MyAnimeList username and explore the list with filters, search, sorting,
				episode progress, and adjusted plus/minus scores.
			</p>
		</header>

		<form
			class="mb-6 flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-2xl shadow-black/30 sm:flex-row"
			onsubmit={handleSubmit}
		>
			<label class="flex flex-1 flex-col gap-2">
				<span class="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
					MyAnimeList username
				</span>

				<input
					class="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-base text-white outline-none transition focus:border-violet-400"
					type="text"
					placeholder="for example: diego"
					bind:value={username}
					autocomplete="off"
				/>
			</label>

			<button
				class="rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60 sm:self-end"
				type="submit"
				disabled={loading}
			>
				{loading ? 'Loading...' : 'Load list'}
			</button>
		</form>

		{#if error}
			<div class="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
				{error}
			</div>
		{/if}

		{#if data}
			<section class="rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/30">
				<div class="border-b border-neutral-800 p-4">
					<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p class="text-sm text-neutral-400">
								Loaded list for
								<span class="font-semibold text-white">{loadedUsername}</span>
							</p>

							<p class="mt-1 text-xs text-neutral-500">
								{filteredAnimes.length} visible entries / {data.count} fetched entries
							</p>
						</div>

						<div class="flex flex-wrap gap-2">
							{#each STATUS_FILTERS as status}
								<button
									type="button"
									class={[
										'rounded-full border px-3 py-1.5 text-sm transition',
										selectedStatus === status.value
											? 'border-violet-400 bg-violet-400 text-neutral-950'
											: 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
									].join(' ')}
									onclick={() => setStatus(status.value)}
								>
									{status.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
						<input
							class="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-white outline-none transition focus:border-violet-400"
							type="text"
							placeholder="Search title..."
							bind:value={search}
						/>

						<div class="flex flex-wrap gap-2">
							{#each SORT_OPTIONS as option}
								{@const disabled = option.value === 'score' && selectedStatus !== 'completed'}

								<button
									type="button"
									disabled={disabled}
									class={[
										'rounded-xl border px-3 py-2 text-sm transition',
										effectiveSortMetric === option.value
											? 'border-violet-400 bg-violet-400 text-neutral-950'
											: 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500',
										disabled ? 'cursor-not-allowed opacity-40' : ''
									].join(' ')}
									title={disabled ? 'Score sorting is only available for completed anime' : undefined}
									onclick={() => {
										if (!disabled) {
											sortMetric = option.value;
										}
									}}
								>
									{option.label}
								</button>
							{/each}
						</div>

						<button
							type="button"
							class="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
							onclick={() => {
								sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
							}}
						>
							{sortDirection}
						</button>
					</div>
				</div>

				{#if filteredAnimes.length === 0}
					<div class="p-8 text-center text-neutral-400">No anime found.</div>
				{:else}
					<ol class="divide-y divide-neutral-800">
						{#each filteredAnimes as anime, index}
							{@const season = formatSeason(anime.startSeason)}

							<li>
								<a
									class="grid grid-cols-[3rem_4rem_4.5rem_1fr_auto] items-center gap-3 p-4 transition hover:bg-neutral-800/70"
									href={getMalUrl(anime.id)}
									target="_blank"
									rel="noreferrer"
								>
									<span class="font-mono text-sm text-neutral-500">
										{String(index + 1).padStart(2, '0')}
									</span>

									<div
										class="flex aspect-[2/3] w-14 items-center justify-center overflow-hidden rounded-lg bg-neutral-800"
									>
										{#if anime.image}
											<img
												class="h-full w-full object-cover"
												src={anime.image}
												alt=""
												loading="lazy"
											/>
										{:else}
											<span class="text-neutral-500">?</span>
										{/if}
									</div>

									{#if selectedStatus === 'completed'}
										<div class="font-mono text-lg font-semibold text-violet-300">
											{anime.displayScore}
										</div>
									{:else if selectedStatus === 'watching' || selectedStatus === 'dropped'}
										<div class="font-mono text-sm text-neutral-300">
											{anime.episodesWatched}/{anime.totalEpisodes ?? '?'}
										</div>
									{:else}
										<div class="font-mono text-sm text-neutral-300">
											{anime.totalEpisodes ?? '?'} ep
										</div>
									{/if}

									<div class="min-w-0">
										<h2 class="truncate font-medium text-white">
											{anime.title}
										</h2>

										<p class="mt-1 text-sm text-neutral-500">
											{season ?? 'unknown season'}
										</p>
									</div>

									<span class="text-neutral-500">↗</span>
								</a>
							</li>
						{/each}
					</ol>
				{/if}
			</section>
		{/if}
	</section>
</main>