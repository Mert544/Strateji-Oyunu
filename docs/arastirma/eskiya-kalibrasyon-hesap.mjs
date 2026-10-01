#!/usr/bin/env node
// Eşkıya (askeri 0a/0b) sayılarının kâğıt-model kalibrasyonu (A2). Yeniden üretim:
//   node docs/arastirma/eskiya-kalibrasyon-hesap.mjs <ilce-nufus.tsv> > docs/arastirma/eskiya-kalibrasyon-hesap-cikti.md
// Girdi: T3 `ilce-nufus.tsv` (TÜİK ADNKS 2025, ikincil derleme; yalnız ilçe başına oyuncu sayısını dağıtmak için) ve sabitler (aşağıda,
// kaynakları yorumda). Rastgelelik: sabit tohumlu mulberry32 (aynı girdi, aynı çıktı). Çekirdek koşulmaz; kâğıt model.

import fs from "node:fs";

const nokta = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const tam = (x) => nokta(String(Math.round(x)));
const ond = (x, d = 1) => x.toFixed(d).replace(".", ",");
const yuzde = (x, d = 1) => `%${ond(x * 100, d)}`;
const satir = (...h) => `| ${h.join(" | ")} |`;
const baslik = (...h) => `${satir(...h)}\n|${h.map(() => "---").join("|")}|`;
const cikti = [];
const yaz = (s = "") => cikti.push(s);

const TSV = process.argv[2];
if (TSV === undefined) {
  console.error("kullanım: node eskiya-kalibrasyon-hesap.mjs <ilce-nufus.tsv>");
  process.exit(2);
}
const ILCELER = fs
  .readFileSync(TSV, "utf8")
  .split("\n")
  .slice(1)
  .filter((x) => x.trim() !== "")
  .map((x) => x.split("\t"))
  .map((c) => ({ ad: c[1], N: Number(c[3]) }));
const TOPLAM_N = ILCELER.reduce((t, x) => t + x.N, 0);
const OYUNCU = 200;
const NK = ILCELER.map((x) => Math.max(1, Math.round((OYUNCU * x.N) / TOPLAM_N))); // ilçe başına oyuncu (nüfusla orantılı, en az 1)

// ------------------------------------------------------------------------------------------------ sabitler (kaynaklı)
// A2 para dengesi modeli (yerel-talep-kalibrasyon §7): ekmek zinciri oyuncusu, yerelOlcek 40; günlük net ≈ 117.053 ₺, günlük brüt ≈ 140.000 ₺.
const NET_GUN = 117053;
const BRUT_GUN = 140000;
const SERVET0 = 72000; // P4 yapıları taban değeri 64.280 + 7 hücre (≈ 1.000–1.300 ₺) ≈ 72 bin ₺ (p4-p5-ekonomi §1.7)
const KALKAN_GUN = 7; // parametreler.json askeri.yeniOyuncuKorumasiGun
// AK Ek A fiyatları (askeri-katman-v1.md): ₺
const MALIYET = { ordugah: 35000, karakol: 7840, kule: 4100, tumen: 8700 };
const GIDER_GUN = { tumen: 1752, karakol: 168 }; // Hesap B (ikmal ×0,25 + maaş)
// 0a önerileri (askeri-0a-sartname §4.1; değiştirilebilir)
const ONERI = { esik: 250000, adim: 250000, enCokBoy: 8, boyGucu: 100, p: 1 / 3, bekleme: 4, yagma: 0.1, yapiDevre: 0.1, birlikKayip: 0.15 };

// ------------------------------------------------------------------------------------------------ PRNG ve yardımcılar
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Savunma kazanma olasılığı: Gs·Us ≥ Gb·Ub, Us, Ub ~ U[0,9; 1,1] bağımsız (sayısal ızgara 400×400)
function pKazan(gs, gb) {
  if (gb <= 0) return 1;
  let k = 0;
  const m = 400;
  for (let i = 0; i < m; i++) {
    const us = 0.9 + (0.2 * (i + 0.5)) / m;
    for (let j = 0; j < m; j++) {
      const ub = 0.9 + (0.2 * (j + 0.5)) / m;
      if (gs * us >= gb * ub) k++;
    }
  }
  return k / (m * m);
}
const servetOyuncu = (gun, r) => SERVET0 + r * NET_GUN * Math.max(0, gun - 1);
const boyHesap = (S, p) => (S < p.esik ? 0 : Math.min(p.enCokBoy, Math.floor(S / p.adim)));

yaz("# Eşkıya kalibrasyonu: hesap çıktısı (otomatik üretildi)");
yaz();
yaz(`Girdi: T3 ilçe nüfus tablosu (yalnız oyuncu dağıtımı; ${OYUNCU} oyuncu, 45 ilçe, nüfusla orantılı, en az 1; oyuncu/ilçe: medyan ${[...NK].sort((a, b) => a - b)[22]}, ortalama ${ond(OYUNCU / 45, 1)}, en çok ${Math.max(...NK)}). Sabitler: oyuncu günlük net ${tam(NET_GUN)} ₺ ve brüt ${tam(BRUT_GUN)} ₺ (yerel-talep-kalibrasyon §7, ekmek zinciri, yerelOlcek 40), başlangıç serveti ${tam(SERVET0)} ₺, yeni oyuncu kalkanı ${KALKAN_GUN} gün.`);
yaz();

// ------------------------------------------------------------------------------------------------ 1 savunma kazanma olasılığı
yaz("## 1. Savunma kazanma olasılığı (çözümde ±%10 bağımsız sapma)");
yaz();
yaz(baslik("Gs / Gb", "Kazanma olasılığı"));
for (const r of [0.5, 0.8, 0.9, 1.0, 1.1, 1.2, 1.25, 1.5, 2.0]) yaz(satir(ond(r, 2), yuzde(pKazan(r * 100, 100), 0)));
yaz();
yaz("Gs = Gb iken kazanma ≈ %50 (eşitlik savunana, ama sapmalar bağımsız çekilir); Gs ≥ 1,22 Gb iken kesin (%100).");
yaz();

// ------------------------------------------------------------------------------------------------ 2 baskın sıklığı
function baskinSimule(p, r, tohum, gunSayisi, nk) {
  // Her ilçe için: planlama günü d'de (S ≥ eşik ve bekleme bitmiş) olasılıkla p baskın planlanır; baskın günü d+2. Bekleme: son planlamadan `bekleme` gün.
  const rnd = mulberry32(tohum);
  const baskin = nk.map(() => []);
  nk.forEach((n, i) => {
    let son = -1000;
    for (let d = KALKAN_GUN; d < KALKAN_GUN + gunSayisi; d++) {
      const S = n * servetOyuncu(d, r);
      if (S < p.esik || d - son < p.bekleme) continue;
      if (rnd() < p.p) {
        baskin[i].push(d + 2);
        son = d;
      }
    }
  });
  return baskin;
}
yaz("## 2. Baskın sıklığı: bir oyuncunun 7 günlük pencerede göreceği baskın sayısı (kalkan sonrası gün 7–41, 3 tohum)");
yaz();
yaz(baslik("Parametre", "r (yeniden yatırım)", "0 baskın", "1 baskın", "2 baskın", "Ortalama", "En çok (3 tohum)", "Haftalık ilçe başı oran"));
for (const [ad, p] of [
  ["öneri: p 1/3, bekleme 4 gün", ONERI],
  ["p 1/4, bekleme 5 gün", { ...ONERI, p: 0.25, bekleme: 5 }],
  ["p 1/5, bekleme 6 gün", { ...ONERI, p: 0.2, bekleme: 6 }],
]) {
  for (const r of [0.1, 0.25]) {
    const sayim = [0, 0, 0, 0];
    let toplam = 0;
    let adet = 0;
    let en = 0;
    for (const tohum of [1, 2, 3]) {
      const b = baskinSimule(p, r, tohum, 35, NK);
      for (let i = 0; i < NK.length; i++) {
        for (let w = KALKAN_GUN + 2; w <= KALKAN_GUN + 2 + 28; w++) {
          const c = b[i].filter((x) => x >= w && x < w + 7).length;
          sayim[Math.min(3, c)] += NK[i];
          toplam += c * NK[i];
          adet += NK[i];
          en = Math.max(en, c);
        }
      }
    }
    yaz(satir(ad, ond(r, 2), yuzde(sayim[0] / adet, 0), yuzde(sayim[1] / adet, 0), yuzde(sayim[2] / adet, 0), ond(toplam / adet, 2), en, ond(toplam / adet, 2)));
  }
}
yaz();
yaz("Pencere kayan (her başlangıç günü); oyuncu tek ilçededir. Bekleme ≥ 4 gün olduğundan bir ilçede 7 günde en çok 2 baskın olur; birden çok ilçede yapısı olan oyuncu için ilçe sayısıyla çarpılır (ilçe başına oyuncu tavanı 72 hücre).");
yaz();

// ------------------------------------------------------------------------------------------------ 3 boy, servet ve tavan günü
yaz("## 3. Servet → boy: tipik ilçede boy hangi günde kaç (r = %25 ve %10)");
yaz();
yaz("Oyuncu serveti = başlangıç + r × günlük net × gün (yeniden yatırım yapıya gider, taban değeri 1:1); ilçe serveti = oyuncu sayısı × oyuncu serveti (kalkan bitince).");
yaz();
yaz(baslik("servetAdimi (₺)", "r", "Oyuncu/ilçe", "Gün 8", "Gün 14", "Gün 21", "Gün 30", "Boy tavana (8) varış günü"));
for (const adim of [250000, 350000, 500000]) {
  for (const r of [0.25, 0.1]) {
    for (const n of [1, 3, 4.4, 10]) {
      const p = { ...ONERI, adim };
      const boyG = (g) => boyHesap(n * servetOyuncu(g, r), p);
      let tavan = "> 60";
      for (let g = 1; g <= 60; g++) if (boyG(g) >= p.enCokBoy) { tavan = String(g); break; }
      yaz(satir(tam(adim), ond(r, 2), n, boyG(8), boyG(14), boyG(21), boyG(30), tavan));
    }
  }
}
yaz();
yaz("Servet eşiği 250.000 ₺: tek yeni oyuncu ilçesi (servet ≈ 72 bin) baskın görmez; 3–4 oyuncu eşiği kalkan sonunda geçer. Gün 8'de tipik ilçe (3–4 oyuncu, r = %25) boy 3–4'tedir.");
yaz();

// ------------------------------------------------------------------------------------------------ 4 savunma maliyeti ve kayıp
const KAYIP_SETLERI = [
  ["0a önerisi (yağma %10, devre dışı %10)", 0.1, 0.1, 1.14],
  ["A2 önerisi (yağma %25, devre dışı %25)", 0.25, 0.25, 0.88],
];
const n4 = 4;
const stokGun = 1; // stok = 1 günlük brüt çıktı
const kayipOyuncu = (n, yagma, yapi, stok = stokGun) => yagma * (1 / n) * stok * BRUT_GUN + yapi * NET_GUN; // birlik kaybı ayrı (ordu yoksa 0)
const bul = (gb) => {
  let gs = 0;
  while (pKazan(gs, gb) < 0.9) gs += 5;
  return gs;
};
yaz("## 4. Savunmasız kayıp: günlük netin kaçta kaçı");
yaz();
yaz(`Kayıp modeli (savunma yetmeyince, oyuncu başına): stok yağması = yağma oranı × ilçe payı (1/n) × stok + devre dışı yapı = oran × günlük net × 1 gün. Stok = ${stokGun} günlük brüt çıktı (${tam(stokGun * BRUT_GUN)} ₺; 3 günlük stok sütunu da verilir). Birlik kaybı (%15) ordusuz oyuncuda 0'dır.`);
yaz();
yaz(baslik("Set", "n = 1", "n = 4", "n = 10", "n = 4, stok 3 gün", "n = 4: günlük netin payı", "n = 4: gün 8 hazinesinin payı"));
for (const [ad, y, ya] of KAYIP_SETLERI) {
  yaz(satir(ad, `${tam(kayipOyuncu(1, y, ya))} ₺`, `${tam(kayipOyuncu(4, y, ya))} ₺`, `${tam(kayipOyuncu(10, y, ya))} ₺`, `${tam(kayipOyuncu(4, y, ya, 3))} ₺`, yuzde(kayipOyuncu(4, y, ya) / NET_GUN, 0), yuzde(kayipOyuncu(4, y, ya) / 960000, 1)));
}
yaz();

yaz("## 5. Boy başına savunma ve bedelin geri dönüşü (ilçe n = 4; ilçe başına haftalık baskın λ simülasyondan)");
yaz();
yaz("Güç: Nöbet Evi 100 (bedava), 1. Karakol 100, 2. Karakol 50, tümen 100 (Piyade). \"Gerekli Gs\" = kazanma ≥ %90 için en küçük güç (5'in katı). Ordugâh yalnız tümen gerektiğinde alınır. Karakol ilçedeki tüm oyuncuları korur (kamu malı).");
yaz();
yaz(baslik("Boy", "Gb", "Gerekli Gs", "Yalnız Nöbet Evi: P", "+ 2 Karakol (250): P", "Eksik tümen", "Tek seferlik ₺", "Haftalık işletme ₺ (ilçe)", "Haftalık ₺ / oyuncu (n = 4)", "Haftalık net gelirin payı"));
for (let boy = 1; boy <= 8; boy++) {
  const gb = ONERI.boyGucu * boy;
  const gs = bul(gb);
  const tumen = Math.ceil(Math.max(0, gs - 250) / 100);
  const karakol = gs > 200 ? 2 : gs > 100 ? 1 : 0;
  const tek = karakol * MALIYET.karakol + (tumen > 0 ? MALIYET.ordugah + tumen * MALIYET.tumen : 0);
  const hft = 7 * (karakol * GIDER_GUN.karakol + tumen * GIDER_GUN.tumen);
  yaz(satir(boy, gb, gs, yuzde(pKazan(100, gb), 0), yuzde(pKazan(250, gb), 0), tumen, tam(tek), tam(hft), tam(hft / n4), yuzde(hft / n4 / (7 * NET_GUN), 1)));
}
yaz();
yaz("Geri ödeme = tek seferlik bedel / (haftalık önlenen kayıp − haftalık işletme). Önlenen kayıp = λ × (P(savunma) − P(yalnız Nöbet Evi)) × ilçe kaybı (n × oyuncu kaybı).");
yaz();
for (const [ad, y, ya, lam] of KAYIP_SETLERI) {
  yaz(`**${ad}; λ = ${ond(lam, 2)} baskın/hafta/ilçe.**`);
  yaz();
  yaz(baslik("Boy", "İlçe haftalık beklenen kayıp (savunmasız) ₺", "2 Karakol: önlenen ₺/hafta", "2 Karakol: tek seferlik + haftalık ₺", "Geri ödeme (hafta)", "Tam savunma: önlenen ₺/hafta", "Tam savunma: tek seferlik + haftalık ₺", "Geri ödeme (hafta)", "Tam savunma kârlı mı"));
  for (let boy = 1; boy <= 8; boy++) {
    const gb = ONERI.boyGucu * boy;
    const kIl = n4 * kayipOyuncu(n4, y, ya);
    const p0 = pKazan(100, gb);
    const pk = pKazan(250, gb);
    const onlenenK = lam * (pk - p0) * kIl;
    const tekK = 2 * MALIYET.karakol;
    const haftaK = 2 * 7 * GIDER_GUN.karakol;
    const gs = bul(gb);
    const tumen = Math.ceil(Math.max(0, gs - 250) / 100);
    const tek = tekK + (tumen > 0 ? MALIYET.ordugah + tumen * MALIYET.tumen : 0);
    const hft = 7 * (2 * GIDER_GUN.karakol + tumen * GIDER_GUN.tumen);
    const onlenenT = lam * (0.9 - p0) * kIl;
    const netK = onlenenK - haftaK;
    const netT = onlenenT - hft;
    yaz(satir(boy, tam(lam * (1 - p0) * kIl), tam(onlenenK), `${tam(tekK)} + ${tam(haftaK)}`, netK > 0 ? ond(tekK / netK, 1) : "yok", tam(onlenenT), `${tam(tek)} + ${tam(hft)}`, netT > 0 ? ond(tek / netT, 1) : "yok", netT > 0 ? "evet" : "**hayır (sigorta pahalı)**"));
  }
  yaz();
}
yaz("Nöbet Evi kamu yapısıdır (maliyeti 0; ilçe merkezinde, 100 güç her ilçeye bedava): geri dönüş sorusu yoktur, ilk baskının %50'sini kendisi tutar (boy 1).");
yaz();

// ------------------------------------------------------------------------------------------------ 6 ganimet ve yağma / hazine
yaz("## 6. Ganimet ve yağma kaybı oyuncu hazinesinin yüzde kaçı");
yaz();
const HAZINE = { 8: 960000, 14: 1780000, 30: 3536000 }; // yerel-talep-kalibrasyon §7.2 (yeniden yatırım yok; üst sınır)
yaz(baslik("Gün", "Hazine (üst sınır) ₺", "Kayıp 0a (n = 4) / hazine", "Kayıp A2 (n = 4) / hazine", "Ganimet boy 4 (2.600 ₺ ÷ 4 oyuncu) / hazine", "Ganimet / günlük net"));
for (const g of [8, 14, 30]) {
  yaz(satir(g, tam(HAZINE[g]), yuzde(kayipOyuncu(4, 0.1, 0.1) / HAZINE[g], 1), yuzde(kayipOyuncu(4, 0.25, 0.25) / HAZINE[g], 1), yuzde(2600 / 4 / HAZINE[g], 2), yuzde(2600 / 4 / NET_GUN, 2)));
}
yaz();
yaz("Hazine para olarak yağmalanmaz (yağma yalnız stok ve yapı devre dışı); karşılaştırma için verilmiştir. Ganimet mal olarak küçüktür (kayıp / ganimet ≈ 25–60×).");
yaz();
console.log(cikti.join("\n"));
