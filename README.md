# HematNo 💰

**HematNo** adalah aplikasi pencatat keuangan berbasis web (*Progressive Web App* / PWA) yang dirancang khusus untuk siswa SMK dalam mengelola uang saku, alokasi anggaran, dan biaya operasional harian selama masa Praktik Kerja Lapangan (PKL). 

Aplikasi ini bekerja **100% Offline** menggunakan **LocalStorage** untuk penyimpanan data dan **Service Worker** untuk caching aset, sehingga tidak memerlukan backend server maupun koneksi internet setelah di-install.

---

## 🚀 Fitur Utama

- **PWA & Akses 100% Offline**: Dapat di-install ke layar utama (*Add to Home Screen*) di Android dan iOS. Berjalan lancar tanpa jaringan seluler atau WiFi.
- **Pencatatan Transaksi Cepat**: Input pemasukan dan pengeluaran dengan kategori khusus anak PKL (Uang Saku, Transportasi, Makan Siang, Print/ATK, Kost, dan Lain-lain).
- **Sistem Batas Pengeluaran (Limit System)**:
  - Batas maksimal pengeluaran harian, mingguan, dan bulanan.
  - Visualisasi alokasi anggaran dengan *Progress Bar*.
  - Indikator peringatan otomatis saat anggaran mencapai 80% dan status *overbudget*.
- **Filter View Navigasi**:
  - **Harian**: Sisa limit hari ini dan rincian transaksi harian.
  - **Mingguan**: Rekapitulasi dan statistik pengeluaran per hari.
  - **Bulanan**: Total alokasi anggaran vs total pengeluaran dan estimasi tabungan.
- **Penyimpanan Lokal & Backup Data**:
  - **LocalStorage**: Data tersimpan penuh di dalam browser HP/perangkat pengguna.
  - **Export JSON**: Cadangkan catatan transaksi dan konfigurasi limit ke file `.json`.
  - **Import JSON**: Pulihkan data dari file pencadangan tanpa takut kehilangan riwayat.

---

## 🛠️ Stack Teknologi

- **HTML5**: Struktur halaman semantik.
- **Tailwind CSS**: Styling UI modern, responsif, dan *mobile-first*.
- **Vanilla JavaScript (ES6+)**: Logika transaksi, kalkulasi limit, dan manipulasi DOM.
- **Service Worker & Web App Manifest**: PWA *Cache-First strategy* dan instalabilitas *native-like*.
- **Lucide Icons / Heroicons**: Ikon SVG bersih.

---

## 📁 Struktur Proyek

```text
hematno/
├── index.html     # Layout UI utama & komponen HTML
├── style.css      # Kustomisasi CSS & utility Tailwind
├── app.js         # Logika aplikasi, LocalStorage, Export/Import, & Registrasi SW
├── manifest.json  # Konfigurasi PWA (Icon, Name, Display Mode)
├── sw.js          # Service Worker (Cache-First offline strategy)
└── README.md      # Dokumentasi proyek

