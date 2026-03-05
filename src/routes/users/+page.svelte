<script>
	import { store } from '$lib/stores.svelte.js';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Search } from '@lucide/svelte';

	const isAdmin = $derived(store.role === 'admin');
	let search = $state('');

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
</script>

<div class="space-y-4">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Users</h2>
			<p class="text-muted-foreground">{isAdmin ? 'Manage users' : 'Your profile'}</p>
		</div>
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
					</Table.Row>
				{/each}
				{#if filteredUsers.length === 0}
					<Table.Row>
						<Table.Cell colspan={6} class="py-8 text-center text-muted-foreground"
							>No users found.</Table.Cell
						>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>
