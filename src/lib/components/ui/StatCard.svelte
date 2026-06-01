<script lang="ts">
	import Panel from '$lib/components/ui/Panel.svelte';

	type Props = {
		label: string;
		value: string | number;
		hint?: string;
		class?: string;
	};

	let { label, value, hint, class: className = '' }: Props = $props();
</script>

<Panel class={`p-2! ${className}`}>
	<p class="text-xs tracking-wide text-text-muted uppercase">{label}</p>
	<p class="mt-1 text-xl font-semibold text-text">{value}</p>

	{#if hint}
		<p class="mt-1 text-xs text-text-muted">{hint}</p>
	{/if}
</Panel>
