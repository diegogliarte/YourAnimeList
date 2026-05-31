<script lang="ts">
	import type { AnimeListStatusName } from '$lib/types/anime';

	type Props = {
		status?: AnimeListStatusName | null;
	};

	let { status }: Props = $props();

	const labels: Record<AnimeListStatusName, string> = {
		watching: 'Watching',
		completed: 'Completed',
		on_hold: 'On Hold',
		dropped: 'Dropped',
		plan_to_watch: 'Planned'
	};

	const classes: Record<AnimeListStatusName, string> = {
		watching: 'border-primary/60 text-primary',
		completed: 'border-green-500/60 text-green-400',
		on_hold: 'border-yellow-500/60 text-yellow-400',
		dropped: 'border-red-500/60 text-red-400',
		plan_to_watch: 'border-zinc-500/60 text-text-muted'
	};
</script>

{#if status}
	<span class={`inline-flex rounded-md border px-2 py-1 text-xs ${classes[status]}`}>
		{labels[status]}
	</span>
{:else}
	<span class="inline-flex rounded-md border border-border px-2 py-1 text-xs text-text-muted">
		Unknown
	</span>
{/if}