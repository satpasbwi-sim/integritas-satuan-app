/**
 * ERROR APLIKASI DARI HP ANGGOTA – diterima dari web/pengaman.js (POST /exec?action=logError), tanpa NRP/PIN wajib
 * (error bisa terjadi sebelum login). Dicatat di sheet LOG ERROR APLIKASI spreadsheet CW Pagi.
 *
 *   - Email SEGERA ke operator bila ≥ ERR_AMBANG_HP HP berbeda gagal membuka aplikasi dalam ERR_JENDELA_MENIT
 *     (tanda versi baru rusak → rollback, README "Pengaman otomatis & kembali ke versi sebelumnya"). Maks 1 email / 3 jam.
 *   - Email ringkasan harian (pemicu kabarErrorAplikasi ±19.30): error baru dikelompokkan per pesan.
 *
 * PASANG (sekali):
 *   1. Tempel file ini sebagai file baru "ErrorAplikasi.gs".
 *   2. Di Code.gs, baris PERTAMA di dalam function doPost(e) { … } tambahkan:
 *        if (e && e.parameter && e.parameter.action === 'logError') return terimaErrorAplikasi_(e);
 *   3. Terapkan → Kelola deployment → pensil → Versi baru → Terapkan (URL /exec tetap).
 *   4. Jalankan pasangPemicuErrorAplikasi sekali (email ringkasan harian). Uji: ujiErrorAplikasi.
 * Tanpa langkah 2, kiriman dari HP hanya ditolak server biasa ("NRP tidak terdaftar") dan tidak dicatat (aman).
 */

const SHEET_ERR = 'LOG ERROR APLIKASI';
const ERR_KOLOM = ['WAKTU SERVER', 'WAKTU HP', 'JENIS', 'PESAN', 'NRP', 'HP', 'SAAT', 'HALAMAN', 'BROWSER'];
const ERR_MAKS_BARIS = 3000;          // baris lama dibuang otomatis
const ERR_MAKS_HARI = 400;            // kiriman per hari (pengaman kuota bila ada HP yang terus mengirim)
const ERR_AMBANG_HP = 5;              // HP berbeda gagal membuka aplikasi …
const ERR_JENDELA_MENIT = 30;         // … dalam jendela ini → email segera
const ERR_JEDA_EMAIL_JAM = 3;

function terimaErrorAplikasi_(e) {
  const keluar = function (o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); };
  try {
    const props = PropertiesService.getScriptProperties();
    const tz = Session.getScriptTimeZone();
    const hari = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const kunciHari = 'errHari_' + hari;
    const nHari = Number(props.getProperty(kunciHari) || 0);
    if (nHari >= ERR_MAKS_HARI) return keluar({ ok: true, dibatasi: true });

    let body = {};
    try { body = JSON.parse((e.postData && e.postData.contents) || '{}') || {}; } catch (x) { return keluar({ error: 'format' }); }
    const daftar = (Array.isArray(body.err) ? body.err : []).slice(0, 10);
    if (!daftar.length) return keluar({ ok: true });

    const teks = function (v, n) {
      const s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').slice(0, n);
      return /^[=+\-@]/.test(s) ? "'" + s : s;   // cegah dianggap rumus oleh Sheets
    };
    const nrp = teks(body.nrp, 20), hp = teks(body.hp, 70), browser = teks(body.ua, 200);
    const sekarang = new Date();
    const baris = daftar.map(function (x) {
      x = x || {};
      return [sekarang, teks(x.t, 30), teks(x.jenis, 20), teks(x.teks, 1500), nrp, hp,
        x.siap ? 'sedang dipakai' : 'saat membuka', teks(x.hal, 100), browser];
    });

    const sh = sheetErr_();
    sh.getRange(sh.getLastRow() + 1, 1, baris.length, ERR_KOLOM.length).setValues(baris);
    props.setProperty(kunciHari, String(nHari + baris.length));
    if (sh.getLastRow() > ERR_MAKS_BARIS + 200) sh.deleteRows(2, sh.getLastRow() - 1 - ERR_MAKS_BARIS);

    if (daftar.some(function (x) { return x && x.jenis === 'gagal-mulai'; })) cekLonjakanGagal_(hp || nrp || 'tanpa-id');
    return keluar({ ok: true, n: baris.length });
  } catch (err) {
    return keluar({ error: 'gagal mencatat' });
  }
}

function sheetErr_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_ERR);
  if (!sh) {
    sh = ss.insertSheet(SHEET_ERR);
    sh.getRange(1, 1, 1, ERR_KOLOM.length).setValues([ERR_KOLOM]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(4, 520);
  }
  return sh;
}

// banyak HP berbeda gagal membuka aplikasi dalam waktu dekat → hampir pasti versi baru rusak
function cekLonjakanGagal_(id) {
  const cache = CacheService.getScriptCache();
  const batas = Date.now() - ERR_JENDELA_MENIT * 60000;
  let catatan = {};
  try { catatan = JSON.parse(cache.get('errGagalHp') || '{}'); } catch (x) { catatan = {}; }
  catatan[id] = Date.now();
  Object.keys(catatan).forEach(function (k) { if (catatan[k] < batas) delete catatan[k]; });
  cache.put('errGagalHp', JSON.stringify(catatan), 6 * 3600);
  const n = Object.keys(catatan).length;
  if (n < ERR_AMBANG_HP) return;
  const props = PropertiesService.getScriptProperties();
  if (Date.now() - Number(props.getProperty('errEmailLonjakan') || 0) < ERR_JEDA_EMAIL_JAM * 3600000) return;
  props.setProperty('errEmailLonjakan', String(Date.now()));
  kirimEmailErr_('⚠️ Aplikasi Integritas gagal dibuka di ' + n + ' HP',
    n + ' HP berbeda gagal membuka aplikasi dalam ' + ERR_JENDELA_MENIT + ' menit terakhir.\n\n' +
    'Bila baru saja ada perubahan aplikasi (push ke GitHub), kembalikan ke versi sebelumnya:\n' +
    'GitHub → Actions → Deploy ke GitHub Pages → Run workflow → isi "versi" dengan kode commit sebelumnya.\n' +
    'Bila baru saja deploy Apps Script: Terapkan → Kelola deployment → pilih versi sebelumnya.\n\n' +
    'Rincian error: sheet ' + SHEET_ERR + '\n' + SpreadsheetApp.getActive().getUrl());
}

/** Pemicu harian: ringkasan error baru sejak ringkasan terakhir (tidak mengirim apa pun bila tidak ada). */
function kabarErrorAplikasi() {
  const props = PropertiesService.getScriptProperties();
  const sejak = Number(props.getProperty('errRingkasTerakhir') || 0);
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_ERR);
  props.setProperty('errRingkasTerakhir', String(Date.now()));
  if (!sh || sh.getLastRow() < 2) return;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, ERR_KOLOM.length).getValues()
    .filter(function (r) { return r[0] instanceof Date && r[0].getTime() > sejak; });
  if (!rows.length) return;
  const grup = {};
  rows.forEach(function (r) {
    const pesan = String(r[3]).split('\n')[0].slice(0, 160);
    const g = grup[pesan] || (grup[pesan] = { n: 0, hp: {}, nrp: {}, gagal: 0 });
    g.n++; g.hp[r[5] || '-'] = 1; if (r[4]) g.nrp[r[4]] = 1; if (r[2] === 'gagal-mulai') g.gagal++;
  });
  const urut = Object.keys(grup).sort(function (a, b) { return grup[b].n - grup[a].n; }).slice(0, 15);
  const nHp = {}; rows.forEach(function (r) { nHp[r[5] || '-'] = 1; });
  const isi = rows.length + ' error dari ' + Object.keys(nHp).length + ' HP sejak ringkasan sebelumnya.\n\n' +
    urut.map(function (p, i) {
      const g = grup[p];
      return (i + 1) + '. ' + p + '\n   ' + g.n + 'x, ' + Object.keys(g.hp).length + ' HP' +
        (g.gagal ? ', ' + g.gagal + 'x gagal membuka aplikasi' : '') +
        (Object.keys(g.nrp).length ? ', NRP: ' + Object.keys(g.nrp).slice(0, 5).join(', ') : '');
    }).join('\n\n') +
    '\n\nError sekali-sekali di 1 HP biasanya karena HP/sinyal; yang sama di banyak HP perlu diperbaiki atau dikembalikan ke versi sebelumnya.' +
    '\nRincian: sheet ' + SHEET_ERR + '\n' + SpreadsheetApp.getActive().getUrl();
  kirimEmailErr_('Ringkasan error aplikasi: ' + rows.length + ' error, ' + Object.keys(nHp).length + ' HP', isi);
}

function kirimEmailErr_(judul, isi) {
  const ke = (typeof EMAIL_OPERATOR !== 'undefined' && EMAIL_OPERATOR) ||
    SpreadsheetApp.getActive().getOwner().getEmail();
  MailApp.sendEmail(ke, '[Integritas] ' + judul, isi);
}

function pasangPemicuErrorAplikasi() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'kabarErrorAplikasi') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('kabarErrorAplikasi').timeBased().everyDays(1).atHour(19).nearMinute(30).create();
  Logger.log('Pemicu kabarErrorAplikasi terpasang (setiap hari ±19.30).');
}

/** Uji tanpa HP: mencatat satu error contoh lalu menampilkan baris terakhir sheet. */
function ujiErrorAplikasi() {
  const out = terimaErrorAplikasi_({ parameter: { action: 'logError' }, postData: { contents: JSON.stringify({
    nrp: '', hp: 'hp-uji-editor', ua: 'uji dari editor',
    err: [{ t: new Date().toISOString(), jenis: 'error', siap: true, teks: 'Uji ErrorAplikasi.gs (boleh dihapus)', hal: '/' }]
  }) } });
  Logger.log(out.getContent());
  const sh = sheetErr_();
  Logger.log(JSON.stringify(sh.getRange(sh.getLastRow(), 1, 1, ERR_KOLOM.length).getValues()[0]));
}
