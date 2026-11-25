// Pemeriksaan otomatis sebelum aplikasi tayang (dijalankan GitHub Actions, lihat .github/workflows/pages.yml).
// Bila ada yang gagal, deploy dibatalkan dan situs tetap memakai versi lama yang sehat.
//   1. File yang dipakai index.html dan sw.js (SHELL) ada di folder web/
//   2. manifest.json berformat JSON yang benar
//   3. Aplikasi dibuka di browser (Chromium) tanpa error JavaScript: layar login, dan sesudah login (data dari HP)
// Server Apps Script asli TIDAK dihubungi: semua permintaan ke script.google.com dijawab tiruan.
// Jalankan sendiri: node .github/scripts/cek-aplikasi.mjs   (perlu: npm install playwright)
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, normalize } from 'node:path';
import { createRequire } from 'node:module';

const WEB = join(process.cwd(), 'web');
const gagal = [];
const salah = (m) => { gagal.push(m); console.error('✗ ' + m); };
const benar = (m) => console.log('✓ ' + m);

// ---------- 1 & 2: berkas ----------
const html = readFileSync(join(WEB, 'index.html'), 'utf8');
const rujukan = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
  .filter((u) => !/^(https?:|data:|#|mailto:)/.test(u));
const sw = readFileSync(join(WEB, 'sw.js'), 'utf8');
const shell = (sw.match(/SHELL\s*=\s*\[([^\]]*)\]/) || [, ''])[1].match(/'([^']+)'/g) || [];
for (const f of new Set([...rujukan, ...shell.map((s) => s.slice(1, -1)).filter((s) => s !== './')])) {
  if (existsSync(join(WEB, f))) benar('ada: ' + f); else salah('file tidak ada di web/: ' + f);
}
try { JSON.parse(readFileSync(join(WEB, 'manifest.json'), 'utf8')); benar('manifest.json valid'); }
catch (e) { salah('manifest.json tidak valid: ' + e.message); }

// ---------- 3: buka aplikasi di browser ----------
const JENIS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = createServer((req, res) => {
  const jalur = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const f = join(WEB, jalur || 'index.html');
  if (!f.startsWith(WEB) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': JENIS[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const alamat = 'http://127.0.0.1:' + server.address().port + '/';

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();

async function uji(nama, siapkan) {
  const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: -8.2, longitude: 114.37 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // server Apps Script tiruan: jawaban kosong yang wajar
  await page.route(/script\.google(usercontent)?\.com/, (r) => {
    if (r.request().url().includes('action=logError')) errors.push('pengaman.js mengirim error: ' + (r.request().postData() || '').slice(0, 300));
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ error: 'uji otomatis' }) });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (siapkan) await page.addInitScript(siapkan);
  await page.goto(alamat, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const hasil = await page.evaluate(() => ({
    gagal: !!document.getElementById('cwGagal'),
    login: !document.getElementById('login').hidden,
    app: !document.getElementById('app').hidden,
    log: window.CW_PENGAMAN ? window.CW_PENGAMAN.log() : 'pengaman.js tidak termuat'
  }));
  if (errors.length) salah(nama + ': error JavaScript: ' + errors.join(' | '));
  else if (hasil.gagal) salah(nama + ': layar "Aplikasi gagal dibuka" muncul: ' + JSON.stringify(hasil.log));
  // versi lama (sebelum pengaman.js) tetap boleh ditayangkan saat rollback
  else if (typeof hasil.log === 'string' && html.includes('pengaman.js')) salah(nama + ': ' + hasil.log);
  else if (!hasil.login && !hasil.app) salah(nama + ': layar login maupun aplikasi tidak tampil');
  else benar(nama + ': terbuka tanpa error');
  await ctx.close();
}

await uji('Layar login (HP baru)');
await uji('Sudah login (NRP tersimpan di HP)', () => {
  if (!sessionStorage.getItem('uji')) { sessionStorage.setItem('uji', '1'); localStorage.setItem('cw_pin', '00000000'); }
});

await browser.close();
server.close();

if (gagal.length) {
  console.error('\nPEMERIKSAAN GAGAL (' + gagal.length + '). Aplikasi TIDAK ditayangkan; situs tetap versi sebelumnya.');
  process.exit(1);
}
console.log('\nSemua pemeriksaan lolos.');
