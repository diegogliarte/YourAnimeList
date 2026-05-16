<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		children: Snippet;
	};

	let { label, children }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
	<span class="w-12 py-1 text-xs font-medium text-accent">
		{label}
	</span>

	<div class="flex flex-wrap items-center gap-2">
		{@render children()}
	</div>
</div>
