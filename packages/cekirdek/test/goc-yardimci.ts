/**
 * Kalıcı kimlik / içerik göçü testlerinin ortak yardımcıları (G8): içeriğe kimlik ekleyen/çıkaran dönüşümler, zengin dünya
 * senaryosu ve dünyanın KİMLİK anahtarlı görünümü (indeks sırasından bağımsız karşılaştırma için).
 *
 * `kimlikliGorunum` bilerek göç kodundan BAĞIMSIZ yazılmıştır (aynı alan listesinin ikinci, elle yazılmış kopyası): göç bir alanı
 * kaçırırsa iki taraf ayrışır.
 */
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import type { IcerikKimlikTablosu } from "../src/goc";
import { GUN } from "../src/tipler";
import type { DerlenmisIcerik, Dunya } from "../src/tipler";

export type Veri = VeriPaketi;

/** Yeni kimlikler (her indeks uzayında iki tane): geç eklenen mal, yöntem, tesis türü, teknoloji, birlik, tarım ürünü. */
const YENI = {
  mallar: [
    { id: "titanyum", ad: "Titanyum", kategori: "ara" as const, tabanFiyat: 45_000, lojistikOnceligi: 9, bozulmaPpmGun: 0 },
    { id: "lityum", ad: "Lityum", kategori: "ara" as const, tabanFiyat: 60_000, lojistikOnceligi: 9, bozulmaPpmGun: 0 },
  ],
  yontemler: [
    { id: "titan_isleme_yontemi", ad: "Titanyum İşleme", girdiler: {}, ciktilar: { titanyum: 20_000 }, isci: 5_000, bakim: { parca: 200 } },
    { id: "lityum_yontemi", ad: "Lityum Üretimi", girdiler: {}, ciktilar: { lityum: 10_000 }, isci: 4_000, bakim: { parca: 100 } },
  ],
  tesisTurleri: [
    { id: "titan_tesisi", ad: "Titanyum Tesisi", insaMaliyeti: { celik: 1_000 }, insaParasi: 1_000_000, insaSuresiSaat: 2, yontemler: ["titan_isleme_yontemi"] },
    { id: "lityum_tesisi", ad: "Lityum Tesisi", insaMaliyeti: { celik: 1_000 }, insaParasi: 1_000_000, insaSuresiSaat: 2, yontemler: ["lityum_yontemi"] },
  ],
  teknolojiler: [
    { id: "titan_bilimi", ad: "Titanyum Bilimi", aciklama: "Test.", maliyet: 1_000_000, sureGun: 1, onKosullar: [] as string[], acar: {} },
    { id: "lityum_bilimi", ad: "Lityum Bilimi", aciklama: "Test.", maliyet: 1_000_000, sureGun: 1, onKosullar: [] as string[], acar: {} },
  ],
  birlikler: [
    { id: "komando", ad: "Komando", maliyet: { celik: 1_000 }, partiSuresiSaat: 6, guc: 50, ikmal: { gida: 100 } },
    { id: "denizci", ad: "Denizci", maliyet: { celik: 1_000 }, partiSuresiSaat: 6, guc: 40, ikmal: { gida: 100 } },
  ],
  tarimUrunleri: [
    { id: "soya", ad: "Soya", ciktiPpm: 800_000, toprakDegisimPpmGun: 0, olayDuyarliligiPpm: 500_000 },
    { id: "pamuk", ad: "Pamuk", ciktiPpm: 700_000, toprakDegisimPpmGun: -1_000, olayDuyarliligiPpm: 400_000 },
  ],
} as const;

/** Araya ekleme konumları (her uzayda ilk yeni kimlik bu indekse, ikincisi bir sonrakine girer). */
const ARAYA_KONUM = { mallar: 3, yontemler: 5, tesisTurleri: 2, teknolojiler: 0, birlikler: 0, tarimUrunleri: 1 } as const;

type IcerikAdi = keyof typeof YENI;

/** İçeriğe kimlik ekler: "sona" = her listenin sonuna; "araya" = listelerin ortasına/başına (mevcut kimlikler kayar). Yeni kopya döndürür. */
export function icerikGenislet(v: Veri, kip: "sona" | "araya"): Veri {
  const c = structuredClone(v);
  for (const ad of Object.keys(YENI) as IcerikAdi[]) {
    const liste = (c.icerik as unknown as Record<string, unknown[]>)[ad] as unknown[];
    const yeniler = structuredClone(YENI[ad]) as unknown as unknown[];
    if (kip === "sona") liste.push(...yeniler);
    else liste.splice(ARAYA_KONUM[ad], 0, ...yeniler);
  }
  return c;
}

/** Yeni kimlikler (testler beklenen `eklenen` listesini bundan kurar). */
export function yeniKimlikler(): IcerikKimlikTablosu {
  const t = {} as IcerikKimlikTablosu;
  for (const ad of Object.keys(YENI) as IcerikAdi[]) t[ad] = YENI[ad].map((x) => x.id);
  return t;
}

/** İçerikten bir kimliği çıkarır (yalnız-ekle ihlali: kaldırma). */
export function icerikdenCikar(v: Veri, uzay: IcerikAdi, kimlik: string): Veri {
  const c = structuredClone(v);
  const liste = (c.icerik as unknown as Record<string, { id: string }[]>)[uzay] as { id: string }[];
  const i = liste.findIndex((x) => x.id === kimlik);
  if (i < 0) throw new Error(`icerikdenCikar: ${uzay} icinde ${kimlik} yok`);
  liste.splice(i, 1);
  return c;
}

/**
 * Zengin dünya (mini-6, tüm katmanlar açık): iki oyuncu, bitmiş bir savaş (sonuçlu), süren inşaat, süren üretim partisi,
 * süren araştırma + açılmış teknoloji, ticaret emri, kuyrukta çeşitli olaylar. `sonra` ms ek koşu.
 */
export function zenginDunya(tohum = 11): Simulasyon {
  const s = Simulasyon.olustur(miniVeriyiYukle(), tohum);
  const sis = (komut: Parameters<Simulasyon["uygula"]>[0]["komut"]): void => {
    s.uygula({ t: s.dunya.zaman, oyuncu: "sistem", komut });
  };
  sis({ tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_dag", "m_sehir"] });
  sis({ tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_liman", "m_col"] });
  for (const o of s.dunya.oyuncular) {
    o.korumaBitis = 0;
    o.hazine.miktar = 50_000_000_000;
  }
  // İnşaat ve üretim için malzeme (anlık stok = miktar; oran 0 başlar).
  for (const b of s.dunya.bolgeler) for (const mal of ["celik", "parca", "gida", "muhimmat"]) b.stoklar[s.ic.malIndeks[mal] as number]!.miktar = 5_000_000_000;
  const ver = (t: number, oyuncu: string, komut: Parameters<Simulasyon["uygula"]>[0]["komut"]): void => {
    s.calistirKadar(Math.max(t, s.dunya.zaman));
    const r = s.uygula({ t: Math.max(t, s.dunya.zaman), oyuncu, komut });
    if (!r.tamam) throw new Error(`zenginDunya: ${komut.tur} basarisiz: ${r.hata}`);
  };
  const piyade = s.ic.birlikIndeks["piyade_tumeni"] as number;
  const ova = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!;
  const liman = s.dunya.bolgeler[s.ic.bolgeIndeks["m_liman"] as number]!;
  ova.birlikler[piyade] = 5;
  liman.birlikler[piyade] = 3;
  ver(1, "b", { tur: "arastir", teknoloji: "mekanize_tarim" });
  ver(2, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "gida_fabrikasi" });
  ver(GUN, "a", { tur: "savas_ilan", saldiranBolge: "m_ova", hedefBolge: "m_liman" });
  s.calistirKadar(GUN + 4 * GUN);
  // Savaş bitti; b'nin teknolojisi açıldı. Şimdi yeni süren işler: inşaat, parti, araştırma, ticaret emri.
  const t = s.dunya.zaman;
  ver(t, "a", { tur: "tesis_insa", bolge: "m_sehir", tesisTuru: "ciftlik" });
  ver(t, "a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 2 });
  ver(t, "a", { tur: "arastir", teknoloji: "mekanize_tarim" });
  ver(t, "b", { tur: "ticaret_emri", bolge: "m_liman", mal: "tahil", yon: "ihracat", oranSaat: 20_000 });
  s.calistirKadar(t + 7_000_000);
  return s;
}

type Ham = Record<string, unknown>;

/**
 * Dünyanın kimlik anahtarlı görünümü: içerik indeksli her alan, yalnız `kume`deki kimlikler için kimliğe göre sözlüğe çevrilir
 * (yeni eklenen kimlikler dışarıda kalır; böylece eski dünya ile göçmüş dünya karşılaştırılabilir). Göçle meşru değişen alanlar
 * (lojistik kirli bayrağı, "cozum" olayları, olay sayacı) karşılaştırmaya girmez.
 */
export function kimlikliGorunum(d: Dunya, ic: DerlenmisIcerik, kume: IcerikKimlikTablosu): unknown {
  const c = structuredClone(d) as unknown as Ham;
  const k = {
    mallar: new Set(kume.mallar),
    birlikler: new Set(kume.birlikler),
    tarimUrunleri: new Set(kume.tarimUrunleri),
    tesisTurleri: new Set(kume.tesisTurleri),
    yontemler: new Set(kume.yontemler),
    teknolojiler: new Set(kume.teknolojiler),
  };
  const malId = (i: number): string => ic.mallar[i]!.id;
  const birlikId = (i: number): string => ic.birlikler[i]!.id;
  const turId = (i: number): string => ic.tesisTurleri[i]!.id;
  const yontemId = (i: number): string => ic.yontemler[i]!.id;
  const tekId = (i: number): string => ic.teknolojiler[i]!.id;
  const urunId = (i: number): string => (ic.icerik.tarimUrunleri ?? [])[i]!.id;
  const sozluk = <T>(dizi: readonly T[], id: (i: number) => string, uzay: Set<string>): Record<string, T> => {
    const o: Record<string, T> = {};
    dizi.forEach((x, i) => {
      if (uzay.has(id(i))) o[id(i)] = x;
    });
    return o;
  };
  const malSoz = <T>(dizi: readonly T[]): Record<string, T> => sozluk(dizi, malId, k.mallar);
  const bolgeler = c.bolgeler as Ham[];
  for (const b of bolgeler) {
    for (const f of ["stoklar", "israf", "uretimToplam", "uretimOrani", "rezervIlk", "rezervKalan"]) b[f] = malSoz(b[f] as unknown[]);
    if (b.kesifSayisi !== undefined) b.kesifSayisi = malSoz(b.kesifSayisi as unknown[]);
    b.birlikler = sozluk(b.birlikler as number[], birlikId, k.birlikler);
    b.tesisler = (b.tesisler as Ham[]).map((t) => ({ ...t, tur: turId(t.tur as number), yontem: yontemId(t.yontem as number) }));
    b.ticaretEmirleri = (b.ticaretEmirleri as Ham[]).map((e) => ({ ...e, mal: malId(e.mal as number) }));
    const tarim = b.tarim as Ham | undefined;
    if (tarim !== undefined) tarim.ekimPpm = sozluk(tarim.ekimPpm as number[], urunId, k.tarimUrunleri);
  }
  for (const o of c.oyuncular as Ham[]) {
    o.teknolojiler = (o.teknolojiler as number[]).map(tekId).sort();
    const ar = o.arastirma as Ham | null;
    if (ar !== null) ar.teknoloji = tekId(ar.teknoloji as number);
  }
  const pazar = c.pazar as Ham;
  for (const f of ["fiyat", "oyuncuTalebi", "oyuncuArzi"]) pazar[f] = malSoz(pazar[f] as unknown[]);
  for (const s of c.savaslar as Ham[]) {
    const sonuc = s.sonuc as Ham | null;
    if (sonuc === null) continue;
    sonuc.stokKaybi = malSoz(sonuc.stokKaybi as unknown[]);
    sonuc.saldiranBirlikKaybi = sozluk(sonuc.saldiranBirlikKaybi as number[], birlikId, k.birlikler);
    sonuc.savunanBirlikKaybi = sozluk(sonuc.savunanBirlikKaybi as number[], birlikId, k.birlikler);
  }
  for (const i of c.insaatlar as Ham[]) {
    if (i.tur === "tesis" && (i.hedef as number) >= 0) i.hedef = turId(i.hedef as number);
    if (i.odenenMal !== undefined) i.odenenMal = Object.fromEntries((i.odenenMal as [number, number][]).map(([m, q]) => [malId(m), q]));
  }
  for (const p of c.partiler as Ham[]) p.birlik = birlikId(p.birlik as number);
  const loj = c.lojistik as Ham;
  loj.akislar = (loj.akislar as Ham[]).map((a) => ({ ...a, mal: malId(a.mal as number) }));
  loj.kapsam = (loj.kapsam as unknown[][]).map((satir) => malSoz(satir));
  delete loj.kirli;
  delete loj.cozumPlanli;
  delete (c.sayac as Ham).olay;
  c.kuyruk = (c.kuyruk as Ham[])
    .filter((o) => (o.veri as Ham).tur !== "cozum")
    .map((o) => {
      const v = o.veri as Ham;
      return typeof v.mal === "number" ? { ...o, veri: { ...v, mal: malId(v.mal) } } : o;
    })
    .sort((x, y) => (x.t as number) - (y.t as number) || (x.oncelik as number) - (y.oncelik as number) || (x.sira as number) - (y.sira as number));
  return c;
}

/**
 * Dünyadaki tüm dizi yolları ([*] ile normalleştirilmiş) ve uzunlukları: tam `uzunluk` boyunda olan dizilerin yol kümesi.
 * Göç taranmasında "bilinmeyen indeksli dizi" bulmak için.
 */
export function diziYollari(d: unknown, uzunluk: number): Set<string> {
  const sonuc = new Set<string>();
  const yuru = (v: unknown, yol: string): void => {
    if (Array.isArray(v)) {
      if (v.length === uzunluk) sonuc.add(yol);
      for (const x of v) yuru(x, `${yol}[*]`);
    } else if (typeof v === "object" && v !== null) {
      for (const [k, x] of Object.entries(v)) yuru(x, `${yol}.${k}`);
    }
  };
  yuru(d, "$");
  return sonuc;
}

/** Dünyadaki tüm dizi uzunlukları (içerik boyutlarını bunlarla çakışmayacak biçimde seçmek için). */
export function diziUzunluklari(d: unknown): Set<number> {
  const sonuc = new Set<number>();
  const yuru = (v: unknown): void => {
    if (Array.isArray(v)) {
      sonuc.add(v.length);
      for (const x of v) yuru(x);
    } else if (typeof v === "object" && v !== null) for (const x of Object.values(v)) yuru(x);
  };
  yuru(d);
  return sonuc;
}
