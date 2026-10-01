/**
 * WebSocket ağ geçidi (`ws`): el sıkışma, kimlik, ilgi alanı, komut iletimi, hız sınırı ve kare/delta yayını.
 * Dünya durumuna yalnız `DunyaYazari` dokunur; bu katman okur (kare çıkarır) ve komutları yazara iletir.
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { Komut, OyuncuId } from "@bolge/cekirdek";
import {
  EN_BUYUK_MESAJ_BAYT,
  KAPANIS,
  PROTOKOL_SURUMU,
  deltaBosMu,
  ilceIlgisiKur,
  ilgiAlaniKur,
  ilgiKaresiCikar,
  istemciMesajiCoz,
  kareFarki,
} from "@bolge/protokol";
import type { HataKodu, IlgiKaresi, IstemciMesaji, SunucuMesaji } from "@bolge/protokol";
import { HizSiniri, VARSAYILAN_HIZ_SINIRI } from "./hiz-siniri";
import { OlayDongusuOlcer, metrikMetni, metrikSunucusuBaslat, saglikYaniti } from "./metrik";
import type { MetrikSecenekleri, MetrikSunucusu, SaglikDurumu } from "./metrik";
import type { HizSiniriSecenekleri } from "./hiz-siniri";
import type { Kimlik, KimlikDogrulayici } from "./kimlik";
import { ElleSaat } from "./saat";
import { YetisiyorHatasi } from "./yazar";
import type { DunyaYazari } from "./yazar";

export interface SunucuSecenekleri {
  yazar: DunyaYazari;
  kimlik: KimlikDogrulayici;
  /** 0 = boş bir port seç. */
  port?: number;
  host?: string;
  hizSiniri?: HizSiniriSecenekleri;
  /** Komut olmayan turlarda en sık yayın aralığı (ms, duvar). Varsayılan 1000. */
  yayinAraligiMs?: number;
  /** `merhaba` gelmezse bağlantı kapanır (ms). Varsayılan 5000. */
  merhabaZamanAsimiMs?: number;
  /**
   * Bölge kipinde il/ilçe ilgisini bölge kimliklerine çözer (S5 il→bölge eşlemesiyle gelir); yoksa reddedilir.
   * Mülk kipinde gerekmez: ilçeler ve iller dünyanın mülk durumundan çözülür.
   */
  ilgiCozucu?: (tur: "il" | "ilce", kimlik: string) => string[] | null;
  /** Bir bağlantının abone olabileceği en çok bölge (ve ayrıca en çok ilçe). Varsayılan 256. */
  enCokIlgi?: number;
  /**
   * Periyodik `zaman` yayını aralığı (ms, `duvarMs` ölçeğinde); kimliği doğrulanmış bağlantılara gider ve yalnız `t`
   * değiştiğinde de istemci saatinin kaymamasını sağlar. Varsayılan 15 000; 0 = kapalı.
   */
  zamanYayinAraligiMs?: number;
  /** Yayın aralığının duvar saati kaynağı (ms; testler sahte saat verir). Varsayılan `performance.now`. */
  duvarMs?: () => number;
  /**
   * Ayrı metrik HTTP sunucusu (`/metrik` Prometheus metni, `/saglik`, `/hazir`); verilmezse kapalı. Varsayılan adres 127.0.0.1; loopback
   * dışı adres token ister (bkz. `metrik.ts`). `/saglik` ve `/hazir` ana portta da sunulur (konteyner healthcheck).
   */
  metrik?: MetrikSecenekleri;
  /** Gönderim tamponu bu kadarı aşarsa kare/delta ATLANIR, sonraki yayında tam kare gider. Varsayılan 4 MiB. */
  enCokTampon?: number;
  /**
   * Yavaş istemci kopma kuralı: tampon bu kadarı aşarsa (varsayılan 4 x `enCokTampon`) ya da `enCokTampon` üstünde `yavasSureMs`
   * boyunca kalırsa bağlantı sonlandırılır (istemci yeniden bağlanıp tam kare alır; sunucu belleği bir istemciyle büyümez).
   */
  kopmaTamponu?: number;
  /** `enCokTampon` üstünde bu kadar süre (duvarMs ölçeğinde) kalan istemci kopar. Varsayılan 30 000 ms. */
  yavasSureMs?: number;
  /** Bağlantı başına bekleyen tampon (bayt) ölçümü; varsayılan `ws.bufferedAmount`. Testler yavaş istemciyi bununla kurar. */
  tamponOlcer?: (ws: WebSocket, oyuncu: string | null) => number;
  /** Kare yayınında bir parçada (setImmediate turu) en çok bağlantı sayısı. Varsayılan 8. */
  yayinParca?: number;
  /** Bir yayın parçasının süre bütçesi (ms): aşılınca parça biter, kalanlar sonraki setImmediate'e kalır. Varsayılan 6. */
  yayinButceMs?: number;
  /**
   * Yayın parçalarının "sonraki tur" zamanlayıcısı (varsayılan `setImmediate`). Testler elle sürülen bir zamanlayıcı verir: parça sayısı
   * gerçek zamana/yüke bağlı olmaz (yük altında kararsızlık olmaz).
   */
  sonrakiTur?: (f: () => void) => void;
}

/** `ozetIste` jeton bedeli (dünyanın tamamını özetlemek pahalıdır). */
const OZET_BEDELI = 5;
/** `defterIste` jeton bedeli (profil okuması + çekirdek tablosu; ucuz ama sınırsız olmasın). */
const DEFTER_BEDELI = 2;

interface Baglanti {
  ws: WebSocket;
  kimlik: Kimlik | null;
  istemci: string;
  istenen: number[];
  /** Mülk kipinde istenen ilçeler. */
  istenenIlceler: string[];
  abone: boolean;
  /** Mülk kipi: ilçe karelerine ayrılmış hücre listesi de gelsin (abone mesajındaki `ayrilmis`). */
  ayrilmis: boolean;
  /** Mülk kipi: ilçe karelerine kamu arsası grupları da gelsin (abone mesajındaki `kamu`). */
  kamu: boolean;
  /** Oyuncunun açık bağlantı sayacına dahil edildi mi (yönetici değil, merhaba tamam). */
  sayildi: boolean;
  /** Yetişme sürerken bağlandı: özet yetişme bitince `donusOzeti` mesajıyla gelecek. */
  ozetBekliyor: boolean;
  sonKare: IlgiKaresi | null;
  rev: number;
  canli: boolean;
  /** Tamponu `enCokTampon` üstüne ilk çıktığı an (`duvarMs`); altına inince null. */
  yavasBasi: number | null;
  /** Mesajlar bağlantı başına sırayla işlenir (merhaba'nın kimlik doğrulaması async'tir). */
  zincir: Promise<void>;
}

export interface CalisanSunucu {
  port: number;
  /** Metrik sunucusunun portu (açıksa). */
  readonly metrikPort: number | null;
  /** Prometheus metin biçiminde şimdiki metrikler (metrik ucuyla aynı içerik). */
  metrikMetni(): Promise<string>;
  /** Sağlık durumu (`/saglik`, `/hazir`). */
  saglik(): SaglikDurumu;
  readonly baglantiSayisi: number;
  /** Bağlantıları kapatır, yazarı durdurur (kuyruk yazılır, kapanış görüntüsü alınır). */
  kapat(): Promise<void>;
}

export async function sunucuBaslat(s: SunucuSecenekleri): Promise<CalisanSunucu> {
  const yazar = s.yazar;
  const hizSiniri = new HizSiniri(s.hizSiniri ?? VARSAYILAN_HIZ_SINIRI);
  const yayinAraligiMs = s.yayinAraligiMs ?? 1000;
  const enCokIlgi = s.enCokIlgi ?? 256;
  const enCokTampon = s.enCokTampon ?? 4 * 1024 * 1024;
  const kopmaTamponu = s.kopmaTamponu ?? 4 * enCokTampon;
  const yavasSureMs = s.yavasSureMs ?? 30_000;
  const yayinParca = Math.max(1, s.yayinParca ?? 8);
  const yayinButceMs = s.yayinButceMs ?? 6;
  const sonrakiTur = s.sonrakiTur ?? ((f: () => void): void => void setImmediate(f));
  const tamponOlcer = s.tamponOlcer ?? ((ws: WebSocket) => ws.bufferedAmount);
  const tampon = (b: Baglanti): number => tamponOlcer(b.ws, b.kimlik?.oyuncu ?? null);
  const duvarMs = s.duvarMs ?? (() => performance.now());
  const olayDongusu = new OlayDongusuOlcer();
  const baglantilar = new Set<Baglanti>();
  let sonYayin = 0;
  let kapaniyor = false;
  const baslangicOlcu = yazar.olcu();
  const reddedilen = { hizSiniri: 0, yetisiyor: 0 };
  const yayinSayaci = { atlananKare: 0, yavasKopan: 0 };
  /** Kare bekleyen bağlantılar (yayın sırası): turdan sonra parçalar hâlinde, setImmediate ile boşaltılır. */
  const yayinSirasi = new Set<Baglanti>();
  let yayinPlanli = false;

  function saglik(): SaglikDurumu {
    const durum = yazar.olumculMu ? "olumcul" : kapaniyor ? "kapaniyor" : yazar.yetisiyor ? "yetisiyor" : "ok";
    return { durum, seq: yazar.seq, simZamaniMs: yazar.sim.dunya.zaman };
  }

  // WebSocket (ws) ve `/saglik`, `/hazir` aynı HTTP sunucusunda; `/metrik` ana portta YOKTUR (ayrı, varsayılan localhost'a bağlı port).
  const http = createServer((istek, yanit) => {
    const yol = (istek.url ?? "/").split("?")[0] as string;
    if (istek.method === "GET" && (yol === "/saglik" || yol === "/hazir")) {
      const r = saglikYaniti(saglik(), yol);
      yanit.writeHead(r.kod, { "content-type": "application/json", "cache-control": "no-store" });
      yanit.end(r.govde);
      return;
    }
    yanit.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    yanit.end("yok\n");
  });
  const wss = new WebSocketServer({ server: http, maxPayload: EN_BUYUK_MESAJ_BAYT });
  await new Promise<void>((coz, reddet) => {
    http.once("listening", coz);
    http.once("error", reddet);
    http.listen(s.port ?? 0, s.host ?? "127.0.0.1");
  });
  const cpu0 = process.cpuUsage();
  let depoOnbellek: { an: number; boyut: { gunlukBayt: number; goruntuBayt: number } | null } | null = null;

  async function metrikMetniUret(): Promise<string> {
    // Depo boyutu pahalı olabilir (dosya/pg): en çok 10 sn'de bir yenilenir.
    if (!depoOnbellek || yazar.olcu() - depoOnbellek.an >= 10_000) depoOnbellek = { an: yazar.olcu(), boyut: await yazar.depoBoyutu().catch(() => null) };
    const m = yazar.metrikler;
    const d = yazar.yetismeDurumu();
    const bellek = process.memoryUsage();
    const cpu = process.cpuUsage(cpu0);
    let bagliOyuncu = 0;
    for (const n of canli.values()) bagliOyuncu += n;
    return metrikMetni({
      baglanti: baglantilar.size,
      bagliOyuncu,
      komutTamam: m.komutTamam,
      komutBasarisiz: m.komutBasarisiz,
      reddedilen,
      tur: m.tur,
      seq: yazar.seq,
      simZamaniMs: yazar.sim.dunya.zaman,
      bekleyenKomut: yazar.bekleyenSayisi,
      yetisiyor: yazar.yetisiyor,
      yetismeKalanMs: yazar.yetisiyor ? d.kalanMs : 0,
      saatGerideMs: yazar.saat.gerideMs,
      olumcul: yazar.olumculMu,
      goruntuSayisi: m.goruntu,
      goruntuHatasi: m.goruntuHatasi,
      goruntuYasiSimMs: Math.max(0, yazar.sim.dunya.zaman - yazar.sonGoruntuSimZamani),
      goruntuYasiSaniye: Math.max(0, Math.round(((yazar.olcu() - (m.sonGoruntuOlcu ?? baslangicOlcu)) / 1000) * 1000) / 1000),
      goruntuBayt: m.sonGoruntuBayt,
      goruntuSureSonMs: Math.round(m.sonGoruntuSureMs * 10) / 10,
      goruntuSureEnUzunMs: Math.round(m.enUzunGoruntuSureMs * 10) / 10,
      goruntuIsci: {
        kopyaSonMs: Math.round(m.sonKopyaMs * 10) / 10,
        kopyaEnUzunMs: Math.round(m.enUzunKopyaMs * 10) / 10,
        isciSonMs: Math.round(m.sonIsciMs * 10) / 10,
        alinan: m.isciGoruntu,
        atlanan: m.goruntuAtlanan,
        hata: m.isciHatasi,
      },
      yayin: { atlananKare: yayinSayaci.atlananKare, yavasKopan: yayinSayaci.yavasKopan, sira: yayinSirasi.size },
      olayDongusu: olayDongusu.olcum(),
      odul: { verilen: m.odulVerilen, reddedilen: m.odulReddedilen },
      depo: depoOnbellek.boyut,
      commit: m.commit,
      surec: { rssBayt: bellek.rss, heapBayt: bellek.heapUsed, cpuSaniye: Math.round(((cpu.user + cpu.system) / 1e6) * 1000) / 1000 },
      calismaSaniye: Math.round(((yazar.olcu() - baslangicOlcu) / 1000) * 1000) / 1000,
    });
  }

  let metrikSunucusu: MetrikSunucusu | null = null;
  if (s.metrik) {
    try {
      metrikSunucusu = await metrikSunucusuBaslat(s.metrik, { metin: metrikMetniUret, saglik });
    } catch (e) {
      olayDongusu.kapat();
      await new Promise<void>((coz) => wss.close(() => coz()));
      await new Promise<void>((coz) => http.close(() => coz()));
      throw e;
    }
  }

  /** Yavaş istemciyi sonlandırır (abnormal kapanış; istemci yeniden bağlanıp tam kare alır). */
  function yavasKopar(b: Baglanti): void {
    yayinSayaci.yavasKopan++;
    yayinSirasi.delete(b);
    b.ws.terminate();
  }

  function gonder(b: Baglanti, m: SunucuMesaji): void {
    if (b.ws.readyState !== b.ws.OPEN) return;
    // Sert sınır: tampon bu kadarsa istemci okumuyor demektir; yanıt/yayın biriktirmek yerine koparılır.
    if (tampon(b) > kopmaTamponu) return yavasKopar(b);
    b.ws.send(JSON.stringify(m));
  }

  /**
   * Yavaş istemci kuralı (kare/delta için): tampon `enCokTampon` üstündeyse kare ATLANIR ve `sonKare` sıfırlanır (yetişince tam kare
   * gider, delta zinciri bozulmaz); tampon `kopmaTamponu` üstüne çıkarsa ya da `enCokTampon` üstünde `yavasSureMs` kalırsa bağlantı
   * KOPAR. Dönüş: true = gönderilebilir.
   */
  function tamponDenetle(b: Baglanti): boolean {
    const t = tampon(b);
    if (t > kopmaTamponu) {
      yavasKopar(b);
      return false;
    }
    if (t > enCokTampon) {
      const an = duvarMs();
      b.yavasBasi ??= an;
      if (an - b.yavasBasi >= yavasSureMs) {
        yavasKopar(b);
        return false;
      }
      b.sonKare = null;
      yayinSayaci.atlananKare++;
      return false;
    }
    b.yavasBasi = null;
    return true;
  }

  function hata(b: Baglanti, kod: HataKodu, mesaj: string, ek: { anahtar?: string; istek?: number } = {}): void {
    gonder(b, { tur: "hata", kod, mesaj, ...ek });
  }

  function kareOyuncusu(b: Baglanti): OyuncuId | null {
    return b.kimlik && !b.kimlik.yonetici ? b.kimlik.oyuncu : null;
  }

  /** Bağlantıya tam kare ya da (değişiklik varsa) delta gönderir. */
  function kareGonder(b: Baglanti, tam: boolean): void {
    if (!b.abone || !b.kimlik) return;
    if (!tamponDenetle(b)) return;
    const oyuncu = kareOyuncusu(b);
    const ilgi = ilgiAlaniKur(yazar.sim, b.istenen, oyuncu);
    const ilceIlgisi = ilceIlgisiKur(yazar.sim, b.istenenIlceler, oyuncu);
    const kare = ilgiKaresiCikar(yazar.sim, ilgi, oyuncu, ilceIlgisi, { ayrilmisListesi: b.ayrilmis, kamuListesi: b.kamu });
    if (tam || b.sonKare === null) {
      b.rev++;
      gonder(b, { tur: "kare", rev: b.rev, seq: yazar.seq, ilgi, ...(yazar.sim.dunya.mulk ? { ilceIlgisi } : {}), kare });
    } else {
      const delta = kareFarki(b.sonKare, kare);
      if (deltaBosMu(delta)) return; // yalnız t değişti: istemci formülle ara değer üretir
      b.rev++;
      gonder(b, { tur: "delta", rev: b.rev, onceki: b.rev - 1, seq: yazar.seq, delta });
    }
    b.sonKare = kare;
  }

  /** Yayın parçası: sıradaki bağlantılara en çok `yayinParca` kare / `yayinButceMs` süre, kalanı sonraki setImmediate'e. */
  function yayinParcasi(): void {
    yayinPlanli = false;
    if (kapaniyor) {
      yayinSirasi.clear();
      return;
    }
    const bas = performance.now();
    let n = 0;
    for (const b of yayinSirasi) {
      yayinSirasi.delete(b);
      if (!baglantilar.has(b)) continue;
      kareGonder(b, false);
      if (++n >= yayinParca || performance.now() - bas >= yayinButceMs) break;
    }
    yayinPlanla();
  }

  function yayinPlanla(): void {
    if (yayinPlanli || yayinSirasi.size === 0) return;
    yayinPlanli = true;
    sonrakiTur(yayinParcasi);
  }

  const zamanYayinAraligiMs = s.zamanYayinAraligiMs ?? 15_000;
  let sonZamanYayini = duvarMs();
  yazar.dinle((olay) => {
    // Periyodik zaman yayını (komut ve yayın hızından bağımsız; her tur denetlenir).
    const an = duvarMs();
    if (zamanYayinAraligiMs > 0 && an - sonZamanYayini >= zamanYayinAraligiMs) {
      sonZamanYayini = an;
      const m: SunucuMesaji = { tur: "zaman", istemciGonderim: -1, sunucuDuvar: Date.now(), simZamani: zamanBilgisi(), hiz: yazar.saat.hiz, yayin: true };
      for (const b of baglantilar) if (b.kimlik) gonder(b, m);
    }
    const simdi = performance.now();
    if (olay.basarili === 0 && simdi - sonYayin < yayinAraligiMs) return;
    sonYayin = simdi;
    // Yayın turu bloklamaz: bağlantılar sıraya girer, parçalar hâlinde gönderilir. Sıradaki bağlantı gönderilmeden yeni tur
    // gelirse zaten sıradadır (kare, gönderim anındaki en güncel dünyadan çıkarılır; ara kareler birleşir).
    for (const b of baglantilar) if (b.abone && b.kimlik) yayinSirasi.add(b);
    yayinPlanla();
  });

  // Yetişme (sunucu kapalıyken geçen süreyi işletme) durumu: kimliği doğrulanmış her bağlantıya bildirilir.
  yazar.yetismeDinle((d) => {
    for (const b of baglantilar) if (b.kimlik) gonder(b, { tur: "durum", yetisiyor: d.yetisiyor, simZamani: d.simZamani, hedefZamani: d.hedefZamani });
    // Yetişme sürerken bağlanan oyunculara "Sen yokken" özeti yetişme bitince (durum mesajından sonra) bir kez gelir.
    if (!d.yetisiyor) void bekleyenOzetleriGonder();
  });

  /** Oyuncu başına açık bağlantı sayısı (yönetici hariç): son bağlantı kapanınca çıkış çapası yazılır. */
  const canli = new Map<string, number>();

  async function bekleyenOzetleriGonder(): Promise<void> {
    for (const b of [...baglantilar]) {
      if (!b.ozetBekliyor || !b.kimlik || b.kimlik.yonetici) continue;
      b.ozetBekliyor = false;
      try {
        const ozet = await yazar.donusOzeti(b.kimlik.oyuncu);
        if (ozet) gonder(b, { tur: "donusOzeti", ozet });
      } catch {
        // özet isteğe bağlıdır: üretilemezse oyun etkilenmez
      }
    }
  }

  /** İstemcinin eşitleneceği sim zamanı: yetişirken dünyanın şimdiki zamanı, değilse saatin hedefi. */
  function zamanBilgisi(): number {
    return yazar.yetisiyor ? yazar.sim.dunya.zaman : yazar.saat.simdi();
  }

  function aboneOl(b: Baglanti, m: Extract<IstemciMesaji, { tur: "abone" }>): void {
    const ic = yazar.sim.ic;
    const d = yazar.sim.dunya;
    const kimlikler = [...(m.bolgeler ?? [])];
    const indeksler: number[] = [];
    const ilceler: string[] = [];
    if (d.mulk) {
      // Mülk kipi: ilçe doğrudan; il = ilin bütün ilçeleri + il merkezi bölgesi.
      const ilceVar = new Set(d.mulk.ilceler.map((c) => c.id));
      for (const c of m.ilceler ?? []) {
        if (!ilceVar.has(c)) return hata(b, "gecersiz_ilgi", `bilinmeyen ilce: ${c}`);
        ilceler.push(c);
      }
      for (const il of m.iller ?? []) {
        const ilin = d.mulk.ilceler.filter((c) => c.il === il).map((c) => c.id);
        const merkez = ic.mulk?.ilMerkezi.get(il);
        if (ilin.length === 0 && merkez === undefined) return hata(b, "gecersiz_ilgi", `bilinmeyen il: ${il}`);
        ilceler.push(...ilin);
        if (merkez !== undefined) indeksler.push(merkez);
      }
    } else {
      for (const [tur, liste] of [["il", m.iller ?? []], ["ilce", m.ilceler ?? []]] as const) {
        for (const k of liste) {
          const cozulen = s.ilgiCozucu?.(tur, k) ?? null;
          if (cozulen === null) return hata(b, "gecersiz_ilgi", `${tur} ilgisi cozulemedi: ${k}`);
          kimlikler.push(...cozulen);
        }
      }
    }
    for (const k of kimlikler) {
      const i = ic.bolgeIndeks[k] ?? d.bolgeler.findIndex((x) => x.id === k);
      if (i < 0) return hata(b, "gecersiz_ilgi", `bilinmeyen bolge: ${k}`);
      indeksler.push(i);
    }
    const tekil = [...new Set(indeksler)];
    const tekilIlce = [...new Set(ilceler)].sort();
    if (tekil.length > enCokIlgi || tekilIlce.length > enCokIlgi) return hata(b, "gecersiz_ilgi", `en cok ${enCokIlgi} bolge ve ${enCokIlgi} ilceye abone olunabilir`);
    b.istenen = tekil;
    b.istenenIlceler = tekilIlce;
    b.ayrilmis = m.ayrilmis === true;
    b.kamu = m.kamu === true;
    b.abone = true;
    kareGonder(b, true);
  }

  /** Komutu hız sınırı ve yetişme denetimiyle yazara iletir; yanıt `komutSonucu`, hata aynı anahtarlı `hata`. */
  function yazaraIlet(b: Baglanti, k: Kimlik, oyuncu: OyuncuId, istemci: string, anahtar: string, komut: Komut): void {
    const yeniAnahtar = !yazar.anahtarVarMi(oyuncu, istemci, anahtar);
    // Yetişirken yeni komut kuyruklanmaz, reddedilir (hız sınırı jetonu da harcanmaz); işlenmiş anahtarlar ilk sonuçla yanıtlanır.
    if (yeniAnahtar && yazar.yetisiyor) {
      reddedilen.yetisiyor++;
      return hata(b, "yetisiyor", "sunucu kapaliyken gecen sureyi yetistiriyor; 'durum' mesaji bitisi bildirince ayni anahtarla yeniden deneyin", { anahtar });
    }
    if (yeniAnahtar && !hizSiniri.al(k.oyuncu)) {
      reddedilen.hizSiniri++;
      return hata(b, "hiz_siniri", "cok fazla komut; biraz bekleyip ayni anahtarla yeniden deneyin", { anahtar });
    }
    yazar.komutGonder(oyuncu, istemci, anahtar, komut).then(
      (y) => gonder(b, { tur: "komutSonucu", anahtar, seq: y.seq, t: y.t, komut: y.komut, sonuc: y.sonuc, tekrar: y.tekrar }),
      (e: unknown) => hata(b, e instanceof YetisiyorHatasi ? "yetisiyor" : "ic_hata", e instanceof Error ? e.message : String(e), { anahtar }),
    );
  }

  function komutAl(b: Baglanti, k: Kimlik, m: Extract<IstemciMesaji, { tur: "komut" }>): void {
    // İstemcinin söylediği kimlik yoktur: oyuncu token'dan; yönetici komutları "sistem" olarak damgalanır.
    const oyuncu = k.yonetici ? SISTEM_OYUNCUSU : k.oyuncu;
    if (m.komut.tur === "oyuncu_katil" && !k.yonetici) {
      return hata(b, "yetki", "oyuncu_katil yalniz yonetici (oyuncu kendi katilimi icin 'katil' mesajini kullanir)", { anahtar: m.anahtar });
    }
    if (m.komut.tur === "sistem_odul" && !k.yonetici) return hata(b, "yetki", "sistem_odul yalniz yonetici", { anahtar: m.anahtar });
    yazaraIlet(b, k, oyuncu, b.istemci, m.anahtar, m.komut);
  }

  /**
   * Oyuncunun kendi katılımı: oyuncu kimliği doğrulanmış kimlikten gelir (mesajda yoktur), komut "sistem" olarak damgalanır.
   * İdempotans kapsamı oyuncuya özeldir (`katil:<oyuncu>`): başka bir oyuncunun aynı anahtarı ya da istemci kimliği çakışmaz.
   */
  function katilAl(b: Baglanti, k: Kimlik, m: Extract<IstemciMesaji, { tur: "katil" }>): void {
    if (k.yonetici) return hata(b, "yetki", "yonetici oyuncuyu 'komut' + oyuncu_katil ile katar", { anahtar: m.anahtar });
    if (!yazar.sim.dunya.mulk) return hata(b, "gecersiz_mesaj", "katil yalniz mulk kipinde gecerli", { anahtar: m.anahtar });
    const komut: Komut = { tur: "oyuncu_katil", oyuncu: k.oyuncu, bolgeler: [], ...(m.ilce !== undefined ? { ilce: m.ilce } : {}) };
    yazaraIlet(b, k, SISTEM_OYUNCUSU, `katil:${k.oyuncu}`, m.anahtar, komut);
  }

  async function mesajIsle(b: Baglanti, m: IstemciMesaji): Promise<void> {
    if (m.tur === "merhaba") {
      if (b.kimlik) return hata(b, "sira", "merhaba zaten alindi");
      if (m.protokolSurumu !== PROTOKOL_SURUMU) {
        hata(b, "protokol_surumu", `protokol surumu ${m.protokolSurumu} desteklenmiyor (sunucu ${PROTOKOL_SURUMU})`);
        return void b.ws.close(KAPANIS.protokol, "protokol surumu");
      }
      if (m.kuralSurumu !== undefined && m.kuralSurumu !== yazar.kuralSurumu) {
        hata(b, "kural_surumu", `kural surumu uyusmuyor: istemci ${m.kuralSurumu}, sunucu ${yazar.kuralSurumu}`);
        return void b.ws.close(KAPANIS.kural, "kural surumu");
      }
      const k = await s.kimlik.dogrula(m.token);
      if (!k) {
        hata(b, "kimlik", "gecersiz token");
        return void b.ws.close(KAPANIS.kimlik, "kimlik");
      }
      b.kimlik = k;
      b.istemci = m.istemciKimligi;
      // "Sen yokken" özeti: yalnız oyuncu, yetişme bitmiş ve oyuncunun başka açık bağlantısı yokken; yetişiyorsa bitince mesajla.
      let donusOzeti: Awaited<ReturnType<typeof yazar.donusOzeti>> = null;
      if (!k.yonetici) {
        if ((canli.get(k.oyuncu) ?? 0) === 0) {
          if (yazar.yetisiyor) b.ozetBekliyor = true;
          else donusOzeti = await yazar.donusOzeti(k.oyuncu).catch(() => null);
        }
        canli.set(k.oyuncu, (canli.get(k.oyuncu) ?? 0) + 1);
        b.sayildi = true;
      }
      gonder(b, {
        tur: "hosgeldin",
        protokolSurumu: PROTOKOL_SURUMU,
        kuralSurumu: yazar.kuralSurumu,
        oyuncu: k.yonetici ? SISTEM_OYUNCUSU : k.oyuncu,
        yonetici: k.yonetici,
        simZamani: yazar.sim.dunya.zaman,
        seq: yazar.seq,
        hiz: yazar.saat.hiz,
        ...(yazar.yetisiyor ? { yetisiyor: true, hedefZamani: yazar.yetismeDurumu().hedefZamani } : {}),
        // Gerçek tarih için: yalnız mutlak saatli ve epoch'lu dünyada (elle saatte hiç gönderilmez).
        ...(yazar.saat.mutlak && yazar.dunyaEpochMs !== null ? { dunyaEpochMs: yazar.dunyaEpochMs } : {}),
        ...(donusOzeti ? { donusOzeti } : {}),
        dizin: yazar.dizin(),
      });
      return;
    }
    const k = b.kimlik;
    if (!k) {
      hata(b, "sira", "once merhaba gonderilmeli");
      return void b.ws.close(KAPANIS.kimlik, "merhaba yok");
    }
    if (kapaniyor) return hata(b, "kapaniyor", "sunucu kapaniyor");
    switch (m.tur) {
      case "abone":
        return aboneOl(b, m);
      case "komut":
        return komutAl(b, k, m);
      case "katil":
        return katilAl(b, k, m);
      case "ozetOkundu":
        if (!k.yonetici) await yazar.ozetOkundu(k.oyuncu, m.t);
        return;
      case "zamanIste":
        return gonder(b, { tur: "zaman", istemciGonderim: m.istemciGonderim, sunucuDuvar: Date.now(), simZamani: zamanBilgisi(), hiz: yazar.saat.hiz });
      case "ozetIste": {
        const ek = m.istek !== undefined ? { istek: m.istek } : {};
        if (!hizSiniri.al(k.oyuncu, OZET_BEDELI)) return hata(b, "hiz_siniri", "ozet istegi siniri", ek);
        return gonder(b, { tur: "ozet", ...ek, ...yazar.ozet() });
      }
      case "defterIste": {
        // Esnaf Defteri (yalnız oyuncu): çekirdek ödül tablosundan okunan tutarlar, profil damgaları; metin yok (şablon anahtarı).
        const ek = m.istek !== undefined ? { istek: m.istek } : {};
        if (k.yonetici) return hata(b, "yetki", "defterIste yalniz oyuncu icin", ek);
        if (!hizSiniri.al(k.oyuncu, DEFTER_BEDELI)) return hata(b, "hiz_siniri", "defter istegi siniri", ek);
        const d = await yazar.defter(k.oyuncu);
        if (!d) return hata(b, "yetki", "defter bu oyuncu icin yok", ek);
        return gonder(b, { tur: "defter", ...ek, ...d });
      }
      case "zamanIlerlet": {
        const ek = m.istek !== undefined ? { istek: m.istek } : {};
        const saat = yazar.saat;
        if (!k.yonetici || !(saat instanceof ElleSaat)) return hata(b, "yetki", "zamanIlerlet yalniz yonetici ve elle saatte", ek);
        saat.ilerlet(m.t);
        await yazar.durgunlukBekle(m.t);
        return gonder(b, { tur: "ozet", ...ek, ...yazar.ozet() });
      }
    }
  }

  wss.on("connection", (ws) => {
    const b: Baglanti = { ws, kimlik: null, istemci: "", istenen: [], istenenIlceler: [], abone: false, ayrilmis: false, kamu: false, sayildi: false, ozetBekliyor: false, sonKare: null, rev: 0, canli: true, yavasBasi: null, zincir: Promise.resolve() };
    baglantilar.add(b);
    const zamanAsimi = setTimeout(() => {
      if (!b.kimlik) ws.close(KAPANIS.zamanAsimi, "merhaba zaman asimi");
    }, s.merhabaZamanAsimiMs ?? 5000);
    ws.on("pong", () => {
      b.canli = true;
    });
    ws.on("message", (veri, ikili) => {
      if (ikili) return hata(b, "gecersiz_mesaj", "yalniz metin cercevesi");
      const r = istemciMesajiCoz(veri.toString());
      if (!r.tamam) return hata(b, "gecersiz_mesaj", r.hata);
      const m = r.mesaj;
      b.zincir = b.zincir.then(() => mesajIsle(b, m)).catch((e: unknown) => hata(b, "ic_hata", e instanceof Error ? e.message : String(e)));
    });
    ws.on("close", () => {
      clearTimeout(zamanAsimi);
      baglantilar.delete(b);
      yayinSirasi.delete(b);
      if (b.sayildi && b.kimlik) {
        b.sayildi = false;
        const oyuncu = b.kimlik.oyuncu;
        const n = (canli.get(oyuncu) ?? 1) - 1;
        if (n > 0) canli.set(oyuncu, n);
        else {
          canli.delete(oyuncu);
          // Son bağlantı kapandı: çıkış çapası (kapanış sırasında `kapat` zaten yazar).
          if (!kapaniyor) void yazar.cikis(oyuncu).catch(() => undefined);
        }
      }
    });
    ws.on("error", () => ws.terminate());
  });

  // Ölü bağlantı temizliği ve hız sınırı kovalarının bakımı.
  const bakim = setInterval(() => {
    for (const b of baglantilar) {
      if (!b.canli) {
        b.ws.terminate();
        continue;
      }
      b.canli = false;
      b.ws.ping();
    }
    hizSiniri.temizle();
  }, 30_000);
  bakim.unref();

  yazar.baslat();

  return {
    port: (http.address() as AddressInfo).port,
    get metrikPort() {
      return metrikSunucusu?.port ?? null;
    },
    metrikMetni: metrikMetniUret,
    saglik,
    get baglantiSayisi() {
      return baglantilar.size;
    },
    async kapat(): Promise<void> {
      // Bağlı oyuncuların çıkış çapaları (kapanışla gelen kopma olaylarından önce, yazar kapanmadan).
      for (const oyuncu of [...canli.keys()]) await yazar.cikis(oyuncu).catch(() => undefined);
      canli.clear();
      kapaniyor = true;
      yayinSirasi.clear();
      clearInterval(bakim);
      olayDongusu.kapat();
      for (const b of baglantilar) b.ws.close(KAPANIS.kapaniyor, "sunucu kapaniyor");
      await new Promise<void>((coz) => wss.close(() => coz()));
      await new Promise<void>((coz) => http.close(() => coz()));
      await metrikSunucusu?.kapat();
      await yazar.kapat();
    },
  };
}
