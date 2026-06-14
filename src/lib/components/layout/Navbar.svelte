<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';

	const tabs = [
		{ label: 'List', href: '/list' },
		{ label: 'Stats', href: '/stats' },
		{ label: 'Top Anime', href: '/top-anime' },
		{ label: 'Franchises', href: '/franchises' },
		{ label: 'Search DB', href: '/search-db' }
	];

	const isActive = (href: string) => page.url.pathname === href;

	const isSameLoadedUser = $derived(
		animeData.username.trim().toLowerCase() === animeData.loadedUsername.trim().toLowerCase()
	);

	const submitLabel = $derived(
		animeData.userListLoading
			? 'Loading...'
			: isSameLoadedUser && animeData.hasUserList
				? 'Reload'
				: 'Load'
	);

	async function loadUserList() {
		await animeData.loadUserList();
	}
</script>

<header class="shrink-0 border-b border-border bg-background/80 backdrop-blur">
	<nav
		class="
			mx-auto grid max-w-7xl grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-3 py-2
			lg:grid-cols-[auto_1fr_auto] lg:px-4
		"
	>
		<a href="/list" class="shrink-0 text-sm leading-none font-semibold text-text">
			YourAnimeList
		</a>

		<form
			class="col-start-2 row-start-1 flex min-w-0 items-center justify-end gap-1.5 lg:col-start-3"
			onsubmit={(event) => {
				event.preventDefault();
				loadUserList();
			}}
		>
			<Input
				bind:value={animeData.username}
				placeholder="MAL username"
				class="h-8 w-28 px-2 py-1 text-xs sm:w-40"
				disabled={animeData.userListLoading}
			/>

			<Button
				type="submit"
				variant="primary"
				class="h-8 w-16 px-2 py-1 text-xs"
				disabled={animeData.userListLoading}
			>
				{submitLabel}
			</Button>
		</form>

		<div
			class="
				col-span-2 row-start-2 flex min-w-0 justify-center gap-1.5 overflow-x-auto pb-0.5
				lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:overflow-visible lg:pb-0
			"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class={`
						shrink-0 rounded-md px-2 py-1 text-xs leading-none transition
						${
							isActive(tab.href)
								? 'bg-primary text-background'
								: 'text-text-soft hover:bg-primary/10 hover:text-text'
						}
					`}
				>
					{tab.label}
				</a>
			{/each}
		</div>
	</nav>

	{#if animeData.userListError}
		<div class="mx-auto max-w-7xl px-3 pb-2 text-xs text-primary lg:px-4">
			{animeData.userListError}
		</div>
	{/if}
</header>
