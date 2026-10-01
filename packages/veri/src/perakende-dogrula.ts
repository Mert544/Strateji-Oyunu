/**
 * Node-only ek semantik doğrulayıcı (docs/arastirma/p4-p5-sartname.md §4.5 Katman 2; `dogrulaKimlikKilidi` kalıbı): `dogrulaVeriPaketi`den SONRA yükleyiciler çağırır;
 * tarayıcı/istemci paketine ve çekirdek derlemesine GİRMEZ (`veri/src/saf.ts` içe aktarmaz). Hata kanalı paketi reddeder; uyarı kanalı yazdırılır.
 *
 * G6-1: V13 çıkmaz mal (yan ürün kuralı a, genel kural b), V14 `mulk.sebeke`, V15 mülk kipi yöntem oran bandı (uyarı), V17 `mulk.yontemGecersizKilma`,
 * Y8 (tür başına yöntem sayısı uyarısı). V16 (`mulkKipi` varsayılan/teknoloji) `dogrulaIcerik`tedir (içerik tek başına doğrulanır).
 * G7-1a: `mulk.perakende` kuralları V1-V12 (V5 yalnız uyarı) ve V13'te rafın (H) tüketici sayılması. `perakende` bloğu yokken bu kurallar hiçbir şey yapmaz.
 * Blok ve bayrak yokken sonuç boştur (davranış bugünküyle aynı).
 */
import type { DogrulamaSonucu, VeriPaketi } from "./dogrula";
import { yontemSayisiUyarilari } from "./kimlik-listesi";

/**
 * V13(b) genel çıkmaz mal kuralı (en az iki tüketici türü) hata mı sayılsın? A0'da UYARI; P1 teslim kapısı true yapar (şartname §21 S-15).
 * Elektrik (depolanamaz) muaftır.
 */
export const CIKMAZ_MAL_HATA = false;

/**
 * V13(a) yan ürün kuralı (`kepek`, `gubre`: yöntem girdisi tüketicisi Ü ≥ 1 ve NPC pazar emilimi N > 0) hata mı sayılsın? Şartname: hata. G6-1'de veri henüz değişmedi (`kepek`i
 * tüketen yöntem G6-3'te gelir), bu yüzden bu dilimde uyarıdır; G6-3 (veri) commit'i bunu `true` yapar.
 */
export const YAN_URUN_KURALI_HATA = false;

/** Yan ürünler (UA1: bu mallar çöpe gitmemeli). */
const YAN_URUNLER = ["kepek", "gubre"] as const;

export interface PerakendeDogrulamaSecenegi {
  /** Varsayılan `CIKMAZ_MAL_HATA`. */
  cikmazMalHata?: boolean;
  /** Varsayılan `YAN_URUN_KURALI_HATA`. */
  yanUrunHata?: boolean;
}

export type PerakendeDogrulamaSonucu = DogrulamaSonucu & { uyarilar: string[] };

/** Mülk kipi yöntem çıktı/girdi değer oranı bandı (A2 §1.13): [1,16; 1,48] (yüzde 116 ve 148). */
const ORAN_ALT_YUZDE = 116;
const ORAN_UST_YUZDE = 148;

export function dogrulaPerakende(paket: Pick<VeriPaketi, "icerik" | "param">, secenek: PerakendeDogrulamaSecenegi = {}): PerakendeDogrulamaSonucu {
  const hatalar: string[] = [];
  const uyarilar: string[] = [];
  const ic = paket.icerik;
  const mulk = paket.param.mulk;
  const malTablosu = new Map(ic.mallar.map((m) => [m.id, m]));
  const depolanabilirMi = (id: string): boolean => malTablosu.get(id)?.depolanabilir !== false;

  // Y8 (uyarı): tür başına yöntem sayısı > 10.
  uyarilar.push(...yontemSayisiUyarilari(ic.tesisTurleri));

  // V13: çıkmaz mal (UA1). Tüketici türleri: Ü yöntem girdisi, H raf (dükkân türü `mallar`; `perakende` bloğu varsa), Y yapı maliyeti (tesis türü ve ek yapı), P pazar emilimi > 0. (K ve N kodda var olunca sayılır.)
  const yontemGirdisi = new Set<string>();
  for (const y of ic.yontemler) for (const m of Object.keys(y.girdiler)) yontemGirdisi.add(m);
  const yapiMaliyeti = new Set<string>();
  for (const t of ic.tesisTurleri) for (const m of Object.keys(t.insaMaliyeti)) yapiMaliyeti.add(m);
  for (const e of Object.values(mulk?.ekYapilar ?? {})) for (const m of Object.keys(e.insaMaliyeti)) yapiMaliyeti.add(m);
  const rafMallari = new Set<string>();
  for (const t of mulk?.perakende?.dukkanTurleri ?? []) for (const m of t.mallar) rafMallari.add(m);
  const emilim = paket.param.pazar?.emilimSaat ?? {};
  const gubreDozu = (paket.param.tarim?.gubreTuketimiSaat ?? 0) > 0;
  const yanUrunHata = secenek.yanUrunHata ?? YAN_URUN_KURALI_HATA;
  const yanUrunHedefi = yanUrunHata ? hatalar : uyarilar;
  for (const m of YAN_URUNLER) {
    if (!malTablosu.has(m)) continue;
    const uretici = yontemGirdisi.has(m) || (m === "gubre" && gubreDozu);
    if (!uretici || !((emilim[m] ?? 0) > 0)) yanUrunHedefi.push(`icerik: yan urun alicisiz: ${m}`);
  }
  const cikmazHedefi = (secenek.cikmazMalHata ?? CIKMAZ_MAL_HATA) ? hatalar : uyarilar;
  for (const m of ic.mallar) {
    if (m.depolanabilir === false) continue; // elektrik muaf
    let n = 0;
    if (yontemGirdisi.has(m.id) || (m.id === "gubre" && gubreDozu)) n++;
    if (rafMallari.has(m.id)) n++;
    if (yapiMaliyeti.has(m.id)) n++;
    if ((emilim[m.id] ?? 0) > 0) n++;
    if (n < 2) cikmazHedefi.push(`icerik: cikmaz mal: ${m.id} (tuketici turu ${n} < 2)`);
  }

  // V1-V12: mulk.perakende (G7-1a; blok yoksa yalnız V1'in tersi: dukkan ek yapısı tek başına olamaz).
  perakendeKurallari(paket, malTablosu, hatalar, uyarilar);

  // V14: mulk.sebeke (içerik çaprazı; aralıklar `dogrulaParametreler`de).
  const sebeke = mulk?.sebeke;
  if (sebeke !== undefined) {
    for (const s of sebeke.mallar) {
      const m = malTablosu.get(s.mal);
      if (m === undefined) {
        hatalar.push(`sebeke.mallar: bilinmeyen mal: ${s.mal}`);
        continue;
      }
      const girdili = ic.yontemler.some((y) => (y.girdiler[s.mal] ?? 0) > 0);
      if (s.mal === "elektrik") {
        if (depolanabilirMi("elektrik")) hatalar.push("sebeke.mallar.elektrik: elektrik mali depolanamaz olmali");
        if (!girdili) hatalar.push("sebeke.mallar.elektrik: elektrik girdisi tasiyan yontem yok");
      } else {
        if (!depolanabilirMi(s.mal)) hatalar.push(`sebeke.mallar.${s.mal}: elektrik disindaki sebeke mali depolanabilir olmali`);
        if (!girdili) uyarilar.push(`sebeke.mallar.${s.mal}: olu kayit (hicbir yontemin girdisinde yok)`);
      }
    }
  }

  // V15: mülk kipi yöntemlerinin çıktı/girdi değer oranı bandı (uyarı; taban fiyatla, tamsayı).
  for (const y of ic.yontemler) {
    if (y.mulkKipi !== true) continue;
    let cikti = 0;
    let girdi = 0;
    let tam = true;
    for (const [m, q] of Object.entries(y.ciktilar)) {
      const t = malTablosu.get(m)?.tabanFiyat;
      if (t === undefined) tam = false;
      else cikti += q * t;
    }
    for (const [m, q] of Object.entries(y.girdiler)) {
      const t = malTablosu.get(m)?.tabanFiyat;
      if (t === undefined) tam = false;
      else girdi += q * t;
    }
    if (!tam || girdi <= 0) continue;
    if (cikti * 100 < girdi * ORAN_ALT_YUZDE || cikti * 100 > girdi * ORAN_UST_YUZDE) uyarilar.push(`icerik.yontemler.${y.id}: oran bandi disi`);
  }

  // V17: mulk.yontemGecersizKilma anahtarları içerik yöntemleridir (aralık `dogrulaParametreler`de).
  const yontemler = new Set(ic.yontemler.map((y) => y.id));
  for (const id of Object.keys(mulk?.yontemGecersizKilma ?? {})) if (!yontemler.has(id)) hatalar.push(`yontemGecersizKilma: bilinmeyen yontem: ${id}`);

  return hatalar.length === 0 ? { gecerli: true, uyarilar } : { gecerli: false, hatalar, uyarilar };
}

// ---------------------------------------------------------------------------
// V1-V12: `mulk.perakende` (sartname §4.3 ve §4.5)
// ---------------------------------------------------------------------------

/** Kilitsizlik taraması (V11, A0-17): `perakende` ve `ekYapilar.dukkan` alt ağacında bu kök sözcükleri taşıyan ANAHTAR yoktur. */
const KILIT_ANAHTARI = /seviye|teknoloji|onkosul|oncekitur|yukseltmesarti|kilit/i;
/**
 * Anahtarları taranır; ANAHTARLARI VERİ olan kayıtların (mal kimliği anahtarlı `talep1000Saat` ve `insaMaliyeti`: değerlerine inilmez; grup kimliği anahtarlı
 * `gruplar`: grup adı taranmaz, değerlerine inilir) adları kilit sözcüğü sayılmaz.
 */
function kilitAnahtarlari(d: unknown, yol: string, cikti: string[], anahtarlarVeri = false): void {
  if (d === null || typeof d !== "object") return;
  if (Array.isArray(d)) {
    for (const x of d) kilitAnahtarlari(x, yol, cikti);
    return;
  }
  for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
    const yeniYol = yol === "" ? k : `${yol}.${k}`;
    if (!anahtarlarVeri && KILIT_ANAHTARI.test(k)) cikti.push(yeniYol);
    if (k === "talep1000Saat" || k === "insaMaliyeti") continue; // mal kimliği anahtarlı sayı kayıtları
    kilitAnahtarlari(v, yeniYol, cikti, k === "gruplar");
  }
}

function perakendeKurallari(
  paket: Pick<VeriPaketi, "icerik" | "param">,
  malTablosu: ReadonlyMap<string, { depolanabilir?: boolean }>,
  hatalar: string[],
  uyarilar: string[],
): void {
  const mulk = paket.param.mulk;
  const pr = mulk?.perakende;
  const duk = mulk?.ekYapilar?.["dukkan"];
  // V1: ikisi birlikte; dukkan yuvası 1.
  if ((pr === undefined) !== (duk === undefined)) hatalar.push("perakende: ekYapilar.dukkan ile birlikte tanimlanmali");
  if (pr === undefined || duk === undefined) return;
  if (duk.yuva !== 1) hatalar.push(`perakende: ekYapilar.dukkan.yuva 1 olmali (bulunan ${duk.yuva})`);

  const emilim = paket.param.pazar?.emilimSaat ?? {};
  const arz = paket.param.pazar?.arzSaat ?? {};
  const depolanabilirMi = (id: string): boolean => malTablosu.get(id)?.depolanabilir !== false;
  const [bandAlt, bandUst] = pr.fiyatBandiPpm;

  // V2: dükkân türü kimlikleri tekil ve mal kimlikleriyle kesişmez (listede üyelik `dogrulaKimlikKilidi`dedir).
  const turKimlikleri = new Set<string>();
  for (const t of pr.dukkanTurleri) {
    if (turKimlikleri.has(t.id)) hatalar.push(`perakende.dukkanTurleri: yinelenen kimlik: ${t.id}`);
    turKimlikleri.add(t.id);
    if (malTablosu.has(t.id)) hatalar.push(`perakende.dukkanTurleri: mal ile kesisiyor: ${t.id}`);
  }

  // V3 ve V8 (tür başına): mal kümeleri.
  const rafMallari = new Set<string>();
  for (const t of pr.dukkanTurleri) {
    const yol = `perakende.dukkanTurleri.${t.id}`;
    const goruldu = new Set<string>();
    for (const m of t.mallar) {
      if (goruldu.has(m)) hatalar.push(`${yol}.mallar: yinelenen mal: ${m}`);
      goruldu.add(m);
      rafMallari.add(m);
      if (!malTablosu.has(m)) {
        hatalar.push(`${yol}.mallar: bilinmeyen mal: ${m}`);
        continue;
      }
      if (!depolanabilirMi(m)) hatalar.push(`${yol}.mallar: depolanamaz mal: ${m}`);
      if (!((emilim[m] ?? 0) > 0 && (arz[m] ?? 0) > 0)) hatalar.push(`${yol}.mallar: pazar kaydi yok: ${m}`);
    }
    if (t.tamCesit > t.mallar.length) hatalar.push(`${yol}.tamCesit: mal sayisini (${t.mallar.length}) asamaz (bulunan ${t.tamCesit})`);
    if (t.olcekAraligi.length === 0) hatalar.push(`${yol}.olcekAraligi: bos olamaz`);
    if (new Set(t.olcekAraligi).size !== t.olcekAraligi.length) hatalar.push(`${yol}.olcekAraligi: yinelenen olcek`);
  }
  // V8: açık ölçekler tekil ve her açık ölçeği en az bir tür taşır.
  if (new Set(pr.acikOlcekler).size !== pr.acikOlcekler.length) hatalar.push("perakende.acikOlcekler: yinelenen olcek");
  for (const o of pr.acikOlcekler) {
    if (!pr.dukkanTurleri.some((t) => t.olcekAraligi.includes(o))) hatalar.push(`perakende.acikOlcekler: ${o} olcegini tasiyan dukkan turu yok`);
  }

  // V4: çıkmaz raf yok (talep > 0 ve bir grupta).
  const grupSayisi = (m: string): number => Object.values(pr.talep.gruplar).filter((g) => g.mallar.includes(m)).length;
  for (const m of [...rafMallari].sort()) {
    if (!((pr.talep.talep1000Saat[m] ?? 0) > 0) || grupSayisi(m) === 0) hatalar.push(`perakende.talep: raf malinin talebi yok: ${m}`);
  }

  // V5 (uyarı): market ⊇ bakkal, supermarket ⊇ market (kayıtlar varsa).
  const tur = new Map(pr.dukkanTurleri.map((t) => [t.id, new Set(t.mallar)]));
  for (const [ust, alt] of [["market", "bakkal"], ["supermarket", "market"]] as const) {
    const u = tur.get(ust);
    const a = tur.get(alt);
    if (u !== undefined && a !== undefined && [...a].some((m) => !u.has(m))) uyarilar.push(`perakende: mal listeleri ic ice degil: ${ust}`);
  }

  // V6: fiyat kademeleri ve kampanya parametreleri.
  if (bandAlt > bandUst) hatalar.push("perakende.fiyatBandiPpm: alt sinir ust siniri asamaz");
  const fk = pr.fiyatKademeleriPpm;
  if (fk.length < 3) hatalar.push(`perakende.fiyatKademeleriPpm: en az 3 kademe olmali (bulunan ${fk.length})`);
  fk.forEach((p, i) => {
    if (i > 0 && p <= (fk[i - 1] as number)) hatalar.push(`perakende.fiyatKademeleriPpm[${i}]: kesin artan olmali`);
    if (p < bandAlt || p > bandUst) hatalar.push(`perakende.fiyatKademeleriPpm[${i}]: fiyat bandi disinda (${bandAlt}-${bandUst})`);
  });
  if (pr.varsayilanFiyatKademesi >= fk.length) hatalar.push(`perakende.varsayilanFiyatKademesi: kademe sayisini (${fk.length}) asamaz`);
  if (pr.kampanyaKademesi !== undefined && pr.kampanyaKademesi !== 0) hatalar.push("perakende.kampanyaKademesi: 0 olmali (en dusuk kademe)");
  if (pr.kampanyaGunlukEnFazlaSaat !== undefined && pr.kampanyaGunlukEnFazlaSaat > 24) hatalar.push("perakende.kampanyaGunlukEnFazlaSaat: 0 ile 24 arasinda olmali");
  if (pr.kampanyaHaftalikEnFazlaGun !== undefined && pr.kampanyaHaftalikEnFazlaGun > 7) hatalar.push("perakende.kampanyaHaftalikEnFazlaGun: 0 ile 7 arasinda olmali");

  // V7: esnaf.
  if (pr.esnaf.tabanPayPpm >= 1_000_000) hatalar.push("perakende.esnaf.tabanPayPpm: 0 ile 999999 arasinda olmali");
  if (pr.esnaf.fiyatPpm < bandAlt || pr.esnaf.fiyatPpm > bandUst) hatalar.push(`perakende.esnaf.fiyatPpm: fiyat bandi disinda (${bandAlt}-${bandUst})`);

  // V9: talep.
  const tl = pr.talep;
  for (const m of Object.keys(tl.talep1000Saat).sort()) {
    if (!malTablosu.has(m)) hatalar.push(`perakende.talep.talep1000Saat: bilinmeyen mal: ${m}`);
    const n = grupSayisi(m);
    if (n !== 1) hatalar.push(`perakende.talep: mal tam bir grupta olmali: ${m} (${n} grup)`);
  }
  let enBuyukPencere = 0;
  for (const g of Object.keys(tl.gruplar).sort()) {
    const grup = tl.gruplar[g] as NonNullable<typeof tl.gruplar[string]>;
    const yol = `perakende.talep.gruplar.${g}`;
    for (const m of grup.mallar) if (!malTablosu.has(m)) hatalar.push(`${yol}.mallar: bilinmeyen mal: ${m}`);
    if (grup.takvimPpm.length !== 12) hatalar.push(`${yol}.takvimPpm: 12 deger olmali (bulunan ${grup.takvimPpm.length})`);
    else {
      const toplam = grup.takvimPpm.reduce((a, b) => a + b, 0);
      if (toplam !== 12_000_000) hatalar.push(`${yol}.takvimPpm: toplam tam 12000000 olmali (bulunan ${toplam})`);
    }
    if (grup.bayram !== undefined) {
      const b = grup.bayram;
      const sapma = b.oncesiGun * (b.oncesiPpm - 1_000_000) + b.sonrasiGun * (b.sonrasiPpm - 1_000_000);
      if (sapma !== 0) hatalar.push(`${yol}.bayram: toplam sabit degil (sapma ${sapma}; oncesiGun x (oncesiPpm - 1e6) + sonrasiGun x (sonrasiPpm - 1e6) = 0 olmali)`);
      enBuyukPencere = Math.max(enBuyukPencere, b.oncesiGun + b.sonrasiGun);
    }
  }
  tl.bayramGunleri.forEach((g, i) => {
    if (i === 0) return;
    const onceki = tl.bayramGunleri[i - 1] as number;
    if (g <= onceki) hatalar.push(`perakende.talep.bayramGunleri[${i}]: kesin artan olmali`);
    else if (g - onceki < enBuyukPencere) hatalar.push(`perakende.talep.bayramGunleri[${i}]: komsu bayram farki en az ${enBuyukPencere} gun olmali (bulunan ${g - onceki})`);
  });

  // V10: marka.
  if (pr.marka.hesapBasinaEnFazla > 3) hatalar.push("perakende.marka.hesapBasinaEnFazla: 1 ile 3 arasinda olmali");

  // V11: kilitsizlik taraması (A0-17).
  const kilitler: string[] = [];
  kilitAnahtarlari(pr, "", kilitler);
  kilitAnahtarlari(duk, "ekYapilar.dukkan", kilitler);
  for (const k of kilitler) hatalar.push(`perakende: kilit alani yasak: ${k}`);

  // V12: dukkan ek yapısının inşa malzemeleri içerikte ve depolanabilir.
  for (const m of Object.keys(duk.insaMaliyeti).sort()) {
    if (!malTablosu.has(m)) hatalar.push(`mulk.ekYapilar.dukkan.insaMaliyeti: bilinmeyen mal "${m}"`);
    else if (!depolanabilirMi(m)) hatalar.push(`mulk.ekYapilar.dukkan.insaMaliyeti: "${m}" depolanamaz mal`);
  }
}
