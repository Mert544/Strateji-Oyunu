/**
 * Perakende (dükkân) ve yerel pazar verisinin derlenmesi (G7-1b; şartname docs/arastirma/p4-p5-sartname.md §4.6): `param.mulk.perakende` bloğundan
 * `DerlenmisPerakende` (dükkân türü ve mal indeksleri, ölçek tabloları, ilçe başına nüfus eşdeğeri ve talep tabanı, mal grupları, takvim, bayram, kampanya
 * parametreleri). SAF ve belirlenimci: hiçbir durum tutmaz, rastgelelik yok; her tablo kimliğe göre sıralı kurulur.
 *
 * BAĞLAMA YOK: bu dosya `icerikDerle`/`mulkDerle`'den çağrılmaz ve hiçbir yerden içe aktarılmaz (istemci paketi etkilenmez). Bağlama (G7-1b, K3):
 * `mulkDerle`'de `DerlenmisMulk.perakende = perakendeDerle(veri, ic)`.
 *
 * Mülk kipi kapalıysa (parametre bloğu `mulk` yok ya da parsel dünyası verilmemiş) ya da `perakende` bloğu yoksa `undefined` döner (dükkân kuralları kapalı;
 * bit-exact no-op). Çekirdek Node-only anlamsal kuralları (V3-V5, V13, V15) çalıştırmaz (`@bolge/veri` yükleyicilerinin işidir); burada yalnız derlemenin
 * bağımlı olduğu bütünlük hataları `Error` ile verilir: bilinmeyen mal ya da tür, boş `acikOlcekler`, `dukkan` ek yapısı yok.
 */
import type { ArsaSinifi, MulkPerakendeParametreleri } from "@bolge/veri";
import { durumArsaSinifi } from "../mulk/hucreDizini";
import type { CekirdekVeriPaketi, DerlenmisIcerik } from "../tipler";
import { ilceNufusEsdegeri, talepTabani } from "./yerelPazar";
import type { BayramDalgasi, IlceSinifi } from "./yerelPazar";

/** Derlenmiş dükkân türü: mal kimlikleri mal indekslerine çevrilmiş (artan sıralı). */
export interface DerlenmisDukkanTuru {
  ad: string;
  /** Mal indeksleri, artan. */
  mallar: number[];
  malKumesi: Set<number>;
  tamCesit: number;
  olcekAraligi: (0 | 1 | 2)[];
}

/** Derlenmiş perakende verisi. Dünya durumuna girmez. */
export interface DerlenmisPerakende {
  p: MulkPerakendeParametreleri;
  /** Tür kimliği -> tür (kimliğe göre sıralı eklenir). */
  turler: Map<string, DerlenmisDukkanTuru>;
  /**
   * İlçe kimliği -> mal indeksi -> taban talep (mili-birim/saat) = `carpBol(talep1000Saat[m] x yerelOlcek, ilceNufusEsdegeri(ilçe), 1000)`; satırı olmayan mal 0.
   * Dizi uzunluğu mal sayısıdır. Derlemede bir kez.
   */
  talepTaban: Map<string, number[]>;
  /** Mal indeksi -> grup indeksi (grupların kimliğe göre sıralı sırası); -1: grupsuz. */
  malGrubu: number[];
  /** Grup başına 12 aylık çarpan (ppm; toplamı 12 000 000). */
  grupTakvim: number[][];
  /** Grup başına bayram dalgası (yoksa null). */
  grupBayram: (BayramDalgasi | null)[];
  /** Bayram günleri (sim günü indeksi), artan. */
  bayramGunleri: number[];
  /** İlçe kimliği -> nüfus eşdeğeri (`ilceNufusEsdegeri`: fikstürdeki `nufus`, yoksa `ilceSinifiNufus[sinif]`). */
  ilceNufus: Map<string, number>;
  /** `ekYapilar.dukkan` indeksi (`DerlenmisMulk.ekYapiIndeks.get("dukkan")` ile aynı: ek yapı kimliklerinin sıralı sırası). */
  dukkanEkYapi: number;
  /** Kampanya etkin mi: kademe tanımlı ve günlük saat ve haftalık gün sınırlarının ikisi de > 0 (aksi halde kampanya kademesi seçilemez). */
  kampanyaAcik: boolean;
}

/** Izgara ilçesinin sınıfı: içerideki hücrelerin EN YÜKSEK arsa sınıfı (`@bolge/veri ilceSinifiTuret` ile aynı tanım; hücre sınıfı talebe girmez: yalnız `sinif` alanı yoksa yedek). */
function izgaraIlceSinifi(durum: Uint8Array): ArsaSinifi {
  let en = 0;
  for (let i = 0; i < durum.length; i++) {
    const b = durum[i] as number;
    if ((b & 1) === 0) continue; // ICERIDE
    const s = durumArsaSinifi(b);
    const sira = s === "sehir" ? 2 : s === "kasaba" ? 1 : 0;
    if (sira > en) {
      en = sira;
      if (en === 2) break;
    }
  }
  return en === 2 ? "sehir" : en === 1 ? "kasaba" : "kirsal";
}

/** Paketin ilçeleri (id, sınıf, isteğe bağlı nüfus): JSON fikstüründen ya da ızgara girdisinden; ikisi birlikte verilemez. */
function ilceKayitlari(veri: CekirdekVeriPaketi): { id: string; sinif: IlceSinifi; nufus?: number }[] | undefined {
  if (veri.parsel !== undefined && veri.parselIzgara !== undefined) throw new Error("perakendeDerle: parsel ve parselIzgara birlikte verilemez");
  if (veri.parsel !== undefined) return veri.parsel.ilceler.map((c) => ({ id: c.id, sinif: c.sinif, ...(c.nufus !== undefined ? { nufus: c.nufus } : {}) }));
  if (veri.parselIzgara !== undefined) {
    return veri.parselIzgara.ilceler.map((c) => ({ id: c.id, sinif: c.sinif ?? izgaraIlceSinifi(c.izgara.durum), ...(c.nufus !== undefined ? { nufus: c.nufus } : {}) }));
  }
  return undefined;
}

/**
 * `perakende` bloğunu derler. `ic`: içerik derlemesinin mal tablosu (mal kimliği -> indeks) yeter. Döner: `DerlenmisPerakende` ya da `undefined` (mülk kipi kapalı ya da blok yok).
 * Hata (`Error`, ileti "icerikDerle: ..."): bilinmeyen mal ya da tür, boş `acikOlcekler`, `ekYapilar.dukkan` yok, tekrarlanan ilçe.
 */
export function perakendeDerle(veri: CekirdekVeriPaketi, ic: Pick<DerlenmisIcerik, "malIndeks" | "mallar">): DerlenmisPerakende | undefined {
  const mulk = veri.param.mulk;
  const p = mulk?.perakende;
  if (mulk === undefined || p === undefined) return undefined;
  const ilceler = ilceKayitlari(veri);
  if (ilceler === undefined) return undefined; // parsel dünyası yok: mülk kipi kapalı
  if (p.acikOlcekler.length === 0) throw new Error("icerikDerle: mulk.perakende.acikOlcekler bos olamaz");
  const ekYapiKimlikleri = Object.keys(mulk.ekYapilar ?? {}).sort();
  const dukkanEkYapi = ekYapiKimlikleri.indexOf("dukkan");
  if (dukkanEkYapi < 0) throw new Error("icerikDerle: mulk.perakende icin mulk.ekYapilar.dukkan gerekli");

  const malIndeksi = (mal: string, yol: string): number => {
    const mi = ic.malIndeks[mal];
    if (mi === undefined) throw new Error(`icerikDerle: ${yol} bilinmeyen mal: ${mal}`);
    return mi;
  };

  // Dükkân türleri: kimliğe göre sıralı; mal kimlikleri indekse çevrilir (artan).
  const turler = new Map<string, DerlenmisDukkanTuru>();
  for (const t of [...p.dukkanTurleri].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (turler.has(t.id)) throw new Error(`icerikDerle: mulk.perakende.dukkanTurleri tekrarlanan tur: ${t.id}`);
    const mallar = [...new Set(t.mallar.map((m) => malIndeksi(m, `mulk.perakende.dukkanTurleri.${t.id}.mallar`)))].sort((a, b) => a - b);
    turler.set(t.id, { ad: t.ad, mallar, malKumesi: new Set(mallar), tamCesit: t.tamCesit, olcekAraligi: [...t.olcekAraligi].sort((a, b) => a - b) });
  }

  // Talep grupları: kimliğe göre sıralı grup indeksi; mal -> grup (grupsuz -1).
  const talep = p.talep;
  const grupKimlikleri = Object.keys(talep.gruplar).sort();
  const malGrubu = ic.mallar.map(() => -1);
  const grupTakvim: number[][] = [];
  const grupBayram: (BayramDalgasi | null)[] = [];
  for (const [gi, g] of grupKimlikleri.entries()) {
    const grup = talep.gruplar[g] as NonNullable<typeof talep.gruplar[string]>;
    for (const m of grup.mallar) {
      const mi = malIndeksi(m, `mulk.perakende.talep.gruplar.${g}.mallar`);
      if (malGrubu[mi] !== -1) throw new Error(`icerikDerle: mulk.perakende.talep.gruplar mal birden cok grupta: ${m}`);
      malGrubu[mi] = gi;
    }
    grupTakvim.push([...grup.takvimPpm]);
    grupBayram.push(grup.bayram === undefined ? null : { ...grup.bayram });
  }

  // Taban talep satırları: mal -> talep1000Saat (kimliğe göre sıralı gezilir); ilçe başına tek geçiş.
  const talepMallari = Object.keys(talep.talep1000Saat).sort().map((m) => ({ mi: malIndeksi(m, "mulk.perakende.talep.talep1000Saat"), v: talep.talep1000Saat[m] as number }));
  const talepTaban = new Map<string, number[]>();
  const ilceNufus = new Map<string, number>();
  for (const c of ilceler) {
    if (ilceNufus.has(c.id)) throw new Error(`icerikDerle: tekrarlanan ilce: ${c.id}`);
    const nufus = ilceNufusEsdegeri(c, talep.ilceSinifiNufus);
    ilceNufus.set(c.id, nufus);
    const satir = ic.mallar.map(() => 0);
    for (const t of talepMallari) satir[t.mi] = talepTabani(t.v, talep.yerelOlcek, nufus);
    talepTaban.set(c.id, satir);
  }

  const kampanyaAcik = p.kampanyaKademesi !== undefined && (p.kampanyaGunlukEnFazlaSaat ?? 0) > 0 && (p.kampanyaHaftalikEnFazlaGun ?? 0) > 0;
  return { p, turler, talepTaban, malGrubu, grupTakvim, grupBayram, bayramGunleri: [...talep.bayramGunleri], ilceNufus, dukkanEkYapi, kampanyaAcik };
}
