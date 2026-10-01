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
 * - Değer: yurt hücresinin `degerMili`'si 0'dır (arazi vergisi tabanına girmez); ilçenin `satilmisHucre` sayısına ve oyuncunun
 *   ilçe hücre sayısına (%25 / 72 sınırları) girer; ilk işletme düğümü (başlangıç kitiyle) açılır.
 */
import { carpBol, tabanBol } from "../sabit";
import { PPM } from "../tipler";
import type { Baglam, DerlenmisIcerik, DerlenmisMulk, Dunya, HucreDurumu, IlceDurumu, OyuncuId } from "../tipler";
import { hucreBul, hucreEkle, hucreXY, ilceBul, ilceHucreEkle, mulkOyuncuAl } from "./durum";
import { isletmeAl } from "./isletme";

export interface YurtPlani {
  ilce: string;
  /** Kimliğe göre sıralı, kenar-bitişik hücreler. */
  hucreler: string[];
}

/** 4 komşuluk (kenar-bitişik), sabit sıra. */
const KOMSULAR: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const dizge = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Orman kullanım bilgisi (fikstür şemasında isteğe bağlı, henüz üretilmeyen alan). */
function ormanMi(h: unknown): boolean {
  return (h as { kullanim?: unknown }).kullanim === "orman";
}

/** İlçede `n` hücrelik yurt planı ya da neden verilemediği (hata iletisi). Dünyayı değiştirmez. */
function ilcePlani(d: Dunya, mk: DerlenmisMulk, ilce: IlceDurumu, n: number): YurtPlani | string {
  const p = mk.p;
  if (n > p.ilceHucreTavani) return `yurt ilce hucre tavanini asar: ${n} > ${p.ilceHucreTavani}`;
  if (n > carpBol(ilce.uygunHucre, p.ilcePayTavaniPpm, PPM)) return `ilce yurt icin cok kucuk: ${ilce.id}`;
  const tanim = mk.ilceler.get(ilce.id);
  if (tanim === undefined) return `bilinmeyen ilce: ${ilce.id}`;
  // İlçe merkezi: kasaba/şehir sınıfı uygun hücrelerin ağırlık merkezi (yoksa tüm uygun hücrelerin).
  const toplam = { sx: 0, sy: 0, n: 0 };
  const yerlesik = { sx: 0, sy: 0, n: 0 };
  const bos: { id: string; x: number; y: number; orman: boolean }[] = [];
  for (const h of tanim.hucreler) {
    if (!h.uygun) continue;
    const [x, y] = hucreXY(h.id);
    toplam.sx += x;
    toplam.sy += y;
    toplam.n++;
    if (h.sinif !== "kirsal") {
      yerlesik.sx += x;
      yerlesik.sy += y;
      yerlesik.n++;
    }
    if (hucreBul(d, h.id) === undefined) bos.push({ id: h.id, x, y, orman: ormanMi(h) });
  }
  if (bos.length < n) return `ilcede yeterli bos hucre yok: ${ilce.id} (${bos.length} < ${n})`;
  const m = yerlesik.n > 0 ? yerlesik : toplam;
  const cx = tabanBol(m.sx, m.n);
  const cy = tabanBol(m.sy, m.n);
  // Orman hücreleri yalnız yetmezse kullanılır.
  const ormansiz = bos.filter((c) => !c.orman);
  const plan = ormansiz.length >= n ? kumeSec(ormansiz, n, cx, cy) : null;
  const sonuc = plan ?? kumeSec(bos, n, cx, cy);
  if (sonuc === null) return `ilcede ${n} hucrelik bitisik bos alan yok: ${ilce.id}`;
  return { ilce: ilce.id, hucreler: sonuc.sort(dizge) };
}

/** Adaylar arasında merkeze (cx, cy) en yakın tohumdan büyüyen `n` hücrelik kenar-bitişik küme; yoksa null. */
function kumeSec(adaylar: readonly { id: string; x: number; y: number }[], n: number, cx: number, cy: number): string[] | null {
  const uzak = (c: { x: number; y: number }): number => (c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy);
  const sirali = adaylar.map((c) => ({ ...c, u: uzak(c) })).sort((a, b) => a.u - b.u || dizge(a.id, b.id));
  const kimlik = new Map(sirali.map((c) => [c.id, c]));
  const basarisiz = new Set<string>();
  for (const tohum of sirali) {
    if (basarisiz.has(tohum.id)) continue;
    // Bağlı bileşen yeterince büyük mü? (taşkın doldurma)
    const bilesen = new Set<string>([tohum.id]);
    const yigin = [tohum.id];
    while (yigin.length > 0) {
      const c = kimlik.get(yigin.pop() as string) as { x: number; y: number };
      for (const [dx, dy] of KOMSULAR) {
        const k = `${c.x + dx}:${c.y + dy}`;
        if (kimlik.has(k) && !bilesen.has(k)) {
          bilesen.add(k);
          yigin.push(k);
        }
      }
    }
    if (bilesen.size < n) {
      for (const id of bilesen) basarisiz.add(id); // bileşen n'den küçük: içindeki hiçbir hücre tohum olamaz
      continue;
    }
    // Merkeze en yakın komşuyu ekleyerek büyüt (kompakt küme).
    const secilen = [tohum.id];
    const secili = new Set(secilen);
    while (secilen.length < n) {
      let en: { id: string; u: number } | null = null;
      for (const id of secilen) {
        const c = kimlik.get(id) as { x: number; y: number };
        for (const [dx, dy] of KOMSULAR) {
          const k = `${c.x + dx}:${c.y + dy}`;
          const a = kimlik.get(k);
          if (a !== undefined && !secili.has(k) && (en === null || a.u < en.u || (a.u === en.u && dizge(a.id, en.id) < 0))) en = a;
        }
      }
      if (en === null) break; // bileşen yeterli büyüklükte olduğundan olmaz
      secilen.push(en.id);
      secili.add(en.id);
    }
    if (secilen.length === n) return secilen;
  }
  return null;
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
  ilceHucreEkle(mo, ilce.id, plan.hucreler.length);
}
