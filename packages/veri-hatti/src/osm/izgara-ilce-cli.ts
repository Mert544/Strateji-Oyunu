/**
 * İlçe ızgarası üretimi ve manifest bakımı.
 *
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --ilce tr_16_gemlik --ilce tr_41_korfez [--dogrula]
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --rapor        # manifestten boyut tablosu (markdown)
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --kontrol      # manifest + dosya sha256 doğrulaması
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --nufus        # manifestteki ilçelere yapilandirma/ilce-nufus.json'dan nufus yazar (ağ gerekmez)
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --ilce tr_67_kilimli --hazirlik
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --ilce tr_67_kilimli --sinir-topojson <dosya> --hedef <odbl-disindaki-dizin> --manifest <hedef/manifest.json> [--hazirlik]
 *
 * Çıktılar packages/veri/haritalar/odbl/izgara/ altına (ODbL dizini) ve manifest.json'a yazılır. Karo özütü yoksa
 * `pmtiles extract` ile sabitlenmiş Protomaps yapısından alınır (ağ). Erişilemezse hat durur; veri uydurulmaz.
 * --dogrula: ilçeyi iki ayrı dizine üretir ve bayt bayt karşılaştırır; fark varsa çıkış kodu 1.
 * --hazirlik: salt okunur çevrimdışı önkontrol; eksik girdi ve araçları topluca raporlar.
 * Yerel TopoJSON nicemlenmiş bir girdidir; ham OSM çıktısıyla aynı baytlar vaat edilmez. Yerel üretim izole kalır.
 */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { ONBELLEK } from "../yollar";
import { ilceNufusu } from "./ilce-nufus";
import { IzgaraManifestSemasi, IZGARA_MANIFEST_YOLU, manifestOku, manifestiDogrula, sha256Hex, type IlceIzgarasi, type IzgaraManifesti } from "./izgara-manifest";
import { KARO_KAYNAK_URL, KARO_YAPISI, idariHalkalar, ilceBilgisi, ilceIzgarasiUret, type IlceBilgisi, type IlceUretimi, type SinirKaynagi } from "./izgara-ilce";
import { izgaraHazirligi } from "./izgara-hazirlik";
import { yerelTopojsonHalkalari, type IlceSiniri } from "./izgara-yerel-sinir";
import { VARSAYILAN_SECENEKLER } from "./izgara-uygunluk";
import { ODBL_DIZINI, OSM_ATIF } from "./ortak";

const IZGARA_DIZINI = resolve(ODBL_DIZINI, "izgara");

/**
 * Sprint 1'de `ornek/` altına konan ve istemcinin okuduğu Gebze dosyaları. Yolları değişmez (istemci kodu bunlara bağlı);
 * BHI1 üretimle bayt bayt aynı olmak ZORUNDADIR (değilse hat durur), şerit PMTiles'ın yalnız üst verisi (makine yolu)
 * yerden bağımsız hâle getirildiği için yeniden yazılır.
 */
const ESKI_KONUM: Record<string, { bhi: string; seritler: string }> = {
  tr_41_gebze: { bhi: "ornek/gebze-hucreler.bhi.gz", seritler: "ornek/gebze-seritler.pmtiles" },
};

function argumanlar(ad: string): string[] {
  const r: string[] = [];
  process.argv.forEach((a, i) => {
    if (a === `--${ad}`) {
      const deger = process.argv[i + 1];
      if (!deger || deger.startsWith("--")) throw new Error(`--${ad} deger gerektirir`);
      r.push(deger);
    }
  });
  return r;
}
const bayrak = (ad: string): boolean => process.argv.includes(`--${ad}`);

const tekArguman = (ad: string): string | undefined => {
  const degerler = argumanlar(ad);
  if (degerler.length > 1) throw new Error(`--${ad} yalniz bir kez kullanilabilir`);
  return degerler[0];
};

/** Henüz oluşmamış yollar için de mevcut ebeveyn symlink'lerini çözer. */
function gercekYol(yol: string): string {
  const tam = resolve(yol);
  if (existsSync(tam)) return realpathSync(tam);
  // existsSync kırık symlink için false döner; böyle bir yazım hedefini güvenli bir dizin gibi kabul etmeyiz.
  try {
    if (lstatSync(tam).isSymbolicLink()) throw new Error(`kirik symlink cikti yolu: ${tam}`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const ebeveyn = dirname(tam);
  if (ebeveyn === tam) return tam;
  return resolve(gercekYol(ebeveyn), relative(ebeveyn, tam));
}

function icinde(yol: string, kok: string): boolean {
  const r = relative(gercekYol(kok), gercekYol(yol));
  return r === "" || (!isAbsolute(r) && r !== ".." && !r.startsWith("../") && !r.startsWith("..\\"));
}

function kaynakAyni(a: SinirKaynagi, b: SinirKaynagi): boolean {
  return a.dosya === b.dosya && a.osmZamani === b.osmZamani && a.sha256 === b.sha256;
}

/** Tek kaynak alanıyla farklı sınırlar karıştırılmaz; kontrol her türlü çıktı yazımından önce yapılır. */
function kaynakUyumunuDogrula(bilgiler: readonly IlceBilgisi[], sinirlar: ReadonlyMap<string, IlceSiniri>, manifestYolu: string): void {
  const ilk = sinirlar.get(bilgiler[0]!.kimlik)?.kaynak;
  if (!ilk || bilgiler.some((b) => !sinirlar.has(b.kimlik))) throw new Error("uretim icin tum ilce sinirlari gerekli");
  if (bilgiler.some((b) => !kaynakAyni(ilk, sinirlar.get(b.kimlik)!.kaynak)))
    throw new Error("tek manifestte farkli sinir kaynaklari birlestirilemez; ayri --hedef ve --manifest kullanin");
  if (!existsSync(manifestYolu)) return;
  const mevcut = manifestOku(manifestYolu);
  if (!kaynakAyni(mevcut.kaynak.sinir, ilk))
    throw new Error("mevcut manifestin sinir kaynagi farkli; ayri --hedef ve --manifest kullanin");
}

/** Manifest girdisine `nufus` (veride kimliği varsa; yoksa alan hiç yazılmaz: isteğe bağlı). */
const nufusAlani = (kimlik: string): { nufus?: number } => {
  const n = ilceNufusu(kimlik);
  return n === undefined ? {} : { nufus: n };
};

function ilceKaydi(u: IlceUretimi, bhiYol: string, seritYol: string): IlceIzgarasi {
  const st = u.istatistik;
  return {
    kimlik: u.bilgi.kimlik,
    ad: u.bilgi.ad,
    il: u.bilgi.il,
    osmIliski: u.bilgi.osmIliski,
    ...nufusAlani(u.bilgi.kimlik),
    bhi: { yol: bhiYol, bayt: u.bhiBayt, sha256: u.bhiSha256, hamBayt: u.bhiHamBayt },
    seritler: { yol: seritYol, bayt: u.seritBayt, sha256: u.seritSha256 },
    cerceve: u.cerceve,
    hucre: { icerde: st.icerdeTum, su: st.suHucre, kara: st.toplam, uygun: st.satinAlinabilir, engelYol: st.engel.yol, engelAskeri: st.engel.askeri },
    karo: { yapi: u.karo.yapi, bbox: u.karo.bbox, bayt: u.karo.bayt, sha256: u.karo.sha256 },
  };
}

function yaz(u: IlceUretimi, izoleHedef?: string): IlceIzgarasi {
  const k = u.bilgi.kimlik;
  if (izoleHedef) {
    const bhi = resolve(izoleHedef, `${k}.bhi.gz`);
    const serit = resolve(izoleHedef, `${k}-seritler.pmtiles`);
    copyFileSync(u.bhiYol, bhi);
    copyFileSync(u.seritYol, serit);
    // Manifest yolları mevcut şemada her zaman odbl/ köküne göredir; izole çıktı da bu anlamı korur.
    return ilceKaydi(u, relative(ODBL_DIZINI, bhi).replaceAll("\\", "/"), relative(ODBL_DIZINI, serit).replaceAll("\\", "/"));
  }
  const eski = ESKI_KONUM[k];
  if (eski) {
    const eskiBhi = resolve(ODBL_DIZINI, eski.bhi);
    if (existsSync(eskiBhi) && sha256Hex(readFileSync(eskiBhi)) !== u.bhiSha256) throw new Error(`${k}: uretilen BHI1 ${eski.bhi} ile ayni degil; hat durdu`);
    console.log(`  [${k}] BHI1 ${eski.bhi} ile BAYT BAYT AYNI; serit ${eski.seritler} yerden bagimsiz ust veriyle yeniden yazildi`);
    copyFileSync(u.bhiYol, eskiBhi);
    copyFileSync(u.seritYol, resolve(ODBL_DIZINI, eski.seritler));
    return ilceKaydi(u, eski.bhi, eski.seritler);
  }
  mkdirSync(IZGARA_DIZINI, { recursive: true });
  const bhi = `izgara/${k}.bhi.gz`;
  const serit = `izgara/${k}-seritler.pmtiles`;
  copyFileSync(u.bhiYol, resolve(ODBL_DIZINI, bhi));
  copyFileSync(u.seritYol, resolve(ODBL_DIZINI, serit));
  return ilceKaydi(u, bhi, serit);
}

function manifestYaz(kayitlar: IlceIzgarasi[], u: IlceUretimi[], manifestYolu: string): void {
  const var_ = existsSync(manifestYolu) ? manifestOku(manifestYolu).ilceler : [];
  const birlesik = new Map<string, IlceIzgarasi>(var_.map((i) => [i.kimlik, i]));
  for (const k of kayitlar) birlesik.set(k.kimlik, k);
  const ilk = u[0]!;
  const m: IzgaraManifesti = {
    surum: 1,
    lisans: "ODbL-1.0",
    atif: OSM_ATIF,
    aciklama: "Alfa-0 ilceleri z20 arsa izgarasi (BHI1). Istemci ve sunucu ilce listesini ve dosyalari buradan okur; yollar odbl/ dizinine goredir.",
    hucreZ: 20,
    kural: { ornek: VARSAYILAN_SECENEKLER.ornek, yolEsik: VARSAYILAN_SECENEKLER.yolEsik, suEsik: VARSAYILAN_SECENEKLER.suEsik, askeriEsik: VARSAYILAN_SECENEKLER.askeriEsik },
    kaynak: {
      karo: { yapi: KARO_YAPISI, url: KARO_KAYNAK_URL, semaSurumu: ilk.karo.semaSurumu, osmZamani: ilk.karo.osmZamani },
      sinir: ilk.sinir,
    },
    ilceler: [...birlesik.values()].sort((a, b) => (a.kimlik < b.kimlik ? -1 : a.kimlik > b.kimlik ? 1 : 0)),
  };
  IzgaraManifestSemasi.parse(m);
  mkdirSync(dirname(manifestYolu), { recursive: true });
  writeFileSync(manifestYolu, `${JSON.stringify(m, null, 2)}\n`);
}

const kb = (b: number): string => (b / 1024).toFixed(1);
const bin = (n: number): string => n.toLocaleString("tr-TR");

function rapor(m: IzgaraManifesti): string {
  const s = ["| ilçe | hücre (içerde) | kara (kota) | uygun | uygun % | BHI1 ham KB | BHI1 gzip KB | şerit PMTiles KB | karo özütü KB |", "|---|---|---|---|---|---|---|---|---|"];
  const top = { ic: 0, kara: 0, uygun: 0, ham: 0, gz: 0, sr: 0, karo: 0 };
  for (const i of m.ilceler) {
    s.push(`| ${i.ad} (${i.kimlik}) | ${bin(i.hucre.icerde)} | ${bin(i.hucre.kara)} | ${bin(i.hucre.uygun)} | ${((i.hucre.uygun / i.hucre.kara) * 100).toFixed(1)} | ${kb(i.bhi.hamBayt)} | ${kb(i.bhi.bayt)} | ${kb(i.seritler.bayt)} | ${kb(i.karo.bayt)} |`);
    top.ic += i.hucre.icerde; top.kara += i.hucre.kara; top.uygun += i.hucre.uygun; top.ham += i.bhi.hamBayt; top.gz += i.bhi.bayt; top.sr += i.seritler.bayt; top.karo += i.karo.bayt;
  }
  s.push(`| toplam | ${bin(top.ic)} | ${bin(top.kara)} | ${bin(top.uygun)} | ${((top.uygun / top.kara) * 100).toFixed(1)} | ${kb(top.ham)} | ${kb(top.gz)} | ${kb(top.sr)} | ${kb(top.karo)} |`);
  return s.join("\n");
}

/** Mevcut manifestteki her ilçeye `nufus` yazar (veri, karo ve ağ gerekmez; BHI1/şerit dosyalarına dokunulmaz). */
function nufusGuncelle(): void {
  const m = manifestOku();
  let yazilan = 0;
  const ilceler = m.ilceler.map((i) => {
    const { nufus: _eski, ...geri } = i;
    const ek = nufusAlani(i.kimlik);
    if (ek.nufus !== undefined) yazilan++;
    // `nufus`, `osmIliski`'den hemen sonra (deterministik anahtar sırası)
    const sonuc: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(geri)) {
      sonuc[k] = v;
      if (k === "osmIliski" && ek.nufus !== undefined) sonuc["nufus"] = ek.nufus;
    }
    return sonuc as unknown as IlceIzgarasi;
  });
  const yeni: IzgaraManifesti = { ...m, ilceler };
  IzgaraManifestSemasi.parse(yeni);
  writeFileSync(IZGARA_MANIFEST_YOLU, `${JSON.stringify(yeni, null, 2)}\n`);
  console.log(`manifest: ${yazilan}/${ilceler.length} ilceye nufus yazildi`);
}

function main(): void {
  const sinirTopojson = tekArguman("sinir-topojson");
  const hedefArgumani = tekArguman("hedef");
  const manifestArgumani = tekArguman("manifest");
  const manifestYolu = manifestArgumani ? resolve(manifestArgumani) : IZGARA_MANIFEST_YOLU;
  const modlar = ["nufus", "rapor", "kontrol", "hazirlik"].filter(bayrak);
  if (modlar.length > 1) throw new Error(`ayni anda tek mod secin: ${modlar.map((m) => `--${m}`).join(", ")}`);
  if (bayrak("nufus")) {
    if (sinirTopojson || hedefArgumani || manifestArgumani || bayrak("dogrula") || argumanlar("ilce").length > 0)
      throw new Error("--nufus diger uretim veya izole cikti secenekleriyle kullanilamaz");
    nufusGuncelle();
    return;
  }
  if (bayrak("rapor")) {
    if (sinirTopojson || hedefArgumani) throw new Error("--rapor sinir veya hedef secenegi almaz");
    console.log(rapor(manifestOku(manifestYolu)));
    return;
  }
  if (bayrak("kontrol")) {
    if (sinirTopojson || hedefArgumani) throw new Error("--kontrol sinir veya hedef secenegi almaz");
    const hata = manifestiDogrula(manifestOku(manifestYolu));
    if (hata.length > 0) {
      console.error(hata.join("\n"));
      process.exit(1);
    }
    console.log("manifest ve dosyalar tutarli");
    return;
  }
  const ilceler = argumanlar("ilce");
  if (ilceler.length === 0) throw new Error("--ilce <kimlik> gerekli (ornek: --ilce tr_16_gemlik --ilce tr_41_korfez)");
  if (new Set(ilceler).size !== ilceler.length) throw new Error("yinelenen --ilce kimligi");
  if (Boolean(hedefArgumani) !== Boolean(manifestArgumani)) throw new Error("izole uretim icin --hedef ve --manifest birlikte gerekli");
  if (sinirTopojson && !hedefArgumani && !bayrak("hazirlik"))
    throw new Error("yerel TopoJSON uretimi icin odbl disinda --hedef ve hedef altinda --manifest gerekli");
  const hedef = hedefArgumani ? resolve(hedefArgumani) : undefined;
  if (hedef) {
    if (icinde(hedef, ODBL_DIZINI) || icinde(manifestYolu, ODBL_DIZINI) || !icinde(manifestYolu, hedef) || gercekYol(manifestYolu) === gercekYol(hedef))
      throw new Error("izole --hedef odbl disinda, --manifest bu hedefin altinda bir dosya olmali");
    // Önceden oluşturulmuş symlink'ler de canonical çıktılara yönelmeyebilir.
    for (const k of ilceler) {
      if (!/^[a-z][a-z0-9_]*$/.test(k)) throw new Error(`gecersiz ilce kimligi: ${k}`);
      for (const dizin of [hedef, resolve(hedef, k), resolve(hedef, `${k}-ikinci`)]) {
        const yollar = [dizin, ...[`${k}.bhi.gz`, `${k}-seritler.pmtiles`, `${k}-seritler.geojsonseq`].map((ad) => resolve(dizin, ad))];
        if (yollar.some((y) => icinde(y, ODBL_DIZINI) || !icinde(y, hedef)))
          throw new Error(`izole cikti yolu hedef disina veya odbl agacina yoneliyor: ${k}`);
      }
      if (icinde(manifestYolu, resolve(hedef, k)) || icinde(manifestYolu, resolve(hedef, `${k}-ikinci`)) ||
          [`${k}.bhi.gz`, `${k}-seritler.pmtiles`].some((ad) => gercekYol(manifestYolu) === gercekYol(resolve(hedef, ad))))
        throw new Error(`manifest yolu ilce ciktilariyla cakisiyor: ${k}`);
    }
  }
  const sorunlar: string[] = [];
  const bilgiler: IlceBilgisi[] = [];
  for (const k of ilceler) {
    try { bilgiler.push(ilceBilgisi(k)); }
    catch (e) { sorunlar.push(e instanceof Error ? e.message : String(e)); }
  }
  const sinirlar = new Map<string, IlceSiniri>();
  if (sinirTopojson) {
    for (const b of bilgiler) {
      try { sinirlar.set(b.kimlik, yerelTopojsonHalkalari(sinirTopojson, [b]).get(b.kimlik)!); }
      catch (e) { sorunlar.push(`${b.kimlik}: ${e instanceof Error ? e.message : String(e)}`); }
    }
  } else {
    // Varsayılan ham OSM yolu ve kilit doğrulaması korunur; ülke başına dosya bir kez okunur.
    for (const ulke of new Set(bilgiler.map((b) => b.ulke))) {
      const grup = bilgiler.filter((b) => b.ulke === ulke);
      try {
        const s = idariHalkalar(ulke, grup.map((b) => b.osmIliski));
        for (const b of grup) sinirlar.set(b.kimlik, { halkalar: s.halkalar.get(b.osmIliski)!, kaynak: s.kaynak });
      } catch (e) { sorunlar.push(e instanceof Error ? e.message : String(e)); }
    }
  }
  if (bilgiler.length > 0 && sinirlar.size === bilgiler.length) {
    try { kaynakUyumunuDogrula(bilgiler, sinirlar, manifestYolu); }
    catch (e) { sorunlar.push(e instanceof Error ? e.message : String(e)); }
  }
  const hazirlik = izgaraHazirligi(bilgiler, sinirlar, sorunlar);
  if (bayrak("hazirlik")) {
    console.log(JSON.stringify({ ...hazirlik, manifestYolu, hedef: hedef ?? null, sinirTuru: sinirTopojson ? "yerel-topojson" : "kilitli-ham-osm" }, null, 2));
    if (!hazirlik.hazir) process.exitCode = 1;
    return;
  }
  // Karo yoksa eski üretim yolu özütleyebilir; araç ve sınır sorunları ise yazım başlamadan durdurur.
  const engeller = [...sorunlar, ...hazirlik.araclar.filter((a) => a.gerekli && !a.var).map((a) => `${a.ad}: calistirilabilir arac yok (${a.yol})`)];
  if (engeller.length > 0) throw new Error(engeller.join("\n"));
  const uretimler: IlceUretimi[] = [];
  for (const b of bilgiler) {
    const sinir = sinirlar.get(b.kimlik)!;
    console.log(`[${b.kimlik}] ${b.ad}: uretiliyor`);
    const u = ilceIzgarasiUret(b, { sinir, ...(hedef ? { hedef: resolve(hedef, b.kimlik) } : {}) });
    console.log(`  ${u.sureMs} ms, icerde ${u.istatistik.icerdeTum}, kara ${u.istatistik.toplam}, uygun ${u.istatistik.satinAlinabilir}, bhi.gz ${u.bhiBayt} B, serit ${u.seritBayt} B, eksik karo ${u.eksikKaro}`);
    if (u.eksikKaro > 0) throw new Error(`${b.kimlik}: ${u.eksikKaro} karo ozutte yok; ozet tutarsiz`);
    if (bayrak("dogrula")) {
      const ikinciHedef = resolve(hedef ?? resolve(ONBELLEK, "izgara"), `${b.kimlik}-ikinci`);
      const t = ilceIzgarasiUret(b, { sinir, hedef: ikinciHedef });
      const tamam = t.bhiSha256 === u.bhiSha256 && t.seritSha256 === u.seritSha256;
      console.log(`  ikinci uretim: bhi ${t.bhiSha256 === u.bhiSha256 ? "AYNI" : "FARKLI"}, serit ${t.seritSha256 === u.seritSha256 ? "AYNI" : "FARKLI"}`);
      rmSync(ikinciHedef, { recursive: true, force: true });
      if (!tamam) process.exit(1);
    }
    uretimler.push(u);
  }
  manifestYaz(uretimler.map((u) => yaz(u, hedef)), uretimler, manifestYolu);
  console.log(`manifest yazildi: ${manifestYolu}`);
}

try {
  main();
} catch (e: unknown) {
  console.error(e);
  process.exit(1);
}
