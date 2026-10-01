/**
 * Ekonomi izleme metrikleri (A2 alfa0-ekonomi-izleme.md §8.2 K2-1..K2-6 + K2-7 yerine sermaye hazine farkı): `/metrik`'e DÜNYA TOPLAMI gauge'ları.
 * KARDİNALİTE VE GİZLİLİK: hiçbir etiket oyuncu kimliği taşımaz (etiketler yalnız kalem, mal, tesis türü, yöntem, komut, çeyrek); oyuncu başına değerler
 * yalnız sunucu belleğinde tutulur, dışarıya DAĞILIM (çeyreklikler) olarak çıkar. Oyuncu başına okuma O2'nin günlük oynatmasının işidir.
 *
 * Saf okuma: çekirdek durumunu YALNIZ okur, değiştirmez (aynı durum aynı çıktı). Çekirdekte yeni kalem eklenmez.
 *
 * Para defteri kalemleri sabit listeden DEĞİL anahtarlardan okunur (`Object.keys`): çekirdeğe sonradan eklenen isteğe bağlı kalemler
 * (`musluk.yerelNpc`, `lavabo.sebeke`, `kasa.giris.sebeke` ...) kendiliğinden gauge satırı olarak görünür.
 */
import { GUN, SAAT, kasaBakiyesi } from "@bolge/cekirdek";
import type { DerlenmisIcerik, Dunya, ParaSayaci } from "@bolge/cekirdek";

/** `[etiket, değer]` satırı (sıralı). */
export type EtiketliDeger = [etiket: string, deger: number];

export interface EkonomiOlcumu {
  /** Mülk kipi para defteri (yoksa alan yok): kalem -> kümülatif mili-para (`n + a/SAAT`, 3 ondalık). */
  para?: { musluk: EtiketliDeger[]; lavabo: EtiketliDeger[] };
  /** Kamu kasaları (para defteri açıksa): Σ bakiye, giriş kalemleri, çıkışlar (oyuncuya / NPC'ye), kasa sayısı. */
  kasa?: { sayi: number; bakiye: number; giris: EtiketliDeger[]; cikis: EtiketliDeger[] };
  /** NPC pazar referans fiyatı / tabanFiyat (4 ondalık), mal sırasıyla; formül sınırları [0,25; 1,75] x taban. */
  pazar: { oran: EtiketliDeger[]; sinirda: { alt: number; ust: number } };
  /** Anlık tesis dağılımı (tür, yöntem) -> adet (yalnız > 0). */
  yontem: Array<{ tur: string; yontem: string; adet: number }>;
  /** Tür başına aşınma (ppm) çeyrekleri; yalnız aşınma verisi (`asinmaPpm`) olan tesisler. */
  asinma: Array<{ tur: string; adet: number; c25: number; c50: number; c75: number }>;
}

/** Fiyat sınırı eşikleri (x100 tamsayı): alt <= 0,26 x taban, üst >= 1,74 x taban (formül [0,25; 1,75] aralığının içi). */
export const FIYAT_SINIRI_ALT_YUZDE = 26;
export const FIYAT_SINIRI_UST_YUZDE = 174;

function sayacDegeri(s: ParaSayaci | undefined): number {
  if (s === undefined || typeof s.n !== "number") return 0;
  return s.n + Math.floor(((typeof s.a === "number" ? s.a : 0) / SAAT) * 1000) / 1000;
}

/** Kayıt anahtarlarından (sabit liste değil) sıralı `[anahtar, değer]`; yalnız `{n, a}` biçimli sayaçlar alınır. */
function sayaclar(kayit: Readonly<Record<string, ParaSayaci | undefined>> | undefined): EtiketliDeger[] {
  if (kayit === undefined) return [];
  return Object.keys(kayit)
    .sort()
    .filter((k) => typeof kayit[k]?.n === "number")
    .map((k): EtiketliDeger => [k, sayacDegeri(kayit[k])]);
}

/** En yakın sıra çeyreği (`sirali` artan, boş değil). */
function ceyrek(sirali: readonly number[], yuzde: number): number {
  return sirali[Math.min(sirali.length - 1, Math.max(0, Math.ceil((yuzde * sirali.length) / 100) - 1))] as number;
}

export function ekonomiOlcumu(d: Readonly<Dunya>, ic: DerlenmisIcerik): EkonomiOlcumu {
  const cikti: EkonomiOlcumu = { pazar: { oran: [], sinirda: { alt: 0, ust: 0 } }, yontem: [], asinma: [] };

  // K2-1, K2-6: para defteri (mülk kipi).
  const para = d.mulk?.para;
  if (para !== undefined) {
    cikti.para = { musluk: sayaclar(para.musluk), lavabo: sayaclar(para.lavabo) };
    // K2-2: kamu kasaları.
    const giris = new Map<string, number>();
    let bakiye = 0;
    let cikisOyuncu = 0;
    let cikisNpc = 0;
    for (const k of para.kasalar) {
      bakiye += kasaBakiyesi(k);
      cikisOyuncu += k.cikisOyuncu;
      cikisNpc += k.cikisNpc;
      for (const [kalem, v] of sayaclar(k.giris)) giris.set(kalem, (giris.get(kalem) ?? 0) + v);
    }
    cikti.kasa = {
      sayi: para.kasalar.length,
      bakiye,
      giris: [...giris.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      cikis: [["npc", cikisNpc], ["oyuncu", cikisOyuncu]],
    };
  }

  // K2-3: pazar fiyatı / taban.
  for (let m = 0; m < ic.mallar.length; m++) {
    const mal = ic.mallar[m];
    const fiyat = d.pazar.fiyat[m];
    if (mal === undefined || fiyat === undefined || mal.tabanFiyat <= 0) continue;
    cikti.pazar.oran.push([mal.id, Math.round((fiyat * 10_000) / mal.tabanFiyat) / 10_000]);
    if (fiyat * 100 <= mal.tabanFiyat * FIYAT_SINIRI_ALT_YUZDE) cikti.pazar.sinirda.alt++;
    else if (fiyat * 100 >= mal.tabanFiyat * FIYAT_SINIRI_UST_YUZDE) cikti.pazar.sinirda.ust++;
  }

  // K2-4 (yöntem dağılımı) ve K2-5 (aşınma çeyrekleri): tüm bölge/işletme düğümlerinin tesisleri.
  const yontem = new Map<string, number>();
  const asinma = new Map<string, number[]>();
  for (const b of d.bolgeler) {
    for (const t of b.tesisler) {
      const tur = ic.tesisTurleri[t.tur]?.id;
      if (tur === undefined) continue;
      const y = ic.yontemler[t.yontem]?.id;
      if (y !== undefined) yontem.set(`${tur}\u0000${y}`, (yontem.get(`${tur}\u0000${y}`) ?? 0) + 1);
      if (t.asinmaPpm !== undefined) {
        let l = asinma.get(tur);
        if (!l) asinma.set(tur, (l = []));
        l.push(t.asinmaPpm);
      }
    }
  }
  for (const k of [...yontem.keys()].sort()) {
    const [tur, y] = k.split("\u0000") as [string, string];
    cikti.yontem.push({ tur, yontem: y, adet: yontem.get(k) as number });
  }
  for (const tur of [...asinma.keys()].sort()) {
    const s = (asinma.get(tur) as number[]).sort((a, b) => a - b);
    cikti.asinma.push({ tur, adet: s.length, c25: ceyrek(s, 25), c50: ceyrek(s, 50), c75: ceyrek(s, 75) });
  }
  return cikti;
}

// --- K2-7 yerine: sermaye komutlarında komut başına hazine farkı (sunucu tarafı; çekirdeğe kalem eklenmez) -----------------------------

/** Sermaye (yatırım) komutları: A2 `r = Σ yatırım / Σ net kâr` paydasında sayılanlar. `genel_onarim`, `arama_sondaji`, `arastir` yatırım DEĞİLDİR. */
export const SERMAYE_KOMUTLARI: ReadonlySet<string> = new Set(["parsel_al", "yapi_yerlestir", "tesis_insa_hucre", "tesis_olcek_yukselt", "kenar_gelistir"]);

/**
 * Hazine ölçümü için komut zamanına kadar ilerletmenin üst sınırı: çekirdeğin `EN_COK_KOMUT_ILERISI` (400 gün) sınırından KÜÇÜK olmalı; çünkü çekirdek bunu aşan komutu
 * dünyayı ilerletmeden reddeder, ölçüm ise dünyayı ilerletmemeli. Gerçek komutlar sunucu saatiyle damgalanır (şimdiye yakın).
 */
export const SERMAYE_OLCUM_ILERI_SINIRI = 30 * GUN;

export type SermayeKaynagi = "insan" | "bot";

export interface SermayeOzeti {
  /** (komut, kaynak) -> başarılı komut adedi ve Σ hazine farkı (mili-para; komut öncesi hazine − sonrası). Sıralı. */
  komutlar: Array<{ komut: string; kaynak: SermayeKaynagi; adet: number; fark: number }>;
  /** İnsan oyuncuların kümülatif sermaye farkı DAĞILIMI (oyuncu başına toplamlar; kimlik yok): oyuncu sayısı ve çeyrekler (c100 = en büyük). */
  insanOyuncu: { sayi: number; c25: number; c50: number; c75: number; c100: number };
}

/**
 * Sermaye komutu hazine farkı toplayıcısı. Oyuncu başına toplamlar YALNIZ burada (bellekte) tutulur; dışarı yalnız dünya toplamı ve dağılım çıkar
 * (`ozet`). Süreç ömrü boyunca birikir (kurtarma sonrası kalan günlük oynatması dahil; sıfırdan oynatma sayılmaz).
 */
export class SermayeSayaci {
  private readonly komut = new Map<string, { adet: number; fark: number }>();
  private readonly insan = new Map<string, number>();

  /** `fark` = komut öncesi hazine − sonrası (mili-para); yalnız BAŞARILI sermaye komutları için çağrılır. */
  kaydet(oyuncu: string, kaynak: SermayeKaynagi, komutTuru: string, fark: number): void {
    const a = `${komutTuru}\u0000${kaynak}`;
    const k = this.komut.get(a) ?? { adet: 0, fark: 0 };
    k.adet++;
    k.fark += fark;
    this.komut.set(a, k);
    if (kaynak === "insan") this.insan.set(oyuncu, (this.insan.get(oyuncu) ?? 0) + fark);
  }

  ozet(): SermayeOzeti {
    const komutlar = [...this.komut.keys()].sort().map((a) => {
      const [komut, kaynak] = a.split("\u0000") as [string, SermayeKaynagi];
      const v = this.komut.get(a) as { adet: number; fark: number };
      return { komut, kaynak, adet: v.adet, fark: v.fark };
    });
    const s = [...this.insan.values()].sort((a, b) => a - b);
    const insanOyuncu = s.length === 0 ? { sayi: 0, c25: 0, c50: 0, c75: 0, c100: 0 } : { sayi: s.length, c25: ceyrek(s, 25), c50: ceyrek(s, 50), c75: ceyrek(s, 75), c100: ceyrek(s, 100) };
    return { komutlar, insanOyuncu };
  }
}
