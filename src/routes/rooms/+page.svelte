<script>
	import { store } from '$lib/stores.svelte.js';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import {
		Plus,
		Pencil,
		Trash2,
		Search,
		DoorOpen,
		Wrench,
		CalendarDays,
		CheckCircle
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	const isAdmin = $derived(store.role === 'admin');

	// Tab state
	let activeTab = $state('rooms');

	// ─── CUSTOMER BOOKING STATE ───
	let customerBookingOpen = $state(false);
	let bookingRoom = $state(null);
	let custBookingType = $state('monthly');
	let custStartDate = $state('');
	let custEndDate = $state('');
	let custBookingLoading = $state(false);

	function openCustomerBooking(room) {
		bookingRoom = room;
		custBookingType = 'monthly';
		// Default start date: today
		const today = new Date();
		custStartDate = today.toISOString().split('T')[0];
		// Default end date: 1 month from today
		const endDate = new Date(today);
		endDate.setMonth(endDate.getMonth() + 1);
		custEndDate = endDate.toISOString().split('T')[0];
		custBookingLoading = false;
		customerBookingOpen = true;
	}

	const custBookingAmount = $derived(() => {
		if (!bookingRoom) return 0;
		return bookingRoom.price;
	});

	async function handleCustomerBooking(e) {
		e.preventDefault();
		if (!bookingRoom || !store.currentUserId) return;
		custBookingLoading = true;
		try {
			const bookingData = {
				user_id: store.currentUserId,
				room_id: bookingRoom.id,
				type: custBookingType,
				start_date: custStartDate,
				end_date: custEndDate,
				status: 'active',
				amount: bookingRoom.price
			};
			const newBooking = await store.addBooking(bookingData);

			// Update the room status to 'occupied'
			await store.updateRoom(bookingRoom.id, { status: 'occupied' });

			// Create first payment record
			const startD = new Date(custStartDate);
			const monthNames = [
				'Jan',
				'Feb',
				'Mar',
				'Apr',
				'May',
				'Jun',
				'Jul',
				'Aug',
				'Sep',
				'Oct',
				'Nov',
				'Dec'
			];
			const period = `${monthNames[startD.getMonth()]} ${startD.getFullYear()}`;
			const newPayment = await store.addPayment({
				booking_id: newBooking.id,
				amount: bookingRoom.price,
				status: 'pending',
				period: period,
				due_date: custStartDate
			});

			customerBookingOpen = false;
			toast.success('Booking berhasil, silahkan lakukan pembayaran di halaman Booking Saya.');
			goto('/bookings');
		} catch (err) {
			console.error(err);
			toast.error('Gagal membuat booking. Coba lagi.');
		} finally {
			custBookingLoading = false;
		}
	}

	// ─── ROOMS STATE ───
	let roomSearch = $state('');
	let roomDialogOpen = $state(false);
	let roomDeleteDialogOpen = $state(false);
	let editingRoom = $state(null);
	let deletingRoom = $state(null);

	let formRoomName = $state('');
	let formCategory = $state('Standard');
	let formPrice = $state(0);
	let formStatus = $state('available');
	let formFacilityIds = $state([]);
	let formImages = $state([]); // Existing image URLs
	let formNewImages = $state([]); // New files to upload
	let isUploading = $state(false);

	const statusColors = {
		available: 'default',
		occupied: 'secondary',
		maintenance: 'destructive'
	};

	const filteredRooms = $derived(
		store.rooms.filter(
			(r) =>
				r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
				r.category.toLowerCase().includes(roomSearch.toLowerCase())
		)
	);

	function openAddRoom() {
		editingRoom = null;
		formRoomName = '';
		formCategory = 'Standard';
		formPrice = 500000;
		formStatus = 'available';
		formFacilityIds = [];
		formImages = [];
		formNewImages = [];
		isUploading = false;
		roomDialogOpen = true;
	}

	function openEditRoom(room) {
		editingRoom = room;
		formRoomName = room.name;
		formCategory = room.category;
		formPrice = room.price;
		formStatus = room.status;
		formFacilityIds = [...room.facility_ids];
		formImages = [...(room.image || [])];
		formNewImages = [];
		isUploading = false;
		roomDialogOpen = true;
	}

	async function handleRoomSubmit(e) {
		e.preventDefault();
		isUploading = true;
		try {
			let newUrls = [];
			if (formNewImages.length > 0) {
				newUrls = await store.uploadRoomImages(formNewImages);
			}
			const finalImages = [...formImages, ...newUrls];

			const data = {
				name: formRoomName,
				category: formCategory,
				price: Number(formPrice),
				status: formStatus,
				facility_ids: formFacilityIds,
				image: finalImages
			};

			if (editingRoom) {
				await store.updateRoom(editingRoom.id, data);
				toast.success('Room updated successfully!');
			} else {
				await store.addRoom(data);
				toast.success('Room added successfully!');
			}
			roomDialogOpen = false;
		} catch (err) {
			console.error(err);
			toast.error('Failed to save room.');
		} finally {
			isUploading = false;
		}
	}

	async function removeImage(index) {
		const urlToRemove = formImages[index];
		// Remove from UI state instantly
		formImages = formImages.filter((_, i) => i !== index);
		try {
			// Also remove from storage
			await store.deleteRoomImage(urlToRemove);
		} catch (e) {
			console.error('Failed to delete image from storage', e);
		}
	}

	function confirmDeleteRoom(room) {
		deletingRoom = room;
		roomDeleteDialogOpen = true;
	}

	async function handleDeleteRoom() {
		try {
			// Optimistically delete images first if we want, but DB cascade doesn't cover storage
			// For simplicity we just delete DB record
			await store.deleteRoom(deletingRoom.id);
			toast.success('Room deleted successfully!');
			roomDeleteDialogOpen = false;
		} catch {
			toast.error('Failed to delete room.');
		}
	}

	function toggleFacility(id) {
		if (formFacilityIds.includes(id)) {
			formFacilityIds = formFacilityIds.filter((f) => f !== id);
		} else {
			formFacilityIds = [...formFacilityIds, id];
		}
	}

	// ─── FACILITIES STATE ───
	let facSearch = $state('');
	let facDialogOpen = $state(false);
	let facDeleteDialogOpen = $state(false);
	let editingFacility = $state(null);
	let deletingFacility = $state(null);

	let formFacName = $state('');

	const filteredFacilities = $derived(
		store.facilities.filter((f) => f.name.toLowerCase().includes(facSearch.toLowerCase()))
	);

	function openAddFacility() {
		editingFacility = null;
		formFacName = '';
		facDialogOpen = true;
	}

	function openEditFacility(fac) {
		editingFacility = fac;
		formFacName = fac.name;
		facDialogOpen = true;
	}

	async function handleFacSubmit(e) {
		e.preventDefault();
		try {
			if (editingFacility) {
				await store.updateFacility(editingFacility.id, { name: formFacName });
				toast.success('Facility updated successfully!');
			} else {
				await store.addFacility({ name: formFacName });
				toast.success('Facility added successfully!');
			}
			facDialogOpen = false;
		} catch {
			toast.error('Failed to save facility.');
		}
	}

	function confirmDeleteFacility(fac) {
		deletingFacility = fac;
		facDeleteDialogOpen = true;
	}

	async function handleDeleteFacility() {
		try {
			await store.deleteFacility(deletingFacility.id);
			toast.success('Facility deleted successfully!');
			facDeleteDialogOpen = false;
		} catch {
			toast.error('Failed to delete facility.');
		}
	}
</script>

<div class="space-y-4">
	{#if !isAdmin}
		<!-- ═══ CUSTOMER: Browse Rooms ═══ -->
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Browse Rooms</h2>
			<p class="text-muted-foreground">
				Find your perfect room — {store.rooms.filter((r) => r.status === 'available').length} available
			</p>
		</div>

		<div class="relative max-w-sm">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input bind:value={roomSearch} placeholder="Search by name or category..." class="pl-9" />
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredRooms as room}
				{@const available = room.status === 'available'}
				<div
					class="group overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg {available
						? 'hover:border-primary/30'
						: 'opacity-75'}"
				>
					{#if room.image && room.image.length > 0}
						<div class="h-48 w-full overflow-hidden bg-muted">
							<img
								src={room.image[0]}
								alt={room.name}
								class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
							/>
						</div>
					{:else}
						<div class="flex h-48 w-full items-center justify-center bg-muted">
							<DoorOpen class="h-12 w-12 text-muted-foreground/30" />
						</div>
					{/if}

					<div class="p-5">
						<div class="mb-3 flex items-start justify-between">
							<div>
								<h3 class="text-lg font-semibold">{room.name}</h3>
								<p class="text-sm text-muted-foreground">{room.category}</p>
							</div>
							<Badge variant={statusColors[room.status] ?? 'outline'}>{room.status}</Badge>
						</div>

						<p class="mb-3 text-2xl font-bold text-primary">
							Rp {room.price.toLocaleString('id-ID')}
							<span class="text-sm font-normal text-muted-foreground">/ month</span>
						</p>

						<div class="mb-4 flex flex-wrap gap-1.5">
							{#each room.facility_ids as fid}
								<Badge variant="outline" class="text-xs">{store.getFacilityName(fid)}</Badge>
							{/each}
						</div>

						{#if available}
							<Button class="w-full gap-2" size="sm" onclick={() => openCustomerBooking(room)}>
								<CalendarDays class="h-4 w-4" /> Book Now
							</Button>
						{:else}
							<Button class="w-full" size="sm" disabled variant="secondary">Unavailable</Button>
						{/if}
					</div>
				</div>
			{/each}
			{#if filteredRooms.length === 0}
				<div class="col-span-full py-12 text-center text-muted-foreground">No rooms found.</div>
			{/if}
		</div>
	{:else}
		<!-- ═══ ADMIN: Tabbed Table View ═══ -->
		<!-- Page header -->
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Rooms & Facilities</h2>
			<p class="text-muted-foreground">Manage rooms and available facilities</p>
		</div>

		<!-- Tab switcher -->
		<div class="flex gap-1 rounded-lg border bg-muted p-1">
			<button
				class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors
				{activeTab === 'rooms'
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (activeTab = 'rooms')}
			>
				<DoorOpen class="h-4 w-4" />
				Rooms
				<Badge variant="secondary" class="ml-1 text-xs">{store.rooms.length}</Badge>
			</button>
			<button
				class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors
				{activeTab === 'facilities'
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (activeTab = 'facilities')}
			>
				<Wrench class="h-4 w-4" />
				Facilities
				<Badge variant="secondary" class="ml-1 text-xs">{store.facilities.length}</Badge>
			</button>
		</div>

		<!-- ═══════════ ROOMS TAB ═══════════ -->
		{#if activeTab === 'rooms'}
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="relative max-w-sm flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input bind:value={roomSearch} placeholder="Search rooms..." class="pl-9" />
				</div>
				{#if isAdmin}
					<Button onclick={openAddRoom} class="gap-2">
						<Plus class="h-4 w-4" /> Add Room
					</Button>
				{/if}
			</div>

			<div class="rounded-lg border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>ID</Table.Head>
							<Table.Head>Name</Table.Head>
							<Table.Head>Category</Table.Head>
							<Table.Head class="hidden md:table-cell">Price</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="hidden lg:table-cell">Facilities</Table.Head>
							{#if isAdmin}
								<Table.Head class="text-right">Actions</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRooms as room}
							<Table.Row>
								<Table.Cell class="font-mono text-xs">{room.id}</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-3">
										{#if room.image && room.image.length > 0}
											<div class="h-10 w-10 shrink-0 overflow-hidden rounded-md border">
												<img
													src={room.image[0]}
													alt={room.name}
													class="h-full w-full object-cover"
												/>
											</div>
										{:else}
											<div
												class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted"
											>
												<DoorOpen class="h-5 w-5 text-muted-foreground/50" />
											</div>
										{/if}
										<span class="font-medium">{room.name}</span>
									</div>
								</Table.Cell>
								<Table.Cell>{room.category}</Table.Cell>
								<Table.Cell class="hidden md:table-cell"
									>Rp {room.price.toLocaleString('id-ID')}</Table.Cell
								>
								<Table.Cell>
									<Badge variant={statusColors[room.status] ?? 'outline'}>{room.status}</Badge>
								</Table.Cell>
								<Table.Cell class="hidden lg:table-cell">
									<div class="flex flex-wrap gap-1">
										{#each room.facility_ids as fid}
											<Badge variant="outline" class="text-xs">{store.getFacilityName(fid)}</Badge>
										{/each}
									</div>
								</Table.Cell>
								{#if isAdmin}
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												onclick={() => openEditRoom(room)}
											>
												<Pencil class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-destructive"
												onclick={() => confirmDeleteRoom(room)}
											>
												<Trash2 class="h-3.5 w-3.5" />
											</Button>
										</div>
									</Table.Cell>
								{/if}
							</Table.Row>
						{/each}
						{#if filteredRooms.length === 0}
							<Table.Row>
								<Table.Cell colspan={isAdmin ? 7 : 6} class="py-8 text-center text-muted-foreground"
									>No rooms found.</Table.Cell
								>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>

			<!-- ═══════════ FACILITIES TAB ═══════════ -->
		{:else}
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="relative max-w-sm flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input bind:value={facSearch} placeholder="Search facilities..." class="pl-9" />
				</div>
				{#if isAdmin}
					<Button onclick={openAddFacility} class="gap-2">
						<Plus class="h-4 w-4" /> Add Facility
					</Button>
				{/if}
			</div>

			<div class="rounded-lg border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>ID</Table.Head>
							<Table.Head>Name</Table.Head>
							{#if isAdmin}
								<Table.Head class="text-right">Actions</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredFacilities as fac}
							<Table.Row>
								<Table.Cell class="font-mono text-xs">{fac.id}</Table.Cell>
								<Table.Cell class="font-medium">{fac.name}</Table.Cell>
								{#if isAdmin}
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												onclick={() => openEditFacility(fac)}
											>
												<Pencil class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-destructive"
												onclick={() => confirmDeleteFacility(fac)}
											>
												<Trash2 class="h-3.5 w-3.5" />
											</Button>
										</div>
									</Table.Cell>
								{/if}
							</Table.Row>
						{/each}
						{#if filteredFacilities.length === 0}
							<Table.Row>
								<Table.Cell colspan={isAdmin ? 3 : 2} class="py-8 text-center text-muted-foreground"
									>No facilities found.</Table.Cell
								>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		{/if}
	{/if}
</div>

<!-- ═══════ ROOM DIALOGS ═══════ -->

<!-- Room Add/Edit Dialog -->
<Dialog.Root bind:open={roomDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingRoom ? 'Edit Room' : 'Add Room'}</Dialog.Title>
			<Dialog.Description
				>{editingRoom ? 'Update room details.' : 'Add a new room.'}</Dialog.Description
			>
		</Dialog.Header>
		<form onsubmit={handleRoomSubmit} class="space-y-4">
			<div class="space-y-2">
				<label for="roomName" class="text-sm font-medium">Room Name *</label>
				<Input id="roomName" bind:value={formRoomName} required placeholder="Room name" />
			</div>
			<div class="space-y-2">
				<label for="roomCategory" class="text-sm font-medium">Category</label>
				<Select.Root
					type="single"
					value={formCategory}
					onValueChange={(v) => {
						if (v) formCategory = v;
					}}
				>
					<Select.Trigger id="roomCategory" class="w-full">{formCategory}</Select.Trigger>
					<Select.Content>
						<Select.Item value="Standard">Standard</Select.Item>
						<Select.Item value="Deluxe">Deluxe</Select.Item>
						<Select.Item value="Suite">Suite</Select.Item>
						<Select.Item value="Premium">Premium</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<label for="roomPrice" class="text-sm font-medium">Price (Rp) *</label>
				<Input id="roomPrice" type="number" bind:value={formPrice} required min="0" />
			</div>
			<div class="space-y-2">
				<label for="roomStatus" class="text-sm font-medium">Status</label>
				<Select.Root
					type="single"
					value={formStatus}
					onValueChange={(v) => {
						if (v) formStatus = v;
					}}
				>
					<Select.Trigger id="roomStatus" class="w-full">{formStatus}</Select.Trigger>
					<Select.Content>
						<Select.Item value="available">Available</Select.Item>
						<Select.Item value="occupied">Occupied</Select.Item>
						<Select.Item value="maintenance">Maintenance</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<span class="text-sm font-medium">Facilities</span>
				<div class="flex flex-wrap gap-2">
					{#each store.facilities as fac}
						<button
							type="button"
							class="rounded-full border px-3 py-1 text-xs font-medium transition-colors
								{formFacilityIds.includes(fac.id)
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border bg-background hover:bg-accent'}"
							onclick={() => toggleFacility(fac.id)}
						>
							{fac.name}
						</button>
					{/each}
				</div>
			</div>
			<div class="space-y-2">
				<span class="text-sm font-medium">Images</span>

				<!-- Existing Images Preview -->
				{#if formImages.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each formImages as img, i}
							<div class="relative h-16 w-16 overflow-hidden rounded-md border">
								<img src={img} alt="Room" class="h-full w-full object-cover" />
								<button
									type="button"
									class="absolute top-1 right-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-destructive"
									onclick={() => removeImage(i)}
								>
									<Trash2 class="h-3 w-3" />
								</button>
							</div>
						{/each}
					</div>
				{/if}

				<!-- New Images Input -->
				<Input
					type="file"
					accept="image/*"
					multiple
					onchange={(e) => {
						if (e.target.files) {
							formNewImages = Array.from(e.target.files);
						}
					}}
				/>
				{#if formNewImages.length > 0}
					<p class="text-xs text-muted-foreground">
						{formNewImages.length} new files selected for upload
					</p>
				{/if}
			</div>
			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => (roomDialogOpen = false)}
					disabled={isUploading}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={isUploading}>
					{isUploading ? 'Saving...' : editingRoom ? 'Update' : 'Create'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Room Delete Dialog -->
<Dialog.Root bind:open={roomDeleteDialogOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Delete Room</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete <strong>{deletingRoom?.name}</strong>? This action cannot be
				undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (roomDeleteDialogOpen = false)}>Cancel</Button>
			<Button variant="destructive" onclick={handleDeleteRoom}>Delete</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ═══════ FACILITY DIALOGS ═══════ -->

<!-- Facility Add/Edit Dialog -->
<Dialog.Root bind:open={facDialogOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{editingFacility ? 'Edit Facility' : 'Add Facility'}</Dialog.Title>
			<Dialog.Description
				>{editingFacility ? 'Update facility name.' : 'Add a new facility.'}</Dialog.Description
			>
		</Dialog.Header>
		<form onsubmit={handleFacSubmit} class="space-y-4">
			<div class="space-y-2">
				<label for="facName" class="text-sm font-medium">Facility Name *</label>
				<Input id="facName" bind:value={formFacName} required placeholder="e.g. WiFi, AC, Pool" />
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (facDialogOpen = false)}
					>Cancel</Button
				>
				<Button type="submit">{editingFacility ? 'Update' : 'Create'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Facility Delete Dialog -->
<Dialog.Root bind:open={facDeleteDialogOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Delete Facility</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete <strong>{deletingFacility?.name}</strong>?
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (facDeleteDialogOpen = false)}>Cancel</Button>
			<Button variant="destructive" onclick={handleDeleteFacility}>Delete</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ═══════ CUSTOMER BOOKING DIALOG ═══════ -->
<Dialog.Root bind:open={customerBookingOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Book Room</Dialog.Title>
			<Dialog.Description>Lengkapi detail booking Anda</Dialog.Description>
		</Dialog.Header>
		{#if bookingRoom}
			<form onsubmit={handleCustomerBooking} class="space-y-4">
				<!-- Room Info Card -->
				<div class="flex gap-4 rounded-lg border bg-muted/30 p-3">
					{#if bookingRoom.image && bookingRoom.image.length > 0}
						<div class="h-20 w-20 shrink-0 overflow-hidden rounded-md">
							<img
								src={bookingRoom.image[0]}
								alt={bookingRoom.name}
								class="h-full w-full object-cover"
							/>
						</div>
					{:else}
						<div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-muted">
							<DoorOpen class="h-8 w-8 text-muted-foreground/40" />
						</div>
					{/if}
					<div class="flex-1">
						<h3 class="text-lg font-semibold">{bookingRoom.name}</h3>
						<p class="text-sm text-muted-foreground">{bookingRoom.category}</p>
						<p class="mt-1 text-lg font-bold text-primary">
							Rp {bookingRoom.price.toLocaleString('id-ID')}
							<span class="text-xs font-normal text-muted-foreground">/ bulan</span>
						</p>
					</div>
				</div>

				<!-- Facilities -->
				{#if bookingRoom.facility_ids?.length > 0}
					<div class="space-y-1.5">
						<span class="text-sm font-medium text-muted-foreground">Fasilitas</span>
						<div class="flex flex-wrap gap-1.5">
							{#each bookingRoom.facility_ids as fid}
								<Badge variant="outline" class="text-xs">{store.getFacilityName(fid)}</Badge>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Booking Type removed: Monthly only -->

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-2">
						<label for="custStart" class="text-sm font-medium">Tanggal Mulai</label>
						<Input
							id="custStart"
							type="date"
							bind:value={custStartDate}
							oninput={(e) => {
								if (e.target.value) {
									const start = new Date(e.target.value);
									start.setMonth(start.getMonth() + 1);
									custEndDate = start.toISOString().split('T')[0];
								}
							}}
							required
							min={new Date().toISOString().split('T')[0]}
						/>
					</div>
					<div class="space-y-2">
						<label for="custEnd" class="text-sm font-medium">Tanggal Selesai</label>
						<Input
							id="custEnd"
							type="date"
							bind:value={custEndDate}
							required
							readonly
							class="cursor-not-allowed bg-muted"
						/>
					</div>
				</div>

				<!-- Amount Summary -->
				<div class="rounded-lg border border-primary/20 bg-primary/5 p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">Total Pembayaran</span>
						<span class="text-xl font-bold text-primary">
							Rp {bookingRoom.price.toLocaleString('id-ID')}
						</span>
					</div>
					<p class="mt-1 text-xs text-muted-foreground">
						Pembayaran pertama akan dibuat otomatis setelah booking dikonfirmasi
					</p>
				</div>

				<Dialog.Footer class="flex-row items-center gap-2 sm:justify-between">
					<div class="flex gap-2">
						<a
							href={`https://wa.me/6281234567890?text=Halo Admin, saya ingin bertanya tentang kamar ${bookingRoom.name}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Button
								type="button"
								variant="outline"
								class="h-10 w-full border-green-500 text-xs text-green-600 hover:bg-green-50 sm:w-auto sm:text-sm"
							>
								Hubungi Admin
							</Button>
						</a>
					</div>
					<div class="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onclick={() => (customerBookingOpen = false)}
							disabled={custBookingLoading}
						>
							Batal
						</Button>
						<Button type="submit" class="gap-2" disabled={custBookingLoading}>
							{#if custBookingLoading}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
								></div>
								Memproses...
							{:else}
								<CheckCircle class="h-4 w-4" /> Konfirmasi Booking
							{/if}
						</Button>
					</div>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
