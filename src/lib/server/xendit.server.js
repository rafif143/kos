import { Xendit } from 'xendit-node';
import { env } from '$env/dynamic/private';

// Instantiate Xendit globally to avoid multiple instances.
// We expect XENDIT_SECRET_KEY to be set in the .env file.
export const xendit = new Xendit({
    secretKey: env.XENDIT_SECRET_KEY || 'xnd_development_placeholder_key' // Fallback for local testing if not set
});
