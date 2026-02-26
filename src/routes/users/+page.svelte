<script>
	import { store } from '$lib/stores.svelte.js';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import { Plus, Pencil, Trash2, Search } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	const isAdmin = $derived(store.role === 'admin');
	let search = $state('');
	let dialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let editingUser = $state(null);
	let deletingUser = $state(null);

	// Form state
	let formName = $state('');
	let formEmail = $state('');
	let formFullName = $state('');
	let formPhone = $state('');
	let formUserType = $state('customer');

	const filteredUsers = $derived(
		isAdmin
			? store.users.filter(
					(u) =>
						u.full_name.toLowerCase().includes(search.toLowerCase()) ||
						u.email.toLowerCase().includes(search.toLowerCase()) ||
						u.name.toLowerCase().includes(search.toLowerCase())
				)
			: store.users.filter((u) => u.id === store.currentUserId)
	);

	function openAdd() {
		editingUser = null;
		formName = '';
		formEmail = '';
		formFullName = '';
		formPhone = '';
		formUserType = 'customer';
		dialogOpen = true;
	}

	function openEdit(user) {
		editingUser = user;
		formName = user.name;
		formEmail = user.email;
		formFullName = user.full_name;
		formPhone = user.phone;
		formUserType = user.user_type;
		dialogOpen = true;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		const data = {
			name: formName,
			email: formEmail,
			full_name: formFullName,
			phone: formPhone,
			user_type: formUserType
		};
		try {
			if (editingUser) {
				await store.updateUser(editingUser.id, data);
				toast.success('User updated successfully!');
			} else {
				await store.addUser(data);
				toast.success('User added successfully!');
			}
			dialogOpen = false;
		} catch {
			toast.error('Failed to save user.');
		}
	}

	function confirmDelete(user) {
		deletingUser = user;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		try {
			await store.deleteUser(deletingUser.id);
			toast.success('User deleted successfully!');
			deleteDialogOpen = false;
		} catch {
			toast.error('Failed to delete user.');
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Users</h2>
			<p class="text-muted-foreground">{isAdmin ? 'Manage users' : 'Your profile'}</p>
		</div>
		{#if isAdmin}
			<Button onclick={openAdd} class="gap-2">
				<Plus class="h-4 w-4" /> Add User
			</Button>
		{/if}
	</div>

	{#if isAdmin}
		<div class="relative max-w-sm">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input bind:value={search} placeholder="Search users..." class="pl-9" />
		</div>
	{/if}

	<div class="rounded-lg border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>ID</Table.Head>
					<Table.Head>Username</Table.Head>
					<Table.Head>Email</Table.Head>
					<Table.Head class="hidden md:table-cell">Full Name</Table.Head>
					<Table.Head class="hidden lg:table-cell">Phone</Table.Head>
					<Table.Head>Type</Table.Head>
					{#if isAdmin}
						<Table.Head class="text-right">Actions</Table.Head>
					{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredUsers as user}
					<Table.Row>
						<Table.Cell class="font-mono text-xs">{user.id}</Table.Cell>
						<Table.Cell class="font-medium">{user.name}</Table.Cell>
						<Table.Cell>{user.email}</Table.Cell>
						<Table.Cell class="hidden md:table-cell">{user.full_name}</Table.Cell>
						<Table.Cell class="hidden lg:table-cell">{user.phone}</Table.Cell>
						<Table.Cell>
							<Badge variant={user.user_type === 'admin' ? 'default' : 'secondary'}
								>{user.user_type}</Badge
							>
						</Table.Cell>
						{#if isAdmin}
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-1">
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										onclick={() => openEdit(user)}
									>
										<Pencil class="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive"
										onclick={() => confirmDelete(user)}
									>
										<Trash2 class="h-3.5 w-3.5" />
									</Button>
								</div>
							</Table.Cell>
						{/if}
					</Table.Row>
				{/each}
				{#if filteredUsers.length === 0}
					<Table.Row>
						<Table.Cell colspan={isAdmin ? 7 : 6} class="py-8 text-center text-muted-foreground"
							>No users found.</Table.Cell
						>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<!-- Add/Edit Dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingUser ? 'Edit User' : 'Add User'}</Dialog.Title>
			<Dialog.Description
				>{editingUser
					? 'Update user information.'
					: 'Create a new user account.'}</Dialog.Description
			>
		</Dialog.Header>
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<label for="userName" class="text-sm font-medium">Username *</label>
				<Input id="userName" bind:value={formName} required placeholder="Username" />
			</div>
			<div class="space-y-2">
				<label for="userEmail" class="text-sm font-medium">Email *</label>
				<Input
					id="userEmail"
					type="email"
					bind:value={formEmail}
					required
					placeholder="email@example.com"
				/>
			</div>
			<div class="space-y-2">
				<label for="userFullName" class="text-sm font-medium">Full Name *</label>
				<Input id="userFullName" bind:value={formFullName} required placeholder="Full Name" />
			</div>
			<div class="space-y-2">
				<label for="userPhone" class="text-sm font-medium">Phone</label>
				<Input id="userPhone" bind:value={formPhone} placeholder="08..." />
			</div>
			<div class="space-y-2">
				<label for="userType" class="text-sm font-medium">User Type</label>
				<Select.Root
					type="single"
					value={formUserType}
					onValueChange={(v) => {
						if (v) formUserType = v;
					}}
				>
					<Select.Trigger id="userType" class="w-full">
						{formUserType}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="admin">admin</Select.Item>
						<Select.Item value="customer">customer</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
				<Button type="submit">{editingUser ? 'Update' : 'Create'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Delete User</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete <strong>{deletingUser?.full_name}</strong>? This action
				cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
			<Button variant="destructive" onclick={handleDelete}>Delete</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
