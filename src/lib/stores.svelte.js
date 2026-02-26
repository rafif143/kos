import { supabase } from '$lib/supabase.js';
import bcrypt from 'bcryptjs';

// Helper to safely access localStorage (client-side only)
const storage = typeof window !== 'undefined' ? window.localStorage : null;

function createStore() {
	let role = $state(storage?.getItem('role') || null);
	let currentUserId = $state(storage?.getItem('userId') ? Number(storage.getItem('userId')) : null);
	let loading = $state(true);

	let users = $state([]);
	let facilities = $state([]);
	let rooms = $state([]);
	let roomFacilities = $state([]);
	let bookings = $state([]);
	let payments = $state([]);
	let history = $state([]);

	// ─── DATA LOADING ───
	async function loadAll() {
		loading = true;
		const [uRes, fRes, rRes, rfRes, bRes, pRes, hRes] = await Promise.all([
			supabase.from('users').select('*').order('id'),
			supabase.from('facilities').select('*').order('id'),
			supabase.from('rooms').select('*').order('id'),
			supabase.from('room_facilities').select('*'),
			supabase.from('bookings').select('*').order('id'),
			supabase.from('payments').select('*').order('id'),
			supabase.from('history').select('*').order('id', { ascending: false }).limit(100),
		]);
		users = uRes.data ?? [];
		facilities = fRes.data ?? [];
		rooms = (rRes.data ?? []).map(r => ({
			...r,
			price: Number(r.price),
			image: r.image ?? [],
			facility_ids: [],
		}));
		roomFacilities = rfRes.data ?? [];
		// attach facility_ids to rooms
		for (const room of rooms) {
			room.facility_ids = roomFacilities.filter(rf => rf.room_id === room.id).map(rf => rf.facility_id);
		}
		bookings = (bRes.data ?? []).map(b => ({ ...b, amount: Number(b.amount) }));
		payments = (pRes.data ?? []).map(p => ({ ...p, amount: Number(p.amount) }));
		history = hRes.data ?? [];
		loading = false;
	}

	// Init load
	loadAll();

	// ─── HELPERS ───
	async function addHistoryRecord(event_type, data) {
		const { data: row } = await supabase.from('history').insert({ event_type, data }).select().single();
		if (row) history = [row, ...history];
	}

	return {
		get role() { return role; },
		get currentUserId() { return currentUserId; },
		get loading() { return loading; },
		reload: loadAll,

		// ─── AUTH ───
		async login(email, password) {
			const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
			if (error || !user) throw new Error('Invalid email or password');

			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) throw new Error('Invalid email or password');

			role = user.user_type;
			currentUserId = user.id;
			if (storage) {
				storage.setItem('role', role);
				storage.setItem('userId', currentUserId.toString());
			}
			await loadAll(); // load data after login
		},
		async register({ name, email, password, full_name, phone }) {
			// Check if email exists
			const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
			if (existing) throw new Error('Email already registered');

			const hashedPassword = await bcrypt.hash(password, 10);
			const { data: user, error } = await supabase.from('users').insert({
				name,
				email,
				password: hashedPassword,
				full_name,
				phone,
				user_type: 'customer'
			}).select().single();

			if (error) throw error;

			role = user.user_type;
			currentUserId = user.id;
			if (storage) {
				storage.setItem('role', role);
				storage.setItem('userId', currentUserId.toString());
			}
			await loadAll(); // load data naturally
		},
		logout() {
			role = null;
			currentUserId = null;
			if (storage) {
				storage.removeItem('role');
				storage.removeItem('userId');
			}
			// Clear sensitive data
			users = [];
			bookings = [];
			payments = [];
			history = [];
		},

		// ─── USERS ───
		get users() { return users; },
		async addUser(u) {
			const { data: row, error } = await supabase.from('users').insert(u).select().single();
			if (error) throw error;
			users = [...users, row];
			await addHistoryRecord('user_created', { user: row.full_name });
			return row;
		},
		async updateUser(id, data) {
			const { error } = await supabase.from('users').update(data).eq('id', id);
			if (error) throw error;
			const idx = users.findIndex(u => u.id === id);
			if (idx !== -1) users[idx] = { ...users[idx], ...data };
			await addHistoryRecord('user_updated', { user: users.find(u => u.id === id)?.full_name });
		},
		async deleteUser(id) {
			const user = users.find(u => u.id === id);
			const { error } = await supabase.from('users').delete().eq('id', id);
			if (error) throw error;
			users = users.filter(u => u.id !== id);
			if (user) await addHistoryRecord('user_deleted', { user: user.full_name });
		},

		// ─── FACILITIES ───
		get facilities() { return facilities; },
		async addFacility(f) {
			const { data: row, error } = await supabase.from('facilities').insert(f).select().single();
			if (error) throw error;
			facilities = [...facilities, row];
			await addHistoryRecord('facility_created', { facility: row.name });
			return row;
		},
		async updateFacility(id, data) {
			const { error } = await supabase.from('facilities').update(data).eq('id', id);
			if (error) throw error;
			const idx = facilities.findIndex(f => f.id === id);
			if (idx !== -1) facilities[idx] = { ...facilities[idx], ...data };
			await addHistoryRecord('facility_updated', { facility: facilities.find(f => f.id === id)?.name });
		},
		async deleteFacility(id) {
			const f = facilities.find(f => f.id === id);
			const { error } = await supabase.from('facilities').delete().eq('id', id);
			if (error) throw error;
			facilities = facilities.filter(f => f.id !== id);
			if (f) await addHistoryRecord('facility_deleted', { facility: f.name });
		},

		// ─── ROOMS ───
		get rooms() { return rooms; },
		async addRoom(r) {
			const { facility_ids, ...roomData } = r;
			const { data: row, error } = await supabase.from('rooms').insert(roomData).select().single();
			if (error) throw error;
			// insert room_facilities
			if (facility_ids?.length > 0) {
				await supabase.from('room_facilities').insert(
					facility_ids.map(fid => ({ room_id: row.id, facility_id: fid }))
				);
			}
			const newRoom = { ...row, price: Number(row.price), image: row.image ?? [], facility_ids: facility_ids ?? [] };
			rooms = [...rooms, newRoom];
			await addHistoryRecord('room_created', { room: row.name });
			return newRoom;
		},
		async updateRoom(id, data) {
			const { facility_ids, ...roomData } = data;
			if (Object.keys(roomData).length > 0) {
				const { error } = await supabase.from('rooms').update(roomData).eq('id', id);
				if (error) throw error;
			}
			// Sync room_facilities
			if (facility_ids !== undefined) {
				await supabase.from('room_facilities').delete().eq('room_id', id);
				if (facility_ids.length > 0) {
					await supabase.from('room_facilities').insert(
						facility_ids.map(fid => ({ room_id: id, facility_id: fid }))
					);
				}
			}
			const idx = rooms.findIndex(r => r.id === id);
			if (idx !== -1) {
				rooms[idx] = { ...rooms[idx], ...data, price: Number(data.price ?? rooms[idx].price) };
			}
			await addHistoryRecord('room_updated', { room: rooms.find(r => r.id === id)?.name });
		},
		async deleteRoom(id) {
			const r = rooms.find(r => r.id === id);
			await supabase.from('room_facilities').delete().eq('room_id', id);
			const { error } = await supabase.from('rooms').delete().eq('id', id);
			if (error) throw error;
			rooms = rooms.filter(r => r.id !== id);
			if (r) await addHistoryRecord('room_deleted', { room: r.name });
		},

		// ─── IMAGE UPLOAD ───
		async uploadRoomImages(files) {
			const urls = [];
			for (const file of files) {
				const ext = file.name.split('.').pop();
				const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
				const { error } = await supabase.storage.from('image_room').upload(path, file);
				if (error) throw error;
				const { data: urlData } = supabase.storage.from('image_room').getPublicUrl(path);
				urls.push(urlData.publicUrl);
			}
			return urls;
		},
		async deleteRoomImage(url) {
			// extract path from URL
			const match = url.match(/image_room\/(.+)$/);
			if (match) {
				await supabase.storage.from('image_room').remove([match[1]]);
			}
		},

		// ─── BOOKINGS ───
		get bookings() { return bookings; },
		async addBooking(b) {
			const { data: row, error } = await supabase.from('bookings').insert(b).select().single();
			if (error) throw error;
			const newB = { ...row, amount: Number(row.amount) };
			bookings = [...bookings, newB];
			const user = users.find(u => u.id === newB.user_id);
			const room = rooms.find(r => r.id === newB.room_id);
			await addHistoryRecord('booking_created', { booking_id: newB.id, user: user?.full_name, room: room?.name });
			return newB;
		},
		async updateBooking(id, data) {
			const { error } = await supabase.from('bookings').update(data).eq('id', id);
			if (error) throw error;
			const idx = bookings.findIndex(b => b.id === id);
			if (idx !== -1) bookings[idx] = { ...bookings[idx], ...data, amount: Number(data.amount ?? bookings[idx].amount) };
			await addHistoryRecord('booking_updated', { booking_id: id });
		},
		async deleteBooking(id) {
			const { error } = await supabase.from('bookings').delete().eq('id', id);
			if (error) throw error;
			bookings = bookings.filter(b => b.id !== id);
			await addHistoryRecord('booking_deleted', { booking_id: id });
		},

		// ─── PAYMENTS ───
		get payments() { return payments; },
		async addPayment(p) {
			const { data: row, error } = await supabase.from('payments').insert(p).select().single();
			if (error) throw error;
			const newP = { ...row, amount: Number(row.amount) };
			payments = [...payments, newP];
			await addHistoryRecord('payment_created', { payment_id: newP.id, amount: newP.amount });
			return newP;
		},
		async updatePayment(id, data) {
			const { error } = await supabase.from('payments').update(data).eq('id', id);
			if (error) throw error;
			const idx = payments.findIndex(p => p.id === id);
			if (idx !== -1) payments[idx] = { ...payments[idx], ...data };
			await addHistoryRecord('payment_updated', { payment_id: id, status: data.status });
		},

		// ─── PAY MONTHLY (auto-extend) ───
		async payMonthly(paymentId, method) {
			const payment = payments.find(p => p.id === paymentId);
			if (!payment) return;

			// 1. Mark payment as paid
			const paidAt = new Date().toISOString();
			await supabase.from('payments').update({ status: 'paid', paid_at: paidAt }).eq('id', paymentId);
			const pIdx = payments.findIndex(p => p.id === paymentId);
			if (pIdx !== -1) payments[pIdx] = { ...payments[pIdx], status: 'paid', method, paid_at: paidAt };

			await addHistoryRecord('payment_received', { payment_id: paymentId, amount: payment.amount, period: payment.period, method });

			// 2. Auto-extend booking
			const booking = bookings.find(b => b.id === payment.booking_id);
			if (booking) {
				const newEnd = new Date(booking.end_date);
				newEnd.setMonth(newEnd.getMonth() + 1);
				const newEndStr = newEnd.toISOString().split('T')[0];

				await supabase.from('bookings').update({ end_date: newEndStr }).eq('id', booking.id);
				const bIdx = bookings.findIndex(b => b.id === booking.id);
				if (bIdx !== -1) bookings[bIdx] = { ...bookings[bIdx], end_date: newEndStr };

				// 3. Create next month's payment
				const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
				const nextPeriod = `${monthNames[newEnd.getMonth()]} ${newEnd.getFullYear()}`;
				const { data: newPay } = await supabase.from('payments').insert({
					booking_id: payment.booking_id,
					amount: booking.amount,
					status: 'pending',
					period: nextPeriod,
					due_date: newEndStr,
				}).select().single();
				if (newPay) payments = [...payments, { ...newPay, amount: Number(newPay.amount) }];

				await addHistoryRecord('booking_extended', { booking_id: booking.id, new_end: newEndStr });
			}
		},

		// ─── CHECKOUT ───
		async checkoutBooking(bookingId) {
			const booking = bookings.find(b => b.id === bookingId);
			if (!booking) return;

			const today = new Date().toISOString().split('T')[0];
			// Mark booking completed
			await supabase.from('bookings').update({ status: 'completed', end_date: today }).eq('id', bookingId);
			const bIdx = bookings.findIndex(b => b.id === bookingId);
			if (bIdx !== -1) bookings[bIdx] = { ...bookings[bIdx], status: 'completed', end_date: today };

			// Free room
			await supabase.from('rooms').update({ status: 'available' }).eq('id', booking.room_id);
			const rIdx = rooms.findIndex(r => r.id === booking.room_id);
			if (rIdx !== -1) rooms[rIdx] = { ...rooms[rIdx], status: 'available' };

			// Cancel pending payments
			await supabase.from('payments').update({ status: 'cancelled' }).eq('booking_id', bookingId).eq('status', 'pending');
			for (let i = 0; i < payments.length; i++) {
				if (payments[i].booking_id === bookingId && payments[i].status === 'pending') {
					payments[i] = { ...payments[i], status: 'cancelled' };
				}
			}

			await addHistoryRecord('tenant_checkout', {
				booking_id: bookingId,
				user: users.find(u => u.id === booking.user_id)?.full_name,
				room: rooms.find(r => r.id === booking.room_id)?.name,
			});
		},

		// ─── COMPUTED / HELPERS ───
		get history() { return history; },

		get stats() {
			const totalRooms = rooms.length;
			const availableRooms = rooms.filter(r => r.status === 'available').length;
			const activeBookings = bookings.filter(b => b.status === 'active').length;
			const pendingPayments = payments.filter(p => p.status === 'pending').length;
			const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
			return { totalRooms, availableRooms, activeBookings, pendingPayments, totalRevenue };
		},

		getUserName(id) {
			return users.find(u => u.id === id)?.full_name ?? 'Unknown';
		},
		getRoomName(id) {
			return rooms.find(r => r.id === id)?.name ?? 'Unknown';
		},
		getFacilityName(id) {
			return facilities.find(f => f.id === id)?.name ?? 'Unknown';
		},
		getBookingPayments(bookingId) {
			return payments.filter(p => p.booking_id === bookingId);
		},
		getPaymentSummary(bookingId) {
			const bp = payments.filter(p => p.booking_id === bookingId);
			const total = bp.reduce((s, p) => s + p.amount, 0);
			const paid = bp.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
			const pending = bp.filter(p => p.status === 'pending').length;
			return { total, paid, remaining: total - paid, pending };
		},
	};
}

export const store = createStore();
