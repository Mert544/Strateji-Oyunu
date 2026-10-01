/**
 * Sağlık ve metrik uçları (Alfa-0 işletim): `/saglik` (canlılık), `/hazir` (yetişme bitti mi) ve `/metrik` (Prometheus metin biçimi 0.0.4).
 *
 * GÜVENLİK KARARI:
 * - `/metrik` ana (WebSocket) porta BAĞLANMAZ; ayrı bir HTTP portunda (`metrik: {port}`) yaşar ve varsayılan olarak YALNIZ localhost'a
 *   (127.0.0.1) bağlanır. Loopback dışı bir adrese (ör. konteyner ağı için 0.0.0.0) bağlanmak bir `token` GEREKTİRİR (Bearer, sabit-zamanlı
 *   karşılaştırma); token yoksa başlatma reddedilir. Token verilmişse localhost'ta da zorunludur.
 * - `/saglik` ve `/hazir` ana portta da (konteyner healthcheck) ve metrik portunda sunulur; yalnız durum ve sayaç içerir.
 * - Metrik ve sağlık çıktısında oyuncu kimliği, ad, token ya da başka kişisel veri YOKTUR (yalnız toplu sayılar).
 */
import { createServer, type Server } from "node:http";
import { timingSafeEqual } from "node:crypto";
import type { AddressInfo } from "node:net";

/** Gecikme histogramı (ms): küme sınırları sabit; ayrıca son `PENCERE` örnekten p50/p95 hesaplanır. */
export const GECIKME_KUMELERI_MS: readonly number[] = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const PENCERE = 2048;

export class Histogram {
  readonly kume: number[];
  sayi = 0;
  toplam = 0;
  private readonly ornek: number[] = [];
  private sira = 0;

  constructor(readonly sinirlar: readonly number[] = GECIKME_KUMELERI_MS) {
    this.kume = new Array<number>(sinirlar.length).fill(0);
  }

  gozle(v: number): void {
    this.sayi++;
    this.toplam += v;
    for (let i = 0; i < this.sinirlar.length; i++) if (v <= (this.sinirlar[i] as number)) this.kume[i] = (this.kume[i] as number) + 1;
    if (this.ornek.length < PENCERE) this.ornek.push(v);
    else {
      this.ornek[this.sira] = v;
      this.sira = (this.sira + 1) % PENCERE;
    }
  }

  /** Son `PENCERE` örnekten q-niceliği (0..1); örnek yoksa 0. */
  nicelik(q: number): number {
    if (this.ornek.length === 0) return 0;
    const s = [...this.ornek].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] as number;
  }
}

/** Yazarın sayaçları (kişisel veri içermez). */
export class YazarMetrikleri {
  komutTamam = 0;
  komutBasarisiz = 0;
  tur = 0;
  goruntu = 0;
  goruntuHatasi = 0;
  /** Komutun kuyruğa girişinden günlüğe yazılıp uygulanıp yanıtlanmasına kadar (ms; `olcuSaati`). */
  readonly commit = new Histogram();
  /** Son görüntünün alındığı ölçü saati anı (ms) ve boyutu (bayt, metin uzunluğu); hiç alınmadıysa null / 0. */
  sonGoruntuOlcu: number | null = null;
  sonGoruntuBayt = 0;
  /** Görüntü alma süresi (ms; serileştirme + depo yazımı, olay döngüsünü tutar): son ve en uzun. */
  sonGoruntuSureMs = 0;
  enUzunGoruntuSureMs = 0;
}

export interface MetrikGirdisi {
  baglanti: number;
  /** Doğrulanmış, yönetici olmayan bağlantı sayısı (kimlik YOK). */
  bagliOyuncu: number;
  komutTamam: number;
  komutBasarisiz: number;
  reddedilen: { hizSiniri: number; yetisiyor: number };
  tur: number;
  seq: number;
  simZamaniMs: number;
  bekleyenKomut: number;
  yetisiyor: boolean;
  yetismeKalanMs: number;
  saatGerideMs: number;
  olumcul: boolean;
  goruntuSayisi: number;
  goruntuHatasi: number;
  /** Son görüntünün sim yaşı (ms) ve (bu süreçte alındıysa) duvar yaşı (sn). */
  goruntuYasiSimMs: number;
  goruntuYasiSaniye: number;
  goruntuBayt: number;
  goruntuSureSonMs: number;
  goruntuSureEnUzunMs: number;
  depo: { gunlukBayt: number; goruntuBayt: number } | null;
  commit: Histogram;
  surec: { rssBayt: number; heapBayt: number; cpuSaniye: number };
  calismaSaniye: number;
}

function satir(ad: string, tur: "counter" | "gauge", yardim: string, v: number | string, etiket = ""): string[] {
  return [`# HELP ${ad} ${yardim}`, `# TYPE ${ad} ${tur}`, `${ad}${etiket} ${v}`];
}

/** Prometheus metin biçimi 0.0.4. Saf işlev: aynı girdi aynı metin. */
export function metrikMetni(g: MetrikGirdisi): string {
  const o: string[] = [];
  const ekle = (...l: string[][]): void => {
    for (const x of l) o.push(...x);
  };
  ekle(
    satir("bolge_baglanti", "gauge", "Acik WebSocket baglanti sayisi.", g.baglanti),
    satir("bolge_bagli_oyuncu", "gauge", "Bagli (dogrulanmis, oyuncu kimlikli) oyuncu baglantisi sayisi.", g.bagliOyuncu),
  );
  o.push("# HELP bolge_komut_toplam Uygulanan komutlar (sonuca gore).", "# TYPE bolge_komut_toplam counter");
  o.push(`bolge_komut_toplam{sonuc="tamam"} ${g.komutTamam}`, `bolge_komut_toplam{sonuc="basarisiz"} ${g.komutBasarisiz}`);
  o.push("# HELP bolge_komut_reddedilen_toplam Gunluge girmeden reddedilen komutlar (nedene gore).", "# TYPE bolge_komut_reddedilen_toplam counter");
  o.push(`bolge_komut_reddedilen_toplam{neden="hiz_siniri"} ${g.reddedilen.hizSiniri}`, `bolge_komut_reddedilen_toplam{neden="yetisiyor"} ${g.reddedilen.yetisiyor}`);
  ekle(
    satir("bolge_tur_toplam", "counter", "Grup commit turu sayisi.", g.tur),
    satir("bolge_seq", "gauge", "Son uygulanan gunluk sira numarasi.", g.seq),
    satir("bolge_sim_zamani_ms", "gauge", "Dunyanin sim zamani (ms).", g.simZamaniMs),
    satir("bolge_bekleyen_komut", "gauge", "Gunluge yazilmayi bekleyen komut sayisi.", g.bekleyenKomut),
    satir("bolge_yetisiyor", "gauge", "Sunucu kapaliyken gecen sureyi yetistiriyor (1) ya da guncel (0).", g.yetisiyor ? 1 : 0),
    satir("bolge_yetisme_kalan_ms", "gauge", "Yetisme hedefine kalan sim suresi (ms).", g.yetismeKalanMs),
    satir("bolge_saat_geride_ms", "gauge", "Duvar saati sim zamaninin gerisinde (ms; saat geri gittiyse > 0).", g.saatGerideMs),
    satir("bolge_olumcul", "gauge", "Yazar durdu (gunluk yazilamadi): 1.", g.olumcul ? 1 : 0),
    satir("bolge_goruntu_toplam", "counter", "Alinan anlik goruntu sayisi.", g.goruntuSayisi),
    satir("bolge_goruntu_hata_toplam", "counter", "Basarisiz anlik goruntu denemeleri.", g.goruntuHatasi),
    satir("bolge_son_goruntu_yasi_sim_ms", "gauge", "Son goruntunun sim yasi (ms).", g.goruntuYasiSimMs),
    satir("bolge_son_goruntu_yasi_saniye", "gauge", "Son goruntunun duvar yasi (sn; bu surecte alindiktan beri).", g.goruntuYasiSaniye),
    satir("bolge_son_goruntu_bayt", "gauge", "Son goruntunun boyutu (bayt, sikistirmasiz metin).", g.goruntuBayt),
    satir("bolge_goruntu_sure_son_ms", "gauge", "Son goruntu alma suresi (ms; serilestirme + depo yazimi).", g.goruntuSureSonMs),
    satir("bolge_goruntu_sure_en_uzun_ms", "gauge", "Bu surecteki en uzun goruntu alma suresi (ms).", g.goruntuSureEnUzunMs),
  );
  if (g.depo) {
    ekle(
      satir("bolge_depo_gunluk_bayt", "gauge", "Gunluk deposu boyutu (bayt; pg'de tum dunyalarin log tablosu).", g.depo.gunlukBayt),
      satir("bolge_depo_goruntu_bayt", "gauge", "Goruntu deposu boyutu (bayt).", g.depo.goruntuBayt),
    );
  }
  // Commit gecikmesi: histogram (ms) + son pencereden p50/p95.
  o.push("# HELP bolge_commit_gecikme_ms Komutun kuyruga girisinden gunluge yazilip uygulanmasina kadar gecen sure (ms).", "# TYPE bolge_commit_gecikme_ms histogram");
  g.commit.sinirlar.forEach((s, i) => o.push(`bolge_commit_gecikme_ms_bucket{le="${s}"} ${g.commit.kume[i]}`));
  o.push(`bolge_commit_gecikme_ms_bucket{le="+Inf"} ${g.commit.sayi}`, `bolge_commit_gecikme_ms_sum ${g.commit.toplam}`, `bolge_commit_gecikme_ms_count ${g.commit.sayi}`);
  o.push("# HELP bolge_commit_gecikme_nicelik_ms Commit gecikmesi niceligi (son 2048 ornek).", "# TYPE bolge_commit_gecikme_nicelik_ms gauge");
  o.push(`bolge_commit_gecikme_nicelik_ms{quantile="0.5"} ${g.commit.nicelik(0.5)}`, `bolge_commit_gecikme_nicelik_ms{quantile="0.95"} ${g.commit.nicelik(0.95)}`);
  ekle(
    satir("bolge_surec_bellek_bayt", "gauge", "Surec RSS (bayt).", g.surec.rssBayt),
    satir("bolge_surec_heap_bayt", "gauge", "Surec heap kullanimi (bayt).", g.surec.heapBayt),
    satir("bolge_surec_cpu_saniye", "counter", "Surec CPU suresi (kullanici ve cekirdek modu toplami, sn).", g.surec.cpuSaniye),
    satir("bolge_calisma_saniye", "gauge", "Surec calisma suresi (sn).", g.calismaSaniye),
  );
  return o.join("\n") + "\n";
}

export interface SaglikDurumu {
  durum: "ok" | "yetisiyor" | "olumcul" | "kapaniyor";
  seq: number;
  simZamaniMs: number;
}

/** `/saglik`: yazar yaşıyorsa 200 (yetişirken de), ölümcül/kapanıyorsa 503. `/hazir`: yalnız "ok" iken 200. */
export function saglikYaniti(d: SaglikDurumu, yol: string): { kod: number; govde: string } {
  const govde = JSON.stringify(d);
  if (yol === "/hazir") return { kod: d.durum === "ok" ? 200 : 503, govde };
  return { kod: d.durum === "olumcul" || d.durum === "kapaniyor" ? 503 : 200, govde };
}

export interface MetrikSecenekleri {
  /** 0 = boş port. */
  port: number;
  /** Varsayılan 127.0.0.1. Loopback dışı adres `token` gerektirir. */
  host?: string;
  token?: string;
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost"]);

export function metrikGuvenliMi(host: string, token: string | undefined): void {
  if (!LOOPBACK.has(host) && (token === undefined || token.length < 16)) {
    throw new Error(`metrik ucu loopback disi bir adrese (${host}) baglanmak icin en az 16 karakterlik bir token (BOLGE_METRIK_TOKEN) gerektirir`);
  }
}

function tokenDogruMu(verilen: string | undefined, beklenen: string): boolean {
  if (!verilen?.startsWith("Bearer ")) return false;
  const a = Buffer.from(verilen.slice(7));
  const b = Buffer.from(beklenen);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface MetrikSunucusu {
  port: number;
  kapat(): Promise<void>;
}

/** Ayrı metrik HTTP sunucusu: `/metrik` (token'lı olabilir), `/saglik`, `/hazir`; diğer yollar 404. */
export async function metrikSunucusuBaslat(
  s: MetrikSecenekleri,
  kaynak: { metin(): Promise<string>; saglik(): SaglikDurumu },
): Promise<MetrikSunucusu> {
  const host = s.host ?? "127.0.0.1";
  metrikGuvenliMi(host, s.token);
  const sunucu: Server = createServer((istek, yanit) => {
    const yol = (istek.url ?? "/").split("?")[0] as string;
    const yaz = (kod: number, govde: string, tur = "text/plain; charset=utf-8"): void => {
      yanit.writeHead(kod, { "content-type": tur, "cache-control": "no-store" });
      yanit.end(govde);
    };
    if (istek.method !== "GET") return yaz(405, "yalniz GET\n");
    if (yol === "/saglik" || yol === "/hazir") {
      const r = saglikYaniti(kaynak.saglik(), yol);
      return yaz(r.kod, r.govde, "application/json");
    }
    if (yol === "/metrik") {
      if (s.token !== undefined && !tokenDogruMu(istek.headers.authorization, s.token)) {
        yanit.setHeader("www-authenticate", "Bearer");
        return yaz(401, "yetkisiz\n");
      }
      kaynak.metin().then(
        (m) => yaz(200, m, "text/plain; version=0.0.4; charset=utf-8"),
        () => yaz(500, "metrik uretilemedi\n"),
      );
      return;
    }
    yaz(404, "yok\n");
  });
  await new Promise<void>((coz, reddet) => {
    sunucu.once("error", reddet);
    sunucu.listen(s.port, host, () => coz());
  });
  return {
    port: (sunucu.address() as AddressInfo).port,
    kapat: () => new Promise<void>((coz) => sunucu.close(() => coz())),
  };
}
