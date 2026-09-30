/**
 * Lojistik çözüm (tam yeniden çözüm) ve lojistik komutları (kenar_gelistir, askeri_rezerv).
 *
 * lojistikCoz, her çağrıda dünyayı BAŞTAN hesaplar (t = d.zaman):
 *  0. Muhasebe: uretimToplam ve rezerv, eski üretim oranıyla t'ye kadar işlenir; hazineler uzlaştırılır.
 *  1. Bölge bazında istihdam, rezerv verimi, potansiyel, talep ve arz (ekonomi/uretim).
 *  2. Oyuncu başına askeri ve sivil min-maliyet akışı (lojistik/akis).
 *  3. Gecikme: akış farkları hedefte t + yol süresinde oran_delta olayı olur (yoldaki mal korunur).
 *  4. Tesis verimi ve öncelik katmanlı karşılanma (stok 0 iken), gıda/ikmal karşılanma oranları.
 *  5. Stok yerel oranları (stokOranAyarla) ve uretimOrani.
 *  6. Oyuncu hazine oranı: vergi + ihracat geliri − ithalat gideri.
 *  7. Kenar kullanımı.
 *  8. Kapsam ("nerede açık, neden").
 * Bu fonksiyon ctx.kirlet ÇAĞIRMAZ (çözüm zaten yeni durumu yansıtır).
 *
 * Bilinen sınır: zincir içi dolaylı kısıtlar tek çözümde tam yakınsamaz (bölge içi zincir birkaç tur
 * yinelenir; bölgeler arası etki stok boşalınca esik olayının tetiklediği çözümle oturur). Stok boşaldığı
 * an ile sonraki çözüm arasında (en çok enAzCozumAraligiDakika) tüketim kısa süre "hayali" kalabilir; stok 0'da
 * kelepçelenir, üretim/tüketim sayıları bir sonraki çözümde düzelir.
 */
import { icerikTablosu } from "../ekonomi/tablo";
import { maliyetYeterliMi, maliyetiDus } from "../ekonomi/maliyet";
import { bolgeDurumunaYaz, bolgeHesapla, bolgeOranlariUygula, bolgeVerimCoz, uretimMuhasebesi } from "../ekonomi/uretim";
import { kenarKullanilabilirMi, pazarCarpanlari } from "../politika";
import { carpBol, tabanBol } from "../sabit";
import { hazineOranAyarla, hazineUzlastir, oyuncuBul } from "../stok";
import { MILI, PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya, Komut, KomutSonucu, Mili, OyuncuDurumu, OyuncuId } from "../tipler";
import { akisCoz, akisGecikmeleriniPlanla } from "./akis";
import { kapsamiHesapla } from "./kapsamHesap";

function sifirMatris(n: number, m: number): number[][] {
  const a: number[][] = [];
  for (let i = 0; i < n; i++) a.push(new Array<number>(m).fill(0));
  return a;
}

/** Adım 6: oyuncunun hazine oranı = vergi + ihracat geliri − ithalat gideri (mili-para/saat). */
function hazineOraniniHesapla(d: Dunya, ctx: Baglam, o: OyuncuDurumu, hesaplar: readonly { bolge: BolgeDurumu; fr4: number[] }[]): number {
  const p = ctx.ic.param;
  const carp = pazarCarpanlari(d, ctx, o.id);
  let net = 0;
  for (const h of hesaplar) {
    const b = h.bolge;
    if (b.sahip !== o.id) continue;
    net += carpBol(carpBol(b.nufus, p.ekonomi.vergiTabani1000Saat, 1000), o.vergiPpm, PPM);
    for (const e of b.ticaretEmirleri) {
      if (e.gerceklesenSaat <= 0) continue;
      const fiyat = d.pazar.fiyat[e.mal] as number;
      if (e.yon === "ihracat") {
        const gercek = carpBol(e.gerceklesenSaat, h.fr4[e.mal] as number, PPM);
        net += carpBol(carpBol(gercek, fiyat, MILI), carp.ihracatPpm, PPM);
      } else {
        net -= carpBol(carpBol(e.gerceklesenSaat, fiyat, MILI), carp.ithalatPpm, PPM);
      }
    }
  }
  return net;
}

export function lojistikCoz(d: Dunya, ctx: Baglam): void {
  const ic = ctx.ic;
  const tb = icerikTablosu(ic);
  const n = d.bolgeler.length;
  const nm = tb.malSayisi;
  const tamponSaat = ic.param.lojistik.tamponSaat;

  // 0. Muhasebe
  uretimMuhasebesi(d, ctx);
  for (const o of d.oyuncular) hazineUzlastir(d, o.id);

  // 1. Potansiyel, talep, arz ve fazla
  const hesaplar = d.bolgeler.map((_, r) => bolgeHesapla(d, ctx, r));
  const fazla = sifirMatris(n, nm);
  const askeriTalep = sifirMatris(n, nm);
  for (const h of hesaplar) {
    if (h.bolge.sahip === null) continue;
    const r = h.indeks;
    for (let m = 0; m < nm; m++) {
      const talep = h.talep[m] as number;
      const tampon = talep * tamponSaat;
      (fazla[r] as number[])[m] = (h.arz[m] as number) - talep + tabanBol((h.stok[m] as number) - tampon, tamponSaat);
      (askeriTalep[r] as number[])[m] = tb.askeri[m] ? talep : (h.ikmal[m] as number);
    }
  }

  // 2. Akışlar
  const ak = akisCoz(d, ctx, fazla, askeriTalep, d.lojistik.akislar);

  // 3. Gecikme
  akisGecikmeleriniPlanla(d, ctx, d.lojistik.akislar, ak.akislar);
  d.lojistik.akislar = ak.akislar;

  // 4-5. Verim, karşılanma ve stok oranları
  for (const h of hesaplar) {
    const giden = ak.giden[h.indeks] as Mili[];
    bolgeVerimCoz(ctx, h, giden);
    bolgeDurumunaYaz(ctx, h);
    bolgeOranlariUygula(d, ctx, h, giden);
  }

  // 6. Hazine oranları
  for (const o of d.oyuncular) hazineOranAyarla(d, o.id, hazineOraniniHesapla(d, ctx, o, hesaplar));

  // 7. Kenar kullanımı
  for (let e = 0; e < d.kenarlar.length; e++) {
    const k = d.kenarlar[e] as { kullanilanSaat: number; askeriKullanilanSaat: number };
    k.kullanilanSaat = ak.kullanilan[e] as number;
    k.askeriKullanilanSaat = ak.askeriKullanilan[e] as number;
  }

  // 8. Kapsam
  kapsamiHesapla(d, ctx, hesaplar, fazla, ak.gelen, ak.giden, ak.agler, ak.kalan);
}

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

/** Lojistik komutları: kenar_gelistir, askeri_rezerv. */
export function lojistikKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: Komut): KomutSonucu {
  switch (k.tur) {
    case "kenar_gelistir": {
      const o = oyuncuBul(d, oyuncu);
      if (!o) return hata(`bilinmeyen oyuncu: ${oyuncu}`);
      if (!Number.isInteger(k.kenar) || k.kenar < 0 || k.kenar >= d.kenarlar.length) return hata(`bilinmeyen kenar: ${k.kenar}`);
      const kenar = d.kenarlar[k.kenar]!;
      if (!kenarKullanilabilirMi(d, ctx, oyuncu, k.kenar)) return hata(`kenar kullanilamaz: ${k.kenar}`);
      if (kenar.tur === "deniz" && !o.kararlar.includes("deniz_kenar_gelistir")) return hata("deniz kenari gelistirme karari acik degil");
      if (d.insaatlar.some((i) => i.tur === "kenar" && i.hedef === k.kenar)) return hata(`kenarda gelistirme suruyor: ${k.kenar}`);
      // Maliyet, kenarın oyuncuya ait ilk ucundaki (a önce) bölge stoğundan düşer.
      const uc = d.bolgeler[kenar.a]?.sahip === oyuncu ? kenar.a : d.bolgeler[kenar.b]?.sahip === oyuncu ? kenar.b : -1;
      if (uc < 0) return hata(`kenarin ucu oyuncunun degil: ${k.kenar}`);
      const tb = icerikTablosu(ctx.ic);
      const lp = ctx.ic.param.lojistik;
      const eksik = maliyetYeterliMi(d, uc, oyuncu, tb.gelistirmeMaliyeti, lp.gelistirmeParasi);
      if (eksik !== null) return hata(eksik);
      if (!maliyetiDus(d, ctx, uc, oyuncu, tb.gelistirmeMaliyeti, lp.gelistirmeParasi)) return hata("yetersiz hazine");
      const id = ctx.yeniKimlik(d);
      const bitis = d.zaman + lp.gelistirmeSuresiSaat * SAAT;
      d.insaatlar.push({ id, tur: "kenar", sahip: oyuncu, bolge: uc, hedef: k.kenar, bitis });
      ctx.planla(d, bitis, { tur: "insaat_bitti", insaat: id });
      return { tamam: true };
    }
    case "askeri_rezerv": {
      const o = oyuncuBul(d, oyuncu);
      if (!o) return hata(`bilinmeyen oyuncu: ${oyuncu}`);
      if (!Number.isInteger(k.oranPpm) || k.oranPpm < 0 || k.oranPpm > 500_000) return hata(`gecersiz askeri rezerv: ${k.oranPpm}`);
      o.askeriRezervPpm = k.oranPpm;
      return { tamam: true };
    }
    default:
      return hata(`lojistik komutu degil: ${k.tur}`);
  }
}
