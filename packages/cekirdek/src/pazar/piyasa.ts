/**
 * Dünya pazarı (saatlik tık, adım 1-2): ticaret emirlerinin gerçekleşmesi ve fiyat (NPC piyasa yapıcı, docs/08 §5.3 P2).
 *
 * Gerçekleşen ihracat toplamı <= emilimSaat, ithalat toplamı <= arzSaat; aşılırsa emirler istenen oranla
 * orantılı (tamsayı, kalan birimler sıradaki ilk emirlere) kısılır. Sıra: oyuncu kimliği, bölge indeksi,
 * emir sırası (mal, yön).
 *
 * Pazar v1 (B3) açıkken NPC likiditesi (emilim ve arz) oyuncu sayısı `npcLikiditeTabanOyuncu`'nun üstüne çıkınca orantılı
 * büyür (`npcLikiditeOlcekPpm`); aksi halde (ve kapalıyken) ölçek 1'dir. Fiyat `d.pazar.fiyat` DÜNYA REFERANS fiyatıdır;
 * makas, liman primi, komisyon ve tarife oyuncunun nakit akışında (`fiyat.ts`, `lojistik/cozum.ts`) uygulanır.
 */
import { icerikTablosu } from "../ekonomi/tablo";
import { carpBol, kelepce, ppmUygula } from "../sabit";
import { anlikHazine, anlikMiktar } from "../stok";
import { PPM } from "../tipler";
import type { Baglam, Dunya, Stok, TicaretEmri } from "../tipler";
import { npcLikiditeOlcekPpm, pazarTablosu } from "./tablo";

interface Aday {
  emir: TicaretEmri;
  istenen: number;
}

/** Bir emir listesinin gerçekleşen oranlarını kapasiteye göre paylaştırır. Toplam gerçekleşeni döndürür. */
function paylastir(adaylar: Aday[], kapasite: number): number {
  let toplam = 0;
  for (const a of adaylar) toplam += a.istenen;
  if (toplam <= kapasite) {
    for (const a of adaylar) a.emir.gerceklesenSaat = a.istenen;
    return toplam;
  }
  let dagitilan = 0;
  for (const a of adaylar) {
    a.emir.gerceklesenSaat = carpBol(a.istenen, kapasite, toplam);
    dagitilan += a.emir.gerceklesenSaat;
  }
  let artan = kapasite - dagitilan;
  for (const a of adaylar) {
    if (artan <= 0) break;
    if (a.emir.gerceklesenSaat < a.istenen) {
      a.emir.gerceklesenSaat += 1;
      artan -= 1;
    }
  }
  return kapasite;
}

/**
 * NPC pazarın bu andaki saatlik hacimleri (mal indeksine göre emilim ve arz, mili-birim/saat): içerikteki değerler x NPC likidite
 * ölçeği (pazar v1 kapalıyken ölçek 1: içerikteki değerlerin kendisi).
 */
export function npcHacimleri(d: Dunya, ctx: Baglam): { emilim: number[]; arz: number[] } {
  const tb = icerikTablosu(ctx.ic);
  const olcek = npcLikiditeOlcekPpm(pazarTablosu(ctx.ic), d.oyuncular.length);
  if (olcek === PPM) return { emilim: tb.emilimSaat, arz: tb.arzSaat };
  return {
    emilim: tb.emilimSaat.map((x) => carpBol(x, olcek, PPM)),
    arz: tb.arzSaat.map((x) => carpBol(x, olcek, PPM)),
  };
}

/** Adım 1: ticaret emirlerini gerçekleştirir ve pazar.oyuncuArzi / oyuncuTalebi'ni yazar. */
export function pazarEmirleriniGerceklestir(d: Dunya, ctx: Baglam): void {
  const tb = icerikTablosu(ctx.ic);
  const nm = tb.malSayisi;
  const t = d.zaman;
  const hacim = npcHacimleri(d, ctx);
  const ihracat: Aday[][] = [];
  const ithalat: Aday[][] = [];
  for (let m = 0; m < nm; m++) {
    ihracat.push([]);
    ithalat.push([]);
  }
  for (const b of d.bolgeler) for (const e of b.ticaretEmirleri) e.gerceklesenSaat = 0;

  for (const o of d.oyuncular) {
    const hazineVar = anlikHazine(d, o.id) > 0;
    for (const b of d.bolgeler) {
      if (b.sahip !== o.id) continue;
      for (const e of b.ticaretEmirleri) {
        if (e.oranSaat <= 0) continue;
        if (e.yon === "ihracat") {
          const s = b.stoklar[e.mal] as Stok;
          const stoksuz = anlikMiktar(s, t) <= 0 && (b.uretimOrani[e.mal] as number) <= 0 && s.gelenOran <= 0;
          if (!stoksuz) (ihracat[e.mal] as Aday[]).push({ emir: e, istenen: e.oranSaat });
        } else if (hazineVar) {
          (ithalat[e.mal] as Aday[]).push({ emir: e, istenen: e.oranSaat });
        }
      }
    }
  }

  for (let m = 0; m < nm; m++) {
    d.pazar.oyuncuArzi[m] = paylastir(ihracat[m] as Aday[], hacim.emilim[m] as number);
    d.pazar.oyuncuTalebi[m] = paylastir(ithalat[m] as Aday[], hacim.arz[m] as number);
  }
}

/**
 * Adım 2: fiyat. Talep = emilim + gerçek ithalat, Arz = arz + gerçek ihracat;
 * oran = clamp((T−A)/min(T,A), −1, +1); fiyat = taban + taban × oran × esneklik. Sonuç [%25, %175] × taban.
 */
export function pazarFiyatlari(d: Dunya, ctx: Baglam): void {
  const tb = icerikTablosu(ctx.ic);
  const esneklik = ctx.ic.param.pazar.fiyatEsnekligiPpm;
  const hacim = npcHacimleri(d, ctx);
  for (let m = 0; m < tb.malSayisi; m++) {
    const talep = (hacim.emilim[m] as number) + (d.pazar.oyuncuTalebi[m] as number);
    const arz = (hacim.arz[m] as number) + (d.pazar.oyuncuArzi[m] as number);
    const kucuk = talep < arz ? talep : arz;
    const oran = kucuk > 0 ? kelepce(carpBol(talep - arz, PPM, kucuk), -PPM, PPM) : 0;
    const taban = (ctx.ic.mallar[m] as { tabanFiyat: number }).tabanFiyat;
    d.pazar.fiyat[m] = taban + carpBol(taban, ppmUygula(oran, esneklik), PPM);
  }
}
