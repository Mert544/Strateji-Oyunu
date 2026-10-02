/**
 * `[E]` etkileşim hapı: karakterin bulunduğu hücreye göre bağlamsal eylem (saf).
 *   kendi yapın → "Yapını yönet" · kendi boş arsan → "Yapı kur" · başkasının parseli/yapısı → "Bilgi"
 *   satın alınabilir boş hücre → "Satın al" (fiyatla) · yol/su/askerî → "Arsa bilgisi" · ilçe dışı → hap yok
 */
export interface EtkilesimGirdisi {
  /** Hücrenin BHI1 durum baytı (bit0: ilçede). */
  durum: number;
  satinAlinabilir: boolean;
  sahip: string | null;
  sahipAdi?: string;
  ben: string;
  /** Hücrede inşaat/yapı var mı? */
  insaat: boolean;
  /** Biçimlenmiş fiyat ("1.000 ₺"). */
  fiyat?: string;
}

export type EtkilesimTuru = "yonet" | "kur" | "bilgi" | "satin-al" | "parsel";

export interface Etkilesim {
  tur: EtkilesimTuru;
  /** Hapın metni (tuş ipucu hariç). */
  etiket: string;
}

const ETIKET: Record<EtkilesimTuru, string> = {
  yonet: "Yapını yönet",
  kur: "Arsanda yapı kur",
  bilgi: "Bilgi",
  "satin-al": "Satın al",
  parsel: "Arsa bilgisi",
};

export function etkilesimSec(g: EtkilesimGirdisi): Etkilesim | null {
  if (!(g.durum & 1)) return null;
  let tur: EtkilesimTuru;
  if (g.sahip && g.sahip === g.ben) tur = g.insaat ? "yonet" : "kur";
  else if (g.sahip) tur = "bilgi";
  else if (g.satinAlinabilir) tur = "satin-al";
  else tur = "parsel";
  let etiket = ETIKET[tur];
  if (tur === "bilgi" && g.sahipAdi) etiket = `Bilgi: ${g.sahipAdi}`;
  if (tur === "satin-al" && g.fiyat) etiket = `Satın al · ${g.fiyat}`;
  return { tur, etiket };
}
