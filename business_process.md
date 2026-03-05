# BAB IV
# HASIL DAN PEMBAHASAN

Bab ini membahas mengenai hasil implementasi dari Sistem Informasi Manajemen Kos-Kosan (KosApp) yang telah dibangun, meliputi penjelasan proses bisnis yang berjalan pada sistem, serta pemaparan antarmuka (User Interface) dari masing-masing fitur beserta fungsinya.

## 4.1. Proses Bisnis Sistem (Business Process)
Bagian ini menjelaskan alur kerja (flow) dari perangkat lunak yang dibangun, di mana sistem dirancang untuk mengotomatisasi siklus pengelolaan kos mulai dari pencatatan data hingga penagihan otomatis. Sistem ini melibatkan dua aktor utama, yaitu Admin (Pengelola Kos) dan Customer (Penyewa/Anak Kos).

### 4.1.1. Proses Registrasi dan Autentikasi
Proses ini mengatur bagaimana pengguna dapat masuk ke dalam sistem.
1. Customer yang belum memiliki akun melakukan pendaftaran pada form registrasi dengan memasukkan data identitas lengkap.
2. Akun akan disimpan ke dalam database dengan enkripsi *password* (bcrypt).
3. Pengguna (Admin/Customer) melakukan proses *Login* dengan memasukkan email dan *password*.
4. Sistem memvalidasi kredensial dan mengarahkan pengguna ke halaman *Dashboard* sesuai dengan hak akses (*role*) masing-masing.

### 4.1.2. Proses Pengelolaan Data Master (Master Data Management)
Proses ini hanya dapat diakses oleh Admin untuk mengatur data dasar kos sebelum beroperasi.
1. **Pendataan Fasilitas**: Admin mendaftarkan daftar fasilitas umum dan fasilitas dalam kamar (misal: AC, WiFi, Kamar Mandi Dalam).
2. **Pendataan Kamar**: Admin mendaftarkan nomor atau nama kamar, menentukan kategori (Standard, Deluxe, dll), dan menetapkan harga sewa per bulan.
3. Admin memetakan fasilitas apa saja yang terdapat pada kamar tersebut.
4. Status kamar yang baru didaftarkan secara default akan diatur menjadi `Available` (Tersedia).

### 4.1.3. Proses Pemesanan Kamar (Booking Process)
Proses bagaimana sebuah kamar disewakan kepada Customer.
1. Customer atau Admin mencari kamar yang berstatus `Available` melalui katalog kamar.
2. Proses pemesanan (*Booking*) dilakukan dengan menautkan data Customer, Kamar yang dipilih, dan Tanggal Mulai Masuk (*Start Date*).
3. Sistem secara otomatis merubah status kamar menjadi `Occupied` (Terisi).
4. Sistem otomatis membuat satu data pesanan aktif dan menghasilkan 1 (satu) Tagihan Bulanan Pertama (*Invoice/Payment*) untuk bulan tersebut dengan status `Pending`.

### 4.1.4. Proses Pembayaran via Payment Gateway (Xendit)
Sistem meniadakan pembayaran tunai atau transfer manual konvensional yang memerlukan bukti transfer.
1. Customer mengakses halaman "Bookings & Payments" dan menekan tombol **Bayar** pada tagihan yang berstatus `Pending`.
2. Sistem akan memanggil API dari *Payment Gateway* Xendit dan menghasilkan *URL Checkout* unik.
3. Customer diarahkan ke halaman Xendit untuk memilih metode pembayaran (Mobile Banking, Virtual Account, e-Wallet, atau QRIS).
4. Setelah Customer melakukan pembayaran di bank/e-Wallet pilihan, sistem Xendit secara *real-time* mengirimkan sinyal (*Webhook Callback*) ke sistem KosApp.
5. Sistem menerima sinyal tersebut dan langsung mengubah status tagihan menjadi `Paid` (Lunas).

### 4.1.5. Proses Perpanjangan Sewa Otomatis (Auto-Extend)
Ini merupakan otomasi utama sistem dalam menangani tagihan berulang (*recurring*).
1. Sesaat setelah sistem menerima sinyal "Lunas" dari *Payment Gateway*, sistem memeriksa data *Booking* milik Customer.
2. Sistem secara otomatis memperpanjang Tanggal Jatuh Tempo sewa (*End Date*) sebanyak +1 bulan ke depan.
3. Sistem langsung menerbitkan/membuat Data Tagihan Baru (*Payment*) untuk bulan berikutnya dengan status `Pending`.
4. Siklus 4.1.4 dan 4.1.5 ini akan berulang setiap bulannya secara otomatis tanpa intervensi Admin.

### 4.1.6. Proses *Checkout* (Keluar Kos)
Siklus perputaran sewa kos diakhiri melalui proses ini.
1. Apabila Customer memutuskan untuk pindah atau berhenti nge-kos, Admin atau Customer melakukan klik tombol *Checkout*.
2. Sistem akan mengakhiri kontrak sewa dan mengubah status *Booking* menjadi `Completed` (Selesai).
3. Sistem mengganti status kamar dari `Occupied` kembali menjadi `Available` agar dapat disewakan kepada orang lain.
4. Jika terdapat tagihan bulan-bulan ke depan yang masih `Pending`, sistem akan terotomatisasi membatalkannya (`Cancelled`) agar Customer tidak terbebani hutang fiktif.

---

## 4.2. Implementasi Antarmuka dan Penjelasan Fitur
Bagian ini berisi implementasi antarmuka dari hasil perancangan sistem. Berikut adalah tampilan layar (User Interface) beserta penjelasan dari tiap fitur yang ada.

### 4.2.1. Halaman Autentikasi (Login & Register)
Halaman ini adalah pintu masuk utama ke dalam aplikasi KosApp.
*(Penjelasan tambahan: Menekankan desain split-screen premium dan validasi error).*

> **[TEMPATKAN SCREENSHOT HALAMAN LOGIN DI SINI]**
> *Gambar 4.1 - Tampilan Halaman Login*

> **[TEMPATKAN SCREENSHOT HALAMAN REGISTER DI SINI]**
> *Gambar 4.2 - Tampilan Halaman Registrasi Akun*

### 4.2.2. Halaman Dashboard Admin
Halaman utama setelah Admin berhasil masuk. Pada halaman ini terdapat rangkuman statistik operasional kos dan aktivitas terbaru secara *real-time*.
*(Penjelasan tambahan: Sebutkan widget apa saja yang ada, misal Total Kamar, Kamar Kosong, Total Pendapatan, dan tabel Riwayat Aktivitas).*

> **[TEMPATKAN SCREENSHOT HALAMAN DASHBOARD ADMIN DI SINI]**
> *Gambar 4.3 - Tampilan Dashboard Admin*

### 4.2.3. Halaman Dashboard Customer
Halaman utama bagi penghuni kos. Menampilkan status sewa kamar saat ini dan peringatan apabila terdapat tagihan yang belum dibayar.

> **[TEMPATKAN SCREENSHOT HALAMAN DASHBOARD CUSTOMER DI SINI]**
> *Gambar 4.4 - Tampilan Dashboard Penghuni Kos*

### 4.2.4. Halaman Pengelolaan Kamar dan Fasilitas (Rooms & Facilities)
Halaman untuk manajemen kamar. Terdapat fitur untuk menambah data kamar baru, mengatur kategori kamar, serta manajemen harga dan fasilitas penunjang.

> **[TEMPATKAN SCREENSHOT HALAMAN DAFTAR KAMAR DI SINI]**
> *Gambar 4.5 - Tampilan Daftar Kamar dan Aksi CRUD*

> **[TEMPATKAN SCREENSHOT MODAL/FORM TAMBAH KAMAR DI SINI]**
> *Gambar 4.6 - Form Penambahan Data Kamar Baru*

### 4.2.5. Halaman *Browse Rooms* (Pencarian Kamar)
Halaman katalog bagi pengguna (atau Admin) untuk melihat daftar kamar yang statusnya masih `Available` beserta harga dan deskripsi fasilitas lengapnya.

> **[TEMPATKAN SCREENSHOT HALAMAN BROWSE ROOMS DI SINI]**
> *Gambar 4.7 - Tampilan Katalog Kamar Kosong*

### 4.2.6. Halaman Manajemen Penyewaan dan Pembayaran (Bookings & Payments)
Halaman sentral bagi sistemKos. Di sini Admin dapat melihat kelengkapan data penyewaan, serta melihat riwayat jatuh tempo tiap penyewa. 

> **[TEMPATKAN SCREENSHOT DAFTAR BOOKING AKTIF DI SINI]**
> *Gambar 4.8 - Tampilan Daftar Penyewa Aktif (Bookings)*

Pada halaman ini pula, Customer dapat melihat tagihan miliknya dan menekan tombol *Pay* untuk memproses tagihan bulanannya.

> **[TEMPATKAN SCREENSHOT PANEL TAGIHAN (PAYMENTS) DI SINI]**
> *Gambar 4.9 - Tampilan Daftar Tagihan dan Tombol Pembayaran / Checkout*

### 4.2.7. Halaman Integrasi *Payment Gateway* Xendit
Merupakan antarmuka halaman pihak ketiga (Xendit) saat tombol *Pay* ditekan, tempat pengguna memasukkan metode pembayarannya.

> **[TEMPATKAN SCREENSHOT HALAMAN CHECKOUT XENDIT DI SINI]**
> *Gambar 4.10 - Tampilan Pemilihan Metode Pembayaran via Xendit*

### 4.2.8. Halaman Riwayat Aktivitas (*Activity Log/History*)
Log audit (jejak rekam) sistem. Menampilkan setiap interaksi vital yang terjadi, seperti pencatatan sistem ketika uang berhasil diterima dari *Payment Gateway*.

> **[TEMPATKAN SCREENSHOT HALAMAN ACTIVITY LOG DI SINI]**
> *Gambar 4.11 - Tampilan Catatan Riwayat Aktivitas Sistem*

### 4.2.9. Halaman Manajemen Pengguna (Users)
Halaman yang diperuntukkan bagi Admin untuk memvalidasi dan memonitor data lengkap penghuni/Customer.

> **[TEMPATKAN SCREENSHOT HALAMAN USERS DI SINI]**
> *Gambar 4.12 - Tampilan Tabel Daftar Pengguna Sistem*
