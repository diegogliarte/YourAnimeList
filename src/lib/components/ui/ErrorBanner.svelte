<script lang="ts">
	type Props = {
		message: string | null;
	};

	let { message }: Props = $props();
</script>

{#if message}
	<div class="mb-3 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-accent">
		{message}
	</div>
{/if}