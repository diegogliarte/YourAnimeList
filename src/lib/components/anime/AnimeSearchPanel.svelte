<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import type { AnimeSearchEdge } from '$lib/types/anime';
	import { formatSeason } from '$lib/utils/anime.utils';

	type Props = {
		title: string;
		query?: string;
		results: AnimeSearchEdge[];
		loading: boolean;
		error?: string | null;
		disabled?: boolean;
		selectDisabled?: boolean;
		placeholder?: string;
		submitLabel?: string;
		loadingLabel?: string;
		resultsTitle?: string;
		emptyText?: string;
		showEmpty?: boolean;
		onSearch: () => void | Promise<void>;
		onSelect: (animeId: number) => void | Promise<void>;
		actions?: Snippet;
		children?: Snippet;
	};

	let {
		title,
		query = $bindable(''),
		results,
		loading,
		error = null,
		disabled = false,
		selectDisabled = false,
		placeholder = 'Search anime...',
		submitLabel = 'Search',
		loadingLabel = 'Searching...',
		resultsTitle = 'Search results',
		emptyText = '',
		showEmpty = false,
		onSearch,
		onSelect,
		actions,
		children
	}: Props = $props();

	function submitSearch(event: SubmitEvent) {
		event.preventDefault();

		void onSearch();
	}

	$effect(() => {
		console.log('[AnimeSearchPanel disabled state]', {
			title,
			disabled,
			loading,
			inputDisabled: disabled || loading
		});
	});
</script>

<div class="grid gap-4">
	<Panel {title}>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<form class="flex min-w-0 flex-wrap items-center gap-2" onsubmit={submitSearch}>
				<Input bind:value={query} {placeholder} class="w-60" disabled={disabled || loading} />

				<Button type="submit" variant="primary" disabled={disabled || loading}>
					{loading ? loadingLabel : submitLabel}
				</Button>
			</form>

			{#if actions}
				<div class="ml-auto flex flex-wrap items-center justify-end gap-2">
					{@render actions()}
				</div>
			{/if}
		</div>
	</Panel>

	{#if error}
		<Panel>
			<p class="text-sm text-primary">{error}</p>
		</Panel>
	{/if}

	{#if results.length > 0}
		<Panel title={resultsTitle}>
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each results as result (result.node.id)}
					<button
						type="button"
						class="flex cursor-pointer gap-3 rounded-md border border-border bg-surface p-2 text-left transition hover:border-primary hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
						disabled={disabled || selectDisabled}
						onclick={() => onSelect(result.node.id)}
					>
						{#if result.node.main_picture?.medium}
							<img
								src={result.node.main_picture.medium}
								alt={result.node.title}
								class="size-12 shrink-0 rounded-md object-cover"
							/>
						{:else}
							<div class="size-12 shrink-0 rounded-md bg-surface-soft"></div>
						{/if}

						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-text">{result.node.title}</p>
							<p class="mt-1 text-xs text-text-muted">
								{result.node.media_type ?? 'unknown'} · {formatSeason(result)}
							</p>
						</div>
					</button>
				{/each}
			</div>
		</Panel>
	{/if}

	{#if children}
		{@render children()}
	{/if}

	{#if showEmpty && !results.length && emptyText}
		<Panel>
			<p class="text-sm text-text-muted">{emptyText}</p>
		</Panel>
	{/if}
</div>
