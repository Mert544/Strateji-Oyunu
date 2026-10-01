/**
 * G6-4 kanıt testlerinin ortak yardımcıları (docs/arastirma/p4-p5-sartname.md §13, §16.1; yalnız test: çekirdek kaynağına dokunmaz).
 *
 * Testler T3'ün gerçek JSON verisine (G6-3) bağlı DEĞİLDİR: `g6Veri` eksik parçaları (4 yeni yöntem, `mulk.sebeke`, `mulk.yontemGecersizKilma`)
 * kendi veri kopyasına ekler; veri paketinde zaten varsa dokunmaz. Böylece kanıtlar G6-2 (çekirdek) anında da, G6-3 (gerçek veri) sonrasında da
 * aynı kodla koşar. Yöntem sayıları burada SENTETİKTİR (A2 değerleri değil): testler yalnız ilişkileri (eşitlik, korunum, sıra) sınar.
 */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { ParselFiksturu, VeriPaketi } from "@bolge/veri";
import { readFileSync } from "node:fs";
import { expect } from "vitest";
import { botOlustur } from "../../botlar/src/api";
import type { ArketipAdi, Bot } from "../../botlar/src/api";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { paraUzlastir } from "../src/mulk/kasa";
import { sayacOlcekli } from "../src/paraSayac";
import { aralik, prngOlustur } from "../src/prng";
import { SAAT } from "../src/tipler";
import type { BolgeDurumu, CekirdekVeriPaketi, DamgaliKomut, Komut, Ms, ParaDurumu, TesisDurumu } from "../src/tipler";
import { mulkSim, mulkVeriTam, tamam } from "./mulk-yardimci";
import { bulanikKomut, devletBolgeleri, DORT_BOT } from "./serilestir-yardimci";

/** Şartname §3.2 sırası (G6): ev sahibi `gida_fabrikasi` (ilk ikisi) ve `ahir` (son ikisi). */
export const G6_YONTEMLER = ["degirmen", "ekmek_firini", "kepek_gubresi", "sut_kepekli"] as const;

interface SentetikYontem {
  id: string;
  ad: string;
  girdiler: Record<string, number>;
  ciktilar: Record<string, number>;
  isci: number;
  bakim: Record<string, number>;
  mulkKipi: true;
  ev: "gida_fabrikasi" | "ahir";
}

/** Sentetik değerler (mili-birim/saat; S ölçek, tam verim). Elektrik girdisi korunur (şartname §4.4: "Y" varyantı yok). */
const SENTETIK: SentetikYontem[] = [
  { id: "degirmen", ad: "Degirmen Atolyesi", girdiler: { tahil: 200_000, elektrik: 12_000 }, ciktilar: { un: 165_000, kepek: 30_000 }, isci: 6_000, bakim: { parca: 800 }, mulkKipi: true, ev: "gida_fabrikasi" },
  { id: "ekmek_firini", ad: "Ekmek Firini", girdiler: { un: 165_000, yakit: 8_000, elektrik: 10_000 }, ciktilar: { ekmek: 240_000 }, isci: 6_000, bakim: { parca: 800 }, mulkKipi: true, ev: "gida_fabrikasi" },
  { id: "kepek_gubresi", ad: "Kepek Gubresi", girdiler: { kepek: 60_000, elektrik: 6_000 }, ciktilar: { gubre: 30_000 }, isci: 4_000, bakim: { parca: 500 }, mulkKipi: true, ev: "ahir" },
  { id: "sut_kepekli", ad: "Kepekli Sut", girdiler: { tahil: 50_000, kepek: 30_000, elektrik: 8_000 }, ciktilar: { sut: 60_000, gubre: 10_000 }, isci: 4_000, bakim: { parca: 500 }, mulkKipi: true, ev: "ahir" },
];

export interface G6Secenek {
  /** false: yöntemlerde `mulkKipi` bayrağı YOK (karşıt kanıt: süzgeç bayrağa bağlıdır). Varsayılan true. */
  bayrak?: boolean;
  /** false: `mulk.sebeke` bloğu eklenmez. Varsayılan true. */
  sebeke?: boolean;
  /** false: `mulk.yontemGecersizKilma` eklenmez. Varsayılan true. */
  kilma?: boolean;
}

/** Şartname §4.7 değerleri (A2 §1.3-B1; T3'ün yazacağı): elektrik ve yakıt, tavan oranı 1 000 000, kasa payı %12. */
export const SEBEKE_VARSAYILAN = {
  surum: 1,
  mallar: [
    { mal: "elektrik", tavanOraniPpm: 1_000_000 },
    { mal: "yakit", tavanOraniPpm: 1_000_000 },
  ],
  kasaPayiPpm: 120_000,
} as const;

type Gevsek = Record<string, unknown>;

/** `param.mulk` (K3 G6-1 tipleri gelmeden de derlenir). */
export function mulkParam(v: { param: unknown }): Gevsek | undefined {
  return (v.param as { mulk?: Gevsek }).mulk;
}

/**
 * Veri paketini "güncel" (G6 sonrası) hale getirir: eksik parçalar sentetik eklenir (yeni kopya). Yöntemler `icerik.yontemler` SONUNA
 * (indeks kayması yok), ev sahibi tür listelerinin SONUNA eklenir.
 */
export function g6Veri<V extends VeriPaketi>(v: V, sec: G6Secenek = {}): V {
  const c = structuredClone(v);
  const ic = c.icerik;
  for (const y of SENTETIK) {
    if (ic.yontemler.some((x) => x.id === y.id)) continue;
    const { ev, mulkKipi, ...govde } = y;
    ic.yontemler.push((sec.bayrak === false ? { ...govde } : { ...govde, mulkKipi }) as never); // `mulkKipi` tipi G6-1'de gelir
    const tur = ic.tesisTurleri.find((t) => t.id === ev);
    if (tur === undefined) throw new Error(`ev sahibi tur yok: ${ev}`);
    tur.yontemler.push(y.id);
  }
  // Seçenekler veride parça ZATEN VARSA da uygulanır (gerçek G6-3 içeriği bayraklı yöntemler, `mulk.sebeke` ve `mulk.yontemGecersizKilma` taşır): `false` = o parça yok.
  if (sec.bayrak === false) for (const y of ic.yontemler) if ((G6_YONTEMLER as readonly string[]).includes(y.id)) delete (y as { mulkKipi?: true }).mulkKipi;
  const m = mulkParam(c);
  if (m !== undefined) {
    if (sec.sebeke === false) delete m["sebeke"];
    else if (m["sebeke"] === undefined) m["sebeke"] = structuredClone(SEBEKE_VARSAYILAN);
    if (sec.kilma === false) delete m["yontemGecersizKilma"];
    else if (m["yontemGecersizKilma"] === undefined) m["yontemGecersizKilma"] = { standart_gida_isleme: { ciktiPpm: 1_000_000 } };
  }
  return c;
}

/**
 * P4 (G6) ÖNCESİ içerik: `mulkKipi` yöntemleri, tür listelerinden de çıkarılır; `mulk.sebeke`, `mulk.yontemGecersizKilma`, `mulk.perakende` ve
 * `ekYapilar.dukkan` silinir (başka hiçbir değişiklik yapılmaz). Kimlik listesi eklenmez (dondurulmuş eski paket).
 * `mal-izdusumu-kanit.test.ts` `p3Oncesi` kalıbı.
 */
export function p4Oncesi<V extends VeriPaketi>(v: V): V {
  const c = structuredClone(v) as V & { kimlikListesi?: unknown };
  delete c.kimlikListesi;
  const yontemler = c.icerik.yontemler;
  const mulkOnly = yontemler.filter((y) => (y as { mulkKipi?: true }).mulkKipi === true).map((y) => y.id);
  const ilkMulkOnly = yontemler.findIndex((y) => mulkOnly.includes(y.id));
  // Yeni yöntemler SONA eklenmiştir (indeks kayması yok): bayraklı yöntemler listenin son kuyruğudur.
  if (ilkMulkOnly >= 0) expect(yontemler.slice(ilkMulkOnly).every((y) => mulkOnly.includes(y.id))).toBe(true);
  c.icerik.yontemler = yontemler.filter((y) => !mulkOnly.includes(y.id));
  for (const t of c.icerik.tesisTurleri) t.yontemler = t.yontemler.filter((y) => !mulkOnly.includes(y));
  const m = mulkParam(c);
  if (m !== undefined) {
    delete m["sebeke"];
    delete m["yontemGecersizKilma"];
    delete m["perakende"];
    delete m["bakim"]; // G7-4: mülk bakımı (C) değerleri G6 sonrasıdır
    const yo = m["yeniOyuncu"] as { baslangicStok?: Record<string, number> } | undefined;
    if (yo?.baslangicStok !== undefined) delete yo.baslangicStok["pencere"]; // G7-4: dükkân bedeli için kit pencere (yeni mal)
    const ek = m["ekYapilar"] as Gevsek | undefined;
    if (ek !== undefined) delete ek["dukkan"];
    const atolye = (ek?.["atolye_lab"] as { ad?: string } | undefined);
    if (atolye !== undefined) atolye.ad = ESKI_ADLAR.parametreler["mulk.ekYapilar.atolye_lab.ad"];
  }
  // icerik-adlar (T3 ad-degisim 1-3) ÖNCESİ görünen adlar: kural sürümü (içerik özeti adı da kapsar) dondurulmuş P4 öncesi görüntüyle aynı kalsın.
  const icerik = c.icerik as unknown as Record<string, { id: string; ad?: string; aciklama?: string }[]>;
  for (const [koleksiyon, kayitlar] of Object.entries(ESKI_ADLAR.icerik)) {
    for (const k of icerik[koleksiyon] ?? []) Object.assign(k, kayitlar[k.id] ?? {});
  }
  return c;
}

const ESKI_ADLAR = JSON.parse(readFileSync(new URL("./g6-eski-adlar.json", import.meta.url), "utf8")) as { icerik: Record<string, Record<string, { ad?: string; aciklama?: string }>>; parametreler: Record<string, string> };

/**
 * `senaryoKos`un (serilestir-yardimci.ts) bire bir kopyası, tek farkla: bulanık komutlar HER İKİ dünya için aynı (`bulanikVeri`) içerikten
 * üretilir. Orijinalde `bulanikKomut(r, s.veri, ...)` içerik listelerinin UZUNLUĞUNA bağlıdır (`sec(r, veri.icerik.yontemler)`): yeni yöntemli
 * dünyada aynı tohum başka komut üretir ve karşılaştırma içeriği değil komut akışını ölçerdi.
 */
export function ortakKomutluKos(o: {
  veri: VeriPaketi;
  bulanikVeri: VeriPaketi;
  tohum: number;
  sureMs: Ms;
  kararAraligiMs?: Ms;
  bulanikAdet?: number;
  /**
   * Duyarlılık için SABİT enjekte komutlar: `adim`. karar anında (bot ve bulanık komutlardan önce) uygulanır. Komut sim durumundan kurulur
   * (ör. tesis kimliği) ve iki dünyada aynı olmalıdır; iki dünya aynı komutu alır, yalnız içerik farklıdır.
   */
  ekKomut?: { adim: number; oyuncu: string; komut: (s: Simulasyon) => Komut }[];
}): Simulasyon {
  const aralikMs = o.kararAraligiMs ?? 6 * SAAT;
  const bulanikAdet = o.bulanikAdet ?? 4;
  const sim = Simulasyon.olustur(o.veri, o.tohum);
  const devletler = devletBolgeleri(o.veri);
  const oyuncular = devletler.map((_, i) => `o${i}`);
  const botlar: Bot[] = oyuncular.map((id, i) => botOlustur(DORT_BOT[i % 4] as ArketipAdi, id, o.tohum + i));
  const r = prngOlustur(o.tohum, "bulanik-test");
  const uygula = (k: DamgaliKomut): void => void sim.uygula(k);
  devletler.forEach((d, i) => uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: oyuncular[i] as string, bolgeler: d.bolgeler } }));
  uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "o0", bolgeler: ["yok_bolge"] } });
  const sec = <T>(dizi: readonly T[]): T => dizi[aralik(r, dizi.length)] as T;
  for (let t = 0; t < o.sureMs; t += aralikMs) {
    sim.calistirKadar(Math.max(t, sim.dunya.zaman));
    const tk = sim.dunya.zaman;
    for (const e of o.ekKomut ?? []) if (e.adim === Math.floor(t / aralikMs)) uygula({ t: tk, oyuncu: e.oyuncu, komut: e.komut(sim) });
    const n = botlar.length;
    const kayma = n > 0 ? Math.floor(t / aralikMs) % n : 0;
    for (let j = 0; j < n; j++) {
      const bot = botlar[(j + kayma) % n] as Bot;
      for (const komut of bot.karar(sim)) uygula({ t: tk, oyuncu: bot.oyuncu, komut });
    }
    const zamanlar = Array.from({ length: bulanikAdet }, () => tk + aralik(r, aralikMs)).sort((a, b) => a - b);
    for (const zt of zamanlar) {
      if (zt >= o.sureMs) break;
      const oyuncu = aralik(r, 15) === 0 ? sec([SISTEM_OYUNCUSU, "yabanci"]) : sec(oyuncular);
      uygula({ t: zt, oyuncu, komut: bulanikKomut(r, o.bulanikVeri, oyuncular, oyuncu) });
    }
  }
  sim.calistirKadar(o.sureMs);
  return sim;
}

// ---------------------------------------------------------------------------
// Mülk kipi
// ---------------------------------------------------------------------------

export const G6_IL = "sn_m_ova";
export const G6_ILCE = "sn_m_ova_merkez";

/** Mülk kipi: bol hibeli, indirimsiz, ayrılmış hücresiz oyuncu paketi; temel stok zincir testleri için yeterli. */
export function g6MulkVeri(sec: G6Secenek = {}, duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  const ham = mulkVeriTam((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 2_000_000_000;
    // depo kapasitesi 10 000 000 mili: tahıl/un ~50 saat yeter (200 000/sa); uzun koşular `ithalat` ile beslenir
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, tahil: 10_000_000, un: 10_000_000, komur: 10_000_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.yeniOyuncu.kalkanGun = 0;
    m.esZamanliInsaat = 10;
  });
  const v = g6Veri(ham, sec);
  duzenle?.(v);
  return v;
}


// ---------------------------------------------------------------------------
// Para korunumu (şebeke kalemleri dahil)
// ---------------------------------------------------------------------------

export interface G6Korunum {
  hazine: bigint;
  kasa: bigint;
  lavabo: bigint;
  musluk: bigint;
  /** Şebeke kalemleri (yoksa 0n; yanan ve kasa girişi ayrı). */
  lavaboSebeke: bigint;
  kasaSebeke: bigint;
}

/**
 * `para-guvenligi.test.ts` `korunumOlc` ile aynı, fakat kalem listeleri SABİT dizilerden değil nesnenin anahtarlarından okunur: isteğe bağlı
 * kalemler (`musluk.yerelNpc`, `lavabo.sebeke`, `kasa.giris.sebeke`) otomatik toplanır (unutulan kalem korunumu bozar: şartname §5.2.5, §12.1).
 */
export function g6KorunumOlc(s: Simulasyon): G6Korunum {
  const d = s.dunya;
  paraUzlastir(d, s.ic);
  const p = d.mulk!.para as ParaDurumu;
  let hazine = 0n;
  for (const o of d.oyuncular) {
    expect(o.hazine.t0).toBe(d.zaman);
    hazine += BigInt(o.hazine.miktar) * BigInt(SAAT) + BigInt(o.hazine.artik);
  }
  let kasa = 0n;
  let kasaSebeke = 0n;
  for (const k of p.kasalar) {
    for (const kalem of Object.keys(k.giris)) {
      const x = sayacOlcekli((k.giris as Record<string, { n: number; a: number }>)[kalem]!);
      kasa += x;
      if (kalem === "sebeke") kasaSebeke += x;
    }
    kasa -= BigInt(k.cikisOyuncu + k.cikisNpc) * BigInt(SAAT);
  }
  let lavabo = 0n;
  let lavaboSebeke = 0n;
  for (const kalem of Object.keys(p.lavabo)) {
    const x = sayacOlcekli((p.lavabo as Record<string, { n: number; a: number }>)[kalem]!);
    lavabo += x;
    if (kalem === "sebeke") lavaboSebeke += x;
  }
  let musluk = 0n;
  for (const kalem of Object.keys(p.musluk)) musluk += sayacOlcekli((p.musluk as Record<string, { n: number; a: number }>)[kalem]!);
  return { hazine, kasa, lavabo, musluk, lavaboSebeke, kasaSebeke };
}

/** Σ hazine + Σ kasa + Σ lavabo = Σ musluk (SAAT ölçekli tamsayı, tam). */
export function g6KorunumTutar(s: Simulasyon, nerede: string): G6Korunum {
  const k = g6KorunumOlc(s);
  if (k.hazine + k.kasa + k.lavabo !== k.musluk) {
    throw new Error(`para korunumu bozuldu (${nerede}, t=${s.dunya.zaman}): hazine ${k.hazine} + kasa ${k.kasa} + lavabo ${k.lavabo} = ${k.hazine + k.kasa + k.lavabo} != musluk ${k.musluk}`);
  }
  return k;
}

/** Bölge kipinde mini-6 (4 bot + bulanık komut senaryosunun içerik kaynağı). */
export function mini(): VeriPaketi {
  return miniVeriyiYukle();
}

// ---------------------------------------------------------------------------
// Mülk dünyası kısa yolları: yapı yerleştirme ve düğüm okuma
// ---------------------------------------------------------------------------

const FIKSTUR: ParselFiksturu = parselFiksturuYukle("mini-6");

/** Tür başına kapladığı hücre sayısı (S; `param.mulk.yapiYuva`, doğrulandı: parametreler.json). */
const YUVA: Record<string, number> = { ciftlik: 2, ahir: 2, gida_fabrikasi: 2, parca_fabrikasi: 2, santral: 3, hidro_santrali: 3, komur_ocagi: 2 };

/** İlçenin hücrelerinden (sınıf sırası: kırsal, kasaba, şehir), `kullanilan` dışında, yatayda ardışık `adet` hücrelik ilk grup. */
function bosGrup(ilce: string, adet: number, kullanilan: ReadonlySet<string>): { hucreler: string[]; sinif: "kirsal" | "kasaba" | "sehir" } {
  const c = FIKSTUR.ilceler.find((x) => x.id === ilce);
  if (!c) throw new Error(`fiksturde ilce yok: ${ilce}`);
  for (const sinif of ["kirsal", "kasaba", "sehir"] as const) {
    const uygun = new Set(c.hucreler.filter((h) => h.uygun && h.sinif === sinif).map((h) => h.id));
    for (const h of c.hucreler) {
      if (!uygun.has(h.id)) continue;
      const [x, y] = h.id.split(":").map(Number) as [number, number];
      const grup = Array.from({ length: adet }, (_, i) => `${x + i}:${y}`);
      if (grup.every((g) => uygun.has(g) && !kullanilan.has(g))) return { hucreler: grup, sinif };
    }
  }
  throw new Error(`ilcede bos ${adet} hucrelik grup yok: ${ilce}`);
}

/** Oyuncu için yapı yerleştirme durumu (hangi hücreler kullanıldı). */
const KULLANILAN = new WeakMap<Simulasyon, Set<string>>();

export class G6Yerlestirici {
  /** Simülasyon başına ortak: iki oyuncu aynı hücreleri seçmesin. */
  private readonly kullanilan: Set<string>;
  constructor(
    readonly s: Simulasyon,
    readonly oyuncu: string,
  ) {
    this.kullanilan = KULLANILAN.get(s) ?? new Set<string>();
    KULLANILAN.set(s, this.kullanilan);
  }

  /** Oyuncunun yurt ilçesi (ilk sahip olduğu hücrenin ilçesi): işletme düğümü ve başlangıç stoğu orada doğar. */
  get ilce(): string {
    const h = this.s.dunya.mulk!.hucreler.find((x) => x.sahip === this.oyuncu);
    if (h === undefined) throw new Error(`yurt yok: ${this.oyuncu}`);
    return h.ilce;
  }

  /** `yapi_yerlestir` ile (atomik; sahipsiz hücreler satın alınır) tesis türü kurar; `yontem` verilirse inşa komutundaki `yontem?` alanı (§5.8). */
  yerlestir(tur: string, yontem?: string): void {
    const { hucreler, sinif } = bosGrup(this.ilce, YUVA[tur] ?? 2, this.kullanilan);
    for (const h of hucreler) this.kullanilan.add(h);
    const komut = { tur: "yapi_yerlestir", ilce: this.ilce, tesisTuru: tur, hucreler, sinif, ...(yontem === undefined ? {} : { yontem }) };
    tamam(this.s, this.oyuncu, komut as unknown as Komut);
  }
}

/** Oyuncunun işletme düğümü (yurt ilçesinin ili; tek işletme varsayılır). */
export function g6Dugum(s: Simulasyon, oyuncu: string): BolgeDurumu {
  const il = s.dunya.mulk!.isletmeler.find((e) => e.oyuncu === oyuncu);
  if (il === undefined) throw new Error(`isletme yok: ${oyuncu}`);
  return s.dunya.bolgeler[il.bolgeIndeksi] as BolgeDurumu;
}

/** Oyuncunun işletme düğümü kimliği (ticaret emri `bolge` alanı). */
export function g6Bolge(s: Simulasyon, oyuncu: string): string {
  return g6Dugum(s, oyuncu).id;
}

/** Düğümde `yontem` kimlikli ilk tesis (yoksa hata). */
export function g6Tesis(s: Simulasyon, oyuncu: string, yontem: string): TesisDurumu {
  const b = g6Dugum(s, oyuncu);
  const t = b.tesisler.find((x) => s.ic.yontemler[x.yontem]!.id === yontem);
  if (t === undefined) throw new Error(`tesis yok: ${yontem} (${b.tesisler.map((x) => s.ic.yontemler[x.yontem]!.id).join(",")})`);
  return t;
}

/**
 * Mülk dünyası: `oyuncular` katılır, `kur` verilirse her biri için çağrılır ve `bekleMs` (varsayılan 24 saat; gida 6 sa, santral 8 sa inşa) beklenir. `veri` varsayılan: `g6MulkVeri()`.
 */
export function g6Dunya(opts: { oyuncular?: string[]; veri?: CekirdekVeriPaketi; tohum?: number; kur?: (y: G6Yerlestirici, oyuncu: string) => void; bekleMs?: Ms; ithalat?: { mal: string; oranSaat: number }[] } = {}): Simulasyon {
  const oyuncular = opts.oyuncular ?? ["a"];
  const s = mulkSim(oyuncular, opts.veri ?? g6MulkVeri(), opts.tohum ?? 7);
  for (const o of oyuncular) opts.kur?.(new G6Yerlestirici(s, o), o);
  // Girdi ithalatı (isteğe bağlı): her oyuncunun düğümüne kalıcı emir; stoksuz girdi (şebeke) için KULLANILMAZ.
  for (const o of oyuncular) for (const e of opts.ithalat ?? []) tamam(s, o, { tur: "ticaret_emri", bolge: g6Bolge(s, o), mal: e.mal, yon: "ithalat", oranSaat: e.oranSaat });
  s.calistirKadar(s.dunya.zaman + (opts.bekleMs ?? 24 * 3_600_000));
  return s;
}

// ---------------------------------------------------------------------------
// Mülk kipi tohumlu koşu (K-3, K-5): komut akışı VERİDEN BAĞIMSIZDIR
// ---------------------------------------------------------------------------

/**
 * Tohumlu rastgele mülk koşusu; her kontrol noktasında tam `durumOzeti` döner. Komut akışı yalnız sabit listelerden üretilir (G6 yöntemleri ve
 * `yontem` alanı KULLANILMAZ), bu yüzden aynı tohum her veri kopyasında (yeni yöntemli, blok eklenmiş/eklenmemiş) aynı komutları üretir:
 * fark yalnız veriden gelebilir.
 *
 * Oyuncular: a (santralsiz; gida_fabrikasi), b (santral + gida_fabrikasi), c (gida_fabrikasi). Şebeke KAPALI veride santralsiz tesis verim 0'dır;
 * karşılaştırma bunu da kapsar.
 */
export function g6MulkKosusu(veri: CekirdekVeriPaketi, tohum: number, adim: number, noktaSayisi = 12): string[] {
  const oyuncular = ["a", "b", "c"];
  const s = mulkSim(oyuncular, veri, tohum);
  const ya = new G6Yerlestirici(s, "a");
  ya.yerlestir("gida_fabrikasi");
  const yb = new G6Yerlestirici(s, "b");
  yb.yerlestir("santral");
  yb.yerlestir("gida_fabrikasi");
  new G6Yerlestirici(s, "c").yerlestir("gida_fabrikasi");
  const rng = prngOlustur(tohum, "g6-mulk-kosu");
  const mallar = ["tahil", "gida", "celik", "parca", "komur"];
  const ozetler: string[] = [];
  let sonraki = 0;
  for (let i = 0; i < adim; i++) {
    s.calistirKadar(s.dunya.zaman + (aralik(rng, 90) + 1) * 60_000);
    const o = oyuncular[aralik(rng, oyuncular.length)] as string;
    const secim = aralik(rng, 6);
    const dugum = s.dunya.mulk!.isletmeler.find((e) => e.oyuncu === o);
    const bolge = dugum === undefined ? "yok" : (s.dunya.bolgeler[dugum.bolgeIndeksi] as BolgeDurumu).id;
    if (secim <= 2) {
      const m = mallar[aralik(rng, mallar.length)] as string;
      const yon = aralik(rng, 2) === 0 ? "ithalat" : "ihracat";
      const oranSaat = aralik(rng, 4) === 0 ? 0 : (1 + aralik(rng, 40)) * 1000;
      s.uygula({ t: s.dunya.zaman, oyuncu: o, komut: { tur: "ticaret_emri", bolge, mal: m, yon, oranSaat } });
    } else if (secim === 3 && dugum !== undefined) {
      const b = s.dunya.bolgeler[dugum.bolgeIndeksi] as BolgeDurumu;
      const t = b.tesisler[aralik(rng, Math.max(1, b.tesisler.length))];
      if (t !== undefined) s.uygula({ t: s.dunya.zaman, oyuncu: o, komut: { tur: "tesis_durum", bolge, tesis: t.id, aktif: aralik(rng, 3) !== 0 } });
    } else {
      const tk = s.ic.icerik.teknolojiler[aralik(rng, s.ic.icerik.teknolojiler.length)];
      if (tk !== undefined) s.uygula({ t: s.dunya.zaman, oyuncu: o, komut: { tur: "arastir", teknoloji: tk.id } });
    }
    if (i + 1 >= Math.floor((adim * (sonraki + 1)) / noktaSayisi) && ozetler.length < noktaSayisi) {
      ozetler.push(s.durumOzeti());
      sonraki++;
    }
  }
  return ozetler;
}

/** `BolgeElektrikDurumu.sebekeMili` (tip G6-2'de gelir; yoksa undefined). */
export function sebekeMiliOku(b: BolgeDurumu): number | undefined {
  return (b.elektrik as { sebekeMili?: number } | undefined)?.sebekeMili;
}
