<script>
	import { store } from '$lib/stores.svelte.js';
	import { i18n } from '$lib/i18n.svelte.js';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import {
		Plus,
		Pencil,
		Trash2,
		Search,
		CalendarDays,
		CreditCard,
		CircleCheck,
		Clock,
		CircleDollarSign,
		LogOut,
		Ban,
		Eye
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const isAdmin = $derived(store.role === 'admin');

	onMount(async () => {
		const paymentStatus = $page.url.searchParams.get('payment');
		if (paymentStatus === 'success') {
			toast.loading('Memverifikasi pembayaran sistem... Mohon tunggu', { duration: 4000 });
			// The user is redirected back almost immediately, but Xendit webhook takes roughly 1-4 seconds to reach us.
			// Let's hold for 3.5 seconds, then reload, so we catch the paid status!
			setTimeout(async () => {
				await store.reload();
				toast.success('Pembayaran berhasil dikonfirmasi Xendit!', { duration: 5000 });
			}, 3500);
			goto('/bookings', { replaceState: true });
		} else if (paymentStatus === 'failed') {
			toast.error('Pembayaran gagal atau dibatalkan. Silakan coba lagi.');
			goto('/bookings', { replaceState: true });
		}
	});
	let activeTab = $state('bookings');

	// ─── BOOKINGS ───
	let bookingSearch = $state('');
	let bookingDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let editingBooking = $state(null);
	let deletingBooking = $state(null);

	let formUserId = $state(0);
	let formRoomId = $state(0);
	let formType = $state('monthly');
	let formStartDate = $state('');
	let formEndDate = $state('');
	let formStatus = $state('pending');
	let formAmount = $state(0);

	const bookingStatusColors = {
		active: 'default',
		pending: 'secondary',
		completed: 'outline',
		cancelled: 'destructive'
	};

	const allBookings = $derived(
		isAdmin ? store.bookings : store.bookings.filter((b) => b.user_id === store.currentUserId)
	);

	const filteredBookings = $derived(
		allBookings.filter((b) => {
			const q = bookingSearch.toLowerCase();
			return (
				store.getUserName(b.user_id).toLowerCase().includes(q) ||
				store.getRoomName(b.room_id).toLowerCase().includes(q) ||
				b.status.includes(q)
			);
		})
	);

	function formatDate(d) {
		try {
			return format(new Date(d), 'dd MMM yyyy');
		} catch {
			return d;
		}
	}

	function openAddBooking() {
		editingBooking = null;
		formUserId = store.users[0]?.id ?? 0;
		formRoomId = store.rooms[0]?.id ?? 0;
		formType = 'monthly';
		formStartDate = '';
		formEndDate = '';
		formStatus = 'pending';
		formAmount = 0;
		bookingDialogOpen = true;
	}

	function openEditBooking(booking) {
		editingBooking = booking;
		formUserId = booking.user_id;
		formRoomId = booking.room_id;
		formType = booking.type;
		formStartDate = booking.start_date;
		formEndDate = booking.end_date;
		formStatus = booking.status;
		formAmount = booking.amount;
		bookingDialogOpen = true;
	}

	async function handleBookingSubmit(e) {
		e.preventDefault();
		const data = {
			user_id: Number(formUserId),
			room_id: Number(formRoomId),
			type: formType,
			start_date: formStartDate,
			end_date: formEndDate,
			status: formStatus,
			amount: Number(formAmount)
		};
		try {
			if (editingBooking) {
				await store.updateBooking(editingBooking.id, data);
				toast.success('Booking updated successfully!');
			} else {
				await store.addBooking(data);
				toast.success('Booking created successfully!');
			}
			bookingDialogOpen = false;
		} catch {
			toast.error('Failed to save booking.');
		}
	}

	function confirmDeleteBooking(booking) {
		deletingBooking = booking;
		deleteDialogOpen = true;
	}
	async function handleDeleteBooking() {
		try {
			await store.deleteBooking(deletingBooking.id);
			toast.success('Booking deleted successfully!');
			deleteDialogOpen = false;
		} catch {
			toast.error('Failed to delete booking.');
		}
	}

	// ─── DETAIL VIEW ───
	let detailDialogOpen = $state(false);
	let detailBooking = $state(null);

	function openDetail(booking) {
		detailBooking = booking;
		detailDialogOpen = true;
	}

	// ─── PAYMENTS ───
	let paymentSearch = $state('');
	let payDialogOpen = $state(false);
	let selectedBookingForPay = $state(null);
	let payMethod = $state('transfer');
	let checkoutDialogOpen = $state(false);
	let checkoutBooking = $state(null);

	const allPayments = $derived(
		isAdmin
			? store.payments
			: store.payments.filter((p) => {
					const b = store.bookings.find((bk) => bk.id === p.booking_id);
					return b?.user_id === store.currentUserId;
				})
	);

	const pendingPaymentCount = $derived(allPayments.filter((p) => p.status === 'pending').length);

	// Active bookings that need payment action
	const activeBookingsWithPayments = $derived(
		allBookings.filter((b) => b.status === 'active' || b.status === 'pending')
	);

	const filteredPaymentBookings = $derived(
		activeBookingsWithPayments.filter((b) => {
			const q = paymentSearch.toLowerCase();
			if (!q) return true;
			return (
				store.getUserName(b.user_id).toLowerCase().includes(q) ||
				store.getRoomName(b.room_id).toLowerCase().includes(q)
			);
		})
	);

	function openPayDialog(booking) {
		selectedBookingForPay = booking;
		payMethod = 'transfer';
		payDialogOpen = true;
	}

	let isCheckingOut = $state(false);

	async function handlePay(payment) {
		if (isAdmin) {
			try {
				await store.payMonthly(payment.id, payMethod);
				toast.success('Pembayaran berhasil dicatat!');
			} catch {
				toast.error('Gagal memproses pembayaran.');
			}
			return;
		}

		// For Customer -> Xendit
		isCheckingOut = true;
		try {
			const booking = store.bookings.find((b) => b.id === payment.booking_id);
			const user = store.users.find((u) => u.id === booking.user_id);

			const res = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					paymentId: payment.id,
					amount: payment.amount,
					payerEmail: user?.email || '',
					description: `Pembayaran KosApp (${payment.period})`
				})
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			toast.success('Mengalihkan ke halaman pembayaran...');
			// Redirect user to invoice url immediately
			window.location.href = data.invoiceUrl;
		} catch (err) {
			console.error(err);
			toast.error(err.message || 'Gagal membuat tagihan pembayaran.');
		} finally {
			isCheckingOut = false;
		}
	}

	function confirmCheckout(booking) {
		checkoutBooking = booking;
		checkoutDialogOpen = true;
	}

	async function handleCheckout() {
		try {
			await store.checkoutBooking(checkoutBooking.id);
			toast.success(
				`${store.getUserName(checkoutBooking.user_id)} telah checkout dari ${store.getRoomName(checkoutBooking.room_id)}`
			);
			checkoutDialogOpen = false;
		} catch {
			toast.error('Gagal melakukan checkout.');
		}
	}

	function formatDateTime(d) {
		if (!d) return '—';
		try {
			return format(new Date(d), 'dd MMM yyyy HH:mm');
		} catch {
			return d;
		}
	}
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-2xl font-bold tracking-tight">
			{isAdmin ? i18n.t('bookingsTitle') : i18n.t('myBookingsTitle')}
		</h2>
		<p class="text-muted-foreground">
			{isAdmin ? i18n.t('bookingsSubtitleAdmin') : i18n.t('bookingsSubtitleCustomer')}
		</p>
	</div>

	<!-- Tab switcher -->
	<div class="flex gap-1 rounded-lg border bg-muted p-1">
		<button
			class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors
				{activeTab === 'bookings'
				? 'bg-background text-foreground shadow-sm'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = 'bookings')}
		>
			<CalendarDays class="h-4 w-4" />
			{i18n.t('bookings')}
			<Badge variant="secondary" class="ml-1 text-xs">{allBookings.length}</Badge>
		</button>
		<button
			class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors
				{activeTab === 'payments'
				? 'bg-background text-foreground shadow-sm'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = 'payments')}
		>
			<CreditCard class="h-4 w-4" />
			{i18n.t('payments')}
			{#if pendingPaymentCount > 0}
				<Badge variant="destructive" class="ml-1 text-xs"
					>{pendingPaymentCount} {i18n.t('due')}</Badge
				>
			{/if}
		</button>
	</div>

	<!-- ═══════════ BOOKINGS TAB ═══════════ -->
	{#if activeTab === 'bookings'}
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="relative max-w-sm flex-1">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input bind:value={bookingSearch} placeholder="Search bookings..." class="pl-9" />
			</div>
			{#if isAdmin}
				<Button onclick={openAddBooking} class="gap-2">
					<Plus class="h-4 w-4" /> Add Booking
				</Button>
			{/if}
		</div>

		<!-- Booking Cards (mobile-friendly) -->
		<div class="space-y-3">
			{#each filteredBookings as booking}
				{@const summary = store.getPaymentSummary(booking.id)}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Content class="p-4">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="flex-1 space-y-1">
								<div class="flex items-center gap-2">
									<span class="font-semibold">{store.getRoomName(booking.room_id)}</span>
									<Badge variant={bookingStatusColors[booking.status] ?? 'outline'}
										>{booking.status}</Badge
									>
									<Badge variant="outline" class="text-xs">{booking.type}</Badge>
								</div>
								{#if isAdmin}
									<p class="text-sm text-muted-foreground">{store.getUserName(booking.user_id)}</p>
								{/if}
								<p class="text-xs text-muted-foreground">
									{formatDate(booking.start_date)} — {formatDate(booking.end_date)}
								</p>
							</div>
							<div class="flex items-center gap-3">
								<div class="text-right">
									<p class="font-semibold">
										Rp {booking.amount.toLocaleString('id-ID')}<span
											class="text-xs font-normal text-muted-foreground"
											>/{booking.type === 'daily' ? 'total' : 'mo'}</span
										>
									</p>
									{#if summary.pending > 0}
										<p class="text-xs text-orange-500">
											{summary.pending} payment{summary.pending > 1 ? 's' : ''} due
										</p>
									{:else if summary.total > 0}
										<p class="text-xs text-green-500">Fully paid</p>
									{/if}
								</div>
								<div class="flex gap-1">
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										onclick={() => openDetail(booking)}
									>
										<Eye class="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										class="gap-1.5"
										onclick={() => openPayDialog(booking)}
									>
										<CircleDollarSign class="h-3.5 w-3.5" />
										{i18n.t('pay')}
									</Button>
									{#if isAdmin}
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8"
											onclick={() => openEditBooking(booking)}
										>
											<Pencil class="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-destructive"
											onclick={() => confirmDeleteBooking(booking)}
										>
											<Trash2 class="h-3.5 w-3.5" />
										</Button>
									{/if}
								</div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
			{#if filteredBookings.length === 0}
				<div class="py-12 text-center text-muted-foreground">No bookings found.</div>
			{/if}
		</div>

		<!-- ═══════════ PAYMENTS TAB ═══════════ -->
	{:else}
		<div class="space-y-4">
			<div class="relative max-w-sm">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input bind:value={paymentSearch} placeholder="Cari tenant atau kamar..." class="pl-9" />
			</div>

			{#each filteredPaymentBookings as booking}
				{@const bpayments = store.getBookingPayments(booking.id)}
				{@const summary = store.getPaymentSummary(booking.id)}
				{@const nextPending = bpayments.find((p) => p.status === 'pending')}
				<Card.Root class="overflow-hidden">
					<!-- Booking Header -->
					<div
						class="flex flex-col gap-3 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
					>
						<div>
							<div class="flex items-center gap-2">
								<span class="text-lg font-semibold">{store.getRoomName(booking.room_id)}</span>
								<Badge variant={bookingStatusColors[booking.status] ?? 'outline'}
									>{booking.status}</Badge
								>
							</div>
							{#if isAdmin}
								<p class="text-sm text-muted-foreground">
									{store.getUserName(booking.user_id)} · {booking.type}
								</p>
							{:else}
								<p class="text-sm text-muted-foreground">Tipe: {booking.type}</p>
							{/if}
						</div>
						<!-- Summary chips -->
						<div class="flex items-center gap-3 text-sm">
							<div class="rounded-lg bg-green-500/10 px-3 py-1.5">
								<span class="font-medium text-green-600"
									>{i18n.t('monthsPaid')}: {bpayments.filter((p) => p.status === 'paid')
										.length}</span
								>
							</div>
							{#if summary.pending > 0}
								<div class="rounded-lg bg-orange-500/10 px-3 py-1.5">
									<span class="font-medium text-orange-500"
										>{i18n.t('monthsDue')}: {summary.pending}</span
									>
								</div>
							{/if}
						</div>
					</div>

					<Card.Content class="p-0">
						<!-- Payment rows -->
						<div class="divide-y">
							{#each bpayments as payment}
								<div
									class="flex items-center justify-between px-4 py-3 {payment.status === 'pending'
										? 'bg-orange-500/5'
										: ''}"
								>
									<div class="flex items-center gap-3">
										{#if payment.status === 'paid'}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10"
											>
												<CircleCheck class="h-4 w-4 text-green-600" />
											</div>
										{:else if payment.status === 'pending'}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10"
											>
												<Clock class="h-4 w-4 text-orange-500" />
											</div>
										{:else}
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10"
											>
												<Ban class="h-4 w-4 text-red-500" />
											</div>
										{/if}
										<div>
											<p class="text-sm font-medium">{payment.period ?? 'Pembayaran'}</p>
											<p class="text-xs text-muted-foreground">
												Rp {payment.amount.toLocaleString('id-ID')}
												{#if payment.status === 'paid' && payment.method}
													· {payment.method}
												{/if}
												{#if payment.due_date}
													· Jatuh tempo: {formatDate(payment.due_date)}
												{/if}
											</p>
										</div>
									</div>
									<div>
										{#if payment.status === 'paid'}
											<Badge variant="default" class="gap-1"
												><CircleCheck class="h-3 w-3" /> {i18n.t('paid')}</Badge
											>
										{:else if payment.status === 'pending'}
											<Badge variant="secondary" class="gap-1"
												><Clock class="h-3 w-3" /> {i18n.t('pending')}</Badge
											>
										{:else if payment.status === 'cancelled'}
											<Badge variant="outline" class="gap-1 text-muted-foreground"
												><Ban class="h-3 w-3" /> {i18n.t('cancelled')}</Badge
											>
										{:else}
											<Badge variant="destructive">{payment.status}</Badge>
										{/if}
									</div>
								</div>
							{/each}
						</div>

						<!-- Action bar -->
						{#if booking.status === 'active' && nextPending}
							<div
								class="flex flex-col gap-2 border-t bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div class="text-sm">
									<span class="text-muted-foreground">{i18n.t('nextBill')}:</span>
									<span class="font-semibold">
										{nextPending.period ?? 'Pembayaran'} — Rp {nextPending.amount.toLocaleString(
											'id-ID'
										)}</span
									>
								</div>
								<div class="flex gap-2">
									<Button class="gap-1.5" onclick={() => openPayDialog(booking)}>
										<CircleDollarSign class="h-4 w-4" />
										{i18n.t('payBtn')}
									</Button>
									<Button
										variant="outline"
										class="hover:text-destructive-foreground gap-1.5 text-destructive hover:bg-destructive"
										onclick={() => confirmCheckout(booking)}
									>
										<LogOut class="h-4 w-4" />
										{i18n.t('checkoutBtn')}
									</Button>
								</div>
							</div>
						{:else if booking.status === 'active' && !nextPending}
							<div class="flex items-center justify-between border-t bg-green-500/5 p-4">
								<span class="text-sm font-medium text-green-600">{i18n.t('allPaid')}</span>
								<Button
									variant="outline"
									size="sm"
									class="gap-1.5"
									onclick={() => confirmCheckout(booking)}
								>
									<LogOut class="h-4 w-4" /> Checkout
								</Button>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}

			{#if filteredPaymentBookings.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<CreditCard class="mx-auto mb-3 h-10 w-10 opacity-30" />
					<p>{i18n.t('noActiveBills')}</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- ═══════ BOOKING DIALOGS ═══════ -->

<!-- Add/Edit Booking Dialog -->
<Dialog.Root bind:open={bookingDialogOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{editingBooking ? 'Edit Booking' : 'New Booking'}</Dialog.Title>
			<Dialog.Description
				>{editingBooking ? 'Update booking details.' : 'Create a new booking.'}</Dialog.Description
			>
		</Dialog.Header>
		<form onsubmit={handleBookingSubmit} class="space-y-4">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label for="bookingUser" class="text-sm font-medium">User *</label>
					<Select.Root
						type="single"
						value={String(formUserId)}
						onValueChange={(v) => {
							if (v) formUserId = Number(v);
						}}
					>
						<Select.Trigger id="bookingUser" class="w-full"
							>{store.getUserName(formUserId)}</Select.Trigger
						>
						<Select.Content>
							{#each store.users as user}
								<Select.Item value={String(user.id)}>{user.full_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<label for="bookingRoom" class="text-sm font-medium">Room *</label>
					<Select.Root
						type="single"
						value={String(formRoomId)}
						onValueChange={(v) => {
							if (v) formRoomId = Number(v);
						}}
					>
						<Select.Trigger id="bookingRoom" class="w-full"
							>{store.getRoomName(formRoomId)}</Select.Trigger
						>
						<Select.Content>
							{#each store.rooms as room}
								<Select.Item value={String(room.id)}>{room.name} ({room.category})</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label for="bookingType" class="text-sm font-medium">Type</label>
					<Select.Root
						type="single"
						value={formType}
						onValueChange={(v) => {
							if (v) formType = v;
						}}
					>
						<Select.Trigger id="bookingType" class="w-full">{formType}</Select.Trigger>
						<Select.Content>
							<Select.Item value="daily">Daily</Select.Item>
							<Select.Item value="monthly">Monthly</Select.Item>
							<Select.Item value="yearly">Yearly</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<label for="bookingStatus" class="text-sm font-medium">Status</label>
					<Select.Root
						type="single"
						value={formStatus}
						onValueChange={(v) => {
							if (v) formStatus = v;
						}}
					>
						<Select.Trigger id="bookingStatus" class="w-full">{formStatus}</Select.Trigger>
						<Select.Content>
							<Select.Item value="pending">Pending</Select.Item>
							<Select.Item value="active">Active</Select.Item>
							<Select.Item value="completed">Completed</Select.Item>
							<Select.Item value="cancelled">Cancelled</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label for="bookingStart" class="text-sm font-medium">Start Date *</label>
					<Input id="bookingStart" type="date" bind:value={formStartDate} required />
				</div>
				<div class="space-y-2">
					<label for="bookingEnd" class="text-sm font-medium">End Date *</label>
					<Input id="bookingEnd" type="date" bind:value={formEndDate} required />
				</div>
			</div>
			<div class="space-y-2">
				<label for="bookingAmount" class="text-sm font-medium">Amount (Rp) *</label>
				<Input id="bookingAmount" type="number" bind:value={formAmount} required min="0" />
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (bookingDialogOpen = false)}
					>Cancel</Button
				>
				<Button type="submit">{editingBooking ? 'Update' : 'Create'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Booking Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Delete Booking</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete booking #{deletingBooking?.id}? This action cannot be
				undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
			<Button variant="destructive" onclick={handleDeleteBooking}>Delete</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Pay Monthly Dialog -->
<Dialog.Root bind:open={payDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Monthly Payments</Dialog.Title>
			<Dialog.Description>
				{#if selectedBookingForPay}
					{store.getRoomName(selectedBookingForPay.room_id)} — {store.getUserName(
						selectedBookingForPay.user_id
					)}
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		{#if selectedBookingForPay}
			{@const bpayments = store.getBookingPayments(selectedBookingForPay.id)}
			{@const summary = store.getPaymentSummary(selectedBookingForPay.id)}

			<!-- Summary -->
			<div class="grid grid-cols-3 gap-3 rounded-lg border p-3 text-center text-sm">
				<div>
					<p class="text-muted-foreground">Total</p>
					<p class="font-semibold">Rp {summary.total.toLocaleString('id-ID')}</p>
				</div>
				<div>
					<p class="text-green-600">Paid</p>
					<p class="font-semibold text-green-600">Rp {summary.paid.toLocaleString('id-ID')}</p>
				</div>
				<div>
					<p class="text-orange-500">Remaining</p>
					<p class="font-semibold text-orange-500">
						Rp {summary.remaining.toLocaleString('id-ID')}
					</p>
				</div>
			</div>

			<!-- Payment method -->
			{#if isAdmin}
				<div class="space-y-2">
					<label for="payMethodSel" class="text-sm font-medium">Payment Method</label>
					<Select.Root
						type="single"
						value={payMethod}
						onValueChange={(v) => {
							if (v) payMethod = v;
						}}
					>
						<Select.Trigger id="payMethodSel" class="w-full">{payMethod}</Select.Trigger>
						<Select.Content>
							<Select.Item value="transfer">Bank Transfer</Select.Item>
							<Select.Item value="cash">Cash</Select.Item>
							<Select.Item value="e-wallet">E-Wallet</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			<!-- Payment list -->
			<div class="max-h-60 space-y-2 overflow-y-auto">
				{#each bpayments as payment}
					<div class="flex items-center justify-between rounded-lg border p-3">
						<div>
							<p class="text-sm font-medium">{payment.period ?? 'One-time'}</p>
							<p class="text-xs text-muted-foreground">
								Due: {formatDate(payment.due_date)} · Rp {payment.amount.toLocaleString('id-ID')}
							</p>
						</div>
						{#if payment.status === 'paid'}
							<Badge variant="default" class="gap-1"><CircleCheck class="h-3 w-3" /> Paid</Badge>
						{:else if payment.status === 'pending'}
							{#if isAdmin}
								<Button size="sm" class="h-7 gap-1.5 text-xs" onclick={() => handlePay(payment)}>
									<CircleDollarSign class="h-3 w-3" /> Mark Paid
								</Button>
							{:else}
								<Button
									size="sm"
									class="h-7 gap-1.5 text-xs"
									onclick={() => handlePay(payment)}
									disabled={isCheckingOut}
								>
									{#if isCheckingOut}
										<div
											class="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
										></div>
									{:else}
										<CircleDollarSign class="h-3 w-3" /> Pay Now
									{/if}
								</Button>
							{/if}
						{:else}
							<Badge variant="destructive">{payment.status}</Badge>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (payDialogOpen = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Checkout Confirmation Dialog -->
<Dialog.Root bind:open={checkoutDialogOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Konfirmasi Checkout</Dialog.Title>
			<Dialog.Description>
				{#if checkoutBooking}
					{@const remaining = store.getPaymentSummary(checkoutBooking.id).pending}
					<strong>{isAdmin ? store.getUserName(checkoutBooking.user_id) : 'Anda'}</strong> akan
					checkout dari
					<strong>{store.getRoomName(checkoutBooking.room_id)}</strong>.
					{#if remaining > 0}
						<br /><br />
						<span class="font-medium text-destructive"
							>⚠ {remaining} pembayaran yang belum lunas akan otomatis dibatalkan.</span
						>
					{/if}
					<br /><br />Kamar akan dibebaskan dan bisa disewakan lagi.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (checkoutDialogOpen = false)}>Batal</Button>
			<Button variant="destructive" class="gap-1.5" onclick={handleCheckout}>
				<LogOut class="h-4 w-4" /> Ya, Checkout
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Detail View Dialog -->
<Dialog.Root bind:open={detailDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Detail Booking</Dialog.Title>
			<Dialog.Description>Informasi lengkap booking</Dialog.Description>
		</Dialog.Header>
		{#if detailBooking}
			{@const room = store.rooms.find((r) => r.id === detailBooking.room_id)}
			{@const bpayments = store.getBookingPayments(detailBooking.id)}
			{@const summary = store.getPaymentSummary(detailBooking.id)}
			<div class="space-y-4">
				<!-- Info grid -->
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div class="space-y-0.5">
						<p class="text-muted-foreground">Penghuni</p>
						<p class="font-medium">{store.getUserName(detailBooking.user_id)}</p>
					</div>
					<div class="space-y-0.5">
						<p class="text-muted-foreground">Kamar</p>
						<p class="font-medium">{store.getRoomName(detailBooking.room_id)}</p>
					</div>
					<div class="space-y-0.5">
						<p class="text-muted-foreground">Kategori</p>
						<p class="font-medium">{room?.category ?? '-'}</p>
					</div>
					<div class="space-y-0.5">
						<p class="text-muted-foreground">Tipe Sewa</p>
						<p class="font-medium capitalize">{detailBooking.type}</p>
					</div>
					<div class="space-y-0.5">
						<p class="text-muted-foreground">Tanggal Masuk</p>
						<p class="font-medium">{formatDate(detailBooking.start_date)}</p>
					</div>
					<div class="space-y-0.5">
						<p class="text-muted-foreground">Berlaku Sampai</p>
						<p class="font-medium">{formatDate(detailBooking.end_date)}</p>
					</div>
					<div class="space-y-0.5">
						<p class="text-muted-foreground">Harga / Bulan</p>
						<p class="font-medium">Rp {detailBooking.amount.toLocaleString('id-ID')}</p>
					</div>
					<div class="space-y-0.5">
						<p class="text-muted-foreground">Status</p>
						<Badge variant={bookingStatusColors[detailBooking.status] ?? 'outline'}
							>{detailBooking.status}</Badge
						>
					</div>
				</div>

				<!-- Payment summary -->
				<div class="rounded-lg border p-3">
					<p class="mb-2 text-sm font-medium">Riwayat Pembayaran</p>
					{#if bpayments.length > 0}
						<div class="space-y-2">
							{#each bpayments as p}
								<div class="flex items-center justify-between text-sm">
									<span>{p.period ?? 'Pembayaran'}</span>
									<div class="flex items-center gap-2">
										<span class="font-mono text-xs">Rp {p.amount.toLocaleString('id-ID')}</span>
										{#if p.status === 'paid'}
											<Badge variant="default" class="gap-1 text-xs"
												><CircleCheck class="h-3 w-3" /> Lunas</Badge
											>
										{:else if p.status === 'pending'}
											<Badge variant="secondary" class="gap-1 text-xs"
												><Clock class="h-3 w-3" /> Belum</Badge
											>
										{:else}
											<Badge variant="destructive" class="text-xs">{p.status}</Badge>
										{/if}
									</div>
								</div>
							{/each}
						</div>
						<div class="mt-3 flex justify-between border-t pt-2 text-sm">
							<span class="text-muted-foreground">Total dibayar</span>
							<span class="font-semibold text-green-600"
								>Rp {summary.paid.toLocaleString('id-ID')}</span
							>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">Belum ada pembayaran.</p>
					{/if}
				</div>
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (detailDialogOpen = false)}>Tutup</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
