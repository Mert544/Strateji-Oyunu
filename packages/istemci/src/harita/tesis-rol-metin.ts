/**
 * Yöntemli tesislerin rolü: kartta tek satır "neden kurulur, ne üretir, neye yarar" (T-3; kaynak T3 `tesis-rol-metin.md`). Yalnız yöntem seçicisi görünen (≥ 2 yöntemli) tesislerde
 * ve tablo kaydı varsa yazılır; kayıt yoksa satır çıkmaz (yedek metin yok). Sen dili, sabit sayı yok, büyük harf yalnız cümle başında ("Pazar" özel ad).
 */
export const TESIS_ROL = {
  "tesis.rol.ahir": "Tahılını gıdaya çevirir; dükkânının rafı için gıda buradan gelir, yan ürün olarak gübre de verir.",
  "tesis.rol.mera": "Dağ otlağında gıda ya da yün üretir; koyun yetiştiriciliğinden çıkan yünü satabilir veya ipliğe çevirebilirsin.",
  "tesis.rol.ciftlik": "Tarlada tahıl yetiştirir; Pazar'da satabilir, un ve ahır zincirine de verebilirsin.",
  "tesis.rol.gida_fabrikasi": "Tahılı gıdaya, una ya da ekmeğe çevirir; dükkânında satacağın mal buradan gelir.",
  "tesis.rol.cevher_madeni": "Demir cevheri çıkarır; çelikhane bunu çeliğe çevirir.",
  "tesis.rol.komur_ocagi": "Kömür çıkarır; çelikhane ve kömür santrali kullanır.",
  "tesis.rol.celikhane": "Demir cevherinden çelik üretir; yapıların ve makine parçasının malzemesi çeliktir.",
  "tesis.rol.parca_fabrikasi": "Çelikten makine parçası, ayrıca cam ve pencere üretir; yapı ve dükkân malzemen buradan gelir.",
  "tesis.rol.hafif_sanayi": "Yünü ipliğe, ipliği kumaşa veya kumaşı hazır giyime çevirir; her aşamayı ayrı tesiste üretir, Pazar'da satabilirsin.",
  "tesis.rol.santral": "Elektrik üretir; fabrikaların ve madenlerin girdisi olur, şebekeden almak zorunda kalmazsın.",
} as const;

export type TesisRolAnahtari = keyof typeof TESIS_ROL;

/** Tesis türünün rol cümlesi; tabloda yoksa null (satır çıkmaz). */
export function tesisRolu(turId: string): string | null {
  const a = `tesis.rol.${turId}`;
  return a in TESIS_ROL ? TESIS_ROL[a as TesisRolAnahtari] : null;
}
