<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		active?: boolean;
		disabled?: boolean;
		onclick?: () => void;
		children: Snippet;
		class?: string;
		title?: string;
	};

	let {
		active = false,
		disabled = false,
		onclick,
		children,
		class: className = '',
		title
	}: Props = $props();

	const baseClass = 'rounded px-2 py-1 text-xs font-medium transition';
	const activeClass = 'bg-accent/10 text-accent';
	const inactiveClass = 'bg-white/10 text-neutral-400 hover:bg-white/[0.07] hover:text-white';
	const enabledClass = 'cursor-pointer';
	const disabledClass = 'cursor-not-allowed opacity-50';
</script>

<button
	type="button"
	{disabled}
	{title}
	class={[
		baseClass,
		active ? activeClass : inactiveClass,
		disabled ? disabledClass : enabledClass,
		className
	]
		.filter(Boolean)
		.join(' ')}
	onclick={disabled ? undefined : onclick}
>
	{@render children()}
</button>
