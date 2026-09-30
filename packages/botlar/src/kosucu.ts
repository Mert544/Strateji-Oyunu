/**
 * Koşucu: oyuncu katılımı, bot karar anları ve gözlem geri çağrısıyla bir simülasyonu sürer.
 * Zaman tamamen simülasyon zamanıdır; duvar saati yalnızca raporlama içindir (KosuSonucu.sureMs).
 */
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { KomutSonucu, Ms, OyuncuId } from "@bolge/cekirdek";
import type { VeriPaketi } from "@bolge/veri";
import type { Bot } from "./api";

export interface KosuOyuncusu {
  id: OyuncuId;
  /** Oyuncunun katılırken alacağı (sahipsiz) bölge kimlikleri. */
  bolgeler: string[];
  /** Karar veren bot; null = komut vermez (yine de katılır). */
  bot: Bot | null;
  /** Katılma anı (ms, simülasyon zamanı). */
  katilmaMs: Ms;
}

export interface KosuSecenekleri {
  veri: VeriPaketi;
  tohum: number;
  oyuncular: KosuOyuncusu[];
  /** Mutlak bitiş anı (ms). */
  sureMs: Ms;
  /**
   * Bot karar aralığı (vars. 6 saat). Kararlar bu aralığın katlarında (ve oyuncunun katılma anında) verilir.
   * Aynı anda karar veren botların uygulama sırası her karar anında döner (bkz. `kos`).
   */
  kararAraligiMs?: Ms;
  /** Gözlem aralığı; verilirse `gozlem` bu aralığın katlarında (ve bitişte) çağrılır. */
  gozlemAraligiMs?: Ms;
  gozlem?: (sim: Simulasyon, t: Ms) => void;
  /** Mevcut bir simülasyondan devam et (verilmezse yeni oluşturulur). Katılmamış oyuncular yine katılır. */
  sim?: Simulasyon;
}

export interface KosuSonucu {
  sim: Simulasyon;
  /** Başarıyla uygulanan bot komutları, oyuncu başına. */
  komutSayisi: Record<OyuncuId, number>;
  /** Reddedilen bot komutları, oyuncu başına (bot kalitesi göstergesi). */
  basarisizSayisi: Record<OyuncuId, number>;
  /** Hata iletisi (sayılar "#" ile normalleştirilmiş) -> adet. */
  basarisizNedenleri: Record<string, number>;
  /** Başarılı komut türü -> adet (tüm oyuncular). */
  komutTurleri: Record<string, number>;
  /** Duvar saati süresi (ms); yalnızca raporlama, simülasyonu etkilemez. */
  sureMs: number;
}

/** Sonraki ızgara zamanı (> t), aralık katı. */
function sonrakiIzgara(t: Ms, aralik: Ms): Ms {
  return (Math.floor(t / aralik) + 1) * aralik;
}

export function kos(secenek: KosuSecenekleri): KosuSonucu {
  const basla = Date.now();
  const aralik = secenek.kararAraligiMs ?? 6 * SAAT;
  const goz = secenek.gozlemAraligiMs;
  const sim = secenek.sim ?? Simulasyon.olustur(secenek.veri, secenek.tohum);
  const oyuncular = secenek.oyuncular;
  const katildi = new Set<OyuncuId>(sim.dunya.oyuncular.map((o) => o.id));
  const yeniKatilan = new Set<OyuncuId>();

  const komutSayisi: Record<OyuncuId, number> = {};
  const basarisizSayisi: Record<OyuncuId, number> = {};
  const basarisizNedenleri: Record<string, number> = {};
  const komutTurleri: Record<string, number> = {};
  for (const o of oyuncular) {
    komutSayisi[o.id] = 0;
    basarisizSayisi[o.id] = 0;
  }

  let t = sim.dunya.zaman;
  for (;;) {
    // 1. Katılımlar (zamanı gelmiş olanlar)
    for (const o of oyuncular) {
      if (katildi.has(o.id) || o.katilmaMs > t) continue;
      const r = sim.uygula({ t, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: o.id, bolgeler: o.bolgeler } });
      if (!r.tamam) throw new Error(`kos: oyuncu katilamadi (${o.id}, t=${t}): ${r.hata}`);
      katildi.add(o.id);
      yeniKatilan.add(o.id);
    }

    // 2. Bot kararları
    // Bitiş anında karar verilmez (etkisi gözlenemez); yalnızca gözlem yapılır.
    const kararAni = t < secenek.sureMs && (t % aralik === 0 || yeniKatilan.size > 0);
    if (kararAni) {
      // Bekleyen çözüm olaylarını işle: botlar güncel kapsam tablosunu görsün.
      sim.calistirKadar(t);
      // İlk hamle avantajını dağıtmak için sıra karar anı indeksine göre döndürülür: k. karar anında k mod n kaydırma
      // (k = ızgara indeksi = ⌊t / aralık⌋; deterministik, duvar saatinden bağımsız, devam eden koşuda da tutarlı).
      const n = oyuncular.length;
      const kayma = n > 0 ? Math.floor(t / aralik) % n : 0;
      const sirali = kayma === 0 ? oyuncular : [...oyuncular.slice(kayma), ...oyuncular.slice(0, kayma)];
      for (const o of sirali) {
        if (!o.bot || !katildi.has(o.id)) continue;
        const zamani = t % aralik === 0 || yeniKatilan.has(o.id);
        if (!zamani) continue;
        for (const komut of o.bot.karar(sim)) {
          const r: KomutSonucu = sim.uygula({ t, oyuncu: o.id, komut });
          if (r.tamam) {
            komutSayisi[o.id] = (komutSayisi[o.id] ?? 0) + 1;
            komutTurleri[komut.tur] = (komutTurleri[komut.tur] ?? 0) + 1;
          } else {
            basarisizSayisi[o.id] = (basarisizSayisi[o.id] ?? 0) + 1;
            const neden = `${komut.tur}: ${r.hata.replace(/-?\d+/g, "#")}`;
            basarisizNedenleri[neden] = (basarisizNedenleri[neden] ?? 0) + 1;
          }
        }
      }
      yeniKatilan.clear();
    }

    // 3. Gözlem
    if (goz !== undefined && secenek.gozlem && (t % goz === 0 || t === secenek.sureMs)) {
      sim.calistirKadar(t);
      secenek.gozlem(sim, t);
    }

    if (t >= secenek.sureMs) break;

    // 4. Sonraki an
    let sonraki = Math.min(sonrakiIzgara(t, aralik), secenek.sureMs);
    if (goz !== undefined) sonraki = Math.min(sonraki, sonrakiIzgara(t, goz));
    for (const o of oyuncular) if (!katildi.has(o.id) && o.katilmaMs > t) sonraki = Math.min(sonraki, o.katilmaMs);
    sim.calistirKadar(sonraki);
    t = sonraki;
  }
  sim.calistirKadar(secenek.sureMs);
  return { sim, komutSayisi, basarisizSayisi, basarisizNedenleri, komutTurleri, sureMs: Date.now() - basla };
}
