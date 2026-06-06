<script lang="ts">
	import type { Snippet } from 'svelte';

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
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					{#if title}
						<h2 class="truncate text-sm font-semibold text-text">{title}</h2>
					{/if}

					{#if description}
						<p class="mt-1 text-xs text-text-muted">{description}</p>
					{/if}
				</div>

				{#if collapsible}
					<button
						type="button"
						class="shrink-0 cursor-pointer rounded-md border border-border bg-surface-soft px-2 py-1 text-xs text-text-soft transition hover:text-text"
						aria-expanded={!collapsed}
						onclick={toggleCollapsed}
					>
						{collapsed ? 'Expand' : 'Collapse'}
					</button>
				{/if}
			</div>
		</header>
	{/if}

	{#if !collapsed}
		{@render children?.()}
	{/if}
</section>