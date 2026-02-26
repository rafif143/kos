<script>
	import { store } from '$lib/stores.svelte.js';
	import { i18n } from '$lib/i18n.svelte.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Search, CalendarDays, CreditCard, DoorOpen, User, Wrench, LogOut } from '@lucide/svelte';
	import { format } from 'date-fns';

	let search = $state('');
	let detailOpen = $state(false);
	let selectedEvent = $state(null);

	const eventIcons = {
		booking_created: CalendarDays,
		booking_updated: CalendarDays,
		booking_cancelled: CalendarDays,
		booking_deleted: CalendarDays,
		booking_extended: CalendarDays,
		payment_created: CreditCard,
		payment_received: CreditCard,
		payment_updated: CreditCard,
		payment_refunded: CreditCard,
		tenant_checkout: LogOut,
		room_created: DoorOpen,
		room_updated: DoorOpen,
		room_deleted: DoorOpen,
		room_maintenance: Wrench,
		user_created: User,
		user_updated: User,
		user_deleted: User,
		facility_created: Wrench,
		facility_updated: Wrench,
		facility_deleted: Wrench
	};

	const eventColors = {
		booking_created: 'default',
		booking_updated: 'secondary',
		booking_cancelled: 'destructive',
		booking_deleted: 'destructive',
		booking_extended: 'default',
		payment_created: 'default',
		payment_received: 'default',
		payment_updated: 'secondary',
		payment_refunded: 'destructive',
		tenant_checkout: 'outline',
		room_created: 'default',
		room_updated: 'secondary',
		room_deleted: 'destructive',
		room_maintenance: 'outline',
		user_created: 'default',
		user_updated: 'secondary',
		user_deleted: 'destructive',
		facility_created: 'default',
		facility_updated: 'secondary',
		facility_deleted: 'destructive'
	};

	function getEventLabel(type) {
		return i18n.t(`evt_${type}`);
	}

	function formatEventData(data) {
		if (!data) return '';
		const parts = [];
		if (data.user) parts.push(data.user);
		if (data.room) parts.push(data.room);
		if (data.facility) parts.push(data.facility);
		if (data.period) parts.push(data.period);
		if (data.method) parts.push(`via ${data.method}`);
		if (data.amount) parts.push(`Rp ${data.amount.toLocaleString('id-ID')}`);
		if (data.new_end) parts.push(`→ ${formatDate(data.new_end)}`);
		if (data.reason) parts.push(data.reason);
		return parts.join(' · ');
	}

	const filteredHistory = $derived(
		[...store.history].reverse().filter((h) => {
			const q = search.toLowerCase();
			return (
				getEventLabel(h.event_type).toLowerCase().includes(q) ||
				formatEventData(h.data).toLowerCase().includes(q)
			);
		})
	);

	function formatDateTime(d) {
		try {
			return format(new Date(d), 'dd MMM yyyy HH:mm');
		} catch {
			return d;
		}
	}
	function formatDate(d) {
		try {
			return format(new Date(d), 'dd MMM yyyy');
		} catch {
			return d;
		}
	}

	function relativeTime(d) {
		try {
			const diff = Date.now() - new Date(d).getTime();
			const mins = Math.floor(diff / 60000);
			if (mins < 1) return i18n.t('justNow');
			if (mins < 60) return `${mins} ${i18n.t('minutesAgo')}`;
			const hours = Math.floor(mins / 60);
			if (hours < 24) return `${hours} ${i18n.t('hoursAgo')}`;
			const days = Math.floor(hours / 24);
			if (days < 30) return `${days} ${i18n.t('daysAgo')}`;
			return formatDateTime(d);
		} catch {
			return d;
		}
	}

	function viewDetail(event) {
		selectedEvent = event;
		detailOpen = true;
	}
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-2xl font-bold tracking-tight">{i18n.t('historyTitle')}</h2>
		<p class="text-muted-foreground">{i18n.t('historySubtitle')}</p>
	</div>

	<div class="relative max-w-sm">
		<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input bind:value={search} placeholder={i18n.t('searchActivity')} class="pl-9" />
	</div>

	<div class="space-y-2">
		{#each filteredHistory as event}
			{@const Icon = eventIcons[event.event_type] ?? CalendarDays}
			{@const summary = formatEventData(event.data)}
			<button
				class="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
				onclick={() => viewDetail(event)}
			>
				<div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
					<Icon class="h-4 w-4 text-muted-foreground" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<Badge variant={eventColors[event.event_type] ?? 'outline'} class="text-xs">
							{getEventLabel(event.event_type)}
						</Badge>
						<span class="text-xs text-muted-foreground">{relativeTime(event.timestamp)}</span>
					</div>
					{#if summary}
						<p class="mt-1 truncate text-sm">{summary}</p>
					{/if}
				</div>
			</button>
		{/each}
		{#if filteredHistory.length === 0}
			<div class="py-12 text-center text-muted-foreground">{i18n.t('noHistory')}</div>
		{/if}
	</div>
</div>

<!-- Detail Dialog -->
<Dialog.Root bind:open={detailOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{i18n.t('activityDetail')}</Dialog.Title>
			<Dialog.Description>{i18n.t('activityDetailSub')}</Dialog.Description>
		</Dialog.Header>
		{#if selectedEvent}
			{@const Icon = eventIcons[selectedEvent.event_type] ?? CalendarDays}
			<div class="space-y-3">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
						<Icon class="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<Badge variant={eventColors[selectedEvent.event_type] ?? 'outline'}>
							{getEventLabel(selectedEvent.event_type)}
						</Badge>
						<p class="mt-0.5 text-xs text-muted-foreground">
							{formatDateTime(selectedEvent.timestamp)}
						</p>
					</div>
				</div>

				{#if selectedEvent.data}
					<div class="space-y-2 rounded-lg border p-3 text-sm">
						{#each Object.entries(selectedEvent.data) as [key, value]}
							<div class="flex justify-between">
								<span class="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
								<span class="text-right font-medium">
									{#if key === 'amount'}
										Rp {value.toLocaleString('id-ID')}
									{:else if key === 'new_end'}
										{formatDate(value)}
									{:else}
										{value}
									{/if}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (detailOpen = false)}>{i18n.t('close')}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
