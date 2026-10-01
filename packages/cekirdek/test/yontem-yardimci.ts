/**
 * G6 yöntem testleri için TEST-YEREL sentetik içerik (T3 değerleri beklenmez; gerçek `degirmen`/`ekmek_firini` G6-3'te gelir): `gida_fabrikasi` listesinin SONUNA
 * üç yöntem eklenir: `degirmen_t` (`mulkKipi: true`), `bayraksiz_t` (bayraksız; karşıt kanıt: bölge kipine görünür) ve `kilitli_t` (teknoloji şartlı).
 */
import { miniVeriyiYukle } from "@bolge/veri";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { mulkVeriTam } from "./mulk-yardimci";

export const DEGIRMEN_T = "degirmen_t";
export const BAYRAKSIZ_T = "bayraksiz_t";
export const KILITLI_T = "kilitli_t";

/** İçeriğe üç sentetik yöntem ekler (yerinde; tür listesinin sonuna). */
export function sentetikYontemEkle(v: CekirdekVeriPaketi): void {
  const taban = v.icerik.yontemler.find((y) => y.id === "standart_gida_isleme")!;
  const kopya = (id: string, ad: string, duzenle: (y: typeof taban) => void) => {
    const y = structuredClone(taban);
    y.id = id;
    y.ad = ad;
    duzenle(y);
    v.icerik.yontemler.push(y);
    v.icerik.tesisTurleri.find((t) => t.id === "gida_fabrikasi")!.yontemler.push(id);
  };
  kopya(DEGIRMEN_T, "Degirmen T", (y) => {
    y.ciktilar = { un: 165_000, kepek: 35_000 };
    y.mulkKipi = true;
  });
  kopya(BAYRAKSIZ_T, "Bayraksiz T", (y) => {
    y.ciktilar = { gida: 320_000 };
  });
  kopya(KILITLI_T, "Kilitli T", (y) => {
    y.gerekliTeknoloji = "otomasyon";
  });
}

/** Mülk kipi (mini-6 parsel dünyası) + sentetik yöntemler; bol hazine ve malzeme, indirimsiz, ayrılmışsız. */
export function yontemliMulkVeri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 5_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 50_000_000, parca: 50_000_000, gida: 200_000, tahil: 50_000_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.esZamanliInsaat = 10;
    sentetikYontemEkle(v);
    duzenle?.(v);
  });
}

/** Bölge kipi (parsel yok) + AYNI sentetik yöntemler. */
export function yontemliBolgeVeri(): CekirdekVeriPaketi {
  const v = miniVeriyiYukle() as CekirdekVeriPaketi;
  sentetikYontemEkle(v);
  return v;
}
