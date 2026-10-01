/**
 * WebSocket ağ geçidi (`ws`): el sıkışma, kimlik, ilgi alanı, komut iletimi, hız sınırı ve kare/delta yayını.
 * Dünya durumuna yalnız `DunyaYazari` dokunur; bu katman okur (kare çıkarır) ve komutları yazara iletir.
 */
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { OyuncuId } from "@bolge/cekirdek";
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
  /** Gönderim tamponu bu kadarı aşarsa delta atlanır, sonraki yayında tam kare gider. Varsayılan 4 MiB. */
  enCokTampon?: number;
}

/** `ozetIste` jeton bedeli (dünyanın tamamını özetlemek pahalıdır). */
const OZET_BEDELI = 5;

interface Baglanti {
  ws: WebSocket;
  kimlik: Kimlik | null;
  istemci: string;
  istenen: number[];
  /** Mülk kipinde istenen ilçeler. */
  istenenIlceler: string[];
  abone: boolean;
  sonKare: IlgiKaresi | null;
  rev: number;
  canli: boolean;
  /** Mesajlar bağlantı başına sırayla işlenir (merhaba'nın kimlik doğrulaması async'tir). */
  zincir: Promise<void>;
}

export interface CalisanSunucu {
  port: number;
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
  const baglantilar = new Set<Baglanti>();
  let sonYayin = 0;
  let kapaniyor = false;

  const wss = new WebSocketServer({ port: s.port ?? 0, host: s.host ?? "127.0.0.1", maxPayload: EN_BUYUK_MESAJ_BAYT });
  await new Promise<void>((coz, reddet) => {
    wss.once("listening", coz);
    wss.once("error", reddet);
  });

  function gonder(b: Baglanti, m: SunucuMesaji): void {
    if (b.ws.readyState === b.ws.OPEN) b.ws.send(JSON.stringify(m));
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
    if (b.ws.bufferedAmount > enCokTampon) {
      b.sonKare = null; // yavaş istemci: deltayı atla, yetişince tam kare
      return;
    }
    const oyuncu = kareOyuncusu(b);
    const ilgi = ilgiAlaniKur(yazar.sim, b.istenen, oyuncu);
    const ilceIlgisi = ilceIlgisiKur(yazar.sim, b.istenenIlceler, oyuncu);
    const kare = ilgiKaresiCikar(yazar.sim, ilgi, oyuncu, ilceIlgisi);
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

  yazar.dinle((olay) => {
    const simdi = performance.now();
    if (olay.basarili === 0 && simdi - sonYayin < yayinAraligiMs) return;
    sonYayin = simdi;
    for (const b of baglantilar) kareGonder(b, false);
  });

  // Yetişme (sunucu kapalıyken geçen süreyi işletme) durumu: kimliği doğrulanmış her bağlantıya bildirilir.
  yazar.yetismeDinle((d) => {
    for (const b of baglantilar) if (b.kimlik) gonder(b, { tur: "durum", yetisiyor: d.yetisiyor, simZamani: d.simZamani, hedefZamani: d.hedefZamani });
  });

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
    b.abone = true;
    kareGonder(b, true);
  }

  function komutAl(b: Baglanti, k: Kimlik, m: Extract<IstemciMesaji, { tur: "komut" }>): void {
    // İstemcinin söylediği kimlik yoktur: oyuncu token'dan; yönetici komutları "sistem" olarak damgalanır.
    const oyuncu = k.yonetici ? SISTEM_OYUNCUSU : k.oyuncu;
    if (m.komut.tur === "oyuncu_katil" && !k.yonetici) {
      return hata(b, "yetki", "oyuncu_katil yalniz yonetici", { anahtar: m.anahtar });
    }
    const yeniAnahtar = !yazar.anahtarVarMi(oyuncu, b.istemci, m.anahtar);
    // Yetişirken yeni komut kuyruklanmaz, reddedilir (hız sınırı jetonu da harcanmaz); işlenmiş anahtarlar ilk sonuçla yanıtlanır.
    if (yeniAnahtar && yazar.yetisiyor) {
      return hata(b, "yetisiyor", "sunucu kapaliyken gecen sureyi yetistiriyor; 'durum' mesaji bitisi bildirince ayni anahtarla yeniden deneyin", { anahtar: m.anahtar });
    }
    if (yeniAnahtar && !hizSiniri.al(k.oyuncu)) {
      return hata(b, "hiz_siniri", "cok fazla komut; biraz bekleyip ayni anahtarla yeniden deneyin", { anahtar: m.anahtar });
    }
    yazar.komutGonder(oyuncu, b.istemci, m.anahtar, m.komut).then(
      (y) => gonder(b, { tur: "komutSonucu", anahtar: m.anahtar, seq: y.seq, t: y.t, komut: y.komut, sonuc: y.sonuc, tekrar: y.tekrar }),
      (e: unknown) => hata(b, e instanceof YetisiyorHatasi ? "yetisiyor" : "ic_hata", e instanceof Error ? e.message : String(e), { anahtar: m.anahtar }),
    );
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
      case "zamanIste":
        return gonder(b, { tur: "zaman", istemciGonderim: m.istemciGonderim, sunucuDuvar: Date.now(), simZamani: yazar.yetisiyor ? yazar.sim.dunya.zaman : yazar.saat.simdi(), hiz: yazar.saat.hiz });
      case "ozetIste": {
        const ek = m.istek !== undefined ? { istek: m.istek } : {};
        if (!hizSiniri.al(k.oyuncu, OZET_BEDELI)) return hata(b, "hiz_siniri", "ozet istegi siniri", ek);
        return gonder(b, { tur: "ozet", ...ek, ...yazar.ozet() });
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
    const b: Baglanti = { ws, kimlik: null, istemci: "", istenen: [], istenenIlceler: [], abone: false, sonKare: null, rev: 0, canli: true, zincir: Promise.resolve() };
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
    port: (wss.address() as AddressInfo).port,
    get baglantiSayisi() {
      return baglantilar.size;
    },
    async kapat(): Promise<void> {
      kapaniyor = true;
      clearInterval(bakim);
      for (const b of baglantilar) b.ws.close(KAPANIS.kapaniyor, "sunucu kapaniyor");
      await new Promise<void>((coz) => wss.close(() => coz()));
      await yazar.kapat();
    },
  };
}
