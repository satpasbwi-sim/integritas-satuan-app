// Pengaman aplikasi: dimuat SEBELUM app.js agar tetap bekerja walau app.js rusak.
// 1. Aplikasi gagal dibuka (error saat memulai) → data simpanan HP yang aman dibuang lalu dimuat ulang otomatis
//    satu kali. Masih gagal → layar "Aplikasi gagal dibuka" dengan tombol Coba lagi.
// 2. Error saat aplikasi sudah berjalan → bilah kecil "Terjadi gangguan · Muat ulang" (tidak menutup layar).
// 3. Error terakhir dicatat di HP (localStorage cw_err_log, maks 10) untuk diperiksa operator.
// Yang TIDAK pernah dihapus: ID HP, laporan tertunda (antrean), login NRP & kode admin.
(function () {
  'use strict';
  const PULIH = 'cw_pulih';          // {n: jumlah pemulihan otomatis, t: waktu terakhir}
  const LOG = 'cw_err_log';
  const SIMPAN = ['cw_hp', 'cw_antre', 'cw_luar', 'cw_pin', 'cw_kode'];   // jangan dihapus
  const JEDA_ULANG_MS = 5 * 60 * 1000;   // pemulihan otomatis hanya sekali per 5 menit (cegah muat ulang berulang)
  let siap = false;
  let bilahTampil = false;

  function baca(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function tulis(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* memori penuh / diblokir */ } }

  function teksError(err, pesan) {
    const e = err || {};
    return String((e && (e.stack || e.message)) || pesan || e || 'tidak diketahui').slice(0, 600);
  }

  function catat(jenis, teks) {
    try {
      const log = JSON.parse(baca(LOG) || '[]');
      log.push({ t: new Date().toISOString(), jenis, siap, teks, hal: location.pathname });
      tulis(LOG, JSON.stringify(log.slice(-10)));
    } catch (e) { tulis(LOG, '[]'); }
  }

  // error yang bukan dari kode aplikasi / bukan kerusakan: diabaikan
  function abaikan(teks) {
    return /^Script error\.?$|ResizeObserver loop|Failed to fetch|NetworkError|Load failed|AbortError|The user aborted|cancelled|chrome-extension:|moz-extension:|safari-extension:/i.test(teks);
  }

  // hapus data simpanan HP (cache tampilan) kecuali yang penting; Cache Storage aplikasi juga dibuang kecuali ID HP
  function bersihkan() {
    try {
      const kunci = [];
      for (let i = 0; i < localStorage.length; i++) kunci.push(localStorage.key(i));
      kunci.forEach((k) => { if (k && k.indexOf('cw_') === 0 && SIMPAN.indexOf(k) < 0 && k !== PULIH && k !== LOG) localStorage.removeItem(k); });
    } catch (e) { /* abaikan */ }
    try { sessionStorage.clear(); } catch (e) { /* abaikan */ }
    const tunggu = [];
    try {
      if (window.caches) tunggu.push(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== 'cw-id').map((k) => caches.delete(k)))));
    } catch (e) { /* abaikan */ }
    return Promise.all(tunggu).catch(() => {});
  }

  function muatUlang() { location.reload(); }

  function layarGagal() {
    if (document.getElementById('cwGagal')) return;
    const d = document.createElement('div');
    d.id = 'cwGagal';
    d.setAttribute('role', 'alert');
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f2341;color:#fff;display:flex;' +
      'align-items:center;justify-content:center;padding:24px;font:16px/1.5 system-ui,sans-serif;text-align:center';
    d.innerHTML = '<div style="max-width:360px">' +
      '<div style="font-size:42px">⚠️</div>' +
      '<h2 style="margin:8px 0">Aplikasi gagal dibuka</h2>' +
      '<p style="opacity:.85;margin:0 0 18px">Pastikan sinyal internet ada, lalu ketuk <b>Coba lagi</b>. ' +
      'Laporan yang tertunda dan login Anda tetap tersimpan.</p>' +
      '<button id="cwCoba" style="font:inherit;font-weight:700;padding:12px 28px;border:0;border-radius:10px;' +
      'background:#f5b301;color:#0f2341">Coba lagi</button>' +
      '<p style="opacity:.6;font-size:13px;margin-top:18px">Bila tetap gagal, laporkan ke operator.</p></div>';
    document.body.appendChild(d);
    document.getElementById('cwCoba').onclick = () => { tulis(PULIH, JSON.stringify({ n: 0, t: 0 })); bersihkan().then(muatUlang); };
  }

  function gagalMulai(teks) {
    catat('gagal-mulai', teks);
    let p = { n: 0, t: 0 };
    try { p = JSON.parse(baca(PULIH) || '{}') || p; } catch (e) { /* data rusak */ }
    if (!(p.n >= 1 && Date.now() - (p.t || 0) < JEDA_ULANG_MS)) {
      tulis(PULIH, JSON.stringify({ n: (p.n || 0) + 1, t: Date.now() }));
      bersihkan().then(muatUlang);
      return;
    }
    if (document.body) layarGagal(); else document.addEventListener('DOMContentLoaded', layarGagal);
  }

  function bilahGangguan() {
    if (bilahTampil || !document.body) return;
    bilahTampil = true;
    const b = document.createElement('div');
    b.id = 'cwGangguan';
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(52px + env(safe-area-inset-bottom));z-index:9999;' +
      'display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:#7a1d1d;color:#fff;' +
      'font:14px/1.35 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3)';
    b.innerHTML = '<span style="flex:1">Terjadi gangguan pada aplikasi.</span>' +
      '<button style="font:inherit;font-weight:700;border:0;border-radius:8px;padding:7px 12px;background:#fff;color:#7a1d1d">Muat ulang</button>' +
      '<button aria-label="Tutup" style="font:inherit;font-size:20px;border:0;background:none;color:#fff;padding:0 4px">×</button>';
    const tombol = b.querySelectorAll('button');
    tombol[0].onclick = muatUlang;
    tombol[1].onclick = () => { b.remove(); };
    document.body.appendChild(b);
  }

  function tangani(teks) {
    if (abaikan(teks)) return;
    if (!siap) { gagalMulai(teks); return; }
    catat('error', teks);
    bilahGangguan();
  }

  window.addEventListener('error', (ev) => {
    // error memuat file (script/gambar) tidak punya ev.error; file app.js/config.js gagal dimuat ditangani lewat 'load'
    if (ev.target && ev.target !== window) return;
    tangani(teksError(ev.error, ev.message));
  }, true);

  window.addEventListener('unhandledrejection', (ev) => { tangani(teksError(ev.reason)); });

  // app.js memanggil CW_PENGAMAN.siap() setelah selesai memulai. Bila belum dipanggil saat halaman selesai dimuat,
  // berarti app.js tidak termuat / rusak.
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (siap) return;
      // app.js versi lama (dari cache HP) belum memanggil siap(): anggap berhasil bila layar login / aplikasi tampil
      const tampil = (id) => { const el = document.getElementById(id); return el && !el.hidden; };
      if (tampil('app') || tampil('login')) window.CW_PENGAMAN.siap();
      else gagalMulai('app.js tidak selesai dimuat');
    }, 1500);
  });

  window.CW_PENGAMAN = {
    siap() {
      siap = true;
      // berjalan normal 15 detik → penghitung pemulihan otomatis dikosongkan
      setTimeout(() => { if (baca(PULIH)) tulis(PULIH, JSON.stringify({ n: 0, t: 0 })); }, 15000);
    },
    log() { try { return JSON.parse(baca(LOG) || '[]'); } catch (e) { return []; } }
  };
})();
