<script lang="ts">
	type Props = {
		label: string;
		value: string;
		help?: string;
	};

	let { label, value, help }: Props = $props();
</script>

<article class="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
	<p class="text-[0.65rem] font-medium tracking-wide text-neutral-500 uppercase">
		{label}
	</p>

	<p class="mt-0.5 text-xl font-semibold text-white">
		{value}
	</p>

	{#if help}
		<p class="mt-0.5 text-xs text-neutral-500">
			{help}
		</p>
	{/if}
</article>
