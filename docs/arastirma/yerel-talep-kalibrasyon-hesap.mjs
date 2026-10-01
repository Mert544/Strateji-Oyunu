#!/usr/bin/env node
// Yerel talep kalibrasyonu (A2, S-6): sınıf başına sabit nüfus ↔ ilçe başına gerçek nüfus.
// Yeniden üretim:  node docs/arastirma/yerel-talep-kalibrasyon-hesap.mjs > docs/arastirma/yerel-talep-kalibrasyon-hesap-cikti.md
// Girdi: packages/veri/icerik/icerik.json (taban fiyat). Nüfus tablosu YAKLAŞIK ve DOĞRULANMADI (aşağıda). Rastgelelik/tarih yok.
// Model: p4-p5-ekonomi-hesap.mjs §5 ile aynı (çekim ağırlığı w = (1/p)² (1+0,25·çeşit), esnaf w, esnaf tabanı %25, kasa 90/sa); tamsayı/PPM.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const IC = JSON.parse(fs.readFileSync(path.join(KOK, "packages/veri/icerik/icerik.json"), "utf8"));
const PPM = 1_000_000;
const nokta = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const tam = (x) => nokta(String(Math.round(x)));
const ond = (x, d = 1) => x.toFixed(d).replace(".", ",");
const yuzde = (x, d = 1) => `%${ond(x * 100, d)}`;
const satir = (...h) => `| ${h.join(" | ")} |`;
const baslik = (...h) => `${satir(...h)}\n|${h.map(() => "---").join("|")}|`;
const cikti = [];
const yaz = (s = "") => cikti.push(s);

const EKMEK = IC.mallar.find((m) => m.id === "ekmek").tabanFiyat / 1000; // ₺/birim
const NPC_EKMEK = EKMEK * 0.891; // ihracat, komisyonlu (p4-p5-ekonomi §1.5)
const TALEP_EKMEK = 60; // mili-birim/1000 kişi/sa (A2 §1.9)
const GIDER_S = 132; // ₺/sa
const KASA = 90; // birim/sa
const IHRACAT_NPC_HAFTA = 112_266_000; // ekmek, 200 oyuncu (A2 §1.10)

// ------------------------------------------------------------------------------------------------ yerel pazar (tamsayı)
const ters = (p) => Math.floor((PPM * PPM) / p);
const kare = (x) => Math.floor((x * x) / PPM);
const agirlik = (p, c) => Math.floor((kare(ters(p)) * (PPM + Math.floor((250000 * c) / PPM))) / PPM);
const ESNAF_W = kare(ters(1_120_000));
function pazar(Qmili, k) {
  const w = agirlik(1_050_000, 500_000);
  const kasa = KASA * 1000;
  let acik = k;
  let kalan = Qmili;
  let satTop = 0;
  const sat = new Array(k).fill(0);
  const dolu = new Array(k).fill(false);
  for (let tur = 0; tur < 32 && acik > 0; tur++) {
    const toplam = acik * w + ESNAF_W;
    const pay = Math.floor((kalan * w) / toplam);
    if (sat.findIndex((s, i) => !dolu[i] && s + pay > kasa) === -1) {
      for (let i = 0; i < k; i++) if (!dolu[i]) sat[i] += pay;
      break;
    }
    let kullanilan = 0;
    for (let i = 0; i < k; i++) {
      if (!dolu[i] && sat[i] + pay > kasa) {
        kullanilan += kasa - sat[i];
        sat[i] = kasa;
        dolu[i] = true;
        acik--;
      }
    }
    kalan -= kullanilan;
  }
  satTop = sat.reduce((t, x) => t + x, 0);
  const tavan = Qmili - Math.floor((Qmili * 250000) / PPM);
  if (satTop > tavan) for (let i = 0; i < k; i++) sat[i] = Math.floor((sat[i] * tavan) / satTop);
  return sat;
}
// k dükkânlı ilçe, nüfus N: dükkân başına net prim ₺/sa (NPC ihracatına göre ek gelir − gider) ve ilçe toplamı birim/sa
function ilce(N, olcek, k) {
  const Q = Math.floor((TALEP_EKMEK * N * olcek) / 1000); // mili-birim/sa
  const sat = pazar(Q, k).map((x) => x / 1000);
  const net = sat.map((s) => s * (EKMEK * 1.05 - NPC_EKMEK) - GIDER_S);
  return { Q: Q / 1000, satToplam: sat.reduce((t, x) => t + x, 0), netOrt: net.reduce((t, x) => t + x, 0) / k };
}

// ------------------------------------------------------------------------------------------------ nüfus tablosu
// DOĞRULANMADI: TÜİK ADNKS 2023–2024 ilçe nüfusları, YAKLAŞIK (bin kişi, ±%15), hafızadan; kaynak taraması (T3/O3) bekliyor.
const ILCELER = [
  ["Kocaeli", "Gebze", 410], ["Kocaeli", "İzmit", 390], ["Kocaeli", "Darıca", 195], ["Kocaeli", "Körfez", 180], ["Kocaeli", "Derince", 135],
  ["Kocaeli", "Gölcük", 150], ["Kocaeli", "Karamürsel", 55], ["Kocaeli", "Kartepe", 135], ["Kocaeli", "Başiskele", 140], ["Kocaeli", "Çayırova", 130],
  ["Kocaeli", "Dilovası", 55], ["Kocaeli", "Kandıra", 55],
  ["Sakarya", "Adapazarı", 280], ["Sakarya", "Serdivan", 150], ["Sakarya", "Erenler", 105], ["Sakarya", "Arifiye", 45], ["Sakarya", "Akyazı", 90],
  ["Sakarya", "Hendek", 85], ["Sakarya", "Sapanca", 50], ["Sakarya", "Karasu", 55], ["Sakarya", "Kocaali", 33], ["Sakarya", "Geyve", 45],
  ["Sakarya", "Pamukova", 17], ["Sakarya", "Taraklı", 6], ["Sakarya", "Söğütlü", 28], ["Sakarya", "Ferizli", 33], ["Sakarya", "Kaynarca", 28], ["Sakarya", "Karapürçek", 4],
  ["Bursa", "Osmangazi", 890], ["Bursa", "Nilüfer", 540], ["Bursa", "Yıldırım", 640], ["Bursa", "Mudanya", 110], ["Bursa", "Gemlik", 120],
  ["Bursa", "İnegöl", 300], ["Bursa", "Mustafakemalpaşa", 105], ["Bursa", "Orhangazi", 80], ["Bursa", "Karacabey", 80], ["Bursa", "Gürsu", 90],
  ["Bursa", "Kestel", 70], ["Bursa", "İznik", 45], ["Bursa", "Orhaneli", 20], ["Bursa", "Keles", 10], ["Bursa", "Harmancık", 5],
  ["Bursa", "Büyükorhan", 11], ["Bursa", "Yenişehir", 22],
].map(([il, ad, bin]) => ({ il, ad, N: bin * 1000 }));
// Ölçülen (z20 ızgara manifesti, entegrasyon 7553b55; istemci `arsaSinifi` geçici eşlemesiyle; uygun hücreler): baskın sınıf.
const OLCULEN_SINIF = { Gemlik: [465007, 4347, 9292], Gebze: [451912, 20366, 13578], Körfez: [328183, 8064, 15136] }; // kırsal, kasaba, şehir

const toplamN = ILCELER.reduce((t, x) => t + x.N, 0);
const sirali = [...ILCELER].sort((a, b) => a.N - b.N);
const medyan = (sirali[22].N);

yaz("# Yerel talep kalibrasyonu: hesap çıktısı (otomatik üretildi)");
yaz();
yaz("Girdi: `packages/veri/icerik/icerik.json` (ekmek taban fiyatı). Nüfus tablosu **yaklaşık ve doğrulanmadı** (hafızadan, TÜİK ADNKS 2023–2024; ±%15). Model: p4-p5-ekonomi-hesap.mjs §5 (fırın dükkânı, ekmek rafı, 1,05 R, çeşit 0,5, kasa 90 birim/sa).");
yaz();
yaz("## 1. Nüfus dağılımı (45 ilçe, yaklaşık)");
yaz();
const bantlar = [["< 10 bin", 0, 10e3], ["10–30 bin", 10e3, 30e3], ["30–60 bin", 30e3, 60e3], ["60–100 bin", 60e3, 100e3], ["100–200 bin", 100e3, 200e3], ["200–400 bin", 200e3, 400e3], ["≥ 400 bin", 400e3, 1e12]];
yaz(baslik("Nüfus bandı", "İlçe sayısı", "Toplam nüfus", "Toplamın payı"));
for (const [ad, a, b] of bantlar) {
  const g = ILCELER.filter((x) => x.N >= a && x.N < b);
  yaz(satir(ad, g.length, tam(g.reduce((t, x) => t + x.N, 0)), yuzde(g.reduce((t, x) => t + x.N, 0) / toplamN, 0)));
}
yaz();
yaz(`Toplam ${tam(toplamN)}; medyan ilçe ${tam(medyan)}; ortalama ${tam(toplamN / ILCELER.length)}; en büyük/en küçük ${tam(sirali[44].N)} / ${tam(sirali[0].N)} (oran ${ond(sirali[44].N / sirali[0].N, 0)}). Dağılım ağır kuyrukludur: ilk 6 ilçe toplamın ${yuzde(sirali.slice(39).reduce((t, x) => t + x.N, 0) / toplamN, 0)}'ini taşır.`);
yaz();
yaz("## 2. Ölçülen hücre sınıfı: baskın sınıf kuralı üç ilçede de kırsal çıkıyor");
yaz();
yaz("Kural (A3 §6.5): ilçe sınıfı = uygun hücrelerin en çok olan sınıfı (istemci `arsaSinifi` geçici eşlemesi). Ölçülen:");
yaz();
yaz(baslik("İlçe", "Kırsal hücre", "Kasaba hücre", "Şehir hücre", "Kırsal payı", "Baskın sınıf", "Yaklaşık nüfus", "Sınıf eşdeğeri (10 / 40 / 120 bin)", "Eşdeğer / gerçek"));
for (const [ad, [k, s, h]] of Object.entries(OLCULEN_SINIF)) {
  const t = k + s + h;
  const N = ILCELER.find((x) => x.ad === ad).N;
  yaz(satir(ad, tam(k), tam(s), tam(h), yuzde(k / t, 0), "**kırsal**", tam(N), "10.000", ond(10000 / N, 3)));
}
yaz();
yaz("Üç ilçede de kırsal hücre payı %93–97; gerçek nüfusları 120–410 bin. Sınıf eşdeğeri 10 bin demek talebi 12–41 kat eksik saymaktır. (Diğer 42 ilçe ölçülmedi: Osmangazi, Nilüfer gibi kent merkezlerinde pay değişebilir, ama arazi tabanlı hücre sınıfı yoğun kentte bile ilçe alanının büyük kısmı kırsal olduğundan baskın sınıf büyük olasılıkla kırsaldır (doğrulanmadı).)");
yaz();
yaz("## 3. Tek dükkânın net primi nüfusa göre (ilçede 1 fırın dükkânı, 1,05 R, yerelOlcek 50)");
yaz();
yaz(baslik("Nüfus", "Q ekmek birim/sa", "Satış birim/sa", "Kasa doluluğu", "Net ₺/sa (prim − gider)", "Geri ödeme sa (nakit 8.945 ₺)"));
for (const N of [5000, 10000, 20000, 40000, 60000, 100000, 120000, 200000, 400000, 890000]) {
  const r = ilce(N, 50, 1);
  yaz(satir(tam(N), ond(r.Q, 1), ond(r.satToplam, 1), yuzde(r.satToplam / KASA, 0), tam(r.netOrt), r.netOrt > 0 ? ond(8945 / r.netOrt, 0) : "hiç"));
}
yaz();
yaz("Doyma ≈ 100 bin nüfusta (kasa 90 birim/sa dolar); başabaş ≈ 7 bin. Yani Q nüfusa doğrusal, dükkân neti ise 7–100 bin arasında değişir ve 100 binden sonra sabittir: nüfus doğruluğu en çok küçük ve orta ilçelerde önemlidir.");
yaz();
yaz("## 4. Seçenekler: dünya yerelNpc musluğu, ZP8 ve dükkân kârlı ilçe payı");
yaz();
yaz("Oyuncu yerleşimi iki senaryo: **U** her ilçede eşit (200 oyuncu / 45 ≈ 4,4; ilçe başına dükkân = 4 ya da 5 dağıtılarak), **N** oyuncu nüfusla orantılı (en az 1). Her oyuncu 1 fırın dükkânı. ZP8 payı = yerelNpc / (yerelNpc + ihracatNpc 112,3 M ₺/hafta).");
yaz();
const SIN = (N) => (N < 30e3 ? "kirsal" : N < 150e3 ? "kasaba" : "sehir");
const bandGM = (s) => {
  const g = ILCELER.filter((x) => SIN(x.N) === s);
  return Math.round(Math.exp(g.reduce((t, x) => t + Math.log(x.N), 0) / g.length) / 1000) * 1000;
};
const GM = { kirsal: bandGM("kirsal"), kasaba: bandGM("kasaba"), sehir: bandGM("sehir") };
const dagit = (mod) => {
  if (mod === "U") {
    const k = new Array(45).fill(Math.floor(200 / 45));
    for (let i = 0; i < 200 - k.reduce((t, x) => t + x, 0); i++) k[i]++;
    return k;
  }
  const k = ILCELER.map((x) => Math.max(1, Math.round((200 * x.N) / toplamN)));
  return k;
};
// Seçenek tanımı: ilçe başına Neşdeğer(i) ve olcek
const KOSUL = [
  ["A3 şartnamesi olduğu gibi: baskın hücre sınıfı = kırsal (10.000), yerelOlcek 50", () => 10000, 50],
  ["(a) sınıf sabiti kalır, yerelOlcek kalibre (toplam talep gerçek nüfusa eşitlenir)", () => 10000, (toplamN * 50) / (10000 * 45)],
  ["(b) ilçe başına gerçek nüfus, yerelOlcek 50", (x) => x.N, 50],
  [`(c) karma: nüfus bandından sınıf (< 30 bin kırsal, < 150 bin kasaba, ≥ 150 bin şehir), sınıf eşdeğeri = bant geometrik ortalaması (${tam(GM.kirsal)} / ${tam(GM.kasaba)} / ${tam(GM.sehir)}), yerelOlcek 50`, (x) => GM[SIN(x.N)], 50],
  ["(c0) karma, sınıf eşdeğeri 10 / 40 / 120 bin (A3 sabitleri), yerelOlcek 50", (x) => ({ kirsal: 10000, kasaba: 40000, sehir: 120000 })[SIN(x.N)], 50],
];
yaz(baslik("Seçenek", "Yerleşim", "Dünya talep Q ekmek birim/sa", "yerelNpc ₺/hafta", "ZP8 payı", "Kârlı ilçe (net > 0)", "Medyan dükkân neti ₺/sa", "Medyan geri ödeme sa"));
const sonuc = {};
for (const [ad, fn, olcek] of KOSUL) {
  for (const mod of ["U", "N"]) {
    const kk = dagit(mod);
    let yerel = 0;
    let qTop = 0;
    const netler = [];
    ILCELER.forEach((x, i) => {
      const r = ilce(fn(x), olcek, kk[i]);
      qTop += r.Q;
      yerel += r.satToplam * EKMEK * 1.05 * 168;
      netler.push(r.netOrt);
    });
    const kar = netler.filter((x) => x > 0).length;
    const s = [...netler].sort((a, b) => a - b);
    const med = (s[22] + s[22]) / 2;
    yaz(satir(ad, mod, tam(qTop), tam(yerel), yuzde(yerel / (yerel + IHRACAT_NPC_HAFTA), 0), `${kar}/45`, tam(med), med > 0 ? ond(8945 / med, 0) : "hiç"));
    sonuc[`${ad}|${mod}`] = { yerel, kar };
  }
}
yaz();
yaz("Okuma: **A3'ün olduğu gibi** hâlinde her ilçe kırsal sayılır: talep nüfusa değil ilçe sayısına bağlanır, dükkân neti kırsal düzeyde (≈ 30 ₺/sa) kalır ve yerelNpc ihmal edilebilir; bu A2 §1.10'daki %45'lik ZP8 beklentisinin (ilçelerin %60'ı şehir varsayımıyla) çok altındadır. (a) toplamı gerçek nüfusa getirir ama her ilçeyi eşit yapar: küçük ilçe zengin, büyük ilçe fakir görünür. (b) gerçeğe en yakın, ama şemaya ilçe başına nüfus alanı ister. (c) karma, şemaya yalnız sınıf bilgisini taşır; hata bandı içinde kalır (aşağıda).");
yaz();
yaz("### 4b. yerelOlcek taraması (ZP8 sınırı %50 ve dükkân kârlılığı birlikte)");
yaz();
yaz(baslik("Seçenek", "yerelOlcek", "Yerleşim", "yerelNpc ₺/hafta", "ZP8 payı", "Kârlı ilçe", "Medyan dükkân neti ₺/sa", "Medyan geri ödeme sa"));
for (const [ad, fn] of [["(b) ilçe başına gerçek nüfus", (x) => x.N], ["(c) karma, bant geometrik ortalaması", (x) => GM[SIN(x.N)]]]) {
  for (const olcek of [20, 30, 35, 40, 50]) {
    for (const mod of ["U", "N"]) {
      const kk = dagit(mod);
      let yerel = 0;
      const netler = [];
      ILCELER.forEach((x, i) => {
        const r = ilce(fn(x), olcek, kk[i]);
        yerel += r.satToplam * EKMEK * 1.05 * 168;
        netler.push(r.netOrt);
      });
      const s2 = [...netler].sort((a, b) => a - b);
      const med = s2[22];
      yaz(satir(ad, olcek, mod, tam(yerel), yuzde(yerel / (yerel + IHRACAT_NPC_HAFTA), 0), `${netler.filter((x) => x > 0).length}/45`, tam(med), med > 0 ? ond(8945 / med, 0) : "hiç"));
    }
  }
}
yaz();
yaz("## 5. Karma seçenekte (c) sınıf sabitinin hatası");
yaz();
yaz(baslik("Sınıf (nüfus bandı)", "İlçe sayısı", "Bant", "Geometrik ortalama (önerilen eşdeğer)", "Eşdeğer / gerçek: en düşük", "en yüksek", "Ortalama mutlak log hatası"));
for (const s of ["kirsal", "kasaba", "sehir"]) {
  const g = ILCELER.filter((x) => SIN(x.N) === s);
  const oran = g.map((x) => GM[s] / x.N);
  const mle = g.reduce((t, x) => t + Math.abs(Math.log(GM[s] / x.N)), 0) / g.length;
  yaz(satir(s, g.length, s === "kirsal" ? "< 30 bin" : s === "kasaba" ? "30–150 bin" : "≥ 150 bin", tam(GM[s]), ond(Math.min(...oran), 2), ond(Math.max(...oran), 2), ond(Math.exp(mle), 2) + "×"));
}
yaz();
const hataA3 = ILCELER.reduce((t, x) => t + Math.abs(Math.log(10000 / x.N)), 0) / ILCELER.length;
const hataC = ILCELER.reduce((t, x) => t + Math.abs(Math.log(GM[SIN(x.N)] / x.N)), 0) / ILCELER.length;
const hataC0 = ILCELER.reduce((t, x) => t + Math.abs(Math.log(({ kirsal: 10000, kasaba: 40000, sehir: 120000 })[SIN(x.N)] / x.N)), 0) / ILCELER.length;
yaz(`Ortalama mutlak log hatası (nüfus eşdeğeri ↔ gerçek): A3 olduğu gibi ${ond(Math.exp(hataA3), 1)}×, (c0) ${ond(Math.exp(hataC0), 1)}×, (c) ${ond(Math.exp(hataC), 1)}×, (b) 1,0×.`);
yaz();
yaz("## 6. Arsa fiyat beklentisine etki");
yaz();
yaz("Hücre fiyatı sınıf tabanından gelir (kırsal 1.000, kasaba 2.500, şehir 6.500 ₺; `fiyat.ts`) ve talep modelinden bağımsızdır. Dolaylı etki: dükkân neti arsa alımının geri ödemesini belirler. Doyma neti ≈ 727 ₺/sa (kasa dolu) ile bir şehir hücresi (6.500 ₺) ≈ 9 saatte çıkar; ticari hücre ×1,45 (9.425 ₺) ≈ 13 saat. Dolayısıyla nüfus ≥ ~30 bin olan ilçelerde arsa fiyatı dükkân kararını bağlamaz; < 10 bin nüfuslu ilçelerde net ≈ 0 olduğundan dükkân hiç kurulmaz ve ticari hücre talebi doğmaz. A3'ün olduğu gibi hâlinde bütün ilçeler bu ikinci gruba düşer.");
yaz();
console.log(cikti.join("\n"));
