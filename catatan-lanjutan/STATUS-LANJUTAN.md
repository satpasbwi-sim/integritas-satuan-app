# Status & pekerjaan lanjutan – Aplikasi CW Pagi / Ceklok Satpas

Dibuat 24 Okt 2026. Simpan di folder proyek supaya sesi berikutnya (akun Claude / email lain) bisa melanjutkan.
Tidak berisi kata sandi atau kode rahasia.

## Cara melanjutkan di akun / sesi baru
1. Buka folder `C:\Users\LENOVO\Downloads\cw-pagi-app` di Claude Code (Desktop).
2. Tulis: "Baca catatan-lanjutan/STATUS-LANJUTAN.md lalu lanjutkan bagian BELUM DIKERJAKAN yang saya pilih."
3. Browser panel Claude harus login Google **satpasbwi@gmail.com** (akun pemilik Apps Script / spreadsheet). Akun Claude boleh berbeda;
   yang menentukan akses adalah login Google di browser panel, bukan email Claude.
4. Memori sesi lama ada di `C:\Users\LENOVO\.claude\projects\C--Users-LENOVO-Downloads-cw-pagi-app\memory\` (bisa tidak ikut bila
   akun berganti; isi pokoknya sudah diringkas di sini).

## Tautan penting
- Apps Script, spreadsheet CW Pagi'26, dan Absensi Satpas'26: lihat `catatan-lanjutan/TAUTAN-LOKAL.md` (hanya di laptop, tidak
  di-push ke GitHub karena repo publik dan spreadsheet berisi data anggota). Bila file itu tidak ada: buka Google Drive akun
  satpasbwi@gmail.com, atau Apps Script → Ekstensi dari spreadsheet CW Pagi'26.
- Aplikasi anggota: https://satpasbwi-sim.github.io/integritas-satuan-app/ (repo satpasbwi-sim/integritas-satuan-app, cabang main)
- Rincian teknis lengkap: `README.md` (bagian "Mode resmi bertahap per NRP", "CW Pagi hanya Senin–Jumat", "Bonus konsistensi & pengingat")

## Sudah selesai & aktif (per 24 Okt 2026)
| Hal | Keterangan | Posisi |
| --- | --- | --- |
| Mode resmi per NRP | Mulai **26/10/2026** hanya NRP/kode di `NRP_RESMI` (ModeResmi.gs) yang resmi; lainnya tetap uji coba (reset ±19.00). Data sebelum 26/10 dihapus semua. | Server |
| CW Pagi Senin–Jumat | Mulai 26/10 Sabtu/Minggu tidak ada Lapor CW dan tidak dinilai; Ceklok Satpas tetap Senin–Sabtu. | Server + aplikasi |
| Bonus konsistensi | Mingguan/bulanan, ≥5 hari dinilai & ≥90% hari sempurna → +2 skor (maks 100, tidak bila ⚠️ PALSU). | Server |
| Pengingat | Banner + notifikasi (bila diizinkan) untuk Lapor Datang/Selesai & Ceklok Masuk/Pulang; hanya saat aplikasi terbuka/di latar belakang. | Aplikasi |
| Sheet PANDUAN | Ditulis ulang lewat `Panduan.gs` (fungsi `perbaruiPanduan`). Diperbarui 24 Okt 2026 malam untuk hari pertama resmi: jam Lapor Datang (06.15 / 06.30 / 07.15), PERSETUJUAN harian sebelum 15.00, verifikasi ⚠️ sebelum ±07.30 (bukti lemah otomatis ASLI), CEK FOTO, foto 3 hari, LUAR RADIUS, laporan tertunda ≤20 mnt, bagian mode resmi dibalik, tab Pembinaan, Ganti Bulan sebelum 06.00 (juga teks 🩺 Cek di Kode.gs; tanpa deploy baru). | Spreadsheet |
| Deploy server | **Versi 63** (26 Okt 2026, 16.22; laporan tertunda ditandai ⚠️ untuk diputuskan atasan: `teksTunda_` di Code.gs + Panduan.gs). Versi 62 (16.13; bonus lembur perlu SETUJU atasan mulai 27/10 + luar radius Ceklok tidak dihitung sesudah jam pulang: Code.gs, Persetujuan.gs, LuarRadius.gs, Pantauan.gs, Panduan.gs). Versi 61 (15.32; mulai 27/10 Ceklok Masuk terlambat juga memotong nilai Ceklok Satpas hari itu: `TGL_TELAT_CEKLOK` di Code.gs + Panduan.gs). Versi 60 (14.38; Rekap Admin tidak bisa mengosongkan H hasil Lapor Selesai + `pulihkanAbsensiDariLog` di Keputusan.gs). Versi 59 (13.42; Pantauan hanya NRP resmi + Polri/PHL, simpan 1x Rekap Admin → ASLI: Pantauan.gs + Keputusan.gs + Code.gs). Versi 58 (07.37; riwayat 7 hari Nilai Saya: `riwayatSaya_` + `ujiRiwayat` di NilaiAplikasi.gs). Versi 57 (06.19; keputusan atasan 1-ketuk: `Keputusan.gs` + Pantauan.gs + 1 baris doPost). Versi 56 (05.50; B4 alasan potongan per kejadian: `Kejadian.gs` + Code.gs / PenilaianCw.gs / NilaiAplikasi.gs). Versi 55 (24 Okt 2026, 21.12; Pantauan pengawas & admin: `Pantauan.gs` + `action=pantauan` dan tanda `pantauan: true` untuk pengawas/admin di Kode.gs). Versi 54 (20.36; Peringatan dini pembinaan: `Pembinaan.gs` + `action=pembinaan` dan tanda `pembinaan: true` untuk pengawas/admin di Kode.gs). Versi 53 (14.49): CEK FOTO TIDAK SESUAI −30. Versi 52 (14.10): perbaikan baris ABSENSI tanpa NRP ("Pos 12.04 …", "Patwal R4", "3 Pers Laka") tetap diperlakukan uji coba, dan INTEGRITAS HARIAN menulis "Uji coba – data sudah direset" untuk anggota uji coba. | Apps Script |
| Aplikasi (GitHub Pages) | Commit `76fba4d`, cache service worker `cw-pagi-v39`. | GitHub |

## BELUM DIKERJAKAN / BELUM DIUJI
### Dipilih untuk dikerjakan
- [x] Peringatan dini pembinaan (skor mingguan turun 2 minggu berturut-turut, tab Pembinaan untuk pengawas/admin):
  server terpasang di Apps Script **Versi 54** (24 Okt 2026); `ujiPembinaan` jalan (daftar masih kosong).
  - [ ] Gabungkan PR #1 (`web/`, cache `cw-pagi-v45`) ke `main` setelah disetujui pemilik, lalu cek: pengawas/admin
    melihat tombol **Pembinaan**, anggota biasa tidak.
- [x] Pantauan pengawas & admin (tab **Pantauan**: Hari ini · Mencurigakan · Persetujuan), rancangan di
  `catatan-lanjutan/PANTAUAN-PENGAWAS.md`. Server terpasang **Versi 55** (24 Okt 2026); `ujiPantauan` jalan.
  - [ ] Aplikasi (`web/`, cache `cw-pagi-v46`) di branch `claude/pantauan-pengawas` (dibuat di atas PR #1): push & gabungkan
    setelah disetujui pemilik, lalu cek dengan akun pengawas / admin sungguhan.
  - [ ] Setelah 2 minggu data resmi: cek apakah tanda "Posisi nyaris sama" banyak yang keliru (`PANTAU_MIRIP_M`).

- [x] **B4 Alasan potongan per kejadian** di Nilai Saya (26 Okt 2026): bagian "Penyebab nilai berkurang", per tanggal +
  label unsur, mis. "Rabu, 28 Okt · Ketepatan waktu · Ceklok Masuk terlambat 3 mnt (pukul 07.33)". Tanpa angka aturan nilai
  (sesuai kebijakan aplikasi). Juga tampil di rincian nama pada Rekap Integritas (pengawas/admin).
  - Server **TERPASANG Versi 56** (26 Okt 2026, 05.50). `ujiKejadian` (Kejadian.gs, hanya menghitung, tidak menulis) jalan
    tanpa error: satpas 24 dinilai, CW 50 dinilai, 0 kejadian (hari resmi pertama belum ditutup). Kejadian pertama
    muncul setelah hitungan terjadwal ±07.30 / 09.00. `/exec?pin=00000001` → "PIN salah" (sehat).
  - [ ] Cek siang 26/10: sheet NILAI APLIKASI kolom DETAIL berisi `"kejadian"` untuk anggota yang terlambat / belum lapor.
  - Server: file baru `Kejadian.gs` (salinan di `catatan-lanjutan/server/`); perubahan di `Code.gs`
    (`hitungIntegritasSatpas`: `fotoCwKej`/`fotoCkKej`, `kejadian` per anggota, `kejadian:` di `hasil.push`),
    `PenilaianCw.gs` (sama, kelompok CW) dan `NilaiAplikasi.gs` (`detail.kejadian`). Cadangan sebelum perubahan:
    `apps-script/cadangan-sebelum-B4/` (tidak di-git, Code.gs memuat NRP admin).
  - Aplikasi (`web/`, cache `cw-pagi-v50`) **tayang** 26 Okt 2026 pagi: branch `claude/pantauan-pengawas` di-push dan
    `main` di-fast-forward ke `47c0bbe` (termasuk PR #1 Pembinaan & tab Pantauan). Tanpa `detail.kejadian` tampilan tetap seperti dulu.
  - Setelah deploy: jalankan Hitung sekarang (atau tunggu hitungan terjadwal) agar NILAI APLIKASI berisi kejadian;
    cek di Nilai Saya satu anggota yang punya catatan.

- [x] **Keputusan atasan 1-ketuk di tab Pantauan** (26 Okt 2026): server **Versi 57** (06.19; `ujiPantauan` jalan tanpa error,
  GET & POST `/exec` sehat) dan aplikasi cache `cw-pagi-v51` **tayang** (`main` = `fa618fd`).
  - [ ] Cek dengan akun pengawas/admin sungguhan: satu keputusan tiap jenis, lalu lihat sel & catatan selnya di spreadsheet.
  - Mencurigakan: tombol ASLI / PALSU (⚠️) dan chip CEK FOTO di rincian kejadian. Bagian baru **Cek foto**: foto 3 hari
    terakhir yang belum dicek (maks 150, terbaru dulu) + chip CEK FOTO. Persetujuan: tombol SETUJU / TOLAK + daftar
    **HP baru menunggu izin** dengan tombol "Izinkan HP baru".
  - Server: file baru `Keputusan.gs` (aksi POST `putuskan`; salinan di `catatan-lanjutan/server/`), `Code.gs` (1 baris
    di doPost), `Pantauan.gs` (ref baris, daftar foto & HP, kunci cache `pantauan2|`). Cadangan: `apps-script/cadangan-sebelum-keputusan/`.
  - Menulis ke sel yang sama dengan isian manual + catatan sel "Lewat aplikasi oleh …" (jejak audit). Pengawas hanya data
    Satpas (LOG CEKLOK, pengajuan CEKLOK, HP anggota Satpas); admin semua. Baris dicari ulang lewat WAKTU + NAMA.
  - ASLI/PALSU Lapor CW langsung menyinkronkan ABSENSI N ↔ H (`verifikasiCw_`).
  - Aplikasi `web/` cache `cw-pagi-v51`. Server lama: bagian Cek foto & tombol tidak tampil (aman dipasang lebih dulu).

- [x] **HP_ID rangkap tiga + Riwayat 7 hari + Kartu Teladan** (26 Okt 2026): server **Versi 58** (07.37; `ujiRiwayat` jalan
  tanpa error) dan aplikasi cache `cw-pagi-v52` **tayang** (`main` = `44b8a17`).
  - [ ] Cek Nilai Saya satu anggota yang sudah lapor hari ini: bagian Riwayat 7 hari tampil.
  - HP_ID disimpan di localStorage + IndexedDB `cw-id` + Cache Storage `cw-id` (sw.js tidak menghapusnya), dipulihkan
    sebelum permintaan pertama; `navigator.storage.persist()`. Tidak menolong "Hapus data situs" (ketiganya ikut terhapus).
  - Nilai Saya: "Riwayat 7 hari terakhir" (jam, tahap, terlambat/pulang cepat, tertunda, status lokasi ⚠️ tanpa alasan,
    status CEK FOTO). Server: `riwayatSaya_` di `NilaiAplikasi.gs` (salinan di `catatan-lanjutan/server/`), field `riwayat`
    di `action=nilai`. Cadangan: `apps-script/cadangan-sebelum-riwayat/`.
  - Rekap Integritas (mingguan/bulanan): tombol "★ Kartu & teks WA Teladan" → gambar PNG 1080×1350 (bagikan / unduh) +
    teks WhatsApp. Hanya aplikasi, tanpa perubahan server.
  - Aplikasi `web/` cache `cw-pagi-v52`.

- [x] **Pantauan & Rekap Admin: 1x simpan, tidak muncul lagi; hanya NRP resmi; Polri / PHL terpisah** (26 Okt 2026):
  server **Versi 59** (13.42; `ujiPantauan` jalan: Ceklok 24 anggota resmi, CW 11 baris). Aplikasi cache `cw-pagi-v53`
  **tayang** (`main` = `c45b23b`, 26 Okt 2026).
  - Rekap Admin: Simpan langsung diterapkan di layar & dikirim di belakang (tanpa memuat ulang seluruh data); gagal →
    perubahan dikembalikan. Hadir pada baris ⚠️ Nihil = VERIFIKASI ASLI saat itu juga (`asliDariRekap_` di Keputusan.gs,
    dipanggil doPost Code.gs), tanda "⚠️ lokasi diragukan" hilang (`diperiksa` hanya bila VERIFIKASI ≠ ASLI).
  - Pantauan: keputusan (ASLI/PALSU, CEK FOTO, SETUJU/TOLAK, izinkan HP) langsung hilang dari daftar menunggu, dikirim
    di belakang, dan disimpan di HP (`cw_putus`, 3 hari) sehingga tidak muncul lagi walau data server belum diperbarui.
    Angka merah = yang masih perlu tindakan. Mencurigakan dipisah "Perlu keputusan" / "sudah diputuskan & informasi".
  - Persetujuan: tanpa tautan sheet PERSETUJUAN (cukup di HP).
  - Hanya NRP_RESMI (`PANTAU_HANYA_RESMI = true` di Pantauan.gs; `false` = semua anggota). Tombol Polri / PHL Satpas
    (PHL = pangkat PHL di Data Satpas). Kunci cache `pantauan3|` (`hapusCachePantau_`).
  - Cadangan: `apps-script/cadangan-sebelum-pantauan-resmi/`. Salinan di `catatan-lanjutan/server/`.
  - [ ] Cek dengan akun admin / pengawas sungguhan.

- [x] **H dari Lapor Selesai hilang di ABSENSI** (26 Okt 2026): tombol Hadir di Rekap Admin dulu bolak-balik, sehingga ketuk
  ulang mengosongkan H dan anggota tercatat "tidak lapor CW" (mis. NRP 87040654). Sel ABSENSI 26 dipulihkan dari LOG LAPOR
  (no 3, 7, 26, 37, 39, 43 = H) lewat `pulihkanAbsensiDariLog`. Server **Versi 60**: doPost menolak mengosongkan H yang punya
  Lapor Selesai / Tinggalkan Lokasi (`kodeLaporHari_`); aplikasi cache `cw-pagi-v54` **tayang** (`main` = `80a394e`):
  Hadir tidak lagi bolak-balik. Cadangan: `apps-script/cadangan-sebelum-jaga-absensi/`.
  - Bila terjadi lagi: jalankan `pulihkanAbsensiDariLog` (tanpa argumen = hari ini) dari editor, hanya mengisi sel kosong.

- [x] **Rekap Admin anti salah ketuk** (26 Okt 2026): cache `cw-pagi-v55` **tayang** (`main` = `0f367cd`). Baris yang sudah lapor
  sendiri lewat aplikasi dikunci 🔒 (ubah lewat "Koreksi" + konfirmasi + alasan wajib di catatan); Hadir & Tidak tidak
  bolak-balik; Simpan menampilkan ringkasan perubahan (lama → baru, ⚠️ bila mengubah isian) sebelum dikirim.
  - [ ] Cek dengan HP operator sungguhan (buka ulang aplikasi agar v55 termuat).

- [x] **Terlambat ceklok ikut memotong nilai Ceklok Satpas** (disetujui 26 Okt 2026, berlaku mulai **27/10/2026**): server **Versi 61**.
  Ceklok Masuk terlambat memakai tingkat yang sama dengan pulang cepat (≤15 mnt 90 · 16–60 mnt 70 · >60 mnt 50); bila hari itu
  juga pulang cepat dipakai yang terendah. Ketepatan waktu tetap dipotong seperti biasa. Alasan: sebelumnya terlambat hanya memotong
  Ketepatan (bobot 10) sehingga anggota yang ikut CW nyaris tidak terasa (contoh 26/10: terlambat 85 mnt tetap 91,2), sedangkan
  anggota tanpa CW lebih terasa. Sheet PANDUAN diperbarui. Cadangan: `apps-script/cadangan-sebelum-telat-ceklok/`.
  - [ ] Cek 27/10 sore: anggota yang terlambat ceklok mendapat nilai Ceklok Satpas 90 / 70 / 50 di NILAI APLIKASI (kolom UNSUR).

- [x] **Celah lupa Ceklok Pulang ditutup** (26 Okt 2026, server **Versi 62**, aplikasi cache `cw-pagi-v57`):
  - Mulai **27/10**, Ceklok Pulang lembur (≥30 mnt sesudah jam pulang) dicatat sebagai pengajuan "Lembur" di sheet PERSETUJUAN
    (`TGL_LEMBUR_SETUJU` di Code.gs). Bonus lembur & menit lembur penentu urutan baru dihitung setelah atasan SETUJU di
    Pantauan → Persetujuan; menunggu = catatan "lembur menunggu persetujuan", TOLAK = tanpa bonus. Pulang tetap 100.
    Lembur tidak ikut daftar "Sering mengajukan".
  - Luar radius Ceklok: aplikasi berhenti memantau pada jam pulang dinas; server tidak mencatat kejadian yang 5 menitnya genap
    sesudah jam pulang (`luarSesudahPulang_`), dan baris lama seperti itu tidak dinilai (`bacaLuarRadius_`).
  - Uji: `ujiKejadian` jalan tanpa error (24 Satpas, 50 CW). Cadangan: `apps-script/cadangan-sebelum-lembur-setuju/`.
  - [ ] Cek 27/10 sore: anggota yang lembur muncul di Pantauan → Persetujuan; setelah SETUJU bonus muncul pada hitungan berikutnya.

- [x] **Laporan tertunda diputuskan atasan** (26 Okt 2026 sore, server **Versi 63**, aplikasi cache `cw-pagi-v58`): Lapor Datang /
  Selesai dan Ceklok Masuk / Pulang yang terkirim tertunda (≥2 mnt, sinyal putus) tetap memakai jam aslinya, tetapi diberi tanda ⚠️
  "laporan tertunda N mnt … jam lapor dari HP belum bisa dipastikan" (bukti lemah). Masuk Pantauan → Mencurigakan: ASLI = normal,
  PALSU = −25 & predikat terkunci, tidak diputuskan = ASLI ±07.30 esok. CW: ABSENSI Nihil sampai ASLI (Rekap Admin: Hadir = ASLI).
  Label Pantauan "⚠️ Perlu diputuskan". Cadangan: `apps-script/cadangan-sebelum-tunda/`.
  - [ ] Pantau seminggu: bila terlalu banyak tertunda karena sinyal memang buruk di titik tertentu, pertimbangkan ambang ≥5 mnt.

### Wajib dicek hari pertama (26/10/2026)
- [ ] Satu NRP resmi: Lapor/Ceklok mengikuti aturan resmi (ditolak di luar jam/radius/tanpa foto).
- [ ] Setelah reset ±19.00, data NRP resmi hari itu masih ada di LOG LAPOR / LOG CEKLOK.
- [ ] Anggota di luar daftar tetap bisa lapor bebas dan datanya direset ±19.00.
- [ ] Pengingat tampil di HP (banner sebelum 06.30 bila belum Lapor Datang; hilang setelah lapor) dan tawaran izin notifikasi muncul.
- [ ] Sabtu 31/10: tab Lapor CW menampilkan "Hari ini libur CW Pagi"; penilaian tidak menghitung Sabtu.
- [ ] Bonus konsistensi baru terlihat setelah satu minggu penuh (minggu 26–30 Okt, final Senin 2 Nov).

### Keterbatasan yang diketahui
- Pengingat tidak bisa memberi notifikasi bila aplikasi ditutup sepenuhnya (butuh server push; tidak ada di Apps Script).
- LAPORAN HARIAN / REKAP BULANAN (rumus di sheet) tidak diubah: Sabtu/Minggu bisa tampak "belum lapor" (abaikan).
- Baris ABSENSI pos jaga / Patwal / Laka dipakai bersama: bila anggota resmi dan uji coba lapor di baris yang sama pada hari yang
  sama, kode H baris itu dipertahankan reset (milik anggota resmi).
- Reset ±19.00 hari ≥ 26/10 tidak lagi menghapus kode H / N di ABSENSI yang tidak berasal dari laporan aplikasi (isian manual admin).
- `UJI_COBA` masih `true` untuk semua. Bila seluruh anggota sudah resmi: ubah ke `false` di Code.gs, deploy.

### Keputusan PERSETUJUAN (24 Okt)
- Dipilih: **atasan memeriksa sheet PERSETUJUAN setiap hari sebelum pukul 15.00** (manual, tanpa keputusan otomatis).
- Belum dipilih / bisa ditambah nanti: pengajuan yang tidak diputuskan dalam 1×24 jam otomatis **SETUJU (otomatis)** dan ditandai di
  🩺 Cek & Perbaiki + rekap pimpinan (saran), atau otomatis SETUJU dengan nilai lebih rendah, atau otomatis TOLAK.

### Usulan yang belum dipilih (dari diskusi 24 Okt)
- A2 Bonus inisiatif lapangan (tugas mendadak disetujui / lembur beralasan).
- A3 Pembobotan ulang `BOBOT_INTEGRITAS` (Code.gs) – butuh keputusan pimpinan, umumkan dulu ke anggota.
- A4 Unsur ke-7 penilaian atasan per kualitas tugas (mis. 10%).
- B1 Peringkat & tren (naik/turun vs minggu lalu) di Nilai Saya.
- B3 Papan penghargaan mingguan (Teladan, Paling konsisten).
- B4 Alasan potongan per kejadian di Nilai Saya ("−6 karena terlambat 3 menit pada 28/10").
- C1 QR dinamis dari tablet kantor untuk Ceklok Masuk/Pulang, beserta usulan peningkatannya: lihat
  `catatan-lanjutan/SKEMA-QR-DINAMIS.md`.

### Audit celah kecurangan (21 Okt) yang belum diterapkan
- 2 cek kehadiran acak selfie · 5 piket BM/Patwal/Laka dinilai dari jadwal · 6 laporan tertunda tidak menguntungkan ·
  7 waktu perangkat bisa mundur ≤20 mnt · 8 deteksi fake GPS lemah · 10 foto hanya 3 hari (usul 14–30 hari) · 9 sidak atasan.
- Sudah diterapkan: 1 foto wajah Lapor Selesai, 3 satu NRP satu HP, 4 izin/tugas mendadak perlu persetujuan, titik tanpa koordinat ditolak.

## Cara deploy perubahan kode server (ringkas)
Folder `apps-script/` tidak masuk git (ada di .gitignore). Cadangan = folder itu sendiri.
1. Edit `.gs` di `apps-script/`, cek sintaks (`node --check` pada salinan .js).
2. Buka editor Apps Script (login satpasbwi@gmail.com). Terapkan perubahan ke model monaco lewat patch lama→baru,
   cocokkan hash isi (x = x*31 + charCode |0) sebelum & sesudah dengan file lokal. File baru: tombol + → Skrip → ganti nama.
3. Ctrl+S, pastikan "Disimpan ke Drive". Terapkan → Kelola deployment → pensil → Versi: **Versi baru** → deskripsi → Terapkan.
   URL /exec tidak berubah. Cek: `.../exec?pin=00000001` harus menjawab `{"error":"PIN salah"}`.
4. Aplikasi (folder `web/`): commit & push ke `main`; naikkan versi cache di `web/sw.js`. Push hanya setelah disetujui pemilik.

## Peta file baru dalam pekerjaan ini
- `apps-script/Pantauan.gs` (salinan di `catatan-lanjutan/server/`) – tab Pantauan (`pantauanData_`, `ujiPantauan`; ambang `PANTAU_*`).
- `apps-script/Pembinaan.gs` (salinan di `catatan-lanjutan/server/`) – tab Pembinaan (`pembinaanData_`, `ujiPembinaan`).
- `apps-script/ModeResmi.gs` – NRP_RESMI, TGL_RESMI, `ujiCoba_`, `cwLibur_` (TGL_CW_SENIN_JUMAT).
- `apps-script/Panduan.gs` – isi sheet PANDUAN (jalankan `perbaruiPanduan` setelah mengubah teks).
- `apps-script/Urutan.gs` – `bonusKonsisten_` (BONUS_KONSISTEN, KONSISTEN_MIN_HARI, KONSISTEN_PERSEN).
- `web/app.js` – `cekPengingat`, pesan libur CW.
