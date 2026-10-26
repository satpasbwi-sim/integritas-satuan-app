// PANTAUAN PENGAWAS & ADMIN – tab "Pantauan" di aplikasi (GET action=pantauan), hanya membaca sheet yang sudah ada:
//   hariIni     : siapa sudah / belum Ceklok Masuk (Satpas) dan Lapor Datang (CW Pagi, admin saja) saat ini
//   pola        : kejadian mencurigakan 7 hari terakhir per orang (LOG LAPOR, LOG CEKLOK, LUAR RADIUS)
//   persetujuan : pengajuan izin / tugas mendadak yang belum diputuskan (sheet PERSETUJUAN) dan yang sering mengajukan
// Pengawas (NRP_PENGAWAS) hanya melihat anggota Satpas (Ceklok), sama seperti Rekap Integritas; admin melihat semua.
//   foto        : foto FOTO_SIMPAN_HARI hari terakhir yang belum diisi CEK FOTO (sebelum terhapus otomatis)
//   hp          : HP baru yang menunggu izin (sheet PERANGKAT)
// Keputusan bisa diisi di spreadsheet atau lewat tombol di aplikasi (Keputusan.gs, memakai ref baris dari sini).
// Rancangan: catatan-lanjutan/PANTAUAN-PENGAWAS.md

const PANTAU_HARI = 7;            // jendela "Mencurigakan" (hari, termasuk hari ini)
const PANTAU_TUNDA_MIN = 2;       // laporan tertunda (sinyal putus) baru dicurigai bila sekian kali dalam jendela
const PANTAU_MIRIP_M = 2;         // posisi "nyaris sama" bila berjarak ≤ ini (GPS asli biasanya bergeser 3–15 m tiap hari)
const PANTAU_MIRIP_HARI = 3;      // ... di sekian hari berbeda
const PANTAU_MIRIP_AKURASI = 20;  // hanya titik dengan akurasi ≤ ini (m) yang dibandingkan
const PANTAU_SERING_MIN = 3;      // "sering mengajukan" bila sekian pengajuan dalam bulan berjalan
const PANTAU_BOBOT = { lokasi: 3, luar: 2, foto: 2, mirip: 2, tunda: 1 };
const PANTAU_CACHE_DETIK = 300;   // bagian pola & foto (membaca seluruh LOG); hari ini & persetujuan selalu terkini
const PANTAU_FOTO_MAKS = 150;     // daftar "Cek foto": paling banyak sekian foto terbaru yang belum dicek
// Sementara aplikasi berjalan resmi bertahap: Pantauan hanya menampilkan anggota di NRP_RESMI (ModeResmi.gs,
// Polri + PHL Satpas); anggota lain tidak ditampilkan. false = semua anggota seperti sebelumnya.
const PANTAU_HANYA_RESMI = true;
const PANTAU_KUNCI = 'pantauan3|';   // kunci cache pola & foto; dihapus setiap ada keputusan (Keputusan.gs)

function hapusCachePantau_() {
  CacheService.getScriptCache().removeAll([PANTAU_KUNCI + 'semua', PANTAU_KUNCI + 'satpas']);
}

/**
 * Orang yang boleh tampil di Pantauan → kel(nrp, nama): 'polri' | 'phl' | '' (tidak ditampilkan).
 * PHL = pangkat PHL di Data Satpas; nama dari Data Satpas dan sheet ANGGOTA (Lapor CW hanya punya nama petugas).
 */
function pesertaPantau_(ss) {
  const nrp = {}, nama = {}, anggota = [];   // anggota: {nama, nrp} dari sheet ANGGOTA (untuk baris pos / piket CW)
  const boleh = function (n) { return !!n && (!PANTAU_HANYA_RESMI || resmiNrp_(n)); };
  try {
    satpasDaftar_().forEach(function (a) {
      if (!boleh(a.nrp)) return;
      const k = /^PHL$/i.test(a.pangkat) ? 'phl' : 'polri';
      nrp[normIdSatpas_(a.nrp)] = k;
      nama[normNama_(a.nama)] = k;
    });
  } catch (e) { /* Data Satpas tidak terbaca: hanya dari ANGGOTA */ }
  const sh = ensureAnggota_(ss);
  if (sh.getLastRow() >= 2) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(function (r) {
      const n = normIdSatpas_(normNrp_(r[1]));
      if (!r[0] || !boleh(n)) return;
      if (!nrp[n]) nrp[n] = 'polri';
      if (!nama[normNama_(r[0])]) nama[normNama_(r[0])] = nrp[n];
      anggota.push({ nama: String(r[0]).trim(), nrp: n });
    });
  }
  return {
    anggota: anggota,
    kel: function (n, nm) {
      const id = normIdSatpas_(n);
      if (id && nrp[id]) return nrp[id];
      if (nm && nama[normNama_(nm)]) return nama[normNama_(nm)];
      return PANTAU_HANYA_RESMI ? '' : 'polri';
    }
  };
}

function pantauanData_(who) {
  const semua = who.role === 'admin';
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const now = new Date();
  const peserta = pesertaPantau_(ss);
  const out = {
    lingkup: semua ? 'semua' : 'satpas',
    hanyaResmi: PANTAU_HANYA_RESMI,
    diperbarui: Utilities.formatDate(now, tz, 'dd/MM HH.mm'),
    hariIni: { tgl: Utilities.formatDate(now, tz, 'yyyy-MM-dd'), jam: Utilities.formatDate(now, tz, 'HH.mm') }
  };
  try { out.hariIni.ceklok = pantauCeklokHariIni_(tz, now, peserta); } catch (e) { out.hariIni.ceklok = { error: 'Ceklok: ' + e.message }; }
  out.hariIni.cw = null;
  if (semua) { try { out.hariIni.cw = pantauCwHariIni_(ss, tz, now, peserta); } catch (e) { out.hariIni.cw = { error: 'CW: ' + e.message }; } }
  const cache = CacheService.getScriptCache();
  const kunci = PANTAU_KUNCI + out.lingkup;   // dihapus Keputusan.gs setiap ada keputusan dari aplikasi
  const simpan = cache.get(kunci);
  if (simpan) { const c = JSON.parse(simpan); out.pola = c.pola; out.foto = c.foto; }
  else {
    try {
      const baca = bacaKejadianPantau_(ss, tz, now, semua, peserta);
      out.pola = hitungPolaPantau_(baca.kejadian, PANTAU_HARI);
      out.foto = baca.foto;
      try { cache.put(kunci, JSON.stringify({ pola: out.pola, foto: out.foto }), PANTAU_CACHE_DETIK); } catch (e) { /* terlalu besar: abaikan */ }
    } catch (e) { out.pola = { error: 'Pola: ' + e.message }; out.foto = []; }
  }
  try { out.persetujuan = pantauPersetujuan_(ss, tz, now, semua, peserta); } catch (e) { out.persetujuan = { error: 'Persetujuan: ' + e.message }; }
  try {
    out.hp = (typeof pantauHpBaru_ === 'function' ? pantauHpBaru_(ss, tz, semua) : []).filter(function (h) {
      const kel = peserta.kel(h.nrp, h.nama);
      h.phl = kel === 'phl';
      return !!kel;
    });
  } catch (e) { out.hp = []; }
  out.cekFoto = Object.keys(CEK_FOTO);   // pilihan chip CEK FOTO, urutan sama dengan spreadsheet
  return out;
}

// ---------- Hari ini: Ceklok Satpas ----------
const PANTAU_URUT_CK = ['belum', 'izin_tolak', 'izin_menunggu', 'terlambat', 'nanti', 'hadir', 'keluar', 'pulang', 'izin'];

function pantauCeklokHariIni_(tz, now, peserta) {
  const ssS = SpreadsheetApp.openById(SATPAS_SS_ID);
  const libur = liburSatpas_(ssS, tz);
  const umum = jadwalSatpas_(now, tz, libur, null);
  const ringkas = { hadir: 0, terlambat: 0, belum: 0, izin: 0, total: 0 };
  if (!umum.kerja) return { libur: umum.libur || 'Libur', ringkas: ringkas, baris: [] };
  const rows = barisCeklok_(ensureLogCeklok_(ssS), 600);
  const setuju = bacaPersetujuan_(umum.tgl.slice(0, 7)).ck;
  const mnt = nowMenit_(SpreadsheetApp.getActive(), now);
  const baris = satpasDaftar_().filter(function (a) { return !pengawas_(a.nrp) && peserta.kel(a.nrp, a.nama); }).map(function (a) {
    const j = jadwalSatpas_(now, tz, libur, a.nrp);
    const h = ceklokHari_(rows, tz, j.tgl, a.nrp);
    const b = { nrp: a.nrp, nama: a.nama, pokja: a.pokja, masuk: h.masuk ? h.masuk.jam : '', telat: 0,
      pulang: h.pulang ? h.pulang.jam : '', ket: '', peringatan: false, ujiCoba: ujiCoba_(a.nrp), phl: peserta.kel(a.nrp, a.nama) === 'phl' };
    [h.masuk, h.pulang, h.keluar].forEach(function (x) { if (x && x.peringatan && x.verif !== 'ASLI') b.peringatan = true; });
    if (h.tidak) {
      const st = (setuju[a.nrp + '|' + j.tgl] || {}).tidak;
      b.status = !st || st === 'SETUJU' ? 'izin' : st === 'TOLAK' ? 'izin_tolak' : 'izin_menunggu';
      b.ket = h.tidak.kode;
    } else if (h.masuk) {
      b.telat = h.masuk.selisih > 0 ? h.masuk.selisih : 0;
      b.status = h.pulang ? 'pulang' : h.keluar ? 'keluar' : b.telat ? 'terlambat' : 'hadir';
      if (h.keluar) b.ket = h.keluar.ket || '';
    } else b.status = j.masuk != null && mnt > j.masuk ? 'belum' : 'nanti';
    return b;
  });
  baris.forEach(function (b) {
    ringkas.total++;
    if (b.masuk) ringkas.hadir++;
    if (b.telat) ringkas.terlambat++;
    if (b.status === 'belum') ringkas.belum++;
    if (/^izin/.test(b.status)) ringkas.izin++;
  });
  baris.sort(function (x, y) {
    return PANTAU_URUT_CK.indexOf(x.status) - PANTAU_URUT_CK.indexOf(y.status) || x.nama.localeCompare(y.nama);
  });
  return { libur: '', ringkas: ringkas, baris: baris };
}

// ---------- Hari ini: CW Pagi (admin) ----------
const PANTAU_URUT_CW = ['belum', 'nihil', 'datang', 'nanti', 'tidak', 'tinggal', 'selesai', 'kode'];

function pantauCwHariIni_(ss, tz, now, peserta) {
  const tgl = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  const ringkas = { datang: 0, selesai: 0, terlambat: 0, belum: 0, tidak: 0, total: 0 };
  if (cwLibur_(tgl)) return { libur: 'Sabtu / Minggu: tidak ada CW Pagi', ringkas: ringkas, baris: [] };
  const day = todayInSheet_(ss, now);
  if (!day) return { libur: 'Sheet ABSENSI bukan bulan berjalan (Ganti Bulan belum dijalankan)', ringkas: ringkas, baris: [] };
  const d = getData_(day, null);
  const batas = d.jadwal.batasDatang;
  const mnt = nowMenit_(ss, now);
  const label = {};
  (d.codes || []).forEach(function (c) { label[c.code] = c.label; });
  const pos = pantauBarisPos_(ss, d.rows, peserta);
  const baris = d.rows.filter(function (r) { return (r.petugas && peserta.kel('', r.petugas)) || pos[String(r.no)]; }).map(function (r) {
    const L = d.lapor[String(r.no)] || {};
    const p = !peserta.kel('', r.petugas) && pos[String(r.no)];   // baris pos / piket: nama anggota + nama baris
    const b = { no: String(r.no), petugas: p ? p.join(', ') + (r.petugas ? ' · ' + r.petugas : '') : r.petugas, lokasi: r.lokasi, datang: L.datang ? L.datang.jam : '',
      selesai: L.selesai ? L.selesai.jam : L.tinggal ? L.tinggal.jam : '', telat: 0, kode: '', ket: '', phl: peserta.kel('', r.petugas) === 'phl' };
    if (L.datang) b.telat = Math.max(0, Math.floor(menitJamTitik_(L.datang.jam) - batas));
    // Nihil yang sudah ASLI (ABSENSI sudah H) tidak lagi "Diperiksa"
    if (L.diperiksa || (L.st === KODE_NIHIL && r.status !== 'H')) b.status = 'nihil';
    else if (L.tinggal) { b.status = 'tinggal'; b.ket = L.tinggal.ket || ''; }
    else if (L.st === 'H' || L.st === KODE_NIHIL) b.status = 'selesai';
    else if (L.tidak) { b.status = 'tidak'; b.kode = L.st; b.ket = label[L.st] || L.st; }
    else if (L.datang) b.status = 'datang';
    else if (r.status) { b.status = 'kode'; b.kode = r.status; b.ket = label[r.status] || r.status; }
    else b.status = mnt > batas ? 'belum' : 'nanti';
    return b;
  });
  baris.forEach(function (b) {
    ringkas.total++;
    if (b.datang) ringkas.datang++;
    if (b.status === 'selesai' || b.status === 'tinggal') ringkas.selesai++;
    if (b.telat) ringkas.terlambat++;
    if (b.status === 'belum') ringkas.belum++;
    if (b.status === 'tidak') ringkas.tidak++;
  });
  baris.sort(function (x, y) {
    return PANTAU_URUT_CW.indexOf(x.status) - PANTAU_URUT_CW.indexOf(y.status) || Number(x.no) - Number(y.no);
  });
  return { libur: '', batasDatang: ('0' + Math.floor(batas / 60)).slice(-2) + '.' + ('0' + batas % 60).slice(-2), ringkas: ringkas, baris: baris };
}

/**
 * Anggota resmi yang namanya tidak tercantum di ABSENSI (pos jaga / Piket BM / Patwal / Laka) → no baris → [nama].
 * Barisnya dicari dengan urutan yang sama seperti login (auth_ di Code.gs), jadi Lapor CW mereka di baris pos tetap
 * tampil di Pantauan (juga saat belum lapor). Pengawas tidak dihitung. Hanya bila PANTAU_HANYA_RESMI (daftar kecil).
 */
function pantauBarisPos_(ss, rows, peserta) {
  const out = {};
  if (!PANTAU_HANYA_RESMI) return out;
  const tercantum = {};
  rows.forEach(function (r) { tercantum[normNama_(r.petugas)] = 1; });
  peserta.anggota.forEach(function (a) {
    if (tercantum[normNama_(a.nama)] || pengawas_(a.nrp)) return;
    try {
      let p = barisPiket_(ss, a.nama);
      if (!p.no && !p.alasan) p = barisPatwal_(ss, a.nrp);
      if (!p.no && !p.alasan) p = barisLaka_(ss, a.nrp, a.nama);
      if (p.no) (out[String(p.no)] = out[String(p.no)] || []).push(a.nama);
    } catch (e) { /* jadwal piket tidak terbaca: lewati orang ini */ }
  });
  return out;
}

// ---------- Mencurigakan ----------
// Semua baris LOG LAPOR / LOG CEKLOK / LUAR RADIUS dalam jendela → {kejadian mentah, foto belum dicek}
// (tanpa SpreadsheetApp di hitungPolaPantau_). Tiap baris LOG membawa ref {sumber, baris, ms, nama} untuk Keputusan.gs.
function bacaKejadianPantau_(ss, tz, now, semua, peserta) {
  const mulai = Utilities.formatDate(new Date(now.getTime() - (PANTAU_HARI - 1) * 86400000), tz, 'yyyy-MM-dd');
  const mulaiFoto = Utilities.formatDate(new Date(now.getTime() - (FOTO_SIMPAN_HARI - 1) * 86400000), tz, 'yyyy-MM-dd');
  const out = [], foto = [];
  const baca = function (sh, sumber) {
    if (!sh || sh.getLastRow() < 2) return;
    const lebar = Math.min(KOL_CEK_FOTO, sh.getMaxColumns());
    sh.getRange(2, 1, sh.getLastRow() - 1, lebar).getValues().forEach(function (r, i) {
      if (!(r[0] instanceof Date)) return;
      const tgl = Utilities.formatDate(r[0], tz, 'yyyy-MM-dd');
      if (tgl < mulai) return;
      const k = { sumber: sumber, tgl: tgl, jam: Utilities.formatDate(r[0], tz, 'HH.mm'),
        nama: String(r[3] || '').trim(), nrp: sumber === 'CEKLOK' ? normIdSatpas_(r[2]) : '',
        status: String(r[sumber === 'CEKLOK' ? 4 : 5] || ''), acc: r[7] === '' ? null : Number(r[7]), peta: String(r[8] || ''),
        foto: driveId_(r[9]) ? String(r[9]) : '', catatan: String(r[10] || ''), peringatan: String(r[11] || ''),
        verif: String(r[12] || '').trim().toUpperCase(), cekFoto: lebar >= KOL_CEK_FOTO ? String(r[13] || '').trim().toUpperCase() : '',
        ref: { sumber: sumber, baris: i + 2, ms: r[0].getTime(), nama: String(r[3] || '').trim() } };
      const kel = peserta.kel(k.nrp, k.nama);
      if (!kel) return;
      k.phl = kel === 'phl';
      out.push(k);
      if (k.foto && !k.cekFoto && tgl >= mulaiFoto) {
        foto.push({ tgl: tgl, jam: k.jam, nama: k.nama, sumber: sumber, tahap: tahapPantau_(k), foto: k.foto,
          ragu: !!k.peringatan && k.verif !== 'ASLI', phl: k.phl, ref: k.ref });
      }
    });
  };
  if (semua) baca(ss.getSheetByName(SHEET_LOG), 'CW');
  baca(SpreadsheetApp.openById(SATPAS_SS_ID).getSheetByName(SATPAS_SHEET_LOG), 'CEKLOK');
  const shL = ss.getSheetByName(SHEET_LUAR);
  if (shL && shL.getLastRow() >= 2) {
    shL.getRange(2, 1, shL.getLastRow() - 1, LUAR_HEADER.length).getDisplayValues().forEach(function (r) {
      const tgl = String(r[1]);
      if (tgl < mulai || (!semua && r[4] !== 'CEKLOK')) return;
      const kel = peserta.kel(r[2], r[3]);
      if (!kel) return;
      out.push({ phl: kel === 'phl', sumber: r[4] === 'CEKLOK' ? 'CEKLOK' : 'CW', luar: true, tgl: tgl, jam: String(r[5]), nama: String(r[3]).trim(),
        nrp: normIdSatpas_(r[2]), durasi: Number(r[6]) || 0, jarak: r[7], peta: String(r[9] || '') });
    });
  }
  foto.sort(function (a, b) { return b.ref.ms - a.ref.ms; });
  return { kejadian: out, foto: foto.slice(0, PANTAU_FOTO_MAKS) };
}

function tahapPantau_(k) {
  return k.sumber === 'CEKLOK' ? 'Ceklok ' + k.status.toLowerCase() : 'Lapor ' + (k.status === 'DATANG' ? 'datang' : k.status === 'H' ? 'selesai' : k.status.toLowerCase());
}

// inti aturan (bisa diuji terpisah): kejadian mentah → {hari, daftar: [{nama, nrp, bobot, ringkas, kejadian}]}
function hitungPolaPantau_(mentah, hari) {
  const orang = {};
  const ambil = function (k) {
    const kunci = normNama_(k.nama) || k.nrp;
    return orang[kunci] = orang[kunci] || { nama: k.nama, nrp: k.nrp || '', phl: !!k.phl, kejadian: [], tunda: [], titik: [] };
  };
  mentah.forEach(function (k) {
    if (!k.nama && !k.nrp) return;
    const o = ambil(k);
    if (k.nrp && !o.nrp) o.nrp = k.nrp;
    const dasar = { tgl: k.tgl, jam: k.jam, sumber: k.sumber, peta: k.peta || '', foto: k.foto || '' };
    if (k.luar) {
      o.kejadian.push(Object.assign({ jenis: 'luar', ket: 'Di luar radius ' + k.durasi + ' menit' +
        (k.jarak !== '' && k.jarak != null ? ' (maks ' + k.jarak + ' m)' : '') + ' setelah ' + (k.sumber === 'CEKLOK' ? 'Ceklok Masuk' : 'Lapor Datang') }, dasar));
      return;
    }
    const tahap = tahapPantau_(k);
    if (k.peringatan && k.verif !== 'ASLI') {
      o.kejadian.push(Object.assign({ jenis: 'lokasi', ket: tahap + ': ' + k.peringatan.replace(/^⚠️\s*/, '') +
        (k.verif === 'PALSU' ? ' · diverifikasi PALSU' : ' · belum diverifikasi'), verif: k.verif, ref: k.ref }, dasar));
    }
    if (k.cekFoto && k.cekFoto !== 'SESUAI') o.kejadian.push(Object.assign({ jenis: 'foto', ket: tahap + ': cek foto ' + k.cekFoto, cekFoto: k.cekFoto, ref: k.ref }, dasar));
    const t = /tertunda (\d+) mnt/.exec(k.catatan || '');
    if (t) o.tunda.push(Object.assign({ jenis: 'tunda', ket: tahap + ' tertunda ' + t[1] + ' menit (sinyal putus)' }, dasar));
    const m = /[?&]q=(-?[\d.]+),(-?[\d.]+)/.exec(k.peta || '');
    if (m && k.acc != null && isFinite(k.acc) && k.acc <= PANTAU_MIRIP_AKURASI) {
      o.titik.push({ tgl: k.tgl, lat: Number(m[1]), lng: Number(m[2]), sumber: k.sumber, peta: k.peta });
    }
  });
  const daftar = [];
  Object.keys(orang).forEach(function (kunci) {
    const o = orang[kunci];
    if (o.tunda.length >= PANTAU_TUNDA_MIN) o.tunda.forEach(function (x) { o.kejadian.push(x); });
    const mirip = posisiMiripPantau_(o.titik);
    if (mirip) o.kejadian.push(mirip);
    if (!o.kejadian.length) return;
    const ringkas = {};
    let bobot = 0;
    o.kejadian.forEach(function (x) { ringkas[x.jenis] = (ringkas[x.jenis] || 0) + 1; bobot += PANTAU_BOBOT[x.jenis] || 1; });
    o.kejadian.sort(function (a, b) { return (b.tgl + b.jam).localeCompare(a.tgl + a.jam); });
    daftar.push({ nama: o.nama, nrp: o.nrp, phl: o.phl, bobot: bobot, ringkas: ringkas, kejadian: o.kejadian.slice(0, 20) });
  });
  daftar.sort(function (a, b) { return b.bobot - a.bobot || a.nama.localeCompare(b.nama); });
  return { hari: hari, daftar: daftar };
}

// titik dengan posisi nyaris sama (≤ PANTAU_MIRIP_M) di ≥ PANTAU_MIRIP_HARI hari berbeda → satu kejadian 'mirip'
function posisiMiripPantau_(titik) {
  let terbaik = null;
  titik.forEach(function (p) {
    const hari = {};
    titik.forEach(function (q) {
      if (jarakPantau_(p.lat, p.lng, q.lat, q.lng) <= PANTAU_MIRIP_M) hari[q.tgl] = 1;
    });
    const n = Object.keys(hari).length;
    if (n >= PANTAU_MIRIP_HARI && (!terbaik || n > terbaik.n)) terbaik = { n: n, hari: Object.keys(hari).sort(), p: p };
  });
  if (!terbaik) return null;
  const akhir = terbaik.hari[terbaik.hari.length - 1];
  return { jenis: 'mirip', tgl: akhir, jam: '', sumber: terbaik.p.sumber, peta: terbaik.p.peta, foto: '',
    ket: 'Posisi nyaris sama (≤' + PANTAU_MIRIP_M + ' m) di ' + terbaik.n + ' hari berbeda: ' +
      terbaik.hari.map(function (t) { return Number(t.slice(8)) + '/' + Number(t.slice(5, 7)); }).join(', ') +
      '. GPS asli biasanya bergeser beberapa meter tiap hari – cek foto & lokasinya.' };
}

function jarakPantau_(lat1, lng1, lat2, lng2) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- Persetujuan ----------
function pantauPersetujuan_(ss, tz, now, semua, peserta) {
  const sh = ss.getSheetByName(SHEET_PERSETUJUAN);
  const out = { menunggu: [], sering: [] };   // diputuskan lewat HP (tab Pantauan), tanpa tautan spreadsheet
  if (!sh || sh.getLastRow() < 2) return out;
  const hariIni = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  const waktu = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();   // ms untuk ref keputusan (Keputusan.gs)
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, SETUJU_HEADER.length).getDisplayValues()
    .map(function (r, i) { return { tgl: String(r[1]), nrp: String(r[2]), nama: String(r[3]).trim(), jenis: String(r[4]),
      pengajuan: String(r[5]), ket: String(r[6]), keputusan: String(r[7]).trim().toUpperCase(),
      ref: waktu[i][0] instanceof Date ? { sumber: 'SETUJU', baris: i + 2, ms: waktu[i][0].getTime(), nama: String(r[3]).trim() } : null,
      kel: peserta ? peserta.kel(r[2], r[3]) : 'polri' }; })
    .filter(function (r) { return r.kel; });
  return hitungPersetujuanPantau_(rows, hariIni, semua, out);
}

function hitungPersetujuanPantau_(rows, hariIni, semua, out) {
  const bulan = hariIni.slice(0, 7);
  const hitung = {};
  rows.forEach(function (r) {
    if (!semua && r.jenis !== 'CEKLOK') return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.tgl)) return;
    const st = r.keputusan === 'SETUJU' || r.keputusan === 'TOLAK' ? r.keputusan : 'MENUNGGU';
    if (st === 'MENUNGGU') {
      out.menunggu.push({ tgl: r.tgl, umur: selisihHariPantau_(r.tgl, hariIni), nama: r.nama, jenis: r.jenis,
        pengajuan: r.pengajuan, ket: r.ket, phl: r.kel === 'phl', ref: r.ref || null });
    }
    // lembur bukan pelanggaran: tidak dihitung di "sering mengajukan"
    if (r.tgl.slice(0, 7) !== bulan || /^Lembur/.test(r.pengajuan)) return;
    const k = normNama_(r.nama);
    const h = hitung[k] = hitung[k] || { nama: r.nama, phl: r.kel === 'phl', jumlah: 0, setuju: 0, tolak: 0, menunggu: 0 };
    h.jumlah++;
    h[st.toLowerCase()]++;
  });
  out.menunggu.sort(function (a, b) { return b.tgl.localeCompare(a.tgl) || a.nama.localeCompare(b.nama); });
  out.menunggu = out.menunggu.slice(0, 100);
  out.sering = Object.keys(hitung).map(function (k) { return hitung[k]; })
    .filter(function (h) { return h.jumlah >= PANTAU_SERING_MIN; })
    .sort(function (a, b) { return b.jumlah - a.jumlah || a.nama.localeCompare(b.nama); });
  return out;
}

function selisihHariPantau_(a, b) {
  const t = function (s) { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); };
  return Math.round((t(b) - t(a)) / 86400000);
}

// Jalankan dari editor Apps Script (sebagai admin) untuk melihat hasil di Log eksekusi.
function ujiPantauan() {
  hapusCachePantau_();
  const d = pantauanData_({ role: 'admin' });
  const ck = d.hariIni.ceklok || {}, cw = d.hariIni.cw || {};
  Logger.log('hariIni ' + d.hariIni.tgl + ' ' + d.hariIni.jam +
    ' · ceklok ' + (ck.error || ck.libur || JSON.stringify(ck.ringkas)) +
    ' · cw ' + (cw.error || cw.libur || JSON.stringify(cw.ringkas)));
  Logger.log('pola ' + (d.pola.error || d.pola.daftar.length + ' orang') + ' · persetujuan ' +
    (d.persetujuan.error || d.persetujuan.menunggu.length + ' menunggu, ' + d.persetujuan.sering.length + ' sering') +
    ' · foto belum dicek ' + (d.foto || []).length + ' · HP baru ' + (d.hp || []).length);
  Logger.log(JSON.stringify(d).slice(0, 6000));
}
