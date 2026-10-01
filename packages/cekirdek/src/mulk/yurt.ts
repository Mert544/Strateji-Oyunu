/**
 * Bedava yurt (H6, docs/11 §7.9; `mulk.yeniOyuncu.yurtHucre`): yeni oyuncuya katılırken ÜCRETSİZ, kenar-bitişik hücreler.
 *
 * Seçim deterministik ve yalnız dünya durumuna bağlıdır (rastgelelik yok):
 * - İlçe: `oyuncu_katil.ilce` verildiyse o ilçe (yurt orada verilemiyorsa katılım reddedilir); verilmediyse doluluğu
 *   (satılmış / uygun) en düşük, yurdu verebilen ilçe (eşitlikte ilçe kimliği küçük olan). Yön çıkmazına karşı: ilk Tarla'yı
 *   (`ciftlik`) kurabilen illerin ilçeleri (il merkezinin etiketi çiftliğin `gerekliEtiket`'ini taşıyan) önce denenir; hiçbiri
 *   yurdu veremiyorsa diğer ilçeler.
 * - İlçe merkezi: ilçenin kasaba ve şehir sınıfı uygun hücrelerinin (yerleşik doku) ağırlık merkezi (tamsayı ortalama); bu
 *   sınıftan hücre yoksa tüm uygun hücrelerinki. (Fikstürde idari merkez noktası yoktur; varsa onun yerini alır.)
 * - Hücreler: ilçenin uygun, sahipsiz hücreleri arasında, ilçe merkezine en yakın tohumdan başlayıp, her adımda mevcut kümeye
 *   KENAR-BİTİŞİK (4 komşuluk) olan ve merkeze en yakın (kare uzaklık, eşitlikte kimlik) hücreyi ekleyen `yurtHucre` hücrelik
 *   bağlı küme (yapı yerleşimiyle aynı kenar-bitişiklik kuralı); tohum yetersiz bir bileşendeyse sıradaki en yakın hücre
 *   denenir. Hücre tanımında isteğe bağlı `kullanim: "orman"` alanı varsa (fikstür şemasında henüz yoktur) orman hücreleri yeterli
 *   başka hücre varken seçilmez. Ayrılmış hücreler de verilebilir.
 * - Ayrılmış hücreler (P3d, `mulk.yeniOyuncu.yurtAyrilmisSonra`): açıksa kümeler önce ayrılmış OLMAYAN hücrelerden kurulur; bağlı küme kurulamıyorsa ayrılmış hücreler yedek olarak dahil edilir.
 * - Değer: yurt hücresinin `degerMili`'si 0'dır (arazi vergisi tabanına girmez); ilçenin `satilmisHucre` sayısına ve oyuncunun
 *   ilçe hücre sayısına (%25 / 72 sınırları) girer; ilk işletme düğümü (başlangıç kitiyle) açılır.
 */
import { carpBol } from "../sabit";
import { PPM } from "../tipler";
import type { Baglam, DerlenmisIcerik, DerlenmisMulk, Dunya, HucreDurumu, IlceDurumu, OyuncuId } from "../tipler";
import { hucreBul, hucreEkle, ilceBul, ilceHucreEkle, mulkOyuncuAl } from "./durum";
import { dizge, halkaSay, kumeSecHalka } from "./geometri";
import type { HucreYuklemi } from "./geometri";
import { durumUygunMu } from "./hucreDizini";
import { kamuHucreMi } from "./kamu";
import { isletmeAl } from "./isletme";

export interface YurtPlani {
  ilce: string;
  /** Kimliğe göre sıralı, kenar-bitişik hücreler. */
  hucreler: string[];
}


/** İlçede `n` hücrelik yurt planı ya da neden verilemediği (hata iletisi). Dünyayı değiştirmez. */
function ilcePlani(d: Dunya, mk: DerlenmisMulk, ilce: IlceDurumu, n: number): YurtPlani | string {
  const p = mk.p;
  if (n > p.ilceHucreTavani) return `yurt ilce hucre tavanini asar: ${n} > ${p.ilceHucreTavani}`;
  if (n > carpBol(ilce.uygunHucre, p.ilcePayTavaniPpm, PPM)) return `ilce yurt icin cok kucuk: ${ilce.id}`;
  const tanim = mk.ilceler.get(ilce.id);
  if (tanim === undefined) return `bilinmeyen ilce: ${ilce.id}`;
  // İlçe merkezi: kasaba/şehir sınıfı uygun hücrelerin ağırlık merkezi (yoksa tüm uygun hücrelerin); kamu ilçe merkeziyle AYNI tanım (dizinde önbellekli).
  // Halka araması (docs/06 §15.11): aday listesi KURULMAZ; üyelik (uygun ∧ sahipsiz ∧ ¬kamu [∧ ormansız] [∧ ayrılmamış]) doğrudan dizinden ve dünyadan
  // sorulur, hücreler merkezden dışa halka halka (uzaklık², kimlik dizesi) sırasıyla gezilir. Sonuç eski tam sıralamalı `kumeSec` ile BİREBİR aynıdır.
  const dz = mk.dizin;
  const no = dz.ilceNo(ilce.id);
  const [cx, cy] = dz.ilceMerkezi(no);
  const cerceve = dz.ilceCercevesi(no);
  // Kamu arsası (satılmaz) yurt seçiminde atlanır.
  const bosMu: HucreYuklemi = (x, y) => {
    const b = dz.ilceBayti(no, x, y);
    if (b < 0 || !durumUygunMu(b)) return false;
    const id = `${x}:${y}`;
    return hucreBul(d, id) === undefined && !kamuHucreMi(d, ilce.id, id);
  };
  const ormansizMi: HucreYuklemi = (x, y) => bosMu(x, y) && !dz.ormanMi(no, x, y);
  const ayrilmamisMi: HucreYuklemi = (x, y) => bosMu(x, y) && !mk.ayrilmis.has(`${x}:${y}`);
  const ayrilmamisOrmansizMi: HucreYuklemi = (x, y) => ayrilmamisMi(x, y) && !dz.ormanMi(no, x, y);
  // Her aşama doğrudan `kumeSecHalka` ile denenir: aday sayısı n'den azsa küme zaten kurulamaz (eski `length >= n` önkoşulu yalnız iş tasarrufuydu); böylece
  // başarılı yolda ek bir halka taraması yapılmaz. `bos` sayısı yalnız SONUÇ BULUNAMAYINCA (hata iletisi için) sayılır.
  // Orman hücreleri yalnız yetmezse kullanılır.
  // Yurt önce AYRILMIŞ DIŞINDAN (P3d, `yurtAyrilmisSonra`): ayrılmış havuz geç gelenler içindir. Küme önce ayrılmamış hücrelerden kurulur; ancak bağlı küme
  // başka türlü kurulamıyorsa ayrılmış hücreler YEDEK olarak dahil edilir (aday kümesi tüm uygun serbest hücreler; kural aynı: merkeze en yakın, kenar-bitişik).
  const sec = (yuklem: HucreYuklemi): string[] | null => kumeSecHalka(yuklem, cerceve, n, cx, cy);
  if (p.yeniOyuncu.yurtAyrilmisSonra === true) {
    const ikinci = sec(ayrilmamisOrmansizMi) ?? sec(ayrilmamisMi);
    if (ikinci !== null) return { ilce: ilce.id, hucreler: ikinci.sort(dizge) };
  }
  const sonuc = sec(ormansizMi) ?? sec(bosMu);
  if (sonuc === null) {
    // Sayım n'de keser; n'den küçükse TAM sayıdır (iletideki sayı eski `bos.length` ile aynı).
    const bosSay = halkaSay(bosMu, cerceve, cx, cy, n);
    return bosSay < n ? `ilcede yeterli bos hucre yok: ${ilce.id} (${bosSay} < ${n})` : `ilcede ${n} hucrelik bitisik bos alan yok: ${ilce.id}`;
  }
  return { ilce: ilce.id, hucreler: sonuc.sort(dizge) };
}

/**
 * Yurt planı. `ilceKimligi` verilmişse yalnız o ilçe denenir (olmazsa hata iletisi döner). Verilmemişse doluluğu en düşük,
 * yurdu verebilen ilçe seçilir; hiçbiri veremiyorsa `null` (katılım yurtsuz sürer). `yurtHucre` 0 ise (ilçe geçerliyse) `null`.
 * Dünyayı değiştirmez; `yurtUygula` ile uygulanır.
 */
export function yurtPlanla(d: Dunya, ic: DerlenmisIcerik, ilceKimligi?: string): YurtPlani | string | null {
  const mk = ic.mulk;
  const m = d.mulk;
  if (mk === undefined || m === undefined) return null;
  const n = mk.p.yeniOyuncu.yurtHucre;
  if (ilceKimligi !== undefined) {
    const ilce = typeof ilceKimligi === "string" ? ilceBul(d, ilceKimligi) : undefined;
    if (ilce === undefined) return `bilinmeyen ilce: ${String(ilceKimligi)}`;
    return n > 0 ? ilcePlani(d, mk, ilce, n) : null;
  }
  if (n <= 0) return null;
  // Tercih: ilk Tarla kurulabilen il (merkezinde çiftliğin gerekli etiketi var). Sonra doluluk (satılmış / uygun) artan;
  // çapraz çarpımla kesirsiz karşılaştırma, eşitlikte ilçe kimliği.
  const tarlaIndeksi = ic.tesisTuruIndeks["ciftlik"];
  const gerekli = tarlaIndeksi === undefined ? undefined : ic.tesisTurleri[tarlaIndeksi]?.gerekliEtiket;
  const tarlaIli = (c: IlceDurumu): boolean => {
    if (tarlaIndeksi === undefined || gerekli === undefined) return true;
    const merkez = mk.ilMerkezi.get(c.il);
    return merkez !== undefined && (d.bolgeler[merkez]?.etiketler.includes(gerekli) ?? false);
  };
  const adaylar = m.ilceler
    .filter((c) => c.uygunHucre > 0 && c.uygunHucre - c.satilmisHucre >= n)
    .sort(
      (a, b) =>
        Number(tarlaIli(b)) - Number(tarlaIli(a)) ||
        a.satilmisHucre * b.uygunHucre - b.satilmisHucre * a.uygunHucre ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  for (const c of adaylar) {
    const plan = ilcePlani(d, mk, c, n);
    if (typeof plan !== "string") return plan;
  }
  return null;
}

/** Planı uygular (artık başarısız olamaz): hücreler oyuncuya geçer, ilk işletme düğümü açılır. Oyuncu kayıtlı olmalıdır. */
export function yurtUygula(d: Dunya, ctx: Baglam, oyuncu: OyuncuId, plan: YurtPlani): void {
  const mk = ctx.ic.mulk;
  const m = d.mulk;
  if (mk === undefined || m === undefined) return;
  const ilce = ilceBul(d, plan.ilce) as IlceDurumu;
  const mo = mulkOyuncuAl(m, oyuncu, d.zaman);
  isletmeAl(d, ctx.ic, oyuncu, ilce.il);
  for (const id of plan.hucreler) {
    const f = mk.hucreler.get(id);
    const h: HucreDurumu = { id, ilce: ilce.id, sinif: (f as NonNullable<typeof f>).hucre.sinif, sahip: oyuncu, degerMili: 0, alinma: d.zaman };
    hucreEkle(m, h);
  }
  ilce.satilmisHucre += plan.hucreler.length;
  // Ayrılmış hücre yurdun parçasıysa hesap sayacına girer (hesap başına ayrılmış hücre sınırı; yurt dahil).
  let ayrilmis = 0;
  for (const id of plan.hucreler) if (mk.ayrilmis.has(id)) ayrilmis++;
  if (ayrilmis > 0) mo.ayrilmisHucre = (mo.ayrilmisHucre ?? 0) + ayrilmis;
  ilceHucreEkle(mo, ilce.id, plan.hucreler.length);
}
