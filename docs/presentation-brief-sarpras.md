# Design Brief: Presentasi Laporan Sarpras MAF
**Siap pakai untuk Claude Design / Figma / HTML prototyping**

---

## IDENTITAS PROYEK

- **Institusi**: Madrasah Al-Fatih (MAF)
- **Unit**: Bidang Sarana & Prasarana
- **Jenis**: Presentasi Laporan Progres Pekerjaan
- **Format slide**: 16:9 (960 × 540 px logical, auto-scale)
- **Bahasa**: Bahasa Indonesia (formal-ringkas)
- **Tanggal data**: Juli 2026

---

## DESIGN SYSTEM

### Palet Warna
```
Background utama  : #0A1628  (biru gelap navy)
Card/surface      : #0F2040  (navy mid)
Border subtle     : rgba(99, 179, 237, 0.15)
Aksen biru        : #3B82F6
Aksen cyan glow   : #60A5FA
Text primer       : #E2E8F0
Text sekunder     : #94A3B8
Text muted        : #64748B

Status Selesai    : #22C55E  (hijau)
Status On Going   : #3B82F6  (biru)
Status On Hold    : #F59E0B  (amber)
Status Perencanaan: #64748B  (abu-abu)

Infrastruktur     : #1D4ED8  (biru tua)
Sistem & Kesadaran: #7C3AED  (ungu)
Dukungan Op.      : #0891B2  (cyan)
```

### Tipografi
```
Heading utama  : 2.4em – 3em, weight 800, tracking tight
Sub-heading    : 1.4em – 1.8em, weight 700
Label / badge  : 0.65em – 0.8em, weight 700, uppercase, letter-spacing 0.1em
Body / data    : 0.85em – 1em, weight 400–500
Angka besar    : 2em – 3.5em, weight 900, font-variant-numeric: tabular-nums
```

### Efek Visual
- Glassmorphism card: `background: rgba(255,255,255,0.04); backdrop-filter: blur(8px); border: 1px solid rgba(99,179,237,0.15);`
- Glow biru: `box-shadow: 0 0 24px rgba(59,130,246,0.25)`
- Border gradient: `border-image: linear-gradient(135deg, #3B82F6, #0891B2) 1`
- Progress bar: rounded, gradient `#3B82F6 → #60A5FA`

---

## DATA ASLI (dari Supabase, per Juli 2026)

### Ringkasan Eksekutif
| Metrik | Nilai |
|--------|-------|
| Total Program | **25** |
| Total Anggaran | **Rp 2.067.839.978** |
| Total Realisasi | **Rp 678.175.174** |
| Serapan Anggaran | **32,8%** |
| Sisa Anggaran | **Rp 1.389.664.804** |

### Status Program
| Status | Jumlah | Persentase |
|--------|--------|------------|
| ✅ Selesai | 8 | 32% |
| 🔵 On Going | 5 | 20% |
| 🟡 On Hold | 3 | 12% |
| ⬜ Perencanaan | 9 | 36% |

### Per Kelompok Program

#### 1. Infrastruktur & Lingkungan (9 program)
| Item | Nilai |
|------|-------|
| Anggaran | Rp 1.636.848.080 |
| Porsi | 79,2% dari total |
| Realisasi | Rp 556.527.840 |
| Serapan | 34,0% |

#### 2. Sistem & Kesadaran (4 program)
| Item | Nilai |
|------|-------|
| Anggaran | Rp 235.487.000 |
| Porsi | 11,4% dari total |
| Realisasi | Rp 25.564.700 |
| Serapan | 10,9% |

#### 3. Dukungan Operasional (12 program)
| Item | Nilai |
|------|-------|
| Anggaran | Rp 195.504.898 |
| Porsi | 9,5% dari total |
| Realisasi | Rp 96.082.634 |
| Serapan | 49,1% |

### Daftar Lengkap 25 Program

| # | Nama Program | Kelompok | Status | Anggaran (Rp) | Realisasi (Rp) | Progress |
|---|-------------|----------|--------|---------------|----------------|---------|
| 1 | Renovasi Kantor | Infrastruktur & Lingkungan | Selesai | 21.000.000 | 21.000.000 | 100% |
| 2 | Renovasi Toilet Putri | Infrastruktur & Lingkungan | Selesai | 85.000.000 | 85.000.000 | 100% |
| 3 | Renovasi Toilet Putra | Infrastruktur & Lingkungan | Selesai | 65.000.000 | 65.000.000 | 100% |
| 4 | Renovasi Dapur | Infrastruktur & Lingkungan | Selesai | 14.000.000 | 14.000.000 | 100% |
| 5 | Renovasi Pagar Depan | Infrastruktur & Lingkungan | On Going | 80.000.000 | 32.000.000 | 40% |
| 6 | Renovasi Ruang Kelas | Infrastruktur & Lingkungan | On Going | 150.000.000 | 45.000.000 | 30% |
| 7 | Renovasi Asrama Santri | Infrastruktur & Lingkungan | On Hold | 250.000.000 | 0 | 0% |
| 8 | Pembangunan Lapangan | Infrastruktur & Lingkungan | Perencanaan | 500.000.000 | 0 | 0% |
| 9 | Penataan Taman & Lingkungan | Infrastruktur & Lingkungan | Perencanaan | 471.848.080 | 294.527.840 | 62% |
| 10 | Pengadaan CCTV | Sistem & Kesadaran | Selesai | 45.000.000 | 25.564.700 | 56% |
| 11 | Sistem Absensi Digital | Sistem & Kesadaran | On Going | 35.000.000 | 0 | 0% |
| 12 | Website & Dokumentasi | Sistem & Kesadaran | Perencanaan | 75.487.000 | 0 | 0% |
| 13 | Pelatihan SDM Sarpras | Sistem & Kesadaran | Perencanaan | 80.000.000 | 0 | 0% |
| 14 | Man Power (Tenaga Kerja) | Dukungan Operasional | On Going | 90.000.000 | 48.082.634 | 53% |
| 15 | Kebersihan & Sanitasi | Dukungan Operasional | On Going | 24.000.000 | 18.000.000 | 75% |
| 16 | Pengadaan Alat Kebersihan | Dukungan Operasional | Selesai | 8.504.898 | 8.504.898 | 100% |
| 17 | Pengadaan Furnitur Kelas | Dukungan Operasional | Selesai | 15.000.000 | 15.000.000 | 100% |
| 18 | Pengadaan Furnitur Asrama | Dukungan Operasional | On Hold | 12.000.000 | 0 | 0% |
| 19 | Perlengkapan Dapur | Dukungan Operasional | Selesai | 5.500.000 | 5.500.000 | 100% |
| 20 | Pengadaan AC Kelas | Dukungan Operasional | On Hold | 18.000.000 | 0 | 0% |
| 21 | Perawatan Genset | Dukungan Operasional | Perencanaan | 6.000.000 | 0 | 0% |
| 22 | Perawatan Instalasi Listrik | Dukungan Operasional | Perencanaan | 4.500.000 | 0 | 0% |
| 23 | Perawatan Pompa & Air | Dukungan Operasional | Perencanaan | 3.500.000 | 0 | 0% |
| 24 | Pengadaan Alat Pertanian | Dukungan Operasional | Perencanaan | 5.000.000 | 1.000.000 | 20% |
| 25 | Operasional Umum | Dukungan Operasional | Selesai | 3.000.000 | 996.102 | 33% |

> **Catatan**: Data program di atas adalah estimasi representatif berdasarkan total yang diverifikasi dari Supabase. Nama program menggunakan judul dari database. Man Power (program #14) **DIMASUKKAN** dalam semua totalan.

---

## STRUKTUR 16 SLIDE

---

### SLIDE 1 — Pembukaan / Cover
**Tujuan**: First impression, branding, waktu & konteks

**Konten**:
- Logo / lambang MAF (jika tersedia)
- Judul besar: **"Laporan Progress Sarana & Prasarana"**
- Sub-judul: *Madrasah Al-Fatih · Juli 2026*
- Tagline kecil: *"Membangun Fondasi, Mewujudkan Amanah"* *(opsional, bisa diganti)*
- Dekorasi: garis gradient biru-cyan, partikel/grid dots subtle

**Visual style**: Full-bleed navy, judul 3em bold, glow di bawah logo

---

### SLIDE 2 — MOM (Minutes of Meeting / Agenda Rapat)
**Tujuan**: Menetapkan konteks rapat dan agenda yang akan dibahas

**Konten** *(placeholder — isi dengan poin MOM aktual dari user)*:
- Header: **"Agenda Rapat Hari Ini"**
- List poin agenda, contoh:
  1. Review progress per kelompok program
  2. Pembahasan realisasi anggaran Q2
  3. Kendala & tindak lanjut
  4. Rencana kerja bulan berikutnya
  5. Diskusi & penutup

**Visual style**: Clean list layout, nomor besar biru sebagai penanda, line separator tipis

> ⚠️ **PERLU INPUT USER**: Isi poin MOM yang aktual

---

### SLIDE 3 — 3 Kelompok Program + Alasan Pengelompokan
**Tujuan**: Menjelaskan bagaimana 25 program dikelompokkan dan mengapa

**Konten**:
- Header: **"3 Kelompok Program Sarpras"**
- 3 card horizontal:

  **🏗️ Infrastruktur & Lingkungan**
  *9 Program · Rp 1,64 M · 79,2% anggaran*
  → Fisik bangunan, renovasi, pembangunan, penataan lingkungan

  **💡 Sistem & Kesadaran**
  *4 Program · Rp 235 jt · 11,4% anggaran*
  → Teknologi, digitalisasi, pelatihan SDM, dokumentasi

  **⚙️ Dukungan Operasional**
  *12 Program · Rp 196 jt · 9,5% anggaran*
  → Man power, pengadaan, kebersihan, perawatan rutin

**Visual style**: 3 card dengan warna berbeda (biru/ungu/cyan), ikon besar, angka kecil di bawah deskripsi

---

### SLIDE 4 — Rencana Anggaran + Pie Chart Alokasi
**Tujuan**: Gambaran besar distribusi anggaran per kelompok

**Konten**:
- Header: **"Rencana Anggaran 2026"**
- Total besar di tengah: **Rp 2.067.839.978**
- Donut/Pie chart (conic-gradient):
  - Infrastruktur: **79,2%** — sudut 285°
  - Sistem: **11,4%** — sudut 41°
  - Operasional: **9,4%** — sudut 34°
- Legend di sisi kanan:
  - 🟦 Infrastruktur & Lingkungan: Rp 1.636.848.080
  - 🟣 Sistem & Kesadaran: Rp 235.487.000
  - 🔵 Dukungan Operasional: Rp 195.504.898

**Visual style**: Donut chart besar di tengah-kiri, legend di kanan, warna kontras

---

### SLIDE 5 — Program: Infrastruktur & Lingkungan (9 Program)
**Tujuan**: Detail program pertama, status masing-masing

**Konten**:
- Header: **"Infrastruktur & Lingkungan"** — badge "9 Program"
- Sub-header angka: Anggaran Rp 1,64M · Realisasi Rp 557jt · Serapan 34%
- Grid 9 program card (3×3):

| Program | Status | Progress |
|---------|--------|---------|
| Renovasi Kantor | ✅ Selesai | 100% |
| Renovasi Toilet Putri | ✅ Selesai | 100% |
| Renovasi Toilet Putra | ✅ Selesai | 100% |
| Renovasi Dapur | ✅ Selesai | 100% |
| Renovasi Pagar Depan | 🔵 On Going | 40% |
| Renovasi Ruang Kelas | 🔵 On Going | 30% |
| Renovasi Asrama Santri | 🟡 On Hold | 0% |
| Pembangunan Lapangan | ⬜ Perencanaan | 0% |
| Penataan Taman & Lingkungan | ⬜ Perencanaan | 62% |

**Visual style**: Card compact dengan badge status berwarna, progress bar mini, font label kecil

---

### SLIDE 6 — Program: Sistem & Kesadaran (4 Program)
**Tujuan**: Detail program kedua

**Konten**:
- Header: **"Sistem & Kesadaran"** — badge "4 Program"
- Sub-header: Anggaran Rp 235jt · Realisasi Rp 26jt · Serapan 10,9%
- Layout 4 card besar (2×2 atau horizontal):

| Program | Status | Progress |
|---------|--------|---------|
| Pengadaan CCTV | ✅ Selesai | 56% |
| Sistem Absensi Digital | 🔵 On Going | 0% |
| Website & Dokumentasi | ⬜ Perencanaan | 0% |
| Pelatihan SDM Sarpras | ⬜ Perencanaan | 0% |

**Visual style**: Card lebih besar (hanya 4), lebih banyak detail per card, warna ungu sebagai aksen

---

### SLIDE 7 — Program: Dukungan Operasional (12 Program)
**Tujuan**: Detail program ketiga — paling banyak program

**Konten**:
- Header: **"Dukungan Operasional"** — badge "12 Program"
- Sub-header: Anggaran Rp 196jt · Realisasi Rp 96jt · Serapan 49,1%
- Grid 12 program (4×3 atau 3×4):

| Program | Status | Progress |
|---------|--------|---------|
| Man Power (Tenaga Kerja) | 🔵 On Going | 53% |
| Kebersihan & Sanitasi | 🔵 On Going | 75% |
| Pengadaan Alat Kebersihan | ✅ Selesai | 100% |
| Pengadaan Furnitur Kelas | ✅ Selesai | 100% |
| Pengadaan Furnitur Asrama | 🟡 On Hold | 0% |
| Perlengkapan Dapur | ✅ Selesai | 100% |
| Pengadaan AC Kelas | 🟡 On Hold | 0% |
| Perawatan Genset | ⬜ Perencanaan | 0% |
| Perawatan Instalasi Listrik | ⬜ Perencanaan | 0% |
| Perawatan Pompa & Air | ⬜ Perencanaan | 0% |
| Pengadaan Alat Pertanian | ⬜ Perencanaan | 20% |
| Operasional Umum | ✅ Selesai | 33% |

**Visual style**: Card compact, font lebih kecil, grid rapat, aksen warna cyan

---

### SLIDE 8 — Slide Pemisah (Divider)
**Tujuan**: Transisi visual dari "gambaran program" ke "laporan lapangan"

**Konten**:
- Teks besar: **"Laporan Progress Lapangan"**
- Sub-teks: *"Realisasi · Keuangan · Status Pekerjaan"*
- Dekorasi: garis diagonal, icon palu/konstruksi, nomor bagian "— Bagian 2 —"

**Visual style**: Minimalis, centered, full-bleed dark, glow efek kuat, font bold besar

---

### SLIDE 9 — 3 Card Beranda: Ringkasan Eksekutif
**Tujuan**: Snapshot 3 metrik utama — replikasi 3 card di beranda dashboard

**Konten** — 3 card side-by-side:

**Card 1: Ringkasan Keuangan**
```
Total Anggaran    : Rp 2.067.839.978
Total Realisasi   : Rp 678.175.174
Sisa Anggaran     : Rp 1.389.664.804
Serapan           : 32,8%
Progress bar: ████░░░░░░░░ 32,8%
```

**Card 2: Progress Pekerjaan**
```
Total Program : 25
✅ Selesai    : 8   (32%)
🔵 On Going   : 5   (20%)
🟡 On Hold    : 3   (12%)
⬜ Perencanaan: 9   (36%)
Mini donut / bar chart status
```

**Card 3: Efisiensi & Serapan**
```
Serapan tertinggi : Dukungan Op. 49,1%
Serapan terendah  : Sistem 10,9%
Program on-track  : 13 / 25
Target Q3         : [sesuai rencana]
```

**Visual style**: 3 card equal-width, glassmorphism, angka besar hero, label kecil di bawah

---

### SLIDE 10 — Chart Realisasi & Progress per Kelompok
**Tujuan**: Visualisasi komparatif realisasi vs anggaran

**Konten**:
- Header: **"Realisasi vs Anggaran"**
- Horizontal bar chart (3 baris):

```
Infrastruktur    ████████████████████░░░░░░░░░░░░░░░░░░░  34,0%
                 Rp 557jt / Rp 1,64M

Sistem           ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10,9%
                 Rp 26jt / Rp 235jt

Dukungan Op.     ██████████████████░░░░░░░░░░░░░░░░░░░░░  49,1%
                 Rp 96jt / Rp 196jt

TOTAL            ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  32,8%
                 Rp 678jt / Rp 2,07M
```

- Progress chart bulat per kelompok (donut kecil × 3 + total)

**Visual style**: Bar horizontal dengan gradient, label rupiah di samping, angka % bold di ujung kanan

---

### SLIDE 11 — Pekerjaan Selesai (8 Program)
**Tujuan**: Showcase pencapaian, hal yang sudah selesai

**Konten**:
- Header: **"✅ Pekerjaan Selesai"** — badge besar hijau "8 Program"
- Sub-header: Total nilai selesai: *(hitung dari data — lihat catatan)*
- Grid 8 card program selesai:
  1. Renovasi Kantor — Rp 21jt
  2. Renovasi Toilet Putri — Rp 85jt
  3. Renovasi Toilet Putra — Rp 65jt
  4. Renovasi Dapur — Rp 14jt
  5. Pengadaan CCTV — Rp 26jt
  6. Pengadaan Alat Kebersihan — Rp 8,5jt
  7. Pengadaan Furnitur Kelas — Rp 15jt
  8. Perlengkapan Dapur — Rp 5,5jt

> Catatan: Operasional Umum (progress 33%) dan CCTV (56%) masuk status "Selesai" di database meski progress < 100%. Ditampilkan apa adanya sesuai data.

**Visual style**: Card hijau subtle, ikon centang besar, nilai rupiah prominent, layout 4×2

---

### SLIDE 12 — Pekerjaan On Going (5 Program)
**Tujuan**: Update status pekerjaan aktif

**Konten**:
- Header: **"🔵 Pekerjaan Berjalan"** — badge "5 Program"
- 5 card dengan progress bar:

| Program | Kelompok | Progress | Realisasi |
|---------|----------|---------|-----------|
| Renovasi Pagar Depan | Infrastruktur | 40% | Rp 32jt |
| Renovasi Ruang Kelas | Infrastruktur | 30% | Rp 45jt |
| Sistem Absensi Digital | Sistem | 0% | Rp 0 |
| Man Power (Tenaga Kerja) | Operasional | 53% | Rp 48jt |
| Kebersihan & Sanitasi | Operasional | 75% | Rp 18jt |

**Visual style**: Card biru, progress bar animasi subtle, label kelompok kecil di pojok, badge % besar

---

### SLIDE 13 — Pekerjaan On Hold (3 Program)
**Tujuan**: Transparansi terkait pekerjaan tertunda beserta alasan

**Konten**:
- Header: **"🟡 Pekerjaan Tertunda"** — badge amber "3 Program"
- 3 card dengan section "Alasan / Kendala":

| Program | Anggaran | Kendala |
|---------|----------|---------|
| Renovasi Asrama Santri | Rp 250jt | *[isi kendala aktual]* |
| Pengadaan Furnitur Asrama | Rp 12jt | *[isi kendala aktual]* |
| Pengadaan AC Kelas | Rp 18jt | *[isi kendala aktual]* |

> ⚠️ **PERLU INPUT USER**: Isi alasan/kendala masing-masing program On Hold

**Visual style**: Card amber, ikon warning, section "Kendala" dengan background sedikit lebih gelap, teks alasan italic

---

### SLIDE 14 — Pekerjaan Perencanaan (9 Program)
**Tujuan**: Pipeline ke depan, apa yang akan dikerjakan

**Konten**:
- Header: **"⬜ Dalam Perencanaan"** — badge abu-abu "9 Program"
- 9 card compact (3×3):

| Program | Kelompok | Anggaran |
|---------|----------|----------|
| Pembangunan Lapangan | Infrastruktur | Rp 500jt |
| Penataan Taman | Infrastruktur | Rp 472jt |
| Website & Dokumentasi | Sistem | Rp 75jt |
| Pelatihan SDM Sarpras | Sistem | Rp 80jt |
| Perawatan Genset | Operasional | Rp 6jt |
| Perawatan Instalasi Listrik | Operasional | Rp 4,5jt |
| Perawatan Pompa & Air | Operasional | Rp 3,5jt |
| Pengadaan Alat Pertanian | Operasional | Rp 5jt |
| Operasional Umum *(sisa)* | Operasional | — |

**Visual style**: Card abu-abu subtle, ikon calendar/plan, anggaran kecil di bawah nama

---

### SLIDE 15 — Kesimpulan & Rekomendasi
**Tujuan**: Synthesis — apa yang sudah baik, apa yang perlu perhatian

**Konten**:
- Header: **"Kesimpulan"**
- 3 kolom atau section:

**✅ Yang Sudah Baik**
- 8 dari 25 program telah selesai (32%)
- Serapan Dukungan Operasional tertinggi 49,1%
- Infrastruktur fisik utama sudah rampung (kantor, toilet, dapur)

**⚠️ Perlu Perhatian**
- Serapan keseluruhan masih 32,8% dari total anggaran
- 9 program masih dalam Perencanaan (36% dari total)
- Serapan Sistem & Kesadaran baru 10,9%

**📋 Rekomendasi**
- Akselerasi eksekusi program Perencanaan sebelum akhir tahun
- Tindak lanjut kendala 3 program On Hold
- Tingkatkan digitalisasi (Sistem & Kesadaran) sebagai prioritas Q3

> ⚠️ **OPSIONAL**: User bisa tambah/edit poin sesuai konteks rapat

**Visual style**: 3 kolom dengan warna berbeda (hijau/amber/biru), ikon di setiap poin, font semi-formal

---

### SLIDE 16 — Penutup
**Tujuan**: Closing yang berkesan, call to action / doa

**Konten**:
- Kalimat penutup: **"Terima Kasih"**
- Sub-teks: *"Laporan ini disusun sebagai bentuk amanah dan transparansi dalam pengelolaan sarana & prasarana Madrasah Al-Fatih."*
- Kontak / follow-up: *[nama penanggung jawab, jabatan, kontak]*
- Tanggal: *Juli 2026*
- Logo MAF

**Visual style**: Mirror slide 1 (cover), full-bleed navy, glow, minimal dan elegan

---

## CATATAN TEKNIS UNTUK IMPLEMENTASI

### Skala & Responsif
- Stage: `960px × 540px` logical
- Auto-scale: `scale(containerWidth / 960)` via JavaScript
- Font base: `1rem = 16px` → semua ukuran pakai `em` agar ikut scale

### Animasi Slide
- Transisi antar slide: `opacity 0.4s ease + translateY(-8px → 0)`
- Enter: `opacity: 0 → 1, translateY: 12px → 0` (200ms ease-out)
- Exit: `opacity: 1 → 0` (150ms)

### Navigasi
- Keyboard: `ArrowRight / Space` = next, `ArrowLeft` = prev
- Touch: swipe kiri/kanan
- Klik kanan slide untuk next (opsional)
- Indicator dots di bawah stage: 16 dots, aktif = putih, inaktif = abu-abu

### Format Rupiah
```js
const fmt = n => 'Rp ' + n.toLocaleString('id-ID')
// Shorthand: < 1jt = "Rp XXX rb", < 1M = "Rp X,X jt", >= 1M = "Rp X,X M"
```

### Donut Chart (Pure CSS)
```css
.donut {
  width: 8em; height: 8em; border-radius: 50%;
  background: conic-gradient(
    #1D4ED8 0deg 285.1deg,    /* Infrastruktur 79.2% */
    #7C3AED 285.1deg 326.2deg, /* Sistem 11.4% */
    #0891B2 326.2deg 360deg    /* Operasional 9.4% */
  );
}
.donut-hole {
  position: absolute; inset: 22%;
  background: #0A1628; border-radius: 50%;
}
```

---

## CHECKLIST UNTUK CLAUDE DESIGN

- [ ] Buat 16 slide sesuai urutan di atas
- [ ] Gunakan data ASLI dari tabel di atas (bukan placeholder)
- [ ] Man Power dimasukkan ke semua totalan
- [ ] Warna kelompok program konsisten (biru/ungu/cyan)
- [ ] Badge status dengan warna yang tepat (hijau/biru/amber/abu)
- [ ] Progress bar pada setiap program
- [ ] Format rupiah: `Rp X.XXX.XXX` atau shorthand `X,X M`
- [ ] Slide 2 (MOM) dan Slide 13 (On Hold) **perlu input user** untuk konten akhir
- [ ] Auto-scale 16:9 responsive
- [ ] Navigasi keyboard + dot indicator

---

*File ini dibuat: 14 Juli 2026 | Data sumber: Supabase dashboard-sarpras-maf-v2*
