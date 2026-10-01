/**
 * Sağlık ve metrik uçları (Alfa-0 işletim): Prometheus metin biçimi, commit gecikmesi histogramı, yetişme göstergeleri, güvenlik
 * (ayrı port, varsayılan localhost, loopback dışı token şartı, kişisel veri yok) ve CLI ortam değişkenleri. Sahte ölçü/duvar saati.
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { GelistirmeKimligi } from "../src/kimlik";
import { Histogram, metrikGuvenliMi, metrikMetni, saglikYaniti } from "../src/metrik";
import { SunucuIstemcisi } from "../src/istemci";
import { DuvarSaati, ElleSaat, VARSAYILAN_DUNYA_EPOCH_MS } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import type { CalisanSunucu } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import { KUZEY, SIR, katil, token, veri } from "./yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

const kapatilacak: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const f of kapatilacak.splice(0).reverse()) await f().catch(() => undefined);
});

/** Ölçü saati sahte: elle ilerletilir. */
class SahteOlcu {
  ms = 1000;
  readonly oku = (): number => this.ms;
}

/** Metin biçimi: her örnek satırı `ad{etiket}? değer`; HELP/TYPE örnekten önce; histogram kümeleri kümülatif ve artmayan. */
function metinDogrula(metin: string): Map<string, number> {
  const degerler = new Map<string, number>();
  const turler = new Set<string>();
  for (const satir of metin.split("\n")) {
    if (satir === "") continue;
    if (satir.startsWith("# HELP ")) continue;
    if (satir.startsWith("# TYPE ")) {
      turler.add((satir.split(" ")[2]) as string);
      continue;
    }
    const m = /^([a-z_][a-z0-9_]*)(\{[^}]*\})? (-?[0-9.]+(?:e[+-]?[0-9]+)?)$/.exec(satir);
    expect(m, `gecersiz satir: ${satir}`).not.toBeNull();
    const ad = (m as RegExpExecArray)[1] as string;
    const temel = ad.replace(/_(bucket|sum|count)$/, "");
    expect(turler.has(ad) || turler.has(temel), `TYPE yok: ${ad}`).toBe(true);
    degerler.set(ad + ((m as RegExpExecArray)[2] ?? ""), Number((m as RegExpExecArray)[3]));
  }
  // Histogram: kümeler kümülatif.
  let onceki = -1;
  for (const [k, v] of degerler) {
    if (k.startsWith("bolge_commit_gecikme_ms_bucket")) {
      expect(v).toBeGreaterThanOrEqual(onceki);
      onceki = v;
    }
  }
  return degerler;
}

async function sunucuKur(ek: { metrik?: { port: number; host?: string; token?: string }; yazar?: Partial<ConstructorParameters<typeof Object>[0]> } = {}): Promise<{ sunucu: CalisanSunucu; yazar: DunyaYazari; olcu: SahteOlcu; saat: ElleSaat }> {
  const olcu = new SahteOlcu();
  const saat = new ElleSaat();
  const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo: bellekDeposu(), saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, olcuSaati: olcu.oku });
  const sunucu = await sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0, ...(ek.metrik ? { metrik: ek.metrik } : {}) });
  kapatilacak.push(() => sunucu.kapat());
  return { sunucu, yazar, olcu, saat };
}

describe("histogram ve metin bicimi (saf)", () => {
  it("kumeler kumulatif, toplam/sayi, nicelikler (son pencere)", () => {
    const h = new Histogram();
    for (const v of [1, 3, 3, 8, 30, 30, 30, 120, 600, 7000]) h.gozle(v);
    expect(h.sayi).toBe(10);
    expect(h.toplam).toBe(7825);
    expect(h.kume[0]).toBe(1); // le=1
    expect(h.kume[2]).toBe(3); // le=5
    expect(h.kume[5]).toBe(7); // le=50
    expect(h.kume.at(-1)).toBe(9); // le=5000 (7000 hariç)
    expect(h.nicelik(0.5)).toBe(30);
    expect(h.nicelik(0.95)).toBe(7000);
    expect(new Histogram().nicelik(0.95)).toBe(0);
    // Pencere: eski örnekler dışarı kayar.
    const p = new Histogram();
    for (let i = 0; i < 2048; i++) p.gozle(1000);
    for (let i = 0; i < 2048; i++) p.gozle(2);
    expect(p.nicelik(0.95)).toBe(2);
    expect(p.sayi).toBe(4096);
  });

  it("metrikMetni: gecerli Prometheus metni; ayni girdi ayni metin; saglik yanitlari", () => {
    const h = new Histogram();
    h.gozle(4);
    const girdi = {
      baglanti: 2, bagliOyuncu: 1, komutTamam: 5, komutBasarisiz: 2, reddedilen: { hizSiniri: 1, yetisiyor: 3 }, tur: 10, seq: 7, simZamaniMs: 99, bekleyenKomut: 0,
      yetisiyor: true, yetismeKalanMs: 3600000, saatGerideMs: 0, olumcul: false, goruntuSayisi: 2, goruntuHatasi: 0, goruntuYasiSimMs: 5, goruntuYasiSaniye: 1.5, goruntuBayt: 1234, goruntuSureSonMs: 12.5, goruntuSureEnUzunMs: 40,
      goruntuIsci: { kopyaSonMs: 3.5, kopyaEnUzunMs: 9, isciSonMs: 80, alinan: 4, atlanan: 2, hata: 1 }, yayin: { atlananKare: 6, yavasKopan: 1, sira: 3 }, olayDongusu: { p50Ms: 10.5, p99Ms: 40, maxMs: 120.5 },
      depo: { gunlukBayt: 10, goruntuBayt: 20 }, commit: h, surec: { rssBayt: 1, heapBayt: 2, cpuSaniye: 0.5 }, calismaSaniye: 3,
    };
    const m = metrikMetni(girdi);
    expect(metrikMetni(girdi)).toBe(m);
    const d = metinDogrula(m);
    expect(d.get("bolge_bagli_oyuncu")).toBe(1);
    expect(d.get('bolge_komut_toplam{sonuc="basarisiz"}')).toBe(2);
    expect(d.get('bolge_komut_reddedilen_toplam{neden="yetisiyor"}')).toBe(3);
    expect(d.get("bolge_yetisme_kalan_ms")).toBe(3600000);
    expect(d.get('bolge_commit_gecikme_ms_bucket{le="5"}')).toBe(1);
    expect(d.get('bolge_commit_gecikme_ms_bucket{le="+Inf"}')).toBe(1);
    expect(d.get("bolge_depo_gunluk_bayt")).toBe(10);
    expect(d.get("bolge_goruntu_kopya_son_ms")).toBe(3.5);
    expect(d.get("bolge_goruntu_isci_son_ms")).toBe(80);
    expect(d.get("bolge_goruntu_atlanan_toplam")).toBe(2);
    expect(d.get("bolge_goruntu_isci_hata_toplam")).toBe(1);
    expect(d.get("bolge_yayin_atlanan_kare_toplam")).toBe(6);
    expect(d.get("bolge_yayin_yavas_kopan_toplam")).toBe(1);
    expect(d.get("bolge_yayin_sira")).toBe(3);
    expect(d.get("bolge_olay_dongusu_gecikme_p50_ms")).toBe(10.5);
    expect(d.get("bolge_olay_dongusu_gecikme_p99_ms")).toBe(40);
    expect(d.get("bolge_olay_dongusu_gecikme_en_buyuk_ms")).toBe(120.5);
    expect(metrikMetni({ ...girdi, depo: null })).not.toContain("bolge_depo_");
    expect(saglikYaniti({ durum: "ok", seq: 1, simZamaniMs: 2 }, "/saglik").kod).toBe(200);
    expect(saglikYaniti({ durum: "yetisiyor", seq: 1, simZamaniMs: 2 }, "/saglik").kod).toBe(200);
    expect(saglikYaniti({ durum: "yetisiyor", seq: 1, simZamaniMs: 2 }, "/hazir").kod).toBe(503);
    expect(saglikYaniti({ durum: "olumcul", seq: 1, simZamaniMs: 2 }, "/saglik").kod).toBe(503);
    expect(saglikYaniti({ durum: "kapaniyor", seq: 1, simZamaniMs: 2 }, "/saglik").kod).toBe(503);
  });
});

describe("yazar sayaclari (sahte olcu saati)", () => {
  it("commit gecikmesi = kuyruga giris -> uygulama; komut sayaclari; goruntu yasi ve boyutu", async () => {
    const olcu = new SahteOlcu();
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo: bellekDeposu(), saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, olcuSaati: olcu.oku });
    const m = y.metrikler;
    expect(m.goruntu).toBe(1); // açılış görüntüsü
    expect(m.sonGoruntuOlcu).toBe(1000);
    expect(m.sonGoruntuBayt).toBeGreaterThan(1000);
    const p = [
      y.komutGonder(SISTEM_OYUNCUSU, "t", "k1", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY }),
      y.komutGonder("ali", "t", "k2", { tur: "vergi_ayarla", oranPpm: 2_000_000 }), // aralık dışı: başarısız
    ];
    olcu.ms += 30; // kuyrukta 30 ms bekledi
    await y.birTur();
    await Promise.all(p);
    expect(m.komutTamam).toBe(1);
    expect(m.komutBasarisiz).toBe(1);
    expect(m.commit.sayi).toBe(2);
    expect(m.commit.toplam).toBe(60);
    expect(m.commit.nicelik(0.95)).toBe(30);
    const q = y.komutGonder("ali", "t", "k3", { tur: "vergi_ayarla", oranPpm: 90_000 });
    olcu.ms += 400;
    await y.birTur();
    await q;
    expect(m.commit.nicelik(0.95)).toBe(400);
    expect(m.commit.sayi).toBe(3);
    expect(m.tur).toBe(2);
    await y.goruntuAl();
    expect(m.goruntu).toBe(2);
    expect(m.sonGoruntuOlcu).toBe(1430);
    await y.kapat();
  });
});

describe("sunucu ucları", () => {
  it("/metrik ayri portta, ana portta yok; /saglik ve /hazir ana portta; kisisel veri yok; sayaclar", async () => {
    const { sunucu, olcu, saat } = await sunucuKur({ metrik: { port: 0 } });
    expect(sunucu.metrikPort).toBeGreaterThan(0);
    expect(sunucu.metrikPort).not.toBe(sunucu.port);
    const ana = `http://127.0.0.1:${sunucu.port}`;
    const mt = `http://127.0.0.1:${sunucu.metrikPort}`;
    // Ana portta /metrik YOK (WebSocket portu); sağlık var.
    expect((await fetch(`${ana}/metrik`)).status).toBe(404);
    const s = await fetch(`${ana}/saglik`);
    expect(s.status).toBe(200);
    expect(await s.json()).toMatchObject({ durum: "ok" });
    expect((await fetch(`${ana}/hazir`)).status).toBe(200);
    expect((await fetch(`${ana}/baska`)).status).toBe(404);

    // Oyuncular bağlanır ve komut verir.
    const y = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token(SISTEM_OYUNCUSU), "yonetici-ist");
    await katil(y, "ali-gizli-kimlik", KUZEY);
    const ali = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("ali-gizli-kimlik"), "ali-ist");
    kapatilacak.push(() => ali.kapat(), () => y.kapat());
    olcu.ms += 5;
    const r = await ali.komut("a1", { tur: "vergi_ayarla", oranPpm: 90_000 });
    expect(r.tur).toBe("komutSonucu");
    saat.ilerlet(SAAT);
    olcu.ms += 7000;

    const yanit = await fetch(`${mt}/metrik`);
    expect(yanit.status).toBe(200);
    expect(yanit.headers.get("content-type")).toContain("version=0.0.4");
    const metin = await yanit.text();
    const d = metinDogrula(metin);
    expect(d.get("bolge_baglanti")).toBe(2);
    expect(d.get("bolge_bagli_oyuncu")).toBe(1); // yönetici sayılmaz
    expect(d.get('bolge_komut_toplam{sonuc="tamam"}')).toBe(2);
    expect(d.get("bolge_seq")).toBe(2);
    expect(d.get("bolge_yetisiyor")).toBe(0);
    expect(d.get("bolge_goruntu_toplam")).toBe(1);
    expect(d.get("bolge_goruntu_sure_son_ms")).toBeGreaterThanOrEqual(0);
    expect(d.get("bolge_goruntu_sure_en_uzun_ms")).toBeGreaterThanOrEqual(d.get("bolge_goruntu_sure_son_ms") ?? 0);
    expect(d.get("bolge_son_goruntu_yasi_saniye")).toBeGreaterThanOrEqual(7);
    expect(d.get("bolge_depo_gunluk_bayt")).toBeGreaterThan(0);
    expect(d.get("bolge_depo_goruntu_bayt")).toBeGreaterThan(0);
    expect(d.get("bolge_commit_gecikme_ms_count")).toBe(2);
    expect(d.get("bolge_goruntu_atlanan_toplam")).toBe(0);
    expect(d.get("bolge_yayin_yavas_kopan_toplam")).toBe(0);
    expect(d.get("bolge_olay_dongusu_gecikme_en_buyuk_ms")).toBeGreaterThanOrEqual(0);
    // Kişisel veri yok: oyuncu kimliği, token, istemci kimliği metinde geçmez.
    for (const yasak of ["ali-gizli-kimlik", token("ali-gizli-kimlik"), "ali-ist", "yonetici-ist", SISTEM_OYUNCUSU]) expect(metin).not.toContain(yasak);
    expect(await sunucu.metrikMetni()).toContain("bolge_bagli_oyuncu 1");
    // Metrik sunucusunda da sağlık var; yanlış yöntem/yol reddedilir.
    expect((await fetch(`${mt}/saglik`)).status).toBe(200);
    expect((await fetch(`${mt}/baska`)).status).toBe(404);
    expect((await fetch(`${mt}/metrik`, { method: "POST" })).status).toBe(405);
    await ali.kapat();
  });

  it("olay dongusu gecikmesi (perf_hooks): ana is parcacigini tutan is metrikte en buyuk gecikme olarak gorulur", async () => {
    const { sunucu } = await sunucuKur({ metrik: { port: 0 } });
    await new Promise((r) => setTimeout(r, 250)); // histogram dolsun (10 ms cozunurluk)
    const once = metinDogrula(await sunucu.metrikMetni());
    // 120 ms boyunca olay dongusunu tut (senkron is).
    const bas = performance.now();
    while (performance.now() - bas < 120) {
      /* mesgul */
    }
    await new Promise((r) => setTimeout(r, 40)); // gecikme ornegi kaydedilsin
    const sonra = metinDogrula(await sunucu.metrikMetni());
    expect(sonra.get("bolge_olay_dongusu_gecikme_en_buyuk_ms")).toBeGreaterThanOrEqual(100);
    expect(sonra.get("bolge_olay_dongusu_gecikme_p99_ms")).toBeGreaterThanOrEqual(sonra.get("bolge_olay_dongusu_gecikme_p50_ms") ?? 0);
    expect(sonra.get("bolge_olay_dongusu_gecikme_en_buyuk_ms")).toBeGreaterThan(once.get("bolge_olay_dongusu_gecikme_en_buyuk_ms") ?? 0);
  });

  it("yetisme: /saglik 200 (yetisiyor), /hazir 503, metrikte yetisiyor=1 ve kalan sure; reddedilen komut sayaci; bitince ok", async () => {
    let ms = VARSAYILAN_DUNYA_EPOCH_MS + SAAT;
    const depo = bellekDeposu();
    const ac = (ek: { kanca?: () => Promise<void> } = {}) =>
      DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat: new DuvarSaati(1, { duvar: () => ms }), commitAraligiMs: 15, ilerlemeAraligiMs: 0, ...(ek.kanca ? { yetismeAdimKancasi: ek.kanca } : {}) });
    const y1 = await ac();
    while (y1.yetisiyor) await y1.birTur();
    await y1.kapat();
    ms += 3 * 24 * SAAT;
    let birak!: () => void;
    const kapi = new Promise<void>((c) => (birak = c));
    const y2 = await ac({ kanca: () => kapi });
    const sunucu = await sunucuBaslat({ yazar: y2, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0, metrik: { port: 0 } });
    kapatilacak.push(() => sunucu.kapat());
    const ali = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("ali"), "ali-ist");
    kapatilacak.push(() => ali.kapat());
    try {
      const s = await fetch(`http://127.0.0.1:${sunucu.port}/saglik`);
      expect(s.status).toBe(200);
      expect(await s.json()).toMatchObject({ durum: "yetisiyor" });
      expect((await fetch(`http://127.0.0.1:${sunucu.port}/hazir`)).status).toBe(503);
      const rd = await ali.komut("erken", { tur: "vergi_ayarla", oranPpm: 90_000 });
      expect(rd.tur === "hata" && rd.kod).toBe("yetisiyor");
      const d = metinDogrula(await (await fetch(`http://127.0.0.1:${sunucu.metrikPort}/metrik`)).text());
      expect(d.get("bolge_yetisiyor")).toBe(1);
      expect(d.get("bolge_yetisme_kalan_ms")).toBeGreaterThan(0);
      expect(d.get('bolge_komut_reddedilen_toplam{neden="yetisiyor"}')).toBe(1);
    } finally {
      birak();
    }
    for (let n = 0; n < 400 && y2.yetisiyor; n++) await new Promise((r) => setTimeout(r, 5));
    expect(y2.yetisiyor).toBe(false);
    expect((await fetch(`http://127.0.0.1:${sunucu.port}/hazir`)).status).toBe(200);
    const d2 = metinDogrula(await (await fetch(`http://127.0.0.1:${sunucu.metrikPort}/metrik`)).text());
    expect(d2.get("bolge_yetisiyor")).toBe(0);
    expect(d2.get("bolge_yetisme_kalan_ms")).toBe(0);
  }, 30_000);

  it("hiz siniri reddi sayilir", async () => {
    const { sunucu } = await (async () => {
      const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo: bellekDeposu(), saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
      const sunucu = await sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0, hizSiniri: { kapasite: 1, saniyeBasina: 0.0001 }, metrik: { port: 0 } });
      kapatilacak.push(() => sunucu.kapat());
      return { sunucu };
    })();
    const ali = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("ali"), "i");
    kapatilacak.push(() => ali.kapat());
    await ali.komut("a1", { tur: "vergi_ayarla", oranPpm: 1 });
    const r = await ali.komut("a2", { tur: "vergi_ayarla", oranPpm: 2 });
    expect(r.tur === "hata" && r.kod).toBe("hiz_siniri");
    expect(metinDogrula(await sunucu.metrikMetni()).get('bolge_komut_reddedilen_toplam{neden="hiz_siniri"}')).toBe(1);
  });
});

describe("metrik guvenligi", () => {
  it("loopback disi adres token ister (>= 16 karakter); sunucu baslamaz ve port sizmaz", async () => {
    expect(() => metrikGuvenliMi("127.0.0.1", undefined)).not.toThrow();
    expect(() => metrikGuvenliMi("localhost", undefined)).not.toThrow();
    expect(() => metrikGuvenliMi("::1", undefined)).not.toThrow();
    expect(() => metrikGuvenliMi("0.0.0.0", undefined)).toThrow(/token/);
    expect(() => metrikGuvenliMi("10.0.0.5", "kisa")).toThrow(/16 karakter/);
    expect(() => metrikGuvenliMi("0.0.0.0", "x".repeat(16))).not.toThrow();
    const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo: bellekDeposu(), saat: new ElleSaat(), commitAraligiMs: 15 });
    kapatilacak.push(() => yazar.kapat());
    await expect(sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: 0, metrik: { port: 0, host: "0.0.0.0" } })).rejects.toThrow(/token/);
  });

  it("token verilmisse /metrik Bearer ister (yanlis/eksik 401); /saglik tokensiz acik", async () => {
    const TOKEN = "gizli-metrik-token-123456";
    const { sunucu } = await sunucuKur({ metrik: { port: 0, token: TOKEN } });
    const mt = `http://127.0.0.1:${sunucu.metrikPort}`;
    expect((await fetch(`${mt}/metrik`)).status).toBe(401);
    expect((await fetch(`${mt}/metrik`, { headers: { authorization: "Bearer yanlis-token-0000000" } })).status).toBe(401);
    expect((await fetch(`${mt}/metrik`, { headers: { authorization: TOKEN } })).status).toBe(401); // "Bearer " öneki şart
    const ok = await fetch(`${mt}/metrik`, { headers: { authorization: `Bearer ${TOKEN}` } });
    expect(ok.status).toBe(200);
    expect(await ok.text()).not.toContain(TOKEN);
    expect((await fetch(`${mt}/saglik`)).status).toBe(200);
  });
});

describe("CLI ortam degiskenleri", () => {
  interface Surec {
    p: ChildProcess;
    olaylar: Array<Record<string, unknown>>;
    ilk: Promise<Record<string, unknown>>;
  }
  function baslat(ortam: Record<string, string>, ...args: string[]): Surec {
    const p = spawn(process.execPath, ["--import", "tsx", CLI, ...args], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...ortam } });
    kapatilacak.push(async () => {
      if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
    });
    const olaylar: Array<Record<string, unknown>> = [];
    const ilk = new Promise<Record<string, unknown>>((coz, reddet) => {
      let tampon = "";
      p.stdout?.on("data", (b: Buffer) => {
        tampon += b.toString();
        for (const satir of tampon.split("\n")) {
          if (!satir.startsWith("{")) continue;
          const o = JSON.parse(satir) as Record<string, unknown>;
          if (olaylar.some((x) => JSON.stringify(x) === satir)) continue;
          olaylar.push(o);
          if (o.olay === "hazir" || o.olay === "olumcul") coz(o);
        }
      });
      p.once("exit", (kod) => reddet(new Error(`cikti: ${kod}`)));
    });
    return { p, olaylar, ilk };
  }

  it("yalniz ortam degiskenleriyle acilir: port, harita, depo, elle saat, metrik; /saglik ve /metrik cevap verir", async () => {
    const s = baslat({ BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_DEPO: "bellek", BOLGE_ELLE_SAAT: "1", BOLGE_METRIK_PORT: "0", BOLGE_GOC: "1", BOLGE_TOHUM: "9" });
    const hazir = await s.ilk;
    expect(hazir.olay).toBe("hazir");
    expect(typeof hazir.metrikPort).toBe("number");
    expect((await fetch(`http://127.0.0.1:${hazir.port}/saglik`)).status).toBe(200);
    const m = await (await fetch(`http://127.0.0.1:${hazir.metrikPort}/metrik`)).text();
    expect(m).toContain("bolge_seq");
    // Bayrak ortamdan üstündür: --harita sentetik (ortam mini).
    const s2 = baslat({ BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_DEPO: "bellek", BOLGE_ELLE_SAAT: "1" }, "--harita", "sentetik");
    expect((await s2.ilk).olay).toBe("hazir");
    // Metrik portu verilmediyse kapalı.
    expect((await s2.ilk).metrikPort).toBeNull();
  }, 30_000);

  it("uretim kipi: acik sir ister, elle saat yasak; dunya epoch ortamdan dogrulanir; loopback disi metrik token ister", async () => {
    const hata = async (ortam: Record<string, string>): Promise<string> => {
      const s = baslat({ BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_DEPO: "bellek", ...ortam });
      const o = await s.ilk;
      expect(o.olay).toBe("olumcul");
      return String(o.hata);
    };
    expect(await hata({ BOLGE_URETIM: "1" })).toMatch(/BOLGE_GELISTIRME_SIRRI/);
    expect(await hata({ BOLGE_URETIM: "1", BOLGE_GELISTIRME_SIRRI: "kisa" })).toMatch(/16 karakter/);
    expect(await hata({ BOLGE_URETIM: "1", BOLGE_GELISTIRME_SIRRI: "degistir-uzun-rastgele-imza-sirri" })).toMatch(/ornek/);
    expect(await hata({ BOLGE_URETIM: "1", BOLGE_GELISTIRME_SIRRI: "x".repeat(24), BOLGE_METRIK_TOKEN: "degistir-uzun-rastgele-metrik-tokeni" })).toMatch(/metrik token/);
    expect(await hata({ BOLGE_URETIM: "1", BOLGE_GELISTIRME_SIRRI: "x".repeat(24), BOLGE_ELLE_SAAT: "1" })).toMatch(/elle-saat yasak/);
    expect(await hata({ BOLGE_DUNYA_EPOCH: "2026-09-30T21:30:00Z" })).toMatch(/gece yarisi/);
    expect(await hata({ BOLGE_METRIK_PORT: "0", BOLGE_METRIK_HOST: "0.0.0.0" })).toMatch(/token/);
    const iyi = baslat({ BOLGE_PORT: "0", BOLGE_HARITA: "mini", BOLGE_DEPO: "bellek", BOLGE_URETIM: "1", BOLGE_GELISTIRME_SIRRI: "uretim-sirri-0123456789" });
    expect((await iyi.ilk).olay).toBe("hazir");
  }, 60_000);
});
