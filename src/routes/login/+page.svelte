<script>
	import { store } from '$lib/stores.svelte.js';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { LogIn } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);

	async function handleLogin(e) {
		e.preventDefault();
		loading = true;
		try {
			await store.login(email, password);
			toast.success('Login successful');
			goto('/');
		} catch (err) {
			toast.error(err.message || 'Login failed');
		} finally {
			loading = false;
		}
	}
</script>

<div class="w-full">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight text-foreground">Sign in to your account</h1>
		<p class="mt-2 text-sm text-muted-foreground">Enter your email and password below to login</p>
	</div>

	<form onsubmit={handleLogin} class="space-y-6">
		<div class="space-y-2">
			<label
				for="email"
				class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>Email address</label
			>
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
			<label
				for="password"
				class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>Password</label
			>
			<Input id="password" type="password" bind:value={password} required class="h-11 shadow-sm" />
		</div>
		<div class="flex flex-col space-y-3 pt-2">
			<Button
				class="h-11 w-full text-base font-medium shadow-sm transition-all"
				type="submit"
				disabled={loading}
			>
				{#if loading}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
					></div>
					Signing in...
				{:else}
					Sign in
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
				onclick={() => goto('/register')}
			>
				Create a new account
			</Button>
		</div>
	</form>
</div>
