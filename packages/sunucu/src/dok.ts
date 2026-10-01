/**
 * Depo dökümü (`--dok <dizin>`, insan testi İ1 desteği): herhangi bir depodaki (pg ya da dosya) komut günlüğünü ve SON anlık görüntüyü DOSYA DEPOSU biçiminde
 * bir dizine döker (`gunluk.jsonl`, `goruntu/<seq>-<sim zamanı>.goruntu`). Çevrimdışı oynatma betiği (O2) yalnız bu biçimi okur (`pg` paketine gerek kalmaz).
 * Kaynak SALT OKUNUR açılır (kilit alınmaz; çalışan sunucunun dünyası da dökülebilir; dosya kaynağında hiçbir dosya değiştirilmez). Hedef dizin BOŞ olmalıdır.
 * Dökülen dizinden açılan dünya, kaynağın (aynı içerik/kural sürümüyle) açılışıyla aynı `durumOzeti`'ni verir. Profil/oturum/hesap tabloları dökülmez.
 */
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { dosyaDeposu } from "./depo/dosya";
import type { AnlikGoruntuKaydi, GunlukKaydi } from "./depo/tipler";

export interface DokKaynagi {
  gunluk: { oku(seqSonrasi: number, enCok?: number): Promise<GunlukKaydi[]> };
  goruntu: { sonuncu(): Promise<AnlikGoruntuKaydi | null> };
}

export interface DokSonucu {
  /** Dökülen günlük kaydı sayısı ve son seq. */
  kayit: number;
  sonSeq: number;
  /** Dökülen görüntünün seq'i (yoksa null). */
  goruntuSeq: number | null;
}

export async function depoyuDok(kaynak: DokKaynagi, hedefDizin: string, parca = 5000): Promise<DokSonucu> {
  const mevcut = await stat(join(hedefDizin, "gunluk.jsonl")).catch(() => null);
  if (mevcut !== null && mevcut.size > 0) throw new Error(`dok hedefi bos degil: ${hedefDizin} (gunluk.jsonl var); bos bir dizin verin`);
  const hedef = await dosyaDeposu(hedefDizin);
  try {
    // Önce görüntü, sonra günlük: çalışan bir sunucudan dökerken görüntünün seq'i günlük kuyruğunun ötesine geçemez (görüntü günlükten sonra yazılır).
    const g = await kaynak.goruntu.sonuncu();
    let son = 0;
    let kayit = 0;
    for (;;) {
      const p = await kaynak.gunluk.oku(son, parca);
      if (p.length === 0) break;
      await hedef.gunluk.ekle(p);
      kayit += p.length;
      son = (p.at(-1) as GunlukKaydi).seq;
    }
    if (g) await hedef.goruntu.kaydet(g);
    return { kayit, sonSeq: son, goruntuSeq: g ? g.seq : null };
  } finally {
    await hedef.gunluk.kapat();
  }
}
