/**
 * Yapı önce yerleşim (F4, saf; DOM ve harita yok): mülk kipinde kurulabilir yapıların kataloğu, hayaletin ayak izi ve
 * yerleşim planı (geçerlilik, neden, alınacak boş hücreler, maliyet).
 *
 * Çekirdek kuralları (cekirdek/src/mulk/komut.ts): `tesis_insa_hucre` hücre sayısı yapının yuvasına (1–3) eşit, hücreler
 * oyuncunun ve boş olmalı. Hücrelerin bitişik olması çekirdekte aranmaz; istemci hayaleti her zaman bitişik bir sıra olarak
 * (yatay ya da dikey) kurar. Boş (sahipsiz) hücreler aynı işlemde `parsel_al` ile alınır: sınıf başına bir komut
 * (komut tek `sinif` ister) ve ardından `tesis_insa_hucre`; ilki başarısızsa sonrakiler gönderilmez (`zincir.ts`).
 */
import type { ArsaSinifi, HucreId, OyuncuId } from "@bolge/cekirdek";
import { fmt, paraMili } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import type { IlceSahipligi, YapiKaydi } from "./baglanti";
import { alimTuru, arsaSinifi, ILCE_HUCRE_SINIRI, ILCE_PAY_SINIRI, parselToplamFiyatiMili, sinirDenetle } from "./fiyat";
import type { AyrilmisHakki } from "./fiyat";
import { carpBol } from "./olcek";
import { durumAl, engelNedeni, hucreId } from "./hucre";
import type { Izgara } from "./hucre";

export interface YapiMalzemesi {
  id: string;
  ad: string;
  /** mili-birim */
  miktar: number;
}

export interface YapiTanimi {
  id: string;
  ad: string;
  grup: string;
  /** Kapladığı hücre sayısı (1–3). */
  yuva: number;
  /** mili-₺ */
  paraMili: number;
  malzeme: YapiMalzemesi[];
  sureSaat: number;
  /** Yeni oyuncunun ilk 24 saatindeki hızlandırılmış süre tahmini (saat). */
  ilkGunSureSaat: number;
  gerekliEtiket?: string;
  gerekliTeknoloji?: string;
  gerekliRezerv?: string;
  /** Ek yapı (Ambar, Ticaret ofisi...): üretim yapmaz; ilde en çok `enFazlaIlBasina` adet. */
  ek?: boolean;
  enFazlaIlBasina?: number;
}

const GRUP: Record<string, string> = {
  ciftlik: "Tarım",
  ahir: "Tarım",
  mera: "Tarım",
  sulama_kanali: "Tarım",
  gubre_fabrikasi: "Tarım",
  gida_fabrikasi: "Gıda",
  cevher_madeni: "Madencilik",
  komur_ocagi: "Madencilik",
  bakir_madeni: "Madencilik",
  silis_ocagi: "Madencilik",
  petrol_kuyusu: "Madencilik",
  celikhane: "Sanayi",
  parca_fabrikasi: "Sanayi",
  elektronik_fabrikasi: "Sanayi",
  santral: "Enerji",
  hidro_santrali: "Enerji",
  muhimmat_fabrikasi: "Askeri",
};

/**
 * Yapı → katman rengi (görsel kimlik §3.6): haritada yapı dolgusu, menüde nokta, 3B'de tente/çatı kenarı. Sahip = oyuncu
 * rengi, iş = katman rengi (ayrı kanallar). Konut ve bilinmeyen: null (nötr mürekkep).
 */
const KATMAN: Record<string, "tarim" | "sanayi" | "lojistik" | "teknoloji" | "pazar" | "devlet" | "askeri"> = {
  ciftlik: "tarim",
  ahir: "tarim",
  mera: "tarim",
  sulama_kanali: "tarim",
  gubre_fabrikasi: "tarim",
  gida_fabrikasi: "tarim",
  cevher_madeni: "sanayi",
  komur_ocagi: "sanayi",
  bakir_madeni: "sanayi",
  silis_ocagi: "sanayi",
  petrol_kuyusu: "sanayi",
  celikhane: "sanayi",
  parca_fabrikasi: "sanayi",
  elektronik_fabrikasi: "sanayi",
  santral: "sanayi",
  hidro_santrali: "sanayi",
  muhimmat_fabrikasi: "askeri",
};

export function yapiKatmani(id: string | undefined): (typeof KATMAN)[string] | null {
  if (!id) return null;
  const k = KATMAN[id];
  if (k) return k;
  if (/ambar|garaj|depo/.test(id)) return "lojistik";
  if (/atolye|lab/.test(id)) return "teknoloji";
  if (/ticaret|pazar|dukkan/.test(id)) return "pazar";
  if (/ordugah|muhimmat/.test(id)) return "askeri";
  if (/muhtar/.test(id)) return "devlet";
  return null;
}

/** Katman renginin CSS değeri (nötr yedek). */
export const yapiRengiCss = (id: string | undefined): string => {
  const k = yapiKatmani(id);
  return k ? `var(--katman-${k})` : "var(--murekkep-3)";
};

export const GRUP_SIRASI = ["Tarım", "Gıda", "Sanayi", "Madencilik", "Enerji", "Askeri", "Kent ve altyapı", "Diğer"] as const;

export const ETIKET_ADI: Readonly<Record<string, string>> = { liman: "Liman", dag: "Dağ", dar_gecit: "Dar geçit", kiyi: "Kıyı", ova: "Ova" };

/** Mülk kipinde kurulabilir yapılar (`param.mulk.yapiYuva`'da olanlar), parametre sırasıyla. Mülk parametresi yoksa boş. */
export function yapiKatalogu(ic: Icerik): YapiTanimi[] {
  const m = ic.param.mulk;
  if (!m) return [];
  const carpan = (ic.param.erkenOyun?.baslangicCarpaniPpm ?? 1_000_000) / 1_000_000;
  const l: YapiTanimi[] = [];
  for (const [id, yuva] of Object.entries(m.yapiYuva)) {
    const t = ic.turler[ic.turIdx[id] ?? -1];
    if (!t || yuva <= 0) continue;
    const sureSaat = m.yapiInsaSaati?.[id] ?? t.sureSaat;
    l.push({
      id,
      ad: t.ad,
      grup: GRUP[id] ?? "Diğer",
      yuva,
      paraMili: t.para,
      malzeme: t.maliyet.map(([mi, miktar]) => ({ id: ic.mallar[mi]?.id ?? String(mi), ad: ic.mallar[mi]?.ad ?? String(mi), miktar })),
      sureSaat,
      ilkGunSureSaat: Math.max(1 / 60, sureSaat * carpan),
      ...(t.gerekliEtiket !== undefined ? { gerekliEtiket: t.gerekliEtiket } : {}),
      ...(t.gerekliTeknoloji !== undefined ? { gerekliTeknoloji: t.gerekliTeknoloji } : {}),
      ...(t.gerekliRezerv >= 0 ? { gerekliRezerv: ic.mallar[t.gerekliRezerv]?.id ?? "" } : {}),
    });
  }
  // Ek yapılar (`param.mulk.ekYapilar`): tesis türü değiller, aynı `tesis_insa_hucre` komutuyla kurulurlar.
  // Kamu yapıları (ör. Muhtarlık; `mulk.kamu.oyuncuyaKapaliYapilar`) oyuncuya kapalıdır: menüde gösterilmez.
  const kapali = new Set(m.kamu?.oyuncuyaKapaliYapilar ?? []);
  for (const [id, e] of Object.entries(m.ekYapilar ?? {})) {
    if (e.yuva <= 0 || kapali.has(id) || l.some((y) => y.id === id)) continue;
    l.push({
      id,
      ad: e.ad,
      grup: "Kent ve altyapı",
      yuva: e.yuva,
      paraMili: e.insaParasi,
      malzeme: Object.entries(e.insaMaliyeti)
        .filter(([, q]) => q > 0)
        .map(([mal, miktar]) => ({ id: mal, ad: ic.mallar[ic.malIdx[mal] ?? -1]?.ad ?? mal, miktar })),
      sureSaat: e.insaSaati,
      ilkGunSureSaat: Math.max(1 / 60, e.insaSaati * carpan),
      ek: true,
      ...(e.enFazlaIlBasina !== undefined ? { enFazlaIlBasina: e.enFazlaIlBasina } : {}),
    });
  }
  return l.sort((a, b) => GRUP_SIRASI.indexOf(a.grup as (typeof GRUP_SIRASI)[number]) - GRUP_SIRASI.indexOf(b.grup as (typeof GRUP_SIRASI)[number]));
}

/**
 * Hayaletin hücre kaymaları (çapa hücresine göre). Yuva 1: tek hücre; yuva 2–3: bitişik sıra, `donus` çift ise yatay,
 * tek ise dikey (R tuşu). Sıra çapayı ortalar (yuva 3: çapa ortada).
 */
export function ayakIzi(yuva: number, donus: number): Array<[number, number]> {
  const n = Math.max(1, Math.min(3, Math.trunc(yuva)));
  const bas = -Math.floor((n - 1) / 2);
  const dikey = Math.abs(Math.trunc(donus)) % 2 === 1;
  return Array.from({ length: n }, (_, i): [number, number] => (dikey ? [0, bas + i] : [bas + i, 0]));
}

export interface ParselAdimi {
  sinif: ArsaSinifi;
  hucreler: HucreId[];
  /** Çekirdekle aynı artımlı fiyatla bu adımın tutarı (mili-₺; ayrılmış hücre taban fiyattan). */
  mili: number;
  /** Adımdaki AYRILMIŞ hücre sayısı (taban fiyat, eğriyi ilerletmez); yoksa 0. */
  ayrilmis?: number;
}

export interface YerlesimHucresi {
  id: HucreId;
  x: number;
  y: number;
  /** Hücre bu yapı için kullanılamıyorsa neden. */
  neden: string | null;
  /** Hücre zaten bu oyuncunun (alınmayacak). */
  benim: boolean;
}

export interface YerlesimPlani {
  yapi: YapiTanimi;
  hucreler: YerlesimHucresi[];
  gecerli: boolean;
  /** Geçersizse ilk neden (hücre ya da plan düzeyi). */
  neden: string | null;
  /** Aynı işlemde satın alınacak boş hücreler. */
  alinacak: HucreId[];
  /** `parsel_al` adımları (sınıf başına bir komut), sırasıyla. */
  parseller: ParselAdimi[];
  arsaMili: number;
  /** Yapı parası (mili-₺); ilk-yapı indirimi uygulanmışsa indirimli. */
  yapiMili: number;
  /** Yapı malzemesi (mili-birim); ilk-yapı indirimi uygulanmışsa indirimli. */
  malzeme: YapiMalzemesi[];
  /** İlk-yapı indirimi bu yapıya uygulanıyor mu (çekirdekle aynı: yeni oyuncunun ilk `indirimliYapiSayisi` yapısı). */
  indirimli: boolean;
  toplamMili: number;
  /** Hazine biliniyor ve toplamı karşılamıyor. */
  hazineYetmez: boolean;
}

export interface YerlesimBaglami {
  izgara: Izgara;
  sahiplik: IlceSahipligi;
  ben: OyuncuId;
  /** Sahip kimliğinden görünen ad. */
  ad: (sahip: OyuncuId) => string;
  /** Hazine (mili-₺); bilinmiyorsa null (kontrol atlanır). */
  hazineMili: number | null;
  /** Süren hücreli inşaatlarım. */
  surenInsaat: number;
  esZamanliInsaat?: number;
  /** Hücre kamu arsasındaysa Türkçe ret nedeni (satışa ve yerleşime kapalı), değilse null. */
  kamu?: (id: HucreId) => string | null;
  /** Oyuncunun bu ilçedeki ayrılmış hücre hakkı (`fiyat.ts` `ayrilmisHakki`); bilinmiyorsa var sayılır. */
  ayrilmisHakki?: AyrilmisHakki;
  /**
   * İlk-yapı indirimi (docs/06 §15.10): `ppm` = `mulk.yeniOyuncu.ilkYapiIndirimPpm`, `kalan` = oyuncunun kalan indirimli yapı hakkı
   * (`indirimliYapiKalan`). Bilinmiyorsa (tanımsız) indirim uygulanmaz. Ölçek büyütme indirimsizdir.
   */
  indirim?: { ppm: number; kalan: number };
}

/**
 * Çekirdeğin ilk-yapı indirimi: indirim tutarı S tabanından hesaplanır (`q - (q0 - ⌊q0·(1-ppm)⌋)`; S'de `⌊q·(1-ppm)⌋`), para ve malzemeye.
 * Yalnız yapı kurulumunda; ölçek yükseltmesinde indirim yoktur.
 */
export function indirimliTutar(q: number, ppm: number): number {
  return q - (q - carpBol(q, 1_000_000 - ppm, 1_000_000));
}

/** Yapı çapa hücresine (`cx`, `cy`) ve dönüşe göre yerleştirilirse ne olur? Saf; sunucuya gitmez. */
export function yerlesimPlani(yapi: YapiTanimi, cx: number, cy: number, donus: number, b: YerlesimBaglami): YerlesimPlani {
  const hucreler: YerlesimHucresi[] = [];
  const hedef = ayakIzi(yapi.yuva, donus).map(([dx, dy]) => [cx + dx, cy + dy] as const);
  // Yapıları hücreye eşle (başkasının ve kendi yapım)
  const yapili = new Set<HucreId>();
  for (const y of b.sahiplik.yapilar ?? []) for (const id of y.hucreler) yapili.add(id);
  const alinacak: HucreId[] = [];
  for (const [x, y] of hedef) {
    const id = hucreId(x, y);
    let neden: string | null = engelNedeni(durumAl(b.izgara, x, y));
    if (!neden) neden = b.kamu?.(id) ?? null;
    const sh = b.sahiplik.hucreler.get(id);
    let benim = false;
    if (!neden && sh) {
      if (sh.sahip !== b.ben) neden = `Sahibi: ${b.ad(sh.sahip)}`;
      else if (sh.tesis !== undefined || sh.insaat !== undefined || yapili.has(id)) neden = "Bu hücrede zaten yapı var";
      else benim = true;
    }
    if (!neden && !sh) {
      // Ayrılmış hücre yalnız hakkı olana satılır (taban fiyat); hakkı yoksa bu oyuncuya kapalıdır (çekirdekle aynı ret)
      const t = alimTuru(id, b.sahiplik.ayrilmis, b.ayrilmisHakki);
      if (t.tur === "yasak") neden = t.neden;
      else alinacak.push(id);
    }
    hucreler.push({ id, x, y, neden, benim });
  }
  // Satın alma adımları: sınıf başına, artımlı fiyat (önceki adımlar satılmış sayısını artırır)
  const gruplar = new Map<ArsaSinifi, HucreId[]>();
  for (const id of alinacak) {
    const c = hucreler.find((h) => h.id === id)!;
    const s = arsaSinifi(durumAl(b.izgara, c.x, c.y));
    let l = gruplar.get(s);
    if (!l) gruplar.set(s, (l = []));
    l.push(id);
  }
  const parseller: ParselAdimi[] = [];
  // Her adım sunucuda sırayla uygulanır: satılmış sayısı ve (ayrılmış alındıysa) ayrılmış-satılmış sayacı ilerler
  let satilmis = b.sahiplik.satilmis;
  let ayrilmisSatilmis = b.sahiplik.ayrilmisSatilmis ?? 0;
  for (const [sinif, liste] of [...gruplar.entries()].sort((p, q) => (["kirsal", "kasaba", "sehir"].indexOf(p[0]) - ["kirsal", "kasaba", "sehir"].indexOf(q[0])))) {
    const ayrilmis = b.sahiplik.ayrilmis ? liste.filter((h) => b.sahiplik.ayrilmis!.has(h)).length : 0;
    const mili = parselToplamFiyatiMili(sinif, { uygun: b.sahiplik.uygun, satilmis, ayrilmisSatilmis }, liste.length - ayrilmis, ayrilmis);
    parseller.push({ sinif, hucreler: liste, mili, ...(ayrilmis > 0 ? { ayrilmis } : {}) });
    satilmis += liste.length;
    ayrilmisSatilmis += ayrilmis;
  }
  const arsaMili = parseller.reduce((t, p) => t + p.mili, 0);
  const indirimli = b.indirim !== undefined && b.indirim.ppm > 0 && b.indirim.kalan > 0;
  const yapiMili = indirimli ? indirimliTutar(yapi.paraMili, b.indirim!.ppm) : yapi.paraMili;
  const malzeme = indirimli ? yapi.malzeme.map((m) => ({ ...m, miktar: indirimliTutar(m.miktar, b.indirim!.ppm) })) : yapi.malzeme;
  const toplamMili = arsaMili + yapiMili;
  let neden = hucreler.find((h) => h.neden)?.neden ?? null;
  if (!neden && alinacak.length > 0) {
    let benimSayi = 0;
    for (const h of b.sahiplik.hucreler.values()) if (h.sahip === b.ben) benimSayi++;
    const sd = sinirDenetle({ uygun: b.sahiplik.uygun, satilmis: b.sahiplik.satilmis, benim: benimSayi }, alinacak.length);
    if (sd.hucreAsimi) neden = `İlçede en çok ${ILCE_HUCRE_SINIRI} hücren olabilir`;
    else if (sd.payAsimi) neden = `İlçenin en çok %${Math.round(ILCE_PAY_SINIRI * 100)}'i senin olabilir (${fmt(sd.tavan)} hücre)`;
  }
  const esz = b.esZamanliInsaat ?? 2;
  if (!neden && b.surenInsaat >= esz) neden = `Aynı anda en çok ${esz} inşaat sürebilir`;
  const hazineYetmez = b.hazineMili !== null && toplamMili > b.hazineMili;
  if (!neden && hazineYetmez) neden = `Hazinede yeterli para yok (gereken ${paraMili(toplamMili, "yukari")})`;
  return { yapi, hucreler, gecerli: neden === null, neden, alinacak, parseller, arsaMili, yapiMili, malzeme, indirimli, toplamMili, hazineYetmez };
}

/** Yapı kartındaki malzeme satırı: "Çelik 30 · Makine Parçası 10" (mili-birim → birim). */
export function malzemeMetni(y: Pick<YapiTanimi, "malzeme">): string {
  return y.malzeme.map((m) => `${m.ad} ${fmt(m.miktar / 1000)}`).join(" · ");
}

export const ASAMA_ADI = ["Temel", "İskele", "Gövde", "Tamam"] as const;

/** İnşaat aşaması (çekirdek `insaatAsamasi` ile aynı: sürenin üçte birlik dilimleri). Başlangıç bilinmiyorsa tahmini süre kullanılır. */
export function yapiAsamasi(y: Pick<YapiKaydi, "durum" | "baslangic" | "bitis">, simdi: number, tahminiSureMs: number): 0 | 1 | 2 | 3 {
  if (y.durum === "tesis") return 3;
  const bit = y.bitis;
  if (bit === undefined) return 1;
  if (simdi >= bit) return 3;
  const bas = y.baslangic ?? bit - tahminiSureMs;
  if (bit <= bas || simdi <= bas) return 0;
  const a = Math.floor(((simdi - bas) * 3) / (bit - bas));
  return (a >= 2 ? 2 : a) as 0 | 1 | 2;
}
