<script lang="ts">
	type Props = {
		message: string;
	};

	let { message }: Props = $props();
</script>

<div class="mx-auto mt-8 animate-pulse text-center text-xl text-accent">
	{message}
</div>