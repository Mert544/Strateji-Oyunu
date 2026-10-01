/**
 * Mal ve yapı KİMLİK KİLİDİ (G-K1; docs/arastirma/kimlik-listesi-v1.md, docs/06 §15.8): `icerik/kimlik-listesi.json`'un şeması ve
 * doğrulayıcıları. Saf (dosya sistemine bağlı değil); veri paketi doğrulaması (`dogrulaVeriPaketi`) ve çekirdek derlemesi (`icerikDerle`) kullanır.
 *
 * Kurallar (hepsi için ret testi `veri/test/kimlik-listesi.test.ts`):
 *  (a) içerik dizilerindeki her kimlik listede olmalı; listede olmayan kimlik içeriğe giremez;
 *  (b) içerik sırası liste sırasının ÖNEKİ olmalı (yalnız sona ekleme: araya ekleme, yeniden sıralama ve silme reddedilir);
 *  (c) yasaklı kimlik (`tekstil`; mal olarak `sarkuteri`) `mallar[]` içinde reddedilir;
 *  (d) mal ve dükkân türü ad alanları kesişmez;
 *  (e) kimlik biçimi: ASCII, küçük harf, alt çizgi (rakam yalnız ilk karakter olmamak şartıyla);
 *  (f) içerikteki mal `tabanFiyat`ı listedeki `taban` (₺) ile aynı olmalı (örn. `findik_urunu` 240, katalogdaki 190 düzeltmesi).
 * Önek denetimi `mallar[]` ve `tesisTurleri[]` içindir (içerik dizileri); ek yapılar `mulk.ekYapilar` anahtarlarıdır (derlemede kimliğe göre
 * sıralanır, dolayısıyla yalnız üyelik denetlenir); dükkân türleri henüz içerikte yoktur (üyelik + ad alanı denetimi).
 * Yöntem ve teknoloji kimlikleri bu kilidin kapsamı DIŞINDADIR (kimlik listesi açık nokta 3 ve 4: ayrı kimlik listeleri; sonraki iş).
 */
import { z } from "zod";
import type { DogrulamaSonucu, VeriPaketi } from "./dogrula";

/** Kimlik biçimi: ASCII, küçük harf, alt çizgi; rakam yalnız ilk karakter olmamak şartıyla. */
export const KIMLIK_BICIMI = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

export const KIMLIK_ASAMALARI = ["A0", "A0-ops", "A1", "S", "ileride"] as const;
export type KimlikAsamasi = (typeof KIMLIK_ASAMALARI)[number];

const Asama = z.enum(KIMLIK_ASAMALARI);
const Kimlik = z.string().min(1);

const MalKaydi = z.object({ id: Kimlik, ad: z.string().min(1).optional(), asama: Asama, taban: z.number().int().positive().optional() }).strict();
const YapiKaydi = z.object({ id: Kimlik, asama: Asama }).strict();
const YasakliKaydi = z.object({ id: Kimlik, neden: z.string().min(1), yerine: z.array(Kimlik) }).strict();

export const KimlikListesiSema = z
  .object({
    surum: z.literal(1),
    aciklama: z.string().optional(),
    mallar: z.array(MalKaydi),
    yapilar: z.object({ tesisTurleri: z.array(YapiKaydi), ekYapilar: z.array(YapiKaydi), kamuYapilari: z.array(YapiKaydi) }).strict(),
    dukkanTurleri: z.array(YapiKaydi),
    yasakli: z.object({ mallar: z.array(YasakliKaydi) }).strict(),
  })
  .strict();

export type KimlikListesi = z.infer<typeof KimlikListesiSema>;

/** İçeriğin kimlik dizileri (kilit denetimi girdisi). */
export interface KimlikKilidiGirdisi {
  /** `icerik.mallar[]` sırasıyla `{ id, tabanFiyat? }` (mili-para). */
  mallar: readonly { id: string; tabanFiyat?: number }[];
  /** `icerik.tesisTurleri[]` sırasıyla kimlikler. */
  tesisTurleri: readonly string[];
  /** `param.mulk.ekYapilar` anahtarları (varsa). */
  ekYapilar?: readonly string[];
  /** `param.mulk.perakende.dukkanTurleri[]` kimlikleri (varsa). */
  dukkanTurleri?: readonly string[];
}

function tekrarlar(l: readonly string[]): string[] {
  const g = new Set<string>();
  const t = new Set<string>();
  for (const x of l) (g.has(x) ? t : g).add(x);
  return [...t].sort();
}

/** Listenin KENDİ tutarlılığı: şema, biçim, tekrar, yasaklılar, ad alanı kesişimi. Hata iletileri boşsa geçerli. */
export function kimlikListesiHatalari(ham: unknown): string[] {
  const s = KimlikListesiSema.safeParse(ham);
  if (!s.success) return s.error.issues.map((i) => `kimlik-listesi.${i.path.join(".")}: ${i.message}`);
  const l = s.data;
  const hatalar: string[] = [];
  const gruplar: [string, readonly string[]][] = [
    ["mallar", l.mallar.map((m) => m.id)],
    ["yapilar.tesisTurleri", l.yapilar.tesisTurleri.map((m) => m.id)],
    ["yapilar.ekYapilar", l.yapilar.ekYapilar.map((m) => m.id)],
    ["yapilar.kamuYapilari", l.yapilar.kamuYapilari.map((m) => m.id)],
    ["dukkanTurleri", l.dukkanTurleri.map((m) => m.id)],
    ["yasakli.mallar", l.yasakli.mallar.map((m) => m.id)],
  ];
  for (const [ad, ids] of gruplar) {
    for (const id of ids) if (!KIMLIK_BICIMI.test(id)) hatalar.push(`kimlik-listesi.${ad}: gecersiz kimlik bicimi (ASCII, kucuk harf, alt cizgi): "${id}"`);
    for (const t of tekrarlar(ids)) hatalar.push(`kimlik-listesi.${ad}: tekrarlanan kimlik: ${t}`);
  }
  const mal = new Set(l.mallar.map((m) => m.id));
  const duk = new Set(l.dukkanTurleri.map((m) => m.id));
  for (const y of l.yasakli.mallar) {
    if (mal.has(y.id)) hatalar.push(`kimlik-listesi.mallar: yasakli kimlik mal olamaz: ${y.id}`);
    for (const r of y.yerine) if (!mal.has(r) && !duk.has(r)) hatalar.push(`kimlik-listesi.yasakli.${y.id}: 'yerine' kimligi listede yok: ${r}`);
  }
  for (const id of [...mal].sort()) if (duk.has(id)) hatalar.push(`kimlik-listesi: mal ve dukkan turu ad alanlari kesisiyor: ${id}`);
  // Yapı kimlikleri ile mal kimlikleri de ayrı tutulur (görünen ad karışmasın)
  const yapi = new Set([...l.yapilar.tesisTurleri, ...l.yapilar.ekYapilar, ...l.yapilar.kamuYapilari].map((m) => m.id));
  for (const id of [...mal].sort()) if (yapi.has(id)) hatalar.push(`kimlik-listesi: mal ve yapi kimlikleri kesisiyor: ${id}`);
  return hatalar;
}

/**
 * İçeriğin kimlik listesine karşı kilidi: (a) üyelik, (b) önek (yalnız sona ekleme), (c) yasaklılar, (d) ad alanı, (e) biçim, (f) taban fiyat.
 * Liste kendi içinde geçerli varsayılır (`kimlikListesiHatalari`); geçersizse yalnız onun hataları döner.
 */
export function kimlikKilidiHatalari(ham: unknown, g: KimlikKilidiGirdisi): string[] {
  const ic = kimlikListesiHatalari(ham);
  if (ic.length > 0) return ic;
  const l = ham as KimlikListesi;
  const hatalar: string[] = [];
  const yasakli = new Map(l.yasakli.mallar.map((y) => [y.id, y]));
  const listeMal = l.mallar;
  const mallar = g.mallar.map((m) => m.id);

  // (e) biçim ve (c) yasaklılar
  for (const id of mallar) {
    if (!KIMLIK_BICIMI.test(id)) hatalar.push(`icerik.mallar: gecersiz kimlik bicimi (ASCII, kucuk harf, alt cizgi): "${id}"`);
    const y = yasakli.get(id);
    if (y !== undefined) hatalar.push(`icerik.mallar: yasakli mal kimligi: ${id} (yerine: ${y.yerine.join(", ")}; ${y.neden})`);
  }
  for (const id of g.tesisTurleri) if (!KIMLIK_BICIMI.test(id)) hatalar.push(`icerik.tesisTurleri: gecersiz kimlik bicimi: "${id}"`);
  for (const id of g.ekYapilar ?? []) if (!KIMLIK_BICIMI.test(id)) hatalar.push(`mulk.ekYapilar: gecersiz kimlik bicimi: "${id}"`);
  for (const id of g.dukkanTurleri ?? []) if (!KIMLIK_BICIMI.test(id)) hatalar.push(`mulk.perakende.dukkanTurleri: gecersiz kimlik bicimi: "${id}"`);

  // (a) üyelik ve (b) önek
  const onek = (ad: string, icerik: readonly string[], liste: readonly string[]): void => {
    const uye = new Set(liste);
    for (const id of icerik) if (!uye.has(id) && !yasakli.has(id)) hatalar.push(`${ad}: kimlik listede yok (kimlik-listesi.json'a once eklenmeli): ${id}`);
    for (let i = 0; i < icerik.length; i++) {
      const id = icerik[i] as string;
      if (!uye.has(id)) continue;
      if (liste[i] !== id) {
        hatalar.push(`${ad}[${i}]: onek ihlali: icerikte "${id}", listede "${liste[i] ?? "(bitti)"}" (yalniz sona ekleme; araya ekleme, yeniden siralama ve silme yasak)`);
        break;
      }
    }
  };
  onek("icerik.mallar", mallar, listeMal.map((m) => m.id));
  onek("icerik.tesisTurleri", g.tesisTurleri, l.yapilar.tesisTurleri.map((m) => m.id));
  const uyeEk = new Set([...l.yapilar.ekYapilar, ...l.yapilar.kamuYapilari].map((m) => m.id));
  for (const id of g.ekYapilar ?? []) if (!uyeEk.has(id)) hatalar.push(`mulk.ekYapilar: kimlik listede yok (kimlik-listesi.json'a once eklenmeli): ${id}`);
  const uyeDuk = new Set(l.dukkanTurleri.map((m) => m.id));
  for (const id of g.dukkanTurleri ?? []) if (!uyeDuk.has(id)) hatalar.push(`mulk.perakende.dukkanTurleri: kimlik listede yok (kimlik-listesi.json'a once eklenmeli): ${id}`);

  // (d) ad alanı: içerikteki mal ve dükkân türü kesişmez
  const malKume = new Set(mallar);
  for (const id of g.dukkanTurleri ?? []) if (malKume.has(id)) hatalar.push(`icerik: mal ve dukkan turu ad alanlari kesisiyor: ${id}`);

  // (f) taban fiyat
  const taban = new Map(listeMal.filter((m) => m.taban !== undefined).map((m) => [m.id, m.taban as number]));
  for (const m of g.mallar) {
    const t = taban.get(m.id);
    if (t !== undefined && m.tabanFiyat !== undefined && m.tabanFiyat !== t * 1000) {
      hatalar.push(`icerik.mallar.${m.id}: tabanFiyat ${m.tabanFiyat} listedeki taban ${t} TL (x1000 = ${t * 1000}) ile ayni degil`);
    }
  }
  return hatalar;
}

/**
 * Paketin içeriğini paketin `kimlikListesi`ne karşı denetler (`kimlikKilidiHatalari`); liste yoksa geçerlidir (kilit uygulanmaz). Node yükleyicileri
 * (`yukle.ts`) `dogrulaVeriPaketi`den SONRA çağırır; `dogrulaVeriPaketi` ve çekirdek bunu çağırmaz (tarayıcı/istemci paketi bütçesi).
 */
export function dogrulaKimlikKilidi(paket: Pick<VeriPaketi, "icerik" | "param" | "kimlikListesi">): DogrulamaSonucu {
  if (paket.kimlikListesi === undefined) return { gecerli: true };
  const ek = paket.param.mulk?.ekYapilar;
  const hatalar = kimlikKilidiHatalari(paket.kimlikListesi, {
    mallar: paket.icerik.mallar,
    tesisTurleri: paket.icerik.tesisTurleri.map((x) => x.id),
    ...(ek !== undefined ? { ekYapilar: Object.keys(ek) } : {}),
  }).map((h) => `[kimlik-listesi] ${h}`);
  return hatalar.length === 0 ? { gecerli: true } : { gecerli: false, hatalar };
}
