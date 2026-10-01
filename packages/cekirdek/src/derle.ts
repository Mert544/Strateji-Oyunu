/**
 * İçerik derleyici: VeriPaketi -> DerlenmisIcerik (kimlik -> indeks eşlemeleri, lojistik sırası, komşuluk).
 * Başlangıçta bir kez çalışır; sonuç salt okunurdur ve dünya durumuna girmez.
 */
import type { ParselHucreTanimi, ParselIlceTanimi } from "@bolge/veri";
import { carpBol } from "./sabit";
import { GUN, PPM } from "./tipler";
import { kamuGrubuHucreKimlikleri, kamuKumeleriHesapla } from "./mulk/kamu";
import type { CekirdekVeriPaketi, DerlenmisEkYapi, DerlenmisIcerik, DerlenmisMulk, HucreId, KamuKumesi } from "./tipler";

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
 * İçeriği derler: indeks eşlemeleri, lojistikSirasi (lojistikOnceligi artan, eşitlikte mal indeksi)
 * ve komsuKenarlar (bölge -> kenar indeksleri, artan). Yinelenen kimlik veya bilinmeyen kenar ucu hata verir.
 */
export function icerikDerle(veri: CekirdekVeriPaketi): DerlenmisIcerik {
  const { harita, icerik, param } = veri;
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
    tesisTurleri: icerik.tesisTurleri,
    tesisTuruIndeks,
    teknolojiler: icerik.teknolojiler,
    teknolojiIndeks,
    birlikler: icerik.birlikler,
    birlikIndeks,
    bolgeIndeks,
    lojistikSirasi,
    komsuKenarlar,
  };
  // Mülk kipi (S3): parametre ve parsel fikstürü BİRLİKTE verilirse açılır (tarımdaki iklim + tarim gibi); aksi halde alan yazılmaz.
  if (param.mulk !== undefined && veri.parsel !== undefined) ic.mulk = mulkDerle(veri, ic);
  return ic;
}

/**
 * Mülk verisini derler: il -> merkez bölge, ilçe ve hücre dizinleri, tesis türü -> yuva / inşa süresi, başlangıç kiti.
 * Fikstür, haritayla tutarsızsa (bilinmeyen bölge, tekrarlanan il/ilçe/hücre) veya parametre bilinmeyen tesis türü / mal
 * içeriyorsa hata verir.
 */
function mulkDerle(veri: CekirdekVeriPaketi, ic: DerlenmisIcerik): DerlenmisMulk {
  const p = veri.param.mulk as NonNullable<CekirdekVeriPaketi["param"]["mulk"]>;
  const f = veri.parsel as NonNullable<CekirdekVeriPaketi["parsel"]>;
  const ilMerkezi = new Map<string, number>();
  for (const il of f.iller) {
    const bi = ic.bolgeIndeks[il.bolge];
    if (bi === undefined) throw new Error(`icerikDerle: parsel ili ${il.id} bilinmeyen bolgeye bagli: ${il.bolge}`);
    if (ilMerkezi.has(il.id)) throw new Error(`icerikDerle: tekrarlanan parsel ili: ${il.id}`);
    ilMerkezi.set(il.id, bi);
  }
  const ilceler = new Map<string, ParselIlceTanimi>();
  const hucreler = new Map<HucreId, { ilce: string; hucre: ParselHucreTanimi }>();
  for (const c of f.ilceler) {
    if (!ilMerkezi.has(c.il)) throw new Error(`icerikDerle: ilce ${c.id} bilinmeyen ile bagli: ${c.il}`);
    if (ilceler.has(c.id)) throw new Error(`icerikDerle: tekrarlanan ilce: ${c.id}`);
    ilceler.set(c.id, c);
    for (const h of c.hucreler) {
      if (hucreler.has(h.id)) throw new Error(`icerikDerle: hucre iki kez tanimli: ${h.id}`);
      hucreler.set(h.id, { ilce: c.id, hucre: h });
    }
  }
  const yuva = ic.tesisTurleri.map(() => 0);
  const insaSaati = ic.tesisTurleri.map((t) => t.insaSuresiSaat);
  for (const tid of Object.keys(p.yapiYuva).sort()) {
    const ti = ic.tesisTuruIndeks[tid];
    if (ti === undefined) throw new Error(`icerikDerle: mulk.yapiYuva bilinmeyen tesis turu: ${tid}`);
    yuva[ti] = p.yapiYuva[tid] as number;
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
  const kamu = p.kamu === undefined ? undefined : kamuKumeleriHesapla(f, p.kamu);
  const ayrilmis = ayrilmisHucreler(f.ilceler, p.yeniOyuncu.ayrilmisHucrePpm, kamu);
  const ayrilmisSureMs = (p.yeniOyuncu.ayrilmisGun ?? AYRILMIS_GUN_VARSAYILAN) * GUN;
  const sonuc: DerlenmisMulk = { p, fikstur: f, ilMerkezi, ilceler, hucreler, yuva, insaSaati, baslangicStok, ekYapilar, ekYapiIndeks, ayrilmis, ayrilmisSureMs };
  if (kamu !== undefined) sonuc.kamu = kamu;
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

/**
 * Yeni oyunculara ayrılmış hücreler: her ilçenin uygun hücreleri (karma, kimlik) sırasıyla dizilir ve ilk
 * `floor(uygun × ayrilmisPpm / PPM)` tanesi ayrılır (karma kimlikten türediği için dağılım ilçeye yayılır, seçim deterministiktir).
 */
function ayrilmisHucreler(ilceler: readonly ParselIlceTanimi[], ayrilmisPpm: number, kamu?: ReadonlyMap<string, KamuKumesi>): Set<HucreId> {
  const kume = new Set<HucreId>();
  if (ayrilmisPpm <= 0) return kume;
  for (const c of ilceler) {
    // Kamu arsası (satılmaz) ayrılmış hücre paydasına ve kümesine girmez.
    const kk = kamu?.get(c.id);
    const kamuKimlikleri = new Set<string>();
    for (const gr of kk?.gruplar ?? []) for (const id of kamuGrubuHucreKimlikleri(gr)) kamuKimlikleri.add(id);
    const kamuMu = (id: string): boolean => kamuKimlikleri.has(id);
    const uygun = c.hucreler.filter((h) => h.uygun && !kamuMu(h.id)).map((h) => ({ id: h.id, k: hucreKarmasi(h.id) }));
    const adet = carpBol(uygun.length, ayrilmisPpm, PPM);
    if (adet <= 0) continue;
    uygun.sort((x, y) => x.k - y.k || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    for (let i = 0; i < adet; i++) kume.add((uygun[i] as { id: string }).id);
  }
  return kume;
}
