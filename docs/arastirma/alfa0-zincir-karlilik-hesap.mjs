#!/usr/bin/env node
// Alfa-0 zincir kârlılık tablosu (A2). Yeniden üretim:
//   node docs/arastirma/alfa0-zincir-karlilik-hesap.mjs > docs/arastirma/alfa0-zincir-karlilik-hesap-cikti.md
// Girdi: packages/veri/icerik/{icerik,parametreler}.json (yalnız okunur). Çekirdek çalıştırılmaz: kararlı hâl akışlı kâğıt model
// (kayan nokta). Rastgelelik ve tarih yok: aynı veri, aynı çıktı. Model p4-p5-ekonomi-hesap.mjs ve yerel-talep-kalibrasyon-hesap.mjs ile
// aynı kurallarla: NPC ihracat ×0,891, ithalat ×1,111 (korumada 1,10), şebeke elektrik 10,35 ₺ ve yakıt 103,5 ₺ (kamu tavanı 1,035),
// bakım parçası ithal, işletme 60 ₺/sa/tesis, dükkân gideri 132 ₺/sa, kasa 90 birim/sa, esnaf tabanı %25, yerelOlcek 40.
// Pazar sınırlı en iyi akış: aşama doluluklarının ızgara araması (aşama başına 0..1, adım 0,1); fazla ürün satılmaz (atılır), eksik girdi
// NPC'den ithal edilir.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const oku = (d) => JSON.parse(fs.readFileSync(path.join(KOK, "packages/veri/icerik", d), "utf8"));
const IC = oku("icerik.json");
const PR = oku("parametreler.json");
const PPM = 1_000_000;

// ---------------------------------------------------------------------------------------------------------------- biçim
const nokta = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const tam = (x) => nokta(String(Math.round(x)));
const ond = (x, d = 2) => x.toFixed(d).replace(".", ",");
const yuzde = (x, d = 0) => `%${ond(x * 100, d)}`;
const satir = (...h) => `| ${h.join(" | ")} |`;
const baslik = (...h) => `${satir(...h)}\n|${h.map(() => "---").join("|")}|`;
const cikti = [];
const yaz = (s = "") => cikti.push(s);

// ---------------------------------------------------------------------------------------------------------------- sabitler
const MAL = Object.fromEntries(IC.mallar.map((m) => [m.id, m]));
const P = (id) => MAL[id].tabanFiyat / 1000; // ₺/birim
const PZ = PR.pazar;
const MULK = PR.mulk;
const ITH = (1 + PZ.makasPpm / 2 / PPM) * (1 + PZ.islemKomisyonuPpm / PPM); // 1,111
const ITH_KOR = 1 + PZ.makasPpm / 2 / PPM; // 1,10 (yeni oyuncu koruması, komisyonsuz)
const IHR = (1 - PZ.makasPpm / 2 / PPM) * (1 - PZ.islemKomisyonuPpm / PPM); // 0,891
const KAMU_TAVAN = 1.035; // p4-p5-ekonomi-hesap.mjs: min(1,10; 1,05; 1,30) = 1,05, 2 Ticaret ofisi makas indirimi %30 → 1,035
const SEB = { elektrik: P("elektrik") * KAMU_TAVAN, yakit: P("yakit") * KAMU_TAVAN };
const KASA_PAYI = 0.12; // kasaPayiPpm 120.000
const ISLETME = PR.ekonomi.tesisIsletmeParasiSaat / 1000; // 60 ₺/sa/tesis
const GIDER_DUKKAN = 132; // ₺/sa (S)
const KASA_DUKKAN = 90; // birim/sa
const YEREL_OLCEK = 40;
const KADEME = { kampanya: 0.85, uygun: 0.95, normal: 1.05, yuksek: 1.15 };
const ILK_INDIRIM = 1 - MULK.yeniOyuncu.ilkYapiIndirimPpm / PPM; // 0,7 (ilk 5 yapı)
const HUCRE = { kirsal: MULK.hucreFiyati.kirsal / 1000, kasaba: MULK.hucreFiyati.kasaba / 1000, sehir: MULK.hucreFiyati.sehir / 1000 }; // ₺
const TICARI = 1.45;
const GIRDI_FIYAT = (mal) => (mal === "elektrik" || mal === "yakit" ? SEB[mal] : P(mal) * ITH);
const PARCA_ITH = P("parca") * ITH; // bakım parçası ithal birimi

// talep1000Saat (mili-birim/1000 kişi/sa; p4-p5-ekonomi §1.13): yerel kanal ölçeği ekmek 40 birim/sa'e göre
const T1000 = { ekmek: 60, un: 10, gida: 90, sut: 20, sut_urunu: 20, sekerleme: 6, findik_urunu: 3, pencere: 8, cam: 4 };
const YEREL_MALLAR = ["ekmek", "pencere", "cam", "sut", "sut_urunu", "sekerleme", "findik_urunu"];
const yerelSat = (mal) => (T1000[mal] === undefined ? 0 : (40 * T1000[mal]) / 60); // birim/sa/oyuncu (medyan ilçe)

// NPC dilimi (birim/sa/oyuncu): emilimSaat × max(4, N)/4 ÷ N
const dilim = (mal, N) => ((PZ.emilimSaat[mal] / 1000) * Math.max(4, N)) / 4 / N;

// ---------------------------------------------------------------------------------------------------------------- aşamalar
// girdi/çıktı birim/sa; bakim = parça birim/sa (yöntem), isletme = ISLETME × adet. P1 yöntemleri "varsayım" işaretli (G4 dışı).
const ASAMA = {
  tarla: { ad: "Tarla (`geleneksel_tarim`)", n: 1, girdi: {}, cikti: { tahil: 200 }, bakim: 0.5, tesis: "ciftlik" },
  degirmen: { ad: "Değirmen (`degirmen`)", n: 1, girdi: { tahil: 200, elektrik: 12 }, cikti: { un: 165, kepek: 33 }, bakim: 0.8, tesis: "gida_fabrikasi" },
  firin: { ad: "Fırın (`ekmek_firini`)", n: 1, girdi: { un: 165, yakit: 20, elektrik: 15 }, cikti: { ekmek: 240 }, bakim: 0.8, tesis: "gida_fabrikasi" },
  cam: { ad: "Cam fırını (`cam_firini`)", n: 1, girdi: { silis: 60, yakit: 16, elektrik: 18 }, cikti: { cam: 50 }, bakim: 1.0, tesis: "parca_fabrikasi" },
  dograma: { ad: "Doğrama (`celik_dograma`)", n: 1, girdi: { celik: 24, cam: 32, parca: 5, elektrik: 15 }, cikti: { pencere: 28 }, bakim: 1.0, tesis: "parca_fabrikasi" },
  ahir2: { ad: "2 Ahır (`sut_kepekli` ×2)", n: 2, girdi: { tahil: 100, kepek: 120, elektrik: 10 }, cikti: { sut: 164, gubre: 8 }, bakim: 1.0, tesis: "ahir" },
  mandira: { ad: "Mandıra (`peynir_mandira`; varsayım: bakım 0,8)", n: 1, girdi: { sut: 150, elektrik: 10 }, cikti: { sut_urunu: 68 }, bakim: 0.8, tesis: "gida_fabrikasi" },
  bahce: { ad: "Fındık bahçesi (`findik_bahcesi`; varsayım: bakım 0,5)", n: 1, girdi: {}, cikti: { findik: 80 }, bakim: 0.5, tesis: "ciftlik" },
  kavurma: { ad: "Kavurma (`findik_kavurma`; varsayım: bakım 0,8)", n: 1, girdi: { findik: 80, yakit: 5, elektrik: 6 }, cikti: { findik_urunu: 40 }, bakim: 0.8, tesis: "gida_fabrikasi" },
  ezme: { ad: "Ezme/şekerleme (`findik_ezme_sekerleme`; varsayım: bakım 0,8)", n: 1, girdi: { findik_urunu: 40, gida: 30, elektrik: 12 }, cikti: { sekerleme: 90 }, bakim: 0.8, tesis: "gida_fabrikasi" },
};
const ZINCIR = {
  ekmek: { ad: "Ekmek (Tarla → değirmen → fırın → dükkân)", asamalar: ["tarla", "degirmen", "firin"], dukkan: "firin", satilir: ["ekmek", "kepek"] },
  pencere: { ad: "Cam → pencere (cam fırını → doğrama → yapı market)", asamalar: ["cam", "dograma"], dukkan: "yapi_market", satilir: ["pencere", "cam"] },
  sut: { ad: "Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri)", asamalar: ["tarla", "ahir2", "mandira"], dukkan: "sarkuteri", satilir: ["sut_urunu", "sut", "gubre"] },
  findik: { ad: "Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal)", asamalar: ["bahce", "kavurma", "ezme"], dukkan: "bakkal", satilir: ["sekerleme", "findik_urunu"] },
};

// ---------------------------------------------------------------------------------------------------------------- aşınma (C: kıtlık 10.000 ppm/gün, tavan %25)
const ASINMA = { hiz: 10_000, tavan: 0.25 }; // C varsayılanı; §4.1 varyantları geçici değiştirir
const KAYIP = (gun) => Math.min(1, (ASINMA.hiz * gun) / PPM) * ASINMA.tavan; // aşama başına çıktı kaybı (bakımsız)
const GUNLER60 = Array.from({ length: 60 }, (_, i) => i + 1);

// ---------------------------------------------------------------------------------------------------------------- pazar katmanları
// katmanlar[mal] = [{ cap, p, yerel }] fiyat azalan sırada; p ₺/birim (ihracat/dükkân satış fiyatı).
function katmanlar(N, o) {
  const ihr = o.npcCarpan ?? 1.0; // 1,0 denge; 0,625 doyma (arz = 1,5 × emilim)
  const k = {};
  for (const m of Object.keys(PZ.emilimSaat)) if (o.tum || o.satilir.includes(m)) k[m] = [{ cap: dilim(m, N), p: P(m) * IHR * ihr, yerel: false }];
  if (o.yerel !== false) {
    for (const m of Object.keys(T1000)) {
      if (m === "gida" || m === "un") continue;
      if (!o.yerelMallar.includes(m) || k[m] === undefined) continue;
      k[m] = [{ cap: Math.min(yerelSat(m), KASA_DUKKAN), p: P(m) * (o.kademe ?? KADEME.normal), yerel: true }, ...k[m]];
    }
  }
  return k;
}

// Bir doluluk vektörü için net ₺/sa. u: aşama başına doluluk 0..1 (n adetli aşamada toplu); ara mal kredi/fırsat maliyeti satış-alım dengesiyle.
function degerle(asamalar, u, kat, mod, gidersiz) {
  const bal = {};
  let gider = 0;
  const kayip = mod.gun === null ? 0 : KAYIP(mod.gun);
  asamalar.forEach((a, i) => {
    const d = u[i];
    if (d === 0) return;
    const c = ASAMA[a];
    for (const [m, q] of Object.entries(c.girdi)) bal[m] = (bal[m] ?? 0) - q * d;
    for (const [m, q] of Object.entries(c.cikti)) bal[m] = (bal[m] ?? 0) + q * d * (1 - kayip);
    gider += ISLETME * c.n + (mod.gun === null ? c.bakim * PARCA_ITH : 0);
  });
  let net = -gider;
  let yerelKullanildi = false;
  const akis = {};
  for (const [m, b] of Object.entries(bal)) {
    if (b < -1e-9) {
      net -= -b * GIRDI_FIYAT(m);
      akis[m] = b;
    } else if (b > 1e-9) {
      let kalan = b;
      for (const t of kat[m] ?? []) {
        const s = Math.min(kalan, t.cap);
        if (s > 0) {
          net += s * t.p;
          kalan -= s;
          if (t.yerel) yerelKullanildi = true;
        }
      }
      akis[m] = b;
    }
  }
  if (yerelKullanildi && !gidersiz) net -= GIDER_DUKKAN;
  return { net, bal: akis, yerel: yerelKullanildi, gider };
}

function enIyi(asamalar, kat, mod) {
  const dim = asamalar.length;
  const adim = dim <= 3 ? 20 : 10;
  const ust = Array.from({ length: adim + 1 }, (_, i) => i / adim);
  let en = null;
  const u = new Array(dim).fill(0);
  const rec = (i) => {
    if (i === dim) {
      const r = degerle(asamalar, u, kat, mod);
      if (en === null || r.net > en.net + 1e-9) en = { ...r, u: [...u] };
      return;
    }
    for (const v of ust) {
      u[i] = v;
      rec(i + 1);
    }
  };
  rec(0);
  return en;
}

// ---------------------------------------------------------------------------------------------------------------- yatırım
// Yapı bedeli (para + malzeme, ithal fiyatla) ve hücre; ilk 5 yapıda %30 indirim. Kasaba hücre fiyatı varsayılan.
function yapiBedeli(tesis, indirimli, sinif = "kasaba") {
  const t = IC.tesisTurleri.find((x) => x.id === tesis);
  const f = indirimli ? ILK_INDIRIM : 1;
  const para = (t.insaParasi / 1000) * f;
  let mal = 0;
  for (const [m, q] of Object.entries(t.insaMaliyeti)) mal += (q / 1000) * P(m) * ITH_KOR * f;
  return { para, mal, hucre: 0, toplam: para + mal, sinif };
}
const DUKKAN_BEDEL = (indirimli, kit, sinif = "kasaba") => {
  const f = indirimli ? ILK_INDIRIM : 1;
  const para = 6000 * f;
  const mal = (20 * P("celik") + 8 * P("parca")) * ITH_KOR * f + (kit ? 0 : 4 * P("pencere") * ITH_KOR * f);
  return { para, mal, hucre: HUCRE[sinif] * TICARI, toplam: para + mal + HUCRE[sinif] * TICARI };
};

// ================================================================================================================ çıktı
yaz("# Alfa-0 zincir kârlılık hesap çıktısı (otomatik üretildi)");
yaz();
yaz("Kaynak: `docs/arastirma/alfa0-zincir-karlilik-hesap.mjs`. Bu dosyayı elle düzenleme; betiği yeniden koş.");
yaz();
yaz("## 0. Sabitler (veriden okunan ya da sabit)");
yaz();
yaz(baslik("Sabit", "Değer"));
yaz(satir("NPC ihracat / ithalat çarpanı (komisyonlu)", `${ond(IHR, 3)} / ${ond(ITH, 3)} (korumada ithalat ${ond(ITH_KOR, 2)})`));
yaz(satir("Şebeke elektrik / yakıt", `${ond(SEB.elektrik, 2)} ₺ / ${ond(SEB.yakit, 1)} ₺ (kamu tavanı 1,035 × taban; ödemenin ${yuzde(KASA_PAYI)} ilçe kasasına, kalanı lavabo)`));
yaz(satir("Bakım parçası (ithal)", `${ond(PARCA_ITH, 1)} ₺/parça; işletme ${ISLETME} ₺/sa/tesis`));
yaz(satir("Dükkân S", `gider ${GIDER_DUKKAN} ₺/sa, kasa ${KASA_DUKKAN} birim/sa, kademe 0,95 / 1,05 (varsayılan) / 1,15 R, kampanya 0,85 R`));
yaz(satir("Yerel kanal", `yerelOlcek ${YEREL_OLCEK}; medyan ilçede ekmek 40 birim/sa/oyuncu, diğer mallar talep oranıyla (pencere ${ond(yerelSat("pencere"), 1)}, süt ${ond(yerelSat("sut"), 1)}, süt ürünü ${ond(yerelSat("sut_urunu"), 1)}, şekerleme ${ond(yerelSat("sekerleme"), 1)}, fındık ürünü ${ond(yerelSat("findik_urunu"), 1)})`));
yaz(satir("NPC dilimi (birim/sa/oyuncu; N ≥ 4 ⇒ emilim/4)", ["ekmek", "tahil", "un", "kepek", "pencere", "cam", "sut", "sut_urunu", "findik", "findik_urunu", "sekerleme", "gubre"].map((m) => `${m} ${ond(dilim(m, 200), 1)}`).join(", ")));
yaz(satir("Hücre fiyatı (kırsal / kasaba / şehir; ticari ×1,45)", `${tam(HUCRE.kirsal)} / ${tam(HUCRE.kasaba)} / ${tam(HUCRE.sehir)} ₺`));
yaz(satir("İlk 5 yapı indirimi", `%${Math.round((1 - ILK_INDIRIM) * 100)} (para + malzeme)`));
yaz(satir("Aşınma (C)", "kıtlık aşınması 10.000 ppm/gün, tavan %25 (A3 §5.10 `asinmaHizCarpaniPpm` 500.000); aşama çıktı kaybı gün 14 %3,5, gün 45 %11,3, gün 70 %17,5"));

// ---------------------------------------------------------------------------------------------------------------- 1 basamak tablosu
yaz();
yaz("## 1. Basamak ekonomisi (kapasite; S ölçek; saatlik; yatırım ilk 5 yapı indirimli)");
yaz();
yaz("Birim maliyet = (girdi + şebeke enerjisi + bakım parçası + işletme − yan ürün kredisi) / ana çıktı. **İç** = ara girdi fırsat maliyeti (kendi ürettiğini NPC'ye satmama, ×0,891); **ithal** = girdinin tamamı NPC'den ×1,111 (uzman kademe). Yan ürün (kepek, gübre) NPC ihracat fiyatıyla kredilenir. Satış: NPC ihracat 0,891 R (denge) ve doyma (×0,625); yerel dükkân 0,95 / 1,05 / 1,15 R. Marj = satış / maliyet − 1.");
const ANA = { tarla: "tahil", degirmen: "un", firin: "ekmek", cam: "cam", dograma: "pencere", ahir2: "sut", mandira: "sut_urunu", bahce: "findik", kavurma: "findik_urunu", ezme: "sekerleme" };
const YAN = { degirmen: ["kepek"], ahir2: ["gubre"] };
const URETIM_ICI = new Set(["tahil", "un", "cam", "sut", "findik", "findik_urunu"]); // zincir içinde üretilen ara mallar
for (const [zk, z] of Object.entries(ZINCIR)) {
  yaz();
  yaz(`### ${z.ad}`);
  yaz();
  yaz(baslik("Basamak", "Birim maliyet iç / ithal ₺", "NPC satış denge / doyma ₺", "Yerel 0,95 / 1,05 / 1,15 R ₺", "Marj NPC (iç / ithal)", "Marj yerel 1,05 R (iç)", "Net ₺/sa (iç, NPC denge)", "Net ₺/sa (ithal, NPC denge)", "Yatırım ₺ (ind. / indirimsiz)", "Geri ödeme sa (iç, kapasite)", "Pazar birim/sa (NPC dilimi + yerel) ↔ kapasite"));
  for (const a of z.asamalar) {
    const c = ASAMA[a];
    const ana = ANA[a];
    const q = c.cikti[ana];
    let gIc = 0;
    let gIth = 0;
    for (const [m, x] of Object.entries(c.girdi)) {
      const fiyIc = URETIM_ICI.has(m) ? P(m) * IHR : GIRDI_FIYAT(m);
      gIc += x * fiyIc;
      gIth += x * GIRDI_FIYAT(m);
    }
    let yan = 0;
    for (const m of YAN[a] ?? []) yan += c.cikti[m] * P(m) * IHR;
    const sab = ISLETME * c.n + c.bakim * PARCA_ITH;
    const mIc = (gIc + sab - yan) / q;
    const mIth = (gIth + sab - yan) / q;
    const npc = P(ana) * IHR;
    const nIc = q * npc + yan - gIc - sab;
    const nIth = q * npc + yan - gIth - sab;
    const yat = yapiBedeli(c.tesis, true).toplam * c.n;
    const yatI = yapiBedeli(c.tesis, false).toplam * c.n;
    const yerelTxt = T1000[ana] !== undefined && ana !== "gida" && ana !== "un" ? [KADEME.uygun, KADEME.normal, KADEME.yuksek].map((k) => ond(P(ana) * k, 1)).join(" / ") : "-";
    const mYerel = T1000[ana] !== undefined && ana !== "gida" && ana !== "un" ? yuzde((P(ana) * KADEME.normal) / mIc - 1) : "-";
    yaz(satir(c.ad, `${ond(mIc, 1)} / ${ond(mIth, 1)}`, `${ond(npc, 1)} / ${ond(npc * 0.625, 1)}`, yerelTxt, `${yuzde(npc / mIc - 1)} / ${yuzde(npc / mIth - 1)}`, mYerel, tam(nIc), tam(nIth), `${tam(yat)} / ${tam(yatI)}`, nIc > 0 ? ond(yat / nIc, 1) : "hiç", `${ond(dilim(ana, 200) + (YEREL_MALLAR.includes(ana) ? yerelSat(ana) : 0), 1)} ↔ ${ond(q, 0)}`));
  }
  void zk;
}

// ---------------------------------------------------------------------------------------------------------------- 2 zincir toplamı (pazar sınırlı)
yaz();
yaz("## 2. Zincir toplamı: pazar sınırlı en iyi akış (N = 200 oyuncu; yerelOlcek 40; kademe 1,05 R; NPC denge)");
yaz();
yaz("Net = satış − eksik girdi ithalatı − enerji − bakım parçası − işletme − dükkân gideri (yerel satış varsa). Doluluk aşama başına ızgara aramasıyla (üstteki satış katmanları: yerel, sonra NPC dilimi). **Bakımlı** = parça alınır; **bakımsız** = parça yok, aşama çıktı kaybı (C). Yatırım hücre dahil (kasaba).");
const OZET = {};
function zincirSonuc(zk, N, katOpt, mod) {
  const z = ZINCIR[zk];
  const kat = katmanlar(N, { satilir: z.satilir, ...katOpt });
  return enIyi(z.asamalar, kat, mod);
}
function yatirimZincir(zk, kit, sinif) {
  const z = ZINCIR[zk];
  let toplam = 0;
  const kalemler = [];
  let sira = 0; // pencere zinciri P5'tir: ilk 5 indirimli yapı P4 yapılarıyla tüketilmiş varsayılır (aşağıda indirimsiz)
  for (const a of z.asamalar) {
    const c = ASAMA[a];
    for (let i = 0; i < c.n; i++) {
      const ind = zk !== "pencere" && sira < MULK.yeniOyuncu.indirimliYapiSayisi;
      const b = yapiBedeli(c.tesis, ind);
      toplam += b.toplam;
      kalemler.push([`${c.ad}${c.n > 1 ? ` #${i + 1}` : ""}`, b.toplam]);
      sira++;
    }
  }
  // dükkân
  const ind = zk !== "pencere" && sira < MULK.yeniOyuncu.indirimliYapiSayisi;
  const d = DUKKAN_BEDEL(ind, kit && zk !== "pencere", sinif);
  toplam += d.toplam;
  kalemler.push([`Dükkân (${z.dukkan})`, d.toplam]);
  // ek hücre: yurt 6 ücretsiz; zincir hücre sayısı (Tarla 2, gıda fab 2, ahır 2, parça fab 2, ciftlik 2)
  let hucre = 0;
  for (const a of z.asamalar) {
    const t = ASAMA[a].tesis;
    hucre += (MULK.olcekHucre[t]?.[0] ?? 2) * ASAMA[a].n;
  }
  const yurt = zk === "pencere" ? 0 : MULK.yeniOyuncu.yurtHucre;
  const ek = Math.max(0, hucre - yurt);
  toplam += ek * HUCRE[sinif];
  kalemler.push([`Ek hücre (${ek} adet, ${sinif})`, ek * HUCRE[sinif]]);
  return { toplam, kalemler };
}
yaz();
yaz(baslik("Zincir", "Doluluk (aşama)", "Net ₺/sa (son ürün + yan ürün satılır)", "Net ₺/gün", "Yatırım ₺ (kasaba)", "Geri ödeme sa", "Ana akış (birim/sa)", "Net ₺/sa, tüm ara mal dilimleri de satılırsa"));
const YM = { ekmek: ["ekmek"], pencere: ["pencere", "cam"], sut: ["sut_urunu", "sut"], findik: ["findik_urunu", "sekerleme"] };
for (const zk of Object.keys(ZINCIR)) {
  const z = ZINCIR[zk];
  const opt = { yerelMallar: YEREL_MALLAR };
  const mod = { gun: null };
  const r = zincirSonuc(zk, 200, opt, mod);
  const yat = yatirimZincir(zk, true, "kasaba");
  OZET[zk] = { r, yat };
  const akis = YM[zk].map((m) => `${m} ${ond(r.bal[m] ?? 0, 1)}`).join(", ");
  const tum = zincirSonuc(zk, 200, { ...opt, tum: true }, mod).net;
  yaz(satir(z.ad, z.asamalar.map((a, i) => `${a} ${yuzde(r.u[i])}`).join(", "), tam(r.net), tam(r.net * 24), tam(yat.toplam), r.net > 0 ? ond(yat.toplam / r.net, 1) : "hiç", akis, tam(tum)));
}
yaz();
yaz("### 2.1 Yatırım kalemleri (kasaba hücre; ilk 5 yapı indirimli; ekmek ve süt P4, pencere P5 indirimsiz)");
yaz();
yaz(baslik("Zincir", "Kalemler (₺)", "Toplam ₺"));
for (const zk of Object.keys(ZINCIR)) yaz(satir(ZINCIR[zk].ad, OZET[zk].yat.kalemler.map(([k, v]) => `${k} ${tam(v)}`).join("; "), tam(OZET[zk].yat.toplam)));

// ---------------------------------------------------------------------------------------------------------------- 3 duyarlılık: pazar, N, kademe
yaz();
yaz("## 3. Duyarlılık: dünya büyüklüğü N, NPC fiyatı, dükkân kademesi (net ₺/sa; bakımlı)");
yaz();
yaz(baslik("Zincir", "N = 200 (NPC dilimi emilim/4)", "N = 4", "N = 1 (tek oyunculu pilot)", "NPC doyma ×0,625", "Kademe 0,95 R", "Kademe 1,15 R", "Yerel kanal yok (yalnız NPC)"));
for (const zk of Object.keys(ZINCIR)) {
  const bas = { yerelMallar: YEREL_MALLAR };
  const f = (N, o) => tam(zincirSonuc(zk, N, { ...bas, ...o }, { gun: null }).net);
  yaz(satir(ZINCIR[zk].ad, f(200, {}), f(4, {}), f(1, {}), f(200, { npcCarpan: 0.625 }), f(200, { kademe: KADEME.uygun }), f(200, { kademe: KADEME.yuksek }), f(200, { yerel: false })));
}

// ---------------------------------------------------------------------------------------------------------------- 4 bakım
yaz();
yaz("## 4. Bakım ve aşınma (A3 §5.10: aşınma ×0,5, tavan %25): bakımlı ↔ bakımsız (net ₺/sa)");
yaz();
yaz("Bakımlı: parça ithal (yukarıdaki sütun). Bakımsız: parça yok, her aşamada çıktı kaybı. Gün 14, 45, 70 anlık; \"60 g ort.\" = 1..60. günlerin ortalaması. `yuzey_cevher` ve `hidro_santrali` parça çarpanı ×0,2 (mülk) bu dört zincirde kullanılmaz (çelik ithal; elektrik şebekeden): etkisi §5.");
yaz();
yaz(baslik("Zincir", "Bakımlı", "Bakımsız gün 14", "gün 45", "gün 70", "60 g ort.", "Bakımlı / bakımsız (60 g ort.)", "Bakım parçası ₺/sa (tüm aşamalar)"));
const bakimOzet = {};
for (const zk of Object.keys(ZINCIR)) {
  const opt = { yerelMallar: YEREL_MALLAR };
  const z = ZINCIR[zk];
  const bk = zincirSonuc(zk, 200, opt, { gun: null }).net;
  const g = (gun) => zincirSonuc(zk, 200, opt, { gun }).net;
  const n14 = g(14);
  const n45 = g(45);
  const n70 = g(70);
  let ort = 0;
  for (const gun of GUNLER60) ort += g(gun);
  ort /= GUNLER60.length;
  const parca = z.asamalar.reduce((t, a) => t + ASAMA[a].bakim * PARCA_ITH, 0);
  bakimOzet[zk] = { bk, ort };
  yaz(satir(z.ad, tam(bk), tam(n14), tam(n45), tam(n70), tam(ort), ort > 0 ? ond(bk / ort, 2) : "-", tam(parca)));
}

yaz();
yaz("### 4.1 Aşınma kalibrasyonu varyantları: bakımlı / bakımsız oranı (60 g ort.)");
yaz();
yaz("Varyant = (kıtlık aşınması ppm/gün, çıktı kaybı tavanı). C = A2 önerisi (A3 §5.10); mevcut = `sanayi.bakim` (bölge kipi değeri); E = daha yumuşak.");
yaz();
yaz(baslik("Zincir", "C (10.000; %25)", "C hızı, tavan %40 (10.000; %40)", "mevcut (20.000; %40)", "E (8.000; %25)"));
const VARYANT = [[10_000, 0.25], [10_000, 0.4], [20_000, 0.4], [8_000, 0.25]];
for (const zk of Object.keys(ZINCIR)) {
  const opt = { yerelMallar: YEREL_MALLAR };
  const bk = zincirSonuc(zk, 200, opt, { gun: null }).net;
  const h = VARYANT.map(([hiz, tavan]) => {
    ASINMA.hiz = hiz;
    ASINMA.tavan = tavan;
    let ort = 0;
    for (const gun of GUNLER60) ort += zincirSonuc(zk, 200, opt, { gun }).net;
    ort /= GUNLER60.length;
    return ond(bk / ort, 2);
  });
  ASINMA.hiz = 10_000;
  ASINMA.tavan = 0.25;
  yaz(satir(ZINCIR[zk].ad, ...h));
}

// ---------------------------------------------------------------------------------------------------------------- 5 şebeke ve santral
yaz();
yaz("## 5. Şebeke ödemesi, kasa payı ve isteğe bağlı santral");
yaz();
yaz(baslik("Zincir", "Elektrik birim/sa", "Yakıt birim/sa", "Şebeke ödemesi ₺/sa", "Ödemenin %12 kasaya ₺/sa", "Lavabo `sebeke` ₺/sa", "Ödeme / net (bakımlı)"));
for (const zk of Object.keys(ZINCIR)) {
  const z = ZINCIR[zk];
  const r = OZET[zk].r;
  let el = 0;
  let yk = 0;
  z.asamalar.forEach((a, i) => {
    el += (ASAMA[a].girdi.elektrik ?? 0) * r.u[i];
    yk += (ASAMA[a].girdi.yakit ?? 0) * r.u[i];
  });
  const od = el * SEB.elektrik + yk * SEB.yakit;
  yaz(satir(z.ad, ond(el, 1), ond(yk, 1), tam(od), tam(od * KASA_PAYI), tam(od * (1 - KASA_PAYI)), r.net > 0 ? yuzde(od / r.net) : "-"));
}
yaz();
const hidro = IC.yontemler.find((y) => y.id === "hidro_santrali");
const sant = IC.tesisTurleri.find((t) => t.id === "hidro_santrali");
const santYat = sant.insaParasi / 1000 + (sant.insaMaliyeti.celik / 1000) * P("celik") * ITH_KOR + (sant.insaMaliyeti.parca / 1000) * P("parca") * ITH_KOR;
const ekmekEl = OZET.ekmek.r.u.reduce((t, u, i) => t + (ASAMA[ZINCIR.ekmek.asamalar[i]].girdi.elektrik ?? 0) * u, 0);
const tasarruf = ekmekEl * SEB.elektrik;
const parcaMiktar = (hidro.bakim.parca / 1000) * 0.2; // mülk önerisi ×0,2 (A3 §5.10)
yaz(`Hidro santrali (dağ etiketi gerekir): ${ond(hidro.ciktilar.elektrik / 1000, 0)} elektrik/sa üretir, bakım parçası ${ond(hidro.bakim.parca / 1000, 1)} → ${ond(parcaMiktar, 1)}/sa (×0,2); yatırım ${tam(santYat)} ₺ (korumada ithal malzeme). Ekmek zincirinin elektriği ${ond(ekmekEl, 1)}/sa: şebeke tasarrufu ${tam(tasarruf)} ₺/sa − bakım ${tam(parcaMiktar * PARCA_ITH)} ₺/sa = ${tam(tasarruf - parcaMiktar * PARCA_ITH)} ₺/sa net ⇒ geri ödeme ${ond(santYat / (tasarruf - parcaMiktar * PARCA_ITH), 0)} sa. Üretilen fazla elektrik satılamaz (elektrik NPC kaydı yok): santral yalnız şebeke tasarrufudur.`);

// ---------------------------------------------------------------------------------------------------------------- 6 dükkân: A0-11
yaz();
yaz("## 6. A0-11: ilk dükkân ve geri ödeme (kâğıt)");
yaz();
yaz("Dükkân (fırın, ekmek, 1,05 R): oyuncu satışı `s = min(90, p·Q) (k = 1: p = 0,561; k = 3: p = 0,25)` (çekim ağırlığı w = (1/p)²(1+0,25·çeşit), esnaf w, k = 1 oyuncu/ilçe; esnaf %25 tabanı); Q = 60 × nüfus × `yerelOlcek` / 1e6 birim/sa. Ek net = s × (1,05 − 0,891) × 60 − 132 (NPC'ye satışa göre ek kazanç). Yatırım: dükkân para 4.200 + çelik 14 + parça 5,6 + pencere 2,8 (korumada ithal) + ticari hücre (×1,45); **kit 3 pencere** pencere kalemini karşılar.");
yaz();
yaz(baslik("İlçe (nüfus)", "Q ekmek birim/sa", "s birim/sa (k = 1)", "Ek net ₺/sa", "Yatırım ₺ (kit yok)", "Yatırım ₺ (kit 3 pencere)", "Geri ödeme sa (kit)", "k = 3 oyuncu: s / net / geri ödeme sa"));
const SAYIM = [["kırsal 8.000", 8000, "kirsal"], ["küçük kasaba 20.000", 20000, "kasaba"], ["kasaba 40.000", 40000, "kasaba"], ["kasaba 70.000", 70000, "kasaba"], ["şehir 120.000", 120000, "sehir"], ["büyük şehir 300.000", 300000, "sehir"]];
// k oyuncu/ilçe: oyuncu başına Q payı = min(0,75/k, w_d/(k w_d + w_esnaf)); w = (1/p)²(1+0,25·çeşit), çeşit 0,5 (fırın), esnaf p = 1,12
const W_D = (1 / KADEME.normal) ** 2 * (1 + 0.25 * 0.5);
const W_E = (1 / 1.12) ** 2;
const PAY = (k) => Math.min(0.75 / k, W_D / (k * W_D + W_E));
for (const [ad, nuf, sin] of SAYIM) {
  const Q = (60 * nuf * YEREL_OLCEK) / 1e6;
  const s = Math.min(KASA_DUKKAN, PAY(1) * Q);
  const net = s * (P("ekmek") * KADEME.normal - P("ekmek") * IHR) - GIDER_DUKKAN;
  const dY = DUKKAN_BEDEL(true, false, sin).toplam;
  const dK = DUKKAN_BEDEL(true, true, sin).toplam;
  const s3 = Math.min(KASA_DUKKAN, PAY(3) * Q);
  const net3 = s3 * (P("ekmek") * KADEME.normal - P("ekmek") * IHR) - GIDER_DUKKAN;
  yaz(satir(ad, ond(Q, 0), ond(s, 1), tam(net), tam(dY), tam(dK), net > 0 ? ond(dK / net, 1) : "hiç", net3 > 0 ? `${ond(s3, 1)} / ${tam(net3)} / ${ond(dK / net3, 1)}` : `${ond(s3, 1)} / ${tam(net3)} / hiç`));
}
yaz();
yaz("Kit ve ödül: kit pencere 3 ≥ 2,8 (ilk dükkân ithalatsız; ithal pencere kalemi tasarrufu **" + tam(2.8 * P("pencere") * ITH_KOR) + " ₺**'ye kadar, indirimsiz ithal)); `ilk_pencere` ödülü 8 bakım parçası = taban " + tam(8 * P("parca")) + " ₺ (ithal " + tam(8 * PARCA_ITH) + " ₺): pencere zinciri yatırımının %" + ond((100 * 8 * P("parca")) / OZET.pencere.yat.toplam, 1) + "'ini karşılar, geri ödemeyi " + ond((8 * P("parca")) / OZET.pencere.r.net, 1) + " sa kısaltır.");
yaz();
yaz("### 6.1 İlk dükkân süresi (kâğıt zaman çizelgesi, erken oyun çarpanı %10, ilk 24 sa)");
yaz();
yaz(baslik("Adım", "Süre", "Not"));
const ES = 0.1;
yaz(satir("Tarla (2 sa × %10)", `${ond(2 * ES, 1)} sa`, "katılım anında; yurt hücresi ücretsiz"));
yaz(satir("Fabrika (6 sa × %10)", `${ond(6 * ES, 1)} sa`, "ikinci yuva, Tarla ile aynı anda"));
yaz(satir("Dükkân (4 sa × %10)", `${ond(4 * ES, 1)} sa`, "yuva boşalınca (Tarla bitince); kit pencere 3 ≥ 2,8, çelik 120, parça 40 yeter"));
yaz(satir("Dükkân bitişi (kâğıt, gecikmesiz)", `≈ ${ond(2 * ES + 4 * ES, 1)}–${ond(6 * ES + 4 * ES, 1)} sa`, "ilk satış: raf kit gıdası (200) hemen; yönetim kararı bağlayıcıdır"));
yaz(satir("İnsan (A1: kit varsa karar ≈ 49 dk)", `≈ ${ond(0.82 + 4 * ES, 1)} sa`, "tek oyuncu alt ucu; dağılım A1 pilotundadır"));
yaz(satir("Bot (G7 gecikmesi U(3, 24) sa; %25 ilk 24 sa kurmaz)", `ortalama ≈ ${ond(13.5 + 4 * ES, 1)} sa`, "`bot-kurallari-g6-g8.md` §1.1; eşik ≤ 36 sa"));
yaz();
yaz("Geri ödeme medyanı (b: ilçe başına gerçek nüfus, `yerelOlcek` 40; 45 ilçe): 37 sa (oyuncular ilçelere eşit) / 22 sa (nüfusla orantılı) (`yerel-talep-kalibrasyon.md` §4); kârlı ilçe 36 / 42 (nüfusu ≥ 30 bin).");

// ---------------------------------------------------------------------------------------------------------------- 7 parametre duyarlılığı (öneri adayları)
yaz();
yaz("## 7. Parametre duyarlılığı (öneri adayları; N = 200, bakımlı, son ürün satılır)");
yaz();
yaz(baslik("Aday", "Zincir", "Önce net ₺/sa", "Sonra net ₺/sa", "Değişim", "Geri ödeme sa (önce → sonra)"));
const ADAY = [
  ["`celik_dograma` pencere çıktısı 28 → 30", "pencere", () => { ASAMA.dograma.cikti.pencere = 30; }, () => { ASAMA.dograma.cikti.pencere = 28; }],
  ["`celik_dograma` 28 → 30 **ve** `cam_firini` yakıt 16 → 12", "pencere", () => { ASAMA.dograma.cikti.pencere = 30; ASAMA.cam.girdi.yakit = 12; }, () => { ASAMA.dograma.cikti.pencere = 28; ASAMA.cam.girdi.yakit = 16; }],
  ["`celik_dograma` pencere çıktısı 28 → 32", "pencere", () => { ASAMA.dograma.cikti.pencere = 32; }, () => { ASAMA.dograma.cikti.pencere = 28; }],
  ["`cam_firini` yakıt 16 → 12", "pencere", () => { ASAMA.cam.girdi.yakit = 12; }, () => { ASAMA.cam.girdi.yakit = 16; }],
  ["`findik_bahcesi` çıktı 80 → 60 (P1 tarifi)", "findik", () => { ASAMA.bahce.cikti.findik = 60; }, () => { ASAMA.bahce.cikti.findik = 80; }],
  ["`findik_bahcesi` çıktı 80 → 50 (P1 tarifi)", "findik", () => { ASAMA.bahce.cikti.findik = 50; }, () => { ASAMA.bahce.cikti.findik = 80; }],
  ["`sut_kepekli` kepek 60 → 40 (ahır başına)", "sut", () => { ASAMA.ahir2.girdi.kepek = 80; }, () => { ASAMA.ahir2.girdi.kepek = 120; }],
];
for (const [ad, zk, uygula, geri] of ADAY) {
  const opt = { yerelMallar: YEREL_MALLAR };
  const once = zincirSonuc(zk, 200, opt, { gun: null }).net;
  uygula();
  const sonra = zincirSonuc(zk, 200, opt, { gun: null }).net;
  geri();
  const yat = OZET[zk].yat.toplam;
  yaz(satir(ad, ZINCIR[zk].ad, tam(once), tam(sonra), `${sonra >= once ? "+" : ""}${ond(((sonra - once) / once) * 100, 1)}%`, `${ond(yat / once, 1)} → ${ond(yat / sonra, 1)}`));
}

console.log(cikti.join("\n"));
