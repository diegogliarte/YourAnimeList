<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';

	type Props = {
		username: string;
		visibleCount: number;
		totalCount?: number;
		totalLabel?: string;
		search: string;
		placeholder?: string;
		onSearchChange: (value: string) => void;
	};

	let {
		username,
		visibleCount,
		totalCount,
		totalLabel,
		search,
		placeholder = 'filter',
		onSearchChange
	}: Props = $props();

	const handleInput = (event: Event) => {
		const input = event.target as HTMLInputElement;

		onSearchChange(input.value);
	};
</script>

<div class="flex min-w-0 items-center gap-2">
	<p class="truncate text-sm text-neutral-300">
		<span class="font-medium text-white">{username}</span>

		<span class="ml-2 text-neutral-500">
			{visibleCount}

			{#if typeof totalCount === 'number'}
				/{totalCount}
			{:else if totalLabel}
				{totalLabel}
			{/if}
		</span>
	</p>

	<Input class="w-40" {placeholder} value={search} oninput={handleInput} />
</div>
