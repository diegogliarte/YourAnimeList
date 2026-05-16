<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();
</script>

<main class="relative min-h-screen overflow-hidden bg-[#09090b] text-neutral-100">
	<div class="pointer-events-none absolute inset-0">
		<div
			class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
		></div>
		<div
			class="absolute top-[-18rem] left-1/2 h-[50rem] w-[50rem] -translate-x-1/2 rounded-full bg-accent/[0.055] blur-3xl"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.035),transparent_312rem)]"
		></div>
	</div>

	<div class="relative mx-auto w-full max-w-4xl px-3 py-3 sm:px-4 sm:py-4">
		{@render children()}
	</div>
</main>
