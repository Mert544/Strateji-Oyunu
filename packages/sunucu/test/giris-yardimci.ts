/** E-posta girişi testlerinin ortak kurulumu: enjekte saat, dosya/bellek postacısı, gerçek sunucu, çerez tutan HTTP istemcisi. */
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Depo, HesapDeposu } from "../src/depo/tipler";
import { bellekDeposu } from "../src/depo/bellek";
import { geciciAlanlariYukle } from "../src/giris/eposta";
import { GirisHizmeti } from "../src/giris/hizmet";
import type { GirisHizmetiSecenekleri } from "../src/giris/hizmet";
import { GirisUclari } from "../src/giris/http";
import type { GirisUclariSecenekleri } from "../src/giris/http";
import { DosyaPostaGondericisi } from "../src/giris/posta";
import type { Posta, PostaGonderici } from "../src/giris/posta";
import { SunucuIstemcisi } from "../src/istemci";
import { mulkVerisi, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

export const BILET_SIRRI = "test-bilet-sirri-0123456789abcdef";
export const IZINLI = "https://oyun.ornek.org";
export const GUN = 24 * 3_600_000;

export class SahteSaat {
  constructor(public t = 1_800_000_000_000) {}
  simdi = (): number => this.t;
  ilerlet(ms: number): void {
    this.t += ms;
  }
}

/** Çerez kavanozlu "tarayıcı": her istek Origin ve Cookie gönderir, Set-Cookie'yi saklar. */
export class Tarayici {
  readonly cerezler = new Map<string, string>();
  /** Son yanıtın ham Set-Cookie başlıkları. */
  sonSetCookie: string[] = [];

  constructor(
    readonly taban: string,
    public origin: string | null = IZINLI,
  ) {}

  cerezBaslik(): string {
    return [...this.cerezler].map(([a, d]) => `${a}=${d}`).join("; ");
  }

  async istek(yol: string, o: { yontem?: string; govde?: unknown; ham?: string; tur?: string; origin?: string | null } = {}): Promise<{ durum: number; govde: string; json: Record<string, unknown> | null; baslik: Headers }> {
    const baslik: Record<string, string> = {};
    const origin = o.origin === undefined ? this.origin : o.origin;
    if (origin !== null) baslik.origin = origin;
    const cerez = this.cerezBaslik();
    if (cerez !== "") baslik.cookie = cerez;
    let govde: string | undefined;
    if (o.ham !== undefined) {
      govde = o.ham;
      baslik["content-type"] = o.tur ?? "application/x-www-form-urlencoded";
    } else if (o.govde !== undefined) {
      govde = JSON.stringify(o.govde);
      baslik["content-type"] = o.tur ?? "application/json";
    }
    const r = await fetch(`${this.taban}${yol}`, { method: o.yontem ?? (govde !== undefined ? "POST" : "GET"), headers: baslik, ...(govde !== undefined ? { body: govde } : {}), redirect: "manual" });
    this.sonSetCookie = r.headers.getSetCookie();
    for (const s of this.sonSetCookie) {
      const [cift = ""] = s.split(";");
      const i = cift.indexOf("=");
      const ad = cift.slice(0, i);
      const deger = cift.slice(i + 1);
      if (/max-age=0(;|$)/i.test(s)) this.cerezler.delete(ad);
      else this.cerezler.set(ad, deger);
    }
    const metin = await r.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(metin) as Record<string, unknown>;
    } catch {
      json = null;
    }
    return { durum: r.status, govde: metin, json, baslik: r.headers };
  }

  post(yol: string, govde?: unknown, o: { origin?: string | null } = {}) {
    return this.istek(yol, { yontem: "POST", ...(govde !== undefined ? { govde } : {}), ...(o.origin !== undefined ? { origin: o.origin } : {}) });
  }
}

export interface GirisOrtami {
  ts: TestSunucusu;
  hizmet: GirisHizmeti;
  uclar: GirisUclari;
  saat: SahteSaat;
  /** Gönderilen bütün posta (dosya postacısıyla: dizinden okunur). */
  hesapDeposu: HesapDeposu;
  taban: string;
  postaDizini: string;
  gunluk: Array<{ olay: string; veri: Record<string, string | number | boolean> }>;
  yeniTarayici(): Tarayici;
  /** Posta dizinindeki son postayı okur ve bağlantıdaki jetonu (`j`) döndürür. */
  sonPosta(): Promise<{ posta: Posta; jeton: string; baglanti: string }>;
  postaSayisi(): Promise<number>;
  /** Tarayıcıdan istek yapar ve (arka plan bitince) postadaki jetonu döndürür. */
  baglantiIste(t: Tarayici, eposta: string): Promise<{ durum: number; jeton: string }>;
  /** İstek -> posta -> onay: oturumlu tarayıcı. */
  girisYap(t: Tarayici, eposta: string): Promise<{ oyuncu: string; yeniHesap: boolean }>;
  kapat(): Promise<void>;
}

export interface GirisOrtamiSecenekleri {
  hizmet?: Partial<Omit<GirisHizmetiSecenekleri, "depo" | "sirlar" | "baglantiTabani">>;
  uclar?: Partial<Omit<GirisUclariSecenekleri, "hizmet">>;
  depo?: Depo;
  posta?: PostaGonderici;
  veri?: ReturnType<typeof mulkVerisi>;
}

export async function girisOrtami(s: GirisOrtamiSecenekleri = {}): Promise<GirisOrtami> {
  const saat = new SahteSaat();
  const postaDizini = await mkdtemp(join(tmpdir(), "bolge-posta-"));
  const gunluk: GirisOrtami["gunluk"] = [];
  const hesapDeposu = (s.depo?.hesap ?? bellekDeposu().hesap) as HesapDeposu;
  let taban = "http://127.0.0.1:0";
  const hizmet = new GirisHizmeti({
    depo: hesapDeposu,
    posta: s.posta ?? new DosyaPostaGondericisi(postaDizini, saat.simdi),
    sirlar: [BILET_SIRRI],
    baglantiTabani: () => `${taban}/giris/onay`,
    geciciAlanlar: geciciAlanlariYukle(),
    simdi: saat.simdi,
    gunluk: (olay, veri) => void gunluk.push({ olay, veri: veri ?? {} }),
    ...s.hizmet,
  });
  const uclar = new GirisUclari({ hizmet, izinliKokenler: [IZINLI], ...s.uclar });
  // Görünen ad açıksa (adKurali) kareye hizmetin ad önbelleği bağlanır (CLI ile aynı bağ: `adCozucu`).
  const ts = await testSunucusu({ veri: s.veri ?? mulkVerisi(), sunucu: { kimlik: hizmet.kimlik, giris: uclar, ...(hizmet.adAcik ? { adCozucu: (o: string) => hizmet.adCoz(o) } : {}) } });
  taban = `http://127.0.0.1:${ts.sunucu.port}`;
  uclar.kokenEkle(taban);

  const o: GirisOrtami = {
    ts,
    hizmet,
    uclar,
    saat,
    hesapDeposu,
    get taban() {
      return taban;
    },
    postaDizini,
    gunluk,
    yeniTarayici: () => new Tarayici(taban),
    async postaSayisi() {
      return (await readdir(postaDizini).catch(() => [])).filter((a) => a.endsWith(".json")).length;
    },
    async sonPosta() {
      const adlar = (await readdir(postaDizini)).filter((a) => a.endsWith(".json")).sort();
      const son = adlar.at(-1);
      if (!son) throw new Error("posta yok");
      const posta = JSON.parse(await readFile(join(postaDizini, son), "utf8")) as Posta;
      const j = new URL(posta.baglanti).searchParams.get("j");
      if (!j) throw new Error("baglantida jeton yok");
      return { posta, jeton: j, baglanti: posta.baglanti };
    },
    async baglantiIste(t, eposta) {
      const r = await t.post("/giris/istek", { eposta });
      await hizmet.bosta();
      return { durum: r.durum, jeton: r.durum === 202 && (await o.postaSayisi()) > 0 ? (await o.sonPosta()).jeton : "" };
    },
    async girisYap(t, eposta) {
      const { jeton } = await o.baglantiIste(t, eposta);
      const r = await t.post("/giris/onay", { j: jeton });
      if (r.durum !== 200 || !r.json) throw new Error(`onay basarisiz: ${r.durum} ${r.govde}`);
      return { oyuncu: r.json.oyuncu as string, yeniHesap: r.json.yeniHesap as boolean };
    },
    async kapat() {
      await hizmet.bosta();
      await ts.kapat();
      await rm(postaDizini, { recursive: true, force: true });
    },
  };
  return o;
}

/** Bilet ile ws bağlantısı (el sıkışma `hosgeldin` döner ya da fırlatır). */
export function biletleBaglan(o: GirisOrtami, bilet: string, istemci = "test-ist"): Promise<SunucuIstemcisi> {
  return SunucuIstemcisi.baglan(o.ts.url, bilet, istemci);
}
