/**
 * Veri doğrulama ve yükleme.
 *
 * - dogrulaHarita / dogrulaIcerik / dogrulaParametreler: zod şeması + anlamsal kontroller.
 *   Hepsi ham (bilinmeyen) girdi alır, ATMAZ; `{ gecerli: false, hatalar }` döndürür.
 * - dogrulaVeriPaketi: üç dosya arası çapraz kontroller (harita <-> içerik <-> parametreler).
 * - varsayilanTarimAlani / tarimAlanlariniTamamla: tarım alanı olmayan bölgeler için türetme.
 *
 * Bu modül dosya sistemine bağlı DEĞİLDİR; tarayıcıda (3D istemci) da kullanılır (`@bolge/veri/saf`).
 * Dosyadan yükleme yukle.ts'dedir.
 */
import type { ZodError, ZodErrorMap, ZodTypeAny } from "zod";
import { HaritaSema, IcerikSema, ParametreSema } from "./sema";
import type { KimlikListesi } from "./kimlik-listesi";
import { IKLIM_OLAY_TURLERI, IKLIM_TIPLERI } from "./tipler";
import type { BolgeTanimi, BolgeTarimTanimi, HaritaDosyasi, IcerikDosyasi, IklimTipi, LimanTanimi, Parametreler } from "./tipler";

export interface VeriPaketi {
  harita: HaritaDosyasi;
  icerik: IcerikDosyasi;
  param: Parametreler;
  /**
   * Mal ve yapı kimlik kilidi (`icerik/kimlik-listesi.json`, docs/06 §15.8). Dosyadan yükleyiciler (Node) ekler ve `dogrulaKimlikKilidi` ile
   * içeriği listeye karşı denetler (üyelik, önek, yasaklılar, ad alanı, biçim, taban fiyat). Verilmezse (dondurulmuş eski fikstürler, tarayıcı paketi)
   * kilit uygulanmaz. `dogrulaVeriPaketi` ve çekirdek `icerikDerle` kilidi UYGULAMAZ (tarayıcı/istemci paketine doğrulayıcı kodu girmesin).
   */
  kimlikListesi?: KimlikListesi;
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

/** Şemayı çalıştırır; hata varsa Türkçe hata listesi, yoksa ayrıştırılmış veri döndürür (parsel.ts de kullanır). */
export function semaCalistir<T extends ZodTypeAny>(
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
    // Liman tanımı (B3): yalnız "liman" etiketli bölgede; kapıda mesafe 0, kapı değilse en az 1 saat.
    if (b.liman !== undefined) {
      const yolL = `bolgeler[${i}].liman (bolge "${b.id}")`;
      if (!b.etiketler.includes("liman")) hatalar.push(`${yolL}: liman tanimi yalnizca "liman" etiketli bolgede olabilir`);
      if (b.liman.dunyaKapisi && b.liman.dunyaMesafeSaat !== 0) hatalar.push(`${yolL}.dunyaMesafeSaat: dunya kapisinda 0 olmali`);
      if (!b.liman.dunyaKapisi && b.liman.dunyaMesafeSaat < 1) hatalar.push(`${yolL}.dunyaMesafeSaat: dunya kapisi olmayan limanda en az 1 saat olmali`);
    }
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
  // Depolanamaz mal (elektrik; B2): yalnız yöntem girdi/çıktısında bulunabilir; stok, taşıma, bakım, maliyet ve rezerv yok.
  const depolanamaz = new Set(c.mallar.filter((m) => m.depolanabilir === false).map((m) => m.id));
  const depoluMalKontrol = (yol: string, kayit: Record<string, number>): void => {
    for (const m of Object.keys(kayit)) {
      if (depolanamaz.has(m)) hatalar.push(`${yol}: "${m}" depolanamaz mal; burada kullanilamaz`);
    }
  };
  for (const [i, m] of c.mallar.entries()) {
    if (m.depolanabilir === false && m.kategori !== "enerji") {
      hatalar.push(`mallar[${i}] ("${m.id}").depolanabilir: depolanamaz mal "enerji" kategorisinde olmali`);
    }
    if (m.kategori === "enerji" && m.depolanabilir !== false) {
      hatalar.push(`mallar[${i}] ("${m.id}").kategori: "enerji" kategorisi depolanabilir: false gerektirir`);
    }
  }
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
    depoluMalKontrol(`${yol}.bakim`, y.bakim);
    if (y.hidro === true && !Object.keys(y.ciktilar).some((m) => depolanamaz.has(m))) {
      hatalar.push(`${yol}.hidro: hidro yontemi depolanamaz bir mal (elektrik) uretmeli`);
    }
    if (y.hidro === true && Object.keys(y.girdiler).length > 0) hatalar.push(`${yol}.hidro: hidro yontemi girdi tuketemez`);
    if (Object.keys(y.ciktilar).length === 0 && y.sulama !== true) hatalar.push(`${yol}.ciktilar: en az bir cikti gerekli`);
    if (y.sulama === true && y.rezerv !== undefined) hatalar.push(`${yol}.sulama: sulama yontemi rezerv tuketemez`);
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
    depoluMalKontrol(`${yol}.insaMaliyeti`, t.insaMaliyeti);
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
      if (j === 0 && y.mulkKipi === true) {
        hatalar.push(`yontemler: "${yId}" mulkKipi yontemi tur varsayilani olamaz (${t.id})`);
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
    // mulkKipi yontemi kilitsizdir (A0-17; sartname §4.1): teknoloji sarti tasiyamaz.
    if (y.mulkKipi === true && y.gerekliTeknoloji !== undefined) hatalar.push(`yontemler: "${y.id}" mulkKipi yontemi teknoloji sarti tasiyamaz`);
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

  // Tarım ürün grupları (B1)
  if (c.tarimUrunleri !== undefined) {
    if (c.tarimUrunleri.length === 0) hatalar.push("tarimUrunleri: en az bir urun gerekli (alan verilmeyecekse kaldirin)");
    benzersizlikKontrolu(hatalar, "tarimUrunleri", c.tarimUrunleri.map((x) => x.id));
  }

  // Birlikler
  for (const [i, b] of c.birlikler.entries()) {
    const yol = `birlikler[${i}] ("${b.id}")`;
    malKontrol(`${yol}.maliyet`, b.maliyet);
    malKontrol(`${yol}.ikmal`, b.ikmal);
    depoluMalKontrol(`${yol}.maliyet`, b.maliyet);
    depoluMalKontrol(`${yol}.ikmal`, b.ikmal);
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

/** İklim parametrelerinin anlamsal kontrolleri (şema yapıyı denetler): takvim toplamı, eğri toplamları, aralıklar. */
function iklimKontrolu(hatalar: string[], k: NonNullable<Parametreler["iklim"]>): void {
  let toplamGun = 0;
  for (const [i, g] of k.ayGunleri.entries()) {
    if (g < 1) hatalar.push(`iklim.ayGunleri[${i}]: en az 1 olmali`);
    toplamGun += g;
  }
  if (toplamGun !== 365) hatalar.push(`iklim.ayGunleri: toplam 365 olmali (bulunan ${toplamGun})`);
  for (const tip of IKLIM_TIPLERI) {
    const toplam = k.hasatEgrisiPpm[tip].reduce((t, x) => t + x, 0);
    if (toplam !== 12_000_000) hatalar.push(`iklim.hasatEgrisiPpm.${tip}: 12 ayin toplami tam 12000000 olmali (yillik ortalama 1000000; bulunan ${toplam})`);
  }
  for (const tur of IKLIM_OLAY_TURLERI) {
    const o = k.olaylar[tur];
    if (o.sureGunMin > o.sureGunMax) hatalar.push(`iklim.olaylar.${tur}.sureGunMin: sureGunMax degerinden buyuk olamaz`);
    if (o.siddetMinPpm > o.siddetMaxPpm) hatalar.push(`iklim.olaylar.${tur}.siddetMinPpm: siddetMaxPpm degerinden buyuk olamaz`);
  }
}

/** Sanayi parametrelerinin anlamsal kontrolleri (şema yapıyı denetler). */
function sanayiKontrolu(hatalar: string[], k: NonNullable<Parametreler["sanayi"]>): void {
  if (k.olcekKademeleri.length !== 3) {
    hatalar.push(`sanayi.olcekKademeleri: tam 3 kademe (S, M, L) olmali (bulunan ${k.olcekKademeleri.length})`);
  } else {
    const s = k.olcekKademeleri[0] as (typeof k.olcekKademeleri)[number];
    if (s.ciktiPpm !== 1_000_000 || s.isciPpm !== 1_000_000 || s.bakimPpm !== 1_000_000 || s.insaPpm !== 1_000_000 || s.gerekliTeknoloji !== null) {
      hatalar.push("sanayi.olcekKademeleri[0]: S kademesi tum carpanlari 1000000 ve gerekliTeknoloji null olmali (referans)");
    }
    for (let i = 1; i < 3; i++) {
      const a = k.olcekKademeleri[i - 1] as (typeof k.olcekKademeleri)[number];
      const b = k.olcekKademeleri[i] as (typeof k.olcekKademeleri)[number];
      for (const alan of ["ciktiPpm", "isciPpm", "bakimPpm", "insaPpm"] as const) {
        if (b[alan] < a[alan]) hatalar.push(`sanayi.olcekKademeleri[${i}].${alan}: onceki kademeden kucuk olamaz`);
      }
    }
  }
  const ids = k.bakim.duzeyler.map((d) => d.id).join(",");
  if (ids !== "asgari,normal,yuksek") hatalar.push(`sanayi.bakim.duzeyler: sirayla asgari, normal, yuksek olmali (bulunan ${ids})`);
  const toplamAkarsu = k.hidro.akarsuEgrisiPpm.reduce((t, x) => t + x, 0);
  if (toplamAkarsu !== 12_000_000) {
    hatalar.push(`sanayi.hidro.akarsuEgrisiPpm: 12 ayin toplami tam 12000000 olmali (yillik ortalama 1000000; bulunan ${toplamAkarsu})`);
  }
  if (k.damar.kesifEkiMinPpm > k.damar.kesifEkiMaxPpm) hatalar.push("sanayi.damar.kesifEkiMinPpm: kesifEkiMaxPpm degerinden buyuk olamaz");
}

/** Pazar v1 (B3) alan adları: ya hiçbiri ya hepsi verilir. */
const PAZAR_EK_ALANLARI = [
  "makasPpm",
  "anlasmaMakasPpm",
  "yaptirimMakasPpm",
  "limanPrimPpmSaat",
  "limanPrimTavaniPpm",
  "islemKomisyonuPpm",
  "npcLikiditeTabanOyuncu",
  "kitlik",
  "tarife",
] as const;

/** Pazar parametrelerinin anlamsal kontrolleri (şema yapıyı denetler): ya hiçbiri ya hepsi, makas-çarpan tutarlılığı, kıtlık sırası. */
function pazarKontrolu(hatalar: string[], p: Parametreler["pazar"]): void {
  const verilen = PAZAR_EK_ALANLARI.filter((a) => p[a] !== undefined);
  if (verilen.length === 0) return; // pazar v1 kapalı
  if (verilen.length !== PAZAR_EK_ALANLARI.length) {
    const eksik = PAZAR_EK_ALANLARI.filter((a) => p[a] === undefined);
    hatalar.push(`pazar: B3 alanlari ya hic ya hepsi verilmeli (eksik: ${eksik.join(", ")})`);
    return;
  }
  const makas = p.makasPpm as number;
  const anlasma = p.anlasmaMakasPpm as number;
  const yaptirim = p.yaptirimMakasPpm as number;
  for (const [ad, v] of [["makasPpm", makas], ["anlasmaMakasPpm", anlasma], ["yaptirimMakasPpm", yaptirim]] as const) {
    if (v % 2 !== 0) hatalar.push(`pazar.${ad}: cift sayi olmali (ithalat +makas/2, ihracat -makas/2)`);
    if (v >= 2_000_000) hatalar.push(`pazar.${ad}: 2000000'dan kucuk olmali`);
  }
  if (anlasma > makas) hatalar.push("pazar.anlasmaMakasPpm: makasPpm degerinden buyuk olamaz (anlasma makasi daraltir)");
  if (yaptirim < makas) hatalar.push("pazar.yaptirimMakasPpm: makasPpm degerinden kucuk olamaz (yaptirim makasi genisletir)");
  // Eski çarpan alanları makasla tutarlı olmalı (geri uyumlu geçiş: çarpanlar makastan türetilir).
  const tutarli: Array<[string, number, number]> = [
    ["ithalatCarpaniPpm", p.ithalatCarpaniPpm, 1_000_000 + makas / 2],
    ["ihracatCarpaniPpm", p.ihracatCarpaniPpm, 1_000_000 - makas / 2],
    ["anlasmaIthalatCarpaniPpm", p.anlasmaIthalatCarpaniPpm, 1_000_000 + anlasma / 2],
    ["anlasmaIhracatCarpaniPpm", p.anlasmaIhracatCarpaniPpm, 1_000_000 - anlasma / 2],
    ["yaptirimIthalatCarpaniPpm", p.yaptirimIthalatCarpaniPpm, 1_000_000 + yaptirim / 2],
    ["yaptirimIhracatCarpaniPpm", p.yaptirimIhracatCarpaniPpm, 1_000_000 - yaptirim / 2],
  ];
  for (const [ad, deger, beklenen] of tutarli) {
    if (deger !== beklenen) hatalar.push(`pazar.${ad}: makasla tutarsiz (beklenen ${beklenen}, bulunan ${deger}); pazar v1 acikken carpanlar makastan turetilir`);
  }
  if ((p.limanPrimTavaniPpm as number) > 500_000) hatalar.push("pazar.limanPrimTavaniPpm: en fazla 500000 olabilir");
  if ((p.islemKomisyonuPpm as number) > 200_000) hatalar.push("pazar.islemKomisyonuPpm: en fazla 200000 olabilir");
  const k = p.kitlik as NonNullable<Parametreler["pazar"]["kitlik"]>;
  for (let i = 1; i < 3; i++) {
    if ((k.esikPpm[i] as number) >= (k.esikPpm[i - 1] as number)) hatalar.push(`pazar.kitlik.esikPpm[${i}]: onceki esikten kucuk olmali (azalan siralama)`);
    if ((k.cezaPpm[i] as number) < (k.cezaPpm[i - 1] as number)) hatalar.push(`pazar.kitlik.cezaPpm[${i}]: onceki cezadan kucuk olamaz (artan siralama)`);
  }
  for (let i = 0; i < 3; i++) {
    if ((k.cezaPpm[i] as number) > 300_000) hatalar.push(`pazar.kitlik.cezaPpm[${i}]: en fazla 300000 olabilir (%30 tavan, ceza sarmali onlemi)`);
  }
  const t = p.tarife as NonNullable<Parametreler["pazar"]["tarife"]>;
  if (t.ithalatPpm[0] !== 0) hatalar.push("pazar.tarife.ithalatPpm[0]: varsayilan kademe 0 olmali");
  if (t.ihracatVergisiPpm[0] !== 0) hatalar.push("pazar.tarife.ihracatVergisiPpm[0]: varsayilan kademe 0 olmali");
  for (const [ad, dizi] of [["ithalatPpm", t.ithalatPpm], ["ihracatVergisiPpm", t.ihracatVergisiPpm]] as const) {
    if (dizi.some((x) => x > 500_000)) hatalar.push(`pazar.tarife.${ad}: kademeler en fazla 500000 olabilir`);
  }
}

/** Mülk yapılarında ölçek ayak izinin üst sınırı (`cekirdek/src/mulk/komut.ts ENCOK_AYAK_IZI` ile aynı; çekirdek veri paketini içe aktarmaz, kopya testle bağlıdır). */
export const MULK_ENCOK_AYAK_IZI = 5;

/** Mülk ölçek tablosu (docs/06 §15.10): her `yapiYuva` türü için `olcekHucre` = [S, M, L]; S = yuva, M >= S, L >= M; süre çarpanları azalmaz. */
function mulkKontrolu(hatalar: string[], k: NonNullable<Parametreler["mulk"]>, sanayi?: Parametreler["sanayi"]): void {
  for (const [tur, yuva] of Object.entries(k.yapiYuva)) {
    const o = k.olcekHucre[tur];
    if (o === undefined) {
      hatalar.push(`mulk.olcekHucre.${tur}: yapiYuva turu icin [S, M, L] ayak izi gerekli`);
      continue;
    }
    if (o[0] !== yuva) hatalar.push(`mulk.olcekHucre.${tur}[0]: S ayak izi yapiYuva degerine (${yuva}) esit olmali (bulunan ${o[0]})`);
    if (o[1] < o[0]) hatalar.push(`mulk.olcekHucre.${tur}[1]: M ayak izi S'den kucuk olamaz`);
    if (o[2] < o[1]) hatalar.push(`mulk.olcekHucre.${tur}[2]: L ayak izi M'den kucuk olamaz`);
  }
  for (const tur of Object.keys(k.olcekHucre)) {
    if (!(tur in k.yapiYuva)) hatalar.push(`mulk.olcekHucre.${tur}: yapiYuva'da olmayan tur`);
  }
  const c = k.olcekInsaSureCarpaniPpm;
  if (c[0] !== 1_000_000) hatalar.push("mulk.olcekInsaSureCarpaniPpm[0]: S carpani 1000000 olmali (referans)");
  if (c[1] < c[0] || c[2] < c[1]) hatalar.push("mulk.olcekInsaSureCarpaniPpm: kademeler azalamaz (S <= M <= L)");
  // Ek yapi olcek ayak izi (sartname §4.2; yalniz `dukkan` kullanir): tesis tablosuyla ayni kurallar, en cok ENCOK_AYAK_IZI hucre.
  for (const [ad, e] of Object.entries(k.ekYapilar ?? {})) {
    if ((e.birlikKapasitesi ?? 0) > 0 && e.enFazlaIlBasina === undefined) {
      hatalar.push(`mulk.ekYapilar.${ad}: birlikKapasitesi icin enFazlaIlBasina gerekli`);
    }
    const o = e.olcekHucre;
    if (o === undefined) continue;
    if (o[0] !== e.yuva) hatalar.push(`mulk.ekYapilar.${ad}.olcekHucre[0]: S ayak izi yuva degerine (${e.yuva}) esit olmali (bulunan ${o[0]})`);
    if (o[1] < o[0]) hatalar.push(`mulk.ekYapilar.${ad}.olcekHucre[1]: M ayak izi S'den kucuk olamaz`);
    if (o[2] < o[1]) hatalar.push(`mulk.ekYapilar.${ad}.olcekHucre[2]: L ayak izi M'den kucuk olamaz`);
    for (const [i, v] of o.entries()) if (v > MULK_ENCOK_AYAK_IZI) hatalar.push(`mulk.ekYapilar.${ad}.olcekHucre[${i}]: en cok ${MULK_ENCOK_AYAK_IZI} hucre olabilir`);
  }
  // Sebeke (sartname §4.7): mallar tekil, tavan orani (0, 1 000 000] (sema pozitif ister; ust sinir burada). Icerik capraz kurallari (V14) Node dogrulayicisindadir.
  if (k.sebeke !== undefined) {
    benzersizlikKontrolu(hatalar, "mulk.sebeke.mallar", k.sebeke.mallar.map((m) => m.mal));
    for (const [i, m] of k.sebeke.mallar.entries()) {
      if (m.tavanOraniPpm > 1_000_000) hatalar.push(`mulk.sebeke.mallar[${i}] ("${m.mal}").tavanOraniPpm: en fazla 1000000 olabilir (sebeke kamu tavaninin ustunde satamaz)`);
    }
  }
  // Yontem gecersiz kilma (sartname §4.8): ciktiPpm (0, 2 000 000]. Yontem kimligi icerikte olmali kurali Node dogrulayicisindadir (V17).
  for (const [id, v] of Object.entries(k.yontemGecersizKilma ?? {})) {
    if (v.ciktiPpm > 2_000_000) hatalar.push(`mulk.yontemGecersizKilma.${id}.ciktiPpm: en fazla 2000000 olabilir`);
  }
  // Mülk bakımı C (sartname §5.10, V18): aralıklar şemadadır (çarpan (0, 2 000 000], tavan [0, 1 000 000], parça çarpanı (0, 2 000 000]);
  // türev sınır: çarpılmış aşınma değerleri sanayi şemasının sınırında [-1 000 000, 1 000 000] kalmalı. Yöntem kimliği ve bakım miktarı kuralları (V19) Node dogrulayıcısındadır.
  const hiz = k.bakim?.asinmaHizCarpaniPpm;
  if (hiz !== undefined && sanayi !== undefined) {
    const sinir = (yol: string, v: number): void => {
      const c = Math.floor((v * hiz) / 1_000_000);
      if (c < -1_000_000 || c > 1_000_000) hatalar.push(`mulk.bakim.asinmaHizCarpaniPpm: ${yol} (${v}) carpanla ${c} olur; [-1000000, 1000000] disina cikar`);
    };
    sanayi.bakim.duzeyler.forEach((d, i) => sinir(`sanayi.bakim.duzeyler[${i}].asinmaPpmGun`, d.asinmaPpmGun));
    sinir("sanayi.bakim.kitlikAsinmaPpmGun", sanayi.bakim.kitlikAsinmaPpmGun);
  }
}

/** Şema + (içerik verilirse) mal ve birlik kimliklerinin geçerliliği. */
export function dogrulaParametreler(ham: unknown, icerik?: IcerikDosyasi): DogrulamaSonucu {
  const s = semaCalistir(ParametreSema, ham);
  if (!s.tamam) return { gecerli: false, hatalar: s.hatalar };
  const p: Parametreler = s.veri;
  const hatalar: string[] = [];

  if (p.askeri.ilanHazirlikSaatMin > p.askeri.ilanHazirlikSaatMax) {
    hatalar.push("askeri.ilanHazirlikSaatMin: ilanHazirlikSaatMax degerinden buyuk olamaz");
  }
  // ilanHazirlikSaatMin >= 1 ve tamponSaat >= 1 şemada (sema.ts) denetlenir.
  if (p.erkenOyun.bitisSaat < p.erkenOyun.sabitSaat) {
    hatalar.push("erkenOyun.bitisSaat: sabitSaat degerinden kucuk olamaz");
  }
  // Yayılım indirimi %100 olursa maliyet ve süre 0'a iner; en çok %90'a izin verilir.
  if (p.teknoloji.yayilimIndirimiPpm > 900_000) {
    hatalar.push("teknoloji.yayilimIndirimiPpm: en fazla 900000 olabilir (maliyet ve sure 0'a inmemeli)");
  }

  // Tarım katmanı (B1): iklim ve tarim birlikte verilir (ikisi de yoksa tarım kapalı).
  if ((p.iklim === undefined) !== (p.tarim === undefined)) {
    hatalar.push("iklim ve tarim birlikte verilmeli (yalniz biri tanimli; ikisi de yoksa tarim kapali)");
  }
  if (p.iklim !== undefined) iklimKontrolu(hatalar, p.iklim);
  if (p.sanayi !== undefined) sanayiKontrolu(hatalar, p.sanayi);
  pazarKontrolu(hatalar, p.pazar);
  if (p.mulk !== undefined) mulkKontrolu(hatalar, p.mulk, p.sanayi);

  if (icerik !== undefined) {
    const mallar = new Set(icerik.mallar.map((m) => m.id));
    const birlikler = new Set(icerik.birlikler.map((b) => b.id));
    const depolanamaz = new Set(icerik.mallar.filter((m) => m.depolanabilir === false).map((m) => m.id));
    if (p.sanayi !== undefined) {
      if (!depolanamaz.has("elektrik")) hatalar.push('sanayi: icerikte depolanabilir: false "elektrik" mali gerekli');
      const teknolojiler = new Set(icerik.teknolojiler.map((t) => t.id));
      for (const [i, o] of p.sanayi.olcekKademeleri.entries()) {
        if (o.gerekliTeknoloji !== null && !teknolojiler.has(o.gerekliTeknoloji)) {
          hatalar.push(`sanayi.olcekKademeleri[${i}].gerekliTeknoloji: bilinmeyen teknoloji "${o.gerekliTeknoloji}"`);
        }
      }
      for (const m of Object.keys(p.sanayi.damar.kesifMaliyetMal)) {
        if (!mallar.has(m)) hatalar.push(`sanayi.damar.kesifMaliyetMal: bilinmeyen mal "${m}"`);
        else if (depolanamaz.has(m)) hatalar.push(`sanayi.damar.kesifMaliyetMal: "${m}" depolanamaz mal`);
      }
    }
    if (p.tarim !== undefined) {
      if ((icerik.tarimUrunleri ?? []).length === 0) hatalar.push("tarim: icerik.tarimUrunleri (en az 1 urun) gerekli");
      if (!mallar.has("gubre")) hatalar.push('tarim: icerikte "gubre" mali gerekli');
    }
    const malKontrol = (yol: string, kayit: Record<string, number>, tamOlmali = false): void => {
      for (const m of Object.keys(kayit)) {
        if (!mallar.has(m)) hatalar.push(`${yol}: bilinmeyen mal "${m}"`);
      }
      if (tamOlmali) {
        // Depolanamaz mal (elektrik) pazara girmez: değer verilmesine gerek yoktur.
        for (const m of mallar) {
          if (!(m in kayit) && !depolanamaz.has(m)) hatalar.push(`${yol}: "${m}" mali icin deger eksik`);
        }
      }
    };
    for (const [yol, kayit] of [
      ["baslangic.stok", p.baslangic.stok],
      ["pazar.emilimSaat", p.pazar.emilimSaat],
      ["pazar.arzSaat", p.pazar.arzSaat],
      ["lojistik.gelistirmeMaliyeti", p.lojistik.gelistirmeMaliyeti],
    ] as const) {
      for (const m of Object.keys(kayit)) {
        if (depolanamaz.has(m)) hatalar.push(`${yol}: "${m}" depolanamaz mal; burada kullanilamaz`);
      }
    }
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
      // Tarım alanı (B1): başlangıç tarım tesisleri bölgenin tarım tesisi tavanını aşamaz.
      if (b.tarim !== undefined) {
        const tarimTesisi = b.tesisler.filter((tId) => tesisTurleri.get(tId)?.tarimTesisi === true).length;
        if (tarimTesisi > b.tarim.tarimTesisTavani) {
          hatalar.push(`${yol}.tarim.tarimTesisTavani: ${b.tarim.tarimTesisTavani}, ama baslangicta ${tarimTesisi} tarim tesisi var`);
        }
      }
    }
  }
  return sonuc(hatalar);
}

// ---------------------------------------------------------------------------
// Tarım alanı türetme (B1): `bolge.tarim` eksik bölgeler için etiket ve konumdan makul varsayılan
// ---------------------------------------------------------------------------

/** İklim tipi: Köppen benzeri, enlem/boylam/kıyı/dağ kuralları (konum yoksa yalnız etiketler). Tamsayı mikro derece. */
function iklimTipiTuret(b: BolgeTanimi): IklimTipi {
  const kiyi = b.etiketler.includes("kiyi");
  const dag = b.etiketler.includes("dag");
  const k = b.konum;
  if (k === undefined) return dag ? "dag_yayla" : kiyi ? "akdeniz" : "karasal";
  const enlem = k.enlemMikro;
  const boylam = k.boylamMikro;
  // Sıcak-kurak iç bölgeler (Güneydoğu Anadolu benzeri): güneyde ve doğuda, kıyı dışı.
  if (!kiyi && enlem < 38_500_000 && boylam >= 36_000_000) return "kurak";
  if (kiyi) {
    // Karadeniz kıyı şeridi: Türkiye kuzey kıyısı (enlem >= 40,7; boylam >= 28) ile Bulgaristan/Romanya/Ukrayna kıyıları.
    if (enlem >= 40_700_000 && boylam >= 28_000_000) return "karadeniz";
    if (enlem >= 41_700_000 && boylam >= 27_000_000) return "karadeniz";
    return "akdeniz"; // Ege, Akdeniz, Marmara, Adriyatik/İyon kıyıları
  }
  if (dag) return "dag_yayla";
  // Tuna ovası ve Balkan iç bölgeleri: kuzeyde (enlem >= 43) ya da batıda-kuzeyde (boylam < 27, enlem >= 41,5).
  if (enlem >= 43_000_000 || (boylam < 27_000_000 && enlem >= 41_500_000)) return "balkan_kita";
  return "karasal";
}

/**
 * Bir bölgenin tarım alanını etiket ve konumdan türetir; tarım dışı bölge için undefined döner.
 * Tarım bölgesi: "ova", "kiyi" veya "dag" etiketli ya da başlangıçta tarım tesisi (`tarimTesisTurleri`) olan bölge.
 * - toprakTabanPpm: ova 1 000 000, kıyı 800 000, dağ 400 000, diğer 600 000; `kurak` tipte x0,7 (en az 300 000).
 * - iklimTipi: enlem/boylam/kıyı/dağ kuralları (bkz. iklimTipiTuret); konum yoksa dağ -> dag_yayla, kıyı -> akdeniz, aksi karasal.
 * - tarimTesisTavani: ova 3, kıyı 2, dağ 2, diğer 1; başlangıç tarım tesisi sayısından az olamaz.
 * - sulanabilirPpm: ova 600 000, kıyı 400 000, dağ 100 000, diğer 200 000.
 * Tamamen deterministik ve tamsayıdır (rastgelelik yok).
 */
export function varsayilanTarimAlani(
  b: BolgeTanimi,
  tarimTesisTurleri: ReadonlySet<string> = new Set(["ciftlik", "ahir", "mera"]),
): BolgeTarimTanimi | undefined {
  const ova = b.etiketler.includes("ova");
  const kiyi = b.etiketler.includes("kiyi");
  const dag = b.etiketler.includes("dag");
  const baslangicTarim = b.tesisler.filter((t) => tarimTesisTurleri.has(t)).length;
  if (!ova && !kiyi && !dag && baslangicTarim === 0) return undefined;
  const iklimTipi = iklimTipiTuret(b);
  let toprak = ova ? 1_000_000 : kiyi ? 800_000 : dag ? 400_000 : 600_000;
  if (iklimTipi === "kurak") toprak = Math.max(300_000, Math.floor((toprak * 7) / 10));
  const tavan = ova ? 3 : kiyi || dag ? 2 : 1;
  return {
    toprakTabanPpm: toprak,
    iklimTipi,
    tarimTesisTavani: Math.max(tavan, baslangicTarim),
    sulanabilirPpm: ova ? 600_000 : kiyi ? 400_000 : dag ? 100_000 : 200_000,
  };
}

/**
 * Tarım açıksa (`param.tarim` tanımlı) `tarim` alanı eksik bölgelere `varsayilanTarimAlani` ile varsayılan yazar
 * (yerinde; dönen değer doldurulan bölge sayısı). Tarım kapalıysa hiçbir şey yapmaz. Çekirdeğe (ve tarayıcıya)
 * verilen veri paketi bu işlemden sonra verilmelidir; çekirdek eksik alanı türetmez, tarım dışı sayar.
 */
export function tarimAlanlariniTamamla(paket: VeriPaketi): number {
  if (paket.param.tarim === undefined) return 0;
  const turler = new Set(paket.icerik.tesisTurleri.filter((t) => t.tarimTesisi === true).map((t) => t.id));
  let sayi = 0;
  for (const b of paket.harita.bolgeler) {
    if (b.tarim !== undefined) continue;
    const t = varsayilanTarimAlani(b, turler);
    if (t !== undefined) {
      b.tarim = t;
      sayi++;
    }
  }
  return sayi;
}


// ---------------------------------------------------------------------------
// Liman türetme (B3 Pazar): dünya kapıları ve kapıya deniz mesafesi, deniz kenarları grafından
// ---------------------------------------------------------------------------

/** Deniz yoluyla hiçbir dünya kapısına ulaşamayan (kenarsız) limanın varsayılan uzaklığı (saat): kapsamdaki "mesafe" eşiğiyle aynı. */
export const ULASILAMAYAN_LIMAN_MESAFESI_SAAT = 72;

/** Dünya kapısı sayısı: limanların üçte biri, en az 1 ve en çok 4 (9 limanda 3, 27 limanda 4; kapısı olmayan deniz bileşenleri ayrıca ekler). */
function dunyaKapisiSayisi(limanSayisi: number): number {
  return Math.min(4, Math.max(1, Math.floor(limanSayisi / 3)));
}

/**
 * Liman bölgeleri için `LimanTanimi` türetir (yalnız `liman` alanı eksik olanlar için; saf, deterministik, tamsayı).
 * - Dünya kapıları: haritada açıkça `dunyaKapisi: true` işaretli liman varsa onlar; yoksa deniz kenarı sayısı en çok olan
 *   limanlar (sayı = limanların üçte biri, en az 1, en çok 4), eşitlikte kimliği (harf sırası) küçük olan. Her deniz bileşeninde (deniz kenarlarıyla
 *   bağlı bölgeler kümesi) en az bir kapı olur: kapısı olmayan bileşenin en çok bağlı limanı da kapı sayılır.
 * - `dunyaMesafeSaat`: deniz kenarları üzerinde (kenar `sureSaat`) en yakın kapıya en kısa yol (Dijkstra); kapıda 0.
 *   Deniz kenarı olmayan (yalıtılmış) liman `ULASILAMAYAN_LIMAN_MESAFESI_SAAT` alır (kapı değildir).
 * - `kapasiteSinifi`: 1 + (deniz kenarı sayısı - 1) / 2, 1..4 (NGA sınıfının yerine geçen türetme; v1.5 elleçleme için).
 * Dönüş: bölge kimliği -> tanım (yalnız türetilenler).
 */
export function limanTanimlariTuret(harita: HaritaDosyasi): Map<string, LimanTanimi> {
  const bolgeler = harita.bolgeler;
  const n = bolgeler.length;
  const indeks = new Map<string, number>();
  bolgeler.forEach((b, i) => indeks.set(b.id, i));
  const komsu: Array<Array<[number, number]>> = bolgeler.map(() => []);
  for (const k of harita.kenarlar) {
    if (k.tur !== "deniz") continue;
    const a = indeks.get(k.a);
    const b = indeks.get(k.b);
    if (a === undefined || b === undefined || a === b) continue;
    (komsu[a] as Array<[number, number]>).push([b, k.sureSaat]);
    (komsu[b] as Array<[number, number]>).push([a, k.sureSaat]);
  }
  const limanlar: number[] = [];
  for (let i = 0; i < n; i++) if ((bolgeler[i] as BolgeTanimi).etiketler.includes("liman")) limanlar.push(i);
  const derece = (i: number): number => (komsu[i] as Array<[number, number]>).length;
  const kimlikSirasi = (a: number, b: number): number => {
    const x = (bolgeler[a] as BolgeTanimi).id;
    const y = (bolgeler[b] as BolgeTanimi).id;
    return x < y ? -1 : x > y ? 1 : 0;
  };
  // En çok bağlı, eşitlikte kimlik sırası.
  const sirali = [...limanlar].sort((a, b) => derece(b) - derece(a) || kimlikSirasi(a, b));

  // Deniz bileşenleri (BFS; bileşen numarası ilk görülen bölge sırasıyla).
  const bilesen = new Array<number>(n).fill(-1);
  let bilesenSayisi = 0;
  for (let i = 0; i < n; i++) {
    if (bilesen[i] !== -1) continue;
    const kuyruk = [i];
    bilesen[i] = bilesenSayisi;
    for (let h = 0; h < kuyruk.length; h++) {
      for (const [j] of komsu[kuyruk[h] as number] as Array<[number, number]>) {
        if (bilesen[j] === -1) {
          bilesen[j] = bilesenSayisi;
          kuyruk.push(j);
        }
      }
    }
    bilesenSayisi++;
  }

  // Kapılar
  const kapi = new Set<number>();
  for (const i of limanlar) if ((bolgeler[i] as BolgeTanimi).liman?.dunyaKapisi === true) kapi.add(i);
  if (kapi.size === 0) for (const i of sirali.slice(0, dunyaKapisiSayisi(limanlar.length))) kapi.add(i);
  const kapiliBilesen = new Set<number>();
  for (const i of kapi) kapiliBilesen.add(bilesen[i] as number);
  for (const i of sirali) {
    const b = bilesen[i] as number;
    if (kapiliBilesen.has(b) || derece(i) === 0) continue; // yalıtılmış liman kapı sayılmaz
    kapi.add(i);
    kapiliBilesen.add(b);
  }

  // Çok kaynaklı Dijkstra (düğüm sayısı küçük: dizi tabanlı O(V^2), eşitlikte küçük indeks).
  const SONSUZ = Number.MAX_SAFE_INTEGER;
  const mesafe = new Array<number>(n).fill(SONSUZ);
  const bitti = new Array<boolean>(n).fill(false);
  for (const i of kapi) mesafe[i] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!bitti[i] && (mesafe[i] as number) < SONSUZ && (u === -1 || (mesafe[i] as number) < (mesafe[u] as number))) u = i;
    if (u === -1) break;
    bitti[u] = true;
    for (const [v, sure] of komsu[u] as Array<[number, number]>) {
      const yeni = (mesafe[u] as number) + sure;
      if (yeni < (mesafe[v] as number)) mesafe[v] = yeni;
    }
  }

  const sonuc = new Map<string, LimanTanimi>();
  for (const i of limanlar) {
    const b = bolgeler[i] as BolgeTanimi;
    if (b.liman !== undefined) continue;
    const d = mesafe[i] as number;
    const kapiMi = kapi.has(i);
    sonuc.set(b.id, {
      dunyaKapisi: kapiMi,
      dunyaMesafeSaat: kapiMi ? 0 : d >= SONSUZ ? ULASILAMAYAN_LIMAN_MESAFESI_SAAT : Math.min(d, 10_000),
      kapasiteSinifi: Math.min(4, 1 + Math.floor(Math.max(0, derece(i) - 1) / 2)),
    });
  }
  return sonuc;
}

/**
 * Pazar v1 açıksa (`param.pazar.makasPpm` tanımlı) `liman` tanımı eksik liman bölgelerine `limanTanimlariTuret` ile tanım yazar
 * (yerinde; dönen değer doldurulan bölge sayısı). Pazar kapalıysa hiçbir şey yapmaz. Sentetik haritalarda tanım dosyadadır
 * (`pnpm harita:uret`); gerçek haritada (boru hattı liman alanı üretmez) çalışma zamanında bu türetme kullanılır.
 */
export function limanlariTamamla(paket: VeriPaketi): number {
  if (paket.param.pazar.makasPpm === undefined) return 0;
  const turetilen = limanTanimlariTuret(paket.harita);
  let sayi = 0;
  for (const b of paket.harita.bolgeler) {
    const t = turetilen.get(b.id);
    if (t !== undefined && b.liman === undefined) {
      b.liman = t;
      sayi++;
    }
  }
  return sayi;
}
