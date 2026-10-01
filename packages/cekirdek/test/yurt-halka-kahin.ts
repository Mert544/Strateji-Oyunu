/**
 * KÂHİN (yurt halka araması; docs/06 §15.11): halka öncesi `geometri.ts kumeSec`in BİREBİR kopyası (tüm adayları (uzaklık², kimlik dizesi)
 * sıralar, `Map`'e koyar). `kumeSecHalka` bu işlevle aynı hücreleri aynı seçim sırasıyla vermelidir; silinmez, değiştirilmez.
 */
import { KOMSULAR, dizge } from "../src/mulk/geometri";
import type { Nokta } from "../src/mulk/geometri";

/** Adaylar arasında merkeze (cx, cy) en yakın tohumdan büyüyen `n` hücrelik kenar-bitişik küme; yoksa null. */
export function kumeSecEski(adaylar: readonly Nokta[], n: number, cx: number, cy: number): string[] | null {
  const uzak = (c: { x: number; y: number }): number => (c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy);
  const sirali = adaylar.map((c) => ({ ...c, u: uzak(c) })).sort((a, b) => a.u - b.u || dizge(a.id, b.id));
  const kimlik = new Map(sirali.map((c) => [c.id, c]));
  const basarisiz = new Set<string>();
  for (const tohum of sirali) {
    if (basarisiz.has(tohum.id)) continue;
    // Bağlı bileşen yeterince büyük mü? (taşkın doldurma)
    const bilesen = new Set<string>([tohum.id]);
    const yigin = [tohum.id];
    while (yigin.length > 0) {
      const c = kimlik.get(yigin.pop() as string) as { x: number; y: number };
      for (const [dx, dy] of KOMSULAR) {
        const k = `${c.x + dx}:${c.y + dy}`;
        if (kimlik.has(k) && !bilesen.has(k)) {
          bilesen.add(k);
          yigin.push(k);
        }
      }
    }
    if (bilesen.size < n) {
      for (const id of bilesen) basarisiz.add(id); // bileşen n'den küçük: içindeki hiçbir hücre tohum olamaz
      continue;
    }
    // Merkeze en yakın komşuyu ekleyerek büyüt (kompakt küme).
    const secilen = [tohum.id];
    const secili = new Set(secilen);
    while (secilen.length < n) {
      let en: { id: string; u: number } | null = null;
      for (const id of secilen) {
        const c = kimlik.get(id) as { x: number; y: number };
        for (const [dx, dy] of KOMSULAR) {
          const k = `${c.x + dx}:${c.y + dy}`;
          const a = kimlik.get(k);
          if (a !== undefined && !secili.has(k) && (en === null || a.u < en.u || (a.u === en.u && dizge(a.id, en.id) < 0))) en = a;
        }
      }
      if (en === null) break; // bileşen yeterli büyüklükte olduğundan olmaz
      secilen.push(en.id);
      secili.add(en.id);
    }
    if (secilen.length === n) return secilen;
  }
  return null;
}
