/**
 * Sanayi komutları (B2): tesis_olcek_yukselt, genel_onarim, bakim_duzeyi, arama_sondaji.
 * Yetki: komutu veren oyuncu bölgenin sahibi olmalıdır. Başarısız komut dünyayı değiştirmez. Sanayi kapalıysa hepsi hata.
 */
import { maliyetYeterliMi, maliyetiDus } from "../ekonomi/maliyet";
import { icerikTablosu } from "../ekonomi/tablo";
import type { MalMiktar } from "../ekonomi/tablo";
import { hizlandirilmisSure } from "../erkenOyun";
import { carpBol } from "../sabit";
import { oyuncuBul } from "../stok";
import { tarimTablosu } from "../tarim/tablo";
import { PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya, Komut, KomutSonucu, OyuncuId } from "../tipler";
import { olcekKademesi } from "./carpan";
import { sanayiTablosu } from "./tablo";

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
  const bi = ctx.ic.bolgeIndeks[bolgeId];
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
      // Teknoloji: hedef kademe (L: otomasyon) açık olmalı.
      const tek = sn.olcekTeknoloji[k.olcek] as number;
      if (tek >= 0 && !o.teknolojiler.includes(tek)) {
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
      // Onarılacak tesisler: aşınması olanlar. Maliyet: onların inşa maliyetinin (ölçek dahil) %20'si (para + mal).
      const onarilacak = b.tesisler.filter((t) => (t.asinmaPpm ?? 0) > 0);
      if (onarilacak.length === 0) return hata(`onarilacak asinma yok: ${k.bolge}`);
      const toplamMal = new Map<number, number>();
      let para = 0;
      for (const ts of onarilacak) {
        const tur = tb.tur[ts.tur];
        if (!tur) continue;
        const oran = carpBol(olcekKademesi(sn, ts).insaPpm, sn.p.bakim.genelOnarimMaliyetPpm, PPM);
        for (const [m, q] of malOlcekle(tur.insaMaliyeti, oran)) toplamMal.set(m, (toplamMal.get(m) ?? 0) + q);
        para += carpBol(tur.insaParasi, oran, PPM);
      }
      const mal: Array<[number, number]> = [...toplamMal.entries()].sort((x, y) => x[0] - y[0]);
      const eksik = maliyetYeterliMi(d, b.indeks, oyuncu, mal, para);
      if (eksik !== null) return hata(eksik);
      if (!maliyetiDus(d, ctx, b.indeks, oyuncu, mal, para)) return hata("yetersiz hazine");
      const dur = sn.p.bakim.genelOnarimDurusSaat * SAAT;
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
