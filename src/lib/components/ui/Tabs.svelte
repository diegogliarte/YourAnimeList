<script lang="ts">
	type Tab = {
		label: string;
		href: string;
		active: boolean;
	};

	type Props = {
		tabs: Tab[];
	};

	let { tabs }: Props = $props();
</script>

<nav class="inline-flex rounded-md border border-white/10 bg-neutral-950/80 p-0.5 shadow-sm shadow-black/20">
	{#each tabs as tab}
		<a
			href={tab.href}
			class={[
				'cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition',
				tab.active
					? 'bg-accent text-neutral-950'
					: 'text-neutral-400 hover:bg-white/[0.07] hover:text-white'
			]
				.filter(Boolean)
				.join(' ')}
		>
			{tab.label}
		</a>
	{/each}
</nav>