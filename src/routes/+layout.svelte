<script>
	import './layout.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Header from '$lib/components/Header.svelte';
	import { i18n } from '$lib/i18n.svelte.js';
	import { store } from '$lib/stores.svelte.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { Building2 } from '@lucide/svelte';

	let { children } = $props();

	let sidebarOpen = $state(false);

	// Check authentication on route change
	$effect(() => {
		const isAuthRoute = page.url.pathname === '/login' || page.url.pathname === '/register';
		if (!store.currentUserId && !isAuthRoute) {
			goto('/login');
		} else if (store.currentUserId && isAuthRoute) {
			goto('/');
		}
	});

	// Close sidebar on route change (mobile)
	$effect(() => {
		page.url.pathname;
		sidebarOpen = false;
	});

	let isAuthRoute = $derived(page.url.pathname === '/login' || page.url.pathname === '/register');
</script>

<ModeWatcher />
<Toaster position="top-right" richColors />

{#if isAuthRoute}
	<!-- Premium Split-Screen Auth Layout -->
	<div class="flex min-h-screen bg-background">
		<!-- Left: Form Area -->
		<div
			class="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:flex-none lg:px-20 xl:px-24"
		>
			<div class="mx-auto w-full max-w-sm lg:w-96">
				<!-- Brand Header -->
				<div class="mb-10 flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
					>
						<Building2 class="h-6 w-6" />
					</div>
					<span class="text-2xl font-bold tracking-tight">KosApp</span>
				</div>
				{@render children()}
			</div>
		</div>
		<!-- Right: Image Area -->
		<div class="relative hidden w-0 flex-1 lg:block">
			<img
				class="absolute inset-0 h-full w-full object-cover"
				src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"
				alt="Modern interior"
			/>
			<div class="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
			<div
				class="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"
			></div>
			<div class="absolute right-16 bottom-16 left-16 text-white">
				<h2 class="mb-4 text-4xl leading-tight font-bold drop-shadow-md">
					Premium Boarding<br />House Management
				</h2>
				<p class="text-lg text-white/90 drop-shadow">
					Effortlessly manage rooms, tenants, and payments in one unified platform.
				</p>
			</div>
		</div>
	</div>
{:else if store.currentUserId}
	<!-- Main App Layout for authenticated users -->
	<div class="app-layout">
		<!-- Mobile Sidebar Overlay -->
		{#if sidebarOpen}
			<button
				class="sidebar-backdrop"
				onclick={() => (sidebarOpen = false)}
				aria-label="Close sidebar"
			></button>
		{/if}

		<!-- Sidebar -->
		<aside class="sidebar-wrapper" class:open={sidebarOpen}>
			<Sidebar onclose={() => (sidebarOpen = false)} />
		</aside>

		<!-- Main Content -->
		<div class="main-content">
			<Header ontoggle={() => (sidebarOpen = !sidebarOpen)} />
			<main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
				<div class="mx-auto max-w-6xl">
					{#if store.loading}
						<div class="flex h-64 items-center justify-center">
							<div
								class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
							></div>
						</div>
					{:else}
						{@render children()}
					{/if}
				</div>
			</main>
		</div>
	</div>
{/if}

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
	}

	/* Sidebar wrapper - fixed on desktop, slide-in drawer on mobile */
	.sidebar-wrapper {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: 16rem; /* 256px */
		z-index: 40;
		transform: translateX(-100%);
		transition: transform 200ms ease-in-out;
	}

	.sidebar-wrapper.open {
		transform: translateX(0);
	}

	/* Desktop: sidebar always visible */
	@media (min-width: 1024px) {
		.sidebar-wrapper {
			transform: translateX(0);
		}

		.main-content {
			margin-left: 16rem;
		}
	}

	/* Main content takes remaining space */
	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	/* Backdrop for mobile */
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		z-index: 30;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(2px);
		border: none;
		cursor: pointer;
	}
</style>
