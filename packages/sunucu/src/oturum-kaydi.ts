/**
 * Oyun bağlantısı oturum olayı kaydı (insan testi İ2): oyuncunun ilk bağlantısı açılınca oturum başlar, SON bağlantısı kapanınca biter. Kopup yeniden bağlanma
 * (`boslukMs` içinde; varsayılan 5 dk) AYNI oturumdur: kapanış geri alınır. Çok sekme tek oturumdur (sunucu yalnız 0→1 ve 1→0 geçişlerini bildirir).
 *
 * Bu, GİRİŞ (kimlik) oturumu DEĞİLDİR (çerezle açılan hesap oturumu, `giris/`); adlar karışmasın.
 * Yalnız zaman ve opak oyuncu kimliği tutulur (IP, cihaz, e-posta YOK); `profil_capa`'ya yazılmaz. Varsayılan KAPALI: `BOLGE_OTURUM_KAYDI=1`.
 * Ayrıntı satırları 90 gün tutulur, sonrası yalnız gün düzeyinde toplu sayılar kalır (`bakim`). Saat enjekte edilir; hatalar oyunu etkilemez (`hata` kancası).
 */
import type { OyunOturumDeposu } from "./depo/tipler";

export const VARSAYILAN_OTURUM_BOSLUGU_MS = 5 * 60_000;

export interface OturumKaydediciSecenekleri {
  depo: OyunOturumDeposu;
  /** Kopup yeniden bağlanmanın aynı oturum sayıldığı boşluk (ms). Varsayılan 5 dk. */
  boslukMs?: number;
  /** Duvar saati (epoch ms); testler enjekte eder. */
  simdi?: () => number;
  /** Kayıt hatası (oyunu etkilemez); mesajda oyuncu kimliği ya da ayrıntı yoktur. */
  hata?: (mesaj: string) => void;
}

export type AcilisSonucu = "yeni" | "yenidenAcildi" | "devam";

export class OturumKaydedici {
  private readonly depo: OyunOturumDeposu;
  readonly boslukMs: number;
  private readonly simdi: () => number;
  private readonly hata: (m: string) => void;
  /** Bu süreçte açık oturumu olan oyuncular (önceki süreçten kalan açık satır "bayat" sayılır). */
  private readonly canli = new Set<string>();
  private zincir: Promise<unknown> = Promise.resolve();

  constructor(s: OturumKaydediciSecenekleri) {
    this.depo = s.depo;
    this.boslukMs = s.boslukMs ?? VARSAYILAN_OTURUM_BOSLUGU_MS;
    this.simdi = s.simdi ?? (() => Date.now());
    this.hata = s.hata ?? (() => undefined);
  }

  private sirala<T>(f: () => Promise<T>): Promise<T | undefined> {
    const is = this.zincir.then(f);
    this.zincir = is.catch(() => undefined);
    return is.catch(() => {
      this.hata("oyun oturumu kaydi yazilamadi");
      return undefined;
    });
  }

  /** Oyuncunun İLK bağlantısı açıldı. */
  ac(oyuncu: string): Promise<AcilisSonucu | undefined> {
    return this.sirala(async (): Promise<AcilisSonucu> => {
      const t = this.simdi();
      if (this.canli.has(oyuncu)) return "devam";
      this.canli.add(oyuncu);
      try {
        const son = await this.depo.sonOturum(oyuncu);
        if (son !== null && son.kapanis === null) {
          // Önceki sürecin açık bıraktığı oturum (süreç ani öldü): kapanış bilinmez, açılış anında kapatılır (süre 0) ve yeni oturum başlar.
          await this.depo.kapanisYaz(son.id, son.acilis);
        } else if (son !== null && son.kapanis !== null && t - son.kapanis <= this.boslukMs) {
          await this.depo.kapanisYaz(son.id, null);
          return "yenidenAcildi";
        }
        await this.depo.ac(oyuncu, t);
        return "yeni";
      } catch (e) {
        this.canli.delete(oyuncu); // yazılamadı: bir sonraki bağlantı yeniden dener (oyuncu "açık" sayılmaz)
        throw e;
      }
    });
  }

  /** Oyuncunun SON bağlantısı kapandı. */
  kapat(oyuncu: string): Promise<void | undefined> {
    return this.sirala(async () => {
      if (!this.canli.delete(oyuncu)) return;
      const son = await this.depo.sonOturum(oyuncu);
      if (son !== null && son.kapanis === null) await this.depo.kapanisYaz(son.id, this.simdi());
    });
  }

  /** Sunucu kapanırken bağlı bütün oyuncuların oturumlarını kapatır. */
  async hepsiniKapat(): Promise<void> {
    for (const o of [...this.canli]) await this.kapat(o);
  }

  /** Süresi geçen ayrıntıyı gün düzeyinde toplu sayıya çevirir (saatte bir). */
  bakim(): Promise<number | undefined> {
    return this.sirala(() => this.depo.toplulastir(this.simdi()));
  }

  /** Bekleyen kayıt işlerinin bitmesini bekler (testler, düzgün kapanış). */
  async bosta(): Promise<void> {
    await this.zincir;
  }
}
