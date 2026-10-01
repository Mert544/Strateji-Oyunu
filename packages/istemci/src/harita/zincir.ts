/**
 * "Yapı önce yerleşim" ve "hazır arsa" için komut yolu (F4).
 *   1. Atomik: bağdaştırıcı `atomikYerlestirme()` diyorsa ve boş hücreler tek sınıftansa TEK `yapi_yerlestir` komutu
 *      (arsa + inşaat bir arada; başarısızsa hiçbir şey değişmez).
 *   2. Zincir (geçici yol, çekirdekte atomik komut yokken): `parsel_al` (sınıf başına) → `tesis_insa_hucre`. İlk başarısızlıkta
 *      durur: sonraki komut GÖNDERİLMEZ; arsa alınıp yapı reddedilirse hücreler oyuncuda kalır ve mesaj bunu söyler.
 * Sonuç, oyuncuya gösterilecek Türkçe bildirimle döner. Bağdaştırıcı sahte ya da gerçek olabilir (aynı `MulkBaglantisi`).
 */
import { fmt, paraMili } from "../arayuz/bicim";
import type { MulkBaglantisi, ParselSonucu } from "./baglanti";
import type { ParselAdimi, YerlesimPlani } from "./yapi";
import type { HucreId } from "@bolge/cekirdek";

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

/** Yerleşim planını uygular: atomik komut varsa o, yoksa `parsel_al` (boş hücreler) + `tesis_insa_hucre`. */
export async function yerlesimiUygula(b: MulkBaglantisi, ilce: string, plan: YerlesimPlani): Promise<ZincirSonucu> {
  const ad = plan.yapi.ad;
  if (b.yapiYerlestir && b.atomikYerlestirme?.() === true && plan.parseller.length <= 1) {
    const sinif = plan.parseller[0]?.sinif ?? "kirsal";
    const r = await b.yapiYerlestir({ ilce, tesisTuru: plan.yapi.id, hucreler: plan.hucreler.map((h) => h.id), sinif });
    if (!r.tamam) return { tamam: false, asama: "insa", yol: "atomik", alinan: [], odenenMili: 0, gonderilen: 1, neden: r.mesaj, mesaj: `${ad} kurulamadı: ${nokta(r.mesaj)} Hiçbir şey değişmedi.` };
    const arsa = plan.alinacak.length > 0 ? `arsa ${fmt(plan.alinacak.length)} hücre, ${paraMili(plan.arsaMili, "yakin")} + ` : "";
    return { tamam: true, yol: "atomik", alinan: [...plan.alinacak], odenenMili: plan.arsaMili, gonderilen: 1, mesaj: `${ad} kuruluyor: ${arsa}yapı ${paraMili(plan.yapiMili, "yakin")}.` };
  }
  if (!b.tesisInsa) return { tamam: false, asama: "insa", yol: "zincir", alinan: [], odenenMili: 0, gonderilen: 0, mesaj: "Bu bağlantı yapı kurmayı desteklemiyor.", neden: "desteklenmiyor" };
  const p = await parselZinciri(b, ilce, plan.parseller);
  if (p.hata) {
    return {
      tamam: false,
      asama: "parsel",
      yol: "zincir",
      alinan: p.alinan,
      odenenMili: p.odenenMili,
      gonderilen: p.gonderilen,
      neden: p.hata.mesaj,
      mesaj: p.alinan.length > 0 ? `Arsa kısmen alındı (${fmt(p.alinan.length)} hücre), ${ad} kurulmadı: ${nokta(p.hata.mesaj)}` : `Arsa alınamadı, ${ad} kurulmadı: ${nokta(p.hata.mesaj)}`,
    };
  }
  const r = await b.tesisInsa({ tur: "tesis_insa_hucre", ilce, tesisTuru: plan.yapi.id, hucreler: plan.hucreler.map((h) => h.id) });
  const gonderilen = p.gonderilen + 1;
  if (!r.tamam) {
    return {
      tamam: false,
      asama: "insa",
      yol: "zincir",
      alinan: p.alinan,
      odenenMili: p.odenenMili,
      gonderilen,
      neden: r.mesaj,
      mesaj: p.alinan.length > 0 ? `Arsa alındı (${fmt(p.alinan.length)} hücre, ${paraMili(p.odenenMili, "yakin")}) ama ${ad} kurulamadı: ${nokta(r.mesaj)} Hücreler sende; yapıyı yeniden deneyebilirsin.` : `${ad} kurulamadı: ${nokta(r.mesaj)}`,
    };
  }
  const arsa = p.alinan.length > 0 ? `arsa ${fmt(p.alinan.length)} hücre, ${paraMili(p.odenenMili, "yakin")} + ` : "";
  return { tamam: true, yol: "zincir", alinan: p.alinan, odenenMili: p.odenenMili, gonderilen, mesaj: `${ad} kuruluyor: ${arsa}yapı ${paraMili(plan.yapiMili, "yakin")}.` };
}
