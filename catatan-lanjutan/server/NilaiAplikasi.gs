/**
 * NILAI DI APLIKASI – tab "Nilai Saya" (anggota) dan "Rekap Integritas" (pengawas, AturanKhusus.gs).
 *
 * Setiap kali penilaian dihitung (pagi ±07.30, sore ±15.15, menu Hitung sekarang), hasilnya juga disimpan ringkas di
 * sheet tersembunyi NILAI APLIKASI (spreadsheet CW Pagi): satu baris per orang per jenis periode dan kelompok.
 *   kelompok 'satpas' : anggota Satpas, dari PENILAIAN INTEGRITAS (6 unsur) – Code.gs hitungIntegritasSatpas
 *   kelompok 'cw'     : personel CW Pagi, dari PENILAIAN CW (5 unsur) – PenilaianCw.gs hitungPenilaianCw
 *   jenis 'harian' (hari terakhir yang dinilai) · 'mingguan' (Senin–Minggu berjalan) · 'bulanan' (bulan ABSENSI)
 *   jenis 'mingguan_final' / 'bulanan_final' : salinan saat periodenya sudah lewat (minggu: Senin pagi sesudahnya,
 *   bulan: hitungan pertama sesudah akhir bulan / Ganti Bulan). Aplikasi hanya menampilkan mingguan & bulanan yang final.
 * Hanya periode yang sama atau lebih baru yang menimpa (menu untuk tanggal / minggu lama tidak mengubah tampilan),
 * dan perhitungan tanpa hari yang dinilai (mis. sesudah reset uji coba) tidak menimpa.
 * Aplikasi: GET ?action=nilai → nilaiSaya_(who) (milik NRP yang login); ?action=rekap → rekapIntegritas_() (pengawas).
 */

const SHEET_NILAI_APP = 'NILAI APLIKASI';
const NILAI_APP_HEADER = ['JENIS', 'KELOMPOK', 'PERIODE', 'SAMPAI', 'NRP', 'NAMA', 'SKOR', 'PREDIKAT', 'PERINGKAT',
  'JUMLAH', 'UNSUR', 'CATATAN', 'DIPERBARUI', 'DETAIL'];
// kolom di baris hasil penilaian (urutan header PENILAIAN INTEGRITAS / PENILAIAN CW); ket = pokja / lokasi
const NILAI_APP_KOLOM = {
  satpas: { nama: 1, nrp: 3, ket: 4, unsur: [24, 25, 26, 27, 28, 29], skor: 30, predikat: 31, peringkat: 32, catatan: 33,
    label: ['Kehadiran CW', 'Ceklok Satpas', 'Kejujuran lokasi & foto', 'Ketepatan waktu', 'Kelengkapan lapor', 'Durasi tugas'] },
  cw: { nama: 1, nrp: 2, ket: 3, unsur: [15, 16, 17, 18, 19], skor: 20, predikat: 21, peringkat: 22, catatan: 23,
    label: ['Kehadiran', 'Kejujuran lokasi & foto', 'Ketepatan waktu', 'Kelengkapan lapor', 'Durasi tugas'] }
};
// catatan teknis yang tidak perlu dilihat anggota
const NILAI_APP_SEMBUNYI = [/^skor dari unsur/, /^tidak ada di plotting/, /^lapor lewat jadwal/, /^urutan:/, /^★ TELADAN/];

function sheetNilaiApp_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NILAI_APP);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NILAI_APP);
    sh.setFrozenRows(1);
    sh.getRange('D:E').setNumberFormat('@');
    sh.hideSheet();
  }
  if (sh.getMaxColumns() < NILAI_APP_HEADER.length) sh.insertColumnsAfter(sh.getMaxColumns(), NILAI_APP_HEADER.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, NILAI_APP_HEADER.length).setValues([NILAI_APP_HEADER]).setFontWeight('bold');
  return sh;
}

/**
 * Status jam hari itu untuk rekap harian (memakai fungsi INTEGRITAS HARIAN): {cw, masuk, pulang, lokasi} = [teks, level].
 * det = h.detail dari hitungIntegritasSatpas (cw, ck, jadwal, kode) atau hitungPenilaianCw (cw, kode).
 */
function konteksHarianApp_(tgl, berkala) {
  if (typeof statusCw_ !== 'function') return null;
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const J = jadwalMenit_(jadwalCfg_(ss));
  const hariIni = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const now = nowMenit_(ss);
  return {
    J: J,
    jam: function (t) { return Utilities.formatDate(new Date(t), tz, 'HH.mm'); },
    label: function (k) { return (typeof HARIAN_KODE !== 'undefined' && HARIAN_KODE[k]) || k; },
    cwBelum: tgl > hariIni || tgl === hariIni && now <= J.tutup,
    ckBelum: !berkala && (tgl > hariIni || tgl === hariIni && now <= menitDari_(CEKLOK.tutup)),
    berkala: !!berkala,
    lemburBuka: tgl === hariIni && now <= menitDari_(CEKLOK.tutupLembur)
  };
}

function detailHarianApp_(kelompok, h, x) {
  if (!x || !h.detail) return {};
  const out = { cw: statusCw_(h.detail, x.cwBelum, x.J, x.jam, x.label).slice(0, 2) };
  if (kelompok === 'satpas') {
    const ck = statusCeklok_(h.detail, x.ckBelum, x.jam, x.label, x.lemburBuka, x.berkala);
    out.masuk = ck.masuk; out.pulang = ck.pulang;
    out.lokasi = statusLokasi_(h.baris);
  }
  return out;
}

/**
 * Simpan hasil satu perhitungan. info = {label, sampai: hari terakhir yang dinilai, selesai: akhir periode} (yyyy-MM-dd).
 * Dipanggil dari hitungIntegritasSatpas / hitungPenilaianCw; hasil = array {skor, baris, detail}.
 */
function catatNilaiApp_(jenis, kelompok, hasil, info) {
  const K = NILAI_APP_KOLOM[kelompok];
  if (!K || !jenis || !hasil || !info || !info.sampai) return 0;
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const hariIni = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const sh = sheetNilaiApp_();
  let semua = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, NILAI_APP_HEADER.length).getValues() : [];
  const dinilai = hasil.filter(function (h) { return h.skor !== ''; });
  const stempel = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH.mm');
  const ktx = jenis === 'harian' ? konteksHarianApp_(info.sampai, info.berkala) : null;
  const baris = function (j) {
    return dinilai.map(function (h) {
      const b = h.baris;
      const unsur = K.unsur.map(function (k, i) { return [K.label[i], b[k] === '' ? null : Number(b[k])]; });
      const catatan = String(b[K.catatan] || '').split('; ').filter(function (c) {
        return c && !NILAI_APP_SEMBUNYI.some(function (re) { return re.test(c); });
      });
      const detail = ktx ? detailHarianApp_(kelompok, h, ktx) : {};
      detail.ket = String(b[K.ket] || '');
      if (h.urut) detail.urut = h.urut;   // penentu urutan & TELADAN (Urutan.gs)
      if (h.kejadian && h.kejadian.length) detail.kejadian = h.kejadian;   // alasan potongan per kejadian (Kejadian.gs)
      return [j, kelompok, info.label, info.sampai, String(normIdSatpas_(b[K.nrp]) || ''), String(b[K.nama]),
        Number(b[K.skor]), String(b[K.predikat]), b[K.peringkat] === '' ? '' : Number(b[K.peringkat]), dinilai.length,
        JSON.stringify(unsur), JSON.stringify(catatan), stempel, JSON.stringify(detail)];
    });
  };
  // ganti satu grup (jenis + kelompok), kecuali yang tersimpan periodenya lebih baru
  const ganti = function (j) {
    const lama = semua.filter(function (r) { return r[0] === j && r[1] === kelompok; });
    if (lama.length && String(lama[0][3]) > info.sampai) return false;
    semua = semua.filter(function (r) { return !(r[0] === j && r[1] === kelompok); }).concat(baris(j));
    return true;
  };
  let n = ganti(jenis) ? dinilai.length : 0;
  // periode sudah lewat seluruhnya = final (mingguan / bulanan yang boleh dilihat di aplikasi)
  if (jenis !== 'harian' && info.selesai && info.selesai < hariIni) ganti(jenis + '_final');
  if (sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, NILAI_APP_HEADER.length).clearContent();
  if (semua.length) sh.getRange(2, 1, semua.length, NILAI_APP_HEADER.length).setValues(semua);
  return n;
}

function bacaNilaiApp_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NILAI_APP);
  return sh && sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, NILAI_APP_HEADER.length).getValues() : [];
}

function barisNilaiApp_(r, hariIni) {
  const json = function (s, bawaan) { try { return JSON.parse(s) || bawaan; } catch (e) { return bawaan; } };
  return {
    nama: String(r[5]), nrp: String(r[4]), periode: String(r[2]), sampai: String(r[3]),
    sementara: String(r[3]) >= hariIni && !/· final/.test(String(r[2])),
    skor: Number(r[6]), predikat: String(r[7]), peringkat: r[8] === '' ? null : Number(r[8]), jumlah: Number(r[9]),
    unsur: json(r[10], []).map(function (u) { return { n: u[0], v: u[1] }; }), catatan: json(r[11], []),
    diperbarui: String(r[12]), detail: json(r[13], {})
  };
}

// jenis yang tampil di aplikasi: harian (berjalan), mingguan & bulanan (final)
const JENIS_APP = { harian: 'harian', mingguan: 'mingguan_final', bulanan: 'bulanan_final' };

/** GET ?action=nilai: nilai harian (berjalan), mingguan & bulanan (final) milik NRP yang login. */
function nilaiSaya_(who) {
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const nrp = normIdSatpas_(who.nrp);
  const nama = normNama_(who.petugas);
  const rows = bacaNilaiApp_();
  const milik = function (r) { return nrp && normIdSatpas_(r[4]) === nrp || !r[4] && nama && normNama_(r[5]) === nama; };
  // anggota Satpas memakai penilaian integritas (CW + Ceklok); selain itu penilaian CW
  const satpas = !!(nrp && satpasAnggota_(nrp));
  const urutan = satpas ? ['satpas', 'cw'] : ['cw'];
  const hariIni = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const out = { nama: who.petugas, kelompok: satpas ? 'satpas' : 'cw', hariIni: hariIni };
  Object.keys(JENIS_APP).forEach(function (jenis) {
    let r = null;
    urutan.some(function (k) { r = rows.find(function (x) { return x[0] === JENIS_APP[jenis] && x[1] === k && milik(x); }) || null; return !!r; });
    out[jenis] = r ? barisNilaiApp_(r, hariIni) : null;
    // berapa orang yang juga bernilai 100 di periode & kelompok yang sama
    if (r) out[jenis].jumlah100 = rows.filter(function (x) { return x[0] === r[0] && x[1] === r[1] && Number(x[6]) >= 100; }).length;
  });
  try { out.riwayat = riwayatSaya_(who); } catch (e) { out.riwayat = null; }
  return out;
}

// Riwayat RIWAYAT_HARI hari terakhir milik anggota (tab Nilai Saya): tiap Lapor CW (LOG LAPOR, per nama) dan Ceklok
// (LOG CEKLOK, per NRP) dengan status verifikasi lokasi ⚠️ dan CEK FOTO, sebelum rekap nilai keluar.
// Alasan ⚠️ sengaja tidak dikirim: bisa memuat nama anggota lain dan cara deteksi lokasi palsu; hanya statusnya.
const RIWAYAT_HARI = 7;
const RIWAYAT_BACA = 2500;   // baris terakhir yang dibaca per LOG (cukup untuk 7 hari)

function riwayatSaya_(who) {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const now = new Date();
  const mulai = Utilities.formatDate(new Date(now.getTime() - (RIWAYAT_HARI - 1) * 86400000), tz, 'yyyy-MM-dd');
  const nama = normNama_(who.petugas), nrp = normIdSatpas_(who.nrp);
  const out = [];
  const baca = function (sh, sumber, milik) {
    if (!sh || sh.getLastRow() < 2) return;
    const awal = Math.max(2, sh.getLastRow() - RIWAYAT_BACA + 1);
    const lebar = Math.min(KOL_CEK_FOTO, sh.getMaxColumns());
    sh.getRange(awal, 1, sh.getLastRow() - awal + 1, lebar).getValues().forEach(function (r) {
      if (!(r[0] instanceof Date) || !milik(r)) return;
      const tgl = Utilities.formatDate(r[0], tz, 'yyyy-MM-dd');
      if (tgl < mulai) return;
      const verif = String(r[12] || '').trim().toUpperCase(), cek = lebar >= KOL_CEK_FOTO ? String(r[13] || '').trim().toUpperCase() : '';
      const t = /tertunda (\d+) mnt/.exec(String(r[10] || ''));
      out.push({ ms: r[0].getTime(), tgl: tgl, jam: Utilities.formatDate(r[0], tz, 'HH.mm'), sumber: sumber,
        status: String(r[sumber === 'CEKLOK' ? 4 : 5] || ''), selisih: sumber === 'CEKLOK' && Number(r[5]) > 0 ? Number(r[5]) : 0,
        lokasi: !String(r[11] || '').trim() ? 'ok' : verif === 'ASLI' ? 'asli' : verif === 'PALSU' ? 'palsu' : 'diperiksa',
        foto: driveId_(r[9]) ? (cek || 'BELUM') : '', tunda: t ? Number(t[1]) : 0 });
    });
  };
  if (nama) baca(ensureLog_(ss), 'CW', function (r) { return normNama_(r[3]) === nama; });
  if (nrp && satpasAnggota_(nrp)) baca(ensureLogCeklok_(SpreadsheetApp.openById(SATPAS_SS_ID)), 'CEKLOK', function (r) { return normIdSatpas_(r[2]) === nrp; });
  out.sort(function (a, b) { return b.ms - a.ms; });
  return { hari: RIWAYAT_HARI, baris: out.slice(0, 60) };
}

/** GET ?action=rekap (pengawas): rekap semua anggota per kelompok, urut peringkat. */
function rekapIntegritas_() {
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const hariIni = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const rows = bacaNilaiApp_();
  const out = { hariIni: hariIni };
  // PHL ditandai dari PANGKAT di sheet Data Satpas, agar aplikasi bisa memisah rekap Polri & PHL
  const pangkat = {};
  try { satpasDaftar_().forEach(function (a) { pangkat[a.nrp] = a.pangkat; }); } catch (e) { /* spreadsheet Satpas tidak terbuka */ }
  Object.keys(JENIS_APP).forEach(function (jenis) {
    const grup = {};
    // pengawas (Baur SIM) cukup melihat Anggota Satpas; Personel CW Pagi tidak dikirim
    ['satpas'].forEach(function (k) {
      const isi = rows.filter(function (r) { return r[0] === JENIS_APP[jenis] && r[1] === k; })
        .map(function (r) {
          const b = barisNilaiApp_(r, hariIni);
          b.phl = /^PHL$/i.test(String(pangkat[normIdSatpas_(b.nrp)] || '').trim());
          return b;
        })
        .sort(function (a, b) { return (a.peringkat || 999) - (b.peringkat || 999) || b.skor - a.skor; });
      if (!isi.length) return;
      grup[k] = { periode: isi[0].periode, sampai: isi[0].sampai, sementara: isi[0].sementara, diperbarui: isi[0].diperbarui, baris: isi };
    });
    out[jenis] = Object.keys(grup).length ? grup : null;
  });
  return out;
}
