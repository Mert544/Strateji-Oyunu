/**
 * Arsa ızgarası manifesti ve BHI1 yükleme (G3b; docs/06 §15.11). Manifest `packages/veri/haritalar/odbl/izgara/manifest.json` (O3, G3): ilçe
 * başına gzip'li BHI1 dosyası, bayt sayısı, sha256, ham bayt, çerçeve ve hücre sayıları. Sunucu açılışta HER ilçenin dosyasını okur ve sırayla denetler:
 *
 *   1. dosya var mı (yoksa `izgara dosyasi yok`);
 *   2. gz bayt sayısı ve sha256 GZ BAYTLARI üzerinde (`bhi.bayt`, `bhi.sha256`);
 *   3. `zlib` ile açılır; açılmış bayt `bhi.hamBayt` ile aynı mı (ikinci denetim);
 *   4. kod çözücü (`IzgaraBagimliliklari.coz`, `@bolge/veri` `bhiCoz`) BHI1'i çözer; çerçeve manifestle aynı mı;
 *   5. içerideki ve uygun hücre sayıları `hucre.icerde` / `hucre.uygun` ile aynı mı (ikinci denetim).
 *
 * Uyuşmazlıkta ya da dosya eksikse açılış okunur bir `IzgaraHatasi` ile durur (sessizce eksik dünya kurulmaz). Kod çözücü bir arayüzün
 * arkasındadır: bu modül `@bolge/veri`'ye çalışma zamanında bağlı değildir ve çözücüden bağımsız test edilir.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

/** Manifest ya da ızgara dosyası geçersiz: açılış durur (iletiler Türkçe, ASCII). */
export class IzgaraHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "IzgaraHatasi";
  }
}

export interface IzgaraDosyasi {
  yol: string;
  bayt: number;
  sha256: string;
  hamBayt: number;
}

export interface IzgaraManifestIlcesi {
  kimlik: string;
  ad: string;
  /** İl kimliği (`tr_16`); bölge eşlemesi manifestte YOKTUR (`IlBolgeEslemesi`). */
  il: string;
  bhi: IzgaraDosyasi;
  cerceve: { x0: number; y0: number; genislik: number; yukseklik: number };
  hucre: { icerde: number; uygun: number };
}

export interface IzgaraManifesti {
  surum: 1;
  hucreZ: 20;
  ilceler: IzgaraManifestIlcesi[];
}

/** Çözülmüş BHI1: `@bolge/veri` `Izgara` ile aynı alanlar (durum düzlemi satır öncelikli, y artan, x artan). */
export interface CozulmusIzgara {
  x0: number;
  y0: number;
  genislik: number;
  yukseklik: number;
  durum: Uint8Array;
}

/** BHI1 kod çözücü ve sayıcı (`@bolge/veri`: `bhiCoz`, `izgaraSay`). Bir arayüzün arkasında: test ve bağlama tek yerden. */
export interface IzgaraBagimliliklari {
  coz(ham: Uint8Array): CozulmusIzgara;
  say(ig: CozulmusIzgara): { hucre: number; uygun: number };
}

export interface YuklenenIlce {
  ilce: IzgaraManifestIlcesi;
  izgara: CozulmusIzgara;
}

const SHA256 = /^[0-9a-f]{64}$/;
const KIMLIK = /^[a-z][a-z0-9_]*$/;
const poz = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n > 0;
const tam = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n);
const nesne = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Manifest metnini doğrular (biçim; ilçeler kimliğe göre sıralı ve tekil). Hata `IzgaraHatasi`. */
export function izgaraManifestiCoz(ham: unknown, kaynak = "manifest"): IzgaraManifesti {
  const hatalar: string[] = [];
  if (!nesne(ham)) throw new IzgaraHatasi(`izgara manifesti gecersiz (${kaynak}): nesne bekleniyordu`);
  if (ham.surum !== 1) hatalar.push("surum 1 olmali");
  if (ham.hucreZ !== 20) hatalar.push("hucreZ 20 olmali");
  const liste = ham.ilceler;
  if (!Array.isArray(liste) || liste.length === 0) hatalar.push("ilceler bos olmayan dizi olmali");
  const ilceler: IzgaraManifestIlcesi[] = [];
  if (Array.isArray(liste)) {
    for (const [i, c] of liste.entries()) {
      const yer = `ilceler[${i}]`;
      if (!nesne(c)) {
        hatalar.push(`${yer}: nesne olmali`);
        continue;
      }
      const bhi = c.bhi;
      const cer = c.cerceve;
      const huc = c.hucre;
      if (typeof c.kimlik !== "string" || !KIMLIK.test(c.kimlik)) hatalar.push(`${yer}: kimlik gecersiz`);
      if (typeof c.ad !== "string" || c.ad === "") hatalar.push(`${yer}: ad gecersiz`);
      if (typeof c.il !== "string" || c.il === "") hatalar.push(`${yer}: il gecersiz`);
      if (!nesne(bhi) || typeof bhi.yol !== "string" || bhi.yol === "" || !poz(bhi.bayt) || typeof bhi.sha256 !== "string" || !SHA256.test(bhi.sha256) || !poz(bhi.hamBayt)) hatalar.push(`${yer}: bhi {yol, bayt, sha256, hamBayt} gecersiz`);
      if (!nesne(cer) || !tam(cer.x0) || !tam(cer.y0) || !poz(cer.genislik) || !poz(cer.yukseklik)) hatalar.push(`${yer}: cerceve {x0, y0, genislik, yukseklik} gecersiz`);
      if (!nesne(huc) || !poz(huc.icerde) || !tam(huc.uygun) || (huc.uygun as number) < 0) hatalar.push(`${yer}: hucre {icerde, uygun} gecersiz`);
      if (hatalar.length === 0 || !hatalar.some((h) => h.startsWith(yer))) {
        const b = bhi as Record<string, unknown>;
        const k = cer as Record<string, unknown>;
        const h = huc as Record<string, unknown>;
        ilceler.push({
          kimlik: c.kimlik as string,
          ad: c.ad as string,
          il: c.il as string,
          bhi: { yol: b.yol as string, bayt: b.bayt as number, sha256: b.sha256 as string, hamBayt: b.hamBayt as number },
          cerceve: { x0: k.x0 as number, y0: k.y0 as number, genislik: k.genislik as number, yukseklik: k.yukseklik as number },
          hucre: { icerde: h.icerde as number, uygun: h.uygun as number },
        });
      }
    }
    const kimlikler = ilceler.map((c) => c.kimlik);
    if (new Set(kimlikler).size !== kimlikler.length) hatalar.push("ilceler: yinelenen kimlik");
    if (kimlikler.some((k, i) => i > 0 && k < (kimlikler[i - 1] as string))) hatalar.push("ilceler: kimlige gore sirali degil");
  }
  if (hatalar.length > 0) throw new IzgaraHatasi(`izgara manifesti gecersiz (${kaynak}):\n - ${hatalar.slice(0, 10).join("\n - ")}${hatalar.length > 10 ? `\n - ... ve ${hatalar.length - 10} hata daha` : ""}`);
  return { surum: 1, hucreZ: 20, ilceler };
}

/** Manifest dosyasını okur ve doğrular. */
export function izgaraManifestiOku(yol: string): IzgaraManifesti {
  let metin: string;
  try {
    metin = readFileSync(yol, "utf8");
  } catch (e) {
    throw new IzgaraHatasi(`izgara manifesti okunamadi (${yol}): ${e instanceof Error ? e.message : String(e)}`);
  }
  let ham: unknown;
  try {
    ham = JSON.parse(metin);
  } catch (e) {
    throw new IzgaraHatasi(`izgara manifesti gecerli JSON degil (${yol}): ${e instanceof Error ? e.message : String(e)}`);
  }
  return izgaraManifestiCoz(ham, yol);
}

/** Manifestteki dosya yolları `odbl/` dizinine göredir; manifest `odbl/izgara/manifest.json` ise kök, manifestin ÜST dizinidir. */
export function varsayilanIzgaraKoku(manifestYolu: string): string {
  return dirname(dirname(resolve(manifestYolu)));
}

const sha256Hex = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

/** Her ilçenin BHI1'ini okur, denetler (bkz. dosya başlığı) ve çözer. İlk uyuşmazlıkta `IzgaraHatasi` fırlatır. `bag` ilk çözümde çağrılır. */
export function izgaralariYukle(m: IzgaraManifesti, kok: string, bag: () => IzgaraBagimliliklari): YuklenenIlce[] {
  const sonuc: YuklenenIlce[] = [];
  let bagimlilik: IzgaraBagimliliklari | null = null;
  for (const c of m.ilceler) {
    const yol = resolve(kok, c.bhi.yol);
    let gz: Buffer;
    try {
      gz = readFileSync(yol);
    } catch (e) {
      const yok = (e as NodeJS.ErrnoException).code === "ENOENT";
      throw new IzgaraHatasi(`izgara dosyasi ${yok ? "yok" : "okunamadi"}: ${c.kimlik} (${c.bhi.yol}, kok ${kok})${yok ? "" : `: ${e instanceof Error ? e.message : String(e)}`}`);
    }
    if (gz.length !== c.bhi.bayt) throw new IzgaraHatasi(`izgara bayt sayisi uyusmuyor: ${c.kimlik} gz ${gz.length} bayt, manifest ${c.bhi.bayt}`);
    if (sha256Hex(gz) !== c.bhi.sha256) throw new IzgaraHatasi(`izgara sha256 uyusmuyor: ${c.kimlik} (${c.bhi.yol}); dosya bozuk ya da manifestle uyumsuz`);
    let ham: Buffer;
    try {
      ham = gunzipSync(gz);
    } catch (e) {
      throw new IzgaraHatasi(`izgara gzip acilamadi: ${c.kimlik}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (ham.length !== c.bhi.hamBayt) throw new IzgaraHatasi(`izgara acilmis bayt sayisi uyusmuyor: ${c.kimlik} ${ham.length} bayt, manifest hamBayt ${c.bhi.hamBayt}`);
    bagimlilik ??= bag();
    let ig: CozulmusIzgara;
    try {
      ig = bagimlilik.coz(new Uint8Array(ham.buffer, ham.byteOffset, ham.byteLength));
    } catch (e) {
      throw new IzgaraHatasi(`izgara BHI1 cozulemedi: ${c.kimlik}: ${e instanceof Error ? e.message : String(e)}`);
    }
    const k = c.cerceve;
    if (ig.x0 !== k.x0 || ig.y0 !== k.y0 || ig.genislik !== k.genislik || ig.yukseklik !== k.yukseklik) {
      throw new IzgaraHatasi(`izgara cercevesi uyusmuyor: ${c.kimlik} dosya (${ig.x0},${ig.y0},${ig.genislik},${ig.yukseklik}), manifest (${k.x0},${k.y0},${k.genislik},${k.yukseklik})`);
    }
    const say = bagimlilik.say(ig);
    if (say.hucre !== c.hucre.icerde || say.uygun !== c.hucre.uygun) {
      throw new IzgaraHatasi(`izgara hucre sayilari uyusmuyor: ${c.kimlik} dosya icerde ${say.hucre} / uygun ${say.uygun}, manifest ${c.hucre.icerde} / ${c.hucre.uygun}`);
    }
    sonuc.push({ ilce: c, izgara: ig });
  }
  return sonuc;
}

/** Çekirdek girdisi (`@bolge/veri` `ParselIzgaraGirdisi` ile aynı yapı; bağlanınca o tip kullanılır). */
export interface IzgaraGirdisi {
  ad: string;
  harita: string;
  tohum: number;
  iller: { id: string; ad: string; bolge: string }[];
  ilceler: { id: string; ad: string; il: string; bolge: string; izgara: CozulmusIzgara }[];
}

/** İl kimliğinden bölge kimliği (manifestte yok); bulunamazsa `undefined`. */
export type IlBolgeEslemesi = (il: string) => string | undefined;

/** Izgara dünyasının tohumu: sabit (hücre dizini ve kamu türetmesi için; JSON fikstüründeki `tohum` alanının karşılığı). */
export const IZGARA_TOHUMU = 1;

/** Yüklenen ilçelerden çekirdek girdisini kurar (ilçe sırası manifest sırasıdır; iller ilk görülme sırasıyla). */
export function izgaraGirdisiKur(yuklenen: readonly YuklenenIlce[], s: { ad: string; harita: string; tohum?: number; ilBolge: IlBolgeEslemesi }): IzgaraGirdisi {
  const iller = new Map<string, { id: string; ad: string; bolge: string }>();
  const ilceler: IzgaraGirdisi["ilceler"] = [];
  for (const { ilce, izgara } of yuklenen) {
    let il = iller.get(ilce.il);
    if (!il) {
      const bolge = s.ilBolge(ilce.il);
      if (bolge === undefined) throw new IzgaraHatasi(`il icin bolge eslemesi yok: ${ilce.il} (--izgara-il-bolge ${ilce.il}=<bolge kimligi>; ya da haritada ayni kimlikli bolge olmali)`);
      il = { id: ilce.il, ad: ilce.il, bolge };
      iller.set(ilce.il, il);
    }
    ilceler.push({ id: ilce.kimlik, ad: ilce.ad, il: il.id, bolge: il.bolge, izgara });
  }
  return { ad: s.ad, harita: s.harita, tohum: s.tohum ?? IZGARA_TOHUMU, iller: [...iller.values()], ilceler };
}

/** `--izgara-il-bolge tr_16=bursa,tr_41=kocaeli` biçimini ayrıştırır. */
export function ilBolgeEslemesiCoz(metin: string | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const parca of (metin ?? "").split(",")) {
    const p = parca.trim();
    if (p === "") continue;
    const i = p.indexOf("=");
    if (i <= 0 || i === p.length - 1) throw new IzgaraHatasi(`--izgara-il-bolge gecersiz: "${p}" (il=bolge bekleniyordu)`);
    m.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
  }
  return m;
}

/** Çekirdek veri paketine bağlar (`CekirdekVeriPaketi.parselIzgara`; K3 hücre dizini dalıyla gelir). */
export function izgarayiVeriyeBagla(veri: object, girdi: IzgaraGirdisi): void {
  (veri as { parselIzgara?: IzgaraGirdisi }).parselIzgara = girdi;
}

/** Varsayılan bağımlılıklar: `@bolge/veri` `bhiCoz` + `izgaraSay` (K3 hücre dizini dalı girene kadar yoksa açık hata verir). */
export function varsayilanIzgaraBagimliliklari(): IzgaraBagimliliklari {
  // TODO(G3b bağlama): K3 dalı girince `import { bhiCoz, izgaraSay } from "@bolge/veri"` ile statik bağlanır.
  throw new IzgaraHatasi("BHI1 kod cozucusu bagli degil (@bolge/veri bhiCoz/izgaraSay henuz yok)");
}
