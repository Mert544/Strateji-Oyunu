/**
 * G6 bot testleri için veri yardımcısı: G6 verisi (T3, G6-3) içeriğe girmeden önce, A2 tarifleriyle (docs/arastirma/p4-p5-ekonomi.md §1.4, S ölçek,
 * mili/saat) dört yeni yöntemi mini içeriğin KOPYASINA ekler. Gerçek içerik DEĞİŞMEZ. G6-3 girince bu eklemeler gerçek veriyle aynı olmalıdır;
 * `g6VerisiVarMi` gerçek içerikte yöntem varsa ekleme yapmaz (çift ekleme olmaz).
 */
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";

export interface G6Yontem {
  id: string;
  ad: string;
  girdiler: Record<string, number>;
  ciktilar: Record<string, number>;
  isci: number;
  bakim: Record<string, number>;
  kirlilikPpmSaat: number;
  mulkKipi: true;
}

/** A2 §1.4: yeni G6 yöntemleri (kod birimi: mili/saat). */
export const G6_YONTEMLERI: readonly G6Yontem[] = [
  { id: "degirmen", ad: "Değirmen", girdiler: { tahil: 200000, elektrik: 12000 }, ciktilar: { un: 165000, kepek: 33000 }, isci: 5000, bakim: { parca: 800 }, kirlilikPpmSaat: 20, mulkKipi: true },
  { id: "ekmek_firini", ad: "Ekmek Fırını", girdiler: { un: 165000, yakit: 20000, elektrik: 15000 }, ciktilar: { ekmek: 240000 }, isci: 8000, bakim: { parca: 800 }, kirlilikPpmSaat: 20, mulkKipi: true },
  { id: "kepek_gubresi", ad: "Kepek Gübresi", girdiler: { kepek: 100000, elektrik: 5000 }, ciktilar: { gubre: 18000 }, isci: 3000, bakim: { parca: 500 }, kirlilikPpmSaat: 10, mulkKipi: true },
  { id: "sut_kepekli", ad: "Kepekli Süt", girdiler: { tahil: 50000, kepek: 60000, elektrik: 5000 }, ciktilar: { sut: 82000, gubre: 4000 }, isci: 5000, bakim: { parca: 500 }, kirlilikPpmSaat: 10, mulkKipi: true },
];

/** Tesis türü -> eklenecek yöntem kimlikleri (A2 §1.13: `gida_fabrikasi += [degirmen, ekmek_firini]`, `ahir += [kepek_gubresi, sut_kepekli]`). */
const TUR_EKLEMELERI: Readonly<Record<string, readonly string[]>> = {
  gida_fabrikasi: ["degirmen", "ekmek_firini"],
  ahir: ["kepek_gubresi", "sut_kepekli"],
};

/**
 * Mini içerik + mini-6 parsel fikstürü; `g6: true` ise G6 yöntemleri kopyaya eklenir (gerçek içerikte zaten varsa dokunulmaz).
 * `enerjisiz: true`: yeni yöntemlerin (ve `standart_gida_isleme`nin) elektrik ve yakıt girdileri çıkarılır: şebeke enerjisi (G6-2b) çekirdeğe girene kadar zincir uçtan uca (ekmek, kepek, ahır, ödül)
 * çalışabilsin diye TEST kopyasına özgü sadeleştirme; gerçek tarifli sınama G6-3 sonrasındadır.
 */
export function g6TestVerisi(g6: boolean, secenek: { enerjisiz?: boolean } = {}): CekirdekVeriPaketi {
  const v = miniVeriyiYukle();
  const veri: CekirdekVeriPaketi = { ...v, parsel: parselFiksturuYukle("mini-6") };
  if (!g6) return veri;
  const icerik = structuredClone(veri.icerik);
  if (icerik.yontemler.some((y) => y.id === "degirmen")) return veri;
  for (const y of G6_YONTEMLERI) {
    const k = structuredClone(y);
    if (secenek.enerjisiz === true) {
      delete k.girdiler["elektrik"];
      delete k.girdiler["yakit"];
    }
    icerik.yontemler.push(k);
  }
  if (secenek.enerjisiz === true) {
    // Karşılaştırma yöntemi `standart_gida_isleme` de enerjisiz olur (aksi halde santralsiz bot gelir elde edemez ve nakdi biter).
    const std = icerik.yontemler.find((y) => y.id === "standart_gida_isleme");
    if (std !== undefined) delete std.girdiler["elektrik"];
  }
  for (const t of icerik.tesisTurleri) for (const id of TUR_EKLEMELERI[t.id] ?? []) t.yontemler.push(id);
  return { ...veri, icerik };
}
