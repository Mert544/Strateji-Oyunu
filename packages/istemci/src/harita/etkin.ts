/**
 * İçerik dizininden türeyen G8 kararları (saf; DOM yok): Defter kavramının ETKİN olup olmadığı, "G8 açık" ve dükkân türlerinin mal grubu.
 *
 * - Etkin kuralı TEK yerdedir: protokol `kavramEtkin` (sunucu `siradaki.etkin`'i aynı işlevle yazar). İstemci yalnız girdiyi (`DefterEtkinGirdisi`) içerik dizininden kurar:
 *   yöntem çıktı mal kimlikleri ve dükkân verisi (`param.mulk.perakende`) var mı. Kavram kimliklerine (`celik_dograma` gibi) bakılmaz.
 * - "G8 açık" = `kavramEtkin(…, "ilk_pencere")`: içerikte pencere üreten bir yöntem var. D3 maliyet kartı bununla `pencere_yok_g8` metnini seçer.
 * - Dükkân türünün sattığı mallar `param.mulk.perakende.dukkanTurleri[].mallar` alanından okunur (liste elle yazılmaz): D2 tür uyumu ve D0 "rafa konabilir stok" aynı kaynaktan.
 */
import { kavramEtkin as protokolKavramEtkin } from "@bolge/protokol";
import type { DefterEtkinGirdisi } from "@bolge/protokol";
import type { Icerik } from "../komut/tablo";

const onbellek = new WeakMap<Icerik, DefterEtkinGirdisi>();

/** İçerikten en küçük etkin girdisi (içerik değişmezdir: dizin başına bir kez kurulur). */
export function etkinGirdisi(ic: Icerik): DefterEtkinGirdisi {
  let g = onbellek.get(ic);
  if (g === undefined) {
    const mallar = new Set<string>();
    for (const y of ic.yontemler) for (const [m] of y.cikti) {
      const id = ic.mallar[m]?.id;
      if (id !== undefined) mallar.add(id);
    }
    g = { yontemCiktilari: mallar, perakende: ic.param.mulk?.perakende !== undefined };
    onbellek.set(ic, g);
  }
  return g;
}

/** Kavram içerikte etkin mi (protokol kuralı; Defter'de gösterilir mi). */
export function kavramEtkin(ic: Icerik, kavram: string): boolean {
  return protokolKavramEtkin(etkinGirdisi(ic), kavram);
}

/** Dükkân verisi olmayan boş içerik için etkin kuralı (sahte bağdaştırıcı varsayılanı: yer tutucu ve içerik bağımlı kavramlar kapalı). */
export function kavramEtkinBos(kavram: string): boolean {
  return protokolKavramEtkin({ yontemCiktilari: [], perakende: false }, kavram);
}

/** G8 açık mı: içerikte pencere üreten bir yöntem var (`kavramEtkin(…, "ilk_pencere")`; tek kural). */
export function g8Acik(ic: Icerik): boolean {
  return kavramEtkin(ic, "ilk_pencere");
}

/** Dükkân türünün sattığı mallar (içerikten); tür tanımsızsa boş. */
export function dukkanTuruMallari(ic: Icerik, tur: string): readonly string[] {
  return ic.param.mulk?.perakende?.dukkanTurleri.find((t) => t.id === tur)?.mallar ?? [];
}

/** Hiçbir dükkân türünün satabildiği mal kümesi (D0 "rafa konabilir stok" için birleşim). */
export function satilabilirMallar(ic: Icerik): ReadonlySet<string> {
  const k = new Set<string>();
  for (const t of ic.param.mulk?.perakende?.dukkanTurleri ?? []) for (const m of t.mallar) k.add(m);
  return k;
}

/**
 * D2 tür uyumu: türün mallarından en az biri depoda (stokta) mı. Yapı marketin grubu (cam, pencere, çelik, parça) içerikten gelir; sayılan mallar elle yazılmaz.
 * `stokta(mal)`: deponun o maldan stoğu var mı (mevcut > 0).
 */
export function turUyumlari(ic: Icerik, stokta: (mal: string) => boolean): Record<string, boolean> {
  const s: Record<string, boolean> = {};
  for (const t of ic.param.mulk?.perakende?.dukkanTurleri ?? []) s[t.id] = t.mallar.some(stokta);
  return s;
}
