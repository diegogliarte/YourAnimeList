<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title?: string;
		description?: string;
		class?: string;
		children?: Snippet;
	};

	let { title, description, class: className = '', children }: Props = $props();
</script>

<section
	class={`
		rounded-md border border-border bg-surface p-3
		${className}
	`}
>
	{#if title || description}
		<header class="mb-3">
			{#if title}
				<h2 class="text-sm font-semibold text-text">{title}</h2>
			{/if}

			{#if description}
				<p class="mt-1 text-xs text-text-muted">{description}</p>
			{/if}
		</header>
	{/if}

	{@render children?.()}
</section>
