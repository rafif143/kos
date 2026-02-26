<script>
	import { page } from '$app/stores';
	import { store } from '$lib/stores.svelte.js';
	import { i18n } from '$lib/i18n.svelte.js';
	import {
		LayoutDashboard,
		Users,
		DoorOpen,
		CalendarDays,
		History,
		X,
		Building2,
		Search,
		ClipboardList,
		LogOut,
		ChevronRight
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let { onclose } = $props();

	const isAdmin = $derived(store.role === 'admin');

	const adminMenu = $derived([
		{ href: '/', label: i18n.t('dashboard'), icon: LayoutDashboard },
		{ href: '/users', label: i18n.t('users'), icon: Users },
		{ href: '/rooms', label: i18n.t('roomsFacilities'), icon: DoorOpen },
		{ href: '/bookings', label: i18n.t('bookingsPayments'), icon: CalendarDays },
		{ href: '/history', label: i18n.t('history'), icon: History }
	]);

	const customerMenu = $derived([
		{ href: '/', label: i18n.t('home'), icon: LayoutDashboard },
		{ href: '/rooms', label: i18n.t('browseRooms'), icon: Search },
		{ href: '/bookings', label: i18n.t('myBookings'), icon: ClipboardList }
	]);

	const menuItems = $derived(isAdmin ? adminMenu : customerMenu);

	const isLogout = $derived(i18n.t('checkout') === 'Checkout' ? 'Logout' : 'Keluar');

	function handleLogout() {
		store.logout();
		goto('/login');
	}
</script>

<nav class="sidebar flex h-full flex-col bg-sidebar text-sidebar-foreground">
	<!-- Logo -->
	<div class="logo-area flex items-center justify-between px-5 py-5">
		<a href="/" class="group flex items-center gap-3">
			<div
				class="logo-icon flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-md transition-transform duration-200 group-hover:scale-105"
			>
				<Building2 class="h-5 w-5" />
			</div>
			<span class="text-xl font-bold tracking-tight">KosApp</span>
		</a>
		<button
			class="close-btn rounded-lg p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
			onclick={onclose}
			aria-label="Close sidebar"
		>
			<X class="h-4 w-4" />
		</button>
	</div>

	<!-- User Card -->
	<div class="mx-4 mb-2 rounded-xl bg-sidebar-accent/60 px-4 py-3 ring-1 ring-sidebar-border/50">
		<div class="flex items-center gap-3">
			<div
				class="avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sm font-bold text-sidebar-primary"
			>
				{(store.getUserName(store.currentUserId) || 'U')[0].toUpperCase()}
			</div>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm leading-tight font-semibold">
					{store.getUserName(store.currentUserId) || 'Loading...'}
				</p>
				<p class="mt-0.5 text-xs text-sidebar-foreground/50 capitalize">{store.role}</p>
			</div>
		</div>
	</div>

	<!-- Section Label -->
	<div class="px-5 pt-4 pb-1">
		<p class="text-[10px] font-semibold tracking-widest text-sidebar-foreground/30 uppercase">
			{isAdmin ? 'Management' : 'Navigation'}
		</p>
	</div>

	<!-- Menu Items -->
	<div class="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
		{#each menuItems as item}
			{@const isActive = $page.url.pathname === item.href}
			{@const Icon = item.icon}
			<a
				href={item.href}
				onclick={onclose}
				class="nav-item group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
					{isActive
					? 'active bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
					: 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'}"
			>
				<Icon
					class="h-4 w-4 shrink-0 transition-transform duration-150 {isActive
						? ''
						: 'group-hover:scale-110'}"
				/>
				<span class="flex-1">{item.label}</span>
				{#if isActive}
					<ChevronRight class="h-3.5 w-3.5 opacity-70" />
				{/if}
			</a>
		{/each}
	</div>

	<!-- Footer / Logout -->
	<div class="space-y-3 border-t border-sidebar-border/50 p-4">
		<button
			onclick={handleLogout}
			class="logout-btn flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive/80 transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
		>
			<LogOut class="h-4 w-4 shrink-0" />
			<span>{isLogout}</span>
		</button>
		<p class="text-center text-[11px] tracking-wide text-sidebar-foreground/25">© 2026 KosApp</p>
	</div>
</nav>

<style>
	.sidebar {
		border-right: 1px solid hsl(var(--sidebar-border));
	}

	.logo-area {
		border-bottom: 1px solid hsl(var(--sidebar-border) / 0.5);
	}

	.nav-item.active {
		position: relative;
	}

	.nav-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 60%;
		background: hsl(var(--sidebar-primary-foreground) / 0.5);
		border-radius: 0 2px 2px 0;
	}

	.logout-btn {
		transition:
			background-color 150ms ease,
			color 150ms ease,
			transform 100ms ease;
	}

	.logout-btn:hover {
		transform: translateX(2px);
	}

	.nav-item {
		position: relative;
		overflow: hidden;
	}
</style>
