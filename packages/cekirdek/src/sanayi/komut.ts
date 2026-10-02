/**
 * Sanayi komutları (B2): tesis_olcek_yukselt, genel_onarim, bakim_duzeyi, arama_sondaji.
 * Yetki: komutu veren oyuncu bölgenin sahibi olmalıdır. Başarısız komut dünyayı değiştirmez. Sanayi kapalıysa hepsi hata.
 */
import { bolgeIndeksiBul } from "../dugum";
import { maliyetYeterliMi, maliyetiDus } from "../ekonomi/maliyet";
import { icerikTablosu } from "../ekonomi/tablo";
import type { MalMiktar } from "../ekonomi/tablo";
import { hizlandirilmisSure } from "../erkenOyun";
import { carpBol } from "../sabit";
import { oyuncuBul } from "../stok";
import { tarimTablosu } from "../tarim/tablo";
import { hucreBul } from "../mulk/durum";
import { olcekEkHucreAl, olcekEkHucrePlani } from "../mulk/komut";
import { PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya, HucreDurumu, InsaatDurumu, Komut, KomutSonucu, OyuncuId } from "../tipler";
import { olcekKademesi } from "./carpan";
import { sanayiTablosu } from "./tablo";
import { genelOnarimGorunumu, genelOnarimTeklifiGecerliMi, genelOnarimTeklifleriAyniMi } from "./onarim";

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

const TAMAM: KomutSonucu = { tamam: true };

/** Mal miktarlarını ppm oranıyla ölçekler (aşağı yuvarlar; sıfırlananlar atılır). */
function malOlcekle(l: MalMiktar, oran: number): Array<[number, number]> {
  const s: Array<[number, number]> = [];
  for (const [m, q] of l) {
    const x = carpBol(q, oran, PPM);
    if (x > 0) s.push([m, x]);
  }
  return s;
}

function sahipliBolge(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, bolgeId: string): BolgeDurumu | string {
  const bi = bolgeIndeksiBul(d, ctx.ic, bolgeId);
  if (bi === undefined) return `bilinmeyen bolge: ${bolgeId}`;
  const b = d.bolgeler[bi] as BolgeDurumu;
  if (b.sahip !== oyuncu) return `bolge oyuncunun degil: ${bolgeId}`;
  return b;
}

export function sanayiKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: Komut): KomutSonucu {
  const sn = sanayiTablosu(ctx.ic);
  if (sn === null) return hata("sanayi katmani kapali");
  const ic = ctx.ic;
  const tb = icerikTablosu(ic);
  switch (k.tur) {
    case "bakim_duzeyi": {
      const o = oyuncuBul(d, oyuncu);
      if (!o) return hata(`bilinmeyen oyuncu: ${oyuncu}`);
      if (k.duzey !== 0 && k.duzey !== 1 && k.duzey !== 2) return hata(`gecersiz bakim duzeyi: ${String(k.duzey)} (0, 1 veya 2)`);
      if (k.oncekiDuzey !== undefined) {
        if (k.oncekiDuzey !== 0 && k.oncekiDuzey !== 1 && k.oncekiDuzey !== 2) return hata("gecersiz onceki bakim duzeyi");
        if (k.oncekiDuzey !== (o.bakimDuzeyi ?? 1)) return hata("bakim duzeyi degisti");
      }
      o.bakimDuzeyi = k.duzey;
      return TAMAM;
    }
    case "tesis_olcek_yukselt": {
      const b = sahipliBolge(d, ctx, oyuncu, k.bolge);
      if (typeof b === "string") return hata(b);
      const ts = b.tesisler.find((t) => t.id === k.tesis);
      if (!ts) return hata(`bolgede boyle bir tesis yok: ${k.tesis}`);
      if (k.olcek !== 1 && k.olcek !== 2) return hata(`gecersiz olcek: ${String(k.olcek)} (1 = M, 2 = L)`);
      const mevcut = ts.olcek ?? 0;
      if (k.olcek <= mevcut) return hata(`tesis zaten ayni veya daha buyuk olcekte: ${mevcut}`);
      if (d.insaatlar.some((i) => i.tur === "olcek" && i.hedef === ts.id)) return hata(`tesiste olcek yukseltmesi suruyor: ${ts.id}`);
      const o = oyuncuBul(d, oyuncu);
      if (!o) return hata(`bilinmeyen oyuncu: ${oyuncu}`);
      // Mülk kipi (docs/06 §15.10): KİLİT YOK (teknoloji aranmaz); ayak izi büyür, ek hücre gerekir. Bölge kipinde eski kural aynen.
      const mk = ic.mulk;
      const mulkMu = mk !== undefined && d.mulk !== undefined;
      if (!mulkMu && (k.ekHucreler !== undefined || k.sinif !== undefined)) return hata("ekHucreler ve sinif yalniz mulk kipinde verilebilir");
      // Teknoloji (yalnız bölge kipi): hedef kademe (L: otomasyon) açık olmalı.
      const tek = sn.olcekTeknoloji[k.olcek] as number;
      if (!mulkMu && tek >= 0 && !o.teknolojiler.includes(tek)) {
        return hata(`olcek icin teknoloji acik degil: ${sn.p.olcekKademeleri[k.olcek]?.gerekliTeknoloji ?? ""}`);
      }
      // Maliyet: hedef kademe inşa maliyeti - mevcut kademe maliyeti (para + mal).
      const tur = tb.tur[ts.tur];
      if (!tur) return hata("tesis turu bilinmiyor");
      const hedef = (sn.p.olcekKademeleri[k.olcek] as { insaPpm: number }).insaPpm;
      const simdi = olcekKademesi(sn, ts).insaPpm;
      const oran = hedef - simdi;
      const mal = malOlcekle(tur.insaMaliyeti, oran);
      const para = carpBol(tur.insaParasi, oran, PPM);
      if (mk !== undefined && mulkMu) {
        // Mülk kipi: ek hücreler (kendi boş hücreleri ya da atomik satın alma) önce denetlenir; arsa + yükseltme tek hazine denetiminden geçer, hiçbir şey kısmen değişmez.
        const ek = olcekEkHucrePlani(d, mk, oyuncu, ts, k.olcek, k.ekHucreler, k.sinif);
        if (typeof ek === "string") return hata(ek);
        const eksikMulk = maliyetYeterliMi(d, b.indeks, oyuncu, mal, para + ek.arsa);
        if (eksikMulk !== null) return hata(eksikMulk === "yetersiz hazine" ? `yetersiz hazine (gereken ${para + ek.arsa})` : eksikMulk);
        if (!olcekEkHucreAl(d, ctx, mk, oyuncu, ek)) return hata("yetersiz hazine");
        if (!maliyetiDus(d, ctx, b.indeks, oyuncu, mal, para)) return hata("yetersiz hazine");
        const id = ctx.yeniKimlik(d);
        const sure = carpBol(tur.insaSuresiSaat * SAAT, sn.p.olcekYukseltmeSureCarpaniPpm, PPM);
        const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, sure);
        // `hucreler`: yükseltmeyle EKLENECEK hücreler (boş olabilir); inşaat sürerken hücreler başka işe verilemez (`insaat` işareti) ve eşzamanlı inşaat sayacına girer.
        const ins: InsaatDurumu = { id, tur: "olcek", sahip: oyuncu, bolge: b.indeks, hedef: ts.id, bitis, olcek: k.olcek, hucreler: ek.ek, baslangic: d.zaman, odenenPara: para, odenenMal: mal };
        d.insaatlar.push(ins);
        for (const hid of ek.ek) (hucreBul(d, hid) as HucreDurumu).insaat = id;
        ctx.planla(d, bitis, { tur: "insaat_bitti", insaat: id });
        return TAMAM;
      }
      const eksik = maliyetYeterliMi(d, b.indeks, oyuncu, mal, para);
      if (eksik !== null) return hata(eksik);
      if (!maliyetiDus(d, ctx, b.indeks, oyuncu, mal, para)) return hata("yetersiz hazine");
      const id = ctx.yeniKimlik(d);
      const sure = carpBol(tur.insaSuresiSaat * SAAT, sn.p.olcekYukseltmeSureCarpaniPpm, PPM);
      const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, sure);
      d.insaatlar.push({ id, tur: "olcek", sahip: oyuncu, bolge: b.indeks, hedef: ts.id, bitis, olcek: k.olcek });
      ctx.planla(d, bitis, { tur: "insaat_bitti", insaat: id });
      return TAMAM;
    }
    case "genel_onarim": {
      const b = sahipliBolge(d, ctx, oyuncu, k.bolge);
      if (typeof b === "string") return hata(b);
      if (d.insaatlar.some((i) => i.tur === "onarim" && i.bolge === b.indeks)) return hata(`bolgede onarim suruyor: ${k.bolge}`);
      const teklif = genelOnarimGorunumu(d, ic, oyuncu, b.id)?.teklif;
      if (k.gorulenTeklif !== undefined) {
        if (!genelOnarimTeklifiGecerliMi(k.gorulenTeklif)) return hata("gecersiz onarim teklifi");
        if (teklif === undefined || !genelOnarimTeklifleriAyniMi(k.gorulenTeklif, teklif)) return hata("onarim teklifi degisti");
      }
      if (teklif === undefined) return hata(`onarilacak asinma yok: ${k.bolge}`);
      // Tel teklifi mal kimliği sıralıdır; stok düşümü ve eşik olayları legacy içerik indeks sırasını korur.
      const mal: Array<[number, number]> = teklif.mal.map(([id, q]) => [ic.malIndeks[id]!, q]);
      mal.sort((x, y) => x[0] - y[0]);
      const para = teklif.paraMili;
      const eksik = maliyetYeterliMi(d, b.indeks, oyuncu, mal, para);
      if (eksik !== null) return hata(eksik);
      if (!maliyetiDus(d, ctx, b.indeks, oyuncu, mal, para)) return hata("yetersiz hazine");
      const hedefler = new Set(teklif.tesisler.map((x) => x.tesis));
      const onarilacak = b.tesisler.filter((x) => hedefler.has(x.id));
      const dur = teklif.durusMs;
      const bitis = d.zaman + dur;
      for (const ts of onarilacak) {
        ts.asinmaPpm = 0;
        if (dur > 0) ts.onarimBitis = bitis;
      }
      if (dur > 0) {
        const id = ctx.yeniKimlik(d);
        d.insaatlar.push({ id, tur: "onarim", sahip: oyuncu, bolge: b.indeks, hedef: -1, bitis });
        ctx.planla(d, bitis, { tur: "insaat_bitti", insaat: id });
      }
      return TAMAM;
    }
    case "arama_sondaji": {
      const b = sahipliBolge(d, ctx, oyuncu, k.bolge);
      if (typeof b === "string") return hata(b);
      const mi = ic.malIndeks[k.mal];
      if (mi === undefined) return hata(`bilinmeyen mal: ${k.mal}`);
      if (!sn.hamMal[mi]) return hata(`sondaj yalniz ham mallarda yapilir: ${k.mal}`);
      const tt = tarimTablosu(ic);
      if (tt !== null && b.tarim !== undefined && tt.tarimsalRezervMal[mi] === true) return hata(`tarim rezervinde sondaj yapilamaz: ${k.mal}`);
      if ((b.rezervIlk[mi] as number) <= 0) return hata(`bolgede bu malda damar yok: ${k.mal}`);
      const kullanilan = b.kesifSayisi?.[mi] ?? 0;
      if (kullanilan >= sn.p.damar.kesifHakkiBolgeMal) return hata(`kesif hakki bitti: ${k.bolge} / ${k.mal}`);
      const dp = sn.p.damar;
      const mal: Array<[number, number]> = [];
      for (const malId of Object.keys(dp.kesifMaliyetMal).sort()) {
        const m = ic.malIndeks[malId];
        const q = dp.kesifMaliyetMal[malId] as number;
        if (m !== undefined && q > 0) mal.push([m, q]);
      }
      mal.sort((x, y) => x[0] - y[0]);
      const eksik = maliyetYeterliMi(d, b.indeks, oyuncu, mal, dp.kesifMaliyetPara);
      if (eksik !== null) return hata(eksik);
      if (!maliyetiDus(d, ctx, b.indeks, oyuncu, mal, dp.kesifMaliyetPara)) return hata("yetersiz hazine");
      if (b.kesifSayisi === undefined) b.kesifSayisi = new Array<number>(tb.malSayisi).fill(0);
      b.kesifSayisi[mi] = kullanilan + 1;
      const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, dp.kesifSureSaat * SAAT);
      ctx.planla(d, bitis, { tur: "sondaj_bitti", bolge: b.indeks, mal: mi });
      return TAMAM;
    }
    default:
      return hata(`sanayi komutu degil: ${k.tur}`);
  }
}
