<script lang="ts">
	import type { AnimeListStatusName } from '$lib/types/anime';

	type Props = {
		status?: AnimeListStatusName | null;
		class?: string;
	};

	let { status, class: className = '' }: Props = $props();

	const labels: Record<AnimeListStatusName, string> = {
		watching: 'Watching',
		completed: 'Completed',
		on_hold: 'Hold',
		dropped: 'Dropped',
		plan_to_watch: 'Plan'
	};

	const classes: Record<AnimeListStatusName, string> = {
		watching: 'border-primary/60 text-primary',
		completed: 'border-green-500/60 text-green-400',
		on_hold: 'border-yellow-500/60 text-yellow-400',
		dropped: 'border-red-500/60 text-red-400',
		plan_to_watch: 'border-zinc-300 text-text/80'
	};
</script>

{#if status}
	<span
		class={`
			inline-flex shrink-0 items-center rounded-sm border px-1 py-px
			text-[10px]
			${classes[status]} ${className}
		`}
	>
		{labels[status]}
	</span>
{/if}