<script lang="ts">
	type Props = {
		checked?: boolean;
		label?: string;
		disabled?: boolean;
		class?: string;
	};

	let {
		checked = $bindable(false),
		label = '',
		disabled = false,
		class: className = ''
	}: Props = $props();

	function toggle() {
		if (disabled) return;

		checked = !checked;
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	class={`
		inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 px-2 text-xs
		transition disabled:cursor-not-allowed disabled:opacity-50
		${checked ? 'text-primary' : 'text-text-muted hover:text-text'}
		${className}
	`}
	onclick={toggle}
>
	<span class="whitespace-nowrap">
		{label}
	</span>

	<span
		class={`
			flex h-4 w-7 shrink-0 items-center rounded-full border p-0.5 transition
			${checked ? 'border-primary bg-primary/20' : 'border-border bg-background'}
		`}
	>
		<span
			class={`
				size-2.5 rounded-full transition
				${checked ? 'translate-x-3 bg-primary' : 'translate-x-0 bg-text-muted'}
			`}
		></span>
	</span>
</button>
