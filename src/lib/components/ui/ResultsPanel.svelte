<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();
</script>

<section
	class="overflow-hidden rounded-lg border border-white/10 bg-background shadow-xl shadow-black/20"
>
	{@render children()}
</section>
