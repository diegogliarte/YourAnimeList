<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';

	type Props = {
		title?: string;
		description?: string;
		collapsible?: boolean;
		collapsed?: boolean;
		class?: string;
		children?: Snippet;
	};

	let {
		title,
		description,
		collapsible = false,
		collapsed = $bindable(false),
		class: className = '',
		children
	}: Props = $props();

	function toggleCollapsed() {
		if (!collapsible) return;

		collapsed = !collapsed;
	}
</script>

<section
	class={`
		rounded-md border border-border bg-surface p-3
		${className}
	`}
>
	{#if title || description || collapsible}
		<header class={collapsed ? '' : 'mb-3'}>
			<div class="flex min-h-7 items-center justify-between gap-3">
				<div class="min-w-0">
					{#if title}
						<h2 class="truncate text-sm leading-7 font-semibold text-text">{title}</h2>
					{/if}

					{#if description}
						<p class="mt-1 text-xs text-text-muted">{description}</p>
					{/if}
				</div>

				{#if collapsible}
					<Button type="button" onclick={toggleCollapsed}>
						{collapsed ? 'Expand' : 'Collapse'}
					</Button>
				{/if}
			</div>
		</header>
	{/if}

	{#if !collapsed}
		{@render children?.()}
	{/if}
</section>
