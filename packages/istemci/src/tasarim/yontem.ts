/**
 * Üretim yöntemi görsel eşlemeleri (saf veri; G6/G8): yapının görünümünü ve L3 simgesini yöntem belirler. Yöntem kimliği
 * (`icerik.yontemler[].id`) -> Lucide adı (simge sprite'ında bulunması T1 işidir). Yürüyüş silüetleri `yuru/siluet.ts`'tedir.
 */
export const YONTEM_SIMGELERI: Readonly<Record<string, string>> = {
  degirmen: "wheat",
  ekmek_firini: "chef-hat",
  kepek_gubresi: "sprout",
  sut_kepekli: "milk",
  cam_firini: "glass-water",
  celik_dograma: "frame",
};

/** Yöntemin L3 simgesi; eşlemesi olmayan yöntem için `null` (simge çizilmez, bugünkü görünüm). */
export function yontemSimgesi(yontem: string): string | null {
  return YONTEM_SIMGELERI[yontem] ?? null;
}
