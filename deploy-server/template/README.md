# Kode server Integritas Satuan (Apps Script) – PRIVAT

Kode Apps Script spreadsheet CW Pagi. **Repo ini harus tetap privat**: `src/Code.gs` memuat NRP admin.
Aplikasi web (tampilan) ada di repo publik `satpasbwi-sim/integritas-satuan-app`.

## Cara mengubah kode server
1. Ubah file di `src/` (di laptop, di Claude Desktop, atau langsung di github.com).
2. Commit & push ke `main`.
3. GitHub Actions **Deploy Apps Script** otomatis:
   - memeriksa penulisan kode;
   - memastikan tidak ada ubahan langsung di editor Apps Script yang akan tertimpa;
   - mengirim kode lalu membuat **Versi baru** pada deployment `/exec` yang sama (URL aplikasi tidak berubah);
   - mengecek `/exec?action=jam`. Bila server tidak menjawab dengan benar → **otomatis kembali ke versi sebelumnya**
     dan workflow merah (GitHub mengirim email).

**Jangan lagi mengubah kode langsung di editor Apps Script.** Bila terlanjur, di laptop jalankan `clasp pull`,
commit, push. Bila tidak, deploy berikutnya berhenti dengan pesan "Kode di editor Apps Script BERBEDA".

Yang tetap dikerjakan di editor Apps Script (tidak lewat repo): menjalankan fungsi sekali seperti `pasangPemicu…`,
`uji…`, dan memberi izin Google saat diminta.

## Kembali ke versi sebelumnya
Actions → **Deploy Apps Script** → **Run workflow** → isi **kembali_ke_versi** (nomor versi, lihat Apps Script →
Terapkan → Kelola deployment) → Run. Kode di repo tidak berubah; perbaiki lalu push seperti biasa.

## Pengaturan (sekali, sudah dilakukan saat pemasangan)
- Secret `CLASPRC_JSON` = isi `%USERPROFILE%\.clasprc.json` sesudah `clasp login` (akun pemilik Apps Script).
- Variable `DEPLOYMENT_ID` = bagian URL `/exec` di antara `/s/` dan `/exec`.
- `.clasp.json` = `{"scriptId":"<ID Skrip>","rootDir":"src","fileExtension":"gs"}`.
- `src/appsscript.json` wajib memuat `"webapp": {"executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS"}`.

Kunci akses berhenti bekerja bila kata sandi Google diganti atau akses "clasp" dicabut di
myaccount.google.com → Keamanan → Aplikasi pihak ketiga. Perbarui: `clasp login` lagi di laptop, lalu ganti isi secret
`CLASPRC_JSON`.
