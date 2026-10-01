/**
 * Görüntü işçisinin ana iş parçacığı yüzü: en çok BİR iş, kopya maliyeti ölçümü, hata ve yeniden başlatma.
 *
 * Sözleşme (yazar.ts `goruntuArkada` ile birlikte):
 * - `calistir(dunya, sikistir)` dünyayı `postMessage` ile yapısal olarak KOPYALAR ve hemen döner. Kopya, çağrı anındaki
 *   dünyadır; sonradan dünya değişse de işçi o anın metnini üretir. Kopya maliyeti (ana iş parçacığında kalan tek ağır iş)
 *   `kopyaMs` olarak döner.
 * - Aynı anda en çok bir iş: meşgulken `calistir` fırlatmaz, `null` döner (çağıran görüntüyü ATLAR; koşul sürdüğü için sonraki
 *   turda yeniden dener).
 * - İşçi hatası (istisna, çıkış, `error`) işi reddeder; sonraki `calistir` işçiyi yeniden kurar. Hiçbir zaman süreci düşürmez.
 */
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import type { Dunya, IcerikKimlikTablosu } from "@bolge/cekirdek";

export type IsciIstegi =
  | { tur: "kur"; tablo: IcerikKimlikTablosu; kuralSurumu: string }
  | { tur: "is"; id: number; dunya: Dunya; sikistir: boolean };

export type IsciYaniti =
  | { id: number; tamam: true; metin: string; durumOzeti: string; gzip?: Uint8Array; serilestirMs: number; sikistirMs: number; isciMs: number }
  | { id: number; tamam: false; hata: string };

export interface GoruntuSonucu {
  metin: string;
  durumOzeti: string;
  gzip?: Uint8Array;
  /** İşçi içi süreler (ms): serileştirme + özet, gzip, toplam. */
  serilestirMs: number;
  sikistirMs: number;
  isciMs: number;
}

export interface GoruntuIsciSecenekleri {
  /** İşçi giriş dosyası (varsayılan: yanındaki `goruntu-isci.ts`; `.ts` ise tsx önyükleyicisiyle yüklenir). Testler başka betik verir. */
  betik?: URL;
}

export class GoruntuIscisi {
  private worker: Worker | null = null;
  private sonId = 0;
  private bekleyen: { id: number; coz: (s: GoruntuSonucu) => void; reddet: (e: Error) => void } | null = null;
  private kapali = false;
  /** İşçinin kaç kez (yeniden) kurulduğu (test/metrik). */
  kurulum = 0;

  constructor(
    private readonly tablo: IcerikKimlikTablosu,
    private readonly kuralSurumu: string,
    private readonly s: GoruntuIsciSecenekleri = {},
  ) {}

  get mesgul(): boolean {
    return this.bekleyen !== null;
  }

  private baslat(): Worker {
    const betik = this.s.betik ?? new URL("./goruntu-isci.ts", import.meta.url);
    // `.ts` işçi: worker_threads `--import tsx`'i uygulamaz; küçük .mjs önyükleyici tsx'in `tsImport`'uyla yükler.
    const w = betik.pathname.endsWith(".ts")
      ? new Worker(fileURLToPath(new URL("./goruntu-isci-yukle.mjs", import.meta.url)), { workerData: { betik: betik.href } })
      : new Worker(fileURLToPath(betik));
    w.unref(); // işçi tek başına süreci açık tutmaz
    w.on("message", (y: IsciYaniti) => {
      const b = this.bekleyen;
      if (!b || b.id !== y.id) return;
      this.bekleyen = null;
      if (y.tamam) b.coz({ metin: y.metin, durumOzeti: y.durumOzeti, ...(y.gzip ? { gzip: y.gzip } : {}), serilestirMs: y.serilestirMs, sikistirMs: y.sikistirMs, isciMs: y.isciMs });
      else b.reddet(new Error(`goruntu isci hatasi: ${y.hata}`));
    });
    const dus = (e: Error): void => {
      if (this.worker === w) this.worker = null; // sonraki iş yeniden kurar
      const b = this.bekleyen;
      this.bekleyen = null;
      b?.reddet(e);
    };
    w.on("error", (e) => dus(new Error(`goruntu isci cokmesi: ${e.message}`)));
    w.on("exit", (kod) => dus(new Error(`goruntu isci cikti (kod ${kod})`)));
    w.postMessage({ tur: "kur", tablo: this.tablo, kuralSurumu: this.kuralSurumu } satisfies IsciIstegi);
    this.kurulum++;
    return w;
  }

  /**
   * Yapısal kopyayı alıp işçiye verir. Meşgulse ya da kapalıysa `null`. `kopyaMs`: `postMessage`'in (V8 serileştirmesi) ana iş
   * parçacığındaki süresi, `olcu` işleviyle ölçülür.
   */
  calistir(dunya: Dunya, sikistir: boolean, olcu: () => number = () => performance.now()): { kopyaMs: number; sonuc: Promise<GoruntuSonucu> } | null {
    if (this.kapali || this.bekleyen !== null) return null;
    let w: Worker;
    try {
      w = this.worker ??= this.baslat();
    } catch (e) {
      return { kopyaMs: 0, sonuc: Promise.reject(e instanceof Error ? e : new Error(String(e))) };
    }
    const id = ++this.sonId;
    const sonuc = new Promise<GoruntuSonucu>((coz, reddet) => {
      this.bekleyen = { id, coz, reddet };
    });
    const bas = olcu();
    try {
      w.postMessage({ tur: "is", id, dunya, sikistir } satisfies IsciIstegi);
    } catch (e) {
      // Kopya alınamadı (ör. serileştirilemeyen değer): iş reddedilir, işçi sağlam kalır.
      const b = this.bekleyen as { reddet: (e: Error) => void } | null;
      this.bekleyen = null;
      b?.reddet(e instanceof Error ? e : new Error(String(e)));
    }
    return { kopyaMs: olcu() - bas, sonuc };
  }

  /** Süren işi bekler (hata yutulur: iş sahibi zaten reddi görür), sonra işçiyi sonlandırır. */
  async kapat(): Promise<void> {
    this.kapali = true;
    const w = this.worker;
    this.worker = null;
    if (w) await w.terminate();
  }
}
