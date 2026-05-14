<script lang="ts">
	import { goto } from '$app/navigation';

	import Input from '$lib/components/ui/Input.svelte';

	type ActiveTab = 'list' | 'rankings' | 'stats';

	type Props = {
		activeTab: ActiveTab;
		username: string;
		query?: string;
		loading?: boolean;
		onSubmit: () => void;
	};

	let {
		activeTab,
		username = $bindable(),
		query = '',
		loading = false,
		onSubmit
	}: Props = $props();

	const tabs: Array<{
		value: ActiveTab;
		label: string;
		href: string;
	}> = [
		{ value: 'list', label: 'list', href: '/list' },
		{ value: 'rankings', label: 'rankings', href: '/rankings' },
		{ value: 'stats', label: 'stats', href: '/stats' }
	];

	const handleSubmit = () => {
		onSubmit();
	};

	const handleTabClick = (href: string) => {
		const trimmedUsername = username.trim();

		const params = new URLSearchParams();

		if (trimmedUsername) {
			params.set('username', trimmedUsername);
		}

		void goto(params.toString() ? `${href}?${params.toString()}` : href, {
			noScroll: true,
			keepFocus: true
		});
	};
</script>

<header class="mb-3 rounded-lg border border-white/10 bg-background p-3 shadow-xl shadow-black/20">
	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<h1 class="text-lg font-semibold text-white">YourAnimeList</h1>
			</div>

			<nav class="flex flex-wrap gap-2">
				{#each tabs as tab (tab.value)}
					<button
						type="button"
						class={[
							'cursor-pointer rounded px-2 py-1 text-xs font-medium transition',
							activeTab === tab.value
								? 'bg-accent/10 text-accent'
								: 'bg-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-white'
						]
							.filter(Boolean)
							.join(' ')}
						onclick={() => handleTabClick(tab.href)}
					>
						{tab.label}
					</button>
				{/each}
			</nav>
		</div>

		<form class="flex flex-col gap-2 sm:flex-row" onsubmit={(event) => {
			event.preventDefault();
			handleSubmit();
		}}>
			<Input
				placeholder="MAL username"
				bind:value={username}
			/>

			<button
				type="submit"
				disabled={loading}
				class="cursor-pointer rounded-md bg-accent px-2 py-1 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{loading ? 'loading' : 'search'}
			</button>
		</form>

		<p class="truncate rounded-md bg-black/30 px-2 py-1 font-mono text-xs text-neutral-500">
			<span class="text-accent">$</span>
			mal-cli {activeTab}
			{#if username.trim()}
				--user {username.trim()}
			{/if}
			{#if query.trim()}
				--query {query.trim()}
			{/if}
		</p>
	</div>
</header>