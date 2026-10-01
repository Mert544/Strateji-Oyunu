#!/usr/bin/env node
// P4/P5 ekonomi hesabı (A2). Yeniden üretim:  node docs/arastirma/p4-p5-ekonomi-hesap.mjs > docs/arastirma/p4-p5-ekonomi-hesap-cikti.md
//
// Girdi: packages/veri/icerik/{icerik,parametreler,kimlik-listesi}.json (yalnız okunur). Çekirdek kodu çalıştırılmaz; bu bir
// kâğıt-hesap modelidir (kayan nokta; çekirdekte tamsayı). Para mili-₺, miktar mili-birim olarak veriden okunur, tabloda ₺ ve
// birim yazılır. Hiçbir dosya yazmaz, rastgelelik ve tarih kullanmaz: aynı veri, aynı çıktı.
//
// Bölümler: 0 sabitler · 1 mevcut yöntemler · 2 yeni yöntemler · 3 tesis maliyeti ve süre · 4 kanallar ve kamu tavanı · 5 dükkân
// S ve yerel pazar · 6 para musluğu · 7 senaryo 1 (saatlik) · 8 senaryo 2 · 9 çıkmaz mal · 10 bakım ve aşınma.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const oku = (d) => JSON.parse(fs.readFileSync(path.join(KOK, "packages/veri/icerik", d), "utf8"));
const IC = oku("icerik.json");
const PR = oku("parametreler.json");
const KL = oku("kimlik-listesi.json");
const PPM = 1_000_000;

// ---------------------------------------------------------------------------------------------------------------- biçim
const nokta = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const tam = (x) => nokta(String(Math.round(x)));
const TL = (x) => `${tam(x)} ₺`; // sembol sonda, binlik nokta (docs/12 §14 T-1)
const ond = (x, d = 2) => x.toFixed(d).replace(".", ",");
const yuzde = (x, d = 1) => `%${ond(x * 100, d)}`;
const satir = (...h) => `| ${h.join(" | ")} |`;
const baslik = (...h) => `${satir(...h)}\n|${h.map(() => "---").join("|")}|`;
const cikti = [];
const yaz = (s = "") => cikti.push(s);

// ---------------------------------------------------------------------------------------------------------------- veri
const MAL = Object.fromEntries(IC.mallar.map((m) => [m.id, m]));
// İçerikte olmayan (A0-ops) mal için kimlik-listesi taban fiyatı (yalnız `cimento` talep tablosunda).
const P = (id) => (MAL[id] ? MAL[id].tabanFiyat / 1000 : KL.mallar.find((m) => m.id === id).taban); // ₺/birim
const deger = (o) => Object.entries(o).reduce((t, [m, q]) => t + (q / 1000) * P(m), 0); // ₺/sa
const birim = (o) => Object.entries(o).map(([m, q]) => `${ond(q / 1000, q % 1000 ? 1 : 0)} ${m}`).join(" + ") || "-";
const MULK = PR.mulk;
const PZ = PR.pazar;
const OLCEK = PR.sanayi.olcekKademeleri;
const KOMISYON = PZ.islemKomisyonuPpm;
const MAKAS = PZ.makasPpm;

// Pazar nakit çarpanları (docs/06 §13): ithalat brüt×(1+makas/2)×(1+komisyon); ihracat brüt×(1−makas/2)×(1−komisyon).
// kor: yeni oyuncu koruması (ilk 14 gün; komisyon yok).
const ITH = (kor) => (1 + MAKAS / 2 / PPM) * (1 + (kor ? 0 : KOMISYON) / PPM);
const IHR = (kor) => (1 - MAKAS / 2 / PPM) * (1 - (kor ? 0 : KOMISYON) / PPM);
const ithal = (id, kor) => P(id) * ITH(kor);
const ihrac = (id, kor) => P(id) * IHR(kor);

// ---------------------------------------------------------------------------------------------------------------- yöntemler
// Alan adları icerik.json ile aynı: girdiler, ciktilar (mili-birim/sa), isci (mili), bakim (mili-birim/sa), kirlilikPpmSaat.
// "oneri": A2 önerisi. "rapor": uretim-agi-genisletme §3.3 ve dikey §2.2 değerleri (karşılaştırma için).
// Fırın çıktısı (ekmek/sa): tek parametre; baş lider 250 derse yalnız bu satırı değiştir.
const FIRIN_EKMEK = 240;
const YEN = {
  degirmen: {
    tesis: "gida_fabrikasi",
    oneri: { girdiler: { tahil: 200000, elektrik: 12000 }, ciktilar: { un: 165000, kepek: 33000 }, isci: 5000, bakim: { parca: 800 }, kirlilikPpmSaat: 20 },
    rapor: { girdiler: { tahil: 200000, elektrik: 12000 }, ciktilar: { un: 150000, kepek: 30000 }, isci: 5000, bakim: { parca: 800 }, kirlilikPpmSaat: 20 },
  },
  ekmek_firini: {
    tesis: "gida_fabrikasi",
    oneri: { girdiler: { un: 165000, yakit: 20000, elektrik: 15000 }, ciktilar: { ekmek: FIRIN_EKMEK * 1000 }, isci: 8000, bakim: { parca: 800 }, kirlilikPpmSaat: 20 },
    rapor: { girdiler: { un: 150000, yakit: 22000, elektrik: 15000 }, ciktilar: { ekmek: 225000 }, isci: 8000, bakim: { parca: 800 }, kirlilikPpmSaat: 20 },
  },
  cam_firini: {
    tesis: "celikhane",
    oneri: { girdiler: { silis: 60000, yakit: 16000, elektrik: 18000 }, ciktilar: { cam: 50000 }, isci: 5000, bakim: { parca: 1000 }, kirlilikPpmSaat: 60 },
    rapor: { girdiler: { silis: 60000, yakit: 18000, elektrik: 20000 }, ciktilar: { cam: 50000 }, isci: 5000, bakim: { parca: 1000 }, kirlilikPpmSaat: 60 },
  },
  celik_dograma: {
    tesis: "parca_fabrikasi",
    oneri: { girdiler: { celik: 24000, cam: 32000, parca: 5000, elektrik: 15000 }, ciktilar: { pencere: 28000 }, isci: 7000, bakim: { parca: 1000 }, kirlilikPpmSaat: 20 },
    rapor: { girdiler: { celik: 24000, cam: 32000, parca: 6000, elektrik: 15000 }, ciktilar: { pencere: 27000 }, isci: 7000, bakim: { parca: 1000 }, kirlilikPpmSaat: 20 },
  },
  kepek_gubresi: {
    tesis: "ahir",
    oneri: { girdiler: { kepek: 100000, elektrik: 5000 }, ciktilar: { gubre: 18000 }, isci: 3000, bakim: { parca: 500 }, kirlilikPpmSaat: 10 },
    rapor: null,
  },
  sut_kepekli: {
    tesis: "ahir",
    oneri: { girdiler: { tahil: 50000, kepek: 60000, elektrik: 5000 }, ciktilar: { sut: 82000, gubre: 4000 }, isci: 5000, bakim: { parca: 500 }, kirlilikPpmSaat: 10 },
    rapor: { girdiler: { tahil: 50000, kepek: 60000, elektrik: 5000 }, ciktilar: { sut: 82000, gubre: 4000 }, isci: 5000, bakim: { parca: 500 }, kirlilikPpmSaat: 10 },
  },
};
// Elektriksiz (Y) varyant: elektrik e mili → yakıt e/10 mili (değer eşit: 10 ₺ ↔ 100 ₺).
const elektriksiz = (y) => {
  const g = { ...y.girdiler };
  const e = g.elektrik ?? 0;
  delete g.elektrik;
  if (e) g.yakit = (g.yakit ?? 0) + e / 10;
  return { ...y, girdiler: g };
};
const ELEKTRIK_FIYAT = P("elektrik");

const oran = (y) => deger(y.ciktilar) / deger(y.girdiler);
const kd = (y) => deger(y.ciktilar) - deger(y.girdiler);
const kdIsci = (y) => kd(y) / (y.isci / 1000);

// ---------------------------------------------------------------------------------------------------------------- 0 sabitler
yaz("# P4/P5 ekonomi hesap çıktısı (otomatik üretildi)");
yaz();
yaz("Kaynak: `docs/arastirma/p4-p5-ekonomi-hesap.mjs`. Bu dosyayı elle düzenleme; betiği yeniden koş.");
yaz();
yaz("## 0. Sabitler (veriden okunan)");
yaz();
yaz(baslik("Sabit", "Değer", "Kaynak"));
yaz(satir("NPC ithalat çarpanı (komisyonlu / korumada)", `${ond(ITH(false), 4)} / ${ond(ITH(true), 4)}`, "pazar.makasPpm 200000, islemKomisyonuPpm 10000; docs/06 §13"));
yaz(satir("NPC ihracat çarpanı (komisyonlu / korumada)", `${ond(IHR(false), 4)} / ${ond(IHR(true), 4)}`, "aynı"));
const kamuC = Math.min(PZ.ithalatCarpaniPpm, PZ.anlasmaIthalatCarpaniPpm, PZ.yaptirimIthalatCarpaniPpm) / PPM;
const ofisInd = Math.min(1, Object.values(MULK.ekYapilar).reduce((t, y) => t + (y.makasIndirimPpm ?? 0) * (y.enFazlaIlBasina ?? 0), 0) / PPM);
const KAMU_TAVAN = kamuC + (1 - kamuC) * ofisInd;
const SEB_EL = P("elektrik") * KAMU_TAVAN; // ₺/birim, kamu şebekesi (baş lider kararı: fiyat = kamu fiyat tavanı kuralı)
const SEB_YK = P("yakit") * KAMU_TAVAN; // ₺/birim, kamu otomatik yakıt tedariki
yaz(satir("Kamu fiyat tavanı (derleme zamanı, referans × )", ond(KAMU_TAVAN, 3), "docs/06 §15.7 madde 5: min(1,10; 1,05; 1,30)=1,05, 2 Ticaret ofisi makas indirimi %30 → 1,035. GDD'deki '1,10 R' üst sınırdır, uygulanan 1,035'tir"));
yaz(satir("Şebeke elektrik / yakıt fiyatı (kamu tavanı × taban)", `${ond(SEB_EL, 2)} ₺ (${tam(SEB_EL * 1000)} mili) / ${ond(SEB_YK, 1)} ₺ (${tam(SEB_YK * 1000)} mili)`, "baş lider kararı (G4): santral zorunlu değil; ödeme kamuya (lavabo)"));
yaz(satir("Erken oyun süre çarpanı", "0–24 sa %10, 24–168 sa doğrusal %100", "parametreler.erkenOyun; erkenOyun.ts"));
yaz(satir("İlk yapı indirimi", `ilk ${MULK.yeniOyuncu.indirimliYapiSayisi} yapı %${MULK.yeniOyuncu.ilkYapiIndirimPpm / 10000} (para+mal; ölçekten bağımsız sabit tutar)`, "mulk.yeniOyuncu; docs/06 §15.10"));
yaz(satir("Hibe / kit", `${TL(MULK.yeniOyuncu.hibe / 1000)} / ${Object.entries(MULK.yeniOyuncu.baslangicStok).map(([m, q]) => `${q / 1000} ${m}`).join(", ")}`, "mulk.yeniOyuncu"));
yaz(satir("İşletme gideri", `${TL(PR.ekonomi.tesisIsletmeParasiSaat / 1000)}/sa/tesis (bakım düzeyi×ölçek çarpanlı); santral 0`, "ekonomi.tesisIsletmeParasiSaat; sanayi.santralIsletmePpm"));
yaz(satir("Eşzamanlı inşaat / emir yuvası", `${MULK.esZamanliInsaat} / ${MULK.temelEmirYuvasi} (+4 Ticaret ofisi başına)`, "mulk"));
yaz(satir("NPC likidite ölçeği", `max(${PZ.npcLikiditeTabanOyuncu}, oyuncu)/${PZ.npcLikiditeTabanOyuncu}`, "docs/06 §13; emilim ve arz bu kadar büyür"));
yaz();
yaz("### 0.1 Taban fiyat denetimi (kimlik-listesi.json ↔ icerik.json)");
yaz();
yaz(baslik("Mal", "kimlik-listesi ₺", "icerik ₺", "Durum"));
for (const id of ["un", "ekmek", "cam", "pencere", "sut", "sut_urunu", "findik", "findik_urunu", "sekerleme", "kepek"]) {
  const k = KL.mallar.find((m) => m.id === id);
  yaz(satir(id, k.taban, MAL[id].tabanFiyat / 1000, k.taban === MAL[id].tabanFiyat / 1000 ? "eşit" : "FARKLI"));
}
const farkli = KL.mallar.filter((k) => MAL[k.id] && MAL[k.id].tabanFiyat / 1000 !== k.taban).map((k) => k.id);
yaz();
yaz(`Listede ve içerikte birlikte bulunan ${KL.mallar.filter((k) => MAL[k.id]).length} malın taban farkı: ${farkli.length === 0 ? "yok" : farkli.join(", ")}.`);

// ---------------------------------------------------------------------------------------------------------------- 1 mevcut yöntemler
yaz();
yaz("## 1. Mevcut yöntemlerin katma değeri (taban fiyat; elektrik 10 ₺)");
yaz();
yaz("KD = çıktı değeri − girdi değeri (₺/sa, S ölçek, bakım ve işletme hariç). İşçi mülk kipinde bağlayıcı değildir (`kalanIsci` sınırsız, ekonomi/uretim.ts:265), KD/işçi yalnız tutarlılık göstergesidir.");
yaz();
yaz(baslik("Yöntem", "Girdi → çıktı", "Oran", "KD ₺/sa", "İşçi", "KD/işçi", "Bant 1,16–1,48"));
const mevcut = IC.yontemler.filter((y) => Object.keys(y.girdiler).length > 0 && Object.keys(y.ciktilar).length > 0);
for (const y of mevcut) {
  const o = oran(y);
  yaz(satir(y.id, `${birim(y.girdiler)} → ${birim(y.ciktilar)}`, ond(o), tam(kd(y)), y.isci / 1000, tam(kdIsci(y)), o >= 1.16 && o <= 1.48 ? "içinde" : o < 1.16 ? "altında" : "ÜSTÜNDE"));
}
const std = IC.yontemler.find((y) => y.id === "standart_gida_isleme");
const besi = IC.yontemler.find((y) => y.id === "ahir_besi");
yaz();
yaz(`Not: \`standart_gida_isleme\` oran ${ond(oran(std))}, KD ${TL(kd(std))}/sa, işçi başına ${TL(kdIsci(std))}; \`ahir_besi\` oran ${ond(oran(besi))}. İkisi de bant dışındadır ve bölge kipi altınlarının parçasıdır (değiştirilemez); yeni zincirlerin rakibi budur.`);

// ---------------------------------------------------------------------------------------------------------------- 2 yeni yöntemler
yaz();
yaz("## 2. Yeni yöntemler (S ölçek; kod birimi mili, ₺ yanında)");
yaz();
yaz("Çevrim: sürekli akış, saatlik tik (kesikli parti yok). Çıktı/girdi/bakım mili-birim/sa; ölçek M ×2,2 / L ×3,6 (çıktı, girdi, elektrik), işçi ×1,8/×2,6, bakım ×2/×3,2 (`parametreler.sanayi.olcekKademeleri`).");
yaz();
yaz(baslik("Yöntem (tesis)", "Girdiler (mili)", "Çıktılar (mili)", "İşçi", "Bakım (mili parça/sa)", "Kirlilik ppm/sa"));
for (const [id, y] of Object.entries(YEN)) {
  const o = y.oneri;
  const mili = (m) => Object.entries(m).map(([k, q]) => `${k} ${tam(q)}`).join(", ");
  yaz(satir(`\`${id}\` (${y.tesis})`, mili(o.girdiler), mili(o.ciktilar), tam(o.isci), tam(o.bakim.parca), o.kirlilikPpmSaat));
}
yaz();
yaz("### 2.1 Oran, KD ve işçi başına KD (öneri ↔ rapor değerleri; elektrikli varyant E)");
yaz();
yaz(baslik("Yöntem", "Sürüm", "Girdi ₺/sa", "Çıktı ₺/sa", "Oran", "KD ₺/sa", "KD/işçi", "Bant"));
for (const [id, y] of Object.entries(YEN)) {
  for (const [ad, v] of [["öneri", y.oneri], ["rapor", y.rapor]]) {
    if (!v) continue;
    const o = oran(v);
    yaz(satir(id, ad, tam(deger(v.girdiler)), tam(deger(v.ciktilar)), ond(o, 3), tam(kd(v)), tam(kdIsci(v)), o >= 1.16 && o <= 1.48 ? "içinde" : "DIŞINDA"));
  }
}
yaz();
yaz("### 2.2 (Arşiv) Elektriksiz varyant Y: elektrik e → yakıt e/10 — baş lider kararıyla santral zorunluluğu kalktığı için kullanılmıyor");
yaz();
yaz(baslik("Yöntem", "E: elektrik", "Y: ek yakıt", "Y oran", "Y KD ₺/sa"));
for (const [id, y] of Object.entries(YEN)) {
  const e = y.oneri.girdiler.elektrik ?? 0;
  const yy = elektriksiz(y.oneri);
  yaz(satir(id, tam(e), tam(e / 10), ond(oran(yy), 3), tam(kd(yy))));
}

// Zincir toplamı: değirmen+fırın, standart_gida_isleme ile NPC fiyatlarında karşılaştırma.
function zincirKarsilastirma(kor) {
  const tahilDegeri = ihrac("tahil", kor); // kendi tahılının fırsat maliyeti: ihracat paritesi
  const r = [];
  // Elektrik ve yakıt: kamu şebekesi (baş lider kararı): kamu fiyat tavanı × taban.
  const elekBirim = SEB_EL;
  const sablon = (ad, y, tesisSayisi, satisFn, elekMaliyet = true) => {
    const gelir = satisFn(y.ciktilar);
    const gider = Object.entries(y.girdiler).reduce((t, [m, q]) => {
      if (m === "tahil") return t + (q / 1000) * tahilDegeri;
      if (m === "elektrik") return t + (elekMaliyet ? (q / 1000) * elekBirim : (q / 1000) * ELEKTRIK_FIYAT);
      if (m === "yakit") return t + (q / 1000) * SEB_YK;
      return t + (q / 1000) * ithal(m, kor);
    }, 0);
    const bakim = tesisSayisi * (0.8 * ithal("parca", kor) + PR.ekonomi.tesisIsletmeParasiSaat / 1000);
    r.push({ ad, gelir, gider, bakim, net: gelir - gider - bakim, tesis: tesisSayisi });
  };
  const satis = (c) => Object.entries(c).reduce((t, [m, q]) => t + (q / 1000) * ihrac(m, kor), 0);
  const birlesik = (a, b) => ({
    girdiler: { ...a.girdiler, tahil: a.girdiler.tahil, yakit: b.girdiler.yakit, elektrik: (a.girdiler.elektrik ?? 0) + (b.girdiler.elektrik ?? 0) },
    ciktilar: { ekmek: b.ciktilar.ekmek, kepek: a.ciktilar.kepek },
  });
  sablon("standart_gida_isleme → gida (1 tesis)", std, 1, satis);
  sablon("zincir, rapor değerleri (2 tesis)", birlesik(YEN.degirmen.rapor, YEN.ekmek_firini.rapor), 2, satis);
  sablon("zincir, A2 önerisi (2 tesis)", birlesik(YEN.degirmen.oneri, YEN.ekmek_firini.oneri), 2, satis);
  return r;
}
yaz();
yaz("### 2.3 Uzun yol kısa yolu geçiyor mu? (200 birim tahıl/sa; hepsi NPC pazarına satış; tahıl fırsat maliyeti = ihracat paritesi)");
yaz();
yaz("Ölçüt (uretim-agi §2.2): uzun yol kısa yoldan +%10–25 net değer vermeli. Net = satış − dış girdi (yakıt, elektrik: şebeke; parça: ithalat ×1,111) − bakım parçası − işletme gideri. Elektrik ve yakıt kamu şebekesi fiyatıyla (10,35 ve 103,5 ₺; §3.2) hesaplanır.");
yaz();
for (const [kor, ad] of [[false, "komisyonlu (14. günden sonra)"], [true, "korumada (ilk 14 gün; komisyon yok)"]]) {
  const s = zincirKarsilastirma(kor);
  yaz(`**${ad}**`);
  yaz();
  yaz(baslik("Yol", "Tesis", "Satış ₺/sa", "Dış girdi ₺/sa", "Bakım+işletme ₺/sa", "Net ₺/sa", "Tahıl başına net", "Standarta göre"));
  for (const x of s) yaz(satir(x.ad, x.tesis, tam(x.gelir), tam(x.gider), tam(x.bakim), tam(x.net), TL(x.net / 200), `${ond((x.net / s[0].net - 1) * 100, 1)}%`));
  yaz();
}

yaz("### 2.4 İthalatla ortadan başlamak ↔ kapalı zincir (kademe başına uzman marjı; komisyonlu; ₺/sa; elektrik ve yakıt şebeke fiyatıyla)");
yaz();
{
  const elekB = SEB_EL;
  const kademe = (ad, y, ozel = {}) => {
    const sat = Object.entries(y.ciktilar).reduce((t, [m, q]) => t + (q / 1000) * ihrac(m, false), 0);
    const gir = Object.entries(y.girdiler).reduce((t, [m, q]) => t + (q / 1000) * (m === "elektrik" ? elekB : m === "yakit" ? SEB_YK : ithal(m, false)), 0);
    const bk = (y.bakim.parca / 1000) * ithal("parca", false) + PR.ekonomi.tesisIsletmeParasiSaat / 1000;
    return { ad, sat, gir, bk, net: sat - gir - bk, oran: sat / gir };
  };
  const satirlar = [
    kademe("değirmen uzmanı (tahıl, elektrik ithal)", YEN.degirmen.oneri),
    kademe("değirmen uzmanı, rapor değerleri", YEN.degirmen.rapor),
    kademe("fırın uzmanı (un, yakıt ithal)", YEN.ekmek_firini.oneri),
    kademe("fırın uzmanı, rapor değerleri", YEN.ekmek_firini.rapor),
    kademe("cam fırını uzmanı (silis, yakıt ithal)", YEN.cam_firini.oneri),
    kademe("doğrama uzmanı (çelik, cam, parça ithal)", YEN.celik_dograma.oneri),
    kademe("kepek_gubresi uzmanı (kepek ithal 20 ₺)", YEN.kepek_gubresi.oneri),
  ];
  yaz(baslik("Kademe", "Satış (0,891 R) ₺/sa", "Girdi (1,111 R) ₺/sa", "Bakım+işletme ₺/sa", "Net ₺/sa", "Satış/girdi"));
  for (const x of satirlar) yaz(satir(x.ad, tam(x.sat), tam(x.gir), tam(x.bk), tam(x.net), ond(x.sat / x.gir, 3)));
  yaz();
  yaz("Okuma: bir kademe NPC pazarından alıp NPC pazarına satınca marjı yaklaşık `oran × 0,891/1,111 − 1` = `oran × 0,802 − 1` kadardır; bant 1,16–1,48 için bu −%7 ile +%19 aralığıdır. Bu yüzden bandın alt yarısındaki kademeler (cam 1,36; doğrama 1,36) uzman olarak sıfıra yakındır (Alfa-0'da ara kademe uzmanlığı yok kararıyla uyumlu, G13); üst uçtaki değirmen ve fırın küçük pozitiftir. İthalatla ortadan başlamak her kademede mümkündür ve zarar etmez, ama kapalı zincirin yanında marj çok incedir (§2.3).");
  yaz();
  yaz("P5 tarifleri: rapor (dikey §2.2) ↔ A2 önerisi (üst bant): cam 16 yakıt + 18 elektrik; doğrama 5 parça → 28 pencere.");
  yaz();
  yaz(baslik("Yöntem", "Sürüm", "Oran", "KD ₺/sa", "KD/işçi", "Uzman net ₺/sa (ithalatla başla)"));
  for (const id of ["cam_firini", "celik_dograma"]) {
    for (const [ad, v] of [["rapor", YEN[id].rapor], ["öneri", YEN[id].oneri]]) yaz(satir(id, ad, ond(oran(v), 3), tam(kd(v)), tam(kdIsci(v)), tam(kademe(id, v).net)));
  }
  yaz();
}

yaz("### 2.5 Kepek tüketicileri: NPC pazar alımı ↔ `kepek_gubresi` ↔ `sut_kepekli` (komisyonlu; ₺)");
yaz();
{
  const elekB = SEB_EL;
  const kepekNpc = ihrac("kepek", false);
  const kg = YEN.kepek_gubresi.oneri;
  const sk = YEN.sut_kepekli.oneri;
  const besi2 = IC.yontemler.find((y) => y.id === "ahir_besi");
  const bakimAhir = (0.5 * ithal("parca", false) + PR.ekonomi.tesisIsletmeParasiSaat / 1000);
  const tahilF = ihrac("tahil", false); // kendi tahılının fırsat maliyeti
  const kepekArz = YEN.degirmen.oneri.ciktilar.kepek / 1000; // 33/sa
  // Kepek birim değeri (tüketicinin ödeyebileceği net): çıktı − (diğer girdiler) − bakım/işletme, kepek başına
  const gubreGelir = (kg.ciktilar.gubre / 1000) * ihrac("gubre", false);
  const kgBirim = (gubreGelir - 5 * elekB - bakimAhir * 0 ) / (kg.girdiler.kepek / 1000);
  const kgUtil = Math.min(1, kepekArz / (kg.girdiler.kepek / 1000));
  const skUtil = Math.min(1, kepekArz / (sk.girdiler.kepek / 1000));
  const net = (gelir, giris, util) => gelir * util - giris * util - bakimAhir;
  const besiNet = (besi2.ciktilar.gida / 1000) * ihrac("gida", false) + (besi2.ciktilar.gubre / 1000) * ihrac("gubre", false) - (besi2.girdiler.tahil / 1000) * tahilF - bakimAhir;
  const kgNet = net(gubreGelir, 5 * elekB + (kg.girdiler.kepek / 1000) * kepekNpc, kgUtil);
  const skGelir = (sk.ciktilar.sut / 1000) * ihrac("sut", false) + (sk.ciktilar.gubre / 1000) * ihrac("gubre", false);
  const skGiris = (sk.girdiler.tahil / 1000) * tahilF + 5 * elekB + (sk.girdiler.kepek / 1000) * kepekNpc;
  const skNet = net(skGelir, skGiris, skUtil);
  yaz(baslik("Yol (ahır, 33 kepek/sa arzıyla)", "Kepeğin birim değeri ₺", "NPC kepek alımına göre", "Ahır yükü", "Ahır net ₺/sa (kepek fırsat maliyeti dahil)"));
  yaz(satir("NPC pazar kepek alımı (0,891 R)", ond(kepekNpc, 1), "-", "-", "0 (yapı gerekmez)"));
  yaz(satir("`kepek_gubresi` (100 kepek + 5 elektrik → 18 gübre)", ond(kgBirim, 1), `+%${ond((kgBirim / kepekNpc - 1) * 100, 0)}`, yuzde(kgUtil, 0), tam(kgNet)));
  yaz(satir("`sut_kepekli` (50 tahıl + 60 kepek → 82 süt + 4 gübre)", ond((skGelir - (sk.girdiler.tahil / 1000) * tahilF - 5 * elekB) / (sk.girdiler.kepek / 1000), 1), "-", yuzde(skUtil, 0), tam(skNet)));
  yaz(satir("karşılaştırma: `ahir_besi` (120 tahıl → 70 gıda + 12 gübre; kepek yok)", "-", "-", "%100", tam(besiNet)));
  yaz();
  yaz("Okuma: (1) NPC pazar kepek alımı kepeği çöpe gitmekten korur ama değeri yalnız 16 ₺/birimdir. (2) `kepek_gubresi` kepeğe NPC'nin %37 üstünde ödeyen en sade ikinci tüketicidir; tek girdi, tek çıktı, yeni mal yok, ahır tesisi. (3) `sut_kepekli` ve `kepek_gubresi` ahırın saatlik netinde mevcut `ahir_besi`nin (gıda ₺70 anomalisi, §1) çok gerisindedir: kepek yüzünden ahır kuran oyuncu çıkmaz, ahırı zaten tahılla besi için kuranın kepeği değerlendirmesi beklenir. Bu yüzden kepeğin P0 tüketicileri: **(a) NPC pazar kaydı (mevcut) + (b) `kepek_gubresi`**; `sut_kepekli` süt zinciri ile P1'e kalır (P0'da veri satırı olarak da girebilir, oynanış etkisi küçük).");
  {
    const OY = 200;
    const degirmen = Math.floor(OY / 4); // 50 değirmen (ekmek zinciri kuran oyuncu payı ≈ %25 varsayımı)
    const kepekHafta = degirmen * 33 * 168;
    const gubreHafta = (degirmen / 2) * (kg.ciktilar.gubre / 1000) * Math.min(1, 33 / 100) * 168; // ahırların yarısı kepek_gubresi, %33 yük
    const pay = 0.25;
    const bK = kepekHafta * pay * 0.5 * P("kepek");
    const bG = gubreHafta * pay * 0.5 * P("gubre");
    yaz();
    yaz(`**Güvence alıcı bütçesi (isteğe bağlı \`NpcAlici{tur:"guvence"}\`; fiyat R×%50).** NPC pazarı kepeği 120 × ölçek = ${tam(120 * (OY / 4))} birim/sa emer ve fiyatı ancak doyunca ×0,25'e (4,5 ₺) iner; güvence alıcı bu tabanı 9 ₺'de tutar. Alfa-0 varsayımı ${degirmen} değirmen: kepek ${tam(kepekHafta)} birim/hafta, gübre (\`kepek_gubresi\`) ${tam(gubreHafta)} birim/hafta. Haftalık hacim = üretimin %25'i: kepek ${tam(kepekHafta * pay)} birim × 9 ₺ = **${TL(bK)}**, gübre ${tam(gubreHafta * pay)} birim × 70 ₺ = **${TL(bG)}**; toplam ${TL(bK + bG)}/hafta (NPC faucet'ın <%1'i). Muhasebe: NPC'nin oyuncuya ödemesi mevcut \`musluk.ihracatNpc\` kalemine yazılır (yeni kalem yok); bütçe toplamı sabittir (K-5). Kodda \`NpcAlici\` yalnız \`tur: "kamu"\`'dur; güvence türü ek olurdu. **Gerekmez diyorsanız:** NPC pazarı zaten kepek ve gübreyi ≥ 0,25 R ile alır; çöpe gitme riski yoktur, güvence yalnız taban fiyatı yükseltir.`);
  }
  yaz();
}

// ---------------------------------------------------------------------------------------------------------------- 3 tesis maliyeti
yaz("## 3. Yapı bedeli, süre ve ayak izi (S/M/L)");
yaz();
const CARPAN = OLCEK.map((k) => k.insaPpm / PPM);
const SURE_C = MULK.olcekInsaSureCarpaniPpm.map((c) => c / PPM);
const tur = (id) => IC.tesisTurleri.find((t) => t.id === id);
const mal = (m) => Object.entries(m).reduce((t, [k, q]) => t + (q / 1000) * P(k), 0);
const EK = {
  dukkan: { ad: "Dükkân", insaParasi: 6_000_000, insaMaliyeti: { celik: 20000, parca: 8000, pencere: 4000 }, saat: 4, hucre: [1, 2, 3] },
};
function bedel(id, k) {
  const e = EK[id];
  const para = e ? e.insaParasi : tur(id).insaParasi;
  const ml = e ? e.insaMaliyeti : tur(id).insaMaliyeti;
  const saat = e ? e.saat : MULK.yapiInsaSaati[id];
  const hucre = e ? e.hucre[k] : MULK.olcekHucre[id][k];
  const carp = CARPAN[k];
  const mm = Object.fromEntries(Object.entries(ml).map(([m, q]) => [m, Math.floor(q * carp)]));
  return { para: Math.floor((para * carp) / 1000), mal: mm, saat: saat * SURE_C[k], hucre, taban: Math.floor((para * carp) / 1000) + mal(mm), ithal: Math.floor((para * carp) / 1000) + Object.entries(mm).reduce((t, [m, q]) => t + (q / 1000) * ithal(m, false), 0) };
}
yaz(baslik("Yapı", "Ölçek", "Para", "Çelik", "Parça", "Pencere", "Hücre", "Doğrudan süre (sa)", "Taban değer", "İthal değer"));
for (const id of ["ciftlik", "gida_fabrikasi", "ahir", "celikhane", "parca_fabrikasi", "santral", "silis_ocagi", "dukkan"]) {
  for (const k of [0, 1, 2]) {
    const b = bedel(id, k);
    yaz(satir(id, ["S", "M", "L"][k], TL(b.para), ond((b.mal.celik ?? 0) / 1000, 1), ond((b.mal.parca ?? 0) / 1000, 1), ond((b.mal.pencere ?? 0) / 1000, 1), b.hucre, ond(b.saat, 1), TL(b.taban), TL(b.ithal)));
  }
}
yaz();
yaz(`Hücre fiyatı (taban): kırsal ${TL(MULK.hucreFiyati.kirsal / 1000)}, kasaba ${TL(MULK.hucreFiyati.kasaba / 1000)}, şehir ${TL(MULK.hucreFiyati.sehir / 1000)}; ayrılmış hücre tabandan satılır. Ticari hücre dükkân için ≈×1,45 varsayıldı (dikey §5.2).`);

yaz();
yaz("### 3.1 Dükkân bedelindeki pencere: iki seçenek (A3 seçecek)");
yaz();
const dk = bedel("dukkan", 0);
const bPencereli = { para: 6000, celik: 20, parca: 8, pencere: 4 };
const penNPC = ithal("pencere", false);
const penKor = ithal("pencere", true);
yaz(baslik("Seçenek", "Veri (kod birimi)", "Taban değer", "İlk dükkân (indirimsiz) nakit", "İlk 5 yapıda %30 ile nakit", "Ek koşul"));
yaz(satir("P-İthal: 4 pencere dükkân bedelinde (G7)", "insaParasi 6000000; insaMaliyeti {celik 20000, parca 8000, pencere 4000}", TL(dk.taban), `${TL(6000)} + ${TL(4 * penNPC)} pencere ithalatı + 20 çelik + 8 parça`, `${TL(6000 * 0.7)} + ${TL(2.8 * penKor)} pencere + 14 çelik + 5,6 parça`, "`pencere` NPC pazar kaydı var (emilim 100/arz 60); ithalat emri 1 yuva ve ≈1 sa ister; kasa payı ilçe kasasına gider"));
const esdeger = 4 * P("pencere");
yaz(satir("P-Yok: dükkân bedeli pencere içermez, para eşdeğeri eklenir (G7); 4 pencere G8'de eklenir", `insaParasi ${(6000 + esdeger) * 1000}; insaMaliyeti {celik 20000, parca 8000}`, TL(6000 + esdeger + 20 * P("celik") + 8 * P("parca")), `${TL(6000 + esdeger)} + 20 çelik + 8 parça`, `${TL((6000 + esdeger) * 0.7)} + 14 çelik + 5,6 parça`, "ithalat emri gerekmez; yapı pencere talebi (Y tüketicisi) G8'e kalır, G8'de `insaMaliyeti.pencere` eklemek yalnız veri değişikliğidir (mevcut dükkânlar ödenmiş kalır)"));
yaz();
yaz(`Not: GDD'nin "≈11.440 ₺" değeri pencereyi ithalat fiyatıyla (≈400 ₺) sayar; taban fiyatla (360 ₺) dükkân ${TL(dk.taban)}, ithalatla ${TL(dk.ithal)}.`);

// ---------------------------------------------------------------------------------------------------------------- 3.2 santral
yaz();
yaz("### 3.2 Enerji: kamu şebekesi (elektrik ve yakıt) ve isteğe bağlı santral");
yaz();
yaz("Mevcut kod: mülk işletme düğümünde santral yoksa elektrik girdili tesis sıfır üretir (`sanayi/elektrik.ts:40-66`, `ekonomi/uretim.ts:381-410`); nüfus 0, kitte santral yok. **Baş lider kararı (G4): santral zorunluluğu yok.** Elektrik ve yakıt kamu şebekesinden otomatik gelir; fiyat kamu fiyat tavanı kuralıdır (`kamuFiyatTavani`: ulaşılabilir en düşük ithalat çarpanı = 1,035); ödeme kamuya (lavabo). Santral isteğe bağlı yatırımdır; fazlası satılamaz.");
yaz();
yaz(baslik("Kalem", "Taban ₺", "Şebeke fiyatı ₺", "Kod birimi (mili/birim)", "NPC ithalat (komisyonlu) ₺", "Not"));
yaz(satir("elektrik", ond(P("elektrik"), 2), ond(SEB_EL, 3), tam(SEB_EL * 1000), "-", "pazara girmez (depolanamaz); tek tedarik yolu şebeke ya da santral"));
yaz(satir("yakıt", ond(P("yakit"), 1), ond(SEB_YK, 2), tam(SEB_YK * 1000), ond(ithal("yakit", false), 1), "şebeke fiyatı NPC ithalatının %6,8 altındadır; emir yuvası harcamaz"));
yaz();
yaz("### 3.2.1 Elektrik ve yakıt maliyetinin KD'ye etkisi (S ölçek; KD taban fiyatla elektrik 10 ₺, yakıt 100 ₺ idi)");
yaz();
yaz(baslik("Yöntem", "Elektrik birim/sa", "Elektrik ₺/sa (şebeke)", "Yakıt birim/sa", "Yakıt ₺/sa (şebeke)", "KD taban ₺/sa", "KD şebeke ₺/sa", "Değişim"));
{
  const liste2 = [
    ["degirmen (öneri)", YEN.degirmen.oneri],
    ["ekmek_firini (öneri)", YEN.ekmek_firini.oneri],
    ["kepek_gubresi (öneri)", YEN.kepek_gubresi.oneri],
    ["sut_kepekli (öneri)", YEN.sut_kepekli.oneri],
    ["cam_firini (öneri)", YEN.cam_firini.oneri],
    ["celik_dograma (öneri)", YEN.celik_dograma.oneri],
    ["standart_gida_isleme (mevcut)", IC.yontemler.find((y) => y.id === "standart_gida_isleme")],
    ["yuksek_firin (mevcut)", IC.yontemler.find((y) => y.id === "yuksek_firin")],
    ["standart_parca (mevcut)", IC.yontemler.find((y) => y.id === "standart_parca")],
  ];
  for (const [ad, y] of liste2) {
    const e = (y.girdiler.elektrik ?? 0) / 1000;
    const yk = (y.girdiler.yakit ?? 0) / 1000;
    const kd0 = kd(y);
    const kd1 = kd0 - e * (SEB_EL - P("elektrik")) - yk * (SEB_YK - P("yakit"));
    yaz(satir(ad, ond(e, 1), ond(e * SEB_EL, 1), ond(yk, 1), ond(yk * SEB_YK, 1), tam(kd0), tam(kd1), `${ond((kd1 / kd0 - 1) * 100, 2)}%`));
  }
}
yaz();
yaz("Şebeke fiyatı taban fiyatın %3,5 üstündedir; KD etkisi çoğu yöntemde %2 altındadır; yakıt ağırlıklı olanlarda daha büyüktür (cam fırını -%4,2, standart_parca -%3,1). `standart_gida_isleme` 10 elektrik ister (103,5 ₺/sa; KD −3,5 ₺).");
yaz();
yaz("### 3.2.2 Santralin geri ödemesi (isteğe bağlı yatırım; şebeke fiyatına karşı)");
yaz();
{
  const kul = (0.25 / 0.95) * ithal("komur", false); // kömür ithal, iletim kaybı %5
  const sS = bedel("santral", 0);
  const hH = tur("hidro_santrali");
  const yatKomur = sS.ithal + 3 * 2500;
  const yatHidro = hH.insaParasi / 1000 + (hH.insaMaliyeti.celik / 1000) * ithal("celik", false) + (hH.insaMaliyeti.parca / 1000) * ithal("parca", false) + 3 * 2500;
  yaz(`Yatırım (ithal malzeme + 3 hücre): komür santrali ${TL(yatKomur)}, hidro ${TL(yatHidro)} (\`dag\` etiketi). Elektrik birim maliyeti kömür santralinde ${ond(kul, 2)} ₺ (kömür ithal), bakım 1,2 parça/sa = ${ond(1.2 * ithal("parca", false), 0)} ₺/sa sabit; hidroda 0 yakıt, bakım 2 parça/sa = ${ond(2 * ithal("parca", false), 0)} ₺/sa, çıktı 300 × akarsu eğrisi (0,4–2,4, yıllık ortalama 1).`);
  yaz();
  yaz(baslik("Elektrik talebi (birim/sa)", "Kömür santrali tasarruf ₺/sa", "Geri ödeme (sa)", "Hidro tasarruf ₺/sa", "Geri ödeme (sa)"));
  for (const e of [28.65, 61.65, 100, 150, 200]) {
    const tk = e * (SEB_EL - kul) - 1.2 * ithal("parca", false) * Math.ceil(e / 228);
    const th = Math.min(e, 285) * SEB_EL - 2 * ithal("parca", false);
    yaz(satir(ond(e, 2), tam(tk), tk > 0 ? tam(yatKomur / tk) : "hiç", tam(th), th > 0 ? tam(yatHidro / th) : "hiç"));
  }
  yaz();
  yaz(`28,65 = P4 zinciri (12 + 15 + kepek_gubresi 5×%33); 61,65 = P4 + P5 (+18 + 15). Kömür santralinin başa baş talebi ≈ ${tam((1.2 * ithal("parca", false)) / (SEB_EL - kul))} birim/sa; küçük ve orta ölçekli oyuncuya hiç geri ödemez. Hidro ≥ 100 birim/sa'te anlamlıdır ve yalnız dağ etiketli ilde mümkündür: **santral Alfa-0 için ekonomik zorunluluk değil, büyük ölçek (M/L) tercihidir.**`);
  yaz();
}
yaz("### 3.2.3 Santral türü × ölçek × yük: kendi elektriği ↔ şebeke (A3 uyarısı: tam yükte avantaj yalnız ≈%6)");
yaz();
{
  const OL = OLCEK; // ciktiPpm, bakimPpm, insaPpm
  const fiyatParca = ithal("parca", false);
  const kom = ithal("komur", false); // kömür NPC ithalatı (komisyonlu)
  const TURLER = [
    { ad: "komur_santrali", kap: 240, yakitBirim: 60, yakitFiyat: kom, bakim: 1.2, tur: "santral", yat: (k) => bedel("santral", k) },
    { ad: "yakit_jeneratoru", kap: 160, yakitBirim: 40, yakitFiyat: SEB_YK, bakim: 0.8, tur: "santral", yat: (k) => bedel("santral", k) },
    { ad: "hidro_santrali", kap: 300, yakitBirim: 0, yakitFiyat: 0, bakim: 2.0, tur: "hidro_santrali", yat: (k) => {
      const t = tur("hidro_santrali");
      const c = OL[k].insaPpm / PPM;
      const para = (t.insaParasi / 1000) * c;
      const ml = Object.entries(t.insaMaliyeti).reduce((a, [m, q]) => a + (q / 1000) * c * ithal(m, false), 0);
      return { ithal: para + ml, hucre: MULK.olcekHucre.hidro_santrali[k] };
    } },
  ];
  yaz(baslik("Tür", "Ölçek", "Kapasite (elektrik/sa, iletim sonrası)", "Bakım ₺/sa", "Yatırım (ithal malzeme + hücre) ₺", "Tasarruf ₺/sa @%10 yük", "@%25", "@%50", "@%100", "Birim maliyet ₺ @%100 (şebeke 10,35)", "Başabaş yük", "Geri ödeme @%100 yük (sa)"));
  for (const T of TURLER) {
    for (let k = 0; k < 3; k++) {
      const kapB = T.kap * (OL[k].ciktiPpm / PPM);
      const teslim = kapB * 0.95;
      const bakimTl = T.bakim * (OL[k].bakimPpm / PPM) * fiyatParca;
      const yat = T.yat(k);
      const yatTl = yat.ithal + yat.hucre * 2500;
      const tasarruf = (u) => u * teslim * SEB_EL - (u * T.yakitBirim * (OL[k].ciktiPpm / PPM) * T.yakitFiyat + bakimTl);
      const birim100 = (T.yakitBirim * (OL[k].ciktiPpm / PPM) * T.yakitFiyat + bakimTl) / teslim;
      const margin = teslim * SEB_EL - T.yakitBirim * (OL[k].ciktiPpm / PPM) * T.yakitFiyat; // u başına brüt tasarruf
      const be = margin > 0 ? bakimTl / margin : Infinity;
      const gt = tasarruf(1);
      yaz(satir(T.ad, ["S", "M", "L"][k], ond(teslim, 0), tam(bakimTl), tam(yatTl), tam(tasarruf(0.1)), tam(tasarruf(0.25)), tam(tasarruf(0.5)), tam(gt), ond(birim100, 2), be <= 1 ? yuzde(be, 0) : "hiç", gt > 0 ? tam(yatTl / gt) : "hiç"));
    }
  }
  yaz();
  yaz("Notlar: kömür santrali kömürü NPC ithalatından alır (33,3 ₺; kendi kömür ocağıyla fırsat maliyeti ihracat paritesi 26,7 ₺ olur: aşağıda), yakıt jeneratörü yakıtı şebekeden (103,5 ₺); hidro yakıtsızdır ve çıktı akarsu eğrisiyle 0,4–2,4 değişir (tablo yıllık ortalama 1). Tasarruf negatifse santral şebekeden pahalıdır. Yük = tesislerin elektrik talebi / santral teslim kapasitesi.");
  yaz();
  const kapS = 240 * 0.95;
  const kendiKomurFirsat = (0.25 / 0.95) * ihrac("komur", false);
  yaz(`Kendi kömür ocağıyla (kömür fırsat maliyeti ${ond(ihrac("komur", false), 1)} ₺) kömür santralinin tam yük birim maliyeti ${ond(((60 * ihrac("komur", false)) + 1.2 * fiyatParca) / kapS, 2)} ₺'dir (şebeke 10,35): tasarruf ${tam(kapS * SEB_EL - 60 * ihrac("komur", false) - 1.2 * fiyatParca)} ₺/sa. ${kendiKomurFirsat > 0 ? "" : ""}`);
  yaz();
  yaz("### 3.2.4 Vaat tutmuyor: seçenekler (şebeke fiyat çarpanı × santral girdi/bakım oranı)");
  yaz();
  yaz("Şebeke fiyatı kamu fiyat tavanı kuralından (1,035 R) türediği için tam yükte kömür santralinin avantajı +%5–6, yakıt jeneratörünün negatiftir; yalnız hidro (yakıtsız) ve ≥ %14 yükte anlamlıdır. Aşağıda **başabaş yük** (tasarrufun sıfır olduğu yük) üç kaldıraçla gösterilir; birim ₺, S ölçek:");
  yaz();
  yaz(baslik("Seçenek", "Şebeke fiyatı ₺/birim", "Kömür santrali S başabaş yük", "M", "L", "Jeneratör S", "Hidro S", "P4 oyuncusu (28,65/sa) şebeke gideri ₺/hafta", "Not"));
  const secenek = [
    ["0 — bugünkü (kural 1,035 R)", 1.035, 1, "vaat yalnız hidroda tutar"],
    ["O1 — şebeke satış çarpanı 1,25 R (tavan kuralı yalnız kamu ALIMINA uygulanır)", 1.25, 1, "satış fiyatı arbitraj açmaz; G4 metniyle çelişir"],
    ["O2 — şebeke satış çarpanı 1,50 R", 1.5, 1, "oyuncu şebeke gideri +%45"],
    ["O3 — santral kömür girdisi ×0,75 (mülk kipi; 60 → 45)", 1.035, 0.75, "bölge kipi `komur_santrali` aynı; mülk veri geçersiz kılma"],
    ["O4 — O3 + şebeke 1,25 R", 1.25, 0.75, "-"],
  ];
  const be = (k, fiyat, kg, tur2) => {
    const OLk = OL[k];
    const teslim = tur2.kap * (OLk.ciktiPpm / PPM) * 0.95;
    const brut = teslim * P("elektrik") * fiyat - tur2.yakitBirim * kg * (OLk.ciktiPpm / PPM) * tur2.yakitFiyat;
    const bk = tur2.bakim * (OLk.bakimPpm / PPM) * fiyatParca;
    return brut > 0 ? bk / brut : Infinity;
  };
  const f = (x) => (x <= 1 ? yuzde(x, 0) : "hiç");
  for (const [ad, fiyat, kg, not] of secenek) {
    const hf = 28.65 * P("elektrik") * fiyat * 168;
    yaz(satir(ad, ond(P("elektrik") * fiyat, 2), f(be(0, fiyat, kg, TURLER[0])), f(be(1, fiyat, kg, TURLER[0])), f(be(2, fiyat, kg, TURLER[0])), f(be(0, fiyat, 1, TURLER[1])), f(be(0, fiyat, 1, TURLER[2])), tam(hf), not));
  }
  yaz();
  yaz("Okuma: (O0) küçük oyuncunun yükü %10–25'tir (P4: 28,65/228 = %13), bu yükte bütün santral türleri şebekeden pahalıdır; M/L kömür santrali tam yükte +%5–6 yapar. (O1–O2) şebeke fiyatı yükseltilirse santral kömürde de anlamlı hâle gelir ama oyuncu elektrik gideri artar (P4 haftada 49.817 ₺ → 60.500–72.000 ₺, KD'nin ≤ %3'ü) ve G4'ün 'fiyat kamu tavanı kuralıyla' ifadesinden sapılır. (O3) santral maliyetini mülk kipinde düşürmek yalnız veri geçersiz kılma ister, bölge kipi altınları değişmez. (O5) 'vaadi düzelt': santral Alfa-0'da bir **ekonomik tasarruf değil bağımsızlık ve büyük ölçek tercihi** (hidro ve ≥ %50 yük) olarak tanımlanır; arayüz Yatırım Tahmini kartında tasarrufu açık yazar. Seçim baş liderindir.");
  yaz();
}
yaz();

yaz("### 3.2.5 Şebeke ödemesi: haftalık tutar ve para arzı");
yaz();
{
  const P4 = { el: 12 + 15 + 5 * (YEN.degirmen.oneri.ciktilar.kepek / 100000), yk: 20 }; // kepek_gubresi %33 yük
  const P5 = { el: 18 + 15, yk: 16 };
  const hf = (x) => ({ el: x.el * SEB_EL * 168, yk: x.yk * SEB_YK * 168 });
  yaz(baslik("Oyuncu", "Elektrik birim/sa", "Yakıt birim/sa", "Elektrik ₺/hafta", "Yakıt ₺/hafta", "Toplam ₺/hafta"));
  for (const [ad, x] of [["P4 (ekmek zinciri + kepek_gubresi)", P4], ["P4 + P5 (cam → pencere)", { el: P4.el + P5.el, yk: P4.yk + P5.yk }]]) {
    const h = hf(x);
    yaz(satir(ad, ond(x.el, 2), ond(x.yk, 0), tam(h.el), tam(h.yk), tam(h.el + h.yk)));
  }
  yaz();
  const h4 = hf(P4);
  const h45 = hf({ el: P4.el + P5.el, yk: P4.yk + P5.yk });
  yaz(baslik("İlçe başına haftalık şebeke ödemesi", "Elektrik ₺", "Yakıt ₺", "Toplam ₺"));
  for (const k of [1, 4.4, 10]) yaz(satir(`${ond(k, 1)} P4 oyuncusu`, tam(h4.el * k), tam(h4.yk * k), tam((h4.el + h4.yk) * k)));
  yaz(satir("4,4 oyuncu, %25'i P5'li", tam(h4.el * 4.4 + (h45.el - h4.el) * 1.1), tam(h4.yk * 4.4 + (h45.yk - h4.yk) * 1.1), tam((h4.el + h4.yk) * 4.4 + (h45.el + h45.yk - h4.el - h4.yk) * 1.1)));
  yaz();
  const dunya = 200;
  const elDunya = h4.el * dunya;
  const ykDunya = h4.yk * dunya;
  const yerelNpc = 92910226; // §6.3
  const ihrNpc = 112266000;
  yaz(`Dünya (200 P4 oyuncusu): elektrik ${tam(elDunya)} ₺/hafta, yakıt ${tam(ykDunya)} ₺/hafta. Karşılaştırma (§6.3, ekmek): \`yerelNpc\` ${tam(yerelNpc)} + \`ihracatNpc\` ${tam(ihrNpc)} = ${tam(yerelNpc + ihrNpc)} ₺/hafta musluk. **Yeni lavabo yalnız elektriktir** (${yuzde(elDunya / (yerelNpc + ihrNpc))} musluk); yakıt zaten NPC ithalatı olarak lavabodaydı (şimdi şebekeye ve ${ond(SEB_YK / ithal("yakit", false) * 100 - 100, 1)}% ucuza geçer). Muhasebe: oyuncudan çıkan para ya doğrudan \`lavabo.sebeke\` (yanar; öneri) ya da kamu kasası girişi olur; ikinci yolda kasa bakiyesi büyür ve harcama tavanları (tek alım %40, haftalık %25, oyuncu payı %50) paranın bir kısmını geri dolaşıma sokar. Kasaya yönlendirme "kasa yalnız zaten yanan paradan beslenir" kuralına uymaz (G4); bu yüzden doğrudan lavabo ya da ithalat makasındaki gibi %20 kasa payı (lavabodan ayrılan) seçilebilir.`);
  yaz();
}

// ---------------------------------------------------------------------------------------------------------------- 4 kanallar
yaz();
yaz("## 4. Satış kanalları ve kamu fiyat tavanı (R = taban fiyat)");
yaz();
function kanal(id) {
  const r = P(id);
  return [
    ["NPC ihracat (korumada / sonra)", `${ond(r * IHR(true), 1)} / ${ond(r * IHR(false), 1)}`, `${ond(IHR(true), 3)} / ${ond(IHR(false), 3)} R`],
    ["Esnaf fiyatı (ref ×1,12)", ond(r * 1.12, 1), "1,120 R"],
    ["Kamu siparişi tavanı", ond(r * KAMU_TAVAN, 1), `${ond(KAMU_TAVAN, 3)} R`],
    ["Dükkân bandı [0,7; 1,4] R", `${ond(r * 0.7, 1)} – ${ond(r * 1.4, 1)}`, "0,700 – 1,400 R"],
    ["NPC ithalat maliyeti (korumada / sonra)", `${ond(r * ITH(true), 1)} / ${ond(r * ITH(false), 1)}`, `${ond(ITH(true), 3)} / ${ond(ITH(false), 3)} R`],
  ];
}
for (const id of ["ekmek", "pencere"]) {
  yaz(`**${id}** (R = ${P(id)} ₺)`);
  yaz();
  yaz(baslik("Kanal", "₺/birim", "R çarpanı"));
  for (const k of kanal(id)) yaz(satir(...k));
  yaz();
}
yaz("Okuma: (1) kamu tavanı (1,035 R) ithalat maliyetinin (1,100–1,111 R) altındadır: NPC'den alıp kamuya satmak her oyuncu için ≤ 0 marj (docs/06 §15.7 madde 5). (2) Kamu siparişi NPC ihracatının %16,2 (komisyonlu) üstünde öder, dükkân fiyatı 1,035 R'nin altına indiğinde kamu siparişi dükkândan iyidir; üstüne çıkınca dükkân kazanır. (3) Dükkân perakende fiyatına kamu tavanı uygulanmaz (tavan kamu sipariş/ihale/esnaf siparişi içindir); tek üst sınır banttır (1,4 R) ve ithalat arbitrajı eşiği 1,111 R'dir (ZP11).");

yaz();
yaz("### 4.1 Kamu siparişi v0: mal listesi, fiyat ve hacim önerisi (ekmek, gıda, pencere, çelik, parça)");
yaz();
{
  const kasa = MULK.kasa;
  const oneriFiyat = 1.03; // kamu tavanı 1,035 R'nin altında, yuvarlama payı bırakır
  const BOYUT = { ekmek: 100, gida: 50, pencere: 10, celik: 30, parca: 20 };
  const nTop = (m) => Math.floor(P(m) * 1000 * Math.floor(oneriFiyat * 1000)) / 1000; // yer tutucu
  void nTop;
  yaz(baslik("Mal", "R ₺", "Tavan 1,035 R ₺ (kod: mili)", "Öneri 1,03 R ₺ (kod: mili)", "Sipariş boyutu (birim)", "Sipariş tutarı ₺", "Vade", "Rakip kanal: NPC ihracat 0,891 R ₺"));
  for (const m of Object.keys(BOYUT)) {
    const R = P(m);
    const tav = Math.floor((R * 1000 * Math.round(KAMU_TAVAN * 1000)) / 1000);
    const on = Math.floor((R * 1000 * Math.round(oneriFiyat * 1000)) / 1000);
    yaz(satir(m, ond(R, 0), `${ond(tav / 1000, 2)} (${tam(tav)})`, `${ond(on / 1000, 2)} (${tam(on)})`, BOYUT[m], tam((on / 1000) * BOYUT[m]), "3 gün", ond(ihrac(m, false), 1)));
  }
  yaz();
  yaz(`Kural: \`kamuFiyatTavani(d, ic, mal) = referans × kamuIthalatCarpaniPpm\` (\`packages/cekirdek/src/mulk/kasa.ts:415-424\`; çarpan derleme zamanında \`mulk/kamuFiyat.ts:18-22\`, \`derle.ts:193\`): min(1,10; 1,05; 1,30)=1,05, iki Ticaret ofisi makas indirimi (%30) ile 1,035. **Toplantı notu/GDD'deki "≤ 1,10 R" üst sınırdır; uygulanan 1,035 R'dir.** Öneri fiyat 1,03 R: NPC ihracatının %15,6 üstü, ithalat maliyetinin (1,10–1,111 R) altı, dükkân normal kademesinin (1,05 R) altı. Hacim sınırı kasa kurallarından gelir (\`mulk.kasa\`): tek alım ≤ bakiyenin %${kasa.tekAlimTavaniPpm / 10000}, haftalık bütçe ≤ 28 günlük girişin %${kasa.haftalikButcePpm / 10000}'i (4 haftada = haftalık giriş kadar), oyuncuya giden ≤ girişin %${kasa.oyuncuPayiTavaniPpm / 10000}'i.`);
  yaz();
  // İlçe kasası haftalık girişi: ithalat makası %20 + komisyon %50 (14. günden sonra) + arazi vergisi (%40 ilçe payı)
  const bakimIth = 2.1 * 180; // birim/sa × taban ₺ brüt
  const makasHaftalik = bakimIth * 0.1 * (kasa.ithalatMakasiIlcePpm / PPM) * 168;
  const komHaftalik = bakimIth * 0.01 * (kasa.ithalatKomisyonuIlcePpm / PPM) * 168;
  const oyuncuBasi = makasHaftalik + komHaftalik;
  const sebekePay = 0.2 * 397577; // şebeke ödemesinin %20'si ilçe kasasına (ithalat makası kuralının benzeri; öneri, §3.2.5)
  yaz(baslik("İlçe kasası haftalık girişi (oyuncu başına, P4 oyuncusu)", "₺/hafta", "4,4 oyuncu/ilçe", "Oyuncuya giden tavan (%50)", "Ekmek siparişi (100 birim, 103 ₺×100)"));
  yaz(satir("mevcut kaynaklar (ithalat makası %20 + komisyon %50; bakım parçası ithalatı)", tam(oyuncuBasi), tam(oyuncuBasi * 4.4), tam(oyuncuBasi * 4.4 * 0.5), ond((oyuncuBasi * 4.4 * 0.5) / (P("ekmek") * 1.03 * 100), 1) + " sipariş/hafta"));
  yaz(satir("+ şebeke ödemesinin %20'si ilçe kasasına (öneri seçeneği)", tam(oyuncuBasi + sebekePay), tam((oyuncuBasi + sebekePay) * 4.4), tam((oyuncuBasi + sebekePay) * 4.4 * 0.5), ond(((oyuncuBasi + sebekePay) * 4.4 * 0.5) / (P("ekmek") * 1.03 * 100), 1) + " sipariş/hafta"));
  yaz();
  yaz("Okuma: mevcut kaynaklarla ilçe kasası haftada birkaç bin ₺ toplar (GDD: ≈2.200 ₺); kamu siparişi v0 bu hâlde sembolik kalır (≈ haftada bir ekmek siparişi). Şebeke ödemesinin kasaya %20 pay vermesi siparişi oynanabilir yapar (haftada ≈ 29 ekmek siparişi/ilçe) ve ödeme zaten lavabodan ayrılan paydır (kasa kuralıyla uyumlu). **Öneri v0 hacmi:** ilçe başına haftada en çok 5 sipariş (ekmek 2, gıda 1, pencere 1, çelik 1; parça yedek), ilk kabul eden alır.");
  yaz();
}

yaz("### 4.2 Şebeke ödemesinin ilçe kasası payı (`kasaPayiPpm`): kamu siparişi v0 hacmini karşılar mı, korunum tam kapanır mı");
yaz();
{
  const kasa = MULK.kasa;
  const BOYUT = { ekmek: 100, gida: 50, pencere: 10, celik: 30, parca: 20 };
  const fiyatMili = (m) => Math.floor((P(m) * 1000 * 1030) / 1000); // 1,03 R
  const tutar = (m, n) => (fiyatMili(m) / 1000) * BOYUT[m] * n; // ₺
  const v0Cekirdek = tutar("ekmek", 2) + tutar("gida", 1) + tutar("pencere", 1) + tutar("celik", 1);
  const v0Yedek = v0Cekirdek + tutar("parca", 1);
  const sebP4 = (28.65 * SEB_EL + 20 * SEB_YK) * 168; // ₺/hafta, P4 oyuncusu
  const bakimIth = 2.1 * 180;
  const mevcut = bakimIth * 0.1 * (kasa.ithalatMakasiIlcePpm / PPM) * 168 + bakimIth * 0.01 * (kasa.ithalatKomisyonuIlcePpm / PPM) * 168;
  const pay = kasa.oyuncuPayiTavaniPpm / PPM; // oyuncuya giden ≤ girişin %50'si (28 günlük pencere)
  yaz(`Kamu siparişi v0 hacmi (ilçe başına haftada en çok 5 sipariş, fiyat 1,03 R): çekirdek (ekmek 2 + gıda 1 + pencere 1 + çelik 1) **${tam(v0Cekirdek)} ₺/hafta**; parça yedeği dahil ${tam(v0Yedek)} ₺/hafta. Kasa kuralları (\`mulk.kasa\`): oyuncuya giden ≤ girişin %${ond(pay * 100, 0)}'si (28 günlük pencere), haftalık bütçe ≤ 28 günlük girişin %${ond((kasa.haftalikButcePpm / PPM) * 100, 0)}'i, tek alım ≤ bakiyenin %${ond((kasa.tekAlimTavaniPpm / PPM) * 100, 0)}'ı. Sürekli rejimde haftalık sipariş kapasitesi = ${ond(pay, 1)} × haftalık giriş. Gerekli haftalık giriş: ${tam(v0Cekirdek / pay)} ₺ (çekirdek), ${tam(v0Yedek / pay)} ₺ (yedekli). Giriş = oyuncu sayısı × (mevcut kaynaklar ${tam(mevcut)} ₺ + \`kasaPayiPpm\` × şebeke ödemesi ${tam(sebP4)} ₺/hafta/P4 oyuncusu).`);
  yaz();
  const asgari = (v, n) => ((v / pay) / n - mevcut) / sebP4;
  yaz(baslik("İlçedeki P4 oyuncusu", "Asgari kasaPayi (çekirdek)", "Asgari kasaPayi (parça yedekli)"));
  for (const n of [1, 2, 4.4, 10]) yaz(satir(ond(n, n === 4.4 ? 1 : 0), yuzde(Math.max(0, asgari(v0Cekirdek, n)), 1), yuzde(Math.max(0, asgari(v0Yedek, n)), 1)));
  yaz();
  yaz(baslik("kasaPayiPpm", "Oyuncu/ilçe", "Haftalık giriş ₺", "Sipariş kapasitesi ₺/hafta (giriş × %50)", "v0 çekirdeği / kapasite", "Haftalık bütçe tavanı ₺ (giriş × %100)", "Lavaboya yanan ₺/hafta (şebekenin kalanı)"));
  for (const k of [0.05, 0.10, 0.12, 0.15, 0.20]) {
    for (const n of [1, 4.4, 10]) {
      const g = n * (mevcut + k * sebP4);
      yaz(satir(String(Math.round(k * PPM)), ond(n, n === 4.4 ? 1 : 0), tam(g), tam(g * pay), g * pay >= v0Cekirdek ? `karşılar (${ond((g * pay) / v0Cekirdek, 1)}x)` : `**karşılamaz** (${ond((g * pay) / v0Cekirdek, 2)}x)`, tam(g * (kasa.haftalikButcePpm / PPM) * 4), tam(n * sebP4 * (1 - k))));
    }
  }
  yaz();
  // tam tamsayı korunum örneği: bir haftalık şebeke ödemesi (mili), kasa payı floor, kalan lavabo
  const kPay = 120000;
  const Pm = BigInt(Math.round(sebP4 * 1000));
  const kasaM = (Pm * BigInt(kPay)) / BigInt(PPM);
  const lavM = Pm - kasaM;
  yaz(`Tamsayı korunum örneği (bir P4 oyuncusu, bir hafta, \`kasaPayiPpm\` ${tam(kPay)}): ödeme P = ${tam(Number(Pm))} mili; kasa = ⌊P × ${tam(kPay)} / 1.000.000⌋ = ${tam(Number(kasaM))} mili; lavabo \`sebeke\` = P − kasa = ${tam(Number(lavM))} mili; kasa + lavabo = ${tam(Number(kasaM + lavM))} = P (**fark 0**). Kural: önce kasa payı alt tamsayıya yuvarlanır, kalan lavaboya yazılır; böylece \`Σ hazine + Σ kasa + Σ lavabo = Σ musluk\` her tikte tam eşit kalır. Oyuncuya kasadan ödenen sipariş bedeli kasa → hazine devridir (musluk toplamı değişmez).`);
  yaz();
  const dunyaP = 200 * sebP4;
  yaz(`Dünya (200 P4 oyuncusu, 45 ilçe): şebeke ödemesi ${tam(dunyaP)} ₺/hafta; %12 payla kasaya ${tam(dunyaP * 0.12)} ₺/hafta gider, lavaboya ${tam(dunyaP * 0.88)} ₺/hafta yanar. Kamu siparişi v0 en çok ${tam(45 * v0Cekirdek)} ₺/hafta harcar (45 ilçe × çekirdek); kalan kasa girişi bakiyede birikir (tek alım ve haftalık bütçe tavanları geçerli) ve para arzını **büyütmez** (kasa yalnız zaten yanan paranın bir kısmıdır; sink payı %88'dir). Kasadan oyuncuya akan para sink'i en çok %${ond(0.12 * pay * 100, 0)} azaltır.`);
  yaz();
}
// ---------------------------------------------------------------------------------------------------------------- 5 dükkân S
yaz();
yaz("## 5. Dükkân S ekonomisi ve yerel pazar kanalı");
yaz();
const YEREL_OLCEK = 50; // dikey §5.6 ilk tahmin (kalibre edilmedi)
const TALEP = { gida: 120, ekmek: 60, sut_urunu: 20, sekerleme: 6, pencere: 8, cimento: 6 }; // mili-birim/1000 kişi/sa (dikey §5.6)
const Qm = (N, m) => ((N / 1000) * TALEP[m] * YEREL_OLCEK) / 1000; // birim/sa
const ESNAF_W = (1 / 1.12) ** 2;
const ESNAF_TABAN = 0.25;
// Çekim ağırlığı: w = (ref/fiyat)² · (1+0,25·çeşit)  (canlı-dünya §4.1). TAMSAYI/PPM: Math.pow/sqrt yok; kare iki bölmeyle alınır.
// Girdi/çıktı mili-birim ve ppm; kasa su-doldurma; esnaf tabanı %25.
const ters = (pPpm) => Math.floor((PPM * PPM) / pPpm); // 1/p (ppm)
const kare = (xPpm) => Math.floor((xPpm * xPpm) / PPM);
function agirlikPpm(pPpm, cesitPpm) {
  const w = kare(ters(pPpm));
  return Math.floor((w * (PPM + Math.floor((250000 * cesitPpm) / PPM))) / PPM);
}
const ESNAF_WPPM = kare(ters(1_120_000));
function yerelPazarMili(Qmili, dukkanlar) {
  const n = dukkanlar.length;
  const sat = new Array(n).fill(0);
  const w = dukkanlar.map((d) => agirlikPpm(d.pPpm, d.cesitPpm));
  let acik = dukkanlar.map((_, i) => i);
  let kalan = Qmili;
  for (let tur2 = 0; tur2 < 32 && acik.length > 0; tur2++) {
    const toplam = acik.reduce((t, i) => t + w[i], 0) + ESNAF_WPPM;
    const pay = (i) => Math.floor((kalan * w[i]) / toplam);
    if (!acik.some((i) => sat[i] + pay(i) > dukkanlar[i].kasaMili)) {
      for (const i of acik) sat[i] += pay(i);
      break;
    }
    const yeni = [];
    let kullanilan = 0;
    for (const i of acik) {
      if (sat[i] + pay(i) > dukkanlar[i].kasaMili) {
        kullanilan += dukkanlar[i].kasaMili - sat[i];
        sat[i] = dukkanlar[i].kasaMili;
      } else yeni.push(i);
    }
    kalan -= kullanilan;
    acik = yeni;
  }
  const top = sat.reduce((t, x) => t + x, 0);
  const tavan = Qmili - Math.floor((Qmili * 250000) / PPM); // esnaf tabanı %25
  if (top > tavan) for (let i = 0; i < n; i++) sat[i] = Math.floor((sat[i] * tavan) / top);
  return sat;
}
// Birim/sa arayüzü (tablolar için): p ve çeşit gerçek sayı, çıktı birim/sa.
const yerelPazar = (Q, dukkanlar) =>
  yerelPazarMili(Math.round(Q * 1000), dukkanlar.map((d) => ({ pPpm: Math.round(d.p * PPM), cesitPpm: Math.round(d.cesit * PPM), kasaMili: Math.round(d.kasa * 1000) }))).map((x) => x / 1000);
yaz("Model (dikey §5.6, canlı-dünya §4.1): `w = (1/p)² × (1+0,25·çeşit)`, esnaf `w = 0,797`, esnaf tabanı %25, kasa 90 birim/sa, `yerelOlcek` 50 (kalibre değil), η etkisi ihmal. Q: talep1000Saat × nüfus/1000 × 50.");
yaz();
yaz("### 5.1 Fırın dükkânı (ekmek; çeşit 0,5) satış hızı, ilçe nüfusuna göre (ilçede tek oyuncu, tek dükkân)");
yaz();
const NPC_EKMEK = ihrac("ekmek", false);
yaz(baslik("Nüfus", "Q ekmek (birim/sa)", "Fiyat (R)", "Satış (birim/sa)", "Kasa doluluğu", "Gelir ₺/sa", "NPC eşdeğeri ₺/sa", "Prim ₺/sa", "Gider ₺/sa", "Net ₺/sa", "ZP3 oranı"));
const GIDER_S = 132;
for (const N of [5000, 20000, 50000, 100000, 145000]) {
  for (const p of [1.0, 1.05, 1.12]) {
    const Q = Qm(N, "ekmek");
    const [s] = yerelPazar(Q, [{ p, cesit: 0.5, kasa: 90 }]);
    const gelir = s * P("ekmek") * p;
    const npc = s * NPC_EKMEK;
    yaz(satir(tam(N), ond(Q, 1), ond(p, 2), ond(s, 1), yuzde(s / 90, 0), tam(gelir), tam(npc), tam(gelir - npc), GIDER_S, tam(gelir - npc - GIDER_S), ond(p / IHR(false), 3)));
  }
}
yaz();
yaz("ZP3 oranı = dükkân satış fiyatı / NPC ihracat net fiyatı. Hedef bandı 1,05–1,20 (dikey §10): p ∈ [" + ond(1.05 * IHR(false), 3) + "; " + ond(1.2 * IHR(false), 3) + "] R (komisyonlu) ve [" + ond(1.05 * IHR(true), 3) + "; " + ond(1.2 * IHR(true), 3) + "] R (korumada).");

yaz();
yaz("### 5.2 Kalabalık ilçe: aynı ilçede k fırın dükkânı (hepsi 1,05 R), 100 bin nüfus");
yaz();
yaz(baslik("Dükkân sayısı", "Q ekmek", "Oyuncu satışı toplam", "Dükkân başına", "Esnafa kalan", "Dükkân başı net ₺/sa", "Geri ödeme (sa; ithal bedel 11.280 ₺ ≈ indirimsiz)"));
for (const k of [1, 2, 3, 5, 10]) {
  const Q = Qm(100000, "ekmek");
  const s = yerelPazar(Q, Array.from({ length: k }, () => ({ p: 1.05, cesit: 0.5, kasa: 90 })));
  const top = s.reduce((t, x) => t + x, 0);
  const net = s[0] * (P("ekmek") * 1.05 - NPC_EKMEK) - GIDER_S;
  yaz(satir(k, ond(Q, 0), ond(top, 1), ond(s[0], 1), yuzde(1 - top / Q, 0), tam(net), net > 0 ? ond(dk.ithal / net, 1) : "∞"));
}

yaz();
yaz("### 5.3 Dükkân S gider kalemi önerisi (ek yapıda işletme gideri bugün yok)");
yaz();
yaz(`Kod: ek yapılar \`b.tesisler\`e girmez; üretim, işletme gideri, işgücü ve elektrik hesabını etkilemez (docs/06 §15.3). Perakende raporu 132 ₺/sa (S), 204 (M), ≈330 (L) der: 60 ₺ işletme + bakım parçası ≈72 ₺. Öneri (G7): para-yalnız gider \`mulk.perakende.giderMiliSaat\` = [132000, 204000, 330000] (S/M/L); parça tüketimi ve aşınma YOK (ek yapının \`TesisDurumu\`'su yok; bakım döngüsünü dükkâna taşımak G7'yi büyütür). Lavabo kalemi: \`isletme\`. Hesap kaynağı: dükkân giderinin %${ond((132 / (P("ekmek") * 1.05 * 90)) * 100, 1)}'i kasa dolu bir fırın cirosudur.`);

yaz();
yaz("### 5.4 Dükkân fiyatı: `secim` kademesi (tutar değil) — kademe başına satış, gelir ve net");
yaz();
{
  const GRID = [700000, 800000, 850000, 900000, 950000, 1000000, 1050000, 1100000, 1150000, 1200000, 1300000, 1400000];
  const NPC = ihrac("ekmek", false);
  const sen = [
    ["şehir (120 bin), ilçede 1 dükkân (kasa bağlayıcı)", 120000, 0],
    ["kasaba (40 bin), ilçede 1 dükkân (talep bağlayıcı)", 40000, 0],
    ["şehir (120 bin), 5 dükkân (4 rakip 1,05 R)", 120000, 4],
    ["kasaba (40 bin), 3 dükkân (2 rakip 1,05 R)", 40000, 2],
  ];
  for (const [ad, N, rakip] of sen) {
    yaz(`**${ad}**`);
    yaz();
    yaz(baslik("Fiyat (R)", "Satış birim/sa", "Gelir ₺/sa", "Prim ₺/sa (NPC 0,891 R'ye göre)", "Net ₺/sa", "ZP3 (fiyat/0,891)", "NPC'den iyi mi"));
    const Q = Qm(N, "ekmek");
    for (const pp of GRID) {
      const dk = [{ p: pp / PPM, cesit: 0.5, kasa: 90 }, ...Array.from({ length: rakip }, () => ({ p: 1.05, cesit: 0.5, kasa: 90 }))];
      const s = yerelPazar(Q, dk)[0];
      const gelir = s * P("ekmek") * (pp / PPM);
      const prim = s * (P("ekmek") * (pp / PPM) - NPC);
      yaz(satir(ond(pp / PPM, 2), ond(s, 1), tam(gelir), tam(prim), tam(prim - GIDER_S), ond(pp / PPM / IHR(false), 3), prim > 0 ? "evet" : "HAYIR (zararına)"));
    }
    yaz();
  }
  yaz("Fiyat savaşının kendini cezalandırma eşiği: NPC ihracat net fiyatı 0,891 R (korumada 0,900 R). Dükkân bunun altında sattığında aynı birimi NPC pazarına satmaktan daha az alır: prim eksiye geçer. Kasa bağlayıcı olduğunda (120 bin nüfus) fiyat indirimi satışı artırmaz: yalnız gelir kaybıdır. Talep bağlayıcı ilçede (40 bin) indirim satışı artırır ama birim başına kaybı telafi etmez.");
  yaz();
  const KADEME = [
    ["kampanya (yalnız kampanya penceresi)", 850000],
    ["uygun", 950000],
    ["normal (varsayılan)", 1050000],
    ["yüksek", 1150000],
  ];
  yaz("**Önerilen kademeler** (`secim`: 0..3; çarpan PPM, `mulk.perakende.fiyatKademeleri`; bant [700000; 1400000] parametre olarak kalır, kademeler bandın içindedir):");
  yaz();
  yaz(baslik("Kademe", "Kod", "R çarpanı (ppm)", "ZP3 (komisyonlu)", "Net ₺/sa: şehir 1 dükkân", "kasaba 1 dükkân", "şehir 5 dükkân", "kasaba 3 dükkân"));
  KADEME.forEach(([ad, pp], i) => {
    const hucre = sen.map(([, N, rakip]) => {
      const dk = [{ p: pp / PPM, cesit: 0.5, kasa: 90 }, ...Array.from({ length: rakip }, () => ({ p: 1.05, cesit: 0.5, kasa: 90 }))];
      const s = yerelPazar(Qm(N, "ekmek"), dk)[0];
      return tam(s * (P("ekmek") * (pp / PPM) - NPC) - GIDER_S);
    });
    yaz(satir(ad, i, tam(pp), ond(pp / PPM / IHR(false), 3), ...hucre));
  });
  yaz();
}
yaz();
yaz("### 5.5 Yerel talep modeli: ilçe sınıfı × taban × iklim takvimi × bayram (tamsayı/PPM)");
yaz();
const SINIF_NUFUS = { kirsal: 10000, kasaba: 40000, sehir: 120000 }; // nüfus eşdeğeri (ilçe sınıfı = ilçenin baskın hücre sınıfı; öneri)
// mili-birim / 1000 kişi / sa. K1 sepeti sabit: gida 90 + ekmek 60 + un 10 + sut 20 + sut_urunu 20 = 200 (= bölge kipi gıda 200; dikey §5.6 karar)
const TALEP_Y = { gida: 90, ekmek: 60, un: 10, sut: 20, sut_urunu: 20, sekerleme: 6, findik_urunu: 3, yakit: 15, pencere: 8, cam: 4, celik: 6, parca: 5, cimento: 6 };
const GRUP = { gida: "gida", ekmek: "gida", un: "gida", sut: "gida", sut_urunu: "gida", sekerleme: "tatli", findik_urunu: "tatli", yakit: "yakit", pencere: "yapi", cam: "yapi", celik: "yapi", parca: "yapi", cimento: "yapi" };
// Aylık çarpan (Ocak..Aralık), ppm; her dizinin toplamı tam 12.000.000 (yıllık ortalama tam PPM, hidro eğrisi kuralı).
const TAKVIM = {
  gida: [1030000, 1020000, 1010000, 1000000, 990000, 970000, 960000, 970000, 1000000, 1020000, 1020000, 1010000],
  tatli: [1100000, 1050000, 980000, 950000, 900000, 850000, 820000, 850000, 950000, 1100000, 1200000, 1250000],
  yakit: [1400000, 1400000, 1200000, 950000, 750000, 650000, 600000, 600000, 750000, 950000, 1300000, 1450000],
  yapi: [650000, 650000, 900000, 1150000, 1300000, 1250000, 1200000, 1200000, 1200000, 1100000, 800000, 600000],
};
for (const [g, d] of Object.entries(TAKVIM)) {
  const t = d.reduce((a, b) => a + b, 0);
  if (t !== 12_000_000) throw new Error(`takvim toplamı ${g}: ${t}`);
}
const QMILI = (mal, sinif) => Math.floor((TALEP_Y[mal] * SINIF_NUFUS[sinif] * YEREL_OLCEK) / 1000); // mili-birim/sa (taban)
const qAy = (mal, sinif, ay) => Math.floor((QMILI(mal, sinif) * TAKVIM[GRUP[mal]][ay]) / PPM);
yaz("Formül (tamsayı): `Q[mal] = taban[sınıf][mal] × takvim[grup][ay] / 1.000.000 × bayram[grup] / 1.000.000`; `taban[sınıf][mal] = talep1000Saat[mal] × nüfusEşdeğeri[sınıf] × yerelOlcek / 1000` (mili-birim/sa). `yerelOlcek` = 50 (kalibre edilmedi; dikey R1).");
yaz();
yaz(`İlçe sınıfı nüfus eşdeğeri: kırsal ${tam(SINIF_NUFUS.kirsal)}, kasaba ${tam(SINIF_NUFUS.kasaba)}, şehir ${tam(SINIF_NUFUS.sehir)} (Alfa-0 ilçelerinin ortalaması ≈145 bin, canlı-dünya §3.3: çoğu şehir sınıfı).`);
yaz();
yaz(baslik("Mal", "talep1000Saat (mili)", "Takvim grubu", "Kırsal taban (mili-birim/sa)", "Kasaba taban", "Şehir taban", "Şehir birim/sa"));
for (const m of Object.keys(TALEP_Y)) yaz(satir(m, TALEP_Y[m], GRUP[m], tam(QMILI(m, "kirsal")), tam(QMILI(m, "kasaba")), tam(QMILI(m, "sehir")), ond(QMILI(m, "sehir") / 1000, 1)));
yaz();
yaz(`K1 sepet denetimi (hane harcaması sabit): gida+ekmek+un+sut+sut_urunu = ${TALEP_Y.gida + TALEP_Y.ekmek + TALEP_Y.un + TALEP_Y.sut + TALEP_Y.sut_urunu} mili/1000 kişi/sa = bölge kipi \`nufus.tuketim1000Saat.gida\` ${PR.nufus.tuketim1000Saat.gida} (ayrılan paylar toplamı değiştirmez; bölge kipi bloğuna dokunulmaz).`);
yaz();
yaz("Aylık takvim çarpanları (ppm; Ocak … Aralık; toplam 12.000.000):");
yaz();
yaz(baslik("Grup", "Mallar", ...["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]));
for (const [g, d] of Object.entries(TAKVIM)) yaz(satir(g, Object.keys(GRUP).filter((m) => GRUP[m] === g).join(", "), ...d.map((x) => tam(x))));
yaz();
yaz("Gerekçe: gıda sepeti hafif (kışın +%3, yazın −%4); tatlı ve kuruyemiş serin dönemde yüksek; yakıt kışın ×1,40–1,45, yazın ×0,60; yapı malzemesi ve pencere/cam bahar–yaz onarım–inşaat sezonunda yüksek, kışın düşük (kış fırtınası cam/pencere olayı bu takvimin üstüne gelir: canlı-dünya §5, ×1,5, tavanlı, takvimden bağımsız).");
yaz();
// Bayram dalgası: toplam sabit (yalnız zamanlama).
function bayram(Do, WoPpm, Ds) {
  const fazla = Do * (WoPpm - PPM); // gün·ppm
  const WsPpm = PPM - Math.ceil(fazla / Ds); // telafi çarpanı (yukarı yuvarlanan düşüş: toplam ≤ sabit)
  return { Do, WoPpm, Ds, WsPpm, sapma: Do * (WoPpm - PPM) + Ds * (WsPpm - PPM) };
}
const BAYRAM = { tatli: bayram(7, 1800000, 28), gida: bayram(5, 1250000, 10) };
yaz("Bayram dalgası (ayrı parametre; **toplam sabit, yalnız zamanlama**): bayramdan `Do` gün önce çarpan `Wo`, sonraki `Ds` gün çarpan `Ws = 1.000.000 − ⌈Do·(Wo − 1.000.000)/Ds⌉`. Tarihler takvim paketinden gelir (canlı-dünya §5.2); dükkân açık/kapalı kuralı yoktur (docs/12 §7).");
yaz();
yaz(baslik("Grup", "Do (gün)", "Wo (ppm)", "Ds (gün)", "Ws (ppm)", "Toplam sapma (gün·ppm)", "Uygulandığı mallar"));
for (const [g, b] of Object.entries(BAYRAM)) yaz(satir(g, b.Do, tam(b.WoPpm), b.Ds, tam(b.WsPpm), tam(b.sapma), Object.keys(GRUP).filter((m) => GRUP[m] === g).join(", ")));
yaz();
yaz("Yapı ve yakıt grupları bayramdan etkilenmez. Örnek (şehir, ekmek, birim/sa): " + ["Ocak", "Temmuz"].map((a, i) => `${a} ${ond(qAy("ekmek", "sehir", i === 0 ? 0 : 6) / 1000, 1)}`).join(", ") + `; bayram öncesi 5 günde Ocak ${ond(Math.floor((qAy("ekmek", "sehir", 0) * BAYRAM.gida.WoPpm) / PPM) / 1000, 1)}; şekerleme şehir: normal ${ond(QMILI("sekerleme", "sehir") / 1000, 1)}, bayram öncesi ${ond(Math.floor((QMILI("sekerleme", "sehir") * BAYRAM.tatli.WoPpm) / PPM) / 1000, 1)}, sonrası ${ond(Math.floor((QMILI("sekerleme", "sehir") * BAYRAM.tatli.WsPpm) / PPM) / 1000, 1)} birim/sa.`);
yaz();
// ---------------------------------------------------------------------------------------------------------------- 6 para musluğu
yaz();
yaz();
yaz("### 5.6 İlk dükkân geri ödeme (fırın, 1,05 R; ilk 24 saatte süre ×0,1; saat = kasa dolu/talep sınırlı satışla)");
yaz();
{
  const hucre = 2.5 * 1000 * 1.45; // ticari hücre (kasaba taban × 1,45)
  const nakit = (ind) => (ind ? 0.7 : 1) * 6000 + hucre + (ind ? 2.8 : 4) * ithal("pencere", false);
  const tamIthal = (ind) => (ind ? 0.7 : 1) * (6000 + 20 * ithal("celik", false) + 8 * ithal("parca", false)) + hucre + (ind ? 2.8 : 4) * ithal("pencere", false);
  yaz(baslik("İlçe sınıfı / k", "Net ₺/sa", "Nakit yatırım (kit stoğu var) indirimli / indirimsiz", "Geri ödeme sa (nakit)", "Tam ithal yatırım indirimli / indirimsiz", "Geri ödeme sa (tam ithal)"));
  for (const [sinif, k] of [["kirsal", 1], ["kasaba", 1], ["sehir", 1], ["sehir", 5], ["kasaba", 3]]) {
    const Q = qAy("ekmek", sinif, 9) / 1000;
    const s = yerelPazar(Q, Array.from({ length: k }, () => ({ p: 1.05, cesit: 0.5, kasa: 90 })))[0];
    const net = s * (P("ekmek") * 1.05 - ihrac("ekmek", false)) - GIDER_S;
    const go = (x) => (net > 0 ? ond(x / net, 1) : "∞");
    yaz(satir(`${sinif} / ${k}`, tam(net), `${TL(nakit(true))} / ${TL(nakit(false))}`, `${go(nakit(true))} / ${go(nakit(false))}`, `${TL(tamIthal(true))} / ${TL(tamIthal(false))}`, `${go(tamIthal(true))} / ${go(tamIthal(false))}`));
  }
  yaz();
  yaz("Hedefler (dikey §10, perakende §13): ilk dükkân medyan ≤ 36 sa (katılımdan), geri ödeme medyanı ≤ 48 sa. İlk dükkânın zamanı nakit değil çoğunlukla ilk iki saatteki inşaat sırası ve ithalat emri yuvasıdır (§8.2); geri ödeme kırsal ilçede hedefi tutturmaz (tek dükkânın neti ≈ gideri karşılar), kasaba ve şehirde tek dükkân 12–23 saatte kapanır; kalabalık kasabada (3 dükkân) 56–70 saate uzar ve hedefi aşar.");
  yaz();
}
yaz();
yaz("### 5.7 Ekmek zinciri ↔ `standart_gida_isleme`: üç tabanda karşılaştırma, erken oyun kısıtı, karar");
yaz();
yaz("Oyuncu yöntemi tesis başına seçer: iki yöntem de aynı `gida_fabrikasi`'nda çalışır (bedel, hücre, işçi aynı). Aşağıda her taban ayrı verilir. KD taban fiyatla (elektrik 10,35, yakıt 103,5 şebeke fiyatı dahil, §3.2.1); \"NPC net\" = satış ×0,891, dış girdi şebeke/ithalat, bakım ve işletme dahil, tahıl fırsat maliyeti ihracat paritesi.");
yaz();
{
  const stdY = IC.yontemler.find((y) => y.id === "standart_gida_isleme");
  const dg = YEN.degirmen.oneri;
  const fr = YEN.ekmek_firini.oneri;
  const kdS = (y) => kd(y) - (y.girdiler.elektrik ?? 0) / 1000 * (SEB_EL - P("elektrik")) - (y.girdiler.yakit ?? 0) / 1000 * (SEB_YK - P("yakit"));
  const kStd = kdS(stdY);
  const kDeg = kdS(dg);
  const kFir = kdS(fr);
  const kZincir = kDeg + kFir;
  const sT = bedel("gida_fabrikasi", 0);
  const isStd = stdY.isci / 1000;
  const isZin = (dg.isci + fr.isci) / 1000;
  yaz(baslik("Taban", "`standart_gida_isleme` (1 tesis)", "zincir (değirmen + fırın, 2 tesis)", "Zincir / standart", "Okuma"));
  yaz(satir("tahıl başına KD (200 tahıl/sa)", `${tam(kStd)} ₺/sa`, `${tam(kZincir)} ₺/sa`, `${ond((kZincir / kStd - 1) * 100, 1)}%`, "tahıl kısıtlıysa zincir kazanır"));
  const zk = zincirKarsilastirma(false);
  yaz(satir("tahıl başına NPC net (§2.3)", `${tam(zk[0].net)} ₺/sa`, `${tam(zk[2].net)} ₺/sa`, `+${ond((zk[2].net / zk[0].net - 1) * 100, 1)}%`, "aynı"));
  yaz(satir("tesis başına KD", `${tam(kStd)} ₺`, `${tam(kZincir / 2)} ₺ (değirmen ${tam(kDeg)}, fırın ${tam(kFir)})`, `${ond((kZincir / 2 / kStd - 1) * 100, 1)}%`, "**tesis kısıtlıysa standart kazanır**; tek kademe de tek başına standardı geçemez (değirmen 2.720 < 5.097)"));
  yaz(satir("işçi başına KD", `${tam(kStd / isStd)} ₺`, `${tam(kZincir / isZin)} ₺`, `${ond((kZincir / isZin / (kStd / isStd) - 1) * 100, 1)}%`, "işçi mülk kipinde bağlayıcı değil (`kalanIsci` sınırsız), Alfa-1 işgücü havuzunda bağlayıcı olabilir"));
  yaz(satir("hücre başına KD (her tesis 2 hücre)", `${tam(kStd / 2)} ₺`, `${tam(kZincir / 4)} ₺`, `${ond((kZincir / 4 / (kStd / 2) - 1) * 100, 1)}%`, "tesis tabanıyla aynı"));
  yaz(satir("sermaye başına KD/sa (S taban değer)", `${tam(kStd / sT.taban * 1000)} ‰`, `${tam(kZincir / (2 * sT.taban) * 1000)} ‰`, `${ond((kZincir / (2 * sT.taban) / (kStd / sT.taban) - 1) * 100, 1)}%`, "saatlik getiri binde (taban değer 20.800 ₺/tesis)"));
  yaz();
  yaz(`Yani tahıl tabanında zincir +%${ond((kZincir / kStd - 1) * 100, 1)} (KD) / +%${ond((zk[2].net / zk[0].net - 1) * 100, 1)} (NPC net) önde; tesis, işçi ve hücre tabanlarında %${ond(Math.abs((kZincir / 2 / kStd - 1) * 100), 0)}–%${ond(Math.abs((kZincir / isZin / (kStd / isStd) - 1) * 100), 0)} geridedir. Önemli olan hangi kısıtın erken oyunda bağlayıcı olduğudur.`);
  yaz();
  yaz("**Erken oyunda (0–7 gün) bağlayıcı kısıt: tahıl değil, tesis sermayesi değil; NPC pazar derinliği.**");
  yaz();
  yaz(baslik("Kısıt", "Değer", "Bağlayıcı mı?"));
  yaz(satir("Sermaye (S1-S: hazine ≥ 4 yapının tamamı)", "saat 2'de 41.710 ₺ (en düşük), saat 8'de 112.793 ₺", "hayır: 2 saat sonra"));
  yaz(satir("Tahıl", "Tarla 6.000 ₺ (indirimli 4.200 ₺), 12 dk inşa, 200 tahıl/sa; bir Tarla bir standart tesisi ya da zinciri besler", "hayır: Tarla her tesise yetişir (2 hücre)"));
  yaz(satir("Eşzamanlı inşaat", "2; ilk 24 saatte 4 yapı 1,0 sa", "yalnız ilk saatte"));
  yaz(satir("Hücre / ilçe tavanı", "yurt 6 + satın alma; ≤ 72 hücre/ilçe, ≤ %25 pay", "hayır (S1-S 7 hücre)"));
  yaz(satir("Emir yuvası", "temel 4 (+4 Ticaret ofisi): ekmek ihracat, parça ithalat, çelik/silis ithalat, kepek ihracat; yakıt ve elektrik şebekeden gelir (yuva harcamaz)", "P5'te sınırda"));
  const NN = [4, 20, 200];
  yaz(satir("**NPC pazar derinliği (oyuncu dilimi)**", NN.map((n) => `n=${n}: gıda ${ond((PZ.emilimSaat.gida / 1000) * (Math.max(4, n) / 4) / n, 1)}, ekmek ${ond((PZ.emilimSaat.ekmek / 1000) * (Math.max(4, n) / 4) / n, 1)} birim/sa`).join("; "), "**evet** (n ≥ 4 için kişi başı dilim sabit: gıda 75, ekmek 62,5; bir S standart tesis 160, bir S fırın 250 üretir)"));
  yaz();
  // Strateji tablosu (n=200, şehir sınıfı, 1 dükkân/oyuncu, k=4 rakip)
  const n = 200;
  const dilimGida = (PZ.emilimSaat.gida / 1000) * (n / 4) / n;
  const dilimEkmek = (PZ.emilimSaat.ekmek / 1000) * (n / 4) / n;
  const kor1 = false;
  const hasatTahil = ihrac("tahil", kor1);
  // yerel dükkân satışları (şehir; k=4 dükkân/ilçe; fiyat 1,05 R)
  const kk = 4;
  const bakkalGida = yerelPazar(qAy("gida", "sehir", 9) / 1000, Array.from({ length: kk }, () => ({ p: 1.05, cesit: 1 / 6, kasa: 90 })))[0];
  const firinEkmek = yerelPazar(qAy("ekmek", "sehir", 9) / 1000, Array.from({ length: kk }, () => ({ p: 1.05, cesit: 0.5, kasa: 90 })))[0];
  const sabitStd = bedel("gida_fabrikasi", 0) && (PR.ekonomi.tesisIsletmeParasiSaat / 1000 + 0.8 * ithal("parca", kor1));
  const std = (satisNpc, satisYerel, yerelFiyat) => {
    const birim = satisNpc + satisYerel;
    const yuk = birim / 160;
    const gelir = satisNpc * ihrac("gida", kor1) + satisYerel * P("gida") * yerelFiyat;
    const gider = yuk * 200 * hasatTahil + yuk * 10 * SEB_EL + sabitStd + (satisYerel > 0 ? GIDER_S : 0);
    return { yuk, net: gelir - gider };
  };
  const zin = (satisNpc, satisYerel, yerelFiyat) => {
    const birim = satisNpc + satisYerel;
    const yuk = Math.min(1, birim / FIRIN_EKMEK);
    const gelir = satisNpc * ihrac("ekmek", kor1) + satisYerel * P("ekmek") * yerelFiyat + yuk * 33 * ihrac("kepek", kor1);
    const gider = yuk * 200 * hasatTahil + yuk * 27 * SEB_EL + yuk * 20 * SEB_YK + 2 * sabitStd + (satisYerel > 0 ? GIDER_S : 0);
    return { yuk, net: gelir - gider };
  };
  const A = std(Math.min(160, dilimGida), 0, 1);
  const A2 = std(Math.min(160 - 0, dilimGida), Math.min(160 - dilimGida, bakkalGida), 1.05);
  const B = zin(Math.min(FIRIN_EKMEK, dilimEkmek), 0, 1);
  const B2 = zin(dilimEkmek, firinEkmek, 1.05);
  yaz(`**Pazar dilimli oyuncu karşılaştırması (n = ${n}, şehir ilçesi, ilçede ${kk} dükkân, 1,05 R; NPC dilimi gıda ${ond(dilimGida, 1)}, ekmek ${ond(dilimEkmek, 1)} birim/sa; ₺/sa, tahıl fırsat maliyeti dahil).**`);
  yaz();
  yaz(baslik("Strateji", "Yük", "Net ₺/sa", "Not"));
  yaz(satir("A: yalnız `standart_gida_isleme`, NPC dilimi (dükkânsız)", yuzde(A.yuk, 0), tam(A.net), `${ond(dilimGida, 0)} birim/sa sat`));
  yaz(satir("A+: standart + bakkal dükkânı (gıda rafı; NPC dilimi + dükkân)", yuzde(A2.yuk, 0), tam(A2.net), `dükkân ${ond(Math.min(160 - dilimGida, bakkalGida), 1)} birim/sa`));
  yaz(satir("B: yalnız ekmek zinciri, NPC dilimi (dükkânsız)", yuzde(B.yuk, 0), tam(B.net), "2 tesis sabit gideri; düşük yük"));
  yaz(satir("B+: ekmek zinciri + fırın dükkânı", yuzde(B2.yuk, 0), tam(B2.net), `dükkân ${ond(firinEkmek, 1)} birim/sa`));
  yaz(satir("**C: A+ ve B+ birlikte (iki ayrı tahıl hattı, iki dükkân; ilçe ≤ 2)**", "-", tam(A2.net + B2.net), "iki pazar havuzu; tesis tabanı karşılaştırması değil, tamamlayıcılık"));
  yaz(satir("D: ikinci standart tesis (gıda havuzu zaten doluyken; fazla gıda fiyat ×0,25'e iner)", "-", tam(160 * ihrac("gida", kor1) * 0.25 - 200 * hasatTahil - 10 * SEB_EL - sabitStd), "marjinal gelir negatif: doymuş havuza ikinci tesis kâr etmez"));
  yaz();
  yaz(`Okuma: tek ürünle (A+ ${tam(A2.net)} ↔ B+ ${tam(B2.net)}) standart yol ${ond((A2.net / B2.net - 1) * 100, 0)}% önde kalır (gıda ₺70 ve oran 1,84'ün sonucu); ama oyuncu dilimi tek mal havuzunu doldurur ve **ikinci tesis marjinal olarak değersizdir (D)**: oyuncunun asıl kararı "ikinci standart mı, zincir mi" ise zincir ${tam(B2.net)} ₺/sa kazandırır, ikinci standart eksiye düşer. Standart ve zincir ikame değil **tamamlayıcıdır** (C = ${tam(A2.net + B2.net)} ₺/sa). Tesis tabanındaki −%28 kayıp bu yüzden erken oyunda ve n ≥ 4 her dünyada bağlayıcı değildir.`);
  yaz();
  // Fırın çıktısı duyarlılığı (K/U ilkesi +%10–25 ↔ M beklentisi)
  yaz("**Fırın çıktısı duyarlılığı (165 un + 20 yakıt + 15 elektrik → x ekmek): zincirin standarda göre üstünlüğü ve strateji kararı.**");
  yaz();
  const girFir = deger(fr.girdiler);
  const zinO = (cikti, satisNpc, satisYerel, yerelFiyat) => {
    const birim = satisNpc + satisYerel;
    const yuk = Math.min(1, birim / cikti);
    const gelir = satisNpc * ihrac("ekmek", kor1) + satisYerel * P("ekmek") * yerelFiyat + yuk * 33 * ihrac("kepek", kor1);
    const gider = yuk * 200 * hasatTahil + yuk * 27 * SEB_EL + yuk * 20 * SEB_YK + 2 * sabitStd + (satisYerel > 0 ? GIDER_S : 0);
    return { yuk, net: gelir - gider };
  };
  yaz(baslik("Fırın çıktısı (ekmek/sa)", "Fırın oranı", "Fırın KD ₺/sa (şebeke)", "Zincir net, tahıl tabanı ₺/sa", "Zincir / standart", "Fırın uzmanı net ₺/sa", "B+ (pazar dilimi) ₺/sa", "C = A+ ve B+ ₺/sa", "B+ − D (ikinci tesis karar farkı)"));
  const dNet = 160 * ihrac("gida", kor1) * 0.25 - 200 * hasatTahil - 10 * SEB_EL - sabitStd;
  const uzman0 = (() => {
    const sat = FIRIN_EKMEK * ihrac("ekmek", false);
    return sat;
  })();
  void uzman0;
  for (const out of [250, 245, 243, 240, 235, 230]) {  // duyarlılık satırları sabit; öneri = FIRIN_EKMEK
    const dlt = (FIRIN_EKMEK - out) * ihrac("ekmek", false);
    const zincirNet = zk[2].net - dlt;
    const bp = zinO(out, dilimEkmek, firinEkmek, 1.05);
    // fırın uzmanı: satış çıktı kadar, girdiler ithal/şebeke (§2.4 ile aynı kalemler)
    const kFirOut = kFir - (FIRIN_EKMEK - out) * P("ekmek");
    const uzman = out * ihrac("ekmek", false) - (fr.girdiler.un / 1000) * ithal("un", false) - (fr.girdiler.yakit / 1000) * SEB_YK - (fr.girdiler.elektrik / 1000) * SEB_EL - ((fr.bakim.parca / 1000) * ithal("parca", false) + PR.ekonomi.tesisIsletmeParasiSaat / 1000);
    yaz(satir(String(out), ond((out * P("ekmek")) / girFir, 3), tam(kFirOut), tam(zincirNet), `+${ond((zincirNet / zk[0].net - 1) * 100, 1)}%`, tam(uzman), tam(bp.net), tam(A2.net + bp.net), tam(bp.net - dNet)));
  }
  yaz();
  yaz("Okuma: pazar dilimi bağlayıcıyken (n ≥ 4) fırın tesisinin yükü %50 dolayındadır (sattığı birim sayısı 131/sa < çıktı), bu yüzden çıktıyı 250 → 230 arasında değiştirmek B+ ve C'yi çok az etkiler (yük ve girdi payı hafif değişir); karar farkı (B+ − D: ikinci tesisi zincire çevirmek) 6.200–6.500 ₺/sa kalır. Çıktı değişimi asıl tahıl tabanında (tam yük) zincirin üstünlüğünü etkiler (250'de +%33,6, 240'ta +%21,2). Öneri satırı: betikteki `FIRIN_EKMEK` (240).");
  yaz();
  // Seçenekler
  yaz("**Yine de tesis tabanını garanti etmek istenirse (seçenekler; bandı aşmadan):**");
  yaz();
  const k2 = (v) => v;
  void k2;
  const stdZ = { girdiler: { tahil: 200000, elektrik: 10000 }, ciktilar: { gida: 120000 } };
  const yog = (f) => ({ dg: kdS({ girdiler: { tahil: 200000 * f, elektrik: 12000 * f }, ciktilar: { un: 165000 * f, kepek: 33000 * f } }), fr: kdS({ girdiler: { un: 165000 * f, yakit: 20000 * f, elektrik: 15000 * f }, ciktilar: { ekmek: 250000 * f } }) });
  yaz(baslik("Seçenek", "Değişiklik", "Standart tesis KD", "Değirmen KD", "Fırın KD", "Kademe başına > standart?", "İşçi başına", "Yan etki"));
  yaz(satir("0 — olduğu gibi", "-", tam(kStd), tam(kDeg), tam(kFir), "hayır", "standart ≫", "pazar dilimi kısıtında tamamlayıcı (yukarıda)"));
  const y2 = yog(2);
  yaz(satir("G1 — zincir yoğunluğu ×2 (tesis başına hacim)", "değirmen 400 tahıl → 330 un + 66 kepek; fırın 330 un + 40 yakıt + 30 elektrik → 500 ekmek (oranlar aynı)", tam(kStd), tam(y2.dg), tam(y2.fr), `**evet** (${tam(y2.dg)} > ${tam(kStd)}; ${tam(y2.fr)} > ${tam(kStd)})`, "işçi ×2 ise ≈ 544/566 < 849", "Tarla:değirmen 2:1; fırın 500/sa pazar dilimini 2× aşar; mevcut yöntemlere dokunmaz"));
  yaz(satir("G2 — `standart_gida_isleme` mülk kipinde ×0,75 (160 → 120 gıda; oran 1,38 bantta)", "mülk kipinde yöntem çıktı geçersiz kılma (bölge kipi aynı)", tam(kdS(stdZ)), tam(kDeg), tam(kFir), `**evet** (${tam(kDeg)} ve ${tam(kFir)} > ${tam(kdS(stdZ))})`, "standart 383 < 545/575 ✓", "mülk veri geçersiz kılma mekanizması (K3, M); çiftçi botu gıda fabrikası kurmaz: ölçüm temel çizgisi değişmez"));
  yaz(satir("G3 — (i) `standart_gida_isleme` mülk kipinde kapat", "`mulkKipi`'nin tersi: `yalnizBolge: true`", "-", tam(kDeg), tam(kFir), "n/a", "n/a", "yeni oyuncunun tek basit gıda işleme yolu kalkar; G6 kapsamı büyür (süzgeç); `gida` arzı yalnız ahır/mera"));
  yaz();
  yaz("Bant içinde başka güçlendirme yok: ekmek tabanını %10 artırmak fırın oranını 1,59'a çıkarır (bant dışı); fırında yakıt 20 → 15 oranı 1,52 yapar (bant dışı); değirmenin tek başına 5.097 KD'ye ulaşması 6.120 girdide 0,83 oran gerektirir (bant üstü). Yani tesis tabanında kademe başına standardı geçmek yalnız hacim (G1) ya da standardı zayıflatmak (G2) ile olur.");
  yaz();
  yaz("**Karar.** Erken oyunun bağlayıcı kısıtı pazar derinliğidir ve zincir ikinci havuz olarak standardın tamamlayıcısıdır: **(ii) güçlendirme zorunlu değil, (i) kapatma gereksiz.** Baş lider tesis tabanını da kural yaparsa: **G2** (standart ×0,75, mülk kipinde yalnız veri) en az yan etkili yoldur (bölge kipi, botlar, ölçüm temel çizgisi aynı); G1 hacmi ikiye katladığı için pazar doyumunu (§1.3-B3) hızlandırır, önerilmez.");
  yaz();
}
yaz("### 5.8 Cam fırını ve doğrama: ev sahibi tesisin mevcut yöntemlerine karşı (tesis tabanı)");
yaz();
{
  const kdS = (y) => kd(y) - (y.girdiler.elektrik ?? 0) / 1000 * (SEB_EL - P("elektrik")) - (y.girdiler.yakit ?? 0) / 1000 * (SEB_YK - P("yakit"));
  const g = (id) => IC.yontemler.find((y) => y.id === id);
  const sat2 = [
    ["celikhane", "yuksek_firin", g("yuksek_firin"), "mevcut; cevher + kömür ister"],
    ["celikhane", "elektrik_ark", g("elektrik_ark"), "mevcut; teknoloji `elektrik_ark_ocagi` (30 M ₺, 3 gün) ister"],
    ["celikhane", "cam_firini (öneri)", YEN.cam_firini.oneri, "yeni"],
    ["parca_fabrikasi", "standart_parca", g("standart_parca"), "mevcut (varsayılan yöntem)"],
    ["parca_fabrikasi", "otomatik_hat", g("otomatik_hat"), "mevcut; teknoloji `otomasyon` + elektronik ister"],
    ["parca_fabrikasi", "cam_firini (öneri, alternatif ev)", YEN.cam_firini.oneri, "yeni; barındıran tesis `parca_fabrikasi` olursa"],
    ["parca_fabrikasi", "celik_dograma (öneri)", YEN.celik_dograma.oneri, "yeni"],
  ];
  yaz(baslik("Ev sahibi tesis", "Yöntem", "Oran", "KD ₺/sa (şebeke)", "KD/işçi", "Not"));
  for (const [t, ad, y, not] of sat2) yaz(satir(t, ad, ond(oran(y), 3), tam(kdS(y)), tam(kdS(y) / (y.isci / 1000)), not));
  yaz();
  const cH = bedel("celikhane", 0);
  const pH = bedel("parca_fabrikasi", 0);
  yaz(baslik("Cam fırını için ev sahibi", "S yapı bedeli", "Çelik / parça", "Hücre", "S süre (sa)", "İthal değer", "M / L yapı", "Yöntem sayısı (A0 sonrası)", "Aynı tesisteki rakip yöntem"));
  yaz(satir("`celikhane` (rapor önerisi)", TL(cH.para), `${cH.mal.celik / 1000} / ${cH.mal.parca / 1000}`, cH.hucre, cH.saat, TL(cH.ithal), `${TL(bedel("celikhane", 1).para)} / ${TL(bedel("celikhane", 2).para)}`, "2 mevcut + `cam_firini` (K-8: 10'a doğru)", "yuksek_firin 1.941 > cam 1.408"));
  yaz(satir("`parca_fabrikasi`", TL(pH.para), `${pH.mal.celik / 1000} / ${pH.mal.parca / 1000}`, pH.hucre, pH.saat, TL(pH.ithal), `${TL(bedel("parca_fabrikasi", 1).para)} / ${TL(bedel("parca_fabrikasi", 2).para)}`, "2 mevcut + `celik_dograma` + `cam_firini`", "standart_parca 1.241 < cam 1.408 ✓"));
  yaz(satir("fark (`parca_fabrikasi` − `celikhane`)", TL(pH.para - cH.para), `${(pH.mal.celik - cH.mal.celik) / 1000} / ${(pH.mal.parca - cH.mal.parca) / 1000}`, pH.hucre - cH.hucre, pH.saat - cH.saat, TL(pH.ithal - cH.ithal), "-", "-", "-"));
  yaz();
  yaz("Okuma: `celik_dograma` ev sahibinin iki mevcut yönteminden de iyidir (KD 3.105 ↔ 1.241 / 1.800). `cam_firini` `celikhane`'de varsayılan `yuksek_firin`in (1.941) **altında** kalır (−%27), `parca_fabrikasi`'nde varsayılan `standart_parca`yı (1.241) **geçer** (+%13) ve ev sahibi 5.000 ₺ + 20 çelik + 10 parça ve bir hücre ucuzdur (ithal değer −9.666 ₺). Sayısal tercih `parca_fabrikasi`'dir; seçim A3'ündür.");
  yaz();
}

yaz("## 6. Yerel pazar kanalının para musluğu (`yerelNpc`)");
yaz();
yaz("Hane bütçesi B = Σ Q·R·1,12 (dikey §5.9; Q §5.5'in yeni taban tablosundan). Oyuncuya akabilecek tavan: B × (1 − esnaf tabanı %25). Esnaf payı parayı oyuncuya vermez ve defterde kalem değildir (NPC kesesi modellenmez, canlı-dünya §3.4). Haftalık musluk = Σ oyuncu yerel satışı × 168.");
yaz();
const BUTCE_MALLAR = Object.keys(TALEP_Y);
const Bsinif = (sinif, ay = 9) => BUTCE_MALLAR.reduce((t, m) => t + (qAy(m, sinif, ay) / 1000) * P(m) * 1.12, 0); // Ekim
yaz("### 6.1 İlçe başına haftalık tavan ve tek dükkân (Ekim takvimi)");
yaz();
yaz(baslik("İlçe sınıfı", "B ₺/sa (13 mal)", "Oyuncu tavanı ₺/hafta", "Fırın (ekmek) Q birim/sa", "1 fırın dükkânı ₺/hafta (1,05 R)", "Tavanın payı"));
for (const sinif of ["kirsal", "kasaba", "sehir"]) {
  const B = Bsinif(sinif);
  const Q = qAy("ekmek", sinif, 9) / 1000;
  const [s] = yerelPazar(Q, [{ p: 1.05, cesit: 0.5, kasa: 90 }]);
  const hafta = s * P("ekmek") * 1.05 * 168;
  yaz(satir(sinif, tam(B), tam(B * 0.75 * 168), ond(Q, 1), tam(hafta), yuzde(hafta / (B * 0.75 * 168))));
}
yaz();
yaz("### 6.2 İnce dünya (ilçede 1 oyuncu) ve kalabalık: haftalık `yerelNpc` musluğu (fırın dükkânları, hepsi 1,05 R, Ekim)");
yaz();
yaz(baslik("İlçe sınıfı", "Dükkân sayısı (k)", "Dükkân başı satış birim/sa", "İlçe toplamı ₺/hafta (musluk)", "Prim kısmı (NPC 0,891 R'ye göre) ₺/hafta", "Esnafa kalan Q"));
const MUSLUK = {};
for (const sinif of ["kirsal", "kasaba", "sehir"]) {
  for (const k of [1, 3, 5, 10]) {
    const Q = qAy("ekmek", sinif, 9) / 1000;
    const s = yerelPazar(Q, Array.from({ length: k }, () => ({ p: 1.05, cesit: 0.5, kasa: 90 })));
    const top = s.reduce((a, b) => a + b, 0);
    const mus = top * P("ekmek") * 1.05 * 168;
    const prim = top * (P("ekmek") * 1.05 - ihrac("ekmek", false)) * 168;
    MUSLUK[`${sinif}-${k}`] = { top, mus, prim, ds: s[0] };
    yaz(satir(sinif, k, ond(s[0], 1), tam(mus), tam(prim), yuzde(1 - top / Q, 0)));
  }
}
yaz();
yaz("### 6.3 Dünya ölçeği: Alfa-0 (200 oyuncu, 45 ilçe), her oyuncu 1 fırın dükkânı + kapalı ekmek zinciri");
yaz();
{
  const OY = 200;
  const IL = 45;
  const olcekN = Math.max(PZ.npcLikiditeTabanOyuncu, OY) / PZ.npcLikiditeTabanOyuncu;
  const kOrt = OY / IL; // ≈4,4 oyuncu/ilçe
  const sinifPay = { kirsal: 0.1, kasaba: 0.3, sehir: 0.6 }; // varsayım: ilçelerin %10 kırsal, %30 kasaba, %60 şehir
  let yerelToplam = 0;
  let primToplam = 0;
  let satilanBirim = 0;
  for (const [sinif, pay] of Object.entries(sinifPay)) {
    const kIl = Math.max(1, Math.round(kOrt));
    const Q = qAy("ekmek", sinif, 9) / 1000;
    const s = yerelPazar(Q, Array.from({ length: kIl }, () => ({ p: 1.05, cesit: 0.5, kasa: 90 })));
    const ilceSayisi = IL * pay;
    const top = s.reduce((a, b) => a + b, 0);
    yerelToplam += ilceSayisi * top * P("ekmek") * 1.05 * 168;
    primToplam += ilceSayisi * top * (P("ekmek") * 1.05 - ihrac("ekmek", false)) * 168;
    satilanBirim += ilceSayisi * top;
  }
  // Aynı oyuncuların NPC ihracatı: arz 240 (FIRIN_EKMEK)/sa/oyuncu; NPC emilimi ölçekle sınırlı (pazar doyumu: fiyat ×0,25'e kadar iner).
  const yerelSaat = satilanBirim; // birim/sa, dünya
  const arzSaat = OY * FIRIN_EKMEK;
  const npcEmilim = (PZ.emilimSaat.ekmek / 1000) * olcekN;
  const npcSatilan = Math.min(npcEmilim, Math.max(0, arzSaat - yerelSaat));
  const npcEkmek = npcSatilan * ihrac("ekmek", false) * 168;
  const tarlaHibe = OY * (MULK.yeniOyuncu.hibe / 1000);
  const emer = yerelSaat + npcEmilim; // fiyat düşmeden emilen toplam
  yaz(baslik("Kalem", "₺/hafta (dünya)", "Not"));
  yaz(satir("`yerelNpc` (oyuncu yerel satışı)", tam(yerelToplam), `k≈${ond(kOrt, 1)} dükkân/ilçe; %10 kırsal, %30 kasaba, %60 şehir ilçesi varsayımı`));
  yaz(satir("· bunun primi (NPC ihracatına göre ek para)", tam(primToplam), "yeni musluğun gerçek ek kısmı: aynı mal NPC'ye gitseydi `ihracatNpc` olurdu"));
  yaz(satir("`ihracatNpc` (ekmek, NPC emilimiyle sınırlı)", tam(npcEkmek), `${tam(npcSatilan)} birim/sa × 0,891 R; arz ${tam(arzSaat)} birim/sa (${OY} × ${FIRIN_EKMEK})`));
  yaz(satir("Pazar doyumu: arz / (yerel + NPC emilimi)", ond(arzSaat / emer, 2), `emen: yerel ${tam(yerelSaat)} + NPC ${tam(npcEmilim)} = ${tam(emer)} birim/sa; fiyat düşmeden ekmek zinciri kurabilen oyuncu payı ≤ ${yuzde(emer / arzSaat, 0)} (≈${tam(emer / 250)} fırın)`));
  yaz(satir("`yerelNpc` payı (ZP8: ≤ %50)", yuzde(yerelToplam / (yerelToplam + npcEkmek)), "perakende NPC geliri / toplam NPC faucet"));
  yaz(satir("`hibe` (tek seferlik)", tam(tarlaHibe), "200 × 50.000 ₺; haftalık değil, karşılaştırma için"));
  yaz(satir("`odul` tavanı (oyuncu başına 8.000 ₺, tek seferlik)", tam(OY * 8000), "ilk_satis, zincir_kapandi, ilk_dukkan ... (docs/06 §15.7)"));
  yaz();
  yaz(`Okuma: tüm oyuncular ekmek zinciri kurarsa NPC emilimi yetmez (arz/emilim yukarıda); bu yüzden Alfa-0'ın dört zincirinin dağılımı (ekmek, cam → pencere, süt, fındık) pazar doyumunu da sınar. Yerel kanal toplam NPC parasının ${yuzde(yerelToplam / (yerelToplam + npcEkmek), 0)}'ini taşır ama **ek** (NPC ihracatına kıyasla) para yalnız primdir: ${TL(primToplam)}/hafta = ihracatNpc'nin ${yuzde(primToplam / npcEkmek)}'i. Kanal ek bir kalem olarak izlenir; ihracat musluğunun yerine geçtiği ölçüde para arzı büyümez. Kırsal ilçelerde dükkân talep bağlayıcıdır ve musluk ≈ ${TL(MUSLUK["kirsal-1"].mus)}/hafta/ilçe ile ihmal edilebilir.`);
  yaz();
}
yaz("Para defteri: yeni musluk kalemi `yerelNpc` (NPC hane alımı). `Dunya.mulk.para` doğrulayıcısı bugün tüm musluk kalemlerinin var olmasını ve bilinmeyenin bulunmamasını ister (docs/06 §15.7 madde 7): kalem yalnız `mulk.perakende` bloğu açıkken yazılır ve doğrulayıcıda 'blok açıksa var, değilse yok' koşuluyla eklenir (diğer isteğe bağlı alanlar gibi). Korunum: `Σ hazine + Σ kasa + Σ lavabo = Σ musluk` değişmez, yeni kalem yalnız musluk tarafına girer. Dükkân satışı komisyonsuz; esnaf payı defterde yok.");
yaz();
// ---------------------------------------------------------------------------------------------------------------- 7 simülasyon
// Saatlik nakit modeli. Para ₺, miktar birim (kayan nokta; kâğıt model). Kâr/zarar kalemleri defter kalemleri olarak ayrıştırılır.
function simule({ varyant, plan, saat, nufus = 50000, dukkanFiyat = 1.05, hasat = 1.0, ilkSatis = true, ozet = [] }) {
  const E = varyant === "E";
  const st = { hazine: MULK.yeniOyuncu.hibe / 1000, stok: { celik: 120, parca: 40, gida: 200 }, yapiSayisi: 0, hucre: 6, insaat: [], tesis: [], defter: {}, odul: 0, ilkSatisYapildi: false, zincirKapandi: false, ilkDukkan: false };
  const log = [];
  const ekle = (k, v) => {
    st.defter[k] = (st.defter[k] ?? 0) + v;
  };
  const erken = (t) => (t <= 24 ? 0.1 : t >= 168 ? 1 : 0.1 + (0.9 * (t - 24)) / 144);
  const kor = (t) => t < 14 * 24;
  const iy = (m, t) => ithal(m, kor(t));
  const bekleyen = [...plan];
  const elekBirim = (t) => (0.25 / 0.95) * iy("komur", t);
  const aktif = () => st.tesis.filter((x) => x.bitis <= t_ && x.bitis !== Infinity);
  let t_ = 0;
  for (let t = 0; t < saat; t++) {
    t_ = t;
    const gunluk = (k, v) => ekle(k, v);
    // 1) inşaat başlat (eşzamanlı ≤2)
    const surenInsaat = () => st.insaat.filter((x) => x.bitis > t).length;
    for (let i = 0; i < bekleyen.length; ) {
      const p = bekleyen[i];
      if (p.t > t || surenInsaat() >= MULK.esZamanliInsaat) {
        i++;
        continue;
      }
      const b = p.ek ? bedel(p.ek, p.olcek ?? 0) : bedel(p.tur, p.olcek ?? 0);
      const ind = st.yapiSayisi < MULK.yeniOyuncu.indirimliYapiSayisi;
      const sabit = (x) => x - Math.floor(x * (1 - MULK.yeniOyuncu.ilkYapiIndirimPpm / PPM));
      const sTaban = p.ek ? bedel(p.ek, 0) : bedel(p.tur, 0);
      const para = ind ? b.para - Math.floor(sTaban.para * (MULK.yeniOyuncu.ilkYapiIndirimPpm / PPM)) : b.para;
      const ml = Object.fromEntries(Object.entries(b.mal).map(([m, q]) => [m, ind ? Math.max(0, q - Math.floor(sTaban.mal[m] * (MULK.yeniOyuncu.ilkYapiIndirimPpm / PPM))) / 1000 : q / 1000]));
      void sabit;
      // Hücre: yurt 6 bedava, gerisi satın alınır (kasaba 2.500; ticari ×1,45).
      const ekHucre = Math.max(0, Math.min(b.hucre, st.hucre - 0) - 0);
      void ekHucre;
      const bosHucre = st.hucre;
      const gerek = b.hucre;
      let hucreBedel = 0;
      let kullan = Math.min(bosHucre, gerek);
      const alinacak = gerek - kullan;
      if (alinacak > 0) hucreBedel = alinacak * 2.5 * 1000 * (p.ek === "dukkan" ? 1.45 : 1);
      // Eksik malzemeyi NPC'den ithal et (yalnız çelik/parça/pencere).
      let ithalGider = 0;
      const eksik = {};
      for (const [m, q] of Object.entries(ml)) {
        const var_ = st.stok[m] ?? 0;
        if (var_ < q) eksik[m] = q - var_;
      }
      for (const [m, q] of Object.entries(eksik)) ithalGider += q * iy(m, t);
      if (st.hazine < para + hucreBedel + ithalGider) {
        i++;
        continue;
      }
      st.hazine -= para + hucreBedel + ithalGider;
      ekle("yapı bedeli (para)", -para);
      if (hucreBedel) ekle("hücre alımı", -hucreBedel);
      if (ithalGider) ekle("inşaat malzemesi ithalatı", -ithalGider);
      for (const [m, q] of Object.entries(ml)) st.stok[m] = Math.max(0, (st.stok[m] ?? 0) + (eksik[m] ?? 0) - q);
      st.hucre -= kullan;
      const sure = b.saat * erken(t);
      const bitis = t + Math.max(sure, 1 / 60);
      const kayit = { ad: p.ad, tur: p.tur ?? p.ek, yontem: p.yontem, bitis, ek: p.ek, indirimli: ind };
      st.insaat.push(kayit);
      st.tesis.push(kayit);
      st.yapiSayisi++;
      log.push({ t, olay: `${p.ad} başladı (${ind ? "indirimli" : "tam"}, ${ond(sure * 60, 0)} dk)` });
      if (!st.ilkYapi) {
        st.ilkYapi = true;
        st.stok.celik += 5;
      }
      bekleyen.splice(i, 1);
    }
    // 2) üretim: tesis sırası = plan sırası; kesirli saat için çevrimiçi oran.
    const oranOnline = (x) => Math.max(0, Math.min(1, t + 1 - x.bitis));
    const yontem = (ad) => YEN[ad]?.oneri ?? IC.yontemler.find((y) => y.id === ad);
    // Tarla (geleneksel_tarim): 200 × hasat
    for (const x of st.tesis) {
      if (x.ek) continue;
      const on = oranOnline(x);
      if (on <= 0) continue;
      if (x.tur === "ciftlik") st.stok.tahil = (st.stok.tahil ?? 0) + 200 * hasat * on;
    }
    let elekTalep = 0;
    const santralVar = st.tesis.some((x) => x.tur === "santral" && oranOnline(x) > 0);
    const isleme = ["degirmen", "ekmek_firini", "cam_firini", "celik_dograma", "kepek_gubresi", "sut_kepekli"];
    for (const x of st.tesis) {
      if (x.ek || !isleme.includes(x.yontem)) continue;
      const on = oranOnline(x);
      if (on <= 0) continue;
      const y = yontem(x.yontem);
      let f = on;
      for (const [m, q] of Object.entries(y.girdiler)) {
        const q1 = q / 1000;
        if (m === "elektrik") continue; // kamu şebekesi (santral isteğe bağlı)
        if (m === "yakit" || m === "silis" || m === "celik" || m === "parca") continue; // yakıt: kamu otomatik; diğerleri NPC ithalatı
        f = Math.min(f, (st.stok[m] ?? 0) / q1);
      }
      if (f <= 0) continue;
      for (const [m, q] of Object.entries(y.girdiler)) {
        const q1 = (q / 1000) * f;
        if (m === "elektrik") elekTalep += q1;
        else if (m === "yakit") {
          const g = q1 * SEB_YK;
          st.hazine -= g;
          ekle("şebeke yakıt (kamu)", -g);
        } else if (["silis", "celik", "parca"].includes(m)) {
          const g = q1 * iy(m, t);
          st.hazine -= g;
          ekle(`${m} ithalatı`, -g);
        } else st.stok[m] -= q1;
      }
      for (const [m, q] of Object.entries(y.ciktilar)) st.stok[m] = (st.stok[m] ?? 0) + (q / 1000) * f;
      const bk = (y.bakim.parca / 1000) * iy("parca", t) * on;
      st.hazine -= bk;
      ekle("bakım parçası", -bk);
      const isl = (PR.ekonomi.tesisIsletmeParasiSaat / 1000) * on;
      st.hazine -= isl;
      ekle("işletme gideri", -isl);
    }
    // Elektrik: santral varsa kendi üretimi (kömür ithal; bakım ayrı), yoksa kamu şebekesi (10,35 ₺/birim; lavabo).
    if (elekTalep > 0 && !santralVar) {
      const g = elekTalep * SEB_EL;
      st.hazine -= g;
      ekle("şebeke elektrik (kamu)", -g);
    }
    // Ciftlik bakım + işletme
    for (const x of st.tesis) {
      if (x.ek) continue;
      const on = oranOnline(x);
      if (x.tur === "ciftlik" && on > 0) {
        const bk = 0.5 * iy("parca", t) * on;
        st.hazine -= bk;
        ekle("bakım parçası", -bk);
        const isl = (PR.ekonomi.tesisIsletmeParasiSaat / 1000) * on;
        st.hazine -= isl;
        ekle("işletme gideri", -isl);
      }
      if (x.tur === "santral" && on > 0) {
        const bk = 1.2 * iy("parca", t) * on;
        st.hazine -= bk;
        ekle("bakım parçası", -bk);
        if (elekTalep > 0) {
          const g = elekTalep * elekBirim(t);
          st.hazine -= g;
          ekle("santral kömürü", -g);
        }
      }
      if (x.tur === "dukkan" && on > 0) {
        st.hazine -= GIDER_S * on;
        ekle("işletme gideri", -GIDER_S * on);
      }
      if (x.tur === "ahir" && on > 0 && !isleme.includes(x.yontem)) {
        // yer tutucu
      }
    }
    // Ahır (kepek tüketicisi) bakım/işletme
    for (const x of st.tesis) {
      if (!x.ek && x.tur === "ahir" && oranOnline(x) > 0 && isleme.includes(x.yontem)) {
        // işletme ve bakım yukarıda işleme döngüsünde sayıldı
      }
    }
    // 3) satış
    // Tahıl fazlası: NPC'ye (yalnız değirmen yoksa).
    const degirmenVar = st.tesis.some((x) => x.yontem === "degirmen" && oranOnline(x) > 0);
    if (!degirmenVar && (st.stok.tahil ?? 0) > 0 && !st.tesis.some((x) => x.yontem === "sut_kepekli")) {
      const g = st.stok.tahil * ihrac("tahil", kor(t));
      st.hazine += g;
      ekle("tahıl ihracatı", g);
      st.stok.tahil = 0;
    }
    // Kit gıdası: t=0'da NPC'ye
    if (t === 0 && ilkSatis) {
      const g = st.stok.gida * ihrac("gida", true);
      st.hazine += g;
      ekle("kit gıdası satışı", g);
      st.stok.gida = 0;
      if (!st.ilkSatisYapildi) {
        st.ilkSatisYapildi = true;
        const o = PR.odul.kavramlar.ilk_satis.para / 1000;
        st.hazine += o;
        ekle("ödül (ilk_satis)", o);
      }
    }
    // Dükkân (fırın): yalnız ekmek rafı
    const dukkanlar = st.tesis.filter((x) => x.ek === "dukkan" && oranOnline(x) > 0);
    let yerelSatis = 0;
    if (dukkanlar.length > 0 && (st.stok.ekmek ?? 0) > 0) {
      const Q = Qm(nufus, "ekmek");
      const s = yerelPazar(Q, dukkanlar.map(() => ({ p: dukkanFiyat, cesit: 0.5, kasa: 90 })));
      yerelSatis = Math.min(st.stok.ekmek, s.reduce((a, b) => a + b, 0));
      const g = yerelSatis * P("ekmek") * dukkanFiyat;
      st.hazine += g;
      ekle("ekmek yerel satış (dükkân)", g);
      st.stok.ekmek -= yerelSatis;
      if (!st.ilkDukkan) {
        st.ilkDukkan = true;
        st.stok.celik += PR.odul.kavramlar.ilk_dukkan.mal.celik / 1000;
      }
    }
    if ((st.stok.ekmek ?? 0) > 0) {
      const g = st.stok.ekmek * ihrac("ekmek", kor(t));
      st.hazine += g;
      ekle("ekmek NPC ihracatı", g);
      if (!st.zincirKapandi) {
        st.zincirKapandi = true;
        const o = PR.odul.kavramlar.zincir_kapandi.para / 1000;
        st.hazine += o;
        ekle("ödül (zincir_kapandi)", o);
      }
      st.stok.ekmek = 0;
    }
    for (const m of ["kepek"]) {
      const kepekTuketen = st.tesis.some((x) => (x.yontem === "kepek_gubresi" || x.yontem === "sut_kepekli") && oranOnline(x) > 0);
      if ((st.stok[m] ?? 0) > 0 && !kepekTuketen) {
        const g = st.stok[m] * ihrac(m, kor(t));
        st.hazine += g;
        ekle("kepek NPC ihracatı", g);
        st.stok[m] = 0;
      }
    }
    for (const m of ["gubre", "sut", "pencere", "cam"]) {
      // Cam: doğrama bir sonraki saat için 32 birim tutar, fazlası NPC'ye.
      const tut = m === "cam" && st.tesis.some((x) => x.yontem === "celik_dograma") ? 32 : 0;
      if ((st.stok[m] ?? 0) > tut) {
        const g = (st.stok[m] - tut) * ihrac(m, kor(t));
        st.hazine += g;
        ekle(`${m} NPC ihracatı`, g);
        st.stok[m] = tut;
      }
    }
    // arazi vergisi (satın alınan hücre değeri %1/hafta); yurt 0
    const alinan = st.tesis.reduce((a, x) => a + (x.ek ? bedel(x.ek, 0).hucre : bedel(x.tur, x.olcek ?? 0).hucre), 0) - 6;
    if (alinan > 0) {
      const vergi = (alinan * 2500 * 0.01) / 168;
      st.hazine -= vergi;
      ekle("arazi vergisi", -vergi);
    }
    // Defter anlık görüntüsü
    if (ozet.includes(t + 1) || t + 1 === saat) log.push({ t: t + 1, hazine: st.hazine, stok: { ...st.stok }, defter: { ...st.defter } });
  }
  return { st, log };
}

const SAATLER = [1, 2, 3, 4, 6, 8, 12, 18, 24, 30, 36, 42, 48, 72, 96, 120, 144, 168];
function planS1(varyant) {
  const tarla = { t: 0, ad: "Tarla", tur: "ciftlik", yontem: "geleneksel_tarim" };
  const deg = { t: 0, ad: "Değirmen", tur: "gida_fabrikasi", yontem: "degirmen" };
  const fir = { t: 0, ad: "Ekmek fırını", tur: "gida_fabrikasi", yontem: "ekmek_firini" };
  const duk = { t: 0, ad: "Dükkân (fırın)", ek: "dukkan", yontem: "dukkan" };
  const ahir = { t: 26, ad: "Ahır (kepek → gübre)", tur: "ahir", yontem: "kepek_gubresi" };
  if (varyant === "E") return [tarla, { t: 0, ad: "Santral (kömür)", tur: "santral", yontem: "komur_santrali" }, deg, fir, duk, ahir];
  return [tarla, deg, fir, duk, ahir];
}
yaz();
yaz("## 7. Senaryo 1: 50.000 ₺ hibe, Tarla → değirmen → fırın → dükkân (saatlik nakit)");
yaz();
yaz("Varsayımlar: ilçe nüfusu 50 bin (ilçede tek oyuncu), hasat çarpanı 1,0 (Ekim; karadeniz 1,05), dükkân fiyatı 1,05 R, yalnız ekmek rafı (çeşit 0,5), NPC satış korumada (komisyonsuz, ihracat ×0,90), ithalat ×1,10. Kit gıdası t=0'da satılır. Yapı sırası: esZamanliInsaat=2; gün 2'de ahır (kepek → gübre). Ödüller çekirdek tablosundan (`ilk_satis` 500 ₺, `zincir_kapandi` 700 ₺; mal ödülleri stoğa). Hücre: 6 yurt, gerisi kasaba 2.500 ₺ (dükkân ×1,45). Hasat, toprak ve NPC fiyat dinamiği yok.");
yaz();
for (const v of ["S", "E"]) {
  const { st, log } = simule({ varyant: v, plan: planS1(v), saat: 168, ozet: SAATLER });
  yaz(`### 7.${v === "S" ? 1 : 2} Varyant ${v}: ${v === "S" ? "santralsiz, kamu şebekesi (elektrik 10,35 ₺, yakıt 103,5 ₺)" : "isteğe bağlı santral yatırımı (kendi elektriği; yakıt kamu)"}`);
  yaz();
  yaz("Olaylar: " + log.filter((x) => x.olay).map((x) => `t=${ond(x.t, 2)} sa ${x.olay}`).join("; ") + ".");
  yaz();
  yaz(baslik("Saat", "Hazine ₺", "Önceki satıra göre değişim ₺", "Ekmek (yerel + NPC) birikimli ₺"));
  let onceki = MULK.yeniOyuncu.hibe / 1000;
  for (const x of log.filter((l) => l.hazine !== undefined)) {
    yaz(satir(x.t, tam(x.hazine), tam(x.hazine - onceki), tam((x.defter["ekmek yerel satış (dükkân)"] ?? 0) + (x.defter["ekmek NPC ihracatı"] ?? 0))));
    onceki = x.hazine;
  }
  yaz();
  // Günlük özet: 1., 3., 7. gün (blok farkı)
  const snap = {};
  for (const x of log.filter((l) => l.hazine !== undefined)) snap[x.t] = x;
  yaz("Gün özeti (kalemler o günün 24 saatlik farkı; + gelir, − gider):");
  yaz();
  const gunler = [[1, 0, 24], [3, 48, 72], [7, 144, 168]];
  const kalemler = new Set();
  for (const [, a, b] of gunler) for (const k of Object.keys(snap[b].defter)) kalemler.add(k);
  yaz(baslik("Kalem", ...gunler.map(([g]) => `Gün ${g}`)));
  for (const k of [...kalemler]) {
    const vals = gunler.map(([, a, b]) => (snap[b].defter[k] ?? 0) - (a === 0 ? 0 : snap[a].defter[k] ?? 0));
    yaz(satir(k, ...vals.map((x) => (Math.abs(x) < 0.5 ? "-" : tam(x)))));
  }
  yaz(satir("**Net**", ...gunler.map(([, a, b]) => tam(snap[b].hazine - (a === 0 ? MULK.yeniOyuncu.hibe / 1000 : snap[a].hazine)))));
  yaz(satir("**Gün sonu hazine**", ...gunler.map(([, , b]) => tam(snap[b].hazine))));
  yaz();
}

// ---------------------------------------------------------------------------------------------------------------- 8 senaryo 2
function planS2() {
  const p = planS1("S");
  // Gün 3'te (t=72): santral yok, elektrik kamu şebekesinden. Parça fabrikası (cam fırını, A3 seçimi) + parça fabrikası (doğrama) + yapı market.
  p.push({ t: 72, ad: "Cam fırını (parça fab.; A3 seçimi)", tur: "parca_fabrikasi", yontem: "cam_firini" }, { t: 72, ad: "Çelik doğrama (parça fab.)", tur: "parca_fabrikasi", yontem: "celik_dograma" });
  return p;
}
yaz("## 8. Senaryo 2: cam → pencere (gün 3 sonunda; santralsiz, kamu şebekesi)");
yaz();
yaz("Hat: silis (ithal) + yakıt + elektrik → cam fırını; çelik (ithal) + cam + parça (ithal) + elektrik → doğrama; pencere NPC'ye satılır, cam fazlası NPC'ye. S1-S planına gün 3'te iki yapı eklenir (altıncı ve yedinci yapı: indirim yok).");
yaz();
{
  const { st, log } = simule({ varyant: "S", plan: planS2(), saat: 168, ozet: [72, 96, 120, 144, 168] });
  yaz("Olaylar: " + log.filter((x) => x.olay && x.t >= 72).map((x) => `t=${ond(x.t, 2)} ${x.olay}`).join("; ") + ".");
  yaz();
  const snap = {};
  for (const x of log.filter((l) => l.hazine !== undefined)) snap[x.t] = x;
  const aralik = [[3, 72, 96], [4, 96, 120], [5, 120, 144], [6, 144, 168]];
  yaz("Aralıklar 24 saatlik bloklardır: 72–96 sa = gün 4, ... 144–168 sa = gün 7 (yatırım gün 3'ün sonunda, 72. saatte başlar).");
  yaz();
  yaz(baslik("Kalem", ...aralik.map(([, a, b]) => `${a}–${b} sa`)));
  const kalemler = new Set();
  for (const k of Object.keys(snap[168].defter)) kalemler.add(k);
  for (const k of [...kalemler]) {
    const v = aralik.map(([, a, b]) => (snap[b].defter[k] ?? 0) - (snap[a].defter[k] ?? 0));
    if (v.some((x) => Math.abs(x) >= 0.5)) yaz(satir(k, ...v.map((x) => (Math.abs(x) < 0.5 ? "-" : tam(x)))));
  }
  yaz(satir("**Net**", ...aralik.map(([, a, b]) => tam(snap[b].hazine - snap[a].hazine))));
  yaz();
  // Karşılaştırma: aynı pencerede pencere hattı olmayan S1-E
  {
    const r1 = simule({ varyant: "S", plan: planS1("S"), saat: 168, ozet: [72, 168] });
    const sn1 = {};
    for (const x of r1.log.filter((l) => l.hazine !== undefined)) sn1[x.t] = x;
    const fark = snap[168].hazine - snap[72].hazine - (sn1[168].hazine - sn1[72].hazine);
    yaz(`Pencere hattının 72→168 sa artımlı katkısı (S2 − S1-S): ${TL(fark)} (yatırım ve hücre dahil). Aynı pencerede S1-S net ${TL(sn1[168].hazine - sn1[72].hazine)}.`);
    yaz();
  }
}
const kor0 = false;
yaz("### 8.1 Pencere hattı kararlı hâl marjı (komisyonlu, ₺/sa; S ölçek, 1 cam fırını : 1 doğrama; A2 önerisi tarifleri)");
yaz();
{
  const elek = SEB_EL;
  const cam = YEN.cam_firini.oneri;
  const dog = YEN.celik_dograma.oneri;
  const f = (y, ithalEt) => Object.entries(y.girdiler).reduce((t, [m, q]) => t + (q / 1000) * (m === "elektrik" ? elek : m === "yakit" ? SEB_YK : ithalEt.includes(m) ? ithal(m, kor0) : ihrac(m, kor0)), 0);
  const camKullan = dog.girdiler.cam / 1000;
  const camFazla = cam.ciktilar.cam / 1000 - camKullan;
  const gelirPencere = (dog.ciktilar.pencere / 1000) * ihrac("pencere", kor0);
  const gelirCamFazla = (cam.ciktilar.cam / 1000) * ihrac("cam", kor0); // tüm cam; iç kullanım f()'te ihracat paritesiyle gider yazılır
  const bk = (y) => (y.bakim.parca / 1000) * ithal("parca", kor0) + PR.ekonomi.tesisIsletmeParasiSaat / 1000;
  yaz(baslik("Mod", "Gelir", "Girdi (dış)", "Bakım+işletme", "Net ₺/sa", "Not"));
  const aGider = f(dog, ["celik", "cam", "parca"]);
  yaz(satir("(a) yalnız doğrama, tüm ara mal ithal", tam(gelirPencere), tam(aGider), tam(bk(dog)), tam(gelirPencere - aGider - bk(dog)), "cam ithal 1,111 × 95"));
  const bGider = f(cam, ["silis", "yakit"]) + f(dog, ["celik", "parca"]) + (cam.ciktilar.cam / 1000 > 0 ? 0 : 0);
  // (b) doğramanın camı kendi fırınından (iç değer = 0 girdi; fazla cam NPC'ye)
  const bNet = gelirPencere + gelirCamFazla - f(cam, ["silis", "yakit"]) - (f(dog, ["celik", "parca"]) - 0) - bk(cam) - bk(dog);
  void bGider;
  yaz(satir("(b) cam fırını + doğrama (silis, çelik, parça ithal; elektrik ve yakıt şebeke)", tam(gelirPencere + gelirCamFazla), tam(f(cam, ["silis", "yakit"]) + f(dog, ["celik", "parca"])), tam(bk(cam) + bk(dog)), tam(bNet), `cam: ${ond(camKullan, 0)} birim/sa doğramaya, ${ond(camFazla, 0)} fazla; iç cam ihracat paritesiyle (fırsat maliyeti)`));
  const silisKendi = (cam.girdiler.silis / 1000) * ihrac("silis", kor0);
  const ocak = (5 * elek) + (0.6 * ithal("parca", kor0) + PR.ekonomi.tesisIsletmeParasiSaat / 1000);
  const cNet = bNet + (cam.girdiler.silis / 1000) * ithal("silis", kor0) - silisKendi - ocak;
  yaz(satir("(c) (b) + kendi silis ocağı (5 elektrik → 60 silis; fırsat maliyeti ihracat paritesi)", tam(gelirPencere + gelirCamFazla), tam(f(cam, ["yakit"]) + f(dog, ["celik", "parca"]) + silisKendi + 5 * elek), tam(bk(cam) + bk(dog) + 0.6 * ithal("parca", kor0) + 60), tam(cNet), "silis ocağı `silis` rezervi ister (damar)"));
  yaz();
}
// Yatırım ve geri ödeme
{
  const c1 = bedel("parca_fabrikasi", 0);
  const c1c = bedel("celikhane", 0);
  const c2 = bedel("parca_fabrikasi", 0);
  yaz(baslik("Kalem", "Para", "Çelik", "Parça", "Hücre", "Doğrudan süre (sa)", "İthal değer ₺"));
  for (const [ad, b] of [["Parça fabrikası (cam fırını, A3 seçimi) S", c1], ["Parça fabrikası (doğrama) S", c2], ["Çelikhane (cam fırını, alternatif) S", c1c], ["Santral S (gerekiyorsa)", bedel("santral", 0)]]) yaz(satir(ad, TL(b.para), ond((b.mal.celik ?? 0) / 1000, 0), ond((b.mal.parca ?? 0) / 1000, 0), b.hucre, ond(b.saat, 0), TL(b.ithal)));
  yaz();
}

yaz("### 8.2 Zincir kurulum süresi: ilk-5 indirimi, eşzamanlı ≤2 inşaat ve erken oyun çarpanı altında");
yaz();
{
  const erken = (t) => (t <= 24 ? 0.1 : t >= 168 ? 1 : 0.1 + (0.9 * (t - 24)) / 144);
  const makespan = (gorevler, t0) => {
    const slot = [t0, t0];
    let son = t0;
    for (const [, saat] of gorevler) {
      const i = slot[0] <= slot[1] ? 0 : 1;
      const bas = slot[i];
      const sure = Math.max(1 / 60, saat * erken(bas));
      slot[i] = bas + sure;
      son = Math.max(son, slot[i]);
    }
    return son - t0;
  };
  const S = MULK.yapiInsaSaati;
  const ZINCIR = {
    "Ekmek, santralsiz (Tarla, değirmen, fırın, dükkân)": [["Tarla", S.ciftlik], ["Değirmen", S.gida_fabrikasi], ["Fırın", S.gida_fabrikasi], ["Dükkân", 4]],
    "Ekmek, + isteğe bağlı santral": [["Tarla", S.ciftlik], ["Santral", S.santral], ["Değirmen", S.gida_fabrikasi], ["Fırın", S.gida_fabrikasi], ["Dükkân", 4]],
    "Cam → pencere, santralsiz (cam fırını, doğrama, yapı market)": [["Cam fırını", S.parca_fabrikasi], ["Doğrama", S.parca_fabrikasi], ["Yapı market", 4]],
    "Cam → pencere, + isteğe bağlı santral": [["Santral", S.santral], ["Cam fırını", S.parca_fabrikasi], ["Doğrama", S.parca_fabrikasi], ["Yapı market", 4]],
  };
  const T0 = [0, 12, 24, 48, 72, 96, 168];
  yaz("Katılımdan `t0` saat sonra başlatılan zincirin tamamlanma süresi (sa; üretim ilk saat akışı ≈ +1 sa). Her görev başlangıçta o anki çarpanla kısalır (çarpan işin başladığı anda bir kez uygulanır, erkenOyun.ts).");
  yaz();
  yaz(baslik("Zincir", ...T0.map((t) => `t0=${t} sa`)));
  for (const [ad, g] of Object.entries(ZINCIR)) yaz(satir(ad, ...T0.map((t) => ond(makespan(g, t), 2))));
  yaz();
  yaz("Nakit kısıtı ayrıdır (S1 saatlik tablo): hibe + kit gıdası satışı santralsiz zinciri ilk 2 saatte karşılar; isteğe bağlı santral hücre ve ithal malzeme nedeniyle ≈ +35.000 ₺ daha ister. İlk 5 yapıda indirim yalnız ilk beş inşaata uygulanır: santralsiz zincirde dört yapı (Tarla, değirmen, fırın, dükkân) ve ahır indirimlidir; santral bir hakkı tüketir.");
  yaz();
}

// ---------------------------------------------------------------------------------------------------------------- 9 çıkmaz mal
yaz("## 9. Çıkmaz mal denetimi (24 mal; tüketici türü sayısı)");
yaz();
yaz("Tüketici türleri (uretim-agi §2.4): Ü üretim yöntemi, H hane/raf, K kamu siparişi, Y yapı maliyeti, O ordu ikmali, P NPC pazar (piyasa yapıcı; `emilimSaat` kaydı) ve N `NpcAlici` güvence kaydı. Kural: ≥ 2 tür; yan ürün için Ü ≥ 1 ve N ≥ 1.");
yaz();
const tuketim = {};
const ekle2 = (m, t, k) => {
  tuketim[m] ??= {};
  tuketim[m][t] ??= new Set();
  tuketim[m][t].add(k);
};
for (const y of IC.yontemler) for (const m of Object.keys(y.girdiler)) ekle2(m, "Ü", y.id);
const YEN_P4 = ["degirmen", "ekmek_firini", "kepek_gubresi", "sut_kepekli", "cam_firini", "celik_dograma"];
for (const id of YEN_P4) for (const m of Object.keys(YEN[id].oneri.girdiler)) ekle2(m, "Ü", id);
// P1 yöntemleri (dikey §3.6, §3.8; A3 kapsamı dışı)
const P1 = { peynir_mandira: ["sut", "elektrik"], findik_kavurma: ["findik", "yakit", "elektrik"], findik_ezme_sekerleme: ["findik_urunu", "gida", "elektrik"] };
for (const [id, g] of Object.entries(P1)) for (const m of g) ekle2(m, "Ü(P1)", id);
for (const t of IC.tesisTurleri) for (const m of Object.keys(t.insaMaliyeti)) ekle2(m, "Y", t.id);
for (const [id, e] of Object.entries(MULK.ekYapilar)) for (const m of Object.keys(e.insaMaliyeti)) ekle2(m, "Y", id);
for (const m of Object.keys(EK.dukkan.insaMaliyeti)) if (m !== "pencere" || true) ekle2(m, "Y", "dukkan");
for (const b of IC.birlikler) for (const m of [...Object.keys(b.maliyet), ...Object.keys(b.ikmal)]) ekle2(m, "O", b.id);
// Raf (H): perakende raporu §5.1 / §5.2 Alfa-0 listeleri
const RAF = {
  bakkal: ["gida", "ekmek", "un", "sut", "sut_urunu", "sekerleme", "findik_urunu", "yakit"],
  firin: ["ekmek", "gida"],
  sarkuteri: ["sut", "sut_urunu", "gida"],
  sekerci: ["sekerleme", "findik_urunu"],
  yapi_market: ["pencere", "celik", "parca", "cam", "cimento"],
};
for (const [d, ml] of Object.entries(RAF)) for (const m of ml) ekle2(m, "H", d);
ekle2("elektrik", "H", "hane (nufus.tuketim1000Saat)");
ekle2("gida", "H", "hane");
ekle2("yakit", "H", "hane");
ekle2("elektronik", "H", "hane (K3; nufus.tuketim1000Saat)");
// Kamu (K): kamu-ve-kamu-arazileri sipariş türleri (öneri): gıda/ekmek (okul), pencere/çelik/parça (onarım), çimento
for (const m of ["gida", "ekmek", "sut_urunu"]) ekle2(m, "K", "okul/hastane gıdası");
for (const m of ["pencere", "celik", "parca", "cam"]) ekle2(m, "K", "onarım");
// P: NPC pazar kaydı
for (const m of IC.mallar.map((x) => x.id)) if (PZ.emilimSaat[m] !== undefined) ekle2(m, "P", "NPC piyasa yapıcı");
// N: yan ürün güvence alıcıları (öneri, bütçeli): kepek, gübre
ekle2("gubre", "Ü", "Tarla gübre dozu (tarim.gubreTuketimiSaat; yöntem girdisi değil, tarım mekaniği)");
ekle2("kepek", "N", "çiftçi birliği güvence (R×%50)");
ekle2("gubre", "N", "çiftçi birliği güvence");
yaz(baslik("Mal", "Ü", "Ü(P1)", "H", "K", "Y", "O", "P", "N", "Tür sayısı (P1 hariç)", "Tür sayısı (P1 dahil)", "Sonuç"));
for (const m of IC.mallar) {
  const g = tuketim[m.id] ?? {};
  const sy = (t) => (g[t] ? g[t].size : 0);
  const p0 = ["Ü", "H", "K", "Y", "O", "P", "N"].filter((t) => sy(t) > 0).length;
  const p1 = p0 + (sy("Ü(P1)") > 0 && sy("Ü") === 0 ? 1 : 0);
  const yan = ["kepek", "gubre"].includes(m.id);
  const tamam = p0 >= 2 && (!yan || (sy("Ü") >= 1 && sy("N") >= 1));
  yaz(satir(m.id, sy("Ü"), sy("Ü(P1)"), sy("H"), sy("K"), sy("Y"), sy("O"), sy("P"), sy("N"), p0, p1, tamam ? "tamam" : p1 >= 2 ? "P1'de tamam" : "AÇIK"));
}
yaz();
yaz("`kepek` Ü tüketicileri: " + [...(tuketim.kepek?.Ü ?? [])].join(", ") + ". Raf listeleri perakende-kademeleri §5.1; kamu türleri kamu-ve-kamu-arazileri önerisidir; N kayıtları bütçeli ve toplamı sabit olacak (K-5, para musluğu açmaz).");

// ---------------------------------------------------------------------------------------------------------------- 10 bakım
yaz();
yaz("## 10. Bakım ve aşınma hesapları (kâğıt model; çekirdek koşulmadı)");
yaz();
const BK = PR.sanayi.bakim;
yaz(`Parametreler (\`parametreler.json\` sanayi.bakim): düzeyler ${BK.duzeyler.map((d) => `${d.id} girdi×${d.girdiPpm / PPM}, aşınma ${d.asinmaPpmGun / 10000 > 0 ? "+" : ""}${d.asinmaPpmGun / 10000} puan/gün`).join("; ")}; verim kaybı tavanı %${BK.asinmaVerimKaybiTavaniPpm / 10000}; kıtlık eşiği %${BK.kitlikEsigiPpm / 10000}, kıtlıkta aşınma ${BK.kitlikAsinmaPpmGun / 10000} puan/gün; genel onarım ${BK.genelOnarimMaliyetPpm / 10000}% inşa bedeli + ${BK.genelOnarimDurusSaat} sa duruş.`);
yaz();
yaz("### 10.1 Bakım parçası maliyeti ↔ çıktı değeri ve KD (S ölçek, parça ithal 200 ₺)");
yaz();
yaz("Bakım maliyeti = bakım parçası × 180 × 1,111 + işletme 60 ₺; aşınma cezası çıktıyı çarpar, GİRDİYİ DEĞİL (`ekonomi/uretim.ts:204-222` (ceza çarpanı :212), çıktıya uygulanışı `:446`; girdiler `:335-340`): kayıp = %ceza × çıktı değeri. Kaldıraç = çıktı değeri / KD.");
yaz();
yaz(baslik("Yöntem", "Çıktı ₺/sa", "KD ₺/sa", "Bakım+işletme ₺/sa", "Bakım / çıktı", "Kaldıraç (çıktı/KD)", "KD sıfır olduğu aşınma"));
const liste = [...mevcut.filter((y) => ["geleneksel_tarim", "standart_gida_isleme", "yuksek_firin", "standart_parca", "standart_elektronik", "ahir_besi", "azotlu_gubre"].includes(y.id)), IC.yontemler.find((y) => y.id === "geleneksel_tarim"), ...Object.entries(YEN).map(([id, y]) => ({ id, ...y.oneri }))];
const goruldu = new Set();
for (const y of liste) {
  if (goruldu.has(y.id)) continue;
  goruldu.add(y.id);
  const cikt = deger(y.ciktilar);
  const k = cikt - deger(y.girdiler);
  const bk = (y.bakim.parca / 1000) * ithal("parca", false) + PR.ekonomi.tesisIsletmeParasiSaat / 1000;
  const kald = k > 0 ? cikt / k : Infinity;
  // KD=0 olduğu aşınma: çıktı × (1 − 0,4a) = girdi → a = (1 − girdi/çıktı)/0,4
  const a0 = deger(y.girdiler) === 0 ? Infinity : (1 - deger(y.girdiler) / cikt) / (BK.asinmaVerimKaybiTavaniPpm / PPM);
  yaz(satir(y.id, tam(cikt), tam(k), tam(bk), yuzde(bk / cikt), Number.isFinite(kald) ? ond(kald, 1) : "-", Number.isFinite(a0) ? yuzde(a0, 0) : "yok (girdisiz)"));
}
yaz();
yaz("### 10.1b Bakımın net getirisi (60 gün ortalaması; yönetimsiz ↔ yönetimli) ve KD ≥ 0 için en yüksek tavan");
yaz();
{
  const PAR = [
    ["mevcut: çıktıya (20000; %40)", 20000, 400000, false, 1],
    ["A: çıktıya (11000; %30)", 11000, 300000, false, 1],
    ["A, parça fiyatı ×1,33 (kıtlık)", 11000, 300000, false, 1.33],
    ["A + verime (11000; %30)", 11000, 300000, true, 1],
    ["C: çıktıya (10000; %25)", 10000, 250000, false, 1],
    ["E: çıktıya (8000; %25)", 8000, 250000, false, 1],
  ];
  yaz(baslik("Yöntem", "Bakım parçası ₺/sa", "KD≥0 en yüksek tavan (1−1/oran)", ...PAR.map(([a]) => `Net getiri ₺/sa: ${a}`)));
  for (const y of liste.filter((x, i, a) => a.findIndex((z) => z.id === x.id) === i)) {
    const cikt = deger(y.ciktilar);
    const gir = deger(y.girdiler);
    const k = cikt - gir;
    const prc = (y.bakim.parca / 1000) * ithal("parca", false);
    const tmax = gir === 0 ? "yok" : yuzde(1 - gir / cikt, 0);
    const hucre = PAR.map(([, kit, tav, verime, pf]) => {
      const m = ortalama(kit, tav, 60);
      const kayip = verime ? k * (1 - m) : cikt * (1 - m);
      return tam(kayip - prc * pf);
    });
    yaz(satir(y.id, tam(prc), tmax, ...hucre));
  }
  yaz();
  yaz("Net getiri = (yönetimsizin 60 günlük ortalama kaybı) − bakım parçası maliyeti. Çıktıya uygulamada kayıp = çıktı × (1 − ort. çarpan); verime uygulamada kayıp = KD × (1 − ort. çarpan). Hepsi pozitifse bakım her tesis türü için yapmamaktan iyidir; negatifse bakım yapmak kaybettirir (O2 ölçümünde sanayicide görülen yön).");
  yaz();
}
yaz("### 10.2 Aşınma yörüngesi (yönetimsiz: parça stoğu tükenir, karşılanma 0 → +%2/gün) ve çıktı çarpanı");
yaz();
function yorunge(kitlik, tavan, gun) {
  const a = Math.min(1, (kitlik / PPM) * gun);
  return 1 - (tavan / PPM) * a;
}
function ortalama(kitlik, tavan, G) {
  let t = 0;
  for (let g = 0; g < G; g++) t += yorunge(kitlik, tavan, g + 0.5);
  return t / G;
}
const SENARYO = [
  ["mevcut (20000; %40)", 20000, 400000],
  ["A: 11000; %30", 11000, 300000],
  ["B: 15000; %30", 15000, 300000],
  ["C: 10000; %25", 10000, 250000],
  ["E: 8000; %25", 8000, 250000],
];
yaz(baslik("Parametre (kıtlık aşınma ppm/gün; tavan)", "gün 7", "gün 14", "gün 30", "gün 45", "gün 60", "60 gün ortalama", "tavana varış (gün)", "bakımlı/bakımsız (60 gün ort.)", "bakımlı/bakımsız (tavan)"));
for (const [ad, k, t] of SENARYO) {
  yaz(satir(ad, ...[7, 14, 30, 45, 60].map((g) => yuzde(yorunge(k, t, g) - 1, 1)), yuzde(ortalama(k, t, 60) - 1, 1), ond(PPM / k, 0), ond(1 / ortalama(k, t, 60), 3), ond(1 / (1 - t / PPM), 3)));
}
yaz();
yaz("Çıktı değişimi (çıktı × çarpan − 1). Tarla gibi girdisiz yöntemde bu KD kaybıdır; işleme yöntemlerinde KD kaybı = çıktı kaybı × kaldıraç (§10.1).");
yaz();
yaz("### 10.2b Zincir derinliği ve bileşik aşınma (O2 ölçümüyle doğrulanan mekanizma): k aşamalı zincirin çıktı kaybı = 1 − çarpan^k");
yaz();
yaz("Aşınma çarpanı hem tahıl çıktısını hem de o tahılla beslenen sonraki tesisin girdisini kısar: Tarla → ahır (k = 2) çıktısı çarpan², Tarla → değirmen → fırın (k = 3) çarpan³ olur. O2 ölçümü (gec60, çiftçi): ahır `verimPpm` yönetimsiz %59,5 ↔ yönetimli %99,2 (oran 0,60 = çarpan), net gelir ×2,79, brüt çıktı ×2,63; 1/0,6² = ×2,78.");
yaz();
yaz(baslik("Parametre (kıtlık aşınma ppm/gün; tavan)", "k", "gün 14 kayıp", "gün 45 kayıp", "gün 70 kayıp (Y7 penceresi)", "tavan kaybı", "bakımlı/bakımsız gün 70", "bakımlı/bakımsız 60 gün ort.", "bakımlı/bakımsız tavan"));
for (const [ad, kk, tt] of SENARYO) {
  for (const k of [1, 2, 3]) {
    const L = (g) => 1 - yorunge(kk, tt, g) ** k;
    yaz(satir(ad, String(k), yuzde(L(14), 1), yuzde(L(45), 1), yuzde(L(70), 1), yuzde(1 - (1 - tt / PPM) ** k, 1), ond(1 / yorunge(kk, tt, 70) ** k, 2), ond(60 / Array.from({ length: 60 }, (_, g) => yorunge(kk, tt, g + 0.5) ** k).reduce((a, b) => a + b, 0), 2), ond(1 / (1 - tt / PPM) ** k, 2)));
  }
}
yaz();
yaz("Okuma: bugünkü parametrelerle k = 2 için gün 70 oranı 2,78 (O2: ×2,79 net); yani ×2,2…×2,79 sıçrama **zincir bileşik etkisidir**, ödeme gücü sarmalı (H2) gerekmez. k = 3 (ekmek zinciri) bugünkü parametrelerle tavanda ×4,63'tür.");
yaz();
yaz("### 10.2c Bakımın parça maliyeti çıktı değerine göre ne zaman karşılığını verir (tek aşama; tavanda)");
yaz();
yaz("Bakım, yönetimsizin tavandaki kaybı parça maliyetinden büyükse getirir: çıktı × T/(1−T) ≥ parça maliyeti, yani çıktı/parça maliyeti ≥ (1−T)/T. O2 yerleşik sanayici (7 gün): brüt çıktı 424.063 ₺, parça ithalatı 291.839 ₺ (oran 1,45).");
yaz();
yaz(baslik("Tavan T", "Eşik oranı (1−T)/T", "Sanayici oranı 1,45 ≥ eşik mi", "Tavanda yönetimsiz kaybı ₺/7 gün (424.063 × T/(1−T))"));
for (const T of [0.4, 0.3, 0.25]) yaz(satir(yuzde(T, 0), ond((1 - T) / T, 2), 1.45 >= (1 - T) / T ? "evet" : "**hayır**", tam(424063 * (T / (1 - T)))));
yaz();
yaz("Okuma: sanayici arketipinde (maden + santral) bakım bugün başabaştır (eşik 1,50; ölçülen 1,45; yönetimli net gelir yönetimsizden düşük); tavan %25–30'a inerse bakım bu arketipte **net negatif** olur. Çıktı değerine göre parça girdisi pahalı tesislerde (maden, santral) parça girdisi ya da tavan ayrı ele alınmalı; bu hesap O2'nin kalem dökümünü (tesis türüne göre parça tüketimi) bekler.");
yaz();
yaz("### 10.3 Kaldıraçlı KD kaybı: işleme yöntemlerinde gün 30 ve gün 45 (aşınma çıktıya uygulanırsa ↔ verime uygulanırsa)");
yaz();
yaz(baslik("Yöntem", "Parametre", "KD gün 30 (çıktıya)", "KD gün 45 (çıktıya)", "KD gün 60 (çıktıya)", "KD (verime; girdi de kısılır) gün 60", "Tavanda KD (çıktıya)"));
for (const [ad, y] of [["değirmen", YEN.degirmen.oneri], ["ekmek fırını", YEN.ekmek_firini.oneri], ["cam fırını", YEN.cam_firini.oneri], ["çelik doğrama", YEN.celik_dograma.oneri], ["standart_gida_isleme", std]]) {
  for (const [pad, k, t] of [SENARYO[0], SENARYO[1]]) {
    const gir = deger(y.girdiler);
    const cik = deger(y.ciktilar);
    const kdc = (g) => cik * yorunge(k, t, g) - gir;
    const verim60 = (cik - gir) * yorunge(k, t, 60);
    yaz(satir(ad, pad, tam(kdc(30)), tam(kdc(45)), tam(kdc(60)), tam(verim60), tam(cik * (1 - t / PPM) - gir)));
  }
}
yaz();
yaz("### 10.4 Başlangıç kiti parça stoğu kaç saat yeter (yönetimsiz, düzey normal)");
yaz();
yaz(baslik("Tesis seti", "Bakım parçası/sa", "Kit 40 parça yeter (sa)", "Aşınma başlangıcı (gün)"));
for (const [ad, ts] of [["Tarla", 0.5], ["Tarla + değirmen + fırın", 0.5 + 0.8 + 0.8], ["Tarla + değirmen + fırın + ahır", 0.5 + 0.8 + 0.8 + 0.5], ["+ santral + cam fırını + doğrama", 0.5 + 0.8 + 0.8 + 0.5 + 1.2 + 1.0 + 1.0]]) yaz(satir(ad, ond(ts, 1), ond(40 / ts, 0), ond(40 / ts / 24, 1)));
yaz();
yaz("Not: P4'ün dört yapısı indirimli bile ≈ 40,6 parça ister (7 + 14 + 14 + 5,6); kit 40 parça inşaata bile yetmez, bakıma kalan yok (ödül `ilk_isleme` +5 parça ≈ 2 saat bakım). Bakım parçası ilk saatten ithalat ister ve bir emir yuvası harcar (temel 4 yuva).");

console.log(cikti.join("\n"));
