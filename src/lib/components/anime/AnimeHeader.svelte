<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';

	type ActiveTab = 'list' | 'rankings';

	type Props = {
		activeTab: ActiveTab;
		username: string;
		query?: string;
		loading?: boolean;
		onSubmit: () => void;
	};

	let {
		activeTab,
		username = $bindable(''),
		query = '',
		loading = false,
		onSubmit
	}: Props = $props();

	const getTabHref = (path: string) => {
		const params = new URLSearchParams();

		const trimmedUsername = username.trim();
		const trimmedQuery = query.trim();

		if (trimmedUsername) params.set('username', trimmedUsername);
		if (trimmedQuery) params.set('q', trimmedQuery);

		const queryString = params.toString();

		return queryString ? `${path}?${queryString}` : path;
	};

	const handleSubmit = (event: SubmitEvent) => {
		event.preventDefault();
		onSubmit();
	};
</script>

<header class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
	<div class="flex items-center gap-3">
		<a href={getTabHref('/')} class="cursor-pointer text-sm font-semibold tracking-tight text-white">
			anime
		</a>

		<Tabs
			tabs={[
				{
					label: 'list',
					href: getTabHref('/'),
					active: activeTab === 'list'
				},
				{
					label: 'rankings',
					href: getTabHref('/rankings'),
					active: activeTab === 'rankings'
				}
			]}
		/>
	</div>

	<form class="flex gap-2" onsubmit={handleSubmit}>
		<Input
			class="w-44 sm:w-56"
			placeholder="username"
			autocomplete="off"
			bind:value={username}
		/>

		<Button type="submit" variant="solid" disabled={loading}>
			{loading ? '...' : 'search'}
		</Button>
	</form>
</header>