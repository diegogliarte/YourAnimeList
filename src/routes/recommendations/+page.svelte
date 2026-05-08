<script lang="ts">
	import Shell from '$lib/components/ui/Shell.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
</script>

<svelte:head>
	<title>Recommendations</title>
</svelte:head>

<Shell>
	<header class="mb-3 flex items-center gap-3">
		<a href="/" class="cursor-pointer text-sm font-semibold tracking-tight text-white">
			anime
		</a>

		<Tabs
			tabs={[
				{
					label: 'list',
					href: '/',
					active: false
				},
				{
					label: 'recommendations',
					href: '/recommendations',
					active: true
				}
			]}
		/>
	</header>

	<section class="rounded-lg border border-white/10 bg-neutral-900/90 px-3 py-10 text-center shadow-xl shadow-black/20">
		<h1 class="text-base font-medium text-white">working!</h1>
	</section>
</Shell>