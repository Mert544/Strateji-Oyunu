/**
 * Elektrik dengesi (B2, docs/08 §2.3 S1): depolanamaz, taşınamaz, bölge içi anlık denge.
 *
 *   arz   = kapasiteBrut x (PPM - iletimKaybi) / PPM            (santrallerin tam yükte brüt çıktısı)
 *   talep = tesisler + hane
 *   karsilanma = min(PPM, arz / talep)                          (ortak) veya hane önce, kalan sanayiye (haneOnceligi)
 *
 * Santral YÜK TAKİBİ: santraller talebi karşılayacak kadar çalışır (yük = karşılanan / kapasite); yakıt tüketimi,
 * kirlilik ve aşınma bu yükle ölçeklenir. Talep arzı aşınca yük PPM, karşılanma < PPM olur (brownout): elektrik girdili
 * tüm tesislerin verimi orantılı yavaşlar. Saf fonksiyon: dünya durumuna dokunmaz.
 */
import { carpBol, carpBolTavan } from "../sabit";
import { PPM } from "../tipler";

export interface ElektrikSonucu {
  /** Tesis talebi (mili-birim/saat). */
  talepTesis: number;
  talepHane: number;
  /** Tesislerin karşılanma oranı (ppm). */
  tesisKarsilanmaPpm: number;
  haneKarsilanmaPpm: number;
  /** Santral yükü (ppm, 0..PPM). */
  yukPpm: number;
  /** Santrallerin o yükte ürettiği brüt elektrik (mili-birim/saat). */
  uretim: number;
}

/** a / b oranı ppm olarak, [0, PPM]; b <= 0 ise PPM. */
function oran(a: number, b: number): number {
  if (b <= 0) return PPM;
  if (a >= b) return PPM;
  if (a <= 0) return 0;
  return carpBol(a, PPM, b);
}

/**
 * Elektrik dağıtımı. `kapasiteBrut`: santrallerin (verim, ölçek, akarsu ve aşınma dahil) tam yükteki brüt çıktısı.
 * `iletimKaybiPpm` PPM'den küçük olmalıdır. Deterministik, tamsayı.
 */
export function elektrikDagit(kapasiteBrut: number, talepTesis: number, talepHane: number, iletimKaybiPpm: number, haneOnceligi: boolean): ElektrikSonucu {
  const arz = carpBol(kapasiteBrut, PPM - iletimKaybiPpm, PPM);
  let hk: number;
  let tk: number;
  const toplam = talepTesis + talepHane;
  if (toplam <= 0) {
    hk = PPM;
    tk = PPM;
  } else if (haneOnceligi) {
    hk = oran(arz, talepHane);
    const kalan = arz - (arz < talepHane ? arz : talepHane);
    tk = oran(kalan, talepTesis);
  } else {
    hk = oran(arz, toplam);
    tk = hk;
  }
  const karsilanan = carpBol(talepHane, hk, PPM) + carpBol(talepTesis, tk, PPM);
  let yuk = 0;
  if (kapasiteBrut > 0 && (hk < PPM || tk < PPM)) {
    // Talep arzı aşıyor (brownout): santraller tam yükte.
    yuk = PPM;
  } else if (kapasiteBrut > 0 && karsilanan > 0) {
    const gerekBrut = carpBolTavan(karsilanan, PPM, PPM - iletimKaybiPpm);
    yuk = carpBolTavan(gerekBrut, PPM, kapasiteBrut);
    if (yuk > PPM) yuk = PPM;
  }
  return { talepTesis, talepHane, tesisKarsilanmaPpm: tk, haneKarsilanmaPpm: hk, yukPpm: yuk, uretim: carpBol(kapasiteBrut, yuk, PPM) };
}
