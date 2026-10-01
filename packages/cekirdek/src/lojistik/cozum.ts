/**
 * Lojistik çözüm (tam yeniden çözüm) ve lojistik komutları (kenar_gelistir, askeri_rezerv).
 *
 * lojistikCoz, her çağrıda dünyayı BAŞTAN hesaplar (t = d.zaman):
 *  0. Muhasebe: uretimToplam ve rezerv, eski üretim oranıyla t'ye kadar işlenir; hazineler uzlaştırılır.
 *  1. Sahipsiz bölgeler UYKUDA (üretim, tüketim, bozulma ve rezerv tükenmesi yok; yerel oranlar 0). Sahipli bölge
 *     bazında istihdam, rezerv verimi, potansiyel, talep ve arz (ekonomi/uretim). Hazinesi 0 ve net oranı
 *     negatif oyuncunun tesis potansiyeli ödeme gücü oranıyla (gelir/gider) çarpılır. Net oranı negatif oyuncunun
 *     gerçekleşen ithalatı, hazine bir sonraki saatlik tıka yetecek şekilde ölçeklenir (ithalatiHazineyeSigdir).
 *  2. Oyuncu başına askeri ve sivil min-maliyet akışı (lojistik/akis).
 *  3. Gecikme: akış farkları hedefte t + yol süresinde oran_delta olayı olur (yoldaki mal korunur).
 *  4. Tesis verimi ve öncelik katmanlı karşılanma (stok 0 iken), gıda/ikmal karşılanma oranları.
 *  5. Stok yerel oranları (stokOranAyarla) ve uretimOrani.
 *  6. Oyuncu hazine oranı: vergi + ihracat geliri − ithalat gideri − para lavaboları (tesis işletme + birlik maaşı).
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
import { hizlandirilmisSure } from "../erkenOyun";
import { maliyetYeterliMi, maliyetiDus } from "../ekonomi/maliyet";
import type { BolgeHesabi } from "../ekonomi/uretim";
import {
  bolgeDurumunaYaz,
  bolgeHesapla,
  bolgeOranlariUygula,
  bolgeUykuHesapla,
  bolgeUykuUygula,
  bolgeVerimCoz,
  uretimMuhasebesi,
} from "../ekonomi/uretim";
import { defterOranYaz, pazarMuhasebesi, sifirKalemler, ticaretCarpanlari, ihracatKirilimi, ithalatKirilimi } from "../pazar";
import { pazarTablosu } from "../pazar/tablo";
import { BOS_DUGUMLER, oyuncuDugumleri } from "../dugum";
import { araziVergisiOranAyarla, araziVergisiSaat } from "../mulk/vergi";
import { kenarKullanilabilirMi } from "../politika";
import { bakimCarpani, bakimDuzeyiIndeksi } from "../sanayi/carpan";
import { sanayiTablosu } from "../sanayi/tablo";
import { carpBol, carpBolTavan, tabanBol } from "../sabit";
import { hazineOranAyarla, hazineUzlastir, oyuncuBul } from "../stok";
import { MILI, PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya, Komut, KomutSonucu, Mili, OyuncuDurumu, OyuncuId, TicaretKalemleri } from "../tipler";
import { akisCoz, akisGecikmeleriniPlanla } from "./akis";
import { kapsamiHesapla } from "./kapsamHesap";

function sifirMatris(n: number, m: number): number[][] {
  const a: number[][] = [];
  for (let i = 0; i < n; i++) a.push(new Array<number>(m).fill(0));
  return a;
}

/** Bir oyuncunun saatlik para kalemleri (mili-para/saat). */
interface HazineKalemleri {
  /** Vergi + ihracat geliri. */
  gelir: number;
  /** İthalat gideri + para lavaboları (tesis işletme gideri ve birlik maaşı). */
  gider: number;
  /** `gider` içindeki ithalat payı (mili-para/saat). */
  ithalat: number;
  /** Pazar v1 (B3): ticaret kalemleri (defter için); yalnız `hesaplar` verilen çağrıda ve defter açıkken dolu, aksi halde null. */
  ticaret: TicaretKalemleri | null;
}

/**
 * Oyuncunun saatlik gelir ve giderini hesaplar.
 * - Gelir: vergi + ihracat (gerçekleşen oran × referans fiyat, makas / liman primi / komisyon kırılımıyla: pazar/fiyat.ts).
 * - Gider: ithalat (aynı kırılımla) + PARA LAVABOLARI: aktif tesis başına tesisIsletmeParasiSaat ve birlik başına birlikMaasiSaat.
 * Tarife ve ihracat vergisi hazineye geri yazılır (net 0; B3'te tek hazine), defterde ayrı kalemdir.
 * `hesaplar` verilirse ihracat, çözümün girdi karşılanma oranıyla (fr4) ölçeklenir; verilmezse (verim çözümünden
 * ÖNCE, ödeme gücü tahmini için) ihracat emirlerinin son gerçekleşen oranı kullanılır.
 */
function hazineKalemleri(
  d: Dunya,
  ctx: Baglam,
  o: OyuncuDurumu,
  hesaplar: readonly BolgeHesabi[] | null,
  dugumler: readonly number[],
): HazineKalemleri {
  const p = ctx.ic.param;
  const sn = sanayiTablosu(ctx.ic);
  const pazarAcik = pazarTablosu(ctx.ic) !== null;
  const defter = hesaplar !== null && pazarAcik && o.ticaretDefteri !== undefined ? sifirKalemler() : null;
  let gelir = 0;
  let gider = 0;
  let ithalat = 0;
  for (const r of dugumler) {
    const b = d.bolgeler[r] as BolgeDurumu;
    gelir += carpBol(carpBol(b.nufus, p.ekonomi.vergiTabani1000Saat, 1000), o.vergiPpm, PPM);
    const fr4 = hesaplar === null ? null : (hesaplar[b.indeks] as BolgeHesabi).fr4;
    // Ticaret çarpanları (makas, liman primi, komisyon, tarife) bölge başına bir kez; emirsiz bölgede hesaplanmaz.
    let carp = null as ReturnType<typeof ticaretCarpanlari> | null;
    for (const e of b.ticaretEmirleri) {
      if (e.gerceklesenSaat <= 0) continue;
      // Liman primi merkezin liman tanımından (mülk kipinde işletme düğümü il merkezinin limanını kullanır).
      carp ??= ticaretCarpanlari(d, ctx, o, b.merkez ?? b.indeks, b);
      const fiyat = d.pazar.fiyat[e.mal] as number;
      if (e.yon === "ihracat") {
        const gercek = fr4 === null ? e.gerceklesenSaat : carpBol(e.gerceklesenSaat, fr4[e.mal] as number, PPM);
        const brut = carpBol(gercek, fiyat, MILI);
        const kr = ihracatKirilimi(brut, carp);
        gelir += kr.nakit;
        if (defter !== null) {
          defter.brutIhracat += brut;
          defter.makas += kr.makas;
          defter.prim += kr.prim;
          defter.komisyon += kr.komisyon;
          defter.ihracatVergisi += kr.vergi;
        }
      } else {
        const brut = carpBol(e.gerceklesenSaat, fiyat, MILI);
        const kr = ithalatKirilimi(brut, carp);
        gider += kr.nakit;
        ithalat += kr.nakit;
        if (defter !== null) {
          defter.brutIthalat += brut;
          defter.makas += kr.makas;
          defter.prim += kr.prim;
          defter.komisyon += kr.komisyon;
          defter.ithalatTarifesi += kr.vergi;
        }
      }
    }
    let aktifTesis = 0;
    for (const t of b.tesisler) if (t.aktif) aktifTesis++;
    let birlik = 0;
    for (const a of b.birlikler) birlik += a;
    gider += aktifTesis * p.ekonomi.tesisIsletmeParasiSaat + birlik * p.askeri.birlikMaasiSaat;
    // Sanayi (B2): işletme gideri ölçek ve bakım düzeyi çarpanıyla değişir (normal düzey, S ölçek = özgün gider).
    if (sn !== null && p.ekonomi.tesisIsletmeParasiSaat > 0) {
      const duzey = bakimDuzeyiIndeksi(d, b);
      for (const t of b.tesisler) {
        if (!t.aktif) continue;
        let c = bakimCarpani(sn, t, duzey);
        // Santral (elektrik üreten tesis): işletme gideri santralIsletmePpm ile çarpılır (yakıt ve parça zaten ayrı maliyet).
        if ((sn.yontemElektrikCikti[t.yontem] as number) > 0) c = carpBol(c, sn.p.santralIsletmePpm, PPM);
        if (c !== PPM) gider += carpBol(p.ekonomi.tesisIsletmeParasiSaat, c, PPM) - p.ekonomi.tesisIsletmeParasiSaat;
      }
    }
  }
  // Mülk kipi (S3): tembel arazi vergisi saatlik gider olarak (kapalıyken 0).
  if (d.mulk !== undefined) gider += araziVergisiSaat(d, ctx.ic, o.id);
  return { gelir, gider, ithalat, ticaret: defter };
}

/**
 * İthalatı hazineye sığdırır (yalnızca saatlik tıkta gerçekleşen ithalat emirleri için, tıklar arası denetim).
 *
 * Sorun: hazine yeterliliği saatlik tıkta denetlenir; hazine tıklar arasında 0'a inerse (stok.ts negatif oranda
 * 0'da kelepçeler) mal gelmeye devam ederdi (ödenmemiş mal). Kural: net oran (gelir − gider) negatifse hazine
 * bir sonraki saatlik tıka kadar (en çok 1 saat) yetmelidir:
 *   izin verilen ithalat gideri/saat ≤ gelir/saat − diğer giderler/saat + anlık hazine × SAAT / kalanMs
 * (kalanMs = sonraki tama saate kalan süre, (0, SAAT]). Aşılıyorsa oyuncunun gerçekleşen ithalat oranlarının hepsi
 * aynı oranla (tamsayı, aşağı yuvarlanır, sıralı yineleme) küçültülür. Hazine 0 ise izin verilen ithalat
 * en çok `gelir − diğer giderler`dir (gelirle ödenebilen kadar). Oran yalnızca düşer: aynı saat içinde tekrar
 * çözümlenince (değişim yoksa) ölçekleme kendini tekrarlamaz; bir sonraki saatlik tık emirleri yeniden gerçekleştirir.
 * Net oran >= 0 ise bir şey yapılmaz. Ölçeklendiyse true döner.
 */
function ithalatiHazineyeSigdir(d: Dunya, o: OyuncuDurumu, k: HazineKalemleri, dugumler: readonly number[]): boolean {
  const net = k.gelir - k.gider;
  if (net >= 0 || k.ithalat <= 0) return false;
  const acik = -net; // mili-para/saat, > 0
  const kalanMs = SAAT - (d.zaman % SAAT);
  const hazine = o.hazine.miktar;
  // Hazine kalanMs boyunca açığı karşılıyor mu? (hazine >= acik × kalanMs / SAAT)
  if (hazine >= carpBolTavan(acik, kalanMs, SAAT)) return false;
  // Hazinenin tam kalanMs'de tükeneceği en büyük açık oranı (< acik).
  const dayanir = carpBol(hazine, SAAT, kalanMs);
  const izinli = k.gelir - (k.gider - k.ithalat) + dayanir;
  const hedef = izinli > 0 ? izinli : 0;
  for (const r of dugumler) {
    const b = d.bolgeler[r] as BolgeDurumu;
    for (const e of b.ticaretEmirleri) {
      if (e.yon !== "ithalat" || e.gerceklesenSaat <= 0) continue;
      e.gerceklesenSaat = hedef <= 0 ? 0 : carpBol(e.gerceklesenSaat, hedef, k.ithalat);
    }
  }
  return true;
}

/**
 * Ödeme gücü (ppm): hazine 0 iken ve net oran negatifse gelir/gider, aksi halde PPM.
 * "Maaş ödenemiyor": bu oran oyuncunun tüm tesislerinin verimini çarpar (bolgeHesapla).
 * Hazine bu çözümde uzlaştırılmıştır (adım 0); hazine > 0 iken tesisler tam verimle çalışır.
 */
function odemeGucuPpm(o: OyuncuDurumu, k: HazineKalemleri): number {
  if (o.hazine.miktar > 0 || k.gider <= k.gelir) return PPM;
  return k.gelir <= 0 ? 0 : carpBol(k.gelir, PPM, k.gider);
}

export function lojistikCoz(d: Dunya, ctx: Baglam): void {
  const ic = ctx.ic;
  const tb = icerikTablosu(ic);
  const n = d.bolgeler.length;
  const nm = tb.malSayisi;
  const tamponSaat = ic.param.lojistik.tamponSaat;

  // 0. Muhasebe
  uretimMuhasebesi(d, ctx);
  pazarMuhasebesi(d, ctx); // pazar v1 kapalıyken defter yoktur: hiçbir şey yapmaz
  for (const o of d.oyuncular) hazineUzlastir(d, o.id);

  // 1. Potansiyel, talep, arz ve fazla
  // Ödeme gücü (para lavaboları): hazinesi 0 ve net oranı negatif olan oyuncunun tesis verimi kısılır.
  const odeme = new Map<OyuncuId, number>();
  // Oyuncu -> düğümleri (artan): oyuncu başına tüm düğümleri taramamak için bir kez (mülk kipinde düğümler çoktur).
  const sahipli = oyuncuDugumleri(d);
  for (const o of d.oyuncular) {
    const dl = sahipli.get(o.id) ?? BOS_DUGUMLER;
    let k = hazineKalemleri(d, ctx, o, null, dl);
    // Ödenemeyen ithalat gerçekleşmez (tıklar arası hazine tükenmesi): önce ithalat hazineye sığdırılır,
    // ödeme gücü (tesis verimi kısıntısı) ithalat kısıldıktan sonraki gider üzerinden hesaplanır.
    if (ithalatiHazineyeSigdir(d, o, k, dl)) k = hazineKalemleri(d, ctx, o, null, dl);
    odeme.set(o.id, odemeGucuPpm(o, k));
  }
  // Sahipsiz bölgeler "uykuda": hesap sıfır (üretim/tüketim/bozulma/rezerv tükenmesi yok).
  const hesaplar = d.bolgeler.map((b, r) =>
    b.sahip === null ? bolgeUykuHesapla(d, ctx, r) : bolgeHesapla(d, ctx, r, odeme.get(b.sahip) ?? PPM),
  );
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
  const ak = akisCoz(d, ctx, fazla, askeriTalep, d.lojistik.akislar, sahipli);

  // 3. Gecikme
  akisGecikmeleriniPlanla(d, ctx, d.lojistik.akislar, ak.akislar);
  d.lojistik.akislar = ak.akislar;

  // 4-5. Verim, karşılanma ve stok oranları
  for (const h of hesaplar) {
    if (h.bolge.sahip === null) {
      bolgeUykuUygula(d, ctx, h);
      continue;
    }
    const giden = ak.giden[h.indeks] as Mili[];
    bolgeVerimCoz(ctx, h, giden);
    bolgeDurumunaYaz(ctx, h);
    bolgeOranlariUygula(d, ctx, h, giden);
  }

  // 6. Hazine oranları
  for (const o of d.oyuncular) {
    const k = hazineKalemleri(d, ctx, o, hesaplar, sahipli.get(o.id) ?? BOS_DUGUMLER);
    hazineOranAyarla(d, o.id, k.gelir - k.gider);
    if (d.mulk !== undefined) araziVergisiOranAyarla(d, ic, o.id);
    if (k.ticaret !== null) defterOranYaz(d, o, k.ticaret);
  }

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
      if (!Number.isSafeInteger(k.kenar) || k.kenar < 0 || k.kenar >= d.kenarlar.length) return hata(`bilinmeyen kenar: ${k.kenar}`);
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
      const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, lp.gelistirmeSuresiSaat * SAAT);
      d.insaatlar.push({ id, tur: "kenar", sahip: oyuncu, bolge: uc, hedef: k.kenar, bitis });
      ctx.planla(d, bitis, { tur: "insaat_bitti", insaat: id });
      return { tamam: true };
    }
    case "askeri_rezerv": {
      const o = oyuncuBul(d, oyuncu);
      if (!o) return hata(`bilinmeyen oyuncu: ${oyuncu}`);
      if (!Number.isSafeInteger(k.oranPpm) || k.oranPpm < 0 || k.oranPpm > 500_000) return hata(`gecersiz askeri rezerv: ${k.oranPpm}`);
      o.askeriRezervPpm = k.oranPpm;
      return { tamam: true };
    }
    default:
      return hata(`lojistik komutu degil: ${k.tur}`);
  }
}
