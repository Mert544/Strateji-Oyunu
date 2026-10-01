/** Önerilen eylemlerin "neden" metni (saf; arayüz tarafı). */
import type { Oneri } from "../isci/protokol";
import { fmt } from "../arayuz/bicim";

const NEDEN: Record<string, string> = {
  insa: "Zincirdeki bir açığı kapatır; bölgenin rezervi, etiketi ve işgücü bu tesise uygun.",
  yontem: "Daha verimli bir yöntem açıldı; işgücü ya da girdi açığını azaltır.",
  ticaret: "Fazla stoku satmak ya da açığı ithalatla kapatmak gelir ve karşılanmayı artırır.",
  kenar: "Doygun bir yol darboğaz yaratıyor; kapasite artınca akış rahatlar.",
  arastir: "Yeni yöntem, tesis ya da karar açar.",
  vergi: "Gıda karşılanması vergi ayarına izin veriyor; gelir ile nüfus dengesi.",
  tarim: "Toprak, iklim ve gübre dengesini iyileştirir; verim artar.",
  enerji: "Elektrik açığı üretimi kısıtlıyor; santral ya da yakıt tedariki ekler.",
  olcek: "Tesisi büyütmek çıktıyı artırır (işçi ve bakım da artar).",
  bakim: "Bakım düzeyi, aşınma ile gider arasında daha iyi bir denge kurar.",
  sondaj: "Rezerv azalıyor; yeni damar bulmak üretimi sürdürür.",
  birlik: "Orduyu güçlendirir.",
  savunma: "Bölgenin savunmasını sağlamlaştırır.",
  rezerv: "Askeri ikmal için lojistik payı ayırır.",
  savas: "Planlayıcı saldırıyı kârlı buldu.",
};

export function oneriNedeni(o: Oneri): string {
  const t = NEDEN[o.kategori] ?? "Planlayıcı bu eylemi yararlı buldu.";
  return o.fayda > 0 ? `${t} Tahmini net kazanç ≈ +${fmt(o.fayda)} para (1 hafta).` : t;
}
