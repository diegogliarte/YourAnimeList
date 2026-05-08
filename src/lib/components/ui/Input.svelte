<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'value'> & {
		value?: string;
	};

	let { value = $bindable(''), class: className = '', ...rest }: Props = $props();
</script>

<input
	{...rest}
	bind:value
	class={[
		'h-8 rounded-md border border-white/10 bg-neutral-950/80 px-2.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-accent focus:bg-neutral-950',
		className
	]
		.filter(Boolean)
		.join(' ')}
/>