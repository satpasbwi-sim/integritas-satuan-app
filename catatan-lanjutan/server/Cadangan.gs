/**
 * CADANGAN KODE APPS SCRIPT OTOMATIS → Google Drive (akun satuan, tidak publik).
 * Setiap hari ±02.00 seluruh file proyek ini (Code.gs, Pantauan.gs, …, appsscript.json) disalin ke folder Drive
 * "Cadangan Kode Apps Script CW Pagi" / "<yyyy-MM-dd HH.mm>". Hanya bila kode BERUBAH sejak cadangan terakhir,
 * jadi folder tidak penuh salinan yang sama. Disimpan CADANGAN_SIMPAN cadangan terakhir; yang lebih lama ke Sampah.
 * Juga dicatat daftar deployment (versi /exec yang aktif) di DEPLOYMENT.txt.
 *
 * Kode NRP admin ikut tersimpan, karena itu folder ini JANGAN dibagikan.
 *
 * PASANG (sekali):
 *   1. Buka https://script.google.com/home/usersettings (login akun pemilik) → "Google Apps Script API" → Aktif.
 *   2. Tempel file ini sebagai file baru "Cadangan.gs".
 *   3. appsscript.json (Setelan proyek → centang "Tampilkan file manifes appsscript.json"): di "oauthScopes" tambahkan
 *        "https://www.googleapis.com/auth/script.projects.readonly",
 *        "https://www.googleapis.com/auth/script.deployments.readonly"
 *      (dan pastikan sudah ada "https://www.googleapis.com/auth/script.external_request" serta ".../auth/drive").
 *   4. Jalankan cadangkanKodeSekarang → izinkan akses (Pilih semua). Cek folder di Drive.
 *   5. Jalankan pasangPemicuCadangan (setiap hari ±02.00). Tidak perlu deploy baru: pemicu tidak memakai /exec.
 *
 * MEMULIHKAN: buka folder cadangan tanggal yang diinginkan → buka file .gs → salin seluruh isi → tempel ke file
 * dengan nama sama di editor Apps Script → simpan → Terapkan → Kelola deployment → Versi baru.
 * (Lebih cepat bila hanya /exec yang rusak: pilih versi deployment sebelumnya, lihat README.)
 */

const CADANGAN_FOLDER = 'Cadangan Kode Apps Script CW Pagi';
const CADANGAN_SIMPAN = 60;

function cadangkanKodeSekarang() { return cadangkanKode_(true); }

/** Pemicu harian. */
function cadangkanKodeHarian() {
  try { cadangkanKode_(false); }
  catch (e) {
    if (typeof laporGagal_ === 'function') laporGagal_('Cadangan kode Apps Script', e);
    else throw e;
  }
}

function cadangkanKode_(paksa) {
  const id = ScriptApp.getScriptId();
  const opsi = { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
  const res = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + id + '/content', opsi);
  if (res.getResponseCode() !== 200) {
    throw new Error('Gagal membaca kode (' + res.getResponseCode() + '). Pastikan Google Apps Script API aktif di ' +
      'script.google.com/home/usersettings dan cakupan script.projects.readonly ada di appsscript.json. ' +
      res.getContentText().slice(0, 300));
  }
  const files = (JSON.parse(res.getContentText()).files || []);
  if (!files.length) throw new Error('Proyek tidak berisi file (jawaban API kosong)');

  const sidik = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    files.map(function (f) { return f.name + '\n' + f.source; }).join('\n\u0000\n'), Utilities.Charset.UTF_8));
  const props = PropertiesService.getScriptProperties();
  if (!paksa && props.getProperty('cadanganSidik') === sidik) { Logger.log('Kode tidak berubah, tidak dicadangkan.'); return null; }

  const tz = Session.getScriptTimeZone();
  const induk = folderCadangan_();
  const nama = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH.mm');
  const folder = induk.createFolder(nama);
  files.forEach(function (f) {
    const ext = f.type === 'JSON' ? '.json' : f.type === 'HTML' ? '.html' : '.gs';
    folder.createFile(f.name + ext, f.source, MimeType.PLAIN_TEXT);
  });

  let dep = '';
  try {
    const d = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + id + '/deployments', opsi);
    if (d.getResponseCode() === 200) {
      dep = (JSON.parse(d.getContentText()).deployments || []).map(function (x) {
        const c = x.deploymentConfig || {};
        return (c.versionNumber ? 'Versi ' + c.versionNumber : 'HEAD (kode terbaru)') + ' · ' + (c.description || '-') +
          ' · diperbarui ' + x.updateTime + ' · ' + x.deploymentId;
      }).join('\n');
    } else dep = 'Daftar deployment tidak terbaca (' + d.getResponseCode() + '): tambahkan cakupan script.deployments.readonly.';
  } catch (e) { dep = 'Daftar deployment tidak terbaca: ' + e.message; }
  folder.createFile('DEPLOYMENT.txt', 'Cadangan ' + nama + '\nProyek: ' + id + '\n' + files.length + ' file: ' +
    files.map(function (f) { return f.name; }).join(', ') + '\n\nDeployment:\n' + dep + '\n', MimeType.PLAIN_TEXT);

  props.setProperty('cadanganSidik', sidik);
  rapikanCadangan_(induk);
  Logger.log('Cadangan ' + files.length + ' file → ' + folder.getUrl());
  return folder.getUrl();
}

function folderCadangan_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('cadanganFolderId');
  if (id) {
    try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { /* terhapus */ }
  }
  const ada = DriveApp.getFoldersByName(CADANGAN_FOLDER);
  const f = ada.hasNext() ? ada.next() : DriveApp.createFolder(CADANGAN_FOLDER);
  props.setProperty('cadanganFolderId', f.getId());
  return f;
}

function rapikanCadangan_(induk) {
  const semua = [];
  const it = induk.getFolders();
  while (it.hasNext()) semua.push(it.next());
  semua.sort(function (a, b) { return b.getName() < a.getName() ? -1 : 1; });   // terbaru dulu (nama = tanggal)
  semua.slice(CADANGAN_SIMPAN).forEach(function (f) { f.setTrashed(true); });
}

function pasangPemicuCadangan() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'cadangkanKodeHarian') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('cadangkanKodeHarian').timeBased().everyDays(1).atHour(2).nearMinute(0).create();
  Logger.log('Pemicu cadangkanKodeHarian terpasang (setiap hari ±02.00).');
}
