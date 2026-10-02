/** Sokak/bina karoları: arsa şeritlerinden ayrı Protomaps z15 özütleri. Derleme de aynı listeyi kullanır. */
export const YURUYUS_KAROLARI: readonly { ilce: string; dosya: string }[] = [
  { ilce: "tr_41_gebze", dosya: "gebze-z15.pmtiles" },
  { ilce: "tr_16_gemlik", dosya: "tr_16_gemlik-z15.pmtiles" },
  { ilce: "tr_41_korfez", dosya: "tr_41_korfez-z15.pmtiles" },
  { ilce: "tr_67_kilimli", dosya: "tr_67_kilimli-z15.pmtiles" },
];

const yayinlar = new Map<string, Promise<readonly string[]>>();

/** Yalnız derlemenin gerçekten yayımladığı, bilinen sokak özütlerini kabul eder. Modül yükünde DOM/ağ işi yoktur. */
export function yayinlananYuruyusKarolari(kok: string): Promise<readonly string[]> {
  const url = new URL("karolar/manifest.json", kok).href;
  const onceki = yayinlar.get(url);
  if (onceki) return onceki;
  const istek = fetch(url).then(async (r): Promise<readonly string[]> => {
    if (!r.ok) throw new Error("Sokak kaynak listesi alınamadı.");
    const m: unknown = await r.json();
    if (!m || typeof m !== "object" || !("surum" in m) || m.surum !== 1 || !("ilceler" in m) || !Array.isArray(m.ilceler)) throw new Error("Sokak kaynak listesi geçersiz.");
    const ilceler = m.ilceler;
    return YURUYUS_KAROLARI.filter((k) => ilceler.some((i: unknown) => i !== null && typeof i === "object" && "ilce" in i && "dosya" in i && i.ilce === k.ilce && i.dosya === k.dosya)).map((k) => k.ilce);
  }).catch((): readonly string[] => {
    yayinlar.delete(url);
    return [];
  });
  yayinlar.set(url, istek);
  return istek;
}

export function yuruyusKaroYolu(ilce: string | null): string | null {
  const k = YURUYUS_KAROLARI.find((i) => i.ilce === ilce);
  return k ? `karolar/${k.dosya}` : null;
}
