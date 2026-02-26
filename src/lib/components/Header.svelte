<script>
	import { store } from '$lib/stores.svelte.js';
	import { i18n } from '$lib/i18n.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { Menu, Sun, Moon, Languages } from '@lucide/svelte';
	import { toggleMode, mode } from 'mode-watcher';

	let { ontoggle } = $props();

	const currentMode = $derived(mode.current);
</script>

<header class="flex h-14 items-center justify-between border-b border-border bg-card px-4">
	<!-- Left: hamburger + title -->
	<div class="flex items-center gap-3">
		<Button variant="ghost" size="icon" class="lg:hidden" onclick={ontoggle}>
			<Menu class="h-5 w-5" />
		</Button>
		<h1 class="text-base font-semibold md:text-lg">{i18n.t('appName')}</h1>
	</div>

	<!-- Right: role toggle + lang + dark mode -->
	<div class="flex items-center gap-2">
		<!-- Role info is now in Sidebar -->

		<!-- Language toggle -->
		<Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => i18n.toggle()}>
			<span class="text-xs font-bold">{i18n.locale === 'id' ? 'ID' : 'EN'}</span>
		</Button>

		<!-- Dark mode toggle -->
		<Button variant="ghost" size="icon" onclick={toggleMode} class="h-8 w-8">
			{#if currentMode === 'dark'}
				<Sun class="h-4 w-4" />
			{:else}
				<Moon class="h-4 w-4" />
			{/if}
		</Button>
	</div>
</header>
