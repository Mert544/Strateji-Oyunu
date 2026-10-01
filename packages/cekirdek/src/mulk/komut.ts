/**
 * Mülk komutları (S3, docs/11 §7.2–§7.3): parsel_al, tesis_insa_hucre, insaat_iptal.
 *
 * Hepsi ya da hiçbiri: tüm denetimler önce yapılır, sonra durum değişir; başarısız komut dünyayı (hazinenin temsili dahil)
 * değiştirmez (docs/06 §14 başarısız komut sözleşmesi). Mülk kipi kapalıysa her mülk komutu reddedilir.
 *
 * - parsel_al {ilce, hucreler, sinif}: hücreler fikstürde bu ilçede, uygun ve komuttaki sınıfta olmalı, kimseye ait olmamalı,
 *   tekrarlanmamalı. Sınır: oyuncu ilçede en çok `ilceHucreTavani` (72) hücre ve uygun hücrelerin en çok `ilcePayTavaniPpm`
 *   (%25) kadarı. Fiyat hücre başına artımlı: k. hücre için taban[sınıf] × (1 + 2 × (satılmış + k) / uygun), tamsayı
 *   (aşağı yuvarlanır; mili-para). Toplu alım indirim yaratmaz. İlk parsel ilde (oyuncu, il) işletme düğümünü açar.
 *   Bitişiklik (Earth2 kuralı) sunucunun coğrafi doğrulamasındadır; çekirdek denetlemez.
 * - tesis_insa_hucre {ilce, tesisTuru, hucreler}: hücreler oyuncunun, bu ilçede, boş (tesis ve süren inşaat yok) ve sayısı
 *   türün yuvasına eşit olmalı. Mevcut inşaat mekanizması: maliyet işletme stoğundan ve hazineden düşer, süre
 *   `mulk.yapiInsaSaati` (yoksa içerik süresi) × erken oyun çarpanı; `insaat_bitti` tesisi işletme düğümüne kurar.
 *   Oyuncu başına aynı anda en çok `esZamanliInsaat` hücreli inşaat.
 * - insaat_iptal {insaat}: oyuncunun süren hücreli inşaatı; ödenen paranın ve malzemenin `insaatIptalIadePpm` (%50) kadarı
 *   iade edilir (malzeme depo kapasitesini aşarsa fazlası iade edilmez), hücreler boşalır. Planlı `insaat_bitti` olayı
 *   kuyrukta kalır ve işlendiğinde inşaatı bulamadığı için etkisizdir.
 */
import { maliyetYeterliMi, maliyetiDus } from "../ekonomi/maliyet";
import { icerikTablosu } from "../ekonomi/tablo";
import { hizlandirilmisSure } from "../erkenOyun";
import { carpBol } from "../sabit";
import { anlikHazine, hazineEkle, stokEkle } from "../stok";
import { tesisTuruAcikMi } from "../teknoloji";
import { PPM, SAAT } from "../tipler";
import type { ArsaSinifi, Baglam, BolgeDurumu, Dunya, HucreDurumu, InsaatDurumu, KomutSonucu, Mili, MulkKomutu, OyuncuId } from "../tipler";
import { dizgeKarsilastir, hucreBul, hucreEkle, ilceBul, ilceHucreEkle, ilceHucreSayisi, isletmeBul, mulkOyuncuAl, mulkOyuncuBul } from "./durum";
import { isletmeAl } from "./isletme";

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

const TAMAM: KomutSonucu = { tamam: true };

const SINIFLAR: readonly ArsaSinifi[] = ["kirsal", "kasaba", "sehir"];

/** Hücre listesini denetler: dize dizisi, boş değil, en çok `tavan` eleman, tekrarsız. Sıralı kopyasını ya da hatayı döndürür. */
function hucreListesi(hucreler: unknown, tavan: number): string[] | string {
  if (!Array.isArray(hucreler) || hucreler.length === 0) return "hucre listesi bos olamaz";
  if (hucreler.length > tavan) return `en cok ${tavan} hucre verilebilir`;
  for (const h of hucreler) if (typeof h !== "string") return `gecersiz hucre kimligi: ${String(h)}`;
  const sirali = [...(hucreler as string[])].sort(dizgeKarsilastir);
  for (let i = 1; i < sirali.length; i++) if (sirali[i] === sirali[i - 1]) return `tekrarlanan hucre: ${sirali[i] as string}`;
  return sirali;
}

/**
 * Parsel fiyatı (mili-para): `adet` hücre, ilçede şu an `satilmis` / `uygun` satılmışken. k. hücre (0'dan):
 * taban × (PPM + carpanPpm × (satilmis + k) / uygun) / PPM, aşağı yuvarlanır.
 */
export function parselFiyati(taban: Mili, carpanPpm: number, satilmis: number, uygun: number, adet: number): Mili {
  let toplam = 0;
  for (let k = 0; k < adet; k++) {
    const pay = uygun > 0 ? carpBol(carpanPpm, satilmis + k, uygun) : 0;
    toplam += carpBol(taban, PPM + pay, PPM);
  }
  return toplam;
}

export function mulkKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: MulkKomutu): KomutSonucu {
  const mk = ctx.ic.mulk;
  const m = d.mulk;
  if (mk === undefined || m === undefined) return hata("mulk kipi kapali");
  switch (k.tur) {
    case "parsel_al": {
      const ilce = typeof k.ilce === "string" ? ilceBul(d, k.ilce) : undefined;
      const tanim = typeof k.ilce === "string" ? mk.ilceler.get(k.ilce) : undefined;
      if (ilce === undefined || tanim === undefined) return hata(`bilinmeyen ilce: ${String(k.ilce)}`);
      if (!SINIFLAR.includes(k.sinif)) return hata(`gecersiz arsa sinifi: ${String(k.sinif)}`);
      const p = mk.p;
      const liste = hucreListesi(k.hucreler, p.ilceHucreTavani);
      if (typeof liste === "string") return hata(liste);
      for (const id of liste) {
        const f = mk.hucreler.get(id);
        if (f === undefined || f.ilce !== ilce.id) return hata(`hucre bu ilcede degil: ${id}`);
        if (!f.hucre.uygun) return hata(`hucre satin alinamaz (${f.hucre.engel ?? "uygun degil"}): ${id}`);
        if (f.hucre.sinif !== k.sinif) return hata(`hucre sinifi uyusmuyor: ${id} (${f.hucre.sinif}, komut ${k.sinif})`);
        const sahipli = hucreBul(d, id);
        if (sahipli !== undefined) return hata(`hucre zaten sahipli: ${id} (${sahipli.sahip})`);
      }
      const mo0 = mulkOyuncuBul(d, oyuncu);
      const mevcut = mo0 === undefined ? 0 : ilceHucreSayisi(mo0, ilce.id);
      const yeniToplam = mevcut + liste.length;
      if (yeniToplam > p.ilceHucreTavani) return hata(`ilcede en cok ${p.ilceHucreTavani} hucre (mevcut ${mevcut})`);
      const payTavani = carpBol(ilce.uygunHucre, p.ilcePayTavaniPpm, PPM);
      if (yeniToplam > payTavani) return hata(`ilcenin en cok %${carpBol(p.ilcePayTavaniPpm, 100, PPM)}'i (${payTavani} hucre; mevcut ${mevcut})`);
      if (ilce.satilmisHucre + liste.length > ilce.uygunHucre) return hata("ilcede yeterli bos uygun hucre yok");
      const taban = p.hucreFiyati[k.sinif];
      const fiyat = parselFiyati(taban, p.satisPayiCarpaniPpm, ilce.satilmisHucre, ilce.uygunHucre, liste.length);
      if (anlikHazine(d, oyuncu) < fiyat) return hata(`yetersiz hazine (gereken ${fiyat})`);
      if (!hazineEkle(d, oyuncu, -fiyat)) return hata(`yetersiz hazine (gereken ${fiyat})`);
      // Değişiklikler (artık başarısız olamaz)
      const mo = mulkOyuncuAl(m, oyuncu, d.zaman);
      isletmeAl(d, ctx.ic, oyuncu, ilce.il);
      for (let i = 0; i < liste.length; i++) {
        const deger = parselFiyati(taban, p.satisPayiCarpaniPpm, ilce.satilmisHucre + i, ilce.uygunHucre, 1);
        const h: HucreDurumu = { id: liste[i] as string, ilce: ilce.id, sinif: k.sinif, sahip: oyuncu, degerMili: deger, alinma: d.zaman };
        hucreEkle(m, h);
        mo.araziDegeriMili += deger;
      }
      ilce.satilmisHucre += liste.length;
      ilceHucreEkle(mo, ilce.id, liste.length);
      return TAMAM;
    }
    case "tesis_insa_hucre": {
      const ilce = typeof k.ilce === "string" ? ilceBul(d, k.ilce) : undefined;
      if (ilce === undefined) return hata(`bilinmeyen ilce: ${String(k.ilce)}`);
      const ti = typeof k.tesisTuru === "string" ? ctx.ic.tesisTuruIndeks[k.tesisTuru] : undefined;
      if (ti === undefined) return hata(`bilinmeyen tesis turu: ${String(k.tesisTuru)}`);
      const yuva = mk.yuva[ti] as number;
      if (yuva <= 0) return hata(`tesis turu mulk kipinde insa edilemez: ${k.tesisTuru}`);
      const liste = hucreListesi(k.hucreler, 3);
      if (typeof liste === "string") return hata(liste);
      if (liste.length !== yuva) return hata(`${k.tesisTuru} ${yuva} hucre kaplar (verilen ${liste.length})`);
      for (const id of liste) {
        const h = hucreBul(d, id);
        if (h === undefined || h.sahip !== oyuncu) return hata(`hucre oyuncunun degil: ${id}`);
        if (h.ilce !== ilce.id) return hata(`hucre bu ilcede degil: ${id}`);
        if (h.tesis !== undefined || h.insaat !== undefined) return hata(`hucre bos degil: ${id}`);
      }
      const isl = isletmeBul(d, oyuncu, ilce.il);
      if (isl === undefined) return hata(`ilde isletme yok: ${ilce.il}`);
      const b = d.bolgeler[isl.bolgeIndeksi] as BolgeDurumu;
      const tanim = ctx.ic.tesisTurleri[ti]!;
      const tb = icerikTablosu(ctx.ic);
      const tur = tb.tur[ti]!;
      if (!tesisTuruAcikMi(d, ctx, oyuncu, ti)) return hata(`tesis turu acik degil: ${k.tesisTuru}`);
      if (tanim.gerekliEtiket !== undefined && !b.etiketler.includes(tanim.gerekliEtiket)) return hata(`il etiketi yetersiz: ${tanim.gerekliEtiket}`);
      if (tur.gerekliRezerv >= 0 && (b.rezervKalan[tur.gerekliRezerv] as number) <= 0) return hata(`gerekli rezerv yok: ${tanim.gerekliRezerv}`);
      let suren = 0;
      for (const i of d.insaatlar) if (i.sahip === oyuncu && i.hucreler !== undefined) suren++;
      if (suren >= mk.p.esZamanliInsaat) return hata(`ayni anda en cok ${mk.p.esZamanliInsaat} insaat`);
      const eksik = maliyetYeterliMi(d, b.indeks, oyuncu, tur.insaMaliyeti, tur.insaParasi);
      if (eksik !== null) return hata(eksik);
      if (!maliyetiDus(d, ctx, b.indeks, oyuncu, tur.insaMaliyeti, tur.insaParasi)) return hata("yetersiz hazine");
      const id = ctx.yeniKimlik(d);
      const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, (mk.insaSaati[ti] as number) * SAAT);
      const ins: InsaatDurumu = {
        id,
        tur: "tesis",
        sahip: oyuncu,
        bolge: b.indeks,
        hedef: ti,
        bitis,
        hucreler: liste,
        baslangic: d.zaman,
        odenenPara: tur.insaParasi,
        odenenMal: tur.insaMaliyeti.map(([mal, q]) => [mal, q] as [number, Mili]),
      };
      d.insaatlar.push(ins);
      for (const hid of liste) (hucreBul(d, hid) as HucreDurumu).insaat = id;
      ctx.planla(d, bitis, { tur: "insaat_bitti", insaat: id });
      return TAMAM;
    }
    case "insaat_iptal": {
      if (!Number.isSafeInteger(k.insaat)) return hata(`gecersiz insaat: ${String(k.insaat)}`);
      const konum = d.insaatlar.findIndex((i) => i.id === k.insaat);
      const ins = d.insaatlar[konum];
      if (ins === undefined || ins.sahip !== oyuncu || ins.hucreler === undefined) return hata(`oyuncunun suren hucreli insaati yok: ${k.insaat}`);
      const iade = mk.p.insaatIptalIadePpm;
      const para = carpBol(ins.odenenPara ?? 0, iade, PPM);
      if (para > 0 && !hazineEkle(d, oyuncu, para)) return hata("iade yapilamadi");
      for (const [mal, q] of ins.odenenMal ?? []) {
        const geri = carpBol(q, iade, PPM);
        if (geri > 0) stokEkle(d, ctx, ins.bolge, mal, geri);
      }
      for (const hid of ins.hucreler) {
        const h = hucreBul(d, hid);
        if (h !== undefined && h.insaat === ins.id) delete h.insaat;
      }
      d.insaatlar.splice(konum, 1);
      return TAMAM;
    }
    default: {
      const _tamamlik: never = k;
      return hata(`bilinmeyen mulk komutu: ${JSON.stringify(_tamamlik)}`);
    }
  }
}
