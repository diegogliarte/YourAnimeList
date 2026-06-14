<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'default' | 'primary';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		children?: Snippet;
	};

	let {
		variant = 'default',
		type = 'button',
		disabled = false,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const base = `
		inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md border px-2 py-1
		text-sm font-medium leading-none transition
		disabled:cursor-not-allowed disabled:opacity-50
	`;

	const variants: Record<Variant, string> = {
		default: 'border-border bg-surface text-text hover:bg-surface-soft',
		primary: 'border-primary bg-primary text-background hover:bg-primary/90'
	};
</script>

<button {type} {disabled} class={`${base} ${variants[variant]} ${className}`} {...rest}>
	{@render children?.()}
</button>
