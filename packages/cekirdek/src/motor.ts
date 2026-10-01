/**
 * Simülasyon motoru: olay kuyruğu döngüsü, komut yönlendirme ve oyuncu kaydı.
 * Ekonomi/lojistik/askeri/teknoloji/politika alt sistemleri ayrı modüllerdedir; motor yalnızca çağırır.
 */
import { BaglamUygulamasi } from "./baglam";
import { icerikDerle } from "./derle";
import { askeriKomutu, partiBitti, savasPencereAc, savasPencereKapa } from "./askeri";
import { ekonomiKomutu, insaatBitti, saatlikTik } from "./ekonomi";
import { kuyrukBas, kuyrukCikar } from "./kuyruk";
import { dunyaKur } from "./kurulum";
import { lojistikCoz, lojistikKomutu } from "./lojistik/cozum";
import { durumOzeti } from "./ozet";
import { anlikGoruntuCoz, dunyaIcerikUyumu, kuralSurumuHesapla } from "./serilestir";
import { pazarTablosu } from "./pazar/tablo";
import { ticaretDefteriBaslat } from "./pazar";
import { politikaKomutu } from "./politika";
import { sanayiKomutu, sondajBitti } from "./sanayi";
import { iklimGunluk, tarimKomutu } from "./tarim";
import { mulkKomutu, mulkOyuncuAl, mulkOyuncuBul } from "./mulk";
import { yurtPlanla, yurtUygula } from "./mulk/yurt";
import type { YurtPlani } from "./mulk/yurt";
import { eskimisEsikleriBuda, oyuncuBul, stokGelenEkle, stokUzlastir } from "./stok";
import { arastirmaBitti, teknolojiKomutu } from "./teknoloji";
import { GUN, SAAT } from "./tipler";
import type {
  CekirdekVeriPaketi,
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

/** Kurtarma seçenekleri (`anlikGoruntudenYukle`). */
export interface KurtarmaSecenegi {
  /** true: kalan günlükteki başarısız kayıt hata fırlatmaz (yalnız sonucu raporlanır). Varsayılan false. */
  basarisizlaraIzin?: boolean;
}

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
  static olustur(veri: CekirdekVeriPaketi, tohum: number): Simulasyon {
    const ic = icerikDerle(veri);
    const dunya = dunyaKur(ic, tohum);
    const s = new Simulasyon(ic, dunya, []);
    s.baglam.planla(dunya, 0, { tur: "saatlik_tik" });
    // Tarım açıksa ilk günlük iklim tıkı t = 0'da (dünya iklim durumu varsa); kapalıysa kuyruğa hiçbir şey eklenmez.
    if (dunya.iklim !== undefined) s.baglam.planla(dunya, 0, { tur: "iklim_gunluk" });
    s.baglam.kirlet(dunya);
    return s;
  }

  /**
   * Verilen dünyadan devam eden simülasyon (anlık görüntüden yükleme, docs/06 §14). İçerik `veri`den yeniden derlenir;
   * dünya içerikle uyumlu olmalıdır (`dunyaIcerikUyumu`: bölge kimlikleri, mal/birlik/kenar sayıları...), aksi halde
   * `SerilestirmeHatasi`. Dünya KOPYALANMAZ (sahipliği simülasyona geçer; `dunyaCoz` zaten bağımsız bir nesne verir).
   * `gunluk` yalnız geçmiş kaydıdır (sim.gunluk'e kopyalanır, YENİDEN UYGULANMAZ); verilmezse boş başlar.
   * Kuyruk, PRNG ve sayaçlar dünyanın içinde olduğundan ek planlama yapılmaz. Modül önbellekleri (WeakMap, `ic`
   * anahtarlı) yeni `ic` için tembelce yeniden kurulur; sonuçları yalnız içeriğe bağlıdır.
   */
  static yukle(veri: CekirdekVeriPaketi, dunya: Dunya, gunluk?: readonly DamgaliKomut[]): Simulasyon {
    const ic = icerikDerle(veri);
    dunyaIcerikUyumu(ic, dunya);
    return new Simulasyon(ic, dunya, gunluk ? structuredClone([...gunluk]) : []);
  }

  /**
   * Kurtarma (kill -9 sonrası): anlık görüntü metnini çözer (kural sürümü `veri`den hesaplanıp denetlenir), dünyayı
   * yükler ve görüntüden SONRA kaydedilmiş başarılı komutları (`kalanGunluk`, günlük sırasıyla) uygular. Kalan
   * komutlardan biri uygulanamazsa hata fırlatır (yenidenOynat gibi). Dönen simülasyonun günlüğü = kalanGunluk.
   */
  static anlikGoruntudenYukle(
    veri: CekirdekVeriPaketi,
    goruntu: string,
    kalanGunluk: readonly DamgaliKomut[] = [],
    secenek: KurtarmaSecenegi = {},
  ): Simulasyon {
    return Simulasyon.anlikGoruntudenYukleSonuclu(veri, goruntu, kalanGunluk, secenek).sim;
  }

  /**
   * `anlikGoruntudenYukle` ile aynı; ek olarak kalan günlüğün her kaydı için `KomutSonucu` döndürür (günlük sırasıyla).
   * `secenek.basarisizlaraIzin` true ise başarısız kayıt hata fırlatmaz (sunucu başarısız komutları da günlüğe yazıyorsa):
   * başarısız komut zamanı ilerletir ama durumu değiştirmez (docs/06 §14), bu yüzden sonuç kesintisiz koşuyla aynıdır.
   * Dönen simülasyonun günlüğü yalnız BAŞARILI kayıtları içerir.
   */
  static anlikGoruntudenYukleSonuclu(
    veri: CekirdekVeriPaketi,
    goruntu: string,
    kalanGunluk: readonly DamgaliKomut[] = [],
    secenek: KurtarmaSecenegi = {},
  ): { sim: Simulasyon; sonuclar: KomutSonucu[] } {
    const g = anlikGoruntuCoz(goruntu, kuralSurumuHesapla(veri));
    const s = Simulasyon.yukle(veri, g.dunya);
    const sonuclar: KomutSonucu[] = [];
    for (const k of kalanGunluk) {
      const r = s.uygula(k);
      if (!r.tamam && secenek.basarisizlaraIzin !== true) {
        throw new Error(`anlikGoruntudenYukle: kalan gunluk komutu uygulanamadi (t=${k.t}, ${k.komut.tur}): ${r.hata}`);
      }
      sonuclar.push(r);
    }
    return { sim: s, sonuclar };
  }

  /** Aynı veri + tohum + günlük ile baştan oynatır. */
  static yenidenOynat(veri: CekirdekVeriPaketi, tohum: number, gunluk: readonly DamgaliKomut[]): Simulasyon {
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
    // Mülk kipi (S3): hareketsizlik merdiveninin verisi (son başarılı komut anı); kapalıyken d.mulk yoktur.
    if (d.mulk !== undefined && k.oyuncu !== SISTEM_OYUNCUSU) {
      const mo = mulkOyuncuBul(d, k.oyuncu);
      if (mo !== undefined) mo.sonEtkinlik = k.t;
    }
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
      case "ekim_plani":
      case "gubre_dozu":
        return tarimKomutu(d, ctx, oyuncu, komut);
      case "tesis_olcek_yukselt":
      case "genel_onarim":
      case "bakim_duzeyi":
      case "arama_sondaji":
        return sanayiKomutu(d, ctx, oyuncu, komut);
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
      case "parsel_al":
      case "tesis_insa_hucre":
      case "yapi_yerlestir":
      case "parsel_birak":
      case "insaat_iptal":
        return mulkKomutu(d, ctx, oyuncu, komut);
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
   * bölgeleri atar. Mülk kipinde bölge atanmaz; hazine = hibe, koruma = `kalkanGun` ve `yurtHucre` > 0 ise bedava yurt verilir
   * (`mulk/yurt.ts`; isteğe bağlı `ilce`). Sahipli veya bilinmeyen bölge, tekrarlanan bölge, geçersiz kimlik hata verir (atomik:
   * hata varsa hiçbir değişiklik yapılmaz). Mevcut oyuncuya ek bölge verilebilir (başlangıç birlikleri
   * yalnızca yeni oyuncuya ve listenin ilk bölgesine eklenir).
   */
  private oyuncuKatil(komut: Extract<Komut, { tur: "oyuncu_katil" }>): KomutSonucu {
    const d = this.dunya;
    const ic = this.ic;
    const id = komut.oyuncu;
    if (typeof id !== "string" || id === "" || id === SISTEM_OYUNCUSU) return hata(`gecersiz oyuncu kimligi: ${id}`);
    if (!Array.isArray(komut.bolgeler)) return hata("bolgeler bir dizi olmali");
    // Mülk kipi (S3): bölge sahipliği yoktur (merkezler kamudur); oyuncu bölgesiz katılır, hazinesi hibedir.
    const mulk = ic.mulk !== undefined && d.mulk !== undefined;
    // Bedava yurt (H6): `mulk.yeniOyuncu.yurtHucre`; ilçe `komut.ilce` ya da doluluğu en düşük ilçe. Plan, dünya değişmeden
    // önce yapılır (atomik: yurt istenen ilçede verilemiyorsa katılım reddedilir).
    let yurt: YurtPlani | null = null;
    if (mulk) {
      if (komut.bolgeler.length > 0) return hata("mulk kipinde bolge sahipligi yok: bolgeler bos olmali");
      if (id.includes("#")) return hata(`gecersiz oyuncu kimligi ('#' iceremez): ${id}`);
      if (oyuncuBul(d, id) !== undefined) return hata(`oyuncu zaten katilmis: ${id}`);
      if (komut.ilce !== undefined && typeof komut.ilce !== "string") return hata(`gecersiz ilce: ${String(komut.ilce)}`);
      const plan = yurtPlanla(d, ic, komut.ilce);
      if (typeof plan === "string") return hata(plan);
      yurt = plan;
    } else if (komut.ilce !== undefined) {
      return hata("ilce yalnizca mulk kipinde verilebilir");
    }

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
          miktar: mulk ? (ic.mulk as NonNullable<typeof ic.mulk>).p.yeniOyuncu.hibe : ic.param.baslangic.hazine,
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
        // Yeni oyuncu kalkanı: mülk kipinde `mulk.yeniOyuncu.kalkanGun` (14), bölge kipinde `askeri.yeniOyuncuKorumasiGun` (7).
        korumaBitis: d.zaman + (mulk ? (ic.mulk as NonNullable<typeof ic.mulk>).p.yeniOyuncu.kalkanGun : ic.param.askeri.yeniOyuncuKorumasiGun) * GUN,
        kararlar: [],
      };
      // Sanayi (B2): bakım düzeyi yalnız sanayi açıkken tutulur (normal = 1); kapalıyken alan yazılmaz (özet değişmez).
      if (ic.param.sanayi !== undefined) yeniOyuncu.bakimDuzeyi = 1;
      // Pazar v1 (B3): ticaret rejimi (varsayılan kademe 0: tarife ve ihracat vergisi 0; komutu B4'te) ve ticaret defteri.
      const pz = pazarTablosu(ic);
      if (pz !== null) {
        yeniOyuncu.ticaretRejimi = { ithalatTarifePpm: pz.p.tarife.ithalatPpm[0] as number, ihracatVergisiPpm: pz.p.tarife.ihracatVergisiPpm[0] as number };
        yeniOyuncu.ticaretDefteri = ticaretDefteriBaslat(d.zaman);
      }
      let konum = d.oyuncular.findIndex((o) => o.id > id);
      if (konum < 0) konum = d.oyuncular.length;
      d.oyuncular.splice(konum, 0, yeniOyuncu);
      oyuncu = yeniOyuncu;
      if (mulk) {
        mulkOyuncuAl(d.mulk as NonNullable<Dunya["mulk"]>, id, d.zaman);
        if (yurt !== null) yurtUygula(d, this.baglam, id, yurt);
      }
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
      case "iklim_gunluk":
        iklimGunluk(d, ctx);
        break;
      case "sondaj_bitti":
        sondajBitti(d, ctx, v.bolge, v.mal);
        break;
      case "cozum": {
        const l = d.lojistik;
        // Kirli değilse (aynı anda birden çok çözüm planlanmışsa) fazlalık sessizce yok sayılır.
        if (l.kirli) {
          lojistikCoz(d, ctx);
          l.kirli = false;
          l.cozumPlanli = false;
          l.sonCozum = d.zaman;
          l.cozumSayisi++;
          // Tembel yığın temizliği (docs/06 §14.1): çözüm oranları değiştirip eşikleri eskittiği an; eskimiş eşikler atılır.
          eskimisEsikleriBuda(d);
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
