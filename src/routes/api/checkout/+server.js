import { json } from '@sveltejs/kit';
import { xendit } from '$lib/server/xendit.server.js';
import { env } from '$env/dynamic/private';

// This endpoint receives a request from the frontend to generate a payment invoice.
export async function POST({ request }) {
    try {
        const { paymentId, amount, payerEmail, description, successRedirectUrl, failureRedirectUrl } = await request.json();

        if (!paymentId || !amount) {
            return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Unique external ID for the invoice based on payment ID and timestamp
        const externalId = `kosapp-payment-${paymentId}-${Date.now()}`;

        // Attempt to create a Xendit Invoice
        const invoice = await xendit.Invoice.createInvoice({
            data: {
                externalId: externalId,
                amount: amount,
                description: description || `Payment #${paymentId}`,
                payerEmail: payerEmail || 'guest@example.com',
                successRedirectUrl: successRedirectUrl || `${env.PUBLIC_SITE_URL || 'https://kos-management.netlify.app'}/bookings?payment=success`,
                failureRedirectUrl: failureRedirectUrl || `${env.PUBLIC_SITE_URL || 'https://kos-management.netlify.app'}/bookings?payment=failed`,
                currency: 'IDR'
            }
        });

        // Return the generated invoice URL to the frontend
        return json({
            success: true,
            invoiceUrl: invoice.invoiceUrl,
            invoiceId: invoice.id,
            externalId: externalId
        });
    } catch (error) {
        console.error('Xendit Checkout Error:', error);
        return json({ error: error.message || 'Failed to create payment' }, { status: 500 });
    }
}
