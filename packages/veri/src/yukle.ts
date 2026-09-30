/**
 * Veri doğrulama ve yükleme.
 *
 * - dogrulaHarita / dogrulaIcerik / dogrulaParametreler: zod şeması + anlamsal kontroller.
 *   Hepsi ham (bilinmeyen) girdi alır, ATMAZ; `{ gecerli: false, hatalar }` döndürür.
 * - dogrulaVeriPaketi: üç dosya arası çapraz kontroller (harita <-> içerik <-> parametreler).
 * - varsayilanVeriyiYukle / miniVeriyiYukle: dosyaları okur, doğrular, geçersizse ayrıntılı hata fırlatır.
 *
 * Not: dosya okuma için node:fs kullanılır (tarayıcı paketine girmez; oraya VeriPaketi dışarıdan verilir).
 */
import { readFileSync } from "node:fs";
import type { ZodError, ZodErrorMap, ZodTypeAny } from "zod";
import { HaritaSema, IcerikSema, ParametreSema } from "./sema";
import type { HaritaDosyasi, IcerikDosyasi, Parametreler } from "./tipler";

export interface VeriPaketi {
  harita: HaritaDosyasi;
  icerik: IcerikDosyasi;
  param: Parametreler;
}

export type DogrulamaSonucu = { gecerli: true } | { gecerli: false; hatalar: string[] };

/** Harita doğrulama seçenekleri (mini test haritaları için gevşetilebilir). */
export interface HaritaSecenekleri {
  /** İzin verilen bölge sayısı aralığı [en az, en çok]. Varsayılan [30, 60]. */
  bolgeAraligi?: [number, number];
  /** İzin verilen devlet sayısı aralığı. Varsayılan [3, 4]. */
  devletAraligi?: [number, number];
  /** En az "dar_gecit" etiketli bölge sayısı. Varsayılan 2. */
  enAzDarGecit?: number;
  /** En az "liman" etiketli bölge sayısı. Varsayılan 2. */
  enAzLiman?: number;
}

/** Mini test haritası için gevşetilmiş seçenekler. */
export const MINI_HARITA_SECENEKLERI: Required<HaritaSecenekleri> = {
  bolgeAraligi: [2, 60],
  devletAraligi: [2, 4],
  enAzDarGecit: 1,
  enAzLiman: 1,
};

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const turkceHataHaritasi: ZodErrorMap = (sorun, baglam) => {
  switch (sorun.code) {
    case "invalid_type":
      if (sorun.received === "undefined") return { message: "zorunlu alan eksik" };
      return { message: `beklenen tur ${sorun.expected}, bulunan ${sorun.received}` };
    case "unrecognized_keys":
      return { message: `taninmayan alan(lar): ${sorun.keys.join(", ")}` };
    case "invalid_literal":
      return { message: `beklenen deger ${JSON.stringify(sorun.expected)}` };
    case "invalid_enum_value":
      return { message: `gecersiz deger "${String(sorun.received)}"; izin verilenler: ${sorun.options.join(", ")}` };
    default:
      return { message: baglam.defaultError };
  }
};

function yolYaz(yol: ReadonlyArray<string | number>): string {
  let s = "";
  for (const p of yol) s += typeof p === "number" ? `[${p}]` : s === "" ? p : `.${p}`;
  return s === "" ? "(kok)" : s;
}

function zodHatalari(hata: ZodError): string[] {
  return hata.issues.map((i) => `${yolYaz(i.path)}: ${i.message}`);
}

function sonuc(hatalar: string[]): DogrulamaSonucu {
  return hatalar.length === 0 ? { gecerli: true } : { gecerli: false, hatalar };
}

/** Şemayı çalıştırır; hata varsa Türkçe hata listesi, yoksa ayrıştırılmış veri döndürür. */
function semaCalistir<T extends ZodTypeAny>(
  sema: T,
  ham: unknown,
): { tamam: true; veri: T["_output"] } | { tamam: false; hatalar: string[] } {
  const r = sema.safeParse(ham, { errorMap: turkceHataHaritasi });
  return r.success ? { tamam: true, veri: r.data } : { tamam: false, hatalar: zodHatalari(r.error) };
}

/** Bir kimlik listesinde yinelenenleri bulur. */
function yinelenenler(kimlikler: readonly string[]): string[] {
  const goruldu = new Set<string>();
  const yinelenen = new Set<string>();
  for (const k of kimlikler) {
    if (goruldu.has(k)) yinelenen.add(k);
    goruldu.add(k);
  }
  return [...yinelenen];
}

function benzersizlikKontrolu(hatalar: string[], alan: string, kimlikler: readonly string[]): void {
  for (const k of yinelenenler(kimlikler)) hatalar.push(`${alan}: yinelenen kimlik "${k}"`);
}

// ---------------------------------------------------------------------------
// Harita
// ---------------------------------------------------------------------------

/**
 * Şema + anlamsal kontroller: benzersiz kimlikler, kenar uçları, a != b, yinelenen kenar yok,
 * graf bağlı (tüm kenar türleriyle), bölge/devlet sayısı aralıkta, en az N dar geçit ve liman,
 * liman => kıyı, deniz kenarları yalnızca kıyı bölgeleri arasında.
 */
export function dogrulaHarita(ham: unknown, secenek: HaritaSecenekleri = {}): DogrulamaSonucu {
  const s = semaCalistir(HaritaSema, ham);
  if (!s.tamam) return { gecerli: false, hatalar: s.hatalar };
  const h: HaritaDosyasi = s.veri;

  const [bolgeMin, bolgeMax] = secenek.bolgeAraligi ?? [30, 60];
  const [devletMin, devletMax] = secenek.devletAraligi ?? [3, 4];
  const enAzDarGecit = secenek.enAzDarGecit ?? 2;
  const enAzLiman = secenek.enAzLiman ?? 2;
  const hatalar: string[] = [];

  // Benzersiz kimlikler
  benzersizlikKontrolu(hatalar, "devletler", h.devletler.map((d) => d.id));
  benzersizlikKontrolu(hatalar, "bolgeler", h.bolgeler.map((b) => b.id));

  // Sayı aralıkları
  if (h.bolgeler.length < bolgeMin || h.bolgeler.length > bolgeMax) {
    hatalar.push(`bolgeler: bolge sayisi ${h.bolgeler.length}, beklenen aralik [${bolgeMin}, ${bolgeMax}]`);
  }
  if (h.devletler.length < devletMin || h.devletler.length > devletMax) {
    hatalar.push(`devletler: devlet sayisi ${h.devletler.length}, beklenen aralik [${devletMin}, ${devletMax}]`);
  }

  // Bölge -> devlet, etiket tekrarları, liman => kıyı
  const devletKimlikleri = new Set(h.devletler.map((d) => d.id));
  const devletBolgeSayisi = new Map<string, number>();
  const kiyiMi = new Map<string, boolean>();
  for (const [i, b] of h.bolgeler.entries()) {
    if (!devletKimlikleri.has(b.devlet)) {
      hatalar.push(`bolgeler[${i}].devlet: bilinmeyen devlet "${b.devlet}" (bolge "${b.id}")`);
    } else {
      devletBolgeSayisi.set(b.devlet, (devletBolgeSayisi.get(b.devlet) ?? 0) + 1);
    }
    if (new Set(b.etiketler).size !== b.etiketler.length) {
      hatalar.push(`bolgeler[${i}].etiketler: yinelenen etiket (bolge "${b.id}")`);
    }
    if (b.etiketler.includes("liman") && !b.etiketler.includes("kiyi")) {
      hatalar.push(`bolgeler[${i}].etiketler: "liman" bolgesi "kiyi" etiketli de olmali (bolge "${b.id}")`);
    }
    kiyiMi.set(b.id, b.etiketler.includes("kiyi"));
  }
  for (const d of h.devletler) {
    if ((devletBolgeSayisi.get(d.id) ?? 0) === 0) hatalar.push(`devletler: "${d.id}" devletinin hic bolgesi yok`);
  }

  // Dar geçit ve liman sayıları
  const darGecitSayisi = h.bolgeler.filter((b) => b.etiketler.includes("dar_gecit")).length;
  const limanSayisi = h.bolgeler.filter((b) => b.etiketler.includes("liman")).length;
  if (darGecitSayisi < enAzDarGecit) {
    hatalar.push(`bolgeler: en az ${enAzDarGecit} "dar_gecit" bolgesi gerekli, bulunan ${darGecitSayisi}`);
  }
  if (limanSayisi < enAzLiman) {
    hatalar.push(`bolgeler: en az ${enAzLiman} "liman" bolgesi gerekli, bulunan ${limanSayisi}`);
  }

  // Kenarlar
  const bolgeKimlikleri = new Set(h.bolgeler.map((b) => b.id));
  const gorulenKenar = new Set<string>();
  const komsu = new Map<string, string[]>();
  for (const id of bolgeKimlikleri) komsu.set(id, []);
  for (const [i, k] of h.kenarlar.entries()) {
    let uclarVar = true;
    for (const uc of ["a", "b"] as const) {
      if (!bolgeKimlikleri.has(k[uc])) {
        hatalar.push(`kenarlar[${i}].${uc}: bilinmeyen bolge "${k[uc]}"`);
        uclarVar = false;
      }
    }
    if (k.a === k.b) {
      hatalar.push(`kenarlar[${i}]: a ve b ayni bolge ("${k.a}"); kendine kenar yasak`);
      continue;
    }
    if (!uclarVar) continue;
    const anahtar = k.a < k.b ? `${k.a}|${k.b}` : `${k.b}|${k.a}`;
    if (gorulenKenar.has(anahtar)) {
      hatalar.push(`kenarlar[${i}]: yinelenen kenar "${k.a}" - "${k.b}" (tur farketmeksizin tek kenar)`);
    }
    gorulenKenar.add(anahtar);
    if (k.tur === "deniz") {
      for (const uc of ["a", "b"] as const) {
        if (kiyiMi.get(k[uc]) !== true) {
          hatalar.push(`kenarlar[${i}]: deniz kenari yalnizca "kiyi" bolgeleri arasinda olabilir ("${k[uc]}" kiyi degil)`);
        }
      }
    }
    komsu.get(k.a)?.push(k.b);
    komsu.get(k.b)?.push(k.a);
  }

  // Bağlılık (tüm kenar türleriyle)
  if (h.bolgeler.length > 0) {
    const ilk = h.bolgeler[0]?.id as string;
    const ziyaret = new Set<string>([ilk]);
    const yigin = [ilk];
    while (yigin.length > 0) {
      const u = yigin.pop() as string;
      for (const v of komsu.get(u) ?? []) {
        if (!ziyaret.has(v)) {
          ziyaret.add(v);
          yigin.push(v);
        }
      }
    }
    if (ziyaret.size !== bolgeKimlikleri.size) {
      const ulasilamayan = h.bolgeler.filter((b) => !ziyaret.has(b.id)).map((b) => b.id);
      hatalar.push(
        `kenarlar: graf bagli degil; "${ilk}" bolgesinden ulasilamayan ${ulasilamayan.length} bolge: ${ulasilamayan.slice(0, 8).join(", ")}${ulasilamayan.length > 8 ? ", ..." : ""}`,
      );
    }
  }

  return sonuc(hatalar);
}

// ---------------------------------------------------------------------------
// İçerik
// ---------------------------------------------------------------------------

/** Şema + çapraz referanslar (mal, yöntem, tesis, teknoloji, birlik) ve teknoloji döngüsü. */
export function dogrulaIcerik(ham: unknown): DogrulamaSonucu {
  const s = semaCalistir(IcerikSema, ham);
  if (!s.tamam) return { gecerli: false, hatalar: s.hatalar };
  const c: IcerikDosyasi = s.veri;
  const hatalar: string[] = [];

  benzersizlikKontrolu(hatalar, "mallar", c.mallar.map((x) => x.id));
  benzersizlikKontrolu(hatalar, "yontemler", c.yontemler.map((x) => x.id));
  benzersizlikKontrolu(hatalar, "tesisTurleri", c.tesisTurleri.map((x) => x.id));
  benzersizlikKontrolu(hatalar, "teknolojiler", c.teknolojiler.map((x) => x.id));
  benzersizlikKontrolu(hatalar, "birlikler", c.birlikler.map((x) => x.id));

  const mallar = new Map(c.mallar.map((m) => [m.id, m]));
  const yontemler = new Map(c.yontemler.map((y) => [y.id, y]));
  const tesisTurleri = new Map(c.tesisTurleri.map((t) => [t.id, t]));
  const teknolojiler = new Map(c.teknolojiler.map((t) => [t.id, t]));

  const malKontrol = (yol: string, kayit: Record<string, number>): void => {
    for (const m of Object.keys(kayit)) {
      if (!mallar.has(m)) hatalar.push(`${yol}: bilinmeyen mal "${m}"`);
    }
  };
  const teknolojiKontrol = (yol: string, t: string | undefined): void => {
    if (t !== undefined && !teknolojiler.has(t)) hatalar.push(`${yol}: bilinmeyen teknoloji "${t}"`);
  };
  const hamMalKontrol = (yol: string, m: string): void => {
    const mal = mallar.get(m);
    if (mal === undefined) hatalar.push(`${yol}: bilinmeyen mal "${m}"`);
    else if (mal.kategori !== "ham") hatalar.push(`${yol}: "${m}" "ham" kategoride degil (rezerv yalniz ham mallarda olur)`);
  };

  // Yöntemler
  for (const [i, y] of c.yontemler.entries()) {
    const yol = `yontemler[${i}] ("${y.id}")`;
    malKontrol(`${yol}.girdiler`, y.girdiler);
    malKontrol(`${yol}.ciktilar`, y.ciktilar);
    malKontrol(`${yol}.bakim`, y.bakim);
    if (Object.keys(y.ciktilar).length === 0) hatalar.push(`${yol}.ciktilar: en az bir cikti gerekli`);
    for (const [m, v] of Object.entries(y.ciktilar)) {
      if (v === 0) hatalar.push(`${yol}.ciktilar.${m}: cikti miktari 0 olamaz`);
    }
    teknolojiKontrol(`${yol}.gerekliTeknoloji`, y.gerekliTeknoloji);
    if (y.rezerv !== undefined) {
      hamMalKontrol(`${yol}.rezerv`, y.rezerv);
      if ((y.ciktilar[y.rezerv] ?? 0) <= 0) {
        hatalar.push(`${yol}.rezerv: rezerv malı "${y.rezerv}" ciktilarda bulunmali`);
      }
    }
    // Teknolojiyle tutarlılık: yöntemi açan teknoloji onu acar.yontemler'de listelemeli.
    if (y.gerekliTeknoloji !== undefined) {
      const t = teknolojiler.get(y.gerekliTeknoloji);
      if (t !== undefined && !(t.acar.yontemler ?? []).includes(y.id)) {
        hatalar.push(`${yol}.gerekliTeknoloji: "${t.id}" teknolojisi bu yontemi acar.yontemler icinde listelemiyor`);
      }
    }
  }

  // Tesis türleri
  const kullanilanYontemler = new Set<string>();
  for (const [i, t] of c.tesisTurleri.entries()) {
    const yol = `tesisTurleri[${i}] ("${t.id}")`;
    malKontrol(`${yol}.insaMaliyeti`, t.insaMaliyeti);
    if (t.yontemler.length === 0) hatalar.push(`${yol}.yontemler: en az bir yontem gerekli`);
    benzersizlikKontrolu(hatalar, `${yol}.yontemler`, t.yontemler);
    for (const [j, yId] of t.yontemler.entries()) {
      const y = yontemler.get(yId);
      if (y === undefined) {
        hatalar.push(`${yol}.yontemler[${j}]: bilinmeyen yontem "${yId}"`);
        continue;
      }
      kullanilanYontemler.add(yId);
      if (j === 0 && y.gerekliTeknoloji !== undefined) {
        hatalar.push(`${yol}.yontemler[0]: varsayilan yontem ("${yId}") teknoloji gerektiremez`);
      }
      if (t.gerekliRezerv !== undefined && y.rezerv !== t.gerekliRezerv) {
        hatalar.push(`${yol}.yontemler[${j}]: "${yId}" yonteminin rezerv alani "${t.gerekliRezerv}" olmali (tesis gerekliRezerv)`);
      }
      if (t.gerekliRezerv === undefined && y.rezerv !== undefined) {
        hatalar.push(`${yol}.yontemler[${j}]: "${yId}" ham cikarim yontemi ama tesis gerekliRezerv tanimlamiyor`);
      }
    }
    if (t.gerekliRezerv !== undefined) hamMalKontrol(`${yol}.gerekliRezerv`, t.gerekliRezerv);
    teknolojiKontrol(`${yol}.gerekliTeknoloji`, t.gerekliTeknoloji);
    if (t.gerekliTeknoloji !== undefined) {
      const tk = teknolojiler.get(t.gerekliTeknoloji);
      if (tk !== undefined && !(tk.acar.tesisTurleri ?? []).includes(t.id)) {
        hatalar.push(`${yol}.gerekliTeknoloji: "${tk.id}" teknolojisi bu tesis turunu acar.tesisTurleri icinde listelemiyor`);
      }
    }
  }
  for (const y of c.yontemler) {
    if (!kullanilanYontemler.has(y.id)) hatalar.push(`yontemler: "${y.id}" hicbir tesis turunde kullanilmiyor`);
  }

  // Teknolojiler
  const teknolojiBagimlilik = new Map<string, string[]>();
  for (const [i, t] of c.teknolojiler.entries()) {
    const yol = `teknolojiler[${i}] ("${t.id}")`;
    benzersizlikKontrolu(hatalar, `${yol}.onKosullar`, t.onKosullar);
    for (const [j, o] of t.onKosullar.entries()) {
      if (o === t.id) hatalar.push(`${yol}.onKosullar[${j}]: teknoloji kendisinin on kosulu olamaz`);
      else if (!teknolojiler.has(o)) hatalar.push(`${yol}.onKosullar[${j}]: bilinmeyen teknoloji "${o}"`);
    }
    teknolojiBagimlilik.set(t.id, t.onKosullar.filter((o) => teknolojiler.has(o) && o !== t.id));
    for (const [j, y] of (t.acar.yontemler ?? []).entries()) {
      if (!yontemler.has(y)) hatalar.push(`${yol}.acar.yontemler[${j}]: bilinmeyen yontem "${y}"`);
    }
    for (const [j, tt] of (t.acar.tesisTurleri ?? []).entries()) {
      if (!tesisTurleri.has(tt)) hatalar.push(`${yol}.acar.tesisTurleri[${j}]: bilinmeyen tesis turu "${tt}"`);
    }
    benzersizlikKontrolu(hatalar, `${yol}.acar.kararlar`, t.acar.kararlar ?? []);
  }
  // Döngü (DFS, renklendirme)
  const renk = new Map<string, 0 | 1 | 2>();
  const dongu = (u: string, yol: string[]): void => {
    renk.set(u, 1);
    for (const v of teknolojiBagimlilik.get(u) ?? []) {
      const r = renk.get(v) ?? 0;
      if (r === 1) {
        const baslangic = yol.indexOf(v);
        hatalar.push(`teknolojiler: on kosul dongusu: ${[...yol.slice(baslangic), v].join(" -> ")}`);
      } else if (r === 0) {
        dongu(v, [...yol, v]);
      }
    }
    renk.set(u, 2);
  };
  for (const t of c.teknolojiler) {
    if ((renk.get(t.id) ?? 0) === 0) dongu(t.id, [t.id]);
  }

  // Birlikler
  for (const [i, b] of c.birlikler.entries()) {
    const yol = `birlikler[${i}] ("${b.id}")`;
    malKontrol(`${yol}.maliyet`, b.maliyet);
    malKontrol(`${yol}.ikmal`, b.ikmal);
    teknolojiKontrol(`${yol}.gerekliTeknoloji`, b.gerekliTeknoloji);
  }

  // Her teknoloji bir şey açmalı: yeni yöntem/tesis/karar ya da gerekliTeknoloji ile bağlanan birlik.
  const birlikAcanlar = new Set(c.birlikler.map((b) => b.gerekliTeknoloji).filter((x): x is string => x !== undefined));
  for (const t of c.teknolojiler) {
    const acar = t.acar;
    const bos = (acar.yontemler ?? []).length + (acar.tesisTurleri ?? []).length + (acar.kararlar ?? []).length === 0;
    if (bos && !birlikAcanlar.has(t.id)) {
      hatalar.push(`teknolojiler: "${t.id}" hicbir yontem, tesis, karar veya birlik acmiyor`);
    }
  }

  return sonuc(hatalar);
}

// ---------------------------------------------------------------------------
// Parametreler
// ---------------------------------------------------------------------------

/** Şema + (içerik verilirse) mal ve birlik kimliklerinin geçerliliği. */
export function dogrulaParametreler(ham: unknown, icerik?: IcerikDosyasi): DogrulamaSonucu {
  const s = semaCalistir(ParametreSema, ham);
  if (!s.tamam) return { gecerli: false, hatalar: s.hatalar };
  const p: Parametreler = s.veri;
  const hatalar: string[] = [];

  if (p.askeri.ilanHazirlikSaatMin > p.askeri.ilanHazirlikSaatMax) {
    hatalar.push("askeri.ilanHazirlikSaatMin: ilanHazirlikSaatMax degerinden buyuk olamaz");
  }
  if (p.askeri.ilanHazirlikSaatMin < 1) hatalar.push("askeri.ilanHazirlikSaatMin: en az 1 olmali");
  if (p.erkenOyun.bitisSaat < p.erkenOyun.sabitSaat) {
    hatalar.push("erkenOyun.bitisSaat: sabitSaat degerinden kucuk olamaz");
  }
  // Yayılım indirimi %100 olursa maliyet ve süre 0'a iner; en çok %90'a izin verilir.
  if (p.teknoloji.yayilimIndirimiPpm > 900_000) {
    hatalar.push("teknoloji.yayilimIndirimiPpm: en fazla 900000 olabilir (maliyet ve sure 0'a inmemeli)");
  }

  if (icerik !== undefined) {
    const mallar = new Set(icerik.mallar.map((m) => m.id));
    const birlikler = new Set(icerik.birlikler.map((b) => b.id));
    const malKontrol = (yol: string, kayit: Record<string, number>, tamOlmali = false): void => {
      for (const m of Object.keys(kayit)) {
        if (!mallar.has(m)) hatalar.push(`${yol}: bilinmeyen mal "${m}"`);
      }
      if (tamOlmali) {
        for (const m of mallar) {
          if (!(m in kayit)) hatalar.push(`${yol}: "${m}" mali icin deger eksik`);
        }
      }
    };
    malKontrol("baslangic.stok", p.baslangic.stok);
    malKontrol("nufus.tuketim1000Saat", p.nufus.tuketim1000Saat);
    malKontrol("pazar.emilimSaat", p.pazar.emilimSaat, true);
    malKontrol("pazar.arzSaat", p.pazar.arzSaat, true);
    malKontrol("lojistik.gelistirmeMaliyeti", p.lojistik.gelistirmeMaliyeti);
    for (const b of Object.keys(p.baslangic.birlikler)) {
      if (!birlikler.has(b)) hatalar.push(`baslangic.birlikler: bilinmeyen birlik "${b}"`);
    }
    for (const [m, v] of Object.entries(p.baslangic.stok)) {
      if (v > p.ekonomi.depoKapasitesi) hatalar.push(`baslangic.stok.${m}: depo kapasitesini asiyor`);
    }
  }

  return sonuc(hatalar);
}

// ---------------------------------------------------------------------------
// Paket (çapraz kontroller)
// ---------------------------------------------------------------------------

/**
 * Üç dosyanın tek başına doğrulamalarını ve aralarındaki çapraz kontrolleri yapar:
 * bölge rezerv malları içerikte "ham", başlangıç tesis türleri içerikte var, gerekliEtiket/gerekliRezerv
 * bölgede sağlanıyor, başlangıç tesisi teknoloji gerektirmiyor, parametre kimlikleri geçerli.
 */
export function dogrulaVeriPaketi(paket: VeriPaketi, secenek: HaritaSecenekleri = {}): DogrulamaSonucu {
  const hatalar: string[] = [];
  const topla = (etiket: string, r: DogrulamaSonucu): boolean => {
    if (!r.gecerli) hatalar.push(...r.hatalar.map((h) => `[${etiket}] ${h}`));
    return r.gecerli;
  };
  const haritaTamam = topla("harita", dogrulaHarita(paket.harita, secenek));
  const icerikTamam = topla("icerik", dogrulaIcerik(paket.icerik));
  if (icerikTamam) topla("parametreler", dogrulaParametreler(paket.param, paket.icerik));
  else topla("parametreler", dogrulaParametreler(paket.param));

  if (haritaTamam && icerikTamam) {
    const mallar = new Map(paket.icerik.mallar.map((m) => [m.id, m]));
    const tesisTurleri = new Map(paket.icerik.tesisTurleri.map((t) => [t.id, t]));
    for (const [i, b] of paket.harita.bolgeler.entries()) {
      const yol = `[harita] bolgeler[${i}] ("${b.id}")`;
      for (const [m, v] of Object.entries(b.rezervler)) {
        const mal = mallar.get(m);
        if (mal === undefined) hatalar.push(`${yol}.rezervler: icerikte bilinmeyen mal "${m}"`);
        else if (mal.kategori !== "ham") hatalar.push(`${yol}.rezervler: "${m}" icerikte "ham" degil`);
        if (v === 0) hatalar.push(`${yol}.rezervler.${m}: rezerv 0 olamaz (anahtari kaldirin)`);
      }
      for (const [j, tId] of b.tesisler.entries()) {
        const t = tesisTurleri.get(tId);
        if (t === undefined) {
          hatalar.push(`${yol}.tesisler[${j}]: icerikte bilinmeyen tesis turu "${tId}"`);
          continue;
        }
        if (t.gerekliEtiket !== undefined && !b.etiketler.includes(t.gerekliEtiket)) {
          hatalar.push(`${yol}.tesisler[${j}]: "${tId}" icin "${t.gerekliEtiket}" etiketi gerekli`);
        }
        if (t.gerekliRezerv !== undefined && (b.rezervler[t.gerekliRezerv] ?? 0) <= 0) {
          hatalar.push(`${yol}.tesisler[${j}]: "${tId}" icin "${t.gerekliRezerv}" rezervi gerekli`);
        }
        if (t.gerekliTeknoloji !== undefined) {
          hatalar.push(`${yol}.tesisler[${j}]: baslangic tesisi teknoloji gerektiremez ("${tId}" -> "${t.gerekliTeknoloji}")`);
        }
      }
    }
  }
  return sonuc(hatalar);
}

// ---------------------------------------------------------------------------
// Yükleme
// ---------------------------------------------------------------------------

function jsonOku(goreliYol: string): unknown {
  const url = new URL(`../${goreliYol}`, import.meta.url);
  let metin: string;
  try {
    metin = readFileSync(url, "utf8");
  } catch (e) {
    throw new Error(`Veri dosyasi okunamadi (${goreliYol}): ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    return JSON.parse(metin) as unknown;
  } catch (e) {
    throw new Error(`Veri dosyasi gecerli JSON degil (${goreliYol}): ${e instanceof Error ? e.message : String(e)}`);
  }
}

function paketYukle(haritaDosyasi: string, secenek: HaritaSecenekleri): VeriPaketi {
  const paket = {
    harita: jsonOku(haritaDosyasi),
    icerik: jsonOku("icerik/icerik.json"),
    param: jsonOku("icerik/parametreler.json"),
  } as VeriPaketi;
  // Çapraz kontroller yapısal olarak geçerli veri ister; önce tek tek, sonra paket.
  const sonucu = dogrulaVeriPaketi(paket, secenek);
  if (!sonucu.gecerli) {
    throw new Error(`Veri paketi gecersiz (${haritaDosyasi}):\n - ${sonucu.hatalar.join("\n - ")}`);
  }
  return paket;
}

/**
 * haritalar/sentetik-50.json, icerik/icerik.json ve icerik/parametreler.json dosyalarını
 * okur, doğrular ve döndürür. Geçersizse ayrıntılı hata fırlatır. Her çağrıda yeni kopya döner.
 */
export function varsayilanVeriyiYukle(): VeriPaketi {
  return paketYukle("haritalar/sentetik-50.json", {});
}

/**
 * Birim testleri için küçük harita: haritalar/mini-6.json + aynı içerik ve parametreler.
 * Doğrulama MINI_HARITA_SECENEKLERI ile yapılır.
 */
export function miniVeriyiYukle(): VeriPaketi {
  return paketYukle("haritalar/mini-6.json", MINI_HARITA_SECENEKLERI);
}
