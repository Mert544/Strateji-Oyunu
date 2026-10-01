/**
 * Ödül (para güvenliği, docs/06 §15.7): `sistem_odul {oyuncu, kavram}` sistem komutu.
 *
 * Komut TUTAR TAŞIMAZ. Para, mal, tavan ve "kavram başına bir kez" kuralı çekirdekteki sürümlü ödül tablosundan (`param.odul`) okunur; tablo kural
 * sürümüne girer. Oyuncu başına alınmış kavramlar `OyuncuDurumu.alinanOdul`'da (kimliğe göre sıralı; yalnız kullanılınca yazılır) tutulur.
 * Reddedilir ve hiçbir şeyi değiştirmez: tablo yok, bilinmeyen kavram, bilinmeyen oyuncu, ikinci alım, tavan aşımı, malı alacak yer yok.
 *
 * Tavan: oyuncu başına alınmış kavramların DEĞERİ (para + mal × `tabanFiyat`) toplamı ≤ `tavanMili` (₺8.000). Mal oyuncunun ilk işletme düğümünün
 * (mülk kipi) ya da ilk bölgesinin (bölge kipi) stoğuna girer. Para `hazineEkle(..., "odul")` ile girer ve (mülk kipi) para defterinde `musluk.odul`
 * kalemine yazılır. Yalnız kozmetik ya da bilgi veren kavramlar çekirdeğe GİRMEZ (tablo bunları reddeder; profil tablosunda tutulur).
 */
import { carpBol } from "./sabit";
import { hazineEkle, oyuncuBul, stokEkle } from "./stok";
import { MILI } from "./tipler";
import type { Baglam, DerlenmisIcerik, Dunya, KomutSonucu, Mili, OyuncuDurumu } from "./tipler";

const hata = (mesaj: string): KomutSonucu => ({ tamam: false, hata: mesaj });

/** Kavramın değeri (mili-para): para + Σ mal × tabanFiyat. Tabloda yoksa tanımsız. */
export function odulDegeri(ic: DerlenmisIcerik, kavram: string): Mili | undefined {
  const t = ic.param.odul;
  if (t === undefined || !Object.prototype.hasOwnProperty.call(t.kavramlar, kavram)) return undefined;
  const k = t.kavramlar[kavram] as NonNullable<typeof t.kavramlar[string]>;
  let v = k.para ?? 0;
  for (const mid of Object.keys(k.mal ?? {}).sort()) {
    const mi = ic.malIndeks[mid];
    if (mi === undefined) continue;
    v += carpBol((k.mal as Record<string, number>)[mid] as number, (ic.mallar[mi] as { tabanFiyat: number }).tabanFiyat, MILI);
  }
  return v;
}

/** Oyuncunun alınmış ödüllerinin toplam değeri (mevcut tabloya göre). */
export function alinanOdulDegeri(ic: DerlenmisIcerik, o: OyuncuDurumu): Mili {
  let t = 0;
  for (const k of o.alinanOdul ?? []) t += odulDegeri(ic, k) ?? 0;
  return t;
}

/** Ödül malının gireceği bölge indeksi: mülk kipinde oyuncunun ilk işletme düğümü, bölge kipinde ilk bölgesi; yoksa -1. */
function odulBolgesi(d: Dunya, oyuncu: string): number {
  if (d.mulk !== undefined) {
    for (const e of d.mulk.isletmeler) if (e.oyuncu === oyuncu) return e.bolgeIndeksi;
    return -1;
  }
  return d.bolgeler.findIndex((b) => b.sahip === oyuncu);
}

/** `sistem_odul` işleyicisi (yalnız sistem yolundan çağrılır). */
export function odulVer(d: Dunya, ctx: Baglam, oyuncu: unknown, kavram: unknown): KomutSonucu {
  const ic = ctx.ic;
  const t = ic.param.odul;
  if (t === undefined) return hata("odul tablosu yok");
  if (typeof oyuncu !== "string" || typeof kavram !== "string") return hata("gecersiz odul komutu");
  const deger = odulDegeri(ic, kavram);
  if (deger === undefined) return hata(`bilinmeyen odul kavrami: ${kavram}`);
  const o = oyuncuBul(d, oyuncu);
  if (o === undefined) return hata(`bilinmeyen oyuncu: ${oyuncu}`);
  if (o.alinanOdul?.includes(kavram) === true) return hata(`odul zaten alinmis: ${kavram}`);
  const onceki = alinanOdulDegeri(ic, o);
  if (onceki + deger > t.tavanMili) return hata(`odul tavani asilir: ${onceki + deger} > ${t.tavanMili}`);
  const k = t.kavramlar[kavram] as NonNullable<typeof t.kavramlar[string]>;
  const mallar = Object.keys(k.mal ?? {}).sort();
  let bolge = -1;
  if (mallar.length > 0) {
    bolge = odulBolgesi(d, oyuncu);
    if (bolge < 0) return hata(`odul malini alacak isletme/bolge yok: ${oyuncu}`);
  }
  // Değişiklikler (artık başarısız olamaz)
  if ((k.para ?? 0) > 0 && !hazineEkle(d, oyuncu, k.para as number, "odul")) return hata("odul odenemedi");
  for (const mid of mallar) stokEkle(d, ctx, bolge, ic.malIndeks[mid] as number, (k.mal as Record<string, number>)[mid] as number);
  const l = (o.alinanOdul ??= []);
  l.push(kavram);
  l.sort();
  return { tamam: true };
}
