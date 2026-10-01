/**
 * İstemci <-> sunucu WebSocket mesaj sözleşmesi (JSON metin çerçeveleri). İstemcideki işçi protokolünden
 * (`istemci/src/isci/protokol.ts`) türetildi: `komut → komutSonuc` korunur (idempotans anahtarı ve sunucu `t`'si
 * eklenir), `hazir` el sıkışmaya (`merhaba` → `hosgeldin`) dönüşür, `baslat`/`hiz`/`duraklat` düşer (dünyayı sunucu
 * sürer), tam `Kare` yerine ilgi alanı karesi + delta gider, `zaman` istemci isteğiyle eşitlemeye dönüşür.
 *
 * Akış:
 * 1. İstemci bağlanır ve İLK mesaj olarak `merhaba` gönderir (protokol sürümü, token, istemci kimliği). Sunucu kimliği
 *    token'dan çözer (istemcinin söylediği oyuncu kimliğine güvenilmez) ve `hosgeldin` döner (kural sürümü, dizin).
 * 2. `abone` ile ilgi alanı bildirilir; sunucu tam `kare` gönderir, sonra değişiklik oldukça `delta`.
 * 3. `komut` niyeti `anahtar` (idempotans) ile gelir; sunucu `t`'yi basar, günlüğe yazar (grup commit), uygular ve
 *    `komutSonucu` döner. Aynı (oyuncu, istemci, anahtar) ikinci kez uygulanmaz: ilk sonuç `tekrar: true` ile döner.
 * 4. `zamanIste` → `zaman`: NTP benzeri eşitleme (istemci gidiş-dönüşün yarısıyla ofset kestirir).
 */
import { z } from "zod";
import type { Komut, KomutSonucu, Ms, OyuncuId } from "@bolge/cekirdek";
import { KomutSemasi } from "./komut-sema";
import { DefterSemasi } from "./defter";
import type { Defter } from "./defter";
import { DonusOzetiSemasi } from "./donus";
import type { DonusOzeti } from "./donus";
import type { IlgiKaresi, KareDeltasi } from "./kare";

/** Protokol biçim sürümü; uyuşmazsa sunucu bağlantıyı `KAPANIS.protokol` ile kapatır. */
export const PROTOKOL_SURUMU = 1;

/** Tek bir istemci mesajının bayt üst sınırı (sunucu `ws` `maxPayload` olarak uygular). */
export const EN_BUYUK_MESAJ_BAYT = 64 * 1024;

/** WebSocket kapanış kodları (4000–4999 uygulamaya ayrılmıştır). */
export const KAPANIS = {
  protokol: 4001,
  kural: 4002,
  kimlik: 4003,
  zamanAsimi: 4008,
  kapaniyor: 4009,
} as const;

// ---------------------------------------------------------------------------
// İstemci -> sunucu
// ---------------------------------------------------------------------------

/** Kimlik dizeleri: istemci kimliği, idempotans anahtarı. Yazdırılabilir ASCII, 1–64. */
const kisaKimlik = z.string().min(1).max(64).regex(/^[\x21-\x7e]+$/, "yazdirilabilir ASCII bekleniyordu");
const istekNo = z.number().int().nonnegative().safe();

export const MerhabaSemasi = z.object({
  tur: z.literal("merhaba"),
  protokolSurumu: z.number().int(),
  /** Oturum token'ı (geliştirmede `gelistirmeTokeni`; sonra Better Auth oturumu). */
  token: z.string().min(1).max(4096),
  /** Kurulum/sekme başına kalıcı istemci kimliği; idempotans anahtarlarının kapsamıdır. */
  istemciKimligi: kisaKimlik,
  /**
   * İstemcinin yüklediği veriden hesapladığı kural sürümü (`kuralSurumuHesapla`). İSTEĞE BAĞLI: gönderilmezse bağlantı
   * kabul edilir ve bağlayıcı değer `hosgeldin.kuralSurumu`'dur; gönderilir ve sunucuyla uyuşmazsa `kural_surumu` hatası.
   */
  kuralSurumu: z.string().min(1).max(64).optional(),
});

export const AboneSemasi = z.object({
  tur: z.literal("abone"),
  /** Bölge kimlikleri (bugünkü 53 bölge / merkez düğümleri). */
  bolgeler: z.array(z.string().min(1).max(64)).max(512).optional(),
  /** İl kimlikleri (mülk kipi: ilin bütün ilçeleri + il merkezi bölgesi). */
  iller: z.array(z.string().min(1).max(64)).max(128).optional(),
  /** İlçe kimlikleri (mülk kipi: ilçe durumu ve hücre sahipliği). */
  ilceler: z.array(z.string().min(1).max(64)).max(256).optional(),
  /**
   * Mülk kipi: ilçe karelerine ayrılmış hücre LİSTESİ (`ayrilmis`) de gelsin mi (varsayılan hayır). Liste büyük olabilir
   * (Gebze ölçeğinde ilçe başına ~1,5 MB / gzip ~200 KB); yalnız ayrılmış hücreleri çizen istemci ister. `ayrilmisAdet` (sayı)
   * her zaman gelir.
   */
  ayrilmis: z.boolean().optional(),
  /**
   * Mülk kipi: ilçe karelerine kamu arsası GRUPLARI (`kamu`, dikdörtgen blok) de gelsin mi (varsayılan hayır; Gebze ölçeğinde
   * ilçe başına on binlerce hücre). `kamuAdet` (sayı) her zaman gelir. Kamu kümesi değişmez: deltada tekrarlanmaz.
   */
  kamu: z.boolean().optional(),
});

export const KomutMesajiSemasi = z.object({
  tur: z.literal("komut"),
  /** İdempotans anahtarı: (oyuncu, istemciKimligi, anahtar) başına bir kez uygulanır. */
  anahtar: kisaKimlik,
  komut: KomutSemasi,
  /** Yalnız tanı içindir; damgalamada YOK SAYILIR (zamanı sunucu basar). */
  istemciZamani: z.number().optional(),
});

/**
 * Oyuncunun kendi katılımı (yalnız mülk kipi): sunucu `oyuncu_katil {oyuncu: <doğrulanmış kimlik>, bolgeler: [], ilce}`
 * komutunu "sistem" olarak damgalar; oyuncu kimliği ASLA mesajdan gelmez (başkası adına katılım olmaz). Yanıt
 * `komutSonucu` (aynı `anahtar`); ikinci katılım çekirdeğin "oyuncu zaten katilmis" hatasını ya da idempotans
 * sonucunu döner. Yönetici yolu (`komut` + `oyuncu_katil`) aynen kalır.
 */
export const KatilSemasi = z.object({
  tur: z.literal("katil"),
  /** İdempotans anahtarı (kapsam: katılan oyuncu + anahtar). */
  anahtar: kisaKimlik,
  /** Bedava yurdun ilçesi (yoksa çekirdek doluluğu en düşük ilçeyi seçer). */
  ilce: z.string().min(1).max(64).optional(),
});

/**
 * İstemci "Sen yokken" özetini gösterdi/onayladı (`Devam`, ekran açıldı): sunucu `ozetOkunduT`'yi `min(t, şimdi)` yapar ve
 * `sonGorulen` çapasını o ana çeker (bir sonraki özet buradan başlar; ekran/çökme/yenileme sonrası özet kaybolmaz). Yanıt yoktur.
 * `t`: istemcinin gördüğü sim zamanı (sunucu şimdiden ilerisini kabul etmez, geriye gideni yok sayar).
 */
export const OzetOkunduSemasi = z.object({
  tur: z.literal("ozetOkundu"),
  t: z.number().int().nonnegative().safe(),
});

export const ZamanIsteSemasi = z.object({
  tur: z.literal("zamanIste"),
  /** İstemcinin kendi saati (ör. performance.now()); yanıtta aynen döner. */
  istemciGonderim: z.number(),
});

export const OzetIsteSemasi = z.object({ tur: z.literal("ozetIste"), istek: istekNo.optional() });

/**
 * Esnaf Defteri okuması (yalnız oyuncu): yanıt `defter` mesajıdır (`istek` aynen döner). Kazanılan ödüller/damgalar ve sıradaki ödüllü
 * kavramlar; tutarlar çekirdek ödül tablosundan okunur (bkz. `defter.ts`).
 */
export const DefterIsteSemasi = z.object({ tur: z.literal("defterIste"), istek: istekNo.optional() });

/** Yalnız yönetici ve yalnız elle saatli (test/geliştirme) sunucuda: sim saatini `t`'ye ilerletir. */
export const ZamanIlerletSemasi = z.object({ tur: z.literal("zamanIlerlet"), t: z.number().int().nonnegative().safe(), istek: istekNo.optional() });

export const IstemciMesajiSemasi = z.discriminatedUnion("tur", [
  MerhabaSemasi,
  AboneSemasi,
  KomutMesajiSemasi,
  KatilSemasi,
  OzetOkunduSemasi,
  ZamanIsteSemasi,
  OzetIsteSemasi,
  DefterIsteSemasi,
  ZamanIlerletSemasi,
]);
export type IstemciMesaji = z.infer<typeof IstemciMesajiSemasi>;

// ---------------------------------------------------------------------------
// Sunucu -> istemci
// ---------------------------------------------------------------------------

/** Kimlik -> indeks eşlemesi: karelerdeki indekslerin anlamı. İstemci adları kendi veri dosyalarından okur. */
export interface Dizin {
  bolgeler: string[];
  mallar: string[];
  tesisTurleri: string[];
  yontemler: string[];
  birlikler: string[];
  teknolojiler: string[];
}

export type HataKodu =
  | "gecersiz_mesaj"
  | "protokol_surumu"
  | "kimlik"
  | "kural_surumu"
  | "sira"
  | "yetki"
  | "hiz_siniri"
  | "gecersiz_ilgi"
  | "kapaniyor"
  | "ic_hata"
  /** Sunucu kapalıyken geçen süreyi yetiştiriyor: komut kabul edilmedi (günlüğe girmedi); `durum` bitişi bildirir. */
  | "yetisiyor"
  /** Marka adı (`marka_tanimla.ad`) sözdizimi (çekirdek `adKanonik`) ya da yasaklı ad süzgeci (sunucu) reddi: komut günlüğe girmedi. Kodlar `/giris/ad` ile aynıdır. */
  | "ad_gecersiz"
  | "ad_yasakli";

export type SunucuMesaji =
  | {
      tur: "hosgeldin";
      protokolSurumu: number;
      kuralSurumu: string;
      /** Token'dan çözülen oyuncu kimliği (yönetici için "sistem"). */
      oyuncu: OyuncuId;
      yonetici: boolean;
      simZamani: Ms;
      /** Son uygulanan günlük sıra numarası. */
      seq: number;
      /** Sim ms / gerçek ms (elle saatte 0). */
      hiz: number;
      /** Sunucu kapalıyken geçen süreyi yetiştiriyor (komutlar `yetisiyor` hatasıyla reddedilir). Yoksa false. */
      yetisiyor?: boolean;
      /** Yetişme hedefi (sim ms; duvar saatinin şimdiki sim zamanı). Yalnız yetişirken. */
      hedefZamani?: Ms;
      /**
       * Dünyanın duvar saati epoch'u (epoch ms; bir Türkiye gece yarısı): mutlak saatli dünyada gerçek tarih = `dunyaEpochMs + simZamani`.
       * Elle saatli ya da epoch'suz dünyada ALAN YOKTUR (istemci gerçek tarih göstermez). İsteğe bağlı: eski sunucularda da yok.
       */
      dunyaEpochMs?: number;
      /**
       * "Sen yokken" özeti (yalnız oyuncu kimliği, yetişme bitmiş, yokluk ≥ 1 sa ve oyuncunun başka açık bağlantısı yokken). Yetişme sürüyorsa
       * yoktur: özet yetişme bitince ayrı `donusOzeti` mesajıyla gelir.
       */
      donusOzeti?: DonusOzeti;
      dizin: Dizin;
    }
  /** Tam kare (abonelikten sonra ve gerektiğinde). `rev` bağlantı başına artan kare sürümüdür. */
  | { tur: "kare"; rev: number; seq: number; ilgi: number[]; ilceIlgisi?: string[]; kare: IlgiKaresi }
  /** `onceki` sürümündeki kareye uygulanır (`deltaUygula`). */
  | { tur: "delta"; rev: number; onceki: number; seq: number; delta: KareDeltasi }
  /** `tekrar`: anahtar daha önce işlenmişti, ilk sonuç döndü (yeniden uygulanmadı). */
  | { tur: "komutSonucu"; anahtar: string; seq: number; t: Ms; komut: Komut; sonuc: KomutSonucu; tekrar: boolean }
  /**
   * `zamanIste` yanıtı ya da (`yayin: true`) sunucunun periyodik zaman yayını: yalnız `t` değiştiğinde de istemci saati
   * kaymasın. Yayında `istemciGonderim` anlamsızdır (-1); gidiş-dönüş ölçülemez, `simZamani` tek yönlü gecikme kadar eskidir.
   */
  | { tur: "zaman"; istemciGonderim: number; sunucuDuvar: number; simZamani: Ms; hiz: number; yayin?: boolean }
  | { tur: "ozet"; istek?: number; t: Ms; seq: number; durumOzeti: string }
  /** `defterIste` yanıtı: Esnaf Defteri (alanlar `Defter`'in düzleşmiş hâlidir; tutarlar çekirdek ödül tablosundan okunur). */
  | ({ tur: "defter"; istek?: number } & Defter)
  /**
   * Yetişme durumu (yalnız ekleme): sunucu kapalı geçen süreyi işletirken yaklaşık saniyede bir, bitince bir kez
   * (`yetisiyor: false`) gönderilir. `simZamani` dünyanın şimdiki zamanı, `hedefZamani` ulaşılacak sim zamanıdır.
   */
  | { tur: "durum"; yetisiyor: boolean; simZamani: Ms; hedefZamani: Ms }
  /**
   * Yetişme sürerken bağlanan oyuncuya, yetişme bitince bir kez: "Sen yokken" özeti (bkz. `DonusOzeti`). Yetişme bitmişken bağlananlara
   * özet `hosgeldin.donusOzeti` ile gelir ve bu mesaj gönderilmez. Bant K0 ise (yokluk < 1 sa) hiç gönderilmez.
   */
  | { tur: "donusOzeti"; ozet: DonusOzeti }
  | { tur: "hata"; kod: HataKodu; mesaj: string; anahtar?: string; istek?: number };

// İstemci tarafı doğrulama için sunucu mesajı şemaları (kare içeriği yapısal olarak denetlenir).
const tam = z.number().int();
const stokFormuluSemasi = z.tuple([tam, tam, tam, tam, tam]);
const bolgeKaresiSemasi = z.object({
  i: tam,
  id: z.string(),
  genel: z.object({
    sahip: z.string().nullable(),
    nufus: tam,
    tesisler: z.array(z.tuple([tam, z.union([z.literal(0), z.literal(1)])])),
    durus: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    // Yalnız ekleme: tamamlanmış dükkânlar (tabela). Eski istemci bilinmeyen anahtarı atar.
    dukkanlar: z.array(z.tuple([tam, z.string(), z.union([z.literal(0), z.literal(1), z.literal(2)]), z.string(), tam, tam])).optional(),
  }),
  ozel: z
    .object({
      stoklar: z.array(stokFormuluSemasi),
      uretimOrani: z.array(tam),
      tesisler: z.array(z.tuple([tam, tam, tam, z.union([z.literal(0), z.literal(1)]), tam, tam])),
      // Yalnız ekleme: S olmayan tesislerin ölçeği (demete öğe eklenmez; zod tuple fazla öğeyi reddeder). Eski istemci bilinmeyen anahtarı atar.
      tesisOlcek: z.array(z.tuple([tam, z.union([z.literal(1), z.literal(2)])])).optional(),
      // Yalnız ekleme: sahibine dükkân görünümü (raf demeti `fiyatT` ile İLK tanımda tamdır; demete öğe eklenmez).
      dukkanlar: z
        .array(
          z.tuple([
            tam,
            z.array(z.tuple([z.string(), tam, tam, z.union([z.literal(0), z.literal(1)]), tam, tam])),
            tam,
            z.tuple([tam, tam, tam]),
            tam,
          ]),
        )
        .optional(),
      // Yalnız ekleme: aşınması > 0 olan tesislerin aşınması (ppm). Demete öğe eklenmez; eski istemci bilinmeyen anahtarı atar.
      tesisAsinma: z.array(z.tuple([tam, tam])).optional(),
      // Yalnız ekleme: şebekeden son çözümde alınan miktar `[mal, mili-birim/saat]` (demete öğe eklenmez; eski istemci bilinmeyen anahtarı atar).
      sebeke: z.array(z.tuple([z.string(), tam])).optional(),
      emirler: z.array(z.tuple([tam, z.union([z.literal(0), z.literal(1)]), tam, tam])),
      birlikler: z.array(tam),
      gidaPpm: tam,
      ikmalPpm: tam,
      rezervKalan: z.array(tam),
    })
    .optional(),
});
const hucreTaban = [z.string(), z.string(), z.enum(["kirsal", "kasaba", "sehir"]), tam, tam] as const;
/** `[kimlik, sahip, sınıf, tesis, inşaat, tür?, değerMili?]` (son iki eleman isteğe bağlı: bkz. `HucreKaresi`). */
const hucreKaresiSemasi = z.union([
  z.tuple([...hucreTaban]),
  z.tuple([...hucreTaban, z.string()]),
  z.tuple([...hucreTaban, z.string(), tam]),
]);
const insaatTaban = [tam, z.string(), tam, tam, tam] as const;
/** `[kimlik, tür, bölge, hedef, bitiş, başlangıç?, ekYapı?]` (bkz. `OyuncuKaresi.insaatlar`). */
const insaatKaresiSemasi = z.union([
  z.tuple([...insaatTaban]),
  z.tuple([...insaatTaban, tam]),
  z.tuple([...insaatTaban, tam, z.string()]),
]);
const ilceKaresiSemasi = z.object({
  id: z.string(),
  il: z.string(),
  seviye: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  uygunHucre: tam,
  satilmisHucre: tam,
  hucreler: z.array(hucreKaresiSemasi),
  ayrilmisAdet: tam.optional(),
  // Yalnız ekleme: para ile satılmış ayrılmış hücre sayısı (fiyat eğrisi sayacı); 0 ise yazılmaz.
  ayrilmisSatilmis: tam.optional(),
  // Yalnız ekleme: dükkânı olan oyuncuya ilçe talebi Q `[mal, qMiliSaat]` (isteyenin raf mallarında).
  talep: z.array(z.tuple([z.string(), tam])).optional(),
  ayrilmis: z.array(z.string()).optional(),
  kamuAdet: tam.optional(),
  kamu: z
    .array(
      z.object({
        sahip: z.string(),
        tur: z.enum(["meydan", "pazar", "park", "hizmet", "kiyi", "sanayi_rezervi", "hazine"]),
        blok: z.array(z.tuple([tam, tam, tam, tam])),
      }),
    )
    .optional(),
});
const oyuncuKaresiSemasi = z.object({
  id: z.string(),
  hazine: stokFormuluSemasi,
  vergiPpm: tam,
  askeriRezervPpm: tam,
  teknolojiler: z.array(tam),
  arastirma: z.object({ teknoloji: tam, bitis: tam }).nullable(),
  korumaBitis: tam,
  insaatlar: z.array(insaatKaresiSemasi),
  insaatYontem: z.array(z.tuple([tam, z.string()])).optional(),
  erkenOyun: z.tuple([tam, tam, tam, tam]).optional(),
  mulk: z
    .object({
      araziDegeriMili: tam,
      araziVergisi: stokFormuluSemasi,
      ilceHucre: z.array(z.tuple([z.string(), tam])),
      sonEtkinlik: tam,
      indirimliYapiKalan: tam.optional(),
      ayrilmisBitis: tam.optional(),
      katilimIlcesi: z.string().optional(),
    })
    .optional(),
  // Yalnız ekleme (isteğe bağlı, yalnız kendisine): marka tanımları ve ilk dükkân satışı anı.
  markalar: z.array(z.tuple([z.string(), tam, tam])).optional(),
  ilkSatisT: tam.optional(),
});
/** Görünen adlar: oyuncu kimliği -> ad (sunucu üretimli ya da oyuncunun seçtiği; 2-24 karakter). */
const adlarSemasi = z.record(z.string().min(1).max(32), z.string().min(2).max(24));
export const IlgiKaresiSemasi = z.object({
  t: tam,
  bolgeler: z.array(bolgeKaresiSemasi),
  fiyat: z.array(tam),
  oyuncu: oyuncuKaresiSemasi.optional(),
  ilceler: z.array(ilceKaresiSemasi).optional(),
  adlar: adlarSemasi.optional(),
});
export const KareDeltasiSemasi = z.object({
  t: tam,
  bolgeler: z.array(bolgeKaresiSemasi),
  cikan: z.array(tam),
  fiyat: z.array(tam).optional(),
  oyuncu: oyuncuKaresiSemasi.nullable().optional(),
  ilceler: z.array(ilceKaresiSemasi).optional(),
  cikanIlceler: z.array(z.string()).optional(),
  adlar: adlarSemasi.optional(),
});
const komutSonucuSemasi = z.union([z.object({ tamam: z.literal(true) }), z.object({ tamam: z.literal(false), hata: z.string() })]);
const dizinSemasi = z.object({
  bolgeler: z.array(z.string()),
  mallar: z.array(z.string()),
  tesisTurleri: z.array(z.string()),
  yontemler: z.array(z.string()),
  birlikler: z.array(z.string()),
  teknolojiler: z.array(z.string()),
});

export const SunucuMesajiSemasi = z.discriminatedUnion("tur", [
  z.object({
    tur: z.literal("hosgeldin"),
    protokolSurumu: tam,
    kuralSurumu: z.string(),
    oyuncu: z.string(),
    yonetici: z.boolean(),
    simZamani: tam,
    seq: tam,
    hiz: z.number(),
    yetisiyor: z.boolean().optional(),
    hedefZamani: tam.optional(),
    dunyaEpochMs: tam.optional(),
    donusOzeti: DonusOzetiSemasi.optional(),
    dizin: dizinSemasi,
  }),
  z.object({ tur: z.literal("kare"), rev: tam, seq: tam, ilgi: z.array(tam), ilceIlgisi: z.array(z.string()).optional(), kare: IlgiKaresiSemasi }),
  z.object({ tur: z.literal("delta"), rev: tam, onceki: tam, seq: tam, delta: KareDeltasiSemasi }),
  z.object({
    tur: z.literal("komutSonucu"),
    anahtar: z.string(),
    seq: tam,
    t: tam,
    komut: KomutSemasi,
    sonuc: komutSonucuSemasi,
    tekrar: z.boolean(),
  }),
  z.object({ tur: z.literal("zaman"), istemciGonderim: z.number(), sunucuDuvar: z.number(), simZamani: tam, hiz: z.number(), yayin: z.boolean().optional() }),
  z.object({ tur: z.literal("ozet"), istek: tam.optional(), t: tam, seq: tam, durumOzeti: z.string() }),
  z.object({ tur: z.literal("defter"), istek: tam.optional() }).merge(DefterSemasi),
  z.object({ tur: z.literal("durum"), yetisiyor: z.boolean(), simZamani: tam, hedefZamani: tam }),
  z.object({ tur: z.literal("donusOzeti"), ozet: DonusOzetiSemasi }),
  z.object({
    tur: z.literal("hata"),
    kod: z.enum(["gecersiz_mesaj", "protokol_surumu", "kimlik", "kural_surumu", "sira", "yetki", "hiz_siniri", "gecersiz_ilgi", "kapaniyor", "ic_hata", "yetisiyor", "ad_gecersiz", "ad_yasakli"]),
    mesaj: z.string(),
    anahtar: z.string().optional(),
    istek: tam.optional(),
  }),
]);

export type MesajCozumu<T> = { tamam: true; mesaj: T } | { tamam: false; hata: string };

function coz<T>(sema: z.ZodType<T, z.ZodTypeDef, unknown>, metin: string): MesajCozumu<T> {
  let ham: unknown;
  try {
    ham = JSON.parse(metin);
  } catch (e) {
    return { tamam: false, hata: `gecersiz JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  const r = sema.safeParse(ham);
  if (!r.success) {
    const ilk = r.error.issues[0];
    return { tamam: false, hata: ilk ? `${ilk.path.join(".") || "$"}: ${ilk.message}` : "gecersiz mesaj" };
  }
  return { tamam: true, mesaj: r.data };
}

/** İstemci mesajı metnini çözer ve doğrular (sunucu tarafı). */
export function istemciMesajiCoz(metin: string): MesajCozumu<IstemciMesaji> {
  return coz(IstemciMesajiSemasi, metin);
}

/** Sunucu mesajı metnini çözer ve doğrular (istemci tarafı). */
export function sunucuMesajiCoz(metin: string): MesajCozumu<SunucuMesaji> {
  return coz(SunucuMesajiSemasi as unknown as z.ZodType<SunucuMesaji, z.ZodTypeDef, unknown>, metin);
}
