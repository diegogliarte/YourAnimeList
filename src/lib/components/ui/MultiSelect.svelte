<script lang="ts" module>
	import type { SelectOption } from '$lib/components/ui/SelectInput.svelte';

	export type MultiSelectOption = SelectOption;
</script>

<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';

	type Props = {
		label: string;
		value?: string[];
		options: MultiSelectOption[];
		placeholder?: string;
		searchPlaceholder?: string;
		disabled?: boolean;
		maxVisibleChips?: number;
		class?: string;
	};

	let {
		label,
		value = $bindable<string[]>([]),
		options,
		placeholder = 'Any',
		searchPlaceholder = 'Search...',
		disabled = false,
		maxVisibleChips = 3,
		class: className = ''
	}: Props = $props();

	let open = $state(false);
	let query = $state('');

	const selectedOptions = $derived.by(() => {
		const selected = new Set(value);

		return options.filter((option) => selected.has(option.value));
	});

	const visibleSelectedOptions = $derived(selectedOptions.slice(0, maxVisibleChips));
	const hiddenSelectedCount = $derived(Math.max(selectedOptions.length - maxVisibleChips, 0));

	const filteredOptions = $derived.by(() => {
		const cleanQuery = normalize(query);

		if (!cleanQuery) return options;

		return options.filter((option) => {
			return normalize(option.label).includes(cleanQuery);
		});
	});

	function toggleOpen() {
		if (disabled) return;

		open = !open;
	}

	function close() {
		open = false;
		query = '';
	}

	function toggleOption(option: MultiSelectOption) {
		if (option.disabled) return;

		if (value.includes(option.value)) {
			value = value.filter((item) => item !== option.value);
			return;
		}

		value = [...value, option.value];
	}

	function removeOption(option: MultiSelectOption) {
		value = value.filter((item) => item !== option.value);
	}

	function clearSelection() {
		value = [];
		query = '';
	}

	function isSelected(option: MultiSelectOption) {
		return value.includes(option.value);
	}

	function handleFocusOut(event: FocusEvent) {
		const currentTarget = event.currentTarget as HTMLElement;
		const nextTarget = event.relatedTarget as Node | null;

		if (!nextTarget || !currentTarget.contains(nextTarget)) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}

	function normalize(value: string) {
		return value
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.trim();
	}
</script>

<div
	class={`relative grid min-w-0 gap-1 text-xs text-text-muted ${className}`}
	onfocusout={handleFocusOut}
	onkeydown={handleKeydown}
>
	<span class="truncate">{label}</span>

	<button
		type="button"
		{disabled}
		aria-expanded={open}
		class={`
			flex min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border
			border-border bg-surface px-2 py-1.5 text-left text-sm text-text transition outline-none
			hover:border-primary/70 hover:bg-surface-soft
			focus:border-primary
			disabled:cursor-not-allowed disabled:opacity-60
		`}
		onclick={toggleOpen}
	>
		<span class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
			{#if selectedOptions.length === 0}
				<span class="truncate text-text-muted">{placeholder}</span>
			{:else}
				{#each visibleSelectedOptions as option (option.value)}
					<span
						class="
							inline-flex max-w-36 min-w-0 items-center gap-1 rounded-md border border-primary/40
							bg-primary/10 px-1.5 py-0.5 text-xs text-primary
						"
					>
						<span class="truncate">{option.label}</span>

						<span
							role="button"
							tabindex="0"
							aria-label={`Remove ${option.label}`}
							class="shrink-0 rounded px-0.5 hover:bg-primary/20"
							onclick={(event) => {
								event.stopPropagation();
								removeOption(option);
							}}
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									event.stopPropagation();
									removeOption(option);
								}
							}}
						>
							×
						</span>
					</span>
				{/each}

				{#if hiddenSelectedCount > 0}
					<span
						class="
							inline-flex shrink-0 items-center rounded-md border border-border bg-surface-soft
							px-1.5 py-0.5 text-xs text-text-soft
						"
					>
						+{hiddenSelectedCount}
					</span>
				{/if}
			{/if}
		</span>

		<span class="shrink-0 text-xs text-text-muted">
			{open ? '▲' : '▼'}
		</span>
	</button>

	{#if open}
		<div
			class="
				absolute top-full z-30 mt-1 grid max-h-80 w-full min-w-64 gap-2 overflow-hidden
				rounded-md border border-border bg-surface p-2 shadow-lg
			"
		>
			<div class="flex min-w-0 items-center gap-2">
				<Input bind:value={query} placeholder={searchPlaceholder} class="h-8 min-w-0 flex-1" />

				{#if selectedOptions.length > 0}
					<button
						type="button"
						class="
							shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-soft
							transition hover:border-primary/70 hover:bg-surface-soft hover:text-text
						"
						onclick={clearSelection}
					>
						Clear
					</button>
				{/if}
			</div>

			<div class="flex items-center justify-between gap-2 px-1 text-[11px] text-text-muted">
				<span>{selectedOptions.length} selected</span>
				<span>{filteredOptions.length} shown</span>
			</div>

			<div
				role="listbox"
				aria-multiselectable="true"
				class="grid max-h-56 gap-1 overflow-y-auto pr-1"
			>
				{#if filteredOptions.length > 0}
					{#each filteredOptions as option (option.value)}
						<button
							type="button"
							role="option"
							aria-selected={isSelected(option)}
							disabled={option.disabled}
							class={`
								flex min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left
								text-sm transition
								disabled:cursor-not-allowed disabled:opacity-50
								${
									isSelected(option)
										? 'bg-primary/15 text-primary'
										: 'text-text-soft hover:bg-surface-soft hover:text-text'
								}
							`}
							onclick={() => toggleOption(option)}
						>
							<span class="min-w-0 truncate">{option.label}</span>

							<span
								class={`
									flex size-4 shrink-0 items-center justify-center rounded border text-[10px]
									${isSelected(option) ? 'border-primary text-primary' : 'border-border text-transparent'}
								`}
							>
								✓
							</span>
						</button>
					{/each}
				{:else}
					<p class="px-2 py-6 text-center text-sm text-text-muted">No matches.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
