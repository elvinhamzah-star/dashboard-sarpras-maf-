# Sarpras MAF Dashboard v3 — Design Spec
**Date:** 2026-06-26  
**Status:** Approved

---

## 1. Overview

Fresh rebuild dari nol. Bukan lanjutan codebase v2 — repo baru, project Vercel baru, tidak mengganggu yang sudah live.

**Tujuan:** Dashboard monitoring Sarpras MAF yang lebih modern, cinematic, dan informatif — dengan fitur week-over-week progress sebagai tambahan utama.

---

## 2. Tech Stack

| Layer | Pilihan |
|---|---|
| Framework | Next.js 15 (App Router) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Animasi | Framer Motion |
| Database | Supabase (project yang sama, client baru) |
| Deployment | Vercel (project baru, URL baru) |

---

## 3. Repo & Deployment

- **Repo baru** — terpisah dari `dashboard-sarpras-maf-v2`
- **Vercel project baru** — URL berbeda, tidak menyentuh domain existing
- Database Supabase yang dipakai **sama** (read dari tabel yang sudah ada)

---

## 4. Routing (URL-based, bukan state)

```
/              → Beranda (cinematic scroll)
/login         → Login
/pekerjaan     → Daftar pekerjaan
/pekerjaan/[id]→ Detail pekerjaan
/keuangan      → Keuangan
/galeri        → Galeri
/riwayat       → Riwayat laporan
```

Next.js Middleware redirect ke `/login` jika session cookie tidak ada.

---

## 5. Auth

- Login tetap pakai Supabase RPC `verify_login(username, password)`
- Session disimpan di **httpOnly cookie** (bukan sessionStorage seperti v2)
- Admin PIN tetap di memory (sama seperti v2, lewat RPC `verify_admin_pin`)
- Admin writes tetap lewat `admin_insert` / `admin_update` / `admin_delete` RPC

---

## 6. Visual Design System

### Filosofi
Monokromatik cinematic — terinspirasi dari referensi Figma parallax effect (dark mountain photography). Warna datang dari atmosfer dan fungsi, bukan dekorasi.

### Color Palette

| Token | Hex | Penggunaan |
|---|---|---|
| Background | `#080C12` | Root background |
| Surface | `#0D1520` | Card, table |
| Accent | `#4A8FD4` | CTA, border highlight, delta label |
| Text primary | `#DDEEFF` | Heading, angka penting |
| Text muted | `#4A6080` | Label, caption |
| Positive | `#4ADE80` | Delta naik, status Selesai |
| Negative | `#F87171` | Delta turun |
| Warning | `#FACC15` | Status On Hold |
| Info | `#60A5FA` | Status On Going |

### Typography

| Peran | Font | Weight | Keterangan |
|---|---|---|---|
| Display / Hero | Oswald | 700 | Uppercase, heading besar |
| Heading | Oswald | 600 | Uppercase, section title |
| Angka finansial | Inter | 600 | tabular-nums, tidak disingkat |
| Body | Inter | 400–500 | Konten umum |
| Label / Caption | Inter | 400 | Uppercase, letter-spacing |

### Aturan Angka Keuangan
- Format: `Rp1.400.000.000` (Rp menyatu, titik sebagai pemisah ribuan)
- Font: Inter 600, `font-variant-numeric: tabular-nums`
- Tidak disingkat (bukan `Rp1.4M`)

---

## 7. Navigation

Top bar sticky — transparan di atas Beranda hero, solid dark di halaman lain.

```
[SARPRAS MAF]  [Beranda] [Pekerjaan] [Keuangan] [Galeri] [Riwayat]  [Viewer/Admin]
```

Tidak ada sidebar. Mobile: hamburger → drawer.

---

## 8. Halaman per Halaman

### 8.1 Login (`/login`)

Split layout 50/50:
- **Kiri:** Atmospheric dark background (gradient + radial glow), judul besar "Dashboard Sarpras" (Oswald 700), tagline kecil
- **Kanan:** Dark solid `#07080D`, judul "Login" (Oswald, centered), form dengan input underline (bukan kotak), tombol "Masuk →"

Input style: underline-only, tidak ada border kotak. Minimalis.

---

### 8.2 Beranda (`/`) — Cinematic Scroll

4 section yang scroll ke bawah. Animasi masuk per section menggunakan Framer Motion (`viewport: { once: true }`).

**Section 1 — Hero**
- Full-height atmospheric (gradient dark navy + radial glow)
- Eyebrow: `MAF · Monitoring Sarpras · 2026`
- Judul besar: `DASHBOARD SARPRAS` (Oswald 700, 60px)
- Subtext: total program + penyerapan %
- Delta week-over-week langsung di bawah: `↑ Progress naik +3% vs minggu lalu`
- Scroll indicator di bawah

**Section 2 — Ringkasan Keuangan**
4 metric card: Total Anggaran, Total Realisasi, Penyerapan %, Sisa Anggaran.
Setiap card punya delta week-over-week (↑↓ atau `— tidak berubah`).
Card style: `border-top` accent biru, background surface.

**Section 3 — Progress Pekerjaan**
List progress bar per program On Going.
Kolom: nama, progress bar, % angka, delta WoW (↑↓).
Bar warna sesuai status (biru, kuning, merah).

**Section 4 — Status Program**
4 kotak count: On Going, Selesai, On Hold, Perencanaan.
Warna label sesuai status badge.

---

### 8.3 Pekerjaan (`/pekerjaan`)

Header: judul Oswald + tombol "Tambah Pekerjaan" (admin only).

Filter bar: tab Semua / On Going / Selesai / On Hold / Perencanaan dengan count badge + search input kanan.

Tabel kolom: ID · Nama Pekerjaan · Status · Progress (bar mini + %) · W-o-W · Anggaran · chevron →

Klik baris → `/pekerjaan/[id]`

Week-over-week: kolom W-o-W di tabel menunjukkan delta dari snapshot minggu lalu vs snapshot terbaru minggu ini.

---

### 8.4 Detail Pekerjaan (`/pekerjaan/[id]`)

Sama seperti v2: header card, 4 metric, progress bar, tab (Ringkasan, Dokumen, Sub Pekerjaan).

Tambahan v3: menampilkan grafik snapshot history (progress dari waktu ke waktu) sebagai mini line chart.

---

### 8.5 Keuangan (`/keuangan`)

Header + tombol "Tambah Transaksi" (admin only).

Month selector di atas (filter by bulan — kecuali Saldo Kas yang selalu all-time).

4 metric card: Saldo Kas · Dana Masuk · Dana Keluar · Keluar PBB.
Format angka: `Rp1.400.000.000` (Inter tabular, tidak disingkat).

Tabel transaksi: Tanggal · Jenis (badge) · Nominal · Nama Pekerjaan · Bukti (↗).

---

### 8.6 Galeri (`/galeri`)

Filter bar: tab fase (Semua / Kondisi Awal / Proses Pekerjaan / Kondisi Akhir) + search program (kanan).

Grid foto 4 kolom. Setiap card: thumbnail Google Drive, overlay gradient, nama pekerjaan + fase badge.

Klik foto → lightbox fullscreen (keyboard ← → + swipe).

---

### 8.7 Riwayat (`/riwayat`)

List laporan pekanan. Layout sederhana, card per laporan.

---

## 9. Fitur Baru: Week-over-Week

Data source: tabel `program_snapshots` (sudah ada di DB, append-only).

**Logic:**
1. Untuk setiap program, ambil snapshot terbaru **minggu ini** (7 hari terakhir)
2. Ambil snapshot terbaru **minggu lalu** (8–14 hari lalu)
3. Delta = progress_percent minggu ini − progress_percent minggu lalu
4. Jika tidak ada snapshot minggu lalu → tampilkan `—`

**Tampilan delta:**
- `↑ +5%` → warna `#4ADE80`
- `↓ −1%` → warna `#F87171`
- `— sama` → warna muted `#445566`
- `— belum ada data` → warna muted

**Muncul di:** Beranda hero (aggregate), Beranda section progress, tabel Pekerjaan (kolom W-o-W), metric card Beranda.

---

## 10. Data Fetching

- Halaman read-only → **Server Components** (Supabase client di server)
- Modal, form, mutasi → **Client Components**
- Admin writes → RPC `admin_insert` / `admin_update` / `admin_delete` (sama seperti v2)

---

## 11. Fitur yang Diport dari v2

- Semua halaman dan fitur yang sudah ada di v2
- Admin PIN mode (via RPC `verify_admin_pin`)
- Semua modal: Add/Edit Pekerjaan, Add/Edit Transaksi, Update Progress, Edit Catatan, Edit Dokumen, Add/Edit Galeri
- `app_config` toggle untuk show/hide riwayat transaksi
- Google Drive thumbnail/view URL helper
- Lightbox galeri (keyboard + swipe)

---

## 12. Yang Tidak Dibawa dari v2

- Codebase lama (clean slate)
- `sessionStorage` untuk auth (diganti httpOnly cookie)
- Sidebar navigation (diganti top bar)
- State-based routing (diganti URL routing)
- CSS manual (diganti Tailwind)
- Neon cyan `#00C8FF` design system

---

## 13. Out of Scope (v3)

- Presentation mode
- Google Slides export
- Executive Beranda (deadline alert, vendor summary)
- Monthly filter (bisa ditambah setelah v3 selesai)
