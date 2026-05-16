<script lang="ts">
	type Props = {
		title: string;
		description?: string;
	};

	let { title, description }: Props = $props();
</script>

<section
	class="rounded-lg border border-white/10 bg-neutral-900/90 px-3 py-10 text-center shadow-xl shadow-black/20"
>
	<h1 class="text-base font-medium text-white">
		{title}
	</h1>

	{#if description}
		<p class="mt-1 text-sm text-neutral-500">
			{description}
		</p>
	{/if}
</section>
