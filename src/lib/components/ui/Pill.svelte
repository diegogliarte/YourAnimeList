<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		active?: boolean;
		class?: string;
		children?: Snippet;
	};

	let { active = false, class: className = '', children }: Props = $props();
</script>

<span
	class={`
		inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium
		${
			active
				? 'border-primary bg-primary text-background'
				: 'border-border bg-surface-soft text-text-soft'
		}
		${className}
	`}
>
	{@render children?.()}
</span>