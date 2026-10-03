# 🐟 BettaCare - Petunjuk Menjalankan di Expo Go (Android)

Aplikasi klasifikasi kesehatan ikan cupang berbasis React Native (Expo) dan backend FastAPI (TensorFlow AI).

---

## 📋 Prasyarat

1. **HP Android** sudah terinstall aplikasi **Expo Go** dari Google Play Store.
2. **Laptop dan HP Android** berada dalam **jaringan Wi-Fi yang sama**.
3. **Backend Docker** aktif (status: container `betta-backend` berjalan di port `8000`).

---

## 🚀 Langkah Cepat Menjalankan Aplikasi

### 1. Pastikan Backend Aktif
Backend berjalan di Docker container `betta-backend`.
```bash
# Cek status container
docker ps

# Jika container belum berjalan:
docker compose up -d
```
Tes kesehatan backend melalui browser atau curl:
`http://localhost:8000/health`

---

### 2. Jalankan Expo Metro Bundler

Dari root folder atau folder `app/`:

```bash
# Menjalankan Expo dengan mode LAN (Rekomendasi untuk Expo Go di Wi-Fi):
npm run start:lan
```
> **Catatan Windows/WSL:** Laptop memiliki adaptor virtual WSL/Hyper-V (`172.19.x.x`). Menggunakan `npm run start:lan` memastikan Expo membagikan IP Wi-Fi asli laptop (`10.104.175.68`) agar HP dapat terhubung.

Jika Wi-Fi Anda memiliki *Client Isolation* (misalnya Wi-Fi kampus, kantor, kafe):
```bash
npm run start:tunnel
```

---

### 3. Buka di Expo Go (Android)

1. Di terminal akan muncul **QR Code**.
2. Buka aplikasi **Expo Go** di Android.
3. Pilih **Scan QR Code** dan arahkan kamera ke QR Code di layar laptop.
4. Bundler akan memuat JavaScript ke HP Anda dan aplikasi BettaCare siap digunakan!

---

## ⚙️ Konfigurasi Environment (`.env`)

File konfigurasi berada di `app/.env`:
```env
EXPO_PUBLIC_API_URL=http://10.104.175.68:8000
```

> 💡 **Penting:** Jika laptop Anda berganti jaringan Wi-Fi, periksa IP baru laptop dengan perintah:
> ```powershell
> ipconfig
> ```
> Cari bagian **Wireless LAN adapter Wi-Fi** -> **IPv4 Address**, lalu perbarui nilai `EXPO_PUBLIC_API_URL` di `app/.env`.

---

## 🛠️ Perintah Tambahan

- `npm run doctor` : Menjalankan validasi kesehatan dependensi Expo (`expo-doctor`).
- `npm test` : Menjalankan unit test Jest.
- `npm run start:clear` : Menjalankan Expo dengan membersihkan cache Metro.
