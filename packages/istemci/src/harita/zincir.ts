/**
 * "Yapı önce yerleşim" ve "hazır arsa" için komut yolu (F4).
 *   - Yapı yerleştirme (arsa + yapı): HER durumda TEK atomik `yapi_yerlestir` komutu; hücreler birden çok arsa sınıfındaysa hücre başına
 *     sınıf `siniflar` ile gider (baş lider şartı: yarım alım yok; yapı reddedilirse hiçbir şey değişmez). Arsa alınmayan yerleşim
 *     (yurt: bütün hücreler kendinin) atomik komut yoksa `tesis_insa_hucre` ile kurulur (alım olmadığı için yarım durum yoktur).
 *   - Hazır arsa satın alma (`parselZinciri`): sınıf başına `parsel_al`; yapı içermez, her adım kendi başına bir alımdır.
 * Sonuç, oyuncuya gösterilecek Türkçe bildirimle döner. Bağdaştırıcı sahte ya da gerçek olabilir (aynı `MulkBaglantisi`).
 */
import { fmt, paraMili } from "../arayuz/bicim";
import type { MulkBaglantisi, ParselSonucu } from "./baglanti";
import { dukkanMetni } from "./dukkan-metin";
import type { ParselAdimi, YerlesimPlani } from "./yapi";
import type { ArsaSinifi, HucreId } from "@bolge/cekirdek";

const nokta = (m: string): string => (/[.!?]$/.test(m) ? m : `${m}.`);

export interface ZincirSonucu {
  tamam: boolean;
  /** Hata varsa hangi aşamada: "parsel" ya da "insa". */
  asama?: "parsel" | "insa";
  /** Alınan (ve artık sende olan) yeni hücreler. */
  alinan: HucreId[];
  /** Alınan arsanın toplamı (mili-₺). */
  odenenMili: number;
  /** Gönderilen komut sayısı (sınama ve rapor için). */
  gonderilen: number;
  /** Kullanılan yol: tek komut ("atomik") ya da iki/üç komutlu "zincir". */
  yol: "atomik" | "zincir";
  /** Oyuncuya gösterilecek tek cümle. */
  mesaj: string;
  /** Başarısızlığın Türkçe nedeni. */
  neden?: string;
}

/** `parsel_al` adımlarını sırayla gönderir; ilki başarısızsa durur. */
export async function parselZinciri(b: MulkBaglantisi, ilce: string, adimlar: readonly ParselAdimi[]): Promise<{ alinan: HucreId[]; odenenMili: number; gonderilen: number; hata: Extract<ParselSonucu, { tamam: false }> | null }> {
  const alinan: HucreId[] = [];
  let odenen = 0;
  let gonderilen = 0;
  for (const a of adimlar) {
    gonderilen++;
    const r = await b.parselAl({ tur: "parsel_al", ilce, hucreler: a.hucreler, sinif: a.sinif });
    if (!r.tamam) return { alinan, odenenMili: odenen, gonderilen, hata: r };
    alinan.push(...r.hucreler);
    odenen += r.toplamMili;
  }
  return { alinan, odenenMili: odenen, gonderilen, hata: null };
}

/** Yerleşim planını uygular: arsa + yapı TEK `yapi_yerlestir` komutu (çok sınıfta `siniflar`); arsasız yerleşim atomik komut yoksa `tesis_insa_hucre`. */
export async function yerlesimiUygula(b: MulkBaglantisi, ilce: string, plan: YerlesimPlani, dukkanTuru?: string, yontem?: string): Promise<ZincirSonucu> {
  const ad = plan.yapi.ad;
  // Dükkân: tür yapı kurarken seçilir ve komuta girer (yalnız `dukkan` yapısında; tür yoksa hiçbir şey gönderilmez)
  const tur = plan.yapi.id === "dukkan" && dukkanTuru ? { dukkanTuru } : {};
  // Üretim yöntemi: yalnız seçici koyduysa komuta girer (tek yöntemli türde tanımsız: komuta yazılmaz, tür varsayılanı); dükkânda (ek yapı) hiç verilmez
  const yon = plan.yapi.id !== "dukkan" && yontem ? { yontem } : {};
  if (plan.yapi.id === "dukkan" && !dukkanTuru) return { tamam: false, asama: "insa", yol: "atomik", alinan: [], odenenMili: 0, gonderilen: 0, mesaj: `${dukkanMetni("dukkan.D2.tur_gerekli")} Hiçbir şey değişmedi.`, neden: "tur_gerekli" };
  if (b.yapiYerlestir && b.atomikYerlestirme?.() === true) {
    const sinif = plan.parseller[0]?.sinif ?? "kirsal";
    // Hücre başına sınıf yalnız birden çok sınıfta gider; sahip olunan hücrenin sınıfı denetlenmez (komutta `sinif` değeri kullanılır)
    const sinifOf = new Map<HucreId, ArsaSinifi>();
    for (const p of plan.parseller) for (const id of p.hucreler) sinifOf.set(id, p.sinif);
    const hucreler = plan.hucreler.map((h) => h.id);
    const siniflar = plan.parseller.length > 1 ? hucreler.map((id) => sinifOf.get(id) ?? sinif) : undefined;
    const r = await b.yapiYerlestir({ ilce, tesisTuru: plan.yapi.id, hucreler, sinif, ...(siniflar ? { siniflar } : {}), ...tur, ...yon });
    if (!r.tamam) return { tamam: false, asama: "insa", yol: "atomik", alinan: [], odenenMili: 0, gonderilen: 1, neden: r.mesaj, mesaj: `${ad} kurulamadı: ${nokta(r.mesaj)} Hiçbir şey değişmedi.` };
    const arsa = plan.alinacak.length > 0 ? `arsa ${fmt(plan.alinacak.length)} hücre, ${paraMili(plan.arsaMili, "yukari")} + ` : "";
    return { tamam: true, yol: "atomik", alinan: [...plan.alinacak], odenenMili: plan.arsaMili, gonderilen: 1, mesaj: `${ad} kuruluyor: ${arsa}yapı ${paraMili(plan.yapiMili, "yukari")}.` };
  }
  // Atomik komut yok: arsa alan yerleşim yapılmaz (yarım alım olmasın); arsasız yerleşim (yurt) yalnız inşaat komutudur
  if (plan.alinacak.length > 0 || !b.tesisInsa) {
    return { tamam: false, asama: "insa", yol: "atomik", alinan: [], odenenMili: 0, gonderilen: 0, mesaj: "Bu bağlantı yapı yerleştirmeyi desteklemiyor. Hiçbir şey değişmedi.", neden: "desteklenmiyor" };
  }
  const r = await b.tesisInsa({ tur: "tesis_insa_hucre", ilce, tesisTuru: plan.yapi.id, hucreler: plan.hucreler.map((h) => h.id), ...tur, ...yon });
  if (!r.tamam) return { tamam: false, asama: "insa", yol: "zincir", alinan: [], odenenMili: 0, gonderilen: 1, neden: r.mesaj, mesaj: `${ad} kurulamadı: ${nokta(r.mesaj)}` };
  return { tamam: true, yol: "zincir", alinan: [], odenenMili: 0, gonderilen: 1, mesaj: `${ad} kuruluyor: yapı ${paraMili(plan.yapiMili, "yukari")}.` };
}
