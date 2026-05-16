<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';

	import { setAnimeCacheContext } from '$lib/state/anime-cache.svelte';

	setAnimeCacheContext();

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
