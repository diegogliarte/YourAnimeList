<script>
	import Button from '$lib/components/ui/Button.svelte';
	import TextInput from '$lib/components/ui/TextInput.svelte';
	import Panel from '$lib/components/ui/Panel.svelte';
	import Pill from '$lib/components/ui/Pill.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';

	let username = $state("");
</script>

<div class="m-10 flex flex-col gap-2">
	<Button>cancel</Button>
	<Button variant="primary">load</Button>
	<TextInput bind:value={username} placeholder="MAL username" />
	<Panel title="Anime List" description="Search your MAL profile.">
		Content here
	</Panel>

	<Pill active>completed</Pill>
	<Pill>watching</Pill>

	<Tabs
		tabs={[
		{ label: 'List', href: '/list' },
		{ label: 'Stats', href: '/stats' },
		{ label: 'Top Anime', href: '/top-anime' },
		{ label: 'Franchises', href: '/franchises' }
	]}
	/>
</div>

