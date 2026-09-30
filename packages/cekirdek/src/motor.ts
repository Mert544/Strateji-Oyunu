/**
 * Simülasyon motoru: olay kuyruğu döngüsü, komut yönlendirme ve oyuncu kaydı.
 * Ekonomi/lojistik/askeri/teknoloji/politika alt sistemleri ayrı modüllerdedir; motor yalnızca çağırır.
 */
import type { VeriPaketi } from "@bolge/veri";
import { BaglamUygulamasi } from "./baglam";
import { icerikDerle } from "./derle";
import { askeriKomutu, partiBitti, savasPencereAc, savasPencereKapa } from "./askeri";
import { ekonomiKomutu, insaatBitti, saatlikTik } from "./ekonomi";
import { kuyrukBas, kuyrukCikar } from "./kuyruk";
import { dunyaKur } from "./kurulum";
import { lojistikCoz, lojistikKomutu } from "./lojistik/cozum";
import { durumOzeti } from "./ozet";
import { politikaKomutu } from "./politika";
import { oyuncuBul, stokGelenEkle, stokUzlastir } from "./stok";
import { arastirmaBitti, teknolojiKomutu } from "./teknoloji";
import { GUN, SAAT } from "./tipler";
import type {
  DamgaliKomut,
  DerlenmisIcerik,
  Dunya,
  DunyaGorunumu,
  Komut,
  KomutSonucu,
  Ms,
  Olay,
  OyuncuDurumu,
  OyuncuId,
} from "./tipler";

/** Sistem komutlarının (oyuncu_katil) oyuncu kimliği. */
export const SISTEM_OYUNCUSU = "sistem";

/**
 * Bir komutun zaman damgası mevcut dünya zamanından en fazla bu kadar ileride olabilir (400 gün).
 * Aksi halde t = 1e15 gibi bir değer milyonlarca saatlik tık döngüsüne (fiilen sonsuz) yol açar.
 */
export const EN_COK_KOMUT_ILERISI: Ms = 400 * GUN;

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

export class Simulasyon {
  /** Alt sistemlere verilen bağlam (Faz 2 testleri de bunu kullanabilir). */
  readonly baglam: BaglamUygulamasi;

  private constructor(
    readonly ic: DerlenmisIcerik,
    readonly dunya: Dunya,
    readonly gunluk: DamgaliKomut[],
  ) {
    this.baglam = new BaglamUygulamasi(ic);
  }

  /** İçeriği derler, dünyayı haritadan kurar, ilk saatlik tıkı (t=0) ve ilk çözümü planlar. */
  static olustur(veri: VeriPaketi, tohum: number): Simulasyon {
    const ic = icerikDerle(veri);
    const dunya = dunyaKur(ic, tohum);
    const s = new Simulasyon(ic, dunya, []);
    s.baglam.planla(dunya, 0, { tur: "saatlik_tik" });
    s.baglam.kirlet(dunya);
    return s;
  }

  /** Aynı veri + tohum + günlük ile baştan oynatır. */
  static yenidenOynat(veri: VeriPaketi, tohum: number, gunluk: readonly DamgaliKomut[]): Simulasyon {
    const s = Simulasyon.olustur(veri, tohum);
    for (const k of gunluk) {
      const r = s.uygula(k);
      if (!r.tamam) throw new Error(`yenidenOynat: gunluk komutu uygulanamadi (t=${k.t}, ${k.komut.tur}): ${r.hata}`);
    }
    return s;
  }

  /**
   * Önce calistirKadar(k.t); sonra oyuncuyu doğrular, komutu alt sisteme yönlendirir; başarılıysa günlüğe
   * ekler ve lojistiği kirletir (çözüm aynı t'de). k.t güvenli tamsayı değilse, k.t < dunya.zaman ise veya k.t > dunya.zaman + 400 gün ise hata sonucu döner (zaman ilerlemez).
   * Başarısız komut günlüğe girmez (ancak zaman k.t'ye ilerlemiş olur).
   */
  uygula(k: DamgaliKomut): KomutSonucu {
    const d = this.dunya;
    if (!Number.isSafeInteger(k.t)) return hata(`gecersiz komut zamani: ${k.t}`);
    if (k.t < d.zaman) return hata(`komut gecmiste: t=${k.t} < zaman=${d.zaman}`);
    if (k.t > d.zaman + EN_COK_KOMUT_ILERISI) {
      return hata(`komut zamani cok ileride: t=${k.t} > zaman + 400 gun (${d.zaman + EN_COK_KOMUT_ILERISI})`);
    }
    this.calistirKadar(k.t);
    const ctx = this.baglam;
    ctx.islenenOlay = null;

    const komut = k.komut;
    let sonuc: KomutSonucu;
    if (komut.tur === "oyuncu_katil") {
      sonuc = k.oyuncu === SISTEM_OYUNCUSU ? this.oyuncuKatil(komut) : hata("oyuncu_katil yalnizca 'sistem' ile verilebilir");
    } else if (k.oyuncu === SISTEM_OYUNCUSU || !oyuncuBul(d, k.oyuncu)) {
      sonuc = hata(`bilinmeyen oyuncu: ${k.oyuncu}`);
    } else {
      sonuc = this.yonlendir(k.oyuncu, komut);
    }
    if (!sonuc.tamam) return sonuc;

    this.gunluk.push({ t: k.t, oyuncu: k.oyuncu, komut: structuredClone(komut) });
    ctx.kirlet(d);
    return sonuc;
  }

  /** Komutu türüne göre alt sisteme yönlendirir. */
  private yonlendir(oyuncu: OyuncuId, komut: Komut): KomutSonucu {
    const d = this.dunya;
    const ctx = this.baglam;
    switch (komut.tur) {
      case "tesis_insa":
      case "yontem_degistir":
      case "tesis_durum":
      case "ticaret_emri":
      case "vergi_ayarla":
        return ekonomiKomutu(d, ctx, oyuncu, komut);
      case "kenar_gelistir":
      case "askeri_rezerv":
        return lojistikKomutu(d, ctx, oyuncu, komut);
      case "birlik_uret":
      case "savas_ilan":
      case "savunma_emri":
        return askeriKomutu(d, ctx, oyuncu, komut);
      case "arastir":
        return teknolojiKomutu(d, ctx, oyuncu, komut);
      case "anlasma_teklif":
      case "anlasma_feshet":
      case "yaptirim":
        return politikaKomutu(d, ctx, oyuncu, komut);
      case "oyuncu_katil":
        return hata("oyuncu_katil yonlendirilemez");
      default: {
        const _tamamlik: never = komut;
        return hata(`bilinmeyen komut: ${JSON.stringify(_tamamlik)}`);
      }
    }
  }

  /**
   * oyuncu_katil: oyuncu yoksa oluşturur (hazine, vergi, koruma, başlangıç birlikleri), listelenen sahipsiz
   * bölgeleri atar. Sahipli veya bilinmeyen bölge, tekrarlanan bölge, geçersiz kimlik hata verir (atomik:
   * hata varsa hiçbir değişiklik yapılmaz). Mevcut oyuncuya ek bölge verilebilir (başlangıç birlikleri
   * yalnızca yeni oyuncuya ve listenin ilk bölgesine eklenir).
   */
  private oyuncuKatil(komut: Extract<Komut, { tur: "oyuncu_katil" }>): KomutSonucu {
    const d = this.dunya;
    const ic = this.ic;
    const id = komut.oyuncu;
    if (typeof id !== "string" || id === "" || id === SISTEM_OYUNCUSU) return hata(`gecersiz oyuncu kimligi: ${id}`);

    const bolgeIndeksleri: number[] = [];
    for (const bid of komut.bolgeler) {
      const bi = ic.bolgeIndeks[bid];
      if (bi === undefined) return hata(`bilinmeyen bolge: ${bid}`);
      if (bolgeIndeksleri.includes(bi)) return hata(`tekrarlanan bolge: ${bid}`);
      const b = d.bolgeler[bi];
      if (!b) return hata(`bilinmeyen bolge: ${bid}`);
      if (b.sahip !== null) return hata(`bolge zaten sahipli: ${bid} (${b.sahip})`);
      bolgeIndeksleri.push(bi);
    }

    let oyuncu = oyuncuBul(d, id);
    const yeni = oyuncu === undefined;
    const baslangicBirlikleri: [number, number][] = [];
    if (yeni) {
      for (const birlikId of Object.keys(ic.param.baslangic.birlikler).sort()) {
        const bi = ic.birlikIndeks[birlikId];
        if (bi === undefined) return hata(`baslangic birligi bilinmiyor: ${birlikId}`);
        baslangicBirlikleri.push([bi, ic.param.baslangic.birlikler[birlikId] as number]);
      }
      const yeniOyuncu: OyuncuDurumu = {
        id,
        hazine: {
          miktar: ic.param.baslangic.hazine,
          yerelOran: 0,
          gelenOran: 0,
          t0: d.zaman,
          artik: 0,
          kapasite: Number.MAX_SAFE_INTEGER,
          surum: 0,
        },
        vergiPpm: ic.param.ekonomi.varsayilanVergiPpm,
        teknolojiler: [],
        arastirma: null,
        askeriRezervPpm: 0,
        katilmaZamani: d.zaman,
        korumaBitis: d.zaman + ic.param.askeri.yeniOyuncuKorumasiGun * GUN,
        kararlar: [],
      };
      let konum = d.oyuncular.findIndex((o) => o.id > id);
      if (konum < 0) konum = d.oyuncular.length;
      d.oyuncular.splice(konum, 0, yeniOyuncu);
      oyuncu = yeniOyuncu;
    }

    for (const bi of bolgeIndeksleri) (d.bolgeler[bi] as { sahip: OyuncuId | null }).sahip = id;
    const ilk = bolgeIndeksleri[0];
    if (yeni && ilk !== undefined) {
      const birlikler = (d.bolgeler[ilk] as { birlikler: number[] }).birlikler;
      for (const [bi, adet] of baslangicBirlikleri) birlikler[bi] = (birlikler[bi] as number) + adet;
    }
    return { tamam: true };
  }

  /** t'ye kadar (dahil) tüm olayları işler; dunya.zaman = t. t güvenli tamsayı değilse veya t < dunya.zaman ise RangeError fırlatır. */
  calistirKadar(t: Ms): void {
    const d = this.dunya;
    if (!Number.isSafeInteger(t)) throw new RangeError(`calistirKadar: t guvenli tamsayi olmali (${t})`);
    if (t < d.zaman) throw new RangeError(`calistirKadar: gecmise gidilemez (t=${t} < zaman=${d.zaman})`);
    const ctx = this.baglam;
    try {
      for (;;) {
        const bas = kuyrukBas(d.kuyruk);
        if (bas === undefined || bas.t > t) break;
        const olay = kuyrukCikar(d.kuyruk) as Olay;
        d.zaman = olay.t;
        ctx.islenenOlay = olay.veri.tur;
        this.olayIsle(olay);
      }
    } finally {
      ctx.islenenOlay = null;
    }
    d.zaman = t;
  }

  /** Bir olayı türüne göre ilgili alt sisteme yönlendirir. */
  private olayIsle(olay: Olay): void {
    const d = this.dunya;
    const ctx = this.baglam;
    const v = olay.veri;
    switch (v.tur) {
      case "oran_delta":
        stokGelenEkle(d, ctx, v.bolge, v.mal, v.delta);
        ctx.kirlet(d);
        break;
      case "esik": {
        const s = d.bolgeler[v.bolge]?.stoklar[v.mal];
        // Surum eşleşmiyorsa eşik eskimiştir (oran sonradan değişmiş): yok say.
        if (s && s.surum === v.surum) {
          stokUzlastir(d, v.bolge, v.mal);
          ctx.kirlet(d);
        }
        break;
      }
      case "insaat_bitti":
        insaatBitti(d, ctx, v.insaat);
        break;
      case "parti_bitti":
        partiBitti(d, ctx, v.parti);
        break;
      case "arastirma_bitti":
        arastirmaBitti(d, ctx, v.oyuncu);
        break;
      case "savas_pencere_ac":
        savasPencereAc(d, ctx, v.savas);
        break;
      case "savas_pencere_kapa":
        savasPencereKapa(d, ctx, v.savas);
        break;
      case "saatlik_tik": {
        saatlikTik(d, ctx);
        // Sonraki tam saate yeni tık (d.zaman tam saat değilse de sonraki tam saate denk gelir).
        ctx.planla(d, (Math.floor(d.zaman / SAAT) + 1) * SAAT, { tur: "saatlik_tik" });
        break;
      }
      case "cozum": {
        const l = d.lojistik;
        // Kirli değilse (aynı anda birden çok çözüm planlanmışsa) fazlalık sessizce yok sayılır.
        if (l.kirli) {
          lojistikCoz(d, ctx);
          l.kirli = false;
          l.cozumPlanli = false;
          l.sonCozum = d.zaman;
          l.cozumSayisi++;
        }
        break;
      }
      default: {
        const _tamamlik: never = v;
        throw new Error(`bilinmeyen olay: ${JSON.stringify(_tamamlik)}`);
      }
    }
  }

  /** Kanonik durum özeti (FNV-1a 64, onaltılık). */
  durumOzeti(): string {
    return durumOzeti(this.dunya);
  }

  gorunum(): DunyaGorunumu {
    return { zaman: this.dunya.zaman, dunya: this.dunya, ic: this.ic };
  }

  /** Bağımsız kopya (structuredClone); ileriye bakan botlar için. */
  klonla(): Simulasyon {
    return new Simulasyon(this.ic, structuredClone(this.dunya), structuredClone(this.gunluk));
  }
}
