<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import type { AnimeDetails, AnimeListStatusName } from '$lib/types/anime';
	import { getAnimeUrl } from '$lib/utils/anime.utils';

	type NodeData = {
		anime: AnimeDetails;
		subtitle: string;
		status: AnimeListStatusName | null;
		isSeed: boolean;
		isPending: boolean;
	};

	type Props = {
		data: NodeData;
		selected?: boolean;
	};

	let { data, selected = false }: Props = $props();

	function getImageUrl(anime: AnimeDetails) {
		return anime.main_picture?.medium ?? anime.main_picture?.large;
	}
</script>

<div
	class={`
		relative w-64 overflow-hidden rounded-xl border bg-background shadow-sm transition
		${data.isSeed ? 'border-primary shadow-primary/20' : ''}
		${data.isPending ? 'border-yellow-500/70' : ''}
		${!data.isSeed && !data.isPending ? 'border-border' : ''}
		${selected ? 'ring-2 ring-primary/40' : ''}
	`}
>
	<Handle
		type="target"
		position={Position.Left}
		class="!h-2.5 !w-2.5 !border-border !bg-background"
	/>

	<Handle
		type="source"
		position={Position.Right}
		class="!h-2.5 !w-2.5 !border-border !bg-background"
	/>

	<div class="flex gap-3 p-2">
		{#if getImageUrl(data.anime)}
			<img
				src={getImageUrl(data.anime)}
				alt={data.anime.title}
				class="h-20 w-14 shrink-0 rounded-lg object-cover"
			/>
		{:else}
			<div class="h-20 w-14 shrink-0 rounded-lg bg-surface-soft"></div>
		{/if}

		<div class="min-w-0 flex-1">
			<a
				href={getAnimeUrl(data.anime.id)}
				target="_blank"
				rel="noreferrer"
				class="nodrag block truncate text-sm leading-snug font-semibold text-text hover:text-primary"
			>
				{data.anime.title}
			</a>

			<div class="mt-1 flex flex-wrap items-center gap-1">
				<StatusBadge status={data.status} />

				{#if data.isSeed}
					<span class="rounded-md border border-primary/60 px-1.5 py-0.5 text-[10px] text-primary">
						Seed
					</span>
				{/if}

				{#if data.isPending}
					<span
						class="rounded-md border border-yellow-500/60 px-1.5 py-0.5 text-[10px] text-yellow-400"
					>
						Pending
					</span>
				{/if}
			</div>

			<p class="mt-1 line-clamp-2 text-xs leading-snug text-text-muted">
				{data.subtitle}
			</p>
		</div>
	</div>
</div>
