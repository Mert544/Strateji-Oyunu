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
 * arkasındadır (`IzgaraBagimliliklari`; varsayılanı `@bolge/veri` `bhiCoz` + `izgaraSay`): yükleme denetimleri çözücüden bağımsız test edilebilir.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { bhiCoz, izgaraSay, parselIzgaraHatalari } from "@bolge/veri";
import type { ParselIzgaraGirdisi } from "@bolge/veri";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";

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
/** Manifestteki yol `odbl/` köküne GÖRELİdir ve kökten kaçamaz: mutlak yol, sürücü harfi ve `..` parçası reddedilir (istemcideki `derle.ts` ile aynı kural). */
export function yolGuvenliMi(yol: string): boolean {
  if (isAbsolute(yol) || /^[A-Za-z]:/.test(yol) || yol.startsWith("/") || yol.startsWith("\\")) return false;
  return !yol.split(/[\\/]/).some((p) => p === "..");
}
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
      if (nesne(bhi) && typeof bhi.yol === "string" && bhi.yol !== "" && !yolGuvenliMi(bhi.yol)) hatalar.push(`${yer}: bhi.yol kok disina cikamaz (mutlak yol ya da ".." yok): ${c.kimlik as string}`);
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
    const goreli = relative(resolve(kok), yol);
    // İkinci denetim (manifest elle kurulmuş olsa da): çözülen yol kökün içinde kalmalı.
    if (!yolGuvenliMi(c.bhi.yol) || goreli === "" || goreli.startsWith("..") || isAbsolute(goreli)) throw new IzgaraHatasi(`izgara dosya yolu kok disina cikiyor: ${c.kimlik} (${c.bhi.yol})`);
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

/** Çekirdek girdisi: `@bolge/veri` `ParselIzgaraGirdisi` (K3 hücre dizini; `CekirdekVeriPaketi.parselIzgara`). */
export type IzgaraGirdisi = ParselIzgaraGirdisi;

/** Izgara dünyasının tohumu: sabit (hücre dizini ve kamu türetmesi için; JSON fikstüründeki `tohum` alanının karşılığı). */
export const IZGARA_TOHUMU = 1;

/** İlçe hiyerarşisi (`hiyerarsi.json`, O3 veri hattı çıktısı; istemcinin kullandığı kaynakla aynı): ilçe kimliği -> ilçe/il adı, il kimliği, bölge kimliği. */
export interface HiyerarsiIlcesi {
  ilceAd: string;
  il: string;
  ilAd: string;
  bolge: string;
}
export type HiyerarsiIndeksi = ReadonlyMap<string, HiyerarsiIlcesi>;

/** `hiyerarsi.json` yapısı: `bolgeler[].kimlik` > `iller[].{kimlik, ad}` > `ilceler[].{kimlik, ad}`; diğer alanlar yok sayılır. */
export function hiyerarsiCoz(ham: unknown, kaynak = "hiyerarsi"): HiyerarsiIndeksi {
  const m = new Map<string, HiyerarsiIlcesi>();
  if (!nesne(ham) || !Array.isArray(ham.bolgeler)) throw new IzgaraHatasi(`hiyerarsi gecersiz (${kaynak}): bolgeler dizisi bekleniyordu`);
  for (const b of ham.bolgeler as unknown[]) {
    if (!nesne(b) || typeof b.kimlik !== "string" || !Array.isArray(b.iller)) throw new IzgaraHatasi(`hiyerarsi gecersiz (${kaynak}): bolge {kimlik, iller} bekleniyordu`);
    for (const il of b.iller as unknown[]) {
      if (!nesne(il) || typeof il.kimlik !== "string" || typeof il.ad !== "string" || !Array.isArray(il.ilceler)) throw new IzgaraHatasi(`hiyerarsi gecersiz (${kaynak}): il {kimlik, ad, ilceler} bekleniyordu (bolge ${b.kimlik})`);
      for (const c of il.ilceler as unknown[]) {
        if (!nesne(c) || typeof c.kimlik !== "string" || typeof c.ad !== "string") throw new IzgaraHatasi(`hiyerarsi gecersiz (${kaynak}): ilce {kimlik, ad} bekleniyordu (il ${il.kimlik})`);
        m.set(c.kimlik, { ilceAd: c.ad, il: il.kimlik, ilAd: il.ad, bolge: b.kimlik });
      }
    }
  }
  return m;
}

export function hiyerarsiOku(yol: string): HiyerarsiIndeksi {
  let ham: unknown;
  try {
    ham = JSON.parse(readFileSync(yol, "utf8"));
  } catch (e) {
    throw new IzgaraHatasi(`hiyerarsi okunamadi (${yol}): ${e instanceof Error ? e.message : String(e)}`);
  }
  return hiyerarsiCoz(ham, yol);
}

/**
 * Yüklenen ilçelerden çekirdek girdisini kurar. İl, bölge, ilçe ve il adları HİYERARŞİDEN çözülür (elle eşleme yoktur); ilçe hiyerarşide yoksa,
 * manifestteki il hiyerarşidekiyle uyuşmuyorsa ya da bölge haritada yoksa `IzgaraHatasi`. İlçe sırası manifest sırasıdır; iller ilk görülme sırasıyla.
 */
export function izgaraGirdisiKur(yuklenen: readonly YuklenenIlce[], s: { ad: string; harita: string; tohum?: number; hiyerarsi: HiyerarsiIndeksi; haritaBolgeleri: ReadonlySet<string> }): IzgaraGirdisi {
  const iller = new Map<string, { id: string; ad: string; bolge: string }>();
  const ilceler: IzgaraGirdisi["ilceler"] = [];
  for (const { ilce, izgara } of yuklenen) {
    const h = s.hiyerarsi.get(ilce.kimlik);
    if (!h) throw new IzgaraHatasi(`ilce hiyerarsi dosyasinda yok: ${ilce.kimlik} (--hiyerarsi)`);
    if (h.il !== ilce.il) throw new IzgaraHatasi(`ilce ilinin hiyerarsiyle uyusmuyor: ${ilce.kimlik} manifest ${ilce.il}, hiyerarsi ${h.il}`);
    if (!s.haritaBolgeleri.has(h.bolge)) throw new IzgaraHatasi(`ilcenin bolgesi haritada yok: ${ilce.kimlik} -> bolge ${h.bolge} (harita ${s.harita})`);
    if (!iller.has(h.il)) iller.set(h.il, { id: h.il, ad: h.ilAd, bolge: h.bolge });
    else if (iller.get(h.il)?.bolge !== h.bolge) throw new IzgaraHatasi(`il birden cok bolgede: ${h.il}`);
    ilceler.push({ id: ilce.kimlik, ad: h.ilceAd, il: h.il, bolge: h.bolge, izgara });
  }
  const girdi: IzgaraGirdisi = { ad: s.ad, harita: s.harita, tohum: s.tohum ?? IZGARA_TOHUMU, iller: [...iller.values()], ilceler };
  // Çekirdeğin kendi yapısal denetimi (yinelenen kimlik, il/bölge uyumu, çerçeve z20 aralığı): açılışta okunur hata.
  const hatalar = parselIzgaraHatalari(girdi);
  if (hatalar.length > 0) throw new IzgaraHatasi(`izgara girdisi gecersiz:\n - ${hatalar.slice(0, 10).join("\n - ")}`);
  return girdi;
}

/** Çekirdek veri paketine bağlar (`CekirdekVeriPaketi.parselIzgara`; `parsel` ile birlikte verilemez). */
export function izgarayiVeriyeBagla(veri: CekirdekVeriPaketi, girdi: IzgaraGirdisi): void {
  veri.parselIzgara = girdi;
}

/** Varsayılan bağımlılıklar: `@bolge/veri` `bhiCoz` + `izgaraSay`. */
export function varsayilanIzgaraBagimliliklari(): IzgaraBagimliliklari {
  return { coz: bhiCoz, say: izgaraSay };
}
