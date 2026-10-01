/**
 * Node-only ek semantik doğrulayıcı (docs/arastirma/p4-p5-sartname.md §4.5 Katman 2; `dogrulaKimlikKilidi` kalıbı): `dogrulaVeriPaketi`den SONRA yükleyiciler çağırır;
 * tarayıcı/istemci paketine ve çekirdek derlemesine GİRMEZ (`veri/src/saf.ts` içe aktarmaz). Hata kanalı paketi reddeder; uyarı kanalı yazdırılır.
 *
 * Bu dilimde (G6-1): V13 çıkmaz mal (yan ürün kuralı a, genel kural b), V14 `mulk.sebeke`, V15 mülk kipi yöntem oran bandı (uyarı), V17 `mulk.yontemGecersizKilma`,
 * Y8 (tür başına yöntem sayısı uyarısı). V16 (`mulkKipi` varsayılan/teknoloji) `dogrulaIcerik`tedir (içerik tek başına doğrulanır). `perakende` kuralları (V1-V12) G7'dedir.
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

  // V13: çıkmaz mal (UA1). Tüketici türleri: Ü yöntem girdisi, Y yapı maliyeti (tesis türü ve ek yapı), P pazar emilimi > 0. (H raf G7'de; K ve N kodda var olunca sayılır.)
  const yontemGirdisi = new Set<string>();
  for (const y of ic.yontemler) for (const m of Object.keys(y.girdiler)) yontemGirdisi.add(m);
  const yapiMaliyeti = new Set<string>();
  for (const t of ic.tesisTurleri) for (const m of Object.keys(t.insaMaliyeti)) yapiMaliyeti.add(m);
  for (const e of Object.values(mulk?.ekYapilar ?? {})) for (const m of Object.keys(e.insaMaliyeti)) yapiMaliyeti.add(m);
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
    if (yapiMaliyeti.has(m.id)) n++;
    if ((emilim[m.id] ?? 0) > 0) n++;
    if (n < 2) cikmazHedefi.push(`icerik: cikmaz mal: ${m.id} (tuketici turu ${n} < 2)`);
  }

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
