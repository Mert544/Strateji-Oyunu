/**
 * İçerik derleyici: VeriPaketi -> DerlenmisIcerik (kimlik -> indeks eşlemeleri, lojistik sırası, komşuluk).
 * Başlangıçta bir kez çalışır; sonuç salt okunurdur ve dünya durumuna girmez.
 */
import type { ParselFiksturu } from "@bolge/veri";
import { carpBol } from "./sabit";
import { GUN, PPM } from "./tipler";
import { HucreDizini } from "./mulk/hucreDizini";
import { kamuKumeleriHesapla } from "./mulk/kamu";
import { kamuIthalatCarpaniHesapla } from "./mulk/kamuFiyat";
import { perakendeDerle } from "./perakende/derle";
import type { CekirdekVeriPaketi, DerlenmisEkYapi, DerlenmisIcerik, DerlenmisMulk, DerlenmisMulkBakim, DerlenmisSebeke } from "./tipler";

/** Derleme zamanı anahtarı: bkz. `mulkDerle`. */
declare const __BOLGE_MULKSUZ__: boolean | undefined;
const MULKSUZ_PAKET: boolean = typeof __BOLGE_MULKSUZ__ !== "undefined" && __BOLGE_MULKSUZ__ === true;

/** Kimlik listesinden kimlik -> indeks eşlemesi; tekrarlanan kimlikte hata. Prototipsiz nesne (örn. "constructor" güvenli). */
function indeksle(tur: string, kimlikler: readonly string[]): Record<string, number> {
  const harita: Record<string, number> = Object.create(null) as Record<string, number>;
  for (let i = 0; i < kimlikler.length; i++) {
    const id = kimlikler[i] as string;
    if (id in harita) throw new Error(`icerikDerle: tekrarlanan ${tur} kimligi: ${id}`);
    harita[id] = i;
  }
  return harita;
}

/**
 * Bölge kipi: `mulkKipi` yöntemleri tesis türü listelerinden süzülür (bölge botları, komutları ve tablolar onları görmez); `icerik.yontemler`, `ic.yontemler` ve
 * indeks tabloları (`yontemIndeks`, `tesisTuruIndeks`) DEĞİŞMEZ (indeksler sabit; kimlik tablosu tam içerikten kurulur). İçerik nesnesine DOKUNULMAZ (kopya):
 * hiçbir yöntem `mulkKipi` değilse aynı dizi referansı döner (bugünkü davranış bit bit aynı). Tür varsayılanı (`yontemler[0]`) `mulkKipi` olamaz (veri doğrulayıcı), yani
 * süzgeç ilk yöntemi hiç değiştirmez.
 */
function bolgeKipiTurleri(icerik: CekirdekVeriPaketi["icerik"]): CekirdekVeriPaketi["icerik"]["tesisTurleri"] {
  const mulkOnly = new Set(icerik.yontemler.filter((y) => y.mulkKipi === true).map((y) => y.id));
  if (mulkOnly.size === 0) return icerik.tesisTurleri;
  return icerik.tesisTurleri.map((t) => (t.yontemler.some((y) => mulkOnly.has(y)) ? { ...t, yontemler: t.yontemler.filter((y) => !mulkOnly.has(y)) } : t));
}

/**
 * İçeriği derler: indeks eşlemeleri, lojistikSirasi (lojistikOnceligi artan, eşitlikte mal indeksi)
 * ve komsuKenarlar (bölge -> kenar indeksleri, artan). Yinelenen kimlik veya bilinmeyen kenar ucu hata verir.
 */
export function icerikDerle(veri: CekirdekVeriPaketi): DerlenmisIcerik {
  const { harita, icerik, param } = veri;
  // Mülk kipi açık mı (S3): parametre ve parsel dünyası (fikstür ya da ızgara) BİRLİKTE verilmişse. Bölge kipinde `mulkKipi` yöntemleri tür listelerinden süzülür (G6, §5.5).
  const mulkAcik = param.mulk !== undefined && (veri.parsel !== undefined || veri.parselIzgara !== undefined);
  const malIndeks = indeksle("mal", icerik.mallar.map((m) => m.id));
  const yontemIndeks = indeksle("yontem", icerik.yontemler.map((y) => y.id));
  const tesisTuruIndeks = indeksle("tesis turu", icerik.tesisTurleri.map((t) => t.id));
  const teknolojiIndeks = indeksle("teknoloji", icerik.teknolojiler.map((t) => t.id));
  const birlikIndeks = indeksle("birlik", icerik.birlikler.map((b) => b.id));
  const bolgeIndeks = indeksle("bolge", harita.bolgeler.map((b) => b.id));

  // Depolanamaz mal (elektrik, B2) lojistikten geçmez: akış çözümü bu sıradan çıkarılır.
  const lojistikSirasi = icerik.mallar
    .map((m, i) => ({ i, o: m.lojistikOnceligi, depolanabilir: m.depolanabilir !== false }))
    .filter((x) => x.depolanabilir)
    .sort((x, y) => x.o - y.o || x.i - y.i)
    .map((x) => x.i);

  const komsuKenarlar: number[][] = harita.bolgeler.map(() => []);
  for (let k = 0; k < harita.kenarlar.length; k++) {
    const kenar = harita.kenarlar[k];
    if (!kenar) continue;
    const a = bolgeIndeks[kenar.a];
    const b = bolgeIndeks[kenar.b];
    if (a === undefined || b === undefined) {
      throw new Error(`icerikDerle: kenar ${k} bilinmeyen bolgeye bagli (${kenar.a} - ${kenar.b})`);
    }
    (komsuKenarlar[a] as number[]).push(k);
    if (b !== a) (komsuKenarlar[b] as number[]).push(k);
  }

  const ic: DerlenmisIcerik = {
    harita,
    icerik,
    param,
    mallar: icerik.mallar,
    malIndeks,
    yontemler: icerik.yontemler,
    yontemIndeks,
    tesisTurleri: mulkAcik ? icerik.tesisTurleri : bolgeKipiTurleri(icerik),
    tesisTuruIndeks,
    teknolojiler: icerik.teknolojiler,
    teknolojiIndeks,
    birlikler: icerik.birlikler,
    birlikIndeks,
    bolgeIndeks,
    lojistikSirasi,
    komsuKenarlar,
  };
  odulTablosunuDogrula(ic);
  // Mülk kipi (S3): parametre ve parsel fikstürü BİRLİKTE verilirse açılır (tarımdaki iklim + tarim gibi); aksi halde alan yazılmaz.
  if (mulkAcik) ic.mulk = mulkDerle(veri, ic);
  // Mal ve yapı KİMLİK KİLİDİ burada DEĞİLDİR (docs/06 §15.8): veri doğrulaması (`dogrulaVeriPaketi`) ve yükleyiciler uygular; çekirdek (istemci
  // paketine girer) `@bolge/veri`den yalnız TİP alır (src'de çalışma zamanı importu yoktur; `veri-importu.test.ts` güvence).
  return ic;
}

/**
 * Ödül tablosu (para güvenliği, docs/06 §15.7) ve kasa parametresi anlamsal denetimi: her ödül kavramı en az bir para/mal taşır (yalnız kozmetik/bilgi
 * kavramları çekirdeğe GİRMEZ), mal kimlikleri içerikte, değerler pozitif; her kavram tek başına tavanı aşmaz; kasa payları PPM'i aşmaz.
 */
function odulTablosunuDogrula(ic: DerlenmisIcerik): void {
  const t = ic.param.odul;
  if (t !== undefined) {
    for (const k of Object.keys(t.kavramlar).sort()) {
      const v = t.kavramlar[k] as NonNullable<typeof t.kavramlar[string]>;
      let deger = v.para ?? 0;
      for (const mid of Object.keys(v.mal ?? {}).sort()) {
        const mi = ic.malIndeks[mid];
        if (mi === undefined) throw new Error(`icerikDerle: odul.${k} bilinmeyen mal: ${mid}`);
        const q = (v.mal as Record<string, number>)[mid] as number;
        if (q <= 0) throw new Error(`icerikDerle: odul.${k}.mal.${mid} pozitif olmali`);
        deger += carpBol(q, (ic.mallar[mi] as { tabanFiyat: number }).tabanFiyat, 1000);
      }
      if (deger <= 0) throw new Error(`icerikDerle: odul kavrami ${k} para ya da mal tasimali (yalniz kozmetik/bilgi kavramlari cekirdege girmez; profilde tutulur)`);
      if (deger > t.tavanMili) throw new Error(`icerikDerle: odul kavrami ${k} tek basina tavani asiyor (${deger} > ${t.tavanMili})`);
    }
  }
  const kasa = ic.param.mulk?.kasa;
  if (kasa !== undefined && kasa.vergiPayi.mahallePpm + kasa.vergiPayi.ilcePpm + kasa.vergiPayi.ilPpm > PPM) {
    throw new Error("icerikDerle: mulk.kasa.vergiPayi toplami PPM'i asiyor");
  }
}

/**
 * Mülk verisini derler: il -> merkez bölge, ilçe ve hücre dizinleri, tesis türü -> yuva / inşa süresi, başlangıç kiti.
 * Fikstür, haritayla tutarsızsa (bilinmeyen bölge, tekrarlanan il/ilçe/hücre) veya parametre bilinmeyen tesis türü / mal
 * içeriyorsa hata verir.
 */
function mulkDerle(veri: CekirdekVeriPaketi, ic: DerlenmisIcerik): DerlenmisMulk {
  const p = veri.param.mulk as NonNullable<CekirdekVeriPaketi["param"]["mulk"]>;
  if (veri.parsel !== undefined && veri.parselIzgara !== undefined) throw new Error("icerikDerle: parsel ve parselIzgara birlikte verilemez");
  // Yalnız istemci işçisi paketlemesinde (vite `define`) true: bölge kipli tarayıcı simülasyonu parsel dünyası açmaz; hücre dizini sınıfı pakete girmez.
  // Sunucu, testler ve ölçümde sabit tanımsızdır (mülk kipi tam çalışır); davranış ve altınlar değişmez.
  if (MULKSUZ_PAKET) throw new Error("icerikDerle: mulk kipi (parsel dunyasi) bu paketlemede yok");
  // Kompakt hücre dizini (docs/06 §15.11): JSON fikstüründen ya da BHI1 ızgaralarından; iki yol aynı API'yi ve aynı dünyayı kurar.
  let hucreDizini: HucreDizini;
  let f: ParselFiksturu;
  if (veri.parsel !== undefined) {
    f = veri.parsel;
    hucreDizini = HucreDizini.fiksturden(f);
  } else {
    const g = veri.parselIzgara as NonNullable<CekirdekVeriPaketi["parselIzgara"]>;
    hucreDizini = HucreDizini.izgaradan(g);
    f = hucreDizini.fiksturOlustur(g);
  }
  const ilMerkezi = new Map<string, number>();
  for (const il of f.iller) {
    const bi = ic.bolgeIndeks[il.bolge];
    if (bi === undefined) throw new Error(`icerikDerle: parsel ili ${il.id} bilinmeyen bolgeye bagli: ${il.bolge}`);
    if (ilMerkezi.has(il.id)) throw new Error(`icerikDerle: tekrarlanan parsel ili: ${il.id}`);
    ilMerkezi.set(il.id, bi);
  }
  const ilceler = new Map<string, (typeof f.ilceler)[number]>();
  for (const c of f.ilceler) {
    if (!ilMerkezi.has(c.il)) throw new Error(`icerikDerle: ilce ${c.id} bilinmeyen ile bagli: ${c.il}`);
    if (ilceler.has(c.id)) throw new Error(`icerikDerle: tekrarlanan ilce: ${c.id}`);
    ilceler.set(c.id, c);
  }
  const yuva = ic.tesisTurleri.map(() => 0);
  const insaSaati = ic.tesisTurleri.map((t) => t.insaSuresiSaat);
  const olcekHucre: number[][] = ic.tesisTurleri.map(() => []);
  for (const tid of Object.keys(p.yapiYuva).sort()) {
    const ti = ic.tesisTuruIndeks[tid];
    if (ti === undefined) throw new Error(`icerikDerle: mulk.yapiYuva bilinmeyen tesis turu: ${tid}`);
    yuva[ti] = p.yapiYuva[tid] as number;
    const o = p.olcekHucre[tid];
    if (o === undefined || o[0] !== yuva[ti] || o[1] < o[0] || o[2] < o[1]) throw new Error(`icerikDerle: mulk.olcekHucre.${tid}: [S = yapiYuva, M >= S, L >= M] olmali`);
    olcekHucre[ti] = [o[0], o[1], o[2]];
  }
  for (const tid of Object.keys(p.olcekHucre)) {
    if (!(tid in p.yapiYuva)) throw new Error(`icerikDerle: mulk.olcekHucre yapiYuva'da olmayan tur: ${tid}`);
  }
  for (const tid of Object.keys(p.yapiInsaSaati ?? {}).sort()) {
    const ti = ic.tesisTuruIndeks[tid];
    if (ti === undefined) throw new Error(`icerikDerle: mulk.yapiInsaSaati bilinmeyen tesis turu: ${tid}`);
    insaSaati[ti] = (p.yapiInsaSaati as Record<string, number>)[tid] as number;
  }
  const baslangicStok = ic.mallar.map(() => 0);
  for (const mid of Object.keys(p.yeniOyuncu.baslangicStok).sort()) {
    const mi = ic.malIndeks[mid];
    if (mi === undefined) throw new Error(`icerikDerle: mulk.yeniOyuncu.baslangicStok bilinmeyen mal: ${mid}`);
    baslangicStok[mi] = p.yeniOyuncu.baslangicStok[mid] as number;
  }
  // Ek yapılar (Ambar, Ticaret ofisi...): kimliğe göre sıralı; tesis türü kimlikleriyle çakışamaz; malzeme mal indeksine çevrilir.
  const ekYapilar: DerlenmisEkYapi[] = [];
  const ekYapiIndeks = new Map<string, number>();
  const ey = p.ekYapilar ?? {};
  for (const eid of Object.keys(ey).sort()) {
    const t = ey[eid] as NonNullable<typeof p.ekYapilar>[string];
    if (eid in ic.tesisTuruIndeks) throw new Error(`icerikDerle: mulk.ekYapilar kimligi tesis turuyle cakisiyor: ${eid}`);
    const maliyet: [number, number][] = [];
    for (const mid of Object.keys(t.insaMaliyeti).sort()) {
      const mi = ic.malIndeks[mid];
      if (mi === undefined) throw new Error(`icerikDerle: mulk.ekYapilar.${eid}.insaMaliyeti bilinmeyen mal: ${mid}`);
      maliyet.push([mi, t.insaMaliyeti[mid] as number]);
    }
    maliyet.sort((x, y) => x[0] - y[0]);
    ekYapiIndeks.set(eid, ekYapilar.length);
    ekYapilar.push({
      id: eid,
      ad: t.ad,
      yuva: t.yuva,
      insaSaati: t.insaSaati,
      insaParasi: t.insaParasi,
      insaMaliyeti: maliyet,
      enFazlaIlBasina: t.enFazlaIlBasina ?? Number.MAX_SAFE_INTEGER,
      depoKapasiteEkiMili: t.depoKapasiteEkiMili ?? 0,
      komisyonIndirimPpm: t.komisyonIndirimPpm ?? 0,
      makasIndirimPpm: t.makasIndirimPpm ?? 0,
      emirYuvasi: t.emirYuvasi ?? 0,
    });
  }
  // Kamu arsası (`p.kamu`): her ilçenin kamu kümesi (mülk dünyası kurulurken dondurulur); ayrılmış hücre hesabından düşülür.
  const kamu = p.kamu === undefined ? undefined : kamuKumeleriHesapla(hucreDizini, p.kamu);
  const ayrilmisIlceSayisi = hucreDizini.ayrilmisKur(p.yeniOyuncu.ayrilmisHucrePpm, kamu);
  const ayrilmisSureMs = (p.yeniOyuncu.ayrilmisGun ?? AYRILMIS_GUN_VARSAYILAN) * GUN;
  const kamuIthalatCarpaniPpm = kamuIthalatCarpaniHesapla(ic.param.pazar, ekYapilar);
  const sonuc: DerlenmisMulk = { p, fikstur: f, dizin: hucreDizini, ilMerkezi, ilceler, hucreler: hucreDizini.hucreler, yuva, olcekHucre, insaSaati, baslangicStok, ekYapilar, ekYapiIndeks, ayrilmis: hucreDizini.ayrilmis, ayrilmisIlceSayisi, ayrilmisSureMs, kamuIthalatCarpaniPpm };
  if (kamu !== undefined) sonuc.kamu = kamu;
  // Şebeke (sartname §4.6, §5.2.4): blok yoksa alan OLUŞMAZ. Birim fiyat TABANDAN derleme zamanında bir kez sabitlenir:
  // tabanFiyat x kamuIthalatCarpaniPpm x tavanOraniPpm (canlı pazar fiyatı yolu YOKTUR). Elektrik anlık denge yolu, diğer (depolanabilir) mallar stoksuz tüketim anı yolu.
  if (p.sebeke !== undefined) {
    const kayitlar: { mal: number; birimFiyatMili: number; elektrik: boolean }[] = [];
    const gorulen = new Set<string>();
    for (const m of p.sebeke.mallar) {
      const mi = ic.malIndeks[m.mal];
      if (mi === undefined) throw new Error(`icerikDerle: mulk.sebeke.mallar bilinmeyen mal: ${m.mal}`);
      if (gorulen.has(m.mal)) throw new Error(`icerikDerle: mulk.sebeke.mallar tekrarlanan mal: ${m.mal}`);
      gorulen.add(m.mal);
      if (!Number.isSafeInteger(m.tavanOraniPpm) || m.tavanOraniPpm <= 0 || m.tavanOraniPpm > PPM) throw new Error(`icerikDerle: mulk.sebeke.mallar.${m.mal}.tavanOraniPpm (0, ${PPM}] araliginda tamsayi olmali`);
      const taban = (ic.mallar[mi] as { tabanFiyat: number }).tabanFiyat;
      kayitlar.push({ mal: mi, birimFiyatMili: carpBol(carpBol(taban, kamuIthalatCarpaniPpm, PPM), m.tavanOraniPpm, PPM), elektrik: m.mal === "elektrik" });
    }
    if (!Number.isSafeInteger(p.sebeke.kasaPayiPpm) || p.sebeke.kasaPayiPpm < 0 || p.sebeke.kasaPayiPpm > PPM) throw new Error(`icerikDerle: mulk.sebeke.kasaPayiPpm [0, ${PPM}] araliginda tamsayi olmali`);
    const stoksuz = kayitlar.filter((k) => !k.elektrik).sort((a, b) => a.mal - b.mal).map((k) => ({ mal: k.mal, birimFiyatMili: k.birimFiyatMili }));
    const stoksuzIndeks = ic.mallar.map(() => -1);
    stoksuz.forEach((k, i) => (stoksuzIndeks[k.mal] = i));
    const sebeke: DerlenmisSebeke = { stoksuz, stoksuzIndeks, kasaPayiPpm: p.sebeke.kasaPayiPpm };
    const el = kayitlar.find((k) => k.elektrik);
    if (el !== undefined) sebeke.elektrik = { mal: el.mal, birimFiyatMili: el.birimFiyatMili };
    sonuc.sebeke = sebeke;
  }
  // Perakende / dükkân (G7; sartname §4.6): blok yoksa alan OLUŞMAZ (`perakende/derle.ts`; saf, durum yazmaz).
  const perakende = perakendeDerle(veri, ic);
  if (perakende !== undefined) sonuc.perakende = perakende;
  // Yöntem çıktısı yedek geçersiz kılma (sartname §5.9; varsayılan KAPALI): tablo YALNIZ `ciktiPpm !== PPM` satırlarından kurulur; hepsi PPM ise ya da blok yoksa alan
  // HİÇ OLUŞMAZ (çekirdeğin kod yolu atlanır, bit-exact no-op). Çekirdek yolu (`ciktiCarpaniHesapla`) G6-2'dedir.
  const gecersiz = p.yontemGecersizKilma;
  if (gecersiz !== undefined) {
    const tablo: Record<number, number> = {};
    let etkin = false;
    for (const yid of Object.keys(gecersiz).sort()) {
      const yi = ic.yontemIndeks[yid];
      if (yi === undefined) throw new Error(`icerikDerle: mulk.yontemGecersizKilma bilinmeyen yontem: ${yid}`);
      const ppm = (gecersiz[yid] as { ciktiPpm: number }).ciktiPpm;
      if (!Number.isSafeInteger(ppm) || ppm <= 0 || ppm > 2 * PPM) throw new Error(`icerikDerle: mulk.yontemGecersizKilma.${yid}.ciktiPpm (0, ${2 * PPM}] araliginda tamsayi olmali`);
      if (ppm !== PPM) {
        tablo[yi] = ppm;
        etkin = true;
      }
    }
    if (etkin) sonuc.yontemCiktiPpm = tablo;
  }
  // Mülk bakımı C (sartname §5.10.3): tablo YALNIZ etkin satırlardan (çarpan !== PPM, tavan sanayi değerinden farklı, parça çarpanı !== PPM); hiç yoksa alan oluşmaz.
  const mb = p.bakim;
  if (mb !== undefined) {
    const o: DerlenmisMulkBakim = {};
    const sp = ic.param.sanayi; // sanayi kapalıysa aşınma alanları okunmaz (veri doğrulayıcı uyarır: aşınma yalnız sanayi açıkken çalışır)
    const h = mb.asinmaHizCarpaniPpm;
    if (h !== undefined && (!Number.isSafeInteger(h) || h <= 0 || h > 2 * PPM)) throw new Error(`icerikDerle: mulk.bakim.asinmaHizCarpaniPpm (0, ${2 * PPM}] araliginda tamsayi olmali`);
    if (sp !== undefined && h !== undefined && h !== PPM) {
      o.duzeyAsinmaPpmGun = [0, 1, 2].map((i) => carpBol((sp.bakim.duzeyler[i] as { asinmaPpmGun: number }).asinmaPpmGun, h, PPM)) as [number, number, number];
      o.kitlikAsinmaPpmGun = carpBol(sp.bakim.kitlikAsinmaPpmGun, h, PPM);
    }
    const t = mb.asinmaVerimKaybiTavaniPpm;
    if (t !== undefined && (!Number.isSafeInteger(t) || t < 0 || t > PPM)) throw new Error(`icerikDerle: mulk.bakim.asinmaVerimKaybiTavaniPpm [0, ${PPM}] araliginda tamsayi olmali`);
    if (sp !== undefined && t !== undefined && t !== sp.bakim.asinmaVerimKaybiTavaniPpm) o.tavanPpm = t;
    if (mb.yontemParcaPpm !== undefined) {
      const tablo: Record<number, number> = {};
      for (const yid of Object.keys(mb.yontemParcaPpm).sort()) {
        const yi = ic.yontemIndeks[yid];
        if (yi === undefined) throw new Error(`icerikDerle: mulk.bakim.yontemParcaPpm bilinmeyen yontem: ${yid}`);
        const ppm = mb.yontemParcaPpm[yid] as number;
        if (!Number.isSafeInteger(ppm) || ppm <= 0 || ppm > 2 * PPM) throw new Error(`icerikDerle: mulk.bakim.yontemParcaPpm.${yid} (0, ${2 * PPM}] araliginda tamsayi olmali`);
        const bakim = Object.values((ic.yontemler[yi] as { bakim: Record<string, number> }).bakim);
        if (bakim.length === 0) throw new Error(`icerikDerle: mulk.bakim.yontemParcaPpm bakim girdisi bos yontem: ${yid}`);
        if (bakim.some((q) => carpBol(q, ppm, PPM) < 1)) throw new Error(`icerikDerle: mulk.bakim.yontemParcaPpm miktar 0'a iner: ${yid}`);
        if (ppm !== PPM) tablo[yi] = ppm;
      }
      if (Object.keys(tablo).length > 0) o.yontemParcaPpm = tablo;
    }
    if (Object.keys(o).length > 0) sonuc.bakim = o;
  }
  return sonuc;
}

/** Ayrılmış hücre süresinin varsayılanı (gün). */
const AYRILMIS_GUN_VARSAYILAN = 14;

/** 32 bit FNV-1a (yalnız tamsayı işlemleri): hücre kimliği karması. */
export function hucreKarmasi(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
