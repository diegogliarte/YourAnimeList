<script lang="ts">
	type Props = {
		label: string;
		checked?: boolean;
		disabled?: boolean;
		class?: string;
		onchange?: (checked: boolean) => void;
	};

	let {
		label,
		checked = $bindable(false),
		disabled = false,
		class: className = '',
		onchange
	}: Props = $props();

	function handleChange() {
		onchange?.(checked);
	}
</script>

<label
	class={`
		inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1
		text-xs text-text-soft transition outline-none
		 hover:text-text
		${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
		${className}
	`}
>
	<input type="checkbox" bind:checked {disabled} onchange={handleChange} class="peer sr-only" />

	<span
		class="
			flex size-3.5 shrink-0 items-center justify-center rounded border border-border
			text-[10px] leading-none text-primary transition
			peer-checked:border-primary
			peer-focus-visible:border-primary
		"
	>
		{#if checked}
			✓
		{/if}
	</span>

	<span class="truncate">{label}</span>
</label>
