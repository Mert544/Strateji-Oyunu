/**
 * İlçe ızgarası üretimi ve manifest bakımı.
 *
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --ilce tr_16_gemlik --ilce tr_41_korfez [--dogrula]
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --rapor        # manifestten boyut tablosu (markdown)
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --kontrol      # manifest + dosya sha256 doğrulaması
 *   tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --nufus        # manifestteki ilçelere yapilandirma/ilce-nufus.json'dan nufus yazar (ağ gerekmez)
 *
 * Çıktılar packages/veri/haritalar/odbl/izgara/ altına (ODbL dizini) ve manifest.json'a yazılır. Karo özütü yoksa
 * `pmtiles extract` ile sabitlenmiş Protomaps yapısından alınır (ağ). Erişilemezse hat durur; veri uydurulmaz.
 * --dogrula: ilçeyi iki ayrı dizine üretir ve bayt bayt karşılaştırır; fark varsa çıkış kodu 1.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ONBELLEK } from "../yollar";
import { ilceNufusu } from "./ilce-nufus";
import { IzgaraManifestSemasi, IZGARA_MANIFEST_YOLU, manifestOku, manifestiDogrula, sha256Hex, type IlceIzgarasi, type IzgaraManifesti } from "./izgara-manifest";
import { KARO_KAYNAK_URL, KARO_YAPISI, idariHalkalar, ilceBilgisi, ilceIzgarasiUret, type IlceUretimi } from "./izgara-ilce";
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
    if (a === `--${ad}`) r.push(process.argv[i + 1]!);
  });
  return r;
}
const bayrak = (ad: string): boolean => process.argv.includes(`--${ad}`);

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

function yaz(u: IlceUretimi): IlceIzgarasi {
  const k = u.bilgi.kimlik;
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

function manifestYaz(kayitlar: IlceIzgarasi[], u: IlceUretimi[]): void {
  const var_ = existsSync(IZGARA_MANIFEST_YOLU) ? manifestOku().ilceler : [];
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
  mkdirSync(IZGARA_DIZINI, { recursive: true });
  writeFileSync(IZGARA_MANIFEST_YOLU, `${JSON.stringify(m, null, 2)}\n`);
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
  if (bayrak("nufus")) {
    nufusGuncelle();
    return;
  }
  if (bayrak("rapor")) {
    console.log(rapor(manifestOku()));
    return;
  }
  if (bayrak("kontrol")) {
    const hata = manifestiDogrula(manifestOku());
    if (hata.length > 0) {
      console.error(hata.join("\n"));
      process.exit(1);
    }
    console.log("manifest ve dosyalar tutarli");
    return;
  }
  const ilceler = argumanlar("ilce");
  if (ilceler.length === 0) throw new Error("--ilce <kimlik> gerekli (ornek: --ilce tr_16_gemlik --ilce tr_41_korfez)");
  const bilgiler = ilceler.map(ilceBilgisi);
  // Ülke başına sınır dosyası bir kez okunur
  const ulkeler = [...new Set(bilgiler.map((b) => b.ulke))];
  const sinirlar = new Map<number, { halkalar: ReturnType<typeof idariHalkalar>["halkalar"] extends Map<number, infer H> ? H : never; kaynak: ReturnType<typeof idariHalkalar>["kaynak"] }>();
  for (const ulke of ulkeler) {
    const ids = bilgiler.filter((b) => b.ulke === ulke).map((b) => b.osmIliski);
    const s = idariHalkalar(ulke, ids);
    for (const id of ids) sinirlar.set(id, { halkalar: s.halkalar.get(id)!, kaynak: s.kaynak });
  }
  const uretimler: IlceUretimi[] = [];
  for (const b of bilgiler) {
    const sinir = sinirlar.get(b.osmIliski)!;
    console.log(`[${b.kimlik}] ${b.ad}: uretiliyor`);
    const u = ilceIzgarasiUret(b, { sinir });
    console.log(`  ${u.sureMs} ms, icerde ${u.istatistik.icerdeTum}, kara ${u.istatistik.toplam}, uygun ${u.istatistik.satinAlinabilir}, bhi.gz ${u.bhiBayt} B, serit ${u.seritBayt} B, eksik karo ${u.eksikKaro}`);
    if (u.eksikKaro > 0) throw new Error(`${b.kimlik}: ${u.eksikKaro} karo ozutte yok; ozet tutarsiz`);
    if (bayrak("dogrula")) {
      const t = ilceIzgarasiUret(b, { sinir, hedef: resolve(ONBELLEK, "izgara", `${b.kimlik}-ikinci`) });
      const tamam = t.bhiSha256 === u.bhiSha256 && t.seritSha256 === u.seritSha256;
      console.log(`  ikinci uretim: bhi ${t.bhiSha256 === u.bhiSha256 ? "AYNI" : "FARKLI"}, serit ${t.seritSha256 === u.seritSha256 ? "AYNI" : "FARKLI"}`);
      rmSync(resolve(ONBELLEK, "izgara", `${b.kimlik}-ikinci`), { recursive: true, force: true });
      if (!tamam) process.exit(1);
    }
    uretimler.push(u);
  }
  manifestYaz(uretimler.map(yaz), uretimler);
  console.log(`manifest yazildi: ${IZGARA_MANIFEST_YOLU}`);
}

try {
  main();
} catch (e: unknown) {
  console.error(e);
  process.exit(1);
}
