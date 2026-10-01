/**
 * `donusOzeti`: "Sen yokken" özetinin SAF işlevi (docs/arastirma/donus-deneyimi.md §5.2, en küçük hâl D1).
 *
 * Çekirdek durumunu okumaz: girdiler hazır değerlerdir (`anlik` = `oyuncuAnligi`, `capa`, `kayitlar`); çıktı yalnız o girdilerin
 * işlevidir. `Math.random` ve `Date` yoktur; `simdi` parametredir; varyant tohumludur (`fnv1a32`). Aynı girdi ⇒ aynı özet.
 * Metin yoktur: şablon anahtarı + değerler + tohum (`DONUS_SABLON`); metinler istemcide (D5).
 *
 * Net sonuç = `anlik − sonGorulen` (O(1)): `hazineFarki` birebir hazine farkıdır; `kalemler.satis + gider + diger = hazineFarki`
 * (diger artıktır). Maddeler özet aralığındaki kayıtlardan gelir: B2 biten işler (aynı türden çoğu toplanır), B3 gelenler.
 */
import { fnv1a32 } from "@bolge/cekirdek";
import { DONUS_SABLON } from "@bolge/protokol";
import type { DonusBandi, DonusMaddesi, DonusOzeti } from "@bolge/protokol";
import type { Capa, OzetKaydi, SonGorulen } from "../depo/tipler";

const SAAT_MS = 3_600_000;
const GUN_MS = 24 * SAAT_MS;
const PPM_TAM = 1_000_000;

/** Yokluk bant sınırları (sim ms, alt sınır dahil): K1 ≥ k1, K2 ≥ k2, ... K7 ≥ k7; < k1 ise K0 (özet yok). Öneridir, kalibre edilmemiştir (§2.2). */
export interface DonusEsikleri {
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
  k6: number;
  k7: number;
}

export const VARSAYILAN_DONUS_ESIKLERI: DonusEsikleri = {
  k1: SAAT_MS,
  k2: 6 * SAAT_MS,
  k3: 2 * GUN_MS,
  k4: 7 * GUN_MS,
  k5: 14 * GUN_MS,
  k6: 45 * GUN_MS,
  k7: 90 * GUN_MS,
};

/** En çok madde sayısı (ilk görünüm ≤ 8 satır; §2.2). */
const EN_COK_MADDE = 8;

export interface DonusGirdisi {
  oyuncu: string;
  /** Özetin üretildiği an (sim ms); `anlik.t` ile aynı olmalıdır. */
  simdi: number;
  anlik: SonGorulen;
  capa: Capa | null;
  /** Oyuncunun özet kayıtları (herhangi sırada; süzme `t`'ye göredir). */
  kayitlar: readonly OzetKaydi[];
  esikler?: DonusEsikleri;
}

export function donusBandi(yokluk: number, e: DonusEsikleri = VARSAYILAN_DONUS_ESIKLERI): DonusBandi | null {
  if (yokluk < e.k1) return null;
  if (yokluk < e.k2) return "K1";
  if (yokluk < e.k3) return "K2";
  if (yokluk < e.k4) return "K3";
  if (yokluk < e.k5) return "K4";
  if (yokluk < e.k6) return "K5";
  if (yokluk < e.k7) return "K6";
  return "K7";
}

/** Çapa yoksa (ilk giriş) ya da yokluk < 1 sa (K0) için null: ekran gösterilmez. */
export function donusOzeti(g: DonusGirdisi): DonusOzeti | null {
  const sg = g.capa?.sonGorulen;
  if (!sg) return null;
  const baslangicT = Math.max(sg.t, g.capa?.ozetOkunduT ?? Number.NEGATIVE_INFINITY);
  const bant = donusBandi(g.simdi - baslangicT, g.esikler);
  if (bant === null) return null;

  // --- Net sonuç: kümülatif sayaç farkları (O(1)) ---
  const hazineFarki = g.anlik.hazine - sg.hazine;
  // Satış = NPC ihracat farkı + dükkân (yerel NPC) geliri farkı (G7; çapada alan yoksa 0). `diger` hazine farkından türetildiği için toplam eşitliği korunur.
  const satis = g.anlik.defter.brutIhracat - sg.defter.brutIhracat + ((g.anlik.dukkanGeliri ?? 0) - (sg.dukkanGeliri ?? 0));
  const gider = -(
    g.anlik.defter.brutIthalat - sg.defter.brutIthalat +
    (g.anlik.defter.komisyon - sg.defter.komisyon) +
    (g.anlik.defter.prim - sg.defter.prim)
  );
  const diger = hazineFarki - satis - gider;
  const uretim: { mal: string; miktar: number }[] = [];
  for (const [mal, v] of Object.entries(g.anlik.uretim)) {
    const miktar = v - (sg.uretim[mal] ?? 0);
    if (miktar > 0) uretim.push({ mal, miktar });
  }
  uretim.sort((a, b) => b.miktar - a.miktar || (a.mal < b.mal ? -1 : a.mal > b.mal ? 1 : 0));

  // --- Maddeler: aralıktaki özet kayıtları (t'ye göre; yazılma zamanı değil) ---
  const aralikta = g.kayitlar
    .filter((k) => k.t > baslangicT && k.t <= g.simdi)
    .sort((a, b) => a.t - b.t || (a.tur < b.tur ? -1 : a.tur > b.tur ? 1 : 0) || a.sira - b.sira);
  const maddeler: DonusMaddesi[] = [];

  // B2: biten işler: aynı türden çoğunu topla ("3 yapı bitti"); ilk iki yer.
  const bitenler = new Map<string, OzetKaydi[]>();
  for (const k of aralikta) {
    if (k.tur !== "insaat_bitti") continue;
    const tur = String(k.degerler[0] ?? "");
    let l = bitenler.get(tur);
    if (!l) bitenler.set(tur, (l = []));
    l.push(k);
  }
  for (const [tur, l] of [...bitenler.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    const ilk = l[0] as OzetKaydi;
    const git = typeof ilk.degerler[1] === "number" ? { bolge: ilk.degerler[1] } : undefined;
    if (l.length === 1) {
      maddeler.push({
        blok: "B2",
        sablon: DONUS_SABLON.bittiInsaat,
        tohum: tohum(g.oyuncu, ilk, DONUS_SABLON.bittiInsaat),
        degerler: [tur, ilk.ilce],
        ...(git ? { git } : {}),
        onem: 600_000,
      });
    } else {
      const yerler = [...new Set(l.map((k) => k.ilce))].slice(0, 2);
      maddeler.push({
        blok: "B2",
        sablon: DONUS_SABLON.bittiInsaatCok,
        tohum: tohum(g.oyuncu, ilk, DONUS_SABLON.bittiInsaatCok),
        degerler: [l.length, tur, ...yerler],
        ...(git ? { git } : {}),
        onem: Math.min(PPM_TAM, 600_000 + 50_000 * l.length),
      });
    }
  }
  // B3: gelenler (yer tutucu: sipariş kayıtları şimdilik üretilmez; üretilince aynen taşınır).
  for (const k of aralikta) {
    if (k.tur !== "siparis_geldi") continue;
    maddeler.push({ blok: "B3", sablon: DONUS_SABLON.gelenSiparis, tohum: tohum(g.oyuncu, k, DONUS_SABLON.gelenSiparis), degerler: [...k.degerler], onem: 700_000 });
  }
  // Önem azalan, eşitlikte blok, sonra tohum: deterministik sıra; ilk görünüm bütçesi.
  maddeler.sort((a, b) => b.onem - a.onem || (a.blok < b.blok ? -1 : a.blok > b.blok ? 1 : 0) || a.tohum - b.tohum);

  return {
    surum: 1,
    bant,
    aralik: { baslangicT, bitisT: g.simdi },
    net: { hazineFarki, kalemler: { satis, gider, diger }, uretim: uretim.slice(0, 3) },
    maddeler: maddeler.slice(0, EN_COK_MADDE),
    oneri: null,
  };
}

/** Aynı olgu (oyuncu, kayıt anahtarı, şablon) aynı varyant: `hash32`. */
function tohum(oyuncu: string, k: OzetKaydi, sablon: string): number {
  return fnv1a32(`${oyuncu}|${k.tur}|${k.t}|${k.sira}|${sablon}`);
}
