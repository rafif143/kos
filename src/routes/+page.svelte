<script>
	import { store } from '$lib/stores.svelte.js';
	import { i18n } from '$lib/i18n.svelte.js';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		DoorOpen,
		CalendarDays,
		CreditCard,
		Users,
		TrendingUp,
		Home,
		ArrowRight
	} from '@lucide/svelte';

	const isAdmin = $derived(store.role === 'admin');
	const stats = $derived(store.stats);

	// Customer stats
	const myBookings = $derived(store.bookings.filter((b) => b.user_id === store.currentUserId));
	const myActiveBookings = $derived(myBookings.filter((b) => b.status === 'active'));
	const myPendingPayments = $derived(
		store.payments.filter((p) => {
			const booking = store.bookings.find((b) => b.id === p.booking_id);
			return booking?.user_id === store.currentUserId && p.status === 'pending';
		})
	);

	const adminCards = $derived([
		{
			label: i18n.t('totalRooms'),
			value: stats.totalRooms,
			icon: DoorOpen,
			color: 'text-blue-500',
			bg: 'bg-blue-500/10'
		},
		{
			label: i18n.t('availableRooms'),
			value: stats.availableRooms,
			icon: Home,
			color: 'text-green-500',
			bg: 'bg-green-500/10'
		},
		{
			label: i18n.t('activeBookings'),
			value: stats.activeBookings,
			icon: CalendarDays,
			color: 'text-purple-500',
			bg: 'bg-purple-500/10'
		},
		{
			label: i18n.t('pendingPayments'),
			value: stats.pendingPayments,
			icon: CreditCard,
			color: 'text-orange-500',
			bg: 'bg-orange-500/10'
		},
		{
			label: i18n.t('users'),
			value: store.users.length,
			icon: Users,
			color: 'text-pink-500',
			bg: 'bg-pink-500/10'
		},
		{
			label: i18n.t('totalRevenue'),
			value: `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`,
			icon: TrendingUp,
			color: 'text-emerald-500',
			bg: 'bg-emerald-500/10'
		}
	]);
</script>

<div class="space-y-6">
	{#if isAdmin}
		<!-- ═══ ADMIN DASHBOARD ═══ -->
		<div>
			<h2 class="text-2xl font-bold tracking-tight">{i18n.t('dashboardTitle')}</h2>
			<p class="text-muted-foreground">{i18n.t('dashboardSubtitle')}</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each adminCards as card}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Header class="flex flex-row items-center justify-between pb-2">
						<Card.Title class="text-sm font-medium text-muted-foreground">{card.label}</Card.Title>
						<div class="rounded-lg p-2 {card.bg}">
							<card.icon class="h-4 w-4 {card.color}" />
						</div>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{card.value}</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<!-- ═══ CUSTOMER HOME ═══ -->
		<div>
			<h2 class="text-2xl font-bold tracking-tight">
				{i18n.t('welcomeBack')}, {store.getUserName(store.currentUserId)} 👋
			</h2>
			<p class="text-muted-foreground">{i18n.t('customerDashSubtitle')}</p>
		</div>

		<!-- Quick stats -->
		<div class="grid gap-4 sm:grid-cols-3">
			<Card.Root class="transition-shadow hover:shadow-md">
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>{i18n.t('myActiveBookings')}</Card.Title
					>
					<div class="rounded-lg bg-purple-500/10 p-2">
						<CalendarDays class="h-4 w-4 text-purple-500" />
					</div>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{myActiveBookings.length}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="transition-shadow hover:shadow-md">
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>{i18n.t('myTotalBookings')}</Card.Title
					>
					<div class="rounded-lg bg-blue-500/10 p-2">
						<CalendarDays class="h-4 w-4 text-blue-500" />
					</div>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{myBookings.length}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root class="transition-shadow hover:shadow-md">
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>{i18n.t('myPendingPayments')}</Card.Title
					>
					<div class="rounded-lg bg-orange-500/10 p-2">
						<CreditCard class="h-4 w-4 text-orange-500" />
					</div>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{myPendingPayments.length}</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Quick Actions -->
		<div class="grid gap-4 sm:grid-cols-2">
			<a href="/rooms">
				<Card.Root class="cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
					<Card.Content class="flex items-center justify-between p-6">
						<div class="flex items-center gap-4">
							<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
								<DoorOpen class="h-6 w-6 text-blue-500" />
							</div>
							<div>
								<p class="font-semibold">{i18n.t('browseAvailable')}</p>
								<p class="text-sm text-muted-foreground">{i18n.t('findRoom')}</p>
							</div>
						</div>
						<ArrowRight class="h-5 w-5 text-muted-foreground" />
					</Card.Content>
				</Card.Root>
			</a>
			<a href="/bookings">
				<Card.Root class="cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
					<Card.Content class="flex items-center justify-between p-6">
						<div class="flex items-center gap-4">
							<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
								<CalendarDays class="h-6 w-6 text-purple-500" />
							</div>
							<div>
								<p class="font-semibold">{i18n.t('viewBookings')}</p>
								<p class="text-sm text-muted-foreground">{i18n.t('manageBookings')}</p>
							</div>
						</div>
						<ArrowRight class="h-5 w-5 text-muted-foreground" />
					</Card.Content>
				</Card.Root>
			</a>
		</div>

		<!-- Active Bookings -->
		{#if myActiveBookings.length > 0}
			<Card.Root>
				<Card.Header>
					<Card.Title>{i18n.t('yourActiveBookings')}</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						{#each myActiveBookings as booking}
							<div class="flex items-center justify-between rounded-lg border p-3">
								<div>
									<p class="font-medium">{store.getRoomName(booking.room_id)}</p>
									<p class="text-sm text-muted-foreground">
										{booking.start_date} — {booking.end_date}
									</p>
								</div>
								<div class="text-right">
									<Badge>active</Badge>
									<p class="text-sm text-muted-foreground">
										Rp {booking.amount.toLocaleString('id-ID')}
									</p>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
