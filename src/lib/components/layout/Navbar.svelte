<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import { animeData } from '$lib/stores/anime-data.svelte';

	const tabs = [
		{ label: 'List', href: '/list' },
		{ label: 'Stats', href: '/stats' },
		{ label: 'Top Anime', href: '/top-anime' },
		{ label: 'Franchises', href: '/franchises' }
	];

	const isActive = (href: string) => page.url.pathname === href;

	const isSameLoadedUser = $derived(
		animeData.username.trim().toLowerCase() === animeData.loadedUsername.trim().toLowerCase()
	);

	const submitLabel = $derived(
		animeData.userListLoading ? 'Loading...' : isSameLoadedUser && animeData.hasUserList ? 'Reload' : 'Load'
	);

	async function loadUserList() {
		await animeData.loadUserList();
	}
</script>

<header class="border-b border-border bg-background/30">
	<nav
		class="
			mx-auto grid max-w-7xl grid-cols-[auto_1fr] items-center gap-3 px-4 py-3
			lg:grid-cols-[auto_1fr_auto]
		"
	>
		<a href="/list" class="shrink-0 text-sm font-semibold text-text">
			YourAnimeList
		</a>

		<form
			class="col-start-2 row-start-1 flex min-w-0 items-center justify-end gap-2 lg:col-start-3"
			onsubmit={(event) => {
				console.log('submitting form');
				event.preventDefault();
				loadUserList();
				console.log('animeData after loadUserList call', animeData);
			}}
		>
			<TextInput
				bind:value={animeData.username}
				placeholder="MAL username"
				class="w-32 sm:w-44"
				disabled={animeData.userListLoading}
			/>

			<Button type="submit" variant="primary" class="w-18" disabled={animeData.userListLoading}>
				{submitLabel}
			</Button>
		</form>

		<div
			class="
				col-span-2 row-start-2 flex justify-center gap-2 overflow-x-auto pb-1
				lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:overflow-visible lg:pb-0
			"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class={`
						shrink-0 rounded-md px-3 py-1.5 text-sm transition
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
		<div class="mx-auto max-w-7xl px-4 pb-3 text-xs text-primary">
			{animeData.userListError}
		</div>
	{/if}
</header>