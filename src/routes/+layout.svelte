<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	import Navbar from '$lib/components/layout/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>YourAnimeList</title>

	<meta
		name="description"
		content="A modern anime list dashboard for exploring your MyAnimeList stats, top anime, and franchise watch orders."
	/>

	<meta name="application-name" content="YourAnimeList" />
	<meta name="theme-color" content="#e95420" />
	<meta name="robots" content="index,follow" />

	<meta property="og:type" content="website" />
	<meta property="og:title" content="YourAnimeList" />
	<meta
		property="og:description"
		content="Explore your MyAnimeList stats, top anime, and franchise watch orders."
	/>

	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="YourAnimeList" />
	<meta
		name="twitter:description"
		content="Explore your MyAnimeList stats, top anime, and franchise watch orders."
	/>

	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-dvh min-w-0 flex-col overflow-hidden">
	<Navbar />

	<main class="min-h-0 min-w-0 flex-1 overflow-y-auto">
		<div class="mx-auto w-full min-w-0 max-w-6xl px-4 py-8">
			{@render children()}
		</div>
	</main>
</div>