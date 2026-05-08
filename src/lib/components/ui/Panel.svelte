<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<section
	class={[
		'rounded-2xl border border-white/10 bg-neutral-900/80 shadow-xl shadow-black/20',
		className
	]
		.filter(Boolean)
		.join(' ')}
>
	{@render children()}
</section>