/**
 * Ekonomi komutları: tesis_insa, yontem_degistir, tesis_durum, ticaret_emri, vergi_ayarla.
 * Komut kimlikleri: Komut.bolge = bölge kimliği, Komut.tesis = TesisDurumu.id (dünya genelinde benzersiz).
 * Yetki: komutu veren oyuncu bölgenin sahibi olmalıdır. Başarısız komut dünyayı değiştirmez.
 */
import { bolgeIndeksiBul } from "../dugum";
import { maliyetYeterliMi, maliyetiDus } from "./maliyet";
import { icerikTablosu } from "./tablo";
import { hizlandirilmisSure } from "../erkenOyun";
import { ticaretEmirYuvasiHatasi } from "../mulk/yapi";
import { tarimTablosu } from "../tarim/tablo";
import { tesisTuruAcikMi, yontemAcikMi } from "../teknoloji";
import { oyuncuBul } from "../stok";
import { PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya, Komut, KomutSonucu, OyuncuId, TicaretEmri } from "../tipler";

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

const TAMAM: KomutSonucu = { tamam: true };

/** Ticaret emri oranı üst sınırı (mili-birim/saat): 1e6 birim/saat. Taşma ve Infinity girdilerine karşı. */
export const EN_COK_TICARET_ORANI = 1_000_000_000;

/** Bölgeyi kimliğiyle bulur ve sahipliği doğrular. */
function sahipliBolge(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, bolgeId: string): BolgeDurumu | string {
  const bi = bolgeIndeksiBul(d, ctx.ic, bolgeId);
  if (bi === undefined) return `bilinmeyen bolge: ${bolgeId}`;
  const b = d.bolgeler[bi] as BolgeDurumu;
  if (b.sahip !== oyuncu) return `bolge oyuncunun degil: ${bolgeId}`;
  return b;
}

function yonSirasi(y: TicaretEmri["yon"]): number {
  return y === "ihracat" ? 0 : 1;
}

export function ekonomiKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: Komut): KomutSonucu {
  const ic = ctx.ic;
  const tb = icerikTablosu(ic);
  switch (k.tur) {
    case "tesis_insa": {
      const b = sahipliBolge(d, ctx, oyuncu, k.bolge);
      if (typeof b === "string") return hata(b);
      // Mülk kipi (S3): işletme düğümünde tesis hücrelere kurulur (tesis_insa_hucre).
      if (b.merkez !== undefined) return hata("mulk kipinde tesis_insa_hucre kullanilmali");
      const ti = ic.tesisTuruIndeks[k.tesisTuru];
      if (ti === undefined) return hata(`bilinmeyen tesis turu: ${k.tesisTuru}`);
      const tanim = ic.tesisTurleri[ti]!;
      const tur = tb.tur[ti]!;
      if (!tesisTuruAcikMi(d, ctx, oyuncu, ti)) return hata(`tesis turu acik degil: ${k.tesisTuru}`);
      if (tanim.gerekliEtiket !== undefined && !b.etiketler.includes(tanim.gerekliEtiket)) {
        return hata(`bolge etiketi yetersiz: ${tanim.gerekliEtiket}`);
      }
      if (tur.gerekliRezerv >= 0 && (b.rezervKalan[tur.gerekliRezerv] as number) <= 0) {
        return hata(`gerekli rezerv yok: ${tanim.gerekliRezerv}`);
      }
      // Tarım (B1): çiftlik + ahır + mera toplamı bölgenin tarimTesisTavani'nı (inşa edilen + devam eden) aşamaz.
      const tt = tarimTablosu(ic);
      const tarimTanim = ic.harita.bolgeler[b.indeks]?.tarim;
      if (tt !== null && b.tarim !== undefined && tarimTanim !== undefined && tt.turTarimTesisi[ti] === true) {
        let sayi = 0;
        for (const x of b.tesisler) if (tt.turTarimTesisi[x.tur] === true) sayi++;
        for (const i of d.insaatlar) if (i.tur === "tesis" && i.bolge === b.indeks && tt.turTarimTesisi[i.hedef] === true) sayi++;
        if (sayi >= tarimTanim.tarimTesisTavani) return hata(`bolgenin tarim tesisi tavani dolu: ${tarimTanim.tarimTesisTavani}`);
      }
      const eksik = maliyetYeterliMi(d, b.indeks, oyuncu, tur.insaMaliyeti, tur.insaParasi);
      if (eksik !== null) return hata(eksik);
      if (!maliyetiDus(d, ctx, b.indeks, oyuncu, tur.insaMaliyeti, tur.insaParasi)) return hata("yetersiz hazine");
      const id = ctx.yeniKimlik(d);
      // Erken oyun hızlandırması: süre, oyuncunun katılımından geçen zamana göre kısalır.
      const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, tur.insaSuresiSaat * SAAT);
      d.insaatlar.push({ id, tur: "tesis", sahip: oyuncu, bolge: b.indeks, hedef: ti, bitis });
      ctx.planla(d, bitis, { tur: "insaat_bitti", insaat: id });
      return TAMAM;
    }
    case "yontem_degistir": {
      const b = sahipliBolge(d, ctx, oyuncu, k.bolge);
      if (typeof b === "string") return hata(b);
      const ts = b.tesisler.find((t) => t.id === k.tesis);
      if (!ts) return hata(`bolgede boyle bir tesis yok: ${k.tesis}`);
      const yi = ic.yontemIndeks[k.yontem];
      if (yi === undefined) return hata(`bilinmeyen yontem: ${k.yontem}`);
      if (!(tb.tur[ts.tur] as { yontemler: number[] }).yontemler.includes(yi)) return hata(`yontem bu tesis turunde yok: ${k.yontem}`);
      if (!yontemAcikMi(d, ctx, oyuncu, yi)) return hata(`yontem acik degil: ${k.yontem}`);
      // Seçicinin gördüğü yöntemi korur; canlı değişimi sessizce yeni bir onay saymaz.
      if (k.oncekiYontem !== undefined) {
        if (typeof k.oncekiYontem !== "string" || k.oncekiYontem.length === 0) return hata("gecersiz onceki yontem");
        if (k.oncekiYontem !== ic.yontemler[ts.yontem]?.id) return hata("tesisin yontemi degisti");
      }
      ts.yontem = yi;
      return TAMAM;
    }
    case "tesis_durum": {
      const b = sahipliBolge(d, ctx, oyuncu, k.bolge);
      if (typeof b === "string") return hata(b);
      const ts = b.tesisler.find((t) => t.id === k.tesis);
      if (!ts) return hata(`bolgede boyle bir tesis yok: ${k.tesis}`);
      if (typeof k.aktif !== "boolean") return hata(`gecersiz aktif degeri: ${String(k.aktif)}`);
      if (k.oncekiAktif !== undefined) {
        if (typeof k.oncekiAktif !== "boolean") return hata("gecersiz onceki aktif degeri");
        if (k.oncekiAktif !== ts.aktif) return hata("tesisin calisma durumu degisti");
      }
      ts.aktif = k.aktif;
      return TAMAM;
    }
    case "ticaret_emri": {
      const b = sahipliBolge(d, ctx, oyuncu, k.bolge);
      if (typeof b === "string") return hata(b);
      // Mülk kipi (docs/06 §15): işletme düğümü satışı il merkezindeki NPC (yerel) pazarına yapar; liman şartı aranmaz
      // (liman primi yalnız limanlı merkezlerde, pazar/fiyat.ts). Bölge kipinde liman şartı değişmez.
      const yerelPazar = b.merkez !== undefined && ic.mulk !== undefined;
      if (!yerelPazar && !b.etiketler.includes("liman")) return hata(`bolge liman degil: ${k.bolge}`);
      const mi = ic.malIndeks[k.mal];
      if (mi === undefined) return hata(`bilinmeyen mal: ${k.mal}`);
      if (tb.depolanamaz[mi] === true) return hata(`depolanamaz mal ticarete konu olamaz: ${k.mal}`);
      if (k.yon !== "ihracat" && k.yon !== "ithalat") return hata(`gecersiz yon: ${String(k.yon)}`);
      if (!Number.isSafeInteger(k.oranSaat) || k.oranSaat < 0 || k.oranSaat > EN_COK_TICARET_ORANI) {
        return hata(`gecersiz oran: ${k.oranSaat} (0..${EN_COK_TICARET_ORANI})`);
      }
      const konum = b.ticaretEmirleri.findIndex((e) => e.mal === mi && e.yon === k.yon);
      // Mülk kipi: yeni emir, işletmenin emir yuvası (temel + Ticaret ofisi) doluysa reddedilir; var olan emir güncellenir/silinir.
      if (yerelPazar && konum < 0 && k.oranSaat > 0) {
        const yuvaHatasi = ticaretEmirYuvasiHatasi(ic, b);
        if (yuvaHatasi !== null) return hata(yuvaHatasi);
      }
      if (k.oranSaat === 0) {
        if (konum >= 0) b.ticaretEmirleri.splice(konum, 1);
        return TAMAM;
      }
      if (konum >= 0) {
        (b.ticaretEmirleri[konum] as TicaretEmri).oranSaat = k.oranSaat;
      } else {
        b.ticaretEmirleri.push({ mal: mi, yon: k.yon, oranSaat: k.oranSaat, gerceklesenSaat: 0 });
        b.ticaretEmirleri.sort((x, y) => x.mal - y.mal || yonSirasi(x.yon) - yonSirasi(y.yon));
      }
      return TAMAM;
    }
    case "vergi_ayarla": {
      const o = oyuncuBul(d, oyuncu);
      if (!o) return hata(`bilinmeyen oyuncu: ${oyuncu}`);
      if (!Number.isSafeInteger(k.oranPpm) || k.oranPpm < 0 || k.oranPpm > PPM) return hata(`gecersiz vergi orani: ${k.oranPpm}`);
      o.vergiPpm = k.oranPpm;
      return TAMAM;
    }
    default:
      return hata(`ekonomi komutu degil: ${k.tur}`);
  }
}
