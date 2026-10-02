/**
 * G6 sunucu testleri için GERÇEK G6-3 içeriği (K4/T3: `degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli`; hepsi `mulkKipi: true`, listelerin SONUNDA).
 * "Eski" (G6 öncesi) içerik, aynı içerikten bu altı yöntemin ve tür listelerindeki girdilerinin çıkarılmasıyla türetilir (`g6Oncesi`): yöntem uzayı SONA eklemeyle büyüdüğü için
 * eski = yeni - son altı yöntemdir (G6-3 dördü + G8-1 ikisi). Dondurulmuş gerçek eski görüntü (`cekirdek/test/fikstur-goc/mulk-v2-g6oncesi.json`) `yontem-goc.test.ts`'te ayrıca yüklenir.
 */
import type { CekirdekVeriPaketi, Simulasyon } from "@bolge/cekirdek";
import { kamuKumesi, mulkVerisi } from "./yardimci";

export const DEGIRMEN = "degirmen";
export const FIRIN = "ekmek_firini";
/** Sona eklenen yöntemler (içerik sırasıyla): G6-3'ün dördü, ardından G8-1'in `cam_firini` ve `celik_dograma`'sı (hepsi `mulkKipi: true`; "eski" içerik bunların hepsi çıkarılmış hâlidir). */
export const YONTEM_KIMLIKLERI = ["degirmen", "ekmek_firini", "kepek_gubresi", "sut_kepekli", "cam_firini", "celik_dograma"];

/** İçerikten G6-3 yöntemlerini (ve tür listelerindeki girdilerini) çıkarır: "G6 öncesi" içerik. Yerinde değiştirir. */
export function g6Oncesi(v: CekirdekVeriPaketi): CekirdekVeriPaketi {
  v.icerik.yontemler = v.icerik.yontemler.filter((y) => !YONTEM_KIMLIKLERI.includes(y.id));
  for (const t of v.icerik.tesisTurleri) t.yontemler = t.yontemler.filter((y) => !YONTEM_KIMLIKLERI.includes(y));
  return v;
}

/** Mülk kipi, bol hazine ve malzeme, indirimsiz ve ayrılmışsız; `ek` ile ayarlanır. */
export function bolMulk(v: CekirdekVeriPaketi, ek: (v: CekirdekVeriPaketi) => void = () => undefined): CekirdekVeriPaketi {
  const m = v.param.mulk;
  if (m) {
    m.yeniOyuncu.hibe = 5_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 50_000_000, parca: 50_000_000, gida: 200_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.yeniOyuncu.ilkYapiIndirimPpm = 0;
    m.esZamanliInsaat = 10;
  }
  ek(v);
  return v;
}

/** G6 ÖNCESİ içerikli mülk verisi (G6-3 yöntemleri yok). */
export function eskiIcerikliMulkVerisi(ek: (v: CekirdekVeriPaketi) => void = () => undefined): CekirdekVeriPaketi {
  return g6Oncesi(bolMulk(mulkVerisi(), ek));
}

/** Güncel (G6-3 içerikli) mülk verisi. */
export function yeniIcerikliMulkVerisi(ek: (v: CekirdekVeriPaketi) => void = () => undefined): CekirdekVeriPaketi {
  return bolMulk(mulkVerisi(), ek);
}

/**
 * `ilce` içinde birbirinden AYRIK, yatayda bitişik ikili hücre grupları (kırsal, uygun, kamu/ayrılmış/sahipli olmayan); `adet` kadar. Her sahibin parseli
 * ayrı grup olsun diye test başına çağrılır; sahipli hücreler dışarıda bırakılır.
 */
export function bitisikCiftler(sim: Pick<Simulasyon, "dunya" | "ic">, ilce: string, adet: number): string[][] {
  const kamu = kamuKumesi(sim, ilce);
  const ay = sim.ic.mulk?.ayrilmis ?? new Set<string>();
  const sahipli = new Set((sim.dunya.mulk?.hucreler ?? []).filter((h) => h.sahip).map((h) => h.id));
  const uygun = new Set((sim.ic.mulk?.fikstur.ilceler.find((c) => c.id === ilce)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id) && !ay.has(h.id) && !sahipli.has(h.id)).map((h) => h.id));
  const kullanilan = new Set<string>();
  const sonuc: string[][] = [];
  for (const id of uygun) {
    const [x, y] = id.split(":").map(Number) as [number, number];
    const komsu = `${x + 1}:${y}`;
    if (uygun.has(komsu) && !kullanilan.has(id) && !kullanilan.has(komsu)) {
      sonuc.push([id, komsu]);
      kullanilan.add(id);
      kullanilan.add(komsu);
      if (sonuc.length === adet) return sonuc;
    }
  }
  throw new Error(`yeterli bitisik cift yok: ${ilce} (${adet})`);
}
