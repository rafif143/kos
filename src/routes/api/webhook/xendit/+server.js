import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { supabase } from '$lib/supabase.js';

// This endpoint receives Webhook notifications from Xendit
// Make sure to configure this URL (e.g., https://yourdomain.com/api/webhook/xendit)
// in your Xendit Dashboard -> Callbacks.
export async function POST({ request }) {
    try {
        // Optional but highly recommended: Verify Callback Token from Xendit
        const xenditToken = request.headers.get('x-callback-token');
        if (env.XENDIT_CALLBACK_TOKEN && xenditToken !== env.XENDIT_CALLBACK_TOKEN) {
            return json({ error: 'Unauthorized callback' }, { status: 403 });
        }

        const data = await request.json();
        console.log('Xendit Webhook Received:', data);

        const externalId = data.external_id; // e.g. "kosapp-payment-1-170123456"
        const status = data.status; // e.g. "PAID", "EXPIRED"

        if (externalId && externalId.startsWith('kosapp-payment-')) {
            const parts = externalId.split('-');
            const paymentId = parseInt(parts[2], 10);

            if (!isNaN(paymentId) && status === 'PAID') {
                // Get the payment
                const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).single();

                if (payment && payment.status !== 'paid') {
                    // 1. Mark payment as paid
                    const paidAt = new Date().toISOString();
                    await supabase.from('payments').update({
                        status: 'paid',
                        paid_at: paidAt,
                        xendit_payment_method: data.payment_method || null,
                        xendit_callback_data: data
                    }).eq('id', paymentId);

                    // 2. Auto-extend booking
                    const { data: booking } = await supabase.from('bookings').select('*').eq('id', payment.booking_id).single();
                    if (booking) {
                        const newEnd = new Date(booking.end_date);
                        newEnd.setMonth(newEnd.getMonth() + 1);
                        const newEndStr = newEnd.toISOString().split('T')[0];

                        await supabase.from('bookings').update({ end_date: newEndStr }).eq('id', booking.id);

                        // 3. Create next month's payment
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const nextPeriod = `${monthNames[newEnd.getMonth()]} ${newEnd.getFullYear()}`;
                        await supabase.from('payments').insert({
                            booking_id: booking.id,
                            amount: booking.amount,
                            status: 'pending',
                            period: nextPeriod,
                            due_date: newEndStr
                        });

                        // 4. Record history
                        await supabase.from('history').insert([
                            { event_type: 'payment_received', data: { payment_id: paymentId, amount: Number(payment.amount), period: payment.period, method: data.payment_method || 'Xendit' } },
                            { event_type: 'booking_extended', data: { booking_id: booking.id, new_end: newEndStr } }
                        ]);
                    }
                }
            } else if (!isNaN(paymentId) && status === 'EXPIRED') {
                await supabase.from('payments').update({
                    status: 'expired'
                }).eq('id', paymentId);
            }
        }

        // Acknowledge receipt to Xendit so they stop retrying
        return json({ received: true });
    } catch (error) {
        console.error('Xendit Webhook Error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
