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
 * G6-3 verisi gerçek içerikte VARSA gerçeği kullanır (A2 tarifleri yalnız yoksa eklenir); `g6: false` G6 yöntemlerini, şebekeyi ve yedek düğmesini çıkarır (G6 öncesi dünya).
 * `enerjisiz: true`: yeni yöntemlerin (ve `standart_gida_isleme`nin) elektrik/yakıt girdileri çıkarılır; `sebekesiz: true`: `mulk.sebeke` bloğu çıkarılır (santralsiz dünya karşıt kanıtı).
 */
export function g6TestVerisi(g6: boolean, secenek: { enerjisiz?: boolean; sebekesiz?: boolean } = {}): CekirdekVeriPaketi {
  const v = miniVeriyiYukle();
  const veri: CekirdekVeriPaketi = { ...v, parsel: parselFiksturuYukle("mini-6") };
  const icerik = structuredClone(veri.icerik);
  const param = structuredClone(veri.param);
  const gercekG6 = icerik.yontemler.some((y) => y.id === "degirmen");
  const yeniIdler = new Set(G6_YONTEMLERI.map((y) => y.id));
  if (!g6) {
    // G6 öncesi dünya: G6 yöntemleri, şebeke ve yedek düğmesi çıkarılır (G6-3 verisi gerçek içerikte olduğundan çıkarma gerekir).
    if (gercekG6) {
      icerik.yontemler = icerik.yontemler.filter((y) => !yeniIdler.has(y.id));
      for (const t of icerik.tesisTurleri) t.yontemler = t.yontemler.filter((id) => !yeniIdler.has(id));
    }
    if (param.mulk !== undefined) {
      delete (param.mulk as { sebeke?: unknown }).sebeke;
      delete (param.mulk as { yontemGecersizKilma?: unknown }).yontemGecersizKilma;
    }
    return { ...veri, icerik, param };
  }
  if (!gercekG6) {
    for (const y of G6_YONTEMLERI) icerik.yontemler.push(structuredClone(y));
    for (const t of icerik.tesisTurleri) for (const id of TUR_EKLEMELERI[t.id] ?? []) t.yontemler.push(id);
  }
  if (secenek.enerjisiz === true) {
    // Yeni yöntemlerin ve karşılaştırma yöntemi `standart_gida_isleme`nin elektrik/yakıt girdisi çıkarılır (şebekesiz dünyada zincirin uçtan uca koşması için).
    for (const y of icerik.yontemler) {
      if (!yeniIdler.has(y.id) && y.id !== "standart_gida_isleme") continue;
      delete y.girdiler["elektrik"];
      delete y.girdiler["yakit"];
    }
  }
  if (secenek.sebekesiz === true && param.mulk !== undefined) delete (param.mulk as { sebeke?: unknown }).sebeke;
  return { ...veri, icerik, param };
}
