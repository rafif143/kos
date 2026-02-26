<script>
	import { store } from '$lib/stores.svelte.js';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { UserPlus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let full_name = $state('');
	let phone = $state('');
	let loading = $state(false);

	async function handleRegister(e) {
		e.preventDefault();
		loading = true;
		try {
			await store.register({ name, email, password, full_name, phone });
			toast.success('Registration successful');
			goto('/');
		} catch (err) {
			toast.error(err.message || 'Registration failed');
		} finally {
			loading = false;
		}
	}
</script>

<div class="w-full">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight text-foreground">Create an account</h1>
		<p class="mt-2 text-sm text-muted-foreground">Enter your details below to get started</p>
	</div>

	<form onsubmit={handleRegister} class="space-y-5">
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<label for="name" class="text-sm leading-none font-medium">Username</label>
				<Input
					id="name"
					type="text"
					placeholder="johndoe"
					bind:value={name}
					required
					class="h-11 shadow-sm"
				/>
			</div>
			<div class="space-y-2">
				<label for="full_name" class="text-sm leading-none font-medium">Full Name</label>
				<Input
					id="full_name"
					type="text"
					placeholder="John Doe"
					bind:value={full_name}
					required
					class="h-11 shadow-sm"
				/>
			</div>
		</div>
		<div class="space-y-2">
			<label for="email" class="text-sm leading-none font-medium">Email address</label>
			<Input
				id="email"
				type="email"
				placeholder="m@example.com"
				bind:value={email}
				required
				class="h-11 shadow-sm"
			/>
		</div>
		<div class="space-y-2">
			<label for="phone" class="text-sm leading-none font-medium"
				>Phone number <span class="font-normal text-muted-foreground">(Optional)</span></label
			>
			<Input id="phone" type="tel" placeholder="+62..." bind:value={phone} class="h-11 shadow-sm" />
		</div>
		<div class="space-y-2">
			<label for="password" class="text-sm leading-none font-medium">Password</label>
			<Input
				id="password"
				type="password"
				bind:value={password}
				required
				minlength="6"
				class="h-11 shadow-sm"
			/>
		</div>

		<div class="flex flex-col space-y-3 pt-4">
			<Button
				class="h-11 w-full text-base font-medium shadow-sm transition-all"
				type="submit"
				disabled={loading}
			>
				{#if loading}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
					></div>
					Creating account...
				{:else}
					Create account
				{/if}
			</Button>

			<div class="relative py-2">
				<div class="absolute inset-0 flex items-center">
					<span class="w-full border-t border-border"></span>
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-background px-2 text-muted-foreground">Or</span>
				</div>
			</div>

			<Button
				variant="outline"
				type="button"
				class="h-11 w-full text-base font-medium transition-all"
				onclick={() => goto('/login')}
			>
				Sign in to existing account
			</Button>
		</div>
	</form>
</div>
