/**
 * Küçük Node WebSocket istemcisi (testler, yük üreteci, yönetici araçları). Tarayıcı istemcisi aynı protokolü
 * `@bolge/protokol` üzerinden konuşur; bu sınıf yalnız Node içindir (`ws`).
 * Gelen kare/delta'yı uygulayarak `kare`'yi güncel tutar; delta sürümü (`onceki`) uyuşmazsa hata kaydeder.
 */
import WebSocket from "ws";
import type { Komut, Ms } from "@bolge/cekirdek";
import { PROTOKOL_SURUMU, deltaUygula, sunucuMesajiCoz } from "@bolge/protokol";
import type { IlgiKaresi, IstemciMesaji, SunucuMesaji } from "@bolge/protokol";

type Mesaj<T extends SunucuMesaji["tur"]> = Extract<SunucuMesaji, { tur: T }>;

export class SunucuIstemcisi {
  readonly gelenler: SunucuMesaji[] = [];
  kare: IlgiKaresi | null = null;
  rev = 0;
  /** Delta zinciri kopukluğu gibi istemci tarafı tutarsızlıklar. */
  readonly sorunlar: string[] = [];
  hosgeldin: Mesaj<"hosgeldin"> | null = null;
  private bekleyenler: Array<{ kosul: (m: SunucuMesaji) => boolean; coz: (m: SunucuMesaji) => void; reddet: (e: Error) => void; zamanlayici: ReturnType<typeof setTimeout> }> = [];
  private istekSayaci = 0;
  kapanis: { kod: number; neden: string } | null = null;

  private constructor(readonly ws: WebSocket) {
    ws.on("message", (veri) => {
      const r = sunucuMesajiCoz(veri.toString());
      if (!r.tamam) {
        this.sorunlar.push(`cozulemeyen sunucu mesaji: ${r.hata}`);
        return;
      }
      const m = r.mesaj;
      this.gelenler.push(m);
      if (m.tur === "kare") {
        this.kare = m.kare;
        this.rev = m.rev;
      } else if (m.tur === "delta") {
        if (!this.kare || m.onceki !== this.rev) this.sorunlar.push(`delta zinciri kopuk: onceki ${m.onceki}, elde ${this.rev}`);
        else {
          this.kare = deltaUygula(this.kare, m.delta);
          this.rev = m.rev;
        }
      } else if (m.tur === "hosgeldin") {
        this.hosgeldin = m;
      }
      for (const b of [...this.bekleyenler]) {
        if (b.kosul(m)) {
          clearTimeout(b.zamanlayici);
          this.bekleyenler.splice(this.bekleyenler.indexOf(b), 1);
          b.coz(m);
        }
      }
    });
    ws.on("close", (kod, neden) => {
      this.kapanis = { kod, neden: neden.toString() };
      for (const b of this.bekleyenler.splice(0)) {
        clearTimeout(b.zamanlayici);
        b.reddet(new Error(`baglanti kapandi (${kod} ${neden.toString()})`));
      }
    });
  }

  /** Bağlanır; `token` verilirse el sıkışmayı yapar ve `hosgeldin`'i bekler. */
  static async baglan(url: string, token?: string, istemciKimligi = "test-istemci", kuralSurumu?: string): Promise<SunucuIstemcisi> {
    const ws = new WebSocket(url);
    await new Promise<void>((coz, reddet) => {
      ws.once("open", () => coz());
      ws.once("error", reddet);
    });
    const ist = new SunucuIstemcisi(ws);
    if (token !== undefined) {
      const bekle = ist.bekle((m) => m.tur === "hosgeldin" || m.tur === "hata");
      ist.gonder({ tur: "merhaba", protokolSurumu: PROTOKOL_SURUMU, token, istemciKimligi, ...(kuralSurumu ? { kuralSurumu } : {}) });
      const m = await bekle;
      if (m.tur === "hata") throw new Error(`el sikisma reddedildi: ${m.kod} ${m.mesaj}`);
    }
    return ist;
  }

  gonder(m: IstemciMesaji | Record<string, unknown>): void {
    this.ws.send(JSON.stringify(m));
  }

  /** Koşulu sağlayan İLK SONRAKİ mesajı bekler. */
  bekle(kosul: (m: SunucuMesaji) => boolean, zamanAsimiMs = 10_000): Promise<SunucuMesaji> {
    return new Promise((coz, reddet) => {
      const zamanlayici = setTimeout(() => {
        this.bekleyenler = this.bekleyenler.filter((b) => b.zamanlayici !== zamanlayici);
        reddet(new Error("mesaj beklerken zaman asimi"));
      }, zamanAsimiMs);
      this.bekleyenler.push({ kosul, coz, reddet, zamanlayici });
    });
  }

  async abone(bolgeler: string[]): Promise<Mesaj<"kare">> {
    const b = this.bekle((m) => m.tur === "kare" || m.tur === "hata");
    this.gonder({ tur: "abone", bolgeler });
    const m = await b;
    if (m.tur === "hata") throw new Error(`abone reddedildi: ${m.mesaj}`);
    return m as Mesaj<"kare">;
  }

  /** Komutu gönderir; komutSonucu veya aynı anahtarlı hata döner. */
  async komut(anahtar: string, komut: Komut): Promise<Mesaj<"komutSonucu"> | Mesaj<"hata">> {
    const b = this.bekle((m) => (m.tur === "komutSonucu" || m.tur === "hata") && m.anahtar === anahtar);
    this.gonder({ tur: "komut", anahtar, komut });
    return (await b) as Mesaj<"komutSonucu"> | Mesaj<"hata">;
  }

  /** Oyuncunun kendi katılımı (mülk kipi): `katil` gönderir; komutSonucu veya aynı anahtarlı hata döner. */
  async katil(anahtar: string, ilce?: string): Promise<Mesaj<"komutSonucu"> | Mesaj<"hata">> {
    const b = this.bekle((m) => (m.tur === "komutSonucu" || m.tur === "hata") && m.anahtar === anahtar);
    this.gonder({ tur: "katil", anahtar, ...(ilce !== undefined ? { ilce } : {}) });
    return (await b) as Mesaj<"komutSonucu"> | Mesaj<"hata">;
  }

  async ozet(): Promise<Mesaj<"ozet">> {
    const istek = ++this.istekSayaci;
    const b = this.bekle((m) => (m.tur === "ozet" || m.tur === "hata") && m.istek === istek);
    this.gonder({ tur: "ozetIste", istek });
    const m = await b;
    if (m.tur === "hata") throw new Error(`ozet reddedildi: ${m.mesaj}`);
    return m as Mesaj<"ozet">;
  }

  /** Yönetici + elle saat: dünyayı t'ye ilerletir; her şey uygulanınca özet döner. */
  async zamanIlerlet(t: Ms, zamanAsimiMs = 30_000): Promise<Mesaj<"ozet">> {
    const istek = ++this.istekSayaci;
    const b = this.bekle((m) => (m.tur === "ozet" || m.tur === "hata") && m.istek === istek, zamanAsimiMs);
    this.gonder({ tur: "zamanIlerlet", t, istek });
    const m = await b;
    if (m.tur === "hata") throw new Error(`zamanIlerlet reddedildi: ${m.mesaj}`);
    return m as Mesaj<"ozet">;
  }

  async kapat(): Promise<void> {
    if (this.ws.readyState === WebSocket.CLOSED) return;
    await new Promise<void>((coz) => {
      this.ws.once("close", () => coz());
      this.ws.close();
    });
  }
}
