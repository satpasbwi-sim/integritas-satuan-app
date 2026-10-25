/**
 * ALASAN POTONGAN PER KEJADIAN – tab "Nilai Saya" (usulan B4).
 *
 * Selama penilaian dihitung (hitungIntegritasSatpas di Code.gs, hitungPenilaianCw di PenilaianCw.gs), setiap kejadian
 * yang menurunkan nilai dicatat dengan tanggalnya: {tgl: 'yyyy-MM-dd', u: kode unsur, t: teks}.
 * Disimpan di kolom DETAIL sheet NILAI APLIKASI (detail.kejadian, NilaiAplikasi.gs) dan ditampilkan di aplikasi
 * per tanggal, mis. "28 Okt · Ketepatan waktu · Ceklok Masuk terlambat 3 mnt (pukul 07.33)".
 * Teks tidak memuat angka aturan nilai (potongan / nilai unsur): aplikasi memang tidak menampilkannya.
 * Kode unsur: hadir · ceklok · lokasi · tepat · lengkap · durasi (sama dengan BOBOT_INTEGRITAS / BOBOT_CW).
 */

const KEJADIAN_MAKS = 30;   // per orang per periode, yang terbaru (bulanan bisa panjang)

/** Tambah satu kejadian. hari = tanggal di bulan ABSENSI (angka), bulan = 'yyyy-MM'. */
function catatKejadian_(daftar, bulan, hari, unsur, teks) {
  daftar.push({ tgl: bulan + '-' + ('0' + hari).slice(-2), u: unsur, t: teks });
}

/** Urut terbaru dulu, dibatasi KEJADIAN_MAKS (urutan dalam satu tanggal tetap). */
function rapikanKejadian_(daftar) {
  return daftar.map(function (k, i) { return [k, i]; })
    .sort(function (a, b) { return a[0].tgl < b[0].tgl ? 1 : a[0].tgl > b[0].tgl ? -1 : a[1] - b[1]; })
    .slice(0, KEJADIAN_MAKS).map(function (x) { return x[0]; });
}

/**
 * Kejadian CW Pagi dari satu hari LOG LAPOR (h dari hariLapor_), dipakai Code.gs & PenilaianCw.gs.
 * info = {tz, palsu: hari ini dihitung ⚠️ terbukti, ragu: diragukan (setelah verifikasi), tgSah, telat (mnt), g: golonganDurasi_, pBaik}
 */
function kejadianCw_(daftar, bulan, h, info) {
  const jam = function (t) { return Utilities.formatDate(new Date(t), info.tz, 'HH.mm'); };
  if (info.palsu) catatKejadian_(daftar, bulan, h.hari, 'lokasi', 'lokasi Lapor CW diragukan ⚠️ (terbukti / belum diverifikasi)');
  if (h.tinggal && !info.tgSah) catatKejadian_(daftar, bulan, h.hari, 'lengkap', 'Tinggalkan Lokasi CW belum disetujui atasan');
  else if (!h.tinggal && h.datang && !h.selesai) catatKejadian_(daftar, bulan, h.hari, 'lengkap', 'tanpa Lapor Selesai CW');
  else if (!h.tinggal && !h.datang) catatKejadian_(daftar, bulan, h.hari, 'lengkap', 'tanpa Lapor Datang CW');
  if (info.ragu) return;   // hari diragukan: ketepatan & durasi tidak dinilai
  if (h.datang && info.telat > 0) catatKejadian_(daftar, bulan, h.hari, 'tepat', 'Lapor Datang CW terlambat ' + info.telat + ' mnt (pukul ' + jam(h.datang) + ')');
  const g = info.g;
  if (g && g.hitung && h.datang && h.selesai && Number(g.poin) < info.pBaik) {
    catatKejadian_(daftar, bulan, h.hari, 'durasi', 'waktu di titik CW kurang (' + jam(h.datang) + '–' + jam(h.selesai) + ', ' + g.menit + ' mnt)');
  }
}

/** Kejadian Kehadiran CW dari kode ABSENSI satu hari (c sudah huruf besar). */
function kejadianKodeCw_(daftar, bulan, hari, c, belumSetuju) {
  if (belumSetuju) return catatKejadian_(daftar, bulan, hari, 'hadir', (LABEL_IZIN[c] || c) + ' (CW) belum disetujui atasan, dihitung tidak hadir');
  if (NILAI_IZIN[c] != null) return catatKejadian_(daftar, bulan, hari, 'hadir', (LABEL_IZIN[c] || c) + ' (CW) disetujui, dinilai sedikit di bawah hadir');
  if (c === KODE_NIHIL) return catatKejadian_(daftar, bulan, hari, 'hadir', 'CW dicatat Nihil');
  if (c !== 'H') catatKejadian_(daftar, bulan, hari, 'hadir', 'tidak lapor CW');
}

/** Foto bermasalah (CEK FOTO atasan): pasangan [hari, nilai CEK FOTO]. */
function kejadianFoto_(daftar, bulan, foto, sumber) {
  (foto || []).forEach(function (x) { catatKejadian_(daftar, bulan, x[0], 'lokasi', 'foto ' + sumber + ' ' + String(x[1]).toLowerCase()); });
}

/** Di luar radius > LUAR_RADIUS_MENIT menit: {hari: jumlah} dari bacaLuarRadius_. */
function kejadianLuar_(daftar, bulan, hari) {
  Object.keys(hari || {}).forEach(function (t) {
    catatKejadian_(daftar, bulan, Number(t), 'lokasi', 'di luar radius lebih dari ' + LUAR_RADIUS_MENIT + ' menit' + (hari[t] > 1 ? ' (' + hari[t] + '×)' : ''));
  });
}
