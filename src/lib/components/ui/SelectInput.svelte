<script lang="ts" module>
	export type SelectOption = {
		label: string;
		value: string;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	type Props = {
		label: string;
		value?: string;
		options: SelectOption[];
		placeholder?: string;
		disabled?: boolean;
		class?: string;
	};

	let {
		label,
		value = $bindable(''),
		options,
		placeholder = 'Any',
		disabled = false,
		class: className = ''
	}: Props = $props();
</script>

<label class={`grid min-w-0 gap-1 text-xs text-text-muted ${className}`}>
	<span class="truncate">{label}</span>

	<select
		bind:value
		{disabled}
		class="
			w-full min-w-0 truncate rounded-md border border-border bg-surface px-3 py-1.5
			text-sm text-text outline-none transition
			hover:border-primary/70 hover:bg-surface-soft
			focus:border-primary
			disabled:cursor-not-allowed disabled:opacity-60
		"
	>
		{#if placeholder}
			<option value="">{placeholder}</option>
		{/if}

		{#each options as option (option.value)}
			<option value={option.value} disabled={option.disabled}>
				{option.label}
			</option>
		{/each}
	</select>
</label>