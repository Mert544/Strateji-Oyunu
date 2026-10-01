/**
 * Eşik budaması kanıt düzeneği (docs/06 §14.1). Budama yalnız `kuyruk`u (ve yığın düzenini) değiştirmelidir; bunu
 * göstermek için bir koşu boyunca sabit kontrol noktalarında şu dört değer kaydedilir:
 *
 * - `durum`: kuyruk ve `sayac.olay` HARİÇ dünyanın kanonik özeti (kuyruk = [], sayac.olay = 0 ile),
 * - `etkinKuyruk`: kuyruktaki ETKİN olayların (eskimiş eşikler hariç) `sira`ya göre sıralı kanonik özeti,
 * - `islenen`: o ana kadar işlenen etkin olay dizisinin (t, oncelik, sira, tür; eskimiş eşikler hariç) zincirlenmiş özeti,
 * - `olaySayaci`: `sayac.olay` (budama olay planlamayı değiştirmediğinden o da aynı kalmalıdır).
 *
 * Kayıt, `Simulasyon.prototype` üzerindeki `olustur`, `calistirKadar` ve (özel) `olayIsle` sarmalanarak yapılır; senaryo
 * yardımcıları değiştirilmeden (S2 kodunda da) aynen çalışır. Yalnız `Simulasyon.olustur` ile kurulan ana simülasyon
 * kaydedilir (botların `klonla` ile kurduğu ileri bakış kopyaları değil). Kontrol noktası `calistirKadar`'ı bölerek alınır:
 * `calistirKadar(a); calistirKadar(b)` ile `calistirKadar(b)` aynı durumu verir (her olay işlenmeden önce zaman olay anına
 * kurulur). Bu dosya yalnız çekirdek ve bot API'sine bağlıdır; S2 commit'inin (b913b03) ağacına kopyalanıp referans
 * (`fikstur-kanit/esik-budama-referans.json`) oradan üretilmiştir.
 */
import { miniVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { botOlustur, kos } from "../../botlar/src";
import type { ArketipAdi } from "../../botlar/src";
import { Simulasyon } from "../src/motor";
import { fnv1a64, kanonikSerilestir } from "../src/ozet";
import { GUN } from "../src/tipler";
import type { DerlenmisIcerik, Dunya, Ms, Olay } from "../src/tipler";
import { malIzdusumu } from "./mal-izdusumu";
import { b2SentetikVeri, b2Veri, pazarSenaryoOzetleri } from "./regresyon-pazar-senaryo";
import { b1Veri, senaryoOzetleri } from "./regresyon-senaryo";
import { senaryoKos } from "./serilestir-yardimci";

export interface KontrolNoktasi {
  t: Ms;
  durum: string;
  etkinKuyruk: string;
  islenen: string;
  olaySayaci: number;
}

export interface KanitKaydi {
  noktalar: KontrolNoktasi[];
  /** Koşu sonundaki tam durum özeti (kuyruk dahil). */
  sonOzet: string;
  /** Koşu sonundaki kuyruk uzunluğu ve içindeki eskimiş eşik sayısı. */
  kuyruk: number;
  eskimis: number;
  /** Bir çözüm olayından hemen sonra kuyrukta kalan en çok eskimiş eşik (budama açıkken 0 olmalı). */
  cozumSonrasiEnCokEskimis: number;
  /** Ana simülasyonun işlediği eskimiş eşik sayısı (budama açıkken yalnız çözümler arasında eskiyenler). */
  islenenEskimis: number;
}

function eskimisMi(d: Dunya, o: Olay): boolean {
  const v = o.veri;
  if (v.tur !== "esik") return false;
  const s = d.bolgeler[v.bolge]?.stoklar[v.mal];
  return !(s !== undefined && s.surum === v.surum);
}

/**
 * Referans (S2) 14 malla üretilmiştir. Güncel içerik P3'te 24 mala çıktı (docs/06 §14.3, §15.8): mal indeksli diziler uzadığı için tam özet
 * değişir; davranış eşitliği "ilk 14 malın izdüşümü" ile kanıtlanır (`mal-izdusumu.ts`; yeni malların etkisiz olduğunu da denetler).
 * İçerik 14 malsa (dondurulmuş fikstürler) izdüşüm no-op'tur.
 */
export const REFERANS_MAL_SAYISI = 14;

function noktaKaydet(d0: Dunya, ic: DerlenmisIcerik, islenen: string): Omit<KontrolNoktasi, "t"> {
  const d = malIzdusumu(d0, ic, Math.min(REFERANS_MAL_SAYISI, ic.mallar.length));
  const durum = fnv1a64(kanonikSerilestir({ ...d, kuyruk: [], sayac: { ...d.sayac, olay: 0 } }));
  const etkin = d.kuyruk.filter((o) => !eskimisMi(d, o)).sort((a, b) => a.sira - b.sira);
  return { durum, etkinKuyruk: fnv1a64(kanonikSerilestir(etkin)), islenen, olaySayaci: d.sayac.olay };
}

interface Kayit {
  noktalar: Ms[];
  sonraki: number;
  zincir: string;
  bekleyen: string[];
  sonuc: KontrolNoktasi[];
  cozumSonrasiEnCokEskimis: number;
  islenenEskimis: number;
  sim: Simulasyon | null;
}

type Motor = {
  calistirKadar(t: Ms): void;
  olayIsle(o: Olay): void;
  dunya: Dunya;
  ic: DerlenmisIcerik;
};

/**
 * `calistir`ı kayıt altında koşar: ilk `Simulasyon.olustur` ana simülasyon olur; `noktalar` (artan) anlarında kontrol
 * noktası alınır. Koşu sonunda kancalar kaldırılır.
 */
export function kanitKaydi(noktalar: readonly Ms[], calistir: () => void): KanitKaydi {
  const proto = Simulasyon.prototype as unknown as Motor;
  const asilCalistir = proto.calistirKadar;
  const asilIsle = proto.olayIsle;
  const asilOlustur = Simulasyon.olustur.bind(Simulasyon);
  const k: Kayit = { noktalar: [...noktalar], sonraki: 0, zincir: "", bekleyen: [], sonuc: [], cozumSonrasiEnCokEskimis: 0, islenenEskimis: 0, sim: null };
  const zincirle = (): string => {
    k.zincir = fnv1a64(`${k.zincir}|${k.bekleyen.join(";")}`);
    k.bekleyen = [];
    return k.zincir;
  };
  (Simulasyon as unknown as { olustur: typeof Simulasyon.olustur }).olustur = (veri, tohum) => {
    const s = asilOlustur(veri, tohum);
    if (k.sim === null) k.sim = s;
    return s;
  };
  proto.calistirKadar = function (this: Motor, t: Ms): void {
    if ((this as unknown) !== k.sim) return asilCalistir.call(this, t);
    while (k.sonraki < k.noktalar.length && (k.noktalar[k.sonraki] as Ms) <= t) {
      const n = k.noktalar[k.sonraki++] as Ms;
      if (n < this.dunya.zaman) continue;
      asilCalistir.call(this, n);
      k.sonuc.push({ t: n, ...noktaKaydet(this.dunya, this.ic, zincirle()) });
    }
    asilCalistir.call(this, t);
  };
  proto.olayIsle = function (this: Motor, o: Olay): void {
    if ((this as unknown) !== k.sim) return asilIsle.call(this, o);
    if (eskimisMi(this.dunya, o)) k.islenenEskimis++;
    else k.bekleyen.push(`${o.t},${o.oncelik},${o.sira},${o.veri.tur}`);
    asilIsle.call(this, o);
    if (o.veri.tur === "cozum") {
      const d = this.dunya;
      let n = 0;
      for (const x of d.kuyruk) if (eskimisMi(d, x)) n++;
      if (n > k.cozumSonrasiEnCokEskimis) k.cozumSonrasiEnCokEskimis = n;
    }
  };
  try {
    calistir();
  } finally {
    proto.calistirKadar = asilCalistir;
    proto.olayIsle = asilIsle;
    (Simulasyon as unknown as { olustur: typeof Simulasyon.olustur }).olustur = asilOlustur;
  }
  const d = (k.sim as Simulasyon | null)?.dunya;
  if (!d) throw new Error("kanitKaydi: ana simulasyon kurulmadi");
  let eskimis = 0;
  for (const x of d.kuyruk) if (eskimisMi(d, x)) eskimis++;
  return {
    noktalar: k.sonuc,
    sonOzet: (k.sim as Simulasyon).durumOzeti(),
    kuyruk: d.kuyruk.length,
    eskimis,
    cozumSonrasiEnCokEskimis: k.cozumSonrasiEnCokEskimis,
    islenenEskimis: k.islenenEskimis,
  };
}

/** [0, son] aralığında eşit aralıklı `adet` kontrol noktası (son dahil). */
export function esitNoktalar(son: Ms, adet: number): Ms[] {
  return Array.from({ length: adet }, (_, i) => Math.floor((son * (i + 1)) / adet));
}

const DORT: ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist"];

/** botlar/test/pazar-regresyon.test.ts koşusunun aynısı (B3 öncesi veri, sentetik-50, 4 bot). */
function botKosusu(tohum: number, gun: number): void {
  const veri = b2SentetikVeri();
  const devletler: Record<string, string[]> = {};
  for (const b of veri.harita.bolgeler) (devletler[b.devlet] ??= []).push(b.id);
  const dIds = Object.keys(devletler).slice(0, 4);
  const oyuncular = dIds.map((dv, i) => ({ id: `o${i}`, bolgeler: devletler[dv] as string[], bot: botOlustur(DORT[i] as ArketipAdi, `o${i}`, tohum), katilmaMs: 0 }));
  kos({ veri, tohum, oyuncular, sureMs: gun * GUN });
}

export interface KanitSenaryosu {
  ad: string;
  /** Son kontrol noktası (koşunun son anı). */
  son: Ms;
  calistir: () => void;
}

const SAAT6 = 6 * 3_600_000;

/** Kanıt senaryoları: tüm altın fikstürler (sanayi, pazar, bot kalkanları) + güncel içerikle iki koşu. */
export function kanitSenaryolari(): KanitSenaryosu[] {
  const veriKopya = (v: () => VeriPaketi) => v;
  return [
    { ad: "sanayi-kalkani-t5", son: 12 * GUN + SAAT6, calistir: () => void senaryoOzetleri(b1Veri(), 5) },
    { ad: "sanayi-kalkani-t6", son: 12 * GUN + SAAT6, calistir: () => void senaryoOzetleri(b1Veri(), 6) },
    { ad: "pazar-kalkani-zengin-t5", son: 16 * GUN + SAAT6, calistir: () => void pazarSenaryoOzetleri(b2Veri(), 5) },
    { ad: "pazar-kalkani-zengin-t6", son: 16 * GUN + SAAT6, calistir: () => void pazarSenaryoOzetleri(b2Veri(), 6) },
    { ad: "pazar-kalkani-yoksul-t5", son: 16 * GUN + SAAT6, calistir: () => void pazarSenaryoOzetleri(b2Veri(false), 5, false) },
    { ad: "pazar-kalkani-yoksul-t6", son: 16 * GUN + SAAT6, calistir: () => void pazarSenaryoOzetleri(b2Veri(false), 6, false) },
    { ad: "bot-kalkani-t1", son: 6 * GUN, calistir: () => botKosusu(1, 6) },
    { ad: "bot-kalkani-t2", son: 6 * GUN, calistir: () => botKosusu(2, 6) },
    {
      ad: "guncel-sentetik-4bot-bulanik-t1",
      son: 4 * GUN,
      calistir: () => void senaryoKos({ veri: veriKopya(varsayilanVeriyiYukle)(), tohum: 1, sureMs: 4 * GUN }),
    },
    {
      ad: "guncel-mini-4bot-bulanik-t3",
      son: 6 * GUN,
      calistir: () => void senaryoKos({ veri: miniVeriyiYukle(), tohum: 3, sureMs: 6 * GUN }),
    },
  ];
}

/** Senaryo başına kontrol noktası sayısı. */
export const NOKTA_SAYISI = 12;
