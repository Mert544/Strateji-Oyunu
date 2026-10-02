/**
 * Savaş: ilan, hazırlık, pencere ve pencere kapanınca OTOMATİK ÇÖZÜM (spesifikasyon §6).
 *
 * Akış: savas_ilan -> (hazırlık: U(min,max) saat, "savas" akışı) -> savas_pencere_ac -> (pencereSaat)
 *       -> savas_pencere_kapa (çözüm). Çözüm tamsayı matematiğiyle yapılır; tek rastgelelik kaynağı
 *       ctx.rastgeleAralik(d, "savas", n)'dir (ilanda hazırlık süresi, çözümde iki güç sapması).
 *
 * Çözüm kuralları:
 * - saldiranGuc = Σ adet×guc (saldıran bölge) × ikmalKarsilanmaPpm
 * - savunanGuc  = Σ adet×guc (hedef bölge) × ikmalKarsilanmaPpm × arazi × (savunma duruşu ise savunma çarpanı)
 *   arazi = hedefin etiketlerindeki araziSavunmaPpm'lerin en büyüğü (etiket yoksa PPM).
 *   Duruş "geri_cekil" ise savunanGuc = 0 ve savunan birlik kaybı 0.
 * - Her iki güce ayrı ayrı %90..%110 rastgele sapma. Saldıran ancak kesin üstünse kazanır (eşitlik savunana).
 * - Kayıplar (aşağıdaki sabitler): kaybeden %30, kazanan %10; her birlik türünde TAVAN yuvarlama
 *   (adet > 0 ve oran > 0 ise kayıp en az 1: küçük ordular kayıpsız kalmaz).
 * - Saldıran kazanırsa hedef bölgede her maldan yağma yapılır; tavan TEK yerde (kayipTavaniUygula) uygulanır.
 * - %25 kayıp tavanının paralel/ardışık savaşlarla aşılmaması için ilan kuralları (savasIlan):
 *   (a) hedef bölgede bitmemiş (hazırlık/pencere) herhangi bir savaş varsa yeni ilan reddedilir;
 *   (b) bir bölge yağmalandıktan (saldıran kazandı, stok kaybı > 0) sonra pencereSaat boyunca yeni ilan reddedilir;
 *   (c) bir saldıran bölge aynı anda yalnızca bir bitmemiş savaşta saldıran olabilir.
 *   Sonuç: bir bölgede iki yağma arası en az pencereSaat + hazırlık + pencereSaat; herhangi pencereSaat'lik
 *   kayan pencerede en çok bir yağma olur, yani kayıp <= kayipTavaniPpm.
 * - Pencere sırasında hedef bölgenin sahibi değiştiyse (veya boşaldıysa), ya da saldıran bölge artık
 *   saldıranın değilse, savaş SONUÇSUZ biter: kazanan = savunan (ilandaki), güçler 0, stok/birlik kaybı yok.
 */
import { bolgeIndeksiBul } from "../dugum";
import { carpBol, carpBolTavan, ppmUygula } from "../sabit";
import { oyuncuBul, stokEkle, stokUzlastir } from "../stok";
import { PPM, SAAT } from "../tipler";
import type { Baglam, Dunya, Komut, KomutSonucu, Mili, OyuncuId, SavasDurumu, SavasSonucu } from "../tipler";

/**
 * Savaşı kaybeden tarafın her birlik türündeki kayıp oranı (ppm).
 * Başlangıç varsayımı; parametreler.json askeri bölümüne taşınması önerilir.
 */
export const KAYBEDEN_KAYIP_PPM = 300_000;
/** Savaşı kazanan tarafın her birlik türündeki kayıp oranı (ppm). Parametrelere taşınması önerilir. */
export const KAZANAN_KAYIP_PPM = 100_000;
/** Güce uygulanan rastgele sapmanın alt sınırı (ppm): %90. */
export const SAPMA_ALT_PPM = 900_000;
/** Güce uygulanan rastgele sapmanın üst sınırı (ppm): %110. */
export const SAPMA_UST_PPM = 1_100_000;

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

/** Bir bölgenin birlik dizisinden toplam savaş gücü: Σ adet × guc. */
function hamGuc(d: Dunya, ctx: Baglam, bolge: number): number {
  const b = d.bolgeler[bolge];
  if (!b) return 0;
  let toplam = 0;
  for (let i = 0; i < b.birlikler.length; i++) {
    const adet = b.birlikler[i] ?? 0;
    const tanim = ctx.ic.birlikler[i];
    if (adet > 0 && tanim) toplam += adet * tanim.guc;
  }
  return toplam;
}

function birlikSayisi(d: Dunya, bolge: number): number {
  const b = d.bolgeler[bolge];
  return b ? b.birlikler.reduce((t, a) => t + a, 0) : 0;
}

/** Savaş bitmiş ve saldıran kazanıp hedeften en az bir maldan stok aldıysa true (yağma yapıldı). */
function yagmaYapildiMi(s: SavasDurumu): boolean {
  if (s.evre !== "bitti" || s.sonuc === null || s.sonuc.kazanan !== s.saldiran) return false;
  for (const k of s.sonuc.stokKaybi) if (k > 0) return true;
  return false;
}

/** Komut: savunma_emri. Bölge oyuncunun olmalı; duruş emri çevrimdışıyken de geçerlidir. */
export function savunmaEmri(
  d: Dunya,
  ctx: Baglam,
  oyuncu: OyuncuId,
  k: Extract<Komut, { tur: "savunma_emri" }>,
): KomutSonucu {
  const bi = bolgeIndeksiBul(d, ctx.ic, k.bolge);
  const bolge = bi === undefined ? undefined : d.bolgeler[bi];
  if (!bolge) return hata(`bilinmeyen bolge: ${k.bolge}`);
  if (bolge.sahip !== oyuncu) return hata(`bolge oyuncunun degil: ${k.bolge}`);
  if (k.durus !== "normal" && k.durus !== "savunma" && k.durus !== "geri_cekil") {
    return hata(`gecersiz durus: ${String(k.durus)}`);
  }
  bolge.savunma = { durus: k.durus };
  return { tamam: true };
}

/**
 * Komut: savas_ilan. Denetimler: bölgeler, sahiplik, komşuluk, savunanın koruması, yinelenen savaş,
 * saldıran bölgede birlik. Saldıran korumadaysa koruması biter. Rastgelelik yalnızca tüm denetimler
 * geçtikten sonra çekilir.
 */
export function savasIlan(
  d: Dunya,
  ctx: Baglam,
  oyuncu: OyuncuId,
  k: Extract<Komut, { tur: "savas_ilan" }>,
): KomutSonucu {
  const ic = ctx.ic;
  const sbi = ic.bolgeIndeks[k.saldiranBolge];
  const hbi = ic.bolgeIndeks[k.hedefBolge];
  const sb = sbi === undefined ? undefined : d.bolgeler[sbi];
  const hb = hbi === undefined ? undefined : d.bolgeler[hbi];
  if (sbi === undefined || !sb) return hata(`bilinmeyen bolge: ${k.saldiranBolge}`);
  if (hbi === undefined || !hb) return hata(`bilinmeyen bolge: ${k.hedefBolge}`);
  if (sb.sahip !== oyuncu) return hata(`saldiran bolge oyuncunun degil: ${k.saldiranBolge}`);
  if (hb.sahip === null) return hata(`hedef bolge sahipsiz: ${k.hedefBolge}`);
  if (hb.sahip === oyuncu) return hata(`hedef bolge kendi bolgeniz: ${k.hedefBolge}`);

  const komsu = (ic.komsuKenarlar[sbi] ?? []).some((ki) => {
    const kenar = d.kenarlar[ki];
    return kenar !== undefined && ((kenar.a === sbi && kenar.b === hbi) || (kenar.a === hbi && kenar.b === sbi));
  });
  if (!komsu) return hata("bolgeler komsu degil");

  const savunan = oyuncuBul(d, hb.sahip);
  const saldiran = oyuncuBul(d, oyuncu);
  if (!savunan || !saldiran) return hata("oyuncu bulunamadi");
  if (savunan.korumaBitis > d.zaman) return hata("savunan oyuncu yeni oyuncu korumasinda");

  const suruyor = d.savaslar.some(
    (s) =>
      s.evre !== "bitti" &&
      ((s.saldiranBolge === sbi && s.hedefBolge === hbi) || (s.saldiranBolge === hbi && s.hedefBolge === sbi)),
  );
  if (suruyor) return hata("bu iki bolge arasinda bitmemis bir savas var");
  // (a) Hedef bölgede bitmemiş herhangi bir savaş (saldıran kim olursa olsun) varken yeni ilan yok.
  if (d.savaslar.some((s) => s.evre !== "bitti" && s.hedefBolge === hbi)) {
    return hata(`hedef bolgede bitmemis bir savas var: ${k.hedefBolge}`);
  }
  // (c) Saldıran bölge aynı anda yalnızca bir bitmemiş savaşta saldıran olabilir (ordu çoklanmasın).
  if (d.savaslar.some((s) => s.evre !== "bitti" && s.saldiranBolge === sbi)) {
    return hata(`saldiran bolge baska bir bitmemis savasta saldiran: ${k.saldiranBolge}`);
  }
  // (b) Yağmalanan bölgeye pencereSaat boyunca yeni savaş ilan edilemez (yağma = çözüm anı pencereBitis).
  const yagmaKorumaMs = ic.param.askeri.pencereSaat * SAAT;
  if (d.savaslar.some((s) => s.hedefBolge === hbi && yagmaYapildiMi(s) && d.zaman < s.pencereBitis + yagmaKorumaMs)) {
    return hata(`hedef bolge yakin zamanda yagmalandi (yagma sonrasi ${ic.param.askeri.pencereSaat} saat savas ilan edilemez): ${k.hedefBolge}`);
  }
  if (birlikSayisi(d, sbi) < 1) return hata("saldiran bolgede birlik yok");

  const a = ic.param.askeri;
  if (a.ilanHazirlikSaatMax < a.ilanHazirlikSaatMin) return hata("gecersiz hazirlik suresi parametresi");

  // Tüm denetimler geçti: durum değişimi başlar.
  if (saldiran.korumaBitis > d.zaman) saldiran.korumaBitis = d.zaman;
  const hazirlikSaat = a.ilanHazirlikSaatMin + ctx.rastgeleAralik(d, "savas", a.ilanHazirlikSaatMax - a.ilanHazirlikSaatMin + 1);
  const pencereBaslangic = d.zaman + hazirlikSaat * SAAT;
  const pencereBitis = pencereBaslangic + a.pencereSaat * SAAT;
  const savas: SavasDurumu = {
    id: ctx.yeniKimlik(d),
    saldiran: oyuncu,
    savunan: hb.sahip,
    saldiranBolge: sbi,
    hedefBolge: hbi,
    ilan: d.zaman,
    pencereBaslangic,
    pencereBitis,
    evre: "hazirlik",
    sonuc: null,
  };
  d.savaslar.push(savas);
  ctx.planla(d, pencereBaslangic, { tur: "savas_pencere_ac", savas: savas.id });
  ctx.planla(d, pencereBitis, { tur: "savas_pencere_kapa", savas: savas.id });
  return { tamam: true };
}

/** Olay: savas_pencere_ac. Evre "pencere" olur. */
export function savasPencereAc(d: Dunya, ctx: Baglam, savasId: number): void {
  const s = d.savaslar.find((x) => x.id === savasId);
  if (!s || s.evre !== "hazirlik") return;
  s.evre = "pencere";
  ctx.kirlet(d);
}

/**
 * Yağma/kayıp tavanı (H5): TEK NOKTA. Bir maldan alınacak miktar
 * min(anlik × yagmaOraniPpm, anlik × kayipTavaniPpm), ayrıca [0, anlik] aralığına kelepçelenir.
 * Yağma yolundaki başka hiçbir kod tavanı kendisi uygulamaz; bu yüzden tavan aşılamaz.
 */
export function kayipTavaniUygula(anlik: Mili, yagmaOraniPpm: number, kayipTavaniPpm: number): Mili {
  if (anlik <= 0) return 0;
  const hesap = ppmUygula(anlik, yagmaOraniPpm);
  const tavan = ppmUygula(anlik, kayipTavaniPpm);
  const al = hesap < tavan ? hesap : tavan;
  return al < 0 ? 0 : al > anlik ? anlik : al;
}

/** Olay: savas_pencere_kapa. Otomatik çözüm (dosya başındaki kurallar). */
export function savasPencereKapa(d: Dunya, ctx: Baglam, savasId: number): void {
  const savas = d.savaslar.find((x) => x.id === savasId);
  if (!savas || savas.evre === "bitti") return;
  const ic = ctx.ic;
  const malSayisi = ic.mallar.length;
  const birlikTur = ic.birlikler.length;
  const sb = d.bolgeler[savas.saldiranBolge];
  const hb = d.bolgeler[savas.hedefBolge];

  const sifirSonuc = (): SavasSonucu => ({
    kazanan: savas.savunan,
    saldiranGuc: 0,
    savunanGuc: 0,
    stokKaybi: new Array<number>(malSayisi).fill(0),
    kayipOraniPpm: 0,
    saldiranBirlikKaybi: new Array<number>(birlikTur).fill(0),
    savunanBirlikKaybi: new Array<number>(birlikTur).fill(0),
  });

  // Sahip değişmişse savaş sonuçsuz biter.
  if (!sb || !hb || hb.sahip !== savas.savunan || sb.sahip !== savas.saldiran) {
    savas.sonuc = sifirSonuc();
    savas.evre = "bitti";
    ctx.kirlet(d);
    return;
  }

  const a = ic.param.askeri;
  const geriCekil = hb.savunma.durus === "geri_cekil";

  // Güçler: sapma çekimleri her zaman aynı sırada (önce saldıran, sonra savunan) yapılır.
  const sapmaAralik = SAPMA_UST_PPM - SAPMA_ALT_PPM + 1;
  const saldiranSapma = SAPMA_ALT_PPM + ctx.rastgeleAralik(d, "savas", sapmaAralik);
  const savunanSapma = SAPMA_ALT_PPM + ctx.rastgeleAralik(d, "savas", sapmaAralik);

  const saldiranGuc = ppmUygula(carpBol(hamGuc(d, ctx, savas.saldiranBolge), sb.ikmalKarsilanmaPpm, PPM), saldiranSapma);

  let arazi = PPM;
  let araziVar = false;
  for (const e of hb.etiketler) {
    const p = a.araziSavunmaPpm[e];
    if (p !== undefined && (!araziVar || p > arazi)) {
      arazi = p;
      araziVar = true;
    }
  }
  let savunanCarpan = carpBol(hb.ikmalKarsilanmaPpm, arazi, PPM);
  if (hb.savunma.durus === "savunma") savunanCarpan = carpBol(savunanCarpan, a.savunmaDurusuCarpaniPpm, PPM);
  const savunanGuc = geriCekil
    ? 0
    : ppmUygula(carpBol(hamGuc(d, ctx, savas.hedefBolge), savunanCarpan, PPM), savunanSapma);

  const saldiranKazandi = saldiranGuc > savunanGuc;

  // Birlik kayıpları (yukarı yuvarlanır: küçük ordular kayıpsız kalmaz).
  const saldiranOran = saldiranKazandi ? KAZANAN_KAYIP_PPM : KAYBEDEN_KAYIP_PPM;
  const savunanOran = saldiranKazandi ? KAYBEDEN_KAYIP_PPM : KAZANAN_KAYIP_PPM;
  const saldiranBirlikKaybi: number[] = [];
  const savunanBirlikKaybi: number[] = [];
  for (let i = 0; i < birlikTur; i++) {
    const sa = sb.birlikler[i] ?? 0;
    const ha = hb.birlikler[i] ?? 0;
    // Tavan yuvarlama: adet > 0 ve oran > 0 ise kayıp en az 1 (oran <= PPM olduğundan kayıp <= adet).
    const sk = sa > 0 ? carpBolTavan(sa, saldiranOran, PPM) : 0;
    const hk = geriCekil || ha <= 0 ? 0 : carpBolTavan(ha, savunanOran, PPM);
    saldiranBirlikKaybi.push(sk);
    savunanBirlikKaybi.push(hk);
    sb.birlikler[i] = sa - sk;
    hb.birlikler[i] = ha - hk;
  }

  // Yağma: yalnızca saldıran kazanırsa.
  const stokKaybi: Mili[] = new Array<number>(malSayisi).fill(0);
  let kayipDeger = 0;
  let toplamDeger = 0;
  if (saldiranKazandi) {
    for (let mal = 0; mal < malSayisi; mal++) {
      stokUzlastir(d, savas.hedefBolge, mal);
      const anlik = (hb.stoklar[mal] as { miktar: Mili }).miktar;
      const fiyat = d.pazar.fiyat[mal] ?? 0;
      const al = kayipTavaniUygula(anlik, a.yagmaOraniPpm, a.kayipTavaniPpm);
      const alinan = al > 0 ? -stokEkle(d, ctx, savas.hedefBolge, mal, -al) : 0;
      if (alinan > 0) {
        const eklenen = stokEkle(d, ctx, savas.saldiranBolge, mal, alinan);
        // Saldıranın deposuna sığmayan kısım israf olur.
        if (eklenen < alinan) sb.israf[mal] = (sb.israf[mal] as number) + (alinan - eklenen);
      }
      stokKaybi[mal] = alinan;
      kayipDeger += alinan * fiyat;
      toplamDeger += anlik * fiyat;
    }
  }
  const kayipOraniPpm = toplamDeger > 0 ? carpBol(kayipDeger, PPM, toplamDeger) : 0;

  savas.sonuc = {
    kazanan: saldiranKazandi ? savas.saldiran : savas.savunan,
    saldiranGuc,
    savunanGuc,
    stokKaybi,
    kayipOraniPpm,
    saldiranBirlikKaybi,
    savunanBirlikKaybi,
  };
  savas.evre = "bitti";
  ctx.kirlet(d);
}
