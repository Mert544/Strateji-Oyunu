/**
 * ws bileti sağlayıcısı (G9-a; DOM yok): çerezle yetkili `POST /giris/bilet` → `merhaba.token`.
 *
 * Bilet 60 sn ömürlü ve TEK KULLANIMLIKTIR: her (yeniden) bağlanışta yeni bilet alınır; `WsBaglanti` `token` seçeneği olarak
 * `saglayici.bilet` işlevini alır ve bağlanmadan hemen önce çağırır. Oturum açıkken yenileme sessizdir (ekranda hiçbir şey görünmez):
 * - bilet `hiz_siniri` (429; K2 beklemeSn ≈ 2): sessizce bekleyip yeniden dener (ekranda hata/metin yok);
 * - ağ hatası: `GirisHatasi` (`ag_hatasi`) fırlatır; `WsBaglanti` geri çekilmeyle yeniden dener;
 * - `oturum_yok` (401): oturum bitti; `oturumYok` dinleyicileri bir kez çağrılır (G-7) ve `GirisHatasi` (`oturum_yok`) fırlatılır;
 *   `WsBaglanti` bunu "reddedildi" olarak işler, yeniden denemez.
 * Önceden alınan (`onceden`) bilet, süresi dolmadıysa bir sonraki `bilet()` çağrısında harcanır (açılışta oturumu sınamak için).
 */
import type { GirisBiletYaniti } from "@bolge/protokol";
import { GirisHatasi } from "./api";
import type { GirisApi, GirisSonucu } from "./api";

/** Sunucu bilet ömrü (protokol belgesi: 60 sn). Süre yerel alınma anından sayılır (sunucu saatine güvenilmez). */
export const BILET_OMRU_MS = 60_000;
/** Bu kadar süresi kalan bilet kullanılmaz (ağ gecikmesi payı). */
export const BILET_MARJI_MS = 10_000;
/** Sessiz `hiz_siniri` yeniden deneme sayısı (sonra `GirisHatasi hiz_siniri`). */
export const BILET_HIZ_DENEMESI = 5;

export interface BiletSaglayiciSecenekleri {
  api: Pick<GirisApi, "bilet">;
  /** Yerel saat (ms); sınamada sahte. */
  simdi?: () => number;
  /** Bekleme (sınamada anında). */
  uyu?: (ms: number) => Promise<void>;
  marjMs?: number;
  hizDenemesi?: number;
}

export class BiletSaglayici {
  private readonly api: Pick<GirisApi, "bilet">;
  private readonly simdi: () => number;
  private readonly uyu: (ms: number) => Promise<void>;
  private readonly marjMs: number;
  private readonly hizDenemesi: number;
  private onbellek: { yanit: GirisBiletYaniti; alinma: number } | null = null;
  private onceden_: Promise<GirisBiletYaniti> | null = null;
  private readonly oturumYokDinleyicileri = new Set<() => void>();
  /** Alınan bilet sayısı (sınama kancası). */
  alinan = 0;

  constructor(s: BiletSaglayiciSecenekleri) {
    this.api = s.api;
    this.simdi = s.simdi ?? (() => Date.now());
    this.uyu = s.uyu ?? ((ms) => new Promise((c) => setTimeout(c, ms)));
    this.marjMs = s.marjMs ?? BILET_MARJI_MS;
    this.hizDenemesi = s.hizDenemesi ?? BILET_HIZ_DENEMESI;
  }

  /** Oturum bittiğinde (401) bir kez çağrılır; dönen işlev dinlemeyi bırakır. */
  oturumYokDinle(f: () => void): () => void {
    this.oturumYokDinleyicileri.add(f);
    return () => this.oturumYokDinleyicileri.delete(f);
  }

  /**
   * `WsBaglanti.token` işlevi: taze bir bilet döndürür (önceden alınan geçerliyse onu harcar). Fırlatırsa `GirisHatasi`.
   * Ok işlevi: doğrudan `{ token: saglayici.bilet }` olarak verilebilir.
   */
  readonly bilet = async (): Promise<string> => {
    const o = this.onbellek;
    this.onbellek = null; // tek kullanımlık: bir kez verilir
    if (o && this.simdi() - o.alinma < BILET_OMRU_MS - this.marjMs) return o.yanit.bilet;
    return (await this.al()).bilet;
  };

  /**
   * Açılışta oturumu sınar ve ileride harcanacak bileti hazırlar. Eşzamanlı çağrılar aynı isteği paylaşır.
   * Oturum yoksa `GirisHatasi` (`oturum_yok`) fırlatır ve dinleyicileri ÇAĞIRMAZ (açılışta "oturum doldu" değil, giriş ekranı gösterilir):
   * çağıran karar verir.
   */
  onceden(): Promise<GirisBiletYaniti> {
    if (this.onceden_) return this.onceden_;
    const p = this.al(false).then((y) => {
      this.onbellek = { yanit: y, alinma: this.simdi() };
      return y;
    });
    this.onceden_ = p;
    const birak = (): void => {
      if (this.onceden_ === p) this.onceden_ = null;
    };
    p.then(birak, birak);
    return p;
  }

  /** Önbellekteki bileti atar (çıkış/oturum bitişi). */
  temizle(): void {
    this.onbellek = null;
  }

  /** Bir bilet alır; 429'da sessizce bekleyip yeniden dener. `bildir`: 401'de dinleyicileri çağır. */
  private async al(bildir = true): Promise<GirisBiletYaniti> {
    let son: GirisSonucu<GirisBiletYaniti> | null = null;
    for (let d = 0; d < this.hizDenemesi; d++) {
      son = await this.api.bilet();
      if (son.tamam) {
        this.alinan++;
        return son.veri;
      }
      if (son.kod !== "hiz_siniri") break;
      await this.uyu(Math.max(1, son.beklemeSn ?? 2) * 1000);
    }
    if (!son || son.tamam) throw new GirisHatasi({ kod: "ag_hatasi" });
    if (son.kod === "oturum_yok" && bildir) for (const f of [...this.oturumYokDinleyicileri]) f();
    throw new GirisHatasi(son);
  }
}
