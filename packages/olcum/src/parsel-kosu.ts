/**
 * Parsel dünyası KISA ölçüm koşusu (mini-6 parsel fikstürü, 8–12 bot, 14–30 sim günü): H6 (ham + hibe/kit'ten arındırılmış +
 * Y7), H8 ve Y ölçütlerinin bot gözlemi. Tanımlar: docs/olcum/h1-h9-parsel-tanimlari.md, docs/arastirma/baslangic-ve-ustalik.md §8.
 *
 * Düzen (varsayılan): 8 yerleşik bot gün 0'da katılır (3 çiftçi, 2 sanayici, 2 tüccar, 1 pasif), 3 geç katılan (çiftçi, sanayici,
 * pazar açılışı) `gecGun`'de katılır ve katılımdan `olcumGunu` (14) sonra ölçülür. Toplam süre = gecGun + olcumGunu (vars. 10 + 14 = 24).
 * H6'nın 60. gün katılımı AĞIR koşudur (`gecGun: 60` → 74 gün; CLI `--agir`); varsayılan koşu yalnız duman düzeyidir.
 *
 * Bu dosya çekirdeği YALNIZ okur (sim durumunu değiştirmez); metrik hesapları `parsel/` altındaki saf işlevlerdedir.
 */
import { MILI, GUN, SAAT, anlikHazine, anlikMiktar } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, OyuncuId, Simulasyon } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { ACILIS_ESLEMESI, GEC_ACILISLARI, acilisAyakIzi, ilceAyrilmisBos, parselBotuOlustur, parselKos } from "@bolge/botlar";
import type { GecAcilis, ParselKosuOyuncusu, ParselKosuSonucu, ParselKomutKaydi, ParselOnayari } from "@bolge/botlar";
import { iklimUygula } from "./ortak";
import type { IklimModu } from "./tipler";
import {
  araziGini,
  h6ParselIkiBicim,
  h8Degerlendir,
  hibeArindir,
  ilceYogunlasmasi,
  medyanaUlastiMi,
  servetOrani,
  servetToplami,
  tamsayiMedyan,
  uretenEmsal,
  y7EmsalDuzeyi,
  acilisKosuluOlgusu,
  ayrilmisGarantisi,
  ucuzHucreAyrintisi,
  y1IlkYapi,
  y2IlkSatis,
  y3IlkSozlesme,
  y5AcilisCesitliligi,
  y6YonDegistirme,
  yenidenSatisOrani,
} from "./parsel";
import type { AcilisKosuluSonucu, Y7EmsalDuzeyi, AcilisKaydi, AyrilmisGarantisi, AyrilmisHucreKaydi, GecKatilanOlgusuIki, H6IkiBicimKarari, H8Sonucu, IlceAyrilmisDolulugu, IlkOlayKaydi, ServetBilesenleri, ServetOrani, UcuzHucreAyrintisi, UretimGeliriOlgusu, Y1Sonucu, Y2Sonucu, Y5Sonucu, Y6Sonucu, Y7Sonucu, Olculemez, SahipliHucre, YonKaydi } from "./parsel";

export type { Y7Sonucu };

export interface ParselYerlesikDagilimi {
  ciftci: number;
  sanayici: number;
  tuccar: number;
  pasif: number;
  /** Spekülatör: katılımda arsa alımına başlar (ayrılmış hücre süresi içinde yeni oyuncu). */
  spekulator: number;
  /** Yaşlı spekülatör: `spekulatorGun` yaşına gelince alır (ayrılmış hücre hakkı bitmiş eski oyuncu). */
  spekulatorYasli: number;
}

/** Ölçüm haritası: mini-6 (vars.; 12 ilçe, 1.200 hücre) ya da sentetik-50 (100 ilçe, 10.000 hücre; ağır/kalabalık). */
export type ParselHaritasi = "mini-6" | "sentetik-50";
export const PARSEL_HARITALARI: readonly ParselHaritasi[] = ["mini-6", "sentetik-50"];

export interface ParselKosuSecenek {
  tohumlar: number[];
  /** Geç katılanların katılım günü (vars. 10; H6 tanımı 60: ağır). */
  gecGun?: number;
  /** Geç katılımdan sonra ölçüm süresi, gün (vars. 14). */
  olcumGunu?: number;
  /** Toplam sim günü (vars. gecGun + olcumGunu; daha küçük olamaz). */
  gun?: number;
  /** Yerleşik bot dağılımı (vars. 3 çiftçi, 2 sanayici, 2 tüccar, 1 pasif). */
  yerlesik?: Partial<ParselYerlesikDagilimi>;
  /** Geç katılan açılışları (vars. üçü de). Boş dizi = geç katılan yok (H6 ölçülemez). */
  gecAcilislari?: readonly GecAcilis[];
  /** İklim takvimi (vars. "hizli": gunCarpani 12, başlangıç ayı tohumla döner). */
  iklim?: IklimModu;
  /** Ölçüm haritası (vars. mini-6); `veri` verilmişse yok sayılır. */
  harita?: ParselHaritasi;
  /** Tarım yönetimi (ekim planı + gübre dozu) açık botlar; pasif/spekülatör etkilenmez. Vars. kapalı. */
  tarimYonetimi?: boolean;
  /** Bakım yönetimi (parça ithalatı + genel onarım) açık botlar; pasif/spekülatör etkilenmez. Vars. kapalı. */
  bakimYonetimi?: boolean;
  /** Yaşlı spekülatörün alıma başladığı yaş (gün; vars. 15 = ayrılmış hücre süresi 14 gün bittikten sonra). */
  spekulatorGun?: number;
  /**
   * Yerleşik botlar da ilçeyi `ilceSec` ile seçsin (yurt verebilen + açılışa uygun; uygun ilçe yoksa katılmaz). Vars. KAPALI: yerleşik
   * botlar eski davranışı korur (önayarın ilçe sıralaması, olmazsa çekirdeğin yedeği). Geç katılanlar HER ZAMAN `ilceSec` kullanır.
   */
  yerlesikIlceSec?: boolean;
  /** Hazır veri paketi (test); verilmezse harita seçeneğine göre. */
  veri?: CekirdekVeriPaketi;
  ilerleme?: (mesaj: string) => void;
}

export const VARSAYILAN_YERLESIK: Readonly<ParselYerlesikDagilimi> = { ciftci: 3, sanayici: 2, tuccar: 2, pasif: 1, spekulator: 0, spekulatorYasli: 0 };
export const VARSAYILAN_SPEKULATOR_GUN = 15;

export interface ParselOyuncuOzeti {
  id: OyuncuId;
  onayar: ParselOnayari;
  acilis: GecAcilis | null;
  katilmaGun: number;
  /** En çok hücreye sahip olduğu ilçe (yoksa null). */
  ilce: string | null;
  hucre: number;
  /** Sahip olunan AYRILMIŞ hücre (yurt dahil; hesap başına tavan `ayrilmisHucreHesapTavani`). */
  ayrilmisHucre: number;
  yapi: number;
  komut: number;
  basarisiz: number;
  /** Koşu sonu ham servet bileşenleri (mili-₺). */
  servet: ServetBilesenleri;
  /** Koşu sonunda son 7 günün net üretim geliri (mili-₺). */
  gelir7Gun: number;
}

export interface ParselH6Olgusu {
  gec: OyuncuId;
  acilis: GecAcilis | null;
  ilce: string | null;
  /** Karşılaştırılan yerleşik oyuncular (ilçede ≥ 1 hücresi olan, geç katılandan önce katılmış). */
  emsal: OyuncuId[];
  /** Ölçüm anı (katılım + olcumGunu): geç katılanın servet bileşenleri. */
  servet: ServetBilesenleri;
  servetHam: number;
  servetArindirilmis: number;
  /** Servet / emsal medyanı (ppm): ham ve arındırılmış; paketin ham servetteki payı. */
  oran: ServetOrani;
  emsalHam: number[];
  emsalMedyanHam: number | null;
  emsalMedyanArindirilmis: number | null;
  /** Medyana ulaştı mı (tamsayı karşılaştırma: 2·servet ≥ medyanın iki katı); emsal yoksa null. Arındırılmışta ortak ofset altında aynıdır. */
  ulastiHam: boolean | null;
  ulastiArindirilmis: boolean | null;
  /** Ölçüm penceresindeki (son 7 gün) net üretim geliri ve emsallerinin geliri. */
  gelir: number;
  /** Emsallerin HAM gelirleri (üretimsizler dahil). */
  emsalGelir: number[];
  /** Y7 emsal kuralı: yalnız ÜRETEN (gelir > 0) emsallerin sayısı ve gelir medyanı. */
  emsalUretenSayisi: number;
  emsalGelirMedyan: number | null;
  /** Y7 il yedeği: ilçenin ili ve aynı ildeki (ilçe emsalleri dahil) yerleşik emsaller; yalnız ilçede üreten emsal yoksa kullanılır. */
  il: string | null;
  ilEmsal: OyuncuId[];
  ilEmsalGelir: number[];
  ilEmsalUretenSayisi: number;
  ilEmsalGelirMedyan: number | null;
  /** Y7'de kullanılan emsal düzeyi: "ilce" (üreten ilçe emsali var), "il" (yalnız il yedeği), null (ölçülemez). */
  emsalDuzeyi: Y7EmsalDuzeyi | null;
  /** H6 açılış koşulu: katılım anı ayrılmış boş hücre (katılınan ilçede, yurt öncesi), açılış ayak izi (yurt hariç), yurt hücresi, açılış yapıları (ms) ve sonuç. */
  ayrilmisBosKatilim: number;
  /** İlçe seçiminin nedeni (`ilceSec`: yurt verebilen / açılışa uygun / ayak izine yeten ilçe sayıları); kayıt yoksa null. */
  ilceNedeni: string | null;
  ayakIzi: number;
  yurtHucre: number;
  acilisYapiMs: number[];
  acilisKosulu: AcilisKosuluSonucu;
  katilmaGun: number;
}

export interface ParselTohumSonucu {
  tohum: number;
  durumOzeti: string;
  sureGun: number;
  gecGun: number;
  olcumGunu: number;
  oyuncular: ParselOyuncuOzeti[];
  hibeKitDegeri: number;
  hibe: number;
  kitDegeri: number;
  h6: {
    olgular: ParselH6Olgusu[];
    karar: H6IkiBicimKarari;
    ucuz: UcuzHucreAyrintisi;
    /** Geç katılım anında ilçe başına doluluk (ayrılmış hücre ayrıntısıyla). */
    ilceler: Array<IlceAyrilmisDolulugu & { ilce: string }>;
    y7: Y7Sonucu | Olculemez;
  };
  h8: H8Sonucu;
  y: {
    y1: Y1Sonucu;
    y2: Y2Sonucu;
    y3: ReturnType<typeof y3IlkSozlesme>;
    y5: Y5Sonucu | Olculemez;
    y6: Y6Sonucu | Olculemez;
  };
  /** Ayrılmış hücre garantisi: geç katılımdan hemen ÖNCE ve koşu SONUNDA (ihlal + kalan pay). */
  ayrilmis: { gecOncesi: AyrilmisGarantisi; sonda: AyrilmisGarantisi };
  /** Katılamayan oyuncular (çekirdek katılımı reddetti); ölçüm dışı. Çekirdek normalde yurtsuz katılım verir (aşağıdaki `yurtsuz`). */
  katilamayan: string[];
  /** "Uygun ilçe yok": ilçe seçimi (`ilceSec`) hiçbir ilçeyi yurt verebilen + açılışa uygun bulmadı; oyuncu KATILMADI (ölçüm dışı), neden kayıtlı. */
  uygunIlceYok: Array<{ oyuncu: string; neden: string }>;
  /** Yurtsuz oyuncu sayısı: katıldı ama hiçbir ilçe yurt veremedi (kalabalık dünya) ve hiç hücre alamadı. */
  yurtsuz: number;
  /** Bot komut başarısızlıkları (neden -> adet). */
  basarisizNedenleri: Record<string, number>;
  komutTurleri: Record<string, number>;
  sureMs: number;
}

const YAPI_KOMUTLARI = new Set(["yapi_yerlestir", "tesis_insa_hucre"]);

/** Fikstürde ilçenin ayrılmış ve henüz satılmamış hücre sayısı. */
const ayrilmisBos = ilceAyrilmisBos; // tek kaynak: botlar `ilceAyrilmisBos` (ilceSec sıralaması ve katılım anı sayımı aynı)

/** Fikstürdeki tüm ayrılmış hücrelerin durumu (satılmış mı, ne zaman, sahibi ne zaman katıldı). Kamu arsası olmayan, satılabilir hücreler. */
export function ayrilmisKayitlari(sim: Simulasyon): AyrilmisHucreKaydi[] {
  const mk = sim.ic.mulk;
  const m = sim.dunya.mulk;
  if (mk === undefined || m === undefined) return [];
  const sahipli = new Map(m.hucreler.map((h) => [h.id, h]));
  const katilma = new Map(sim.dunya.oyuncular.map((o) => [o.id, o.katilmaZamani]));
  return [...mk.ayrilmis].sort().map((id) => {
    const h = sahipli.get(id);
    if (h === undefined) return { sahipli: false, alinmaMs: null, sahipKatilmaMs: null };
    return { sahipli: true, alinmaMs: h.alinma, sahipKatilmaMs: katilma.get(h.sahip) ?? h.alinma };
  });
}

/** Oyuncunun işletme düğümlerindeki stokun taban fiyatla değeri (mili-₺). */
export function stokDegeriMili(sim: Simulasyon, oyuncu: OyuncuId): number {
  const d = sim.dunya;
  let t = 0;
  for (const i of d.mulk?.isletmeler ?? []) {
    if (i.oyuncu !== oyuncu) continue;
    const b = d.bolgeler[i.bolgeIndeksi];
    if (b === undefined) continue;
    for (let m = 0; m < b.stoklar.length; m++) {
      const st = b.stoklar[m];
      if (st === undefined) continue;
      t += Math.floor((anlikMiktar(st, d.zaman) * (sim.ic.mallar[m]?.tabanFiyat ?? 0)) / MILI);
    }
  }
  return t;
}

/** Oyuncunun hücrelerinin ödenen satın alma bedeli toplamı (yurt 0). */
export function araziDegeriMili(sim: Simulasyon, oyuncu: OyuncuId): number {
  let t = 0;
  for (const h of sim.dunya.mulk?.hucreler ?? []) if (h.sahip === oyuncu) t += h.degerMili;
  return t;
}

/** Hibe + başlangıç kiti değeri (mili-₺): çekirdek parametrelerinden. */
export function hibeKitDegeri(sim: Simulasyon): { hibe: number; kit: number; toplam: number } {
  const mk = sim.ic.mulk;
  if (mk === undefined) throw new Error("hibeKitDegeri: mulk kipi kapali");
  const hibe = mk.p.yeniOyuncu.hibe;
  let kit = 0;
  mk.baslangicStok.forEach((q, mi) => {
    if (q > 0) kit += Math.floor((q * (sim.ic.mallar[mi]?.tabanFiyat ?? 0)) / MILI);
  });
  return { hibe, kit, toplam: hibe + kit };
}

function sonKullanilanIlce(sim: Simulasyon, oyuncu: OyuncuId): string | null {
  const sayac = new Map<string, number>();
  for (const h of sim.dunya.mulk?.hucreler ?? []) if (h.sahip === oyuncu) sayac.set(h.ilce, (sayac.get(h.ilce) ?? 0) + 1);
  let en: string | null = null;
  let enSayi = 0;
  for (const k of [...sayac.keys()].sort()) {
    if ((sayac.get(k) as number) > enSayi) {
      en = k;
      enSayi = sayac.get(k) as number;
    }
  }
  return en;
}

/** Yerleşik + geç katılan oyuncu düzeni (kimlikler sabit, sıralı). */
export interface ParselDuzen {
  oyuncular: Array<{ id: OyuncuId; onayar: ParselOnayari; acilis: GecAcilis | null; katilmaGun: number; baslangicGun: number }>;
}

export function parselDuzeni(
  yerlesik: Partial<ParselYerlesikDagilimi> | undefined,
  gecAcilislari: readonly GecAcilis[],
  gecGun: number,
  spekulatorGun: number = VARSAYILAN_SPEKULATOR_GUN,
): ParselDuzen {
  const dagilim = { ...VARSAYILAN_YERLESIK, ...(yerlesik ?? {}) };
  const o: ParselDuzen["oyuncular"] = [];
  const gruplar: Array<[keyof ParselYerlesikDagilimi, ParselOnayari, string, number]> = [
    ["ciftci", "ciftci", "ciftci", 0],
    ["sanayici", "sanayici", "sanayici", 0],
    ["tuccar", "tuccar", "tuccar", 0],
    ["pasif", "pasif", "pasif", 0],
    ["spekulator", "spekulator", "spekulator", 0],
    ["spekulatorYasli", "spekulator", "spekulator_yasli", spekulatorGun],
  ];
  for (const [anahtar, onayar, onek, baslangic] of gruplar) {
    const n = dagilim[anahtar];
    if (!Number.isSafeInteger(n) || n < 0) throw new Error(`parsel kosu: yerlesik ${anahtar} sayisi gecersiz: ${String(n)}`);
    for (let i = 1; i <= n; i++) o.push({ id: `${onek}_${i}`, onayar, acilis: null, katilmaGun: 0, baslangicGun: baslangic });
  }
  for (const a of gecAcilislari) o.push({ id: `gec_${a}`, onayar: "gec_katilan", acilis: a, katilmaGun: gecGun, baslangicGun: 0 });
  return { oyuncular: o };
}

function ortakSecenekler(s: ParselKosuSecenek): { gecGun: number; olcumGunu: number; sureGun: number; gecAcilislari: readonly GecAcilis[] } {
  const gecGun = s.gecGun ?? 10;
  const olcumGunu = s.olcumGunu ?? 14;
  if (!Number.isSafeInteger(gecGun) || gecGun < 1) throw new Error(`parsel kosu: gecGun >= 1 olmali: ${String(s.gecGun)}`);
  if (!Number.isSafeInteger(olcumGunu) || olcumGunu < 1) throw new Error(`parsel kosu: olcumGunu >= 1 olmali: ${String(s.olcumGunu)}`);
  const gecAcilislari = s.gecAcilislari ?? GEC_ACILISLARI;
  const sureGun = s.gun ?? gecGun + olcumGunu;
  if (!Number.isSafeInteger(sureGun) || sureGun < gecGun + olcumGunu) throw new Error(`parsel kosu: gun (${String(s.gun)}) en az gecGun + olcumGunu (${gecGun + olcumGunu}) olmali`);
  return { gecGun, olcumGunu, sureGun, gecAcilislari };
}

/** Sermaye kayıtlarından belirli ana kadar (dahil) toplam. */
function sermayeToplami(sonuc: ParselKosuSonucu, oyuncu: OyuncuId, bas: number, bit: number): number {
  let t = 0;
  for (const k of sonuc.sermaye[oyuncu] ?? []) if (k.t > bas && k.t <= bit) t += k.tutar;
  return t;
}

function yapiBedeli(sonuc: ParselKosuSonucu, oyuncu: OyuncuId, bit: number): number {
  let t = 0;
  for (const k of sonuc.sermaye[oyuncu] ?? []) if (k.t <= bit) t += k.yapiPara + k.yapiMalDegeri;
  return t;
}

export function parselTohumKos(secenek: ParselKosuSecenek, tohum: number): ParselTohumSonucu {
  const basla = Date.now();
  const { gecGun, olcumGunu, sureGun, gecAcilislari } = ortakSecenekler(secenek);
  const duzen = parselDuzeni(secenek.yerlesik, gecAcilislari, gecGun, secenek.spekulatorGun ?? VARSAYILAN_SPEKULATOR_GUN);
  const harita = secenek.harita ?? "mini-6";
  const temel: CekirdekVeriPaketi = secenek.veri ?? (harita === "sentetik-50" ? { ...varsayilanVeriyiYukle(), parsel: parselFiksturuYukle("sentetik-50") } : { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") });
  const veri = iklimUygula(temel as VeriPaketi, secenek.iklim ?? "hizli", tohum) as CekirdekVeriPaketi;
  const pencereGun = Math.min(7, olcumGunu);

  const oyuncular: ParselKosuOyuncusu[] = duzen.oyuncular.map((o) => ({
    id: o.id,
    bot: parselBotuOlustur(o.onayar, o.id, {
      ...(o.acilis === null ? {} : { acilis: o.acilis }),
      ...(secenek.tarimYonetimi === true ? { tarimYonetimi: true } : {}),
      ...(secenek.bakimYonetimi === true ? { bakimYonetimi: true } : {}),
      ...(secenek.yerlesikIlceSec === true && o.onayar !== "gec_katilan" ? { ilceSec: true } : {}),
      ...(o.baslangicGun > 0 ? { baslangicGun: o.baslangicGun } : {}),
    }),
    katilmaMs: o.katilmaGun * GUN,
  }));

  // Gözlem anları: her geç katılım, +olcumGunu-pencere, +olcumGunu; ilk satış tespiti için saatlik ızgara + katılım + 10/60 dk.
  const hazine = new Map<string, number>(); // `${oyuncu}@${t}` -> hazine
  const bilesen = new Map<string, Omit<ServetBilesenleri, "yapi">>();
  const ilceDoluluk = new Map<number, Array<IlceAyrilmisDolulugu & { ilce: string }>>();
  const ilkSatis = new Map<OyuncuId, number>();
  let ayrilmisOnce: AyrilmisHucreKaydi[] = [];
  const katilmaAni = new Map(duzen.oyuncular.map((o) => [o.id, o.katilmaGun * GUN]));
  const tAnlar = new Set<number>([gecGun * GUN, (gecGun + olcumGunu) * GUN, (gecGun + olcumGunu - pencereGun) * GUN]);
  const ekGozlem: number[] = [];
  for (const o of duzen.oyuncular) ekGozlem.push(o.katilmaGun * GUN + 10 * 60_000, o.katilmaGun * GUN + 60 * 60_000);
  for (const t of tAnlar) ekGozlem.push(t);
  const oncekiAn = gecGun * GUN - 1;
  ekGozlem.push(oncekiAn);

  const ilerleme = secenek.ilerleme ?? (() => {});
  const sonuc = parselKos({
    katilimRedDevam: true,
    veri,
    tohum,
    oyuncular,
    sureMs: sureGun * GUN,
    gozlemAraligiMs: SAAT,
    ekGozlemMs: ekGozlem,
    gozlem: (sim, t) => {
      const d = sim.dunya;
      // İlk satış: ihracat emri gerçekleşmesi > 0 (o ana kadar gözlenen ilk an).
      for (const i of d.mulk?.isletmeler ?? []) {
        if (ilkSatis.has(i.oyuncu)) continue;
        const b = d.bolgeler[i.bolgeIndeksi];
        if (b !== undefined && b.ticaretEmirleri.some((e) => e.yon === "ihracat" && e.gerceklesenSaat > 0)) ilkSatis.set(i.oyuncu, t);
      }
      if (tAnlar.has(t)) {
        const mevcutlar = new Set(d.oyuncular.map((x) => x.id));
        for (const o of duzen.oyuncular) {
          if ((katilmaAni.get(o.id) as number) > t || !mevcutlar.has(o.id)) continue;
          hazine.set(`${o.id}@${t}`, anlikHazine(d, o.id));
          bilesen.set(`${o.id}@${t}`, { hazine: anlikHazine(d, o.id), stok: stokDegeriMili(sim, o.id), arazi: araziDegeriMili(sim, o.id) });
        }
      }
      if (t === oncekiAn) ayrilmisOnce = ayrilmisKayitlari(sim);
      if (t === oncekiAn) {
        // Geç katılımdan hemen ÖNCE (geç katılanın kendi yurdu henüz verilmedi): "katılım anında" ilçe doluluğu.
        ilceDoluluk.set(
          t,
          d.mulk!.ilceler.map((c) => ({ ilce: c.id, uygunHucre: c.uygunHucre, satilmisHucre: c.satilmisHucre, ayrilmisSatilmis: c.ayrilmisSatilmis ?? 0, ayrilmisBos: ayrilmisBos(sim, c.id) })),
        );
      }
      if (t % (8 * GUN) === 0 && t > 0) ilerleme(`parsel tohum ${tohum}: gun ${t / GUN}/${sureGun}`);
    },
  });
  const sim = sonuc.sim;
  // Katılamayan oyuncular (kalabalık dünyada yurt verilemedi) ölçüm dışıdır; ayrıca listelenir.
  const katilamayan = duzen.oyuncular.filter((o) => sonuc.katilimlar[o.id]?.reddedildi !== undefined && sonuc.katilimlar[o.id]?.uygunIlceYok !== true).map((o) => o.id);
  const uygunIlceYok = duzen.oyuncular.filter((o) => sonuc.katilimlar[o.id]?.uygunIlceYok === true).map((o) => ({ oyuncu: o.id, neden: sonuc.katilimlar[o.id]?.ilceNedeni ?? "" }));
  const uyeler = duzen.oyuncular.filter((o) => sonuc.katilimlar[o.id]?.reddedildi === undefined);
  const pk = hibeKitDegeri(sim);
  const T = (gecGun + olcumGunu) * GUN;
  const Tbas = T - pencereGun * GUN;

  const gelirAralik = (o: OyuncuId, bas: number, bit: number): number | null => {
    const h0 = hazine.get(`${o}@${bas}`);
    const h1 = hazine.get(`${o}@${bit}`);
    if (h0 === undefined || h1 === undefined) return null;
    return h1 - h0 + sermayeToplami(sonuc, o, bas, bit);
  };

  const bitis = sureGun * GUN;
  const yapiKomutlari = (id: OyuncuId): ParselKomutKaydi[] => sonuc.komutGunlugu.filter((k) => k.oyuncu === id && k.tamam && YAPI_KOMUTLARI.has(k.tur));
  const yurtHucre = sim.ic.mulk!.p.yeniOyuncu.yurtHucre;
  const ilceIl = new Map((sim.dunya.mulk?.ilceler ?? []).map((c) => [c.id, c.il] as const));
  // --- H6: geç katılan olguları -------------------------------------------------------------------------------------------
  const olgular: ParselH6Olgusu[] = [];
  const y7Girdi: UretimGeliriOlgusu[] = [];
  const acilisGirdi: AcilisKosuluSonucu[] = [];
  const hamOlgular: GecKatilanOlgusuIki[] = [];
  for (const g of uyeler.filter((o) => o.onayar === "gec_katilan")) {
    const ilce = sonKullanilanIlce(sim, g.id);
    const katilma = g.katilmaGun * GUN;
    const emsal = uyeler
      .filter((o) => o.id !== g.id && (katilmaAni.get(o.id) as number) < katilma)
      .filter((o) => ilce !== null && (sim.dunya.mulk?.hucreler ?? []).some((h) => h.sahip === o.id && h.ilce === ilce))
      .map((o) => o.id);
    const il = ilce === null ? null : (ilceIl.get(ilce) ?? null);
    const ilEmsal = uyeler
      .filter((o) => o.id !== g.id && (katilmaAni.get(o.id) as number) < katilma)
      .filter((o) => il !== null && (sim.dunya.mulk?.hucreler ?? []).some((h) => h.sahip === o.id && ilceIl.get(h.ilce) === il))
      .map((o) => o.id);
    const servetGec = (id: OyuncuId): ServetBilesenleri => {
      const b = bilesen.get(`${id}@${T}`) as Omit<ServetBilesenleri, "yapi">;
      return { ...b, yapi: yapiBedeli(sonuc, id, T) };
    };
    const sg = servetGec(g.id);
    const emsalHam = emsal.map((e) => servetToplami(servetGec(e)));
    const gelir = gelirAralik(g.id, Tbas, T) ?? 0;
    const emsalGelir = emsal.map((e) => gelirAralik(e, Tbas, T) ?? 0);
    const ilEmsalGelir = ilEmsal.map((e) => gelirAralik(e, Tbas, T) ?? 0);
    // H6 açılış koşulu: katılım anı (geç katılımdan hemen önce) katılınan ilçedeki satılmamış ayrılmış hücre; açılışın ilk yapı türlerinden kabul edilen yapılar
    const ayrilmisBosKatilim = (ilceDoluluk.get(oncekiAn) ?? []).find((c) => c.ilce === ilce)?.ayrilmisBos ?? 0;
    const acilisTurleri = new Set<string>(g.acilis === undefined ? [] : ACILIS_ESLEMESI[g.acilis as GecAcilis].ilkYapiTurleri);
    const acilisYapiMs = yapiKomutlari(g.id).filter((k) => acilisTurleri.has(k.tesisTuru as string)).map((k) => k.t);
    const ayakIzi = acilisAyakIzi(sim, g.acilis as GecAcilis);
    const acilisKosulu = acilisKosuluOlgusu({ ayrilmisBos: ayrilmisBosKatilim, ayakIzi, yurtHucre, katilmaMs: katilma, acilisYapiMs, gozlemSonuMs: bitis });
    const ham = servetToplami(sg);
    olgular.push({
      gec: g.id,
      acilis: g.acilis,
      ilce,
      emsal,
      servet: sg,
      servetHam: ham,
      servetArindirilmis: hibeArindir(ham, pk.hibe, pk.kit),
      oran: servetOrani({ servet: ham, ilceServetleri: emsalHam, hibeKitDegeri: pk.toplam }),
      emsalHam,
      emsalMedyanHam: tamsayiMedyan(emsalHam),
      emsalMedyanArindirilmis: tamsayiMedyan(emsalHam.map((x) => hibeArindir(x, pk.hibe, pk.kit))),
      ulastiHam: medyanaUlastiMi(ham, emsalHam),
      ulastiArindirilmis: medyanaUlastiMi(
        hibeArindir(ham, pk.hibe, pk.kit),
        emsalHam.map((x) => hibeArindir(x, pk.hibe, pk.kit)),
      ),
      gelir,
      emsalGelir,
      emsalUretenSayisi: uretenEmsal(emsalGelir).length,
      emsalGelirMedyan: tamsayiMedyan(uretenEmsal(emsalGelir)),
      il,
      ilEmsal,
      ilEmsalGelir,
      ilEmsalUretenSayisi: uretenEmsal(ilEmsalGelir).length,
      ilEmsalGelirMedyan: tamsayiMedyan(uretenEmsal(ilEmsalGelir)),
      emsalDuzeyi: y7EmsalDuzeyi({ ilceGelirleri: emsalGelir, ilGelirleri: ilEmsalGelir }),
      ayrilmisBosKatilim,
      ilceNedeni: sonuc.katilimlar[g.id]?.ilceNedeni ?? null,
      ayakIzi,
      yurtHucre,
      acilisYapiMs,
      acilisKosulu,
      katilmaGun: g.katilmaGun,
    });
    hamOlgular.push({ servet: ham, ilceServetleri: emsalHam, hibeKitDegeri: pk.toplam });
    y7Girdi.push({ gelir, ilceGelirleri: emsalGelir, ilGelirleri: ilEmsalGelir });
    acilisGirdi.push(acilisKosulu);
  }
  const ilceler = ilceDoluluk.get(oncekiAn) ?? [];
  const ucuz = ucuzHucreAyrintisi(ilceler);
  const karar = h6ParselIkiBicim(hamOlgular, ucuz, y7Girdi, acilisGirdi);
  const y7 = karar.birincil.y7;

  // --- H8 -----------------------------------------------------------------------------------------------------------------
  const sahipli: SahipliHucre[] = (sim.dunya.mulk?.hucreler ?? []).map((h) => ({ id: h.id, ilce: h.ilce, sinif: h.sinif, sahip: h.sahip }));
  const uygunHucre: Record<string, number> = {};
  for (const c of sim.dunya.mulk?.ilceler ?? []) uygunHucre[c.id] = c.uygunHucre;
  const h8 = h8Degerlendir(
    araziGini(sahipli, uyeler.map((o) => o.id)),
    ilceYogunlasmasi(sahipli, uygunHucre),
    yenidenSatisOrani([]), // çekirdekte yeniden satış (oyuncular arası) yok: parsel_birak yalnız devlete iade
  );

  // --- Y ölçütleri (bot gözlemi) ------------------------------------------------------------------------------------------
  const ilkYapi: IlkOlayKaydi[] = uyeler.map((o) => ({ katilmaMs: o.katilmaGun * GUN, ilkMs: yapiKomutlari(o.id)[0]?.t ?? null, gozlemSonuMs: bitis }));
  const ilkSatisKayit: IlkOlayKaydi[] = uyeler.map((o) => ({ katilmaMs: o.katilmaGun * GUN, ilkMs: ilkSatis.get(o.id) ?? null, gozlemSonuMs: bitis }));
  const acilis: AcilisKaydi[] = uyeler.map((o) => ({ katilmaMs: o.katilmaGun * GUN, yapilar: yapiKomutlari(o.id).map((k) => ({ tur: k.tesisTuru as string, zamanMs: k.t })) }));
  const yon: YonKaydi[] = uyeler.map((o) => ({
    katilmaMs: o.katilmaGun * GUN,
    yonKomutlariMs: sonuc.komutGunlugu.filter((k) => k.oyuncu === o.id && k.tamam && (k.tur === "parsel_birak" || k.tur === "insaat_iptal")).map((k) => k.t),
    gozlemSonuMs: bitis,
  }));

  // --- Oyuncu özeti --------------------------------------------------------------------------------------------------------
  const ozetler: ParselOyuncuOzeti[] = uyeler.map((o) => {
    const d = sim.dunya;
    const servet: ServetBilesenleri = { hazine: anlikHazine(d, o.id), stok: stokDegeriMili(sim, o.id), arazi: araziDegeriMili(sim, o.id), yapi: yapiBedeli(sonuc, o.id, bitis) };
    return {
      id: o.id,
      onayar: o.onayar,
      acilis: o.acilis,
      katilmaGun: o.katilmaGun,
      ilce: sonKullanilanIlce(sim, o.id),
      hucre: (d.mulk?.hucreler ?? []).filter((h) => h.sahip === o.id).length,
      ayrilmisHucre: (d.mulk?.hucreler ?? []).filter((h) => h.sahip === o.id && sim.ic.mulk!.ayrilmis.has(h.id)).length,
      yapi: yapiKomutlari(o.id).length,
      komut: sonuc.komutSayisi[o.id] ?? 0,
      basarisiz: sonuc.basarisizSayisi[o.id] ?? 0,
      servet,
      gelir7Gun: 0,
    };
  });
  // Koşu sonu 7 günlük gelir (yalnız gözlem anlarında hazine tutulduğundan ölçüm penceresinde tanımlı; diğerleri 0 kalır)
  for (const o of ozetler) o.gelir7Gun = gelirAralik(o.id, Tbas, T) ?? 0;

  return {
    tohum,
    durumOzeti: sim.durumOzeti(),
    sureGun,
    gecGun,
    olcumGunu,
    oyuncular: ozetler,
    hibeKitDegeri: pk.toplam,
    hibe: pk.hibe,
    kitDegeri: pk.kit,
    h6: { olgular, karar, ucuz, ilceler, y7 },
    h8,
    ayrilmis: { gecOncesi: ayrilmisGarantisi(ayrilmisOnce, sim.ic.mulk!.ayrilmisSureMs), sonda: ayrilmisGarantisi(ayrilmisKayitlari(sim), sim.ic.mulk!.ayrilmisSureMs) },
    katilamayan,
    uygunIlceYok,
    yurtsuz: ozetler.filter((o) => o.hucre === 0).length,
    y: {
      y1: y1IlkYapi(ilkYapi),
      y2: y2IlkSatis(ilkSatisKayit),
      y3: y3IlkSozlesme(null),
      y5: y5AcilisCesitliligi(acilis),
      y6: y6YonDegistirme(yon),
    },
    basarisizNedenleri: sonuc.basarisizNedenleri,
    komutTurleri: sonuc.komutTurleri,
    sureMs: Date.now() - basla,
  };
}
