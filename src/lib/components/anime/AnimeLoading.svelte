<script lang="ts">
	const rows = Array.from({ length: 12 });
</script>

<div class="overflow-hidden rounded-lg border border-background bg-neutral-900/90 shadow-xl shadow-black/20">
	<div class="border-b border-background bg-white/[0.025] px-3 py-2">
		<div class="h-3 w-40 animate-pulse rounded bg-background"></div>
	</div>

	<div class="divide-y divide-white/[0.07]">
		{#each rows as _}
			<div class="grid grid-cols-[2.5rem_4rem_minmax(0,1fr)_2.25rem] items-center gap-3 px-3 py-2">
				<div class="h-3 w-6 animate-pulse rounded bg-background"></div>
				<div class="h-3 w-9 animate-pulse rounded bg-background"></div>

				<div class="min-w-0 space-y-2">
					<div class="h-3 w-2/3 animate-pulse rounded bg-background"></div>
					<div class="h-2.5 w-28 animate-pulse rounded bg-white/5"></div>
				</div>

				<div class="ml-auto h-11 w-8 animate-pulse rounded bg-background"></div>
			</div>
		{/each}
	</div>
</div>