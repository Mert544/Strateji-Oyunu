/**
 * Tarım komutları (B1): ekim_plani ve gubre_dozu.
 * Yetki: komutu veren oyuncu bölgenin sahibi olmalıdır; bölge tarım alanına sahip olmalıdır. Başarısız komut dünyayı
 * değiştirmez. Değişiklik anında geçerlidir (motor komut sonrası lojistiği aynı t'de çözer).
 */
import { PPM } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya, Komut, KomutSonucu, OyuncuId } from "../tipler";
import { tarimTablosu } from "./tablo";

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

export function tarimKomutu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, k: Komut): KomutSonucu {
  if (k.tur !== "ekim_plani" && k.tur !== "gubre_dozu") return hata(`tarim komutu degil: ${k.tur}`);
  const tb = tarimTablosu(ctx.ic);
  if (tb === null) return hata("tarim katmani kapali");
  const bi = ctx.ic.bolgeIndeks[k.bolge];
  if (bi === undefined) return hata(`bilinmeyen bolge: ${k.bolge}`);
  const b = d.bolgeler[bi] as BolgeDurumu;
  if (b.sahip !== oyuncu) return hata(`bolge oyuncunun degil: ${k.bolge}`);
  const ts = b.tarim;
  if (ts === undefined) return hata(`bolgenin tarim alani yok: ${k.bolge}`);

  if (k.tur === "ekim_plani") {
    if (!Array.isArray(k.ekimPpm) || k.ekimPpm.length !== tb.urun.length) {
      return hata(`ekim plani ${tb.urun.length} urun payi icermeli`);
    }
    let toplam = 0;
    for (const x of k.ekimPpm) {
      if (!Number.isSafeInteger(x) || x < 0 || x > PPM) return hata(`gecersiz ekim payi: ${String(x)} (0..${PPM})`);
      toplam += x;
    }
    if (toplam !== PPM) return hata(`ekim paylari toplami ${PPM} olmali (bulunan ${toplam})`);
    ts.ekimPpm = [...k.ekimPpm];
    return { tamam: true };
  }

  // gubre_dozu
  if (!Number.isSafeInteger(k.doz) || k.doz < 0 || k.doz > tb.tarim.azamiGubreDozu) {
    return hata(`gecersiz gubre dozu: ${String(k.doz)} (0..${tb.tarim.azamiGubreDozu})`);
  }
  ts.gubreDozu = k.doz;
  return { tamam: true };
}
