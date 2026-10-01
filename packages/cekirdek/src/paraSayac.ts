/**
 * Para sayaçları (para güvenliği, docs/06 §15.7): kayıpsız birikimli tamsayı sayaçlar ve musluk/lavabo kaydı.
 *
 * Her tembel (saatlik oranlı) akış `ParaSayaci { n, a }` ile KESİN toplanır: değer = n + a / SAAT. Komut kaynaklı (anlık) kalemler `n`'ye
 * eklenir. Bu modül yalnız `tipler`e ve `sabit`e bağlıdır (stok.ts de kullanır; döngü yok). Mülk kipinde `mulk.kasa` parametresiyle kurulmuş
 * dünyada (`Dunya.mulk.para`) çalışır; aksi halde hiçbir şey yazmaz.
 */
import { tabanBol } from "./sabit";
import { LAVABO_KALEMLERI, MUSLUK_KALEMLERI, SAAT } from "./tipler";
import type { Dunya, LavaboKalemi, Mili, MuslukKalemi, ParaDurumu, ParaSayaci } from "./tipler";

/** Hazineye komutla giren/çıkan paranın kalemi (`hazineEkle`): negatif = lavabo, pozitif = musluk ("iade", "odul") ya da kasa transferi ("kamuOdeme"). */
export type HazineKalemi = "arsa" | "harcama" | "arastirma" | "iade" | "odul" | "kamuOdeme" | "diger";

export function sayacSifir(): ParaSayaci {
  return { n: 0, a: 0 };
}

/** oran (mili-para/saat) × dt (ms) + a'nın SAAT'e bölümü: { n: floor, a: kalan }. Taşmaya karşı BigInt yedekli. */
export function oranBirikimi(oran: number, dt: number, a: number): { delta: number; artik: number } {
  const p = oran * dt;
  const x = p + a;
  if (Number.isSafeInteger(p) && Number.isSafeInteger(x)) {
    const delta = tabanBol(x, SAAT);
    return { delta, artik: x - delta * SAAT };
  }
  const xb = BigInt(oran) * BigInt(dt) + BigInt(a);
  const sb = BigInt(SAAT);
  let q = xb / sb;
  if (xb % sb !== 0n && xb < 0n) q -= 1n;
  return { delta: Number(q), artik: Number(xb - q * sb) };
}

/** Sayaca `oran × dt` ekler (kesin); eklenen TAM birim miktarını (n artışı) döndürür. oran >= 0 olmalıdır. */
export function sayacOranEkle(s: ParaSayaci, oran: number, dt: number): Mili {
  if (oran === 0 || dt <= 0) return 0;
  const b = oranBirikimi(oran, dt, s.a);
  s.n += b.delta;
  s.a = b.artik;
  return b.delta;
}

/** Sayaca anlık tamsayı miktar ekler. */
export function sayacAnlikEkle(s: ParaSayaci, miktar: Mili): void {
  s.n += miktar;
}

/** Sayacın SAAT ile ölçeklenmiş kesin değeri (n × SAAT + a); korunum testleri için. */
export function sayacOlcekli(s: ParaSayaci): bigint {
  return BigInt(s.n) * BigInt(SAAT) + BigInt(s.a);
}

/** Yeni para durumu: tüm musluk ve lavabo kalemleri sıfır, kasa yok. */
export function paraDurumuKur(): ParaDurumu {
  const musluk = {} as Record<MuslukKalemi, ParaSayaci>;
  for (const k of MUSLUK_KALEMLERI) musluk[k] = sayacSifir();
  const lavabo = {} as Record<LavaboKalemi, ParaSayaci>;
  for (const k of LAVABO_KALEMLERI) lavabo[k] = sayacSifir();
  return { surum: 1, musluk, lavabo, kasalar: [] };
}

/** Para defteri açık mı (mülk kipi + `mulk.kasa`)? */
export function paraAcikMi(d: Dunya): boolean {
  return d.mulk?.para !== undefined;
}

/** Hibe (oyuncu başlangıç hazinesi) musluğu. */
export function hibeKaydet(d: Dunya, miktar: Mili): void {
  const p = d.mulk?.para;
  if (p !== undefined && miktar > 0) sayacAnlikEkle(p.musluk.hibe, miktar);
}

/** Hazine kelepçesinde (0'ın altına inemeyen) silinen borç: nominal gider ödenmedi; musluk kalemi olarak sayılır. */
export function borcSilmeKaydet(d: Dunya, miktar: Mili): void {
  const p = d.mulk?.para;
  if (p !== undefined && miktar > 0) sayacAnlikEkle(p.musluk.borcSilme, miktar);
}

/** Komutla hazineye giren/çıkan parayı ilgili musluk/lavabo kalemine yazar (`hazineEkle` çağırır). */
export function paraKaydet(d: Dunya, delta: Mili, kalem: HazineKalemi): void {
  const p = d.mulk?.para;
  if (p === undefined || delta === 0) return;
  if (delta > 0) {
    if (kalem === "kamuOdeme") return; // kasadan oyuncuya transfer: musluk değil
    sayacAnlikEkle(kalem === "odul" ? p.musluk.odul : kalem === "iade" ? p.musluk.iade : p.musluk.diger, delta);
    return;
  }
  const x = -delta;
  sayacAnlikEkle(kalem === "arsa" ? p.lavabo.arsa : kalem === "arastirma" ? p.lavabo.arastirma : p.lavabo.harcama, x);
}
