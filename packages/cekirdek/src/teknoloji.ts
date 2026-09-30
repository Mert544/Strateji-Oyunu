/**
 * Teknoloji alt sistemi (spesifikasyon §7): sığ, veri güdümlü ağaç.
 *
 * - Bir teknoloji yüzde artış vermez; yalnızca yöntem, tesis türü, birlik veya karar AÇAR.
 *   Yöntem/tesis/birlik açıklığı tanımlardaki `gerekliTeknoloji` alanıyla denetlenir
 *   (yontemAcikMi, tesisTuruAcikMi, birlikAcikMi).
 * - `arastir`: ön koşullar açık, oyuncuda yok, devam eden araştırma yok, maliyet hazineden düşer.
 *   Bitişte `arastirma_bitti` olayı planlanır; aynı anda yalnızca tek araştırma olabilir.
 */
import { hazineEkle, oyuncuBul } from "./stok";
import { GUN } from "./tipler";
import type { Baglam, Dunya, Komut, KomutSonucu, OyuncuDurumu, OyuncuId } from "./tipler";

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

/** Sayıyı artan sıralı ve tekrarsız olarak diziye ekler (yerinde). */
function siraliEkleSayi(dizi: number[], deger: number): void {
  let konum = dizi.findIndex((x) => x >= deger);
  if (konum < 0) konum = dizi.length;
  if (dizi[konum] === deger) return;
  dizi.splice(konum, 0, deger);
}

/** Dizeyi sıralı ve tekrarsız olarak diziye ekler (yerinde; JS dize sıralaması). */
function siraliEkleDize(dizi: string[], deger: string): void {
  let konum = dizi.findIndex((x) => x >= deger);
  if (konum < 0) konum = dizi.length;
  if (dizi[konum] === deger) return;
  dizi.splice(konum, 0, deger);
}

/** Oyuncu, kimliği verilen teknolojiye sahip mi? Bilinmeyen teknoloji kimliği için false. */
function teknolojiVarMi(ctx: Baglam, o: OyuncuDurumu, teknolojiId: string): boolean {
  const ti = ctx.ic.teknolojiIndeks[teknolojiId];
  return ti !== undefined && o.teknolojiler.includes(ti);
}

/**
 * Komut: arastir. Maliyet hazineden anında düşer; `sureGun` sonra teknoloji açılır.
 * Tüm denetimler geçmeden durum değişmez (hazine en son düşülür).
 */
export function teknolojiKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: Komut): KomutSonucu {
  if (k.tur !== "arastir") return hata(`teknoloji alt sistemi bu komutu bilmiyor: ${k.tur}`);
  const o = oyuncuBul(d, oyuncu);
  if (!o) return hata(`bilinmeyen oyuncu: ${oyuncu}`);
  const ti = ctx.ic.teknolojiIndeks[k.teknoloji];
  const tek = ti === undefined ? undefined : ctx.ic.teknolojiler[ti];
  if (ti === undefined || !tek) return hata(`bilinmeyen teknoloji: ${k.teknoloji}`);
  if (o.teknolojiler.includes(ti)) return hata(`teknoloji zaten acik: ${k.teknoloji}`);
  if (o.arastirma !== null) return hata("devam eden bir arastirma var");
  for (const onKosul of tek.onKosullar) {
    if (!teknolojiVarMi(ctx, o, onKosul)) return hata(`on kosul eksik: ${onKosul}`);
  }
  if (!hazineEkle(d, oyuncu, -tek.maliyet)) return hata("hazine yetersiz");
  const bitis = d.zaman + tek.sureGun * GUN;
  o.arastirma = { teknoloji: ti, bitis };
  ctx.planla(d, bitis, { tur: "arastirma_bitti", oyuncu });
  return { tamam: true };
}

/**
 * Olay: arastirma_bitti. Teknolojiyi açar (teknolojiler artan sıralı), açtığı kararları
 * oyuncu.kararlar'a ekler (sıralı, tekrarsız), devam eden araştırmayı temizler.
 * Araştırma yoksa veya henüz bitmediyse (eskimiş olay) yok sayılır.
 */
export function arastirmaBitti(d: Dunya, ctx: Baglam, oyuncu: OyuncuId): void {
  const o = oyuncuBul(d, oyuncu);
  if (!o || o.arastirma === null || o.arastirma.bitis > d.zaman) return;
  const ti = o.arastirma.teknoloji;
  const tek = ctx.ic.teknolojiler[ti];
  siraliEkleSayi(o.teknolojiler, ti);
  for (const karar of tek?.acar.kararlar ?? []) siraliEkleDize(o.kararlar, karar);
  o.arastirma = null;
  ctx.kirlet(d);
}

/** Gerekli teknoloji kimliği yoksa true; oyuncu yoksa (null) false; aksi halde oyuncu teknolojiye sahip mi. */
function teknolojiGerekliyseSahipMi(
  d: Dunya,
  ctx: Baglam,
  oyuncu: OyuncuId | null,
  gerekli: string | undefined,
): boolean {
  if (gerekli === undefined) return true;
  if (oyuncu === null) return false;
  const o = oyuncuBul(d, oyuncu);
  return o !== undefined && teknolojiVarMi(ctx, o, gerekli);
}

/** Oyuncu için yöntem açık mı (gerekliTeknoloji yoksa herkese açık; oyuncu null ise yalnızca koşulsuzlar). */
export function yontemAcikMi(d: Dunya, ctx: Baglam, oyuncu: OyuncuId | null, yontem: number): boolean {
  const y = ctx.ic.yontemler[yontem];
  if (!y) return false;
  return teknolojiGerekliyseSahipMi(d, ctx, oyuncu, y.gerekliTeknoloji);
}

export function tesisTuruAcikMi(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, tur: number): boolean {
  const t = ctx.ic.tesisTurleri[tur];
  if (!t) return false;
  return teknolojiGerekliyseSahipMi(d, ctx, oyuncu, t.gerekliTeknoloji);
}

export function birlikAcikMi(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, birlik: number): boolean {
  const b = ctx.ic.birlikler[birlik];
  if (!b) return false;
  return teknolojiGerekliyseSahipMi(d, ctx, oyuncu, b.gerekliTeknoloji);
}
