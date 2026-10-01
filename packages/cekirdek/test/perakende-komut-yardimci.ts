/**
 * G7-3 test yardımcıları (dükkân KOMUTLARI): perakendeli mülk dünyası, komutla dükkân kurma (`yapi_yerlestir` + inşaatın bitmesi), reddedilen komutun durumu değiştirmediğinin denetimi ve
 * para korunumu ölçüsü (`musluk.yerelNpc` dahil; `perakende-para.test.ts` ile aynı tanım). JSON DEĞİŞMEZ (blok ve `ekYapilar.dukkan` bellekte eklenir).
 */
import { expect } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import type { Simulasyon } from "../src/motor";
import { paraUzlastir } from "../src/mulk/kasa";
import { sayacOlcekli } from "../src/paraSayac";
import { LAVABO_KALEMLERI, MUSLUK_KALEMLERI, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, EkYapiDurumu, Komut, KomutSonucu, ParaDurumu, ParaSayaci } from "../src/tipler";
import { dukkanlar, perakendeVeri } from "./perakende-yardimci";
import { mulkSim, tamam, ver } from "./mulk-yardimci";

export const F = parselFiksturuYukle("mini-6");
export const OVA = "sn_m_ova_merkez";
export const LIMAN = "sn_m_liman_merkez";
export const DAG = "sn_m_dag_merkez";

/** Perakendeli mülk dünyası verisi; `perakendeVeri` ile aynı (bol hibe, yeni oyuncu paketi açık, ilk yapı indirimi KAPALI, ayrılmış hücre yok). */
export function komutVeri(duzenle?: (v: CekirdekVeriPaketi, pr: NonNullable<NonNullable<CekirdekVeriPaketi["param"]["mulk"]>["perakende"]>) => void, blok = true): CekirdekVeriPaketi {
  return perakendeVeri((v, pr) => {
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 3_000_000, ekmek: 2_000_000, un: 1_500_000, sut: 1_000_000 };
    duzenle?.(v, pr);
  }, blok);
}

/** İlçenin `sinif` sınıfındaki uygun hücreleri (fikstür sırasıyla). */
export function ilceHucreleri(ilce: string, sinif: "kirsal" | "kasaba" | "sehir" = "kirsal"): string[] {
  return F.ilceler.find((c) => c.id === ilce)!.hucreler.filter((h) => h.uygun && h.sinif === sinif).map((h) => h.id);
}

/** `dukkan` ek yapısı için komut (tek hücre; kırsal). */
export function dukkanKomutu(ilce: string, hucre: string, dukkanTuru: string | undefined, ek: Partial<Extract<Komut, { tur: "yapi_yerlestir" }>> = {}): Komut {
  return { tur: "yapi_yerlestir", ilce, tesisTuru: "dukkan", hucreler: [hucre], sinif: "kirsal", ...(dukkanTuru === undefined ? {} : { dukkanTuru }), ...ek };
}

/** Dükkânı KOMUTLA kurar (`yapi_yerlestir`) ve inşaatın bitmesini bekler. Döner: biten ek yapı kaydı. */
export function dukkanKur(s: Simulasyon, oyuncu: string, ilce: string, hucre: string, tur = "bakkal"): EkYapiDurumu {
  const once = dukkanlar(s).filter((x) => x.oyuncu === oyuncu).map((x) => x.e.id);
  tamam(s, oyuncu, dukkanKomutu(ilce, hucre, tur));
  s.calistirKadar(s.dunya.zaman + 6 * SAAT);
  const yeni = dukkanlar(s).find((x) => x.oyuncu === oyuncu && !once.includes(x.e.id));
  if (yeni === undefined) throw new Error("dukkan kurulamadi (insaat bitmedi)");
  return yeni.e;
}

/** Hazır dünya: `oyuncular` mülk dünyasında; her biri için `[ilce]` sırasıyla ilk kırsal hücrelerinde dükkân (komutla). */
export function dukkanliDunya(oyuncular: readonly string[] = ["a"], v: CekirdekVeriPaketi = komutVeri(), tohum = 7): { s: Simulasyon; dukkan: Record<string, EkYapiDurumu> } {
  const s = mulkSim(oyuncular, v, tohum);
  const dukkan: Record<string, EkYapiDurumu> = {};
  for (const o of oyuncular) dukkan[o] = dukkanKur(s, o, OVA, ilceHucreleri(OVA)[oyuncular.indexOf(o) * 7 + 3] as string);
  return { s, dukkan };
}

/** Başarısız komutun dünyayı HİÇ değiştirmediğini doğrular (özet ve hazine); iletiyi döndürür. */
export function reddedilir(s: Simulasyon, oyuncu: string, k: Komut, parca: string): string {
  s.calistirKadar(s.dunya.zaman);
  const once = s.durumOzeti();
  const hazine = s.dunya.oyuncular.map((o) => o.hazine.miktar);
  const r: KomutSonucu = ver(s, oyuncu, k);
  expect(r.tamam, `${k.tur} reddedilmeliydi`).toBe(false);
  const hata = (r as { hata: string }).hata;
  expect(hata).toContain(parca);
  expect(s.durumOzeti()).toBe(once);
  expect(s.dunya.oyuncular.map((o) => o.hazine.miktar)).toEqual(hazine);
  return hata;
}

export interface Korunum {
  hazine: bigint;
  kasa: bigint;
  lavabo: bigint;
  musluk: bigint;
}

/** Her şeyi `d.zaman`'a uzlaştırır; SAAT ölçekli kesin toplamlar (`yerelNpc` musluk kalemi dahil). */
export function korunumOlc(s: Simulasyon): Korunum {
  const d = s.dunya;
  paraUzlastir(d, s.ic);
  const p = d.mulk!.para as ParaDurumu;
  let hazine = 0n;
  for (const o of d.oyuncular) hazine += BigInt(o.hazine.miktar) * BigInt(SAAT) + BigInt(o.hazine.artik);
  let kasa = 0n;
  for (const k of p.kasalar) {
    for (const kalem of Object.keys(k.giris) as (keyof typeof k.giris)[]) kasa += sayacOlcekli(k.giris[kalem] as ParaSayaci);
    kasa -= BigInt(k.cikisOyuncu + k.cikisNpc) * BigInt(SAAT);
  }
  let lavabo = 0n;
  for (const k of LAVABO_KALEMLERI) lavabo += sayacOlcekli(p.lavabo[k]);
  if (p.lavabo.sebeke !== undefined) lavabo += sayacOlcekli(p.lavabo.sebeke);
  let musluk = 0n;
  for (const k of MUSLUK_KALEMLERI) musluk += sayacOlcekli(p.musluk[k]);
  if (p.musluk.yerelNpc !== undefined) musluk += sayacOlcekli(p.musluk.yerelNpc);
  return { hazine, kasa, lavabo, musluk };
}

/** Para korunumu TAM eşitlik: hazine + kasa + lavabo = musluk. */
export function korunumTutar(s: Simulasyon, nerede: string): Korunum {
  const k = korunumOlc(s);
  if (k.hazine + k.kasa + k.lavabo !== k.musluk) throw new Error(`para korunumu bozuldu (${nerede}, t=${s.dunya.zaman}): ${k.hazine} + ${k.kasa} + ${k.lavabo} != ${k.musluk}`);
  return k;
}

/** Para defteri ve hazinelerin JSON metni (komutun para hareketi YAPMADIĞINI bayt bayt karşılaştırmak için; zaman aynı kalmalıdır). */
export function paraMetni(s: Simulasyon): string {
  paraUzlastir(s.dunya, s.ic);
  return JSON.stringify([s.dunya.oyuncular.map((o) => o.hazine), s.dunya.mulk!.para]);
}
