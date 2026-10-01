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
import { monitorEventLoopDelay, type IntervalHistogram } from "node:perf_hooks";
import type { AddressInfo } from "node:net";
import { SermayeSayaci } from "./ekonomi-metrik";
import type { EkonomiOlcumu, SermayeOzeti } from "./ekonomi-metrik";

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

  /** Penceredeki ham örnekler (gözlem sırasıyla; `sayi` <= PENCERE iken tümü). Test/tanı içindir. */
  ornekler(): readonly number[] {
    return this.ornek;
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
  /**
   * Görüntü işçisi (worker_threads): ana iş parçacığında kalan yapısal kopya süresi (son ve en uzun, ms), işçinin kendi süresi
   * (serileştirme + özet + gzip, son, ms), işçi kipinde alınan, atlanan (işçi meşgulken) görüntü sayısı, işçi hataları.
   */
  sonKopyaMs = 0;
  enUzunKopyaMs = 0;
  sonIsciMs = 0;
  isciGoruntu = 0;
  goruntuAtlanan = 0;
  isciHatasi = 0;
  /** Esnaf Defteri dedektörü: günlüğe giren `sistem_odul` komutları (uygulanan / çekirdek reddi). */
  odulVerilen = 0;
  odulReddedilen = 0;
  /** Dedektör tarama maliyeti (ana iş parçacığı, eşzamanlı kısım; günlük yazımı hariç): toplam ms, ızgara noktası sayısı, son ve en uzun tek tarama. */
  odulTaramaToplamMs = 0;
  odulIzgaraSayisi = 0;
  odulTaramaSonMs = 0;
  odulTaramaEnUzunMs = 0;
  /** Sermaye komutlarında hazine farkı (komut başına toplam ve insan oyuncu dağılımı; oyuncu başına değerler dışarı çıkmaz). */
  readonly sermaye = new SermayeSayaci();
}

/** Olay döngüsü gecikmesi (ms): p50, p99 ve en büyük. `perf_hooks.monitorEventLoopDelay` çözünürlüğü (10 ms) tabanı dahildir. */
export interface OlayDongusuGecikmesi {
  p50Ms: number;
  p99Ms: number;
  maxMs: number;
}

/**
 * `monitorEventLoopDelay` sarmalayıcısı: kayan pencere. Histogram `pencereMs`'de bir sıfırlanır; okuma, güncel pencerede yeterli
 * örnek (>= 100) yoksa bir önceki pencerenin değerini verir (sıfırlamadan hemen sonra metrik boşalmasın). Zamanlayıcı süreci tutmaz.
 */
export class OlayDongusuOlcer {
  private readonly h: IntervalHistogram;
  private onceki: OlayDongusuGecikmesi | null = null;
  private readonly zamanlayici: NodeJS.Timeout;

  constructor(cozunurlukMs = 10, pencereMs = 300_000) {
    this.h = monitorEventLoopDelay({ resolution: cozunurlukMs });
    this.h.enable();
    this.zamanlayici = setInterval(() => {
      this.onceki = this.oku();
      this.h.reset();
    }, pencereMs);
    this.zamanlayici.unref();
  }

  private oku(): OlayDongusuGecikmesi {
    const ms = (ns: number): number => Math.round((ns / 1e6) * 10) / 10;
    return { p50Ms: ms(this.h.percentile(50)), p99Ms: ms(this.h.percentile(99)), maxMs: ms(this.h.max) };
  }

  olcum(): OlayDongusuGecikmesi {
    if (this.h.count < 100 && this.onceki) return this.onceki;
    return this.oku();
  }

  kapat(): void {
    clearInterval(this.zamanlayici);
    this.h.disable();
  }
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
  /** Görüntü işçisi: ana iş parçacığında kalan kopya süresi (son/en uzun), işçi süresi (son), işçide alınan, atlanan, hata. */
  goruntuIsci: { kopyaSonMs: number; kopyaEnUzunMs: number; isciSonMs: number; alinan: number; atlanan: number; hata: number };
  /** Kare yayını: yavaş istemci nedeniyle atlanan kare, koparılan bağlantı, yayın sırasındaki bağlantı sayısı. */
  yayin: { atlananKare: number; yavasKopan: number; sira: number };
  olayDongusu: OlayDongusuGecikmesi;
  /** Esnaf Defteri dedektörü: günlüğe giren ödül komutları (uygulanan / çekirdek reddi). */
  odul: { verilen: number; reddedilen: number; taramaToplamMs: number; izgara: number; taramaSonMs: number; taramaEnUzunMs: number };
  /** Ekonomi izleme gauge'ları (dünya toplamı; oyuncu etiketi YOK; bkz. `ekonomi-metrik.ts`). Verilmezse satır yazılmaz. */
  ekonomi?: EkonomiOlcumu;
  /** Sermaye komutlarında hazine farkı: komut başına toplam ve insan oyuncu dağılımı (kimlik yok). */
  sermaye?: SermayeOzeti;
  /** E-posta girişi olay sayaçları (yalnız toplu sayılar; belirteç, adres ve IP YOK). Giriş kapalıysa yoktur. */
  giris?: Record<string, number>;
  depo: { gunlukBayt: number; goruntuBayt: number } | null;
  commit: Histogram;
  surec: { rssBayt: number; heapBayt: number; cpuSaniye: number };
  calismaSaniye: number;
}

function satir(ad: string, tur: "counter" | "gauge", yardim: string, v: number | string, etiket = ""): string[] {
  return [`# HELP ${ad} ${yardim}`, `# TYPE ${ad} ${tur}`, `${ad}${etiket} ${v}`];
}

/** Etiket değeri kaçışı (Prometheus metin biçimi): ters bölü, çift tırnak, satır sonu. */
const etiketKac = (v: string): string => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

/** Etiketli aile: bir HELP/TYPE başlığı + `ad{e1="v1",...} değer` satırları (satır yoksa hiçbir şey yazılmaz). */
function aile(ad: string, tur: "counter" | "gauge", yardim: string, satirlar: Array<[Record<string, string>, number]>): string[] {
  if (satirlar.length === 0) return [];
  const o = [`# HELP ${ad} ${yardim}`, `# TYPE ${ad} ${tur}`];
  for (const [e, v] of satirlar) {
    const et = Object.entries(e).map(([k, x]) => `${k}="${etiketKac(x)}"`).join(",");
    o.push(`${ad}${et ? `{${et}}` : ""} ${v}`);
  }
  return o;
}

/**
 * Ekonomi izleme satırları (A2 §8.2 K2-1..K2-6) ve sermaye hazine farkı: YALNIZ dünya toplamı ya da dağılım, oyuncu etiketi yok. Etiketler: kalem, mal, tur,
 * yontem, komut, kaynak, ceyrek. Para defteri yoksa (bölge kipi) para/kasa aileleri yazılmaz.
 */
function ekonomiSatirlari(e: EkonomiOlcumu | undefined, sr: SermayeOzeti | undefined): string[] {
  const o: string[] = [];
  if (e) {
    if (e.para) {
      o.push(...aile("bolge_para_musluk_mili", "gauge", "Para musluklari (oyunculara giren yeni para; kumulatif, mili-para; kalem anahtarlardan okunur).", e.para.musluk.map(([k, v]) => [{ kalem: k }, v])));
      o.push(...aile("bolge_para_lavabo_mili", "gauge", "Para lavabolari (yanan para; kumulatif, mili-para; kalem anahtarlardan okunur).", e.para.lavabo.map(([k, v]) => [{ kalem: k }, v])));
      const odul = e.para.musluk.find(([k]) => k === "odul");
      if (odul) o.push(...satir("bolge_odul_musluk_mili", "gauge", "Odul musluguyla verilen kumulatif para (mili-para; dunya).", odul[1]));
    }
    if (e.kasa) {
      o.push(...satir("bolge_kasa_sayisi", "gauge", "Kamu kasasi sayisi.", e.kasa.sayi));
      o.push(...satir("bolge_kasa_bakiye_mili", "gauge", "Kamu kasalarinin toplam kullanilabilir bakiyesi (mili-para).", e.kasa.bakiye));
      o.push(...aile("bolge_kasa_giris_mili", "gauge", "Kamu kasalarina kumulatif giris (kalem anahtarlardan; mili-para).", e.kasa.giris.map(([k, v]) => [{ kalem: k }, v])));
      o.push(...aile("bolge_kasa_cikis_mili", "gauge", "Kamu kasalarindan kumulatif cikis (hedef: oyuncu ya da npc; mili-para).", e.kasa.cikis.map(([k, v]) => [{ hedef: k }, v])));
    }
    o.push(...aile("bolge_pazar_fiyat_taban_orani", "gauge", "NPC pazar referans fiyati / tabanFiyat (formul sinirlari 0,25-1,75).", e.pazar.oran.map(([m, v]) => [{ mal: m }, v])));
    o.push(...aile("bolge_pazar_sinirda_mal", "gauge", "Fiyat siniri bandina dayanan mal sayisi (alt <= 0,26 taban, ust >= 1,74 taban).", [[{ sinir: "alt" }, e.pazar.sinirda.alt], [{ sinir: "ust" }, e.pazar.sinirda.ust]]));
    o.push(...aile("bolge_tesis_yontem", "gauge", "Anlik tesis dagilimi (tur ve aktif yontem).", e.yontem.map((y): [Record<string, string>, number] => [{ tur: y.tur, yontem: y.yontem }, y.adet])));
    o.push(...aile("bolge_tesis_asinma_ppm", "gauge", "Tesis asinmasi ceyrekleri (ppm; tur basina; yalniz asinma verisi olan tesisler).", e.asinma.flatMap((a): Array<[Record<string, string>, number]> => [[{ tur: a.tur, ceyrek: "25" }, a.c25], [{ tur: a.tur, ceyrek: "50" }, a.c50], [{ tur: a.tur, ceyrek: "75" }, a.c75]])));
    o.push(...aile("bolge_tesis_asinma_adet", "gauge", "Asinma verisi olan tesis sayisi (tur basina).", e.asinma.map((a): [Record<string, string>, number] => [{ tur: a.tur }, a.adet])));
  }
  if (sr) {
    o.push(...aile("bolge_sermaye_komut_toplam", "counter", "Basarili sermaye komutlari (komut ve kaynak: insan ya da bot).", sr.komutlar.map((k): [Record<string, string>, number] => [{ komut: k.komut, kaynak: k.kaynak }, k.adet])));
    o.push(...aile("bolge_sermaye_hazine_farki_mili", "gauge", "Sermaye komutlarinda kumulatif hazine farki (komut oncesi - sonrasi, mili-para; dunya toplami).", sr.komutlar.map((k): [Record<string, string>, number] => [{ komut: k.komut, kaynak: k.kaynak }, k.fark])));
    o.push(...satir("bolge_sermaye_insan_oyuncu_sayisi", "gauge", "Sermaye komutu vermis insan oyuncu sayisi (bu surecte).", sr.insanOyuncu.sayi));
    if (sr.insanOyuncu.sayi > 0) {
      const q = sr.insanOyuncu;
      o.push(...aile("bolge_sermaye_insan_oyuncu_mili", "gauge", "Insan oyuncu basina kumulatif sermaye hazine farki DAGILIMI (ceyrekler; kimlik yok; mili-para).", [[{ ceyrek: "25" }, q.c25], [{ ceyrek: "50" }, q.c50], [{ ceyrek: "75" }, q.c75], [{ ceyrek: "100" }, q.c100]]));
    }
  }
  return o;
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
    satir("bolge_goruntu_kopya_son_ms", "gauge", "Goruntu isci kipinde ana is parcacigindaki yapisal kopya suresi (ms; son).", g.goruntuIsci.kopyaSonMs),
    satir("bolge_goruntu_kopya_en_uzun_ms", "gauge", "Ana is parcacigindaki yapisal kopya suresi (ms; en uzun).", g.goruntuIsci.kopyaEnUzunMs),
    satir("bolge_goruntu_isci_son_ms", "gauge", "Isci icinde serilestirme + ozet + gzip suresi (ms; son).", g.goruntuIsci.isciSonMs),
    satir("bolge_goruntu_isci_toplam", "counter", "Goruntu iscisinde alinan goruntu sayisi.", g.goruntuIsci.alinan),
    satir("bolge_goruntu_atlanan_toplam", "counter", "Isci mesgulken atlanan periyodik goruntu sayisi.", g.goruntuIsci.atlanan),
    satir("bolge_goruntu_isci_hata_toplam", "counter", "Goruntu iscisi hatalari (olumcul degil; yeniden denenir).", g.goruntuIsci.hata),
    satir("bolge_yayin_atlanan_kare_toplam", "counter", "Yavas istemci (tampon siniri) nedeniyle atlanan kare/delta.", g.yayin.atlananKare),
    satir("bolge_yayin_yavas_kopan_toplam", "counter", "Cok yavas oldugu icin koparilan baglanti sayisi.", g.yayin.yavasKopan),
    satir("bolge_yayin_sira", "gauge", "Kare yayini sirasinda bekleyen baglanti sayisi.", g.yayin.sira),
    satir("bolge_odul_verilen_toplam", "counter", "Esnaf Defteri dedektorunun gunluge yazdigi ve uygulanan odul komutlari.", g.odul.verilen),
    satir("bolge_odul_reddedilen_toplam", "counter", "Cekirdegin reddettigi (beklenmeyen) odul komutlari.", g.odul.reddedilen),
    satir("bolge_odul_dedektor_toplam_ms", "counter", "Odul dedektoru tarama suresi toplami (ms; ana is parcacigi, gunluk yazimi haric).", g.odul.taramaToplamMs),
    satir("bolge_odul_izgara_toplam", "counter", "Dedektorun taradigi sim-saat sinirlari.", g.odul.izgara),
    satir("bolge_odul_dedektor_son_ms", "gauge", "Son sim-saat sinirindaki dedektor tarama suresi (ms).", g.odul.taramaSonMs),
    satir("bolge_odul_dedektor_en_uzun_ms", "gauge", "En uzun tek dedektor tarama suresi (ms).", g.odul.taramaEnUzunMs),
    satir("bolge_olay_dongusu_gecikme_p50_ms", "gauge", "Olay dongusu gecikmesi p50 (ms; perf_hooks, kayan pencere).", g.olayDongusu.p50Ms),
    satir("bolge_olay_dongusu_gecikme_p99_ms", "gauge", "Olay dongusu gecikmesi p99 (ms).", g.olayDongusu.p99Ms),
    satir("bolge_olay_dongusu_gecikme_en_buyuk_ms", "gauge", "Olay dongusu gecikmesi en buyuk (ms).", g.olayDongusu.maxMs),
  );
  o.push(...ekonomiSatirlari(g.ekonomi, g.sermaye));
  if (g.giris) {
    o.push("# HELP bolge_giris_olay_toplam E-posta girisi olaylari (olay etiketine gore; kisisel veri yok).", "# TYPE bolge_giris_olay_toplam counter");
    for (const [olay, n] of Object.entries(g.giris)) o.push(`bolge_giris_olay_toplam{olay="${olay}"} ${n}`);
  }
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
