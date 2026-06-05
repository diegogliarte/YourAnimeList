<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = HTMLInputAttributes & {
		value?: string;
	};

	let { value = $bindable(''), type = 'text', class: className = '', ...rest }: Props = $props();
</script>

<input
	bind:value
	{type}
	class={`
		rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text
		transition outline-none
		placeholder:text-text-muted
		hover:border-primary/70 hover:bg-surface-soft
		focus:border-primary
		${className}
	`}
	{...rest}
/>
