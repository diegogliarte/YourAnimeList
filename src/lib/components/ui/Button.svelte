<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'solid' | 'soft' | 'plain';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		children?: Snippet;
	};

	let {
		variant = 'soft',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const base =
		'inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40';

	const variants: Record<Variant, string> = {
		solid:
			'bg-accent text-neutral-950 shadow-sm shadow-accent hover:bg-accent',
		soft:
			'border border-white/10 bg-white/[0.055] text-neutral-100 hover:border-white/15 hover:bg-white/[0.09]',
		plain:
			'text-neutral-400 hover:bg-white/[0.06] hover:text-white'
	};
</script>

<button {...rest} class={[base, variants[variant], className].filter(Boolean).join(' ')}>
	{#if children}
		{@render children()}
	{/if}
</button>