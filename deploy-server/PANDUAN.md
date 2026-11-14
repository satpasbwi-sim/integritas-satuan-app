# Deploy otomatis kode server (Apps Script) lewat GitHub + clasp

Tujuan: kode Apps Script disimpan di **repo GitHub privat** `integritas-server`. Setiap push, GitHub mengirim kode ke
Apps Script dan membuat **Versi baru** pada deployment `/exec` yang sama, persis seperti aplikasi web sekarang.
Sesudah ini, perubahan server bisa dikerjakan siapa pun yang punya akses repo (termasuk sesi Claude di cloud) tanpa
membuka editor Apps Script.

Pengaman di workflow (`template/.github/workflows/deploy-apps-script.yml`):
- penulisan kode diperiksa sebelum dikirim; salah → tidak dikirim;
- ubahan langsung di editor Apps Script tidak akan tertimpa diam-diam (workflow berhenti);
- pengaturan Aplikasi web (Jalankan sebagai: Saya, Akses: Siapa saja) wajib ada di manifes;
- sesudah deploy, `/exec?action=jam` dicek; gagal → **otomatis kembali ke versi sebelumnya** + email GitHub;
- rollback manual dengan 1 isian (nomor versi).

Pemasangan **sekali** di laptop Windows pemilik, ±30 menit. Login Google harus **satpasbwi@gmail.com**.

---

## Tahap 0 – Persiapan
1. Pasang **Node.js LTS** dari https://nodejs.org (Next sampai selesai). Tutup lalu buka lagi PowerShell.
2. Pastikan **Git** ada (ikut GitHub Desktop, atau https://git-scm.com).
3. Buka https://script.google.com/home/usersettings (akun satpasbwi@gmail.com) → **Google Apps Script API → Aktif**.
4. Folder aplikasi `C:\Users\LENOVO\Downloads\cw-pagi-app` sudah versi terbaru (`git pull`), supaya folder
   `deploy-server` ini ada.

## Tahap 1 – Buat repo privat
1. https://github.com/new (login akun **satpasbwi-sim**).
2. Repository name: `integritas-server` · pilih **Private** · jangan centang "Add a README" → **Create repository**.

## Tahap 2 – Pasang clasp dan login Google
Buka **PowerShell**, jalankan satu per satu:
```powershell
npm install -g @google/clasp@2.4.2
clasp login
```
Browser terbuka → pilih **satpasbwi@gmail.com** → **Allow / Izinkan**. Muncul "Logged in" di PowerShell.
Ini membuat file kunci `C:\Users\LENOVO\.clasprc.json`. **Jangan bagikan file itu ke siapa pun.**

## Tahap 3 – Ambil kode Apps Script ke repo
1. Buka editor Apps Script spreadsheet CW Pagi → **⚙ Setelan proyek** → salin **ID Skrip**.
2. Di PowerShell (ganti `ID_SKRIP` dengan ID tadi):
```powershell
cd C:\Users\LENOVO\Downloads
git clone https://github.com/satpasbwi-sim/integritas-server.git
cd integritas-server
robocopy ..\cw-pagi-app\deploy-server\template . /E
'{"scriptId":"ID_SKRIP","rootDir":"src","fileExtension":"gs"}' | Out-File -Encoding ascii .clasp.json
mkdir src
clasp pull
dir src
```
`robocopy` menampilkan ringkasan salinan; itu normal. `dir src` harus menampilkan semua file editor
(Code.gs, Pantauan.gs, Keputusan.gs, …, appsscript.json).

3. Buka `src\appsscript.json` di Notepad. Harus ada bagian:
```json
"webapp": {
  "executeAs": "USER_DEPLOYING",
  "access": "ANYONE_ANONYMOUS"
}
```
Bila **belum ada**, jangan ditambahkan sekarang: lanjutkan dulu Tahap 4–5 dengan isi apa adanya (workflow pertama akan
gagal di "Periksa penulisan kode" dan tidak mengirim apa pun), lalu tambahkan bagian itu, commit, push (Tahap 5).

## Tahap 4 – Simpan kunci di GitHub
Di github.com → repo **integritas-server** → **Settings → Secrets and variables → Actions**:
1. Tab **Secrets** → **New repository secret**
   - Name: `CLASPRC_JSON`
   - Secret: buka `C:\Users\LENOVO\.clasprc.json` dengan Notepad → Ctrl+A → Ctrl+C → tempel → **Add secret**.
2. Tab **Variables** → **New repository variable**
   - Name: `DEPLOYMENT_ID`
   - Value: `AKfycbyWQDT3lFrx8O0DY0Zc5yjnDC9SnWwbWhfjfe0855jfK5LCevWG0VEpf3mq-ntieNxR_g`
     (bagian URL `/exec` di `web/config.js` aplikasi, antara `/s/` dan `/exec`).

## Tahap 5 – Kirim ke GitHub (deploy pertama)
```powershell
git add -A
git status
git commit -m "Kode server awal dari Apps Script"
git push -u origin main
```
Periksa `git status`: **tidak boleh** ada `.clasprc.json` di daftar (sudah diabaikan `.gitignore`).

Lalu buka repo → tab **Actions** → **Deploy Apps Script**. Tunggu ±2 menit sampai hijau ✓. Hasilnya:
- Apps Script → **Terapkan → Kelola deployment**: versi baru dengan keterangan "GitHub xxxxxxx: Kode server awal…".
- Langkah "Cek server menjawab" berisi "✓ /exec sehat".
- Buka aplikasi di HP → login → normal.

Bila merah: buka langkah yang ✗, baca pesan `Error`. Yang paling sering:
| Pesan | Penyebab |
| --- | --- |
| `CLASPRC_JSON atau DEPLOYMENT_ID belum diisi` | Tahap 4 |
| `User has not enabled the Apps Script API` | Tahap 0 langkah 3 (tunggu 2–3 menit sesudah diaktifkan) |
| `Deployment … tidak ditemukan` | `DEPLOYMENT_ID` salah salin |
| `appsscript.json harus berisi "webapp"…` | Tahap 3 langkah 3 |
| `Kode di editor Apps Script BERBEDA` | Ada yang mengubah di editor: `clasp pull`, commit, push |

## Sesudah terpasang
- Ubah kode server **hanya lewat repo** `integritas-server` (folder `src/`), lalu push. Tidak perlu lagi
  Terapkan → Kelola deployment manual.
- Rollback: repo → Actions → Deploy Apps Script → **Run workflow** → `kembali_ke_versi` = nomor versi → Run.
- Agar sesi Claude di cloud bisa mengubah kode server: beri tahu Claude nama repo `satpasbwi-sim/integritas-server`;
  Claude akan meminta akses repo itu.
- Fungsi sekali jalan (`pasangPemicu…`, `uji…`) dan layar izin Google tetap dijalankan dari editor Apps Script oleh pemilik.

## Keamanan
- Secret `CLASPRC_JSON` memberi akses mengubah proyek Apps Script akun ini. Hanya pemilik yang boleh punya akses
  admin ke repo `integritas-server`; jangan tambahkan kolaborator lain tanpa perlu.
- Cabut akses kapan saja: https://myaccount.google.com/permissions → **clasp – The Apps Script CLI** → Hapus akses.
  Sesudah itu (atau sesudah ganti kata sandi Google), deploy otomatis gagal sampai `clasp login` diulang dan isi
  secret `CLASPRC_JSON` diganti.
