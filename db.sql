-- ============================================
-- KosApp Database Schema
-- Dengan integrasi Xendit Payment Gateway
-- ============================================

-- 1. USERS
CREATE TABLE users (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(150),
    phone       VARCHAR(20),
    user_type   ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. FACILITIES
CREATE TABLE facilities (
    id    BIGINT PRIMARY KEY AUTO_INCREMENT,
    name  VARCHAR(100) NOT NULL
);

-- 3. ROOMS
CREATE TABLE rooms (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(50) NOT NULL,                          -- Standard, Deluxe, Suite, Premium
    price       DECIMAL(15,2) NOT NULL,                        -- harga per bulan
    status      ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. ROOM_FACILITIES (many-to-many)
CREATE TABLE room_facilities (
    room_id     BIGINT NOT NULL,
    facility_id BIGINT NOT NULL,
    PRIMARY KEY (room_id, facility_id),
    FOREIGN KEY (room_id)     REFERENCES rooms(id)      ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

-- 5. BOOKINGS
--    Satu booking = satu tenant di satu kamar.
--    end_date otomatis extend +1 bulan setiap bayar.
CREATE TABLE bookings (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT NOT NULL,
    room_id     BIGINT NOT NULL,
    type        ENUM('monthly','daily','yearly') NOT NULL DEFAULT 'monthly',
    start_date  DATE NOT NULL,                                 -- tanggal masuk
    end_date    DATE NOT NULL,                                 -- berlaku sampai (auto-extend saat bayar)
    status      ENUM('pending','active','completed','cancelled') NOT NULL DEFAULT 'pending',
    amount      DECIMAL(15,2) NOT NULL,                        -- harga per bulan
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);

-- 6. PAYMENTS
--    Satu record = satu bulan pembayaran.
--    Bayar → hit Xendit Invoice API → dapat invoice_id & invoice_url.
--    User bayar via link → Xendit kirim webhook → update status & xendit fields.
--    Auto-extend booking +1 bulan & buat payment bulan berikutnya.
CREATE TABLE payments (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id          BIGINT NOT NULL,
    amount              DECIMAL(15,2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'IDR',
    status              ENUM('pending','paid','expired','cancelled','refunded') NOT NULL DEFAULT 'pending',
    period              VARCHAR(20),                           -- 'Mar 2026', 'Apr 2026', dst
    due_date            DATE,                                  -- jatuh tempo

    -- ─── Xendit Fields ───
    -- Diisi saat create invoice via Xendit API
    xendit_invoice_id   VARCHAR(100),                          -- ID invoice dari Xendit (inv_xxxxx)
    xendit_external_id  VARCHAR(100),                          -- ID unik dari sistem kita (payment_{id}_{timestamp})
    xendit_invoice_url  VARCHAR(500),                          -- URL pembayaran untuk user (checkout.xendit.co/...)

    -- Diisi saat webhook callback dari Xendit (invoice.paid / invoice.expired)
    xendit_payment_id   VARCHAR(100),                          -- ID transaksi pembayaran di Xendit
    xendit_payment_method ENUM(
        'BANK_TRANSFER',                                       -- Virtual Account (BCA, BNI, BRI, Mandiri, Permata, dll)
        'EWALLET',                                             -- GoPay, OVO, DANA, ShopeePay, LinkAja
        'QR_CODE',                                             -- QRIS
        'RETAIL_OUTLET',                                       -- Alfamart, Indomaret
        'CREDIT_CARD',                                         -- Kartu kredit/debit
        'DIRECT_DEBIT',                                        -- Direct debit dari bank
        'PAYLATER'                                             -- Kredivo, Akulaku
    ) NULL,
    xendit_payment_channel VARCHAR(50),                        -- Channel spesifik: BCA, BNI, OVO, GOPAY, DANA, SHOPEEPAY, QRIS, dll
    xendit_payment_destination VARCHAR(100),                   -- Nomor VA / ID tujuan pembayaran
    xendit_paid_amount  DECIMAL(15,2),                         -- Jumlah yang benar-benar dibayar (termasuk fee jika ada)
    xendit_callback_data JSON,                                 -- Raw webhook payload dari Xendit (untuk audit)

    paid_at             TIMESTAMP NULL,                        -- Waktu pembayaran berhasil (dari Xendit paid_at)
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,

    INDEX idx_xendit_invoice   (xendit_invoice_id),
    INDEX idx_xendit_external  (xendit_external_id),
    INDEX idx_booking_status   (booking_id, status),
    INDEX idx_period           (period)
);

-- 7. HISTORY
--    Log semua aktivitas: booking, payment, room, user, checkout, dll.
CREATE TABLE history (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_type  VARCHAR(50) NOT NULL,                          -- booking_created, payment_received, tenant_checkout, dll
    timestamp   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data        JSON                                           -- detail event (user, room, amount, dll)
);

-- ============================================
-- SAMPLE DATA
-- ============================================

INSERT INTO users (name, email, password, full_name, phone, user_type) VALUES
('admin', 'admin@kos.com', '$2b$10$hash', 'Admin User', '081234567890', 'admin'),
('budi',  'budi@mail.com', '$2b$10$hash', 'Budi Santoso', '081234567891', 'customer');

INSERT INTO facilities (name) VALUES
('WiFi'), ('AC'), ('Parking'), ('Laundry'), ('Kitchen'), ('Swimming Pool'), ('Gym'), ('CCTV');

INSERT INTO rooms (name, category, price, status) VALUES
('Room 101', 'Standard', 500000, 'available'),
('Room 102', 'Standard', 500000, 'occupied'),
('Room 201', 'Deluxe',   800000, 'available'),
('Room 202', 'Deluxe',   800000, 'maintenance'),
('Room 301', 'Suite',   1200000, 'available'),
('Room 302', 'Suite',   1200000, 'available'),
('Room 303', 'Premium', 1500000, 'available');

INSERT INTO room_facilities (room_id, facility_id) VALUES
(1,1),(1,2),(1,8),
(2,1),(2,2),
(3,1),(3,2),(3,3),(3,5),
(4,1),(4,2),(4,3),
(5,1),(5,2),(5,3),(5,4),(5,5),(5,6),
(6,1),(6,2),(6,3),(6,4),(6,5),(6,6),(6,7),
(7,1),(7,2),(7,3),(7,4),(7,5),(7,6),(7,7),(7,8);

INSERT INTO bookings (user_id, room_id, type, start_date, end_date, status, amount) VALUES
(2, 2, 'monthly', '2026-02-01', '2026-03-01', 'active', 500000);

INSERT INTO payments (booking_id, amount, currency, status, period, due_date) VALUES
(1, 500000, 'IDR', 'pending', 'Mar 2026', '2026-03-01');

INSERT INTO history (event_type, timestamp, data) VALUES
('booking_created', '2026-02-01 10:00:00', '{"booking_id": 1, "user": "Budi Santoso", "room": "Room 102"}');

-- ============================================
-- CATATAN INTEGRASI XENDIT
-- ============================================
-- Flow pembayaran:
--
-- 1. User klik "Bayar" → Backend create Xendit Invoice via POST /v2/invoices
--    Request body:
--      external_id:  "payment_{payment.id}_{timestamp}"
--      amount:       payment.amount
--      currency:     "IDR"
--      description:  "Pembayaran Kos {room.name} - {payment.period}"
--      customer:     { given_names, email, mobile_number }
--      success_redirect_url: "{APP_URL}/bookings?payment=success"
--      failure_redirect_url: "{APP_URL}/bookings?payment=failed"
--
-- 2. Simpan response ke payments:
--      xendit_invoice_id  = response.id
--      xendit_external_id = external_id yang dikirim
--      xendit_invoice_url = response.invoice_url
--
-- 3. Redirect user ke xendit_invoice_url (halaman checkout Xendit)
--
-- 4. User bayar via channel pilihan (VA, E-Wallet, QRIS, dll)
--
-- 5. Xendit kirim webhook POST ke endpoint kita (invoice.paid / invoice.expired)
--    Webhook payload berisi:
--      id, external_id, status, amount, paid_amount,
--      payment_method, payment_channel, payment_destination, paid_at
--
-- 6. Backend terima webhook → update payments:
--      status                   = 'paid'
--      xendit_payment_id        = callback.payment_id
--      xendit_payment_method    = callback.payment_method
--      xendit_payment_channel   = callback.payment_channel
--      xendit_payment_destination = callback.payment_destination
--      xendit_paid_amount       = callback.paid_amount
--      xendit_callback_data     = JSON(full callback payload)
--      paid_at                  = callback.paid_at
--
-- 7. Auto-extend: update bookings.end_date +1 bulan,
--    buat payment record bulan berikutnya (status pending)
--
-- 8. Jika webhook status = 'EXPIRED':
--    Update payment status = 'expired'
--    (User bisa retry → create invoice baru)
--
-- Payment channels yang tersedia di Xendit:
--   BANK_TRANSFER: BCA, BNI, BRI, MANDIRI, PERMATA, BSI, CIMB, SAHABAT_SAMPOERNA
--   EWALLET:       OVO, GOPAY, DANA, SHOPEEPAY, LINKAJA, ASTRAPAY, JENIUSPAY
--   QR_CODE:       QRIS
--   RETAIL_OUTLET:  ALFAMART, INDOMARET
--   CREDIT_CARD:    VISA, MASTERCARD, JCB
--   PAYLATER:       KREDIVO, AKULAKU, UANGME