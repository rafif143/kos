# Dokumentasi Lengkap KosApp (Sistem Manajemen Kos-Kosan)

Dokumen ini berisi analisis dan dokumentasi lengkap dari seluruh arsitektur, fitur, alur kerja (flow), dan struktur kode dari aplikasi **KosApp**, yaitu sebuah Sistem Manajemen Kos-Kosan berbasis web dengan integrasi pembayaran *online* Xendit.

---

## 1. Informasi Umum
- **Nama Aplikasi**: KosApp (Room Booking System)
- **Tujuan**: Aplikasi untuk memanajemen data kos-kosan, meliputi manajemen kamar, tenant (penghuni), fasilitas, pencatatan otomatis transaksi bulanan, hingga integrasi payment gateway (Xendit).
- **Tech Stack Utama**:
  - **Framework Frontend/Backend**: SvelteKit (menggunakan Svelte 5 terbaru dengan *runes* seperti `$state`, `$derived`, `$effect`).
  - **Styling**: Tailwind CSS v4 + konvensi UI komponen dari shadcn/radix (menggunakan `bits-ui` dan Tailwind Variants).
  - **Database & BaaS**: PostgreSQL via **Supabase**.
  - **Payment Gateway**: **Xendit** (menggunakan `xendit-node`).
  - **Icons**: `lucide-svelte`.
  - **Internationalization (i18n)**: Kustom implementasi state di Svelte (Dukungan Bahasa Indonesia dan Bahasa Inggris).

---

## 2. Struktur Database (Schema Analysis)
Aplikasi ini memiliki 7 tabel utama di PostgreSQL (Supabase) yang dirancang secara relasional:

1. **`users`**
   - **Fungsi**: Menyimpan data pengguna.
   - **Tipe User (`user_type`)**: Ada dua role, yaitu `admin` (pemilik/pengelola) dan `customer` (penghuni/pencari kos).
   - **Field Penting**: `email`, `password` (ter-hash bcrypt), `full_name`, `phone`.

2. **`facilities`**
   - **Fungsi**: Master data fasilitas kos (misal: WiFi, AC, Parkir, Dapur).

3. **`rooms`**
   - **Fungsi**: Menyimpan data spesifik kamar kos.
   - **Field Penting**: `name`, `category` (Standard, Deluxe, Suite, Premium), `price` (harga per bulan), `status` (available, occupied, maintenance).

4. **`room_facilities` (Tabel Pivot)**
   - **Fungsi**: Menghubungkan relasi *many-to-many* antara `rooms` dan `facilities`.

5. **`bookings`**
   - **Fungsi**: Menyimpan data sewa/reservasi kamar oleh pengguna.
   - **Field Penting**: `user_id`, `room_id`, `type` (monthly, daily, dll), `start_date`, `end_date` (kapan sewa berakhir), `status` (pending, active, completed, cancelled), `amount`.
   - **Logika**: Setap sewa berjalan (active), `end_date` menjadi pedoman jatuh tempo. Jika dibayar, `end_date` akan bertambah +1 bulan.

6. **`payments`**
   - **Fungsi**: Mencatat setiap siklus tagihan bulanan.
   - **Field Penting**: `booking_id`, `amount`, `status` (pending, paid, expired, cancelled, refunded), `due_date` (jatuh tempo).
   - **Field Integrasi Xendit**:
     - `xendit_invoice_id`, `xendit_external_id`, `xendit_invoice_url` (saat create invoice).
     - `xendit_payment_id`, `xendit_payment_method`, `xendit_payment_channel` (saat callback webhook sukses).

7. **`history`**
   - **Fungsi**: Sebagai *Audit Log* / Riwayat Aktivitas untuk setiap operasi krusial dalam sistem (booking dibuat, pembayaran diterima, user dihapus, kamar diubah, dll). Data log tambahan disimpan dalam format `JSON` pada kolom `data`.

---

## 3. Sistem State Management & Data Fetching (Store Svelte)
Seluruh pengelolaan state aplikasi berada di berkas sentral `src/lib/stores.svelte.js`. Menggunakan Rune `$state` Svelte 5 untuk *reactivity*.

### Karakteristik dan Fungsi Store:
- **`loadAll()`**: Fungsi master yang dipanggil ketika aplikasi pertama kali di-load. Menarik semua data (users, fasilitas, kamar, relasi, booking, payment, history) dari Supabase secara paralel (menggunakan `Promise.all`), sehingga state lokal (*cache*) tersinkronisasi.
- **Helpers**: Store ini mengekspos semua data dengan format optimal (seperti menyatukan ID fasilitas ke dalam objek kamar secara otomatis).
- **CRUD Operations**: Fungsi untuk menambah, mengedit, dan menghapus (Users, Rooms, Facilities, Bookings, Payments) tidak hanya mengubah state lokal, tapi juga langsung me-*mutate* database Supabase dan secara otomatis membuat *log* di tabel `history`.
- **Auth**: Menggunakan *LocalStorage* `role` dan `userId` sebagai persistensi sesi, disertakan fungsi `login`, `register`, dan `logout` (password hashing dilakukan via `bcryptjs`).
- **Logika Bisnis Khusus di Store**:
  - `payMonthly()`: Fungsi jika pembayaran diakui/dibayar. Memperbarui status pembayaran jadi 'paid', **memperpanjang bulan booking + 1 bulan**, dan otomatis menghasilkan tagihan `pending` untuk bulan berikutnya.
  - `checkoutBooking() / cancelBooking()`: Fungsi saat tenant berhenti ngekos. Membebaskan kamar (status `available`), menandai sewa `completed / cancelled`, dan membatalkan semua tagihan (`pending`) yang tersisa.
  - *Computed Status Bookings*: Sifat array `bookings` di *getter*-nya bersifat reaktif mengecek tagihan pembayarannya; jika terdapat tagihan yang sudah jatuh tempo, ia akan menampilkan status menjadi `pending`.

---

## 4. Alur Integrasi Payment Gateway (Xendit)
Ini adalah inti dari otomasi sistem. Integrasi backend diselesaikan menggunakan endpoint API di SvelteKit (`src/routes/api/`). Terdapat 2 endpoint utama:

### A. Endpoint Pembuatan Invoice (`/api/checkout/+server.js` - `POST`)
1. **Trigger**: Pengguna (Customer / Admin) mengklik bayar di frontend.
2. **Proses**: Menerima request berisi `paymentId` dan `amount`.
3. **Logic**:
   - Membuat ID eksternal (`kosapp-payment-{id}-{timestamp}`).
   - Memanggil `xendit.Invoice.createInvoice()` dengan detail jumlah, redirect URL sukses/gagal, dan data pendukung.
4. **Output**: Mengembalikan URL Checkout Xendit (`invoiceUrl`) agar user diarahkan ke layar pembayaran resmi Xendit.

### B. Endpoint Webhook Callback (`/api/webhook/xendit/+server.js` - `POST`)
1. **Trigger**: Dipanggil secara asinkron (otomatis) oleh server Xendit ketika pengguna selesai membayar.
2. **Proses & Validasi**:
   - Memastikan `x-callback-token` valid (opsional) untuk keamanan.
   - Mengambil ID Pembayaran di ekstrak dari `external_id`.
3. **Workflow Jika LUNAS (`status === 'PAID'`)**:
   - Mengecek validitas tabel `payments`.
   - **Step 1**: Meng-update `payments` set status `'paid'` & mengisi rekaman `xendit_callback_data`.
   - **Step 2**: Meng-extend waktu penyewaan di tabel `bookings` menjadi +1 bulan kedepan (`newEnd.setMonth(newEnd.getMonth() + 1)`).
   - **Step 3**: Secara otomatis meng-*insert* atau mem-generate tagihan baru di tabel `payments` dengan status `'pending'` untuk bulan selanjutnya.
   - **Step 4**: Mencatat jejak history bahwa 'pembayaran diterima' dan 'penyewaan diperpanjang'.
4. **Workflow Jika EXPIRED (`status === 'EXPIRED'`)**:
   - Hanya mengupdate `payments` status menjadi `'expired'`.

---

## 5. UI/UX & Layout Architecture
Layout utama dirombak menggunakan ruting SvelteKit (`+layout.svelte`) yang sangat mementingkan pengalaman visual (memenuhi standar modern).

- **Sistem Tema Mode Gelap/Terang**: Didukung sepenuhnya melalui library `mode-watcher` dan variabel Tailwind.
- **Notifikasi**: Menggunakan `svelte-sonner` (komponen `Toaster`) untuk pesan sukses/error interaktif.
- **Routing & Pembatasan Akses**:
  - Terdapat mekanisme di dalam layout (`$effect()`) yang mencegah akses *guest* ke dalam sistem dashboard (jika tidak ada `currentUserId` akan ter-redirect otomatis ke `/login`). Begitupun sebaliknya.
- **Dua Tipe Tampilan Utama**:
  1. **Halaman Autentikasi (`/login`, `/register`)**: Layout *split-screen* premium; separuh layar menampung form otentikasi (dengan icon dan branding aplikasi), dan separuh lainnya menampilkan gambar *unsplash* terkait estetika kamar kos disertai gradien yang cantik.
  2. **Halaman App Desktop/Mobile Layout**:
     - Sistem Side-Bar (`Sidebar.svelte`) dan Header (Topbar) yang responsif.
     - Di mobile, sidebar menjadi drawer *slide-in* dengan efek *backdrop*. Di desktop, ter-*dock* dan stabil di sebelah kiri.
     - Area konten utama memiliki padding yang responsif dan membatasi lebar agar tetap terbaca.
- **i18n (Internationalization)**:
  - Tersentralisasi dalam form `i18n.svelte.js`. Mengambil preferensi reaktif `$state('id')` dengan dua bahasa (Inggris dan Indonesia). 
  - Fungsi translasi ditarik melalui instance fungsi `i18n.t('key')`.

---

## 6. Detail Halaman Aplikasi (Pages / Routes)

- **Halaman Utama / Dashboard (`/`)**:
  - **Admin**: Akan diberikan *Overview* yang berisi kompilasi kartu statistik (`stats`) seperti Total Kamar, Kamar Kosong, Booking Aktif, Pembayaran Pending, Total Pendapatan, dan sebuah tabel ringkasan aktivitas terakhir (log history).
  - **Customer**: Menampilkan layar selamat datang, menampilkan tombol aksi cepat (mencari kamar / lihat tagihan), serta metrik terkait akun dia sendiri.
- **Halaman Kamar / Fasilitas (`/rooms`)**:
  - Dikelola oleh Admin. Admin dapat membuat, mengubah, hingga menghapus kamar dan fasilitas.
  - Memasukkan array `facility` ke dalam relasi pivot di background otomatis.
- **Halaman Browsing Kos (`/`) atau bagian booking**:
  - Customer dapat melihat dan menyaring berdasarkan kamar dan fasilitasnya untuk melakukan simulasi check out atau *request* ke kos tersebut.
- **Halaman Booking & Pembayaran (`/bookings`)**:
  - Mengelola *lifecycle* pemesanan. Admin bisa melihat pengguna ngekos, riwayat invoice secara bulanan, memperpanjang kos, memperpendek, dll. Tagihan per tenant dapat tertampil dan admin bisa melihat invoice URL dari tenant terkait jika ada.
- **Halaman Riwayat (`/history`)**:
  - Berisi daftar audit log (aktivitas yang digenerate oleh `stores`).
- **Halaman Pengguna (`/users`)**:
  - Admin mendaftarkan admin baru atau menghapus penghuni nakal.

---

## 7. Rangkuman & Catatan Khusus
- Aplikasi dirancang menggunakan **arsitektur optimisasi lokal kuat**, yang mana SvelteKit memuat semua tabel pada state lokal (`store`) sebelum nge-render. Ini membuat website berpindah navigasi secara **sangat instan** tanpa loading antar-halaman (*Single Page Application / SPA feel*).
- Pola **Data Hydration** (penarikan data via Supabase `Promise.all` di `loadAll()`) dapat memakan *payload size* seiring berjalannya database, disarankan nantinya dilakukan limitasi pada `history` dan `payments` bila aplikasi telah berkembang pesat. Saat ini dilimit `100` baris terakhir.
- Seluruh *Payment automation* telah menggunakan desain **Webhook Asynchronous**. Berarti user maupun admin dapat menutup dan mematikan browser ketika pembayaran berjalan, Xendit akan selalu meng-*update* database kapanpun status bayar dari bank berubah sukses.

---
**Di-generate oleh AI Assistant:** Dokumentasi lengkap menganalisa logika bisnis (`db.sql`), kontrol *state* Svelte (`stores.svelte.js`), komponen SvelteKit (`+layout`), dan Payment Gateway (`webhook/+server.js`).
