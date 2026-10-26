/**
 * KEPUTUSAN ATASAN DARI APLIKASI – tombol di tab Pantauan (POST action=putuskan), tanpa membuka spreadsheet.
 * Menulis ke sel yang sama dengan isian manual, jadi aturan penilaian tidak berubah:
 *   verif : ASLI / PALSU   → kolom VERIFIKASI (M) LOG LAPOR / LOG CEKLOK (laporan bertanda ⚠️)
 *   foto  : pilihan CEK_FOTO → kolom CEK FOTO (N) LOG LAPOR / LOG CEKLOK
 *   setuju: SETUJU / TOLAK → kolom KEPUTUSAN (H) sheet PERSETUJUAN
 *   hp    : YA             → kolom IZINKAN HP BARU (H) sheet PERANGKAT (hanya bila ada HP baru menunggu)
 * Pengawas (NRP_PENGAWAS) hanya boleh memutuskan data Satpas (LOG CEKLOK, pengajuan CEKLOK, NRP anggota Satpas);
 * admin (kode admin) semua. Setiap keputusan diberi catatan sel "lewat aplikasi oleh <nama>, <waktu>" (jejak audit).
 * Baris dicari ulang lewat WAKTU + NAMA: reset uji coba ±19.00 menghapus baris sehingga nomor baris bisa bergeser.
 * Rujukan baris (ref) dikirim tab Pantauan (Pantauan.gs): {sumber: 'CW' | 'CEKLOK' | 'SETUJU', baris, ms, nama}.
 */

const KEPUTUSAN_NILAI = { verif: ['ASLI', 'PALSU'], setuju: ['SETUJU', 'TOLAK'], hp: ['YA'] };

function putuskan_(body, who) {
  if (who.role !== 'pengawas' && who.role !== 'admin') return { error: 'Keputusan hanya untuk pengawas dan admin' };
  const jenis = String(body.jenis || ''), nilai = String(body.nilai || '').trim().toUpperCase();
  const boleh = jenis === 'foto' ? Object.keys(CEK_FOTO) : KEPUTUSAN_NILAI[jenis];
  if (!boleh || boleh.indexOf(nilai) === -1) return { error: 'Keputusan tidak dikenal' };
  const admin = who.role === 'admin';
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const jejak = 'Lewat aplikasi oleh ' + who.petugas + ', ' + Utilities.formatDate(new Date(), tz, 'dd/MM HH.mm');
  const ref = body.ref || {};
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { error: 'Server sibuk, coba lagi sebentar' };
  try {
    if (jenis === 'hp') return izinkanHpBaru_(ss, String(ref.nrp || ''), admin, jejak);
    let sh, kol;
    if (jenis === 'setuju') {
      if (ref.sumber !== 'SETUJU') return { error: 'Rujukan pengajuan tidak valid' };
      sh = ss.getSheetByName(SHEET_PERSETUJUAN);
      kol = KOL_KEPUTUSAN;
    } else {
      if (ref.sumber !== 'CW' && ref.sumber !== 'CEKLOK') return { error: 'Rujukan laporan tidak valid' };
      if (ref.sumber === 'CW' && !admin) return { error: 'Pengawas hanya memutuskan data Ceklok Satpas' };
      sh = ref.sumber === 'CW' ? ensureLog_(ss) : ensureLogCeklok_(SpreadsheetApp.openById(SATPAS_SS_ID));
      kol = jenis === 'verif' ? 13 : KOL_CEK_FOTO;
      if (jenis === 'foto') ensureKolomCekFoto_(sh);
    }
    const baris = cariBarisRef_(sh, ref);
    if (!baris) return { error: 'Baris tidak ditemukan (mungkin sudah direset atau dihapus). Muat ulang Pantauan.' };
    const r = sh.getRange(baris, 1, 1, Math.max(kol, 12)).getValues()[0];
    if (jenis === 'setuju' && !admin && String(r[4]) !== 'CEKLOK') return { error: 'Pengawas hanya memutuskan pengajuan Ceklok Satpas' };
    if (jenis === 'verif' && !String(r[11] || '').trim()) return { error: 'Laporan ini tidak bertanda ⚠️' };
    const sel = sh.getRange(baris, kol);
    sel.setValue(nilai).setNote(jejak + (String(r[kol - 1] || '').trim() ? ' (sebelumnya ' + r[kol - 1] + ')' : ''));
    // Lapor CW: ABSENSI N ↔ H mengikuti keputusan ⚠️ (Verifikasi.gs), tanpa menunggu hitungan ±07.30
    if (jenis === 'verif' && ref.sumber === 'CW') {
      try { verifikasiCw_(ss, tz, Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'), Utilities.formatDate(new Date(), tz, 'dd/MM HH.mm')); }
      catch (e) { laporGagal_('Sinkron ABSENSI setelah keputusan', e); }
    }
    hapusCachePantau_();
    return { ok: true, nilai: nilai, jejak: jejak };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Rekap Admin (doPost): baris ABSENSI yang diganti Hadir = ⚠️ Lapor CW hari itu diputuskan ASLI sekarang juga,
 * jadi tidak muncul lagi sebagai "belum diverifikasi" di Pantauan / Rekap Admin (sebelumnya baru dianggap ASLI ±07.30).
 * Hanya VERIFIKASI yang masih kosong; isian atasan (mis. PALSU) tidak ditimpa. Lock dipegang doPost.
 */
function asliDariRekap_(ss, shAbs, day, barisH, who) {
  const kolNo = shAbs.getRange(FIRST_ROW, 1, LAST_ROW - FIRST_ROW + 1, 1).getDisplayValues();
  const no = {};
  barisH.forEach(function (row) { const v = String(kolNo[row - FIRST_ROW][0] || '').trim(); if (v) no[v] = 1; });
  const log = ensureLog_(ss);
  if (log.getLastRow() < 2 || !Object.keys(no).length) return 0;
  const tz = ss.getSpreadsheetTimeZone();
  const akhir = ss.getSheetByName(SHEET_SETTING).getRange('C7').getValue();
  const bulan = akhir instanceof Date ? Utilities.formatDate(akhir, tz, 'yyyy-MM') : '';
  const jejak = 'Rekap Admin (Hadir) oleh ' + who.petugas + ', ' + Utilities.formatDate(new Date(), tz, 'dd/MM HH.mm');
  let diisi = 0;
  log.getRange(2, 1, log.getLastRow() - 1, 13).getValues().forEach(function (r, i) {
    if (!(r[0] instanceof Date) || Number(r[1]) !== day || !no[String(r[2]).trim()]) return;
    if (bulan && Utilities.formatDate(r[0], tz, 'yyyy-MM') !== bulan) return;
    if (!String(r[11] || '').trim() || String(r[12] || '').trim()) return;
    log.getRange(i + 2, 13).setValue('ASLI').setNote(jejak);
    diisi++;
  });
  if (diisi) hapusCachePantau_();
  return diisi;
}

/** Nomor baris yang WAKTU (kolom A, ms) dan NAMA (kolom D)-nya cocok dengan ref; 0 bila tidak ada. */
function cariBarisRef_(sh, ref) {
  if (!sh || sh.getLastRow() < 2) return 0;
  const ms = Number(ref.ms), nama = normNama_(ref.nama);
  if (!ms || !nama) return 0;
  const cocok = function (r) { return r[0] instanceof Date && r[0].getTime() === ms && normNama_(r[3]) === nama; };
  const b = Number(ref.baris);
  if (b >= 2 && b <= sh.getLastRow() && cocok(sh.getRange(b, 1, 1, 4).getValues()[0])) return b;
  const semua = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  for (let i = semua.length - 1; i >= 0; i--) if (cocok(semua[i])) return i + 2;
  return 0;
}

function izinkanHpBaru_(ss, nrp, admin, jejak) {
  nrp = String(nrp).trim();
  if (!nrp) return { error: 'NRP tidak valid' };
  if (!admin && !satpasAnggota_(nrp)) return { error: 'Pengawas hanya mengizinkan HP anggota Satpas' };
  const sh = sheetPerangkat_(ss);
  const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, PERANGKAT_HEADER.length).getDisplayValues() : [];
  const i = rows.findIndex(function (r) { return String(r[0]).trim() === nrp; });
  if (i < 0) return { error: 'NRP tidak ada di sheet PERANGKAT' };
  if (!String(rows[i][5]).trim()) return { error: 'Tidak ada HP baru yang menunggu untuk NRP ini' };
  sh.getRange(i + 2, 8).setValue('YA').setNote(jejak);
  CacheService.getScriptCache().remove('hp|' + nrp);
  return { ok: true, nilai: 'YA', jejak: jejak };
}

/** Daftar HP baru yang menunggu izin (tab Pantauan → Persetujuan). Pengawas: anggota Satpas saja. */
function pantauHpBaru_(ss, tz, semua) {
  const sh = ss.getSheetByName(SHEET_PERANGKAT);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, PERANGKAT_HEADER.length).getValues()
    .filter(function (r) { return String(r[5]).trim() && String(r[7]).trim().toUpperCase() !== 'YA' && (semua || satpasAnggota_(String(r[0]).trim())); })
    .map(function (r) {
      return { nrp: String(r[0]).trim(), nama: String(r[1]).trim(),
        dicoba: r[6] instanceof Date ? Utilities.formatDate(r[6], tz, 'dd/MM HH.mm') : String(r[6] || ''),
        terakhir: r[4] instanceof Date ? Utilities.formatDate(r[4], tz, 'dd/MM HH.mm') : '' };
    });
}
