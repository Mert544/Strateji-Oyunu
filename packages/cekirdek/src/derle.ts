/**
 * İçerik derleyici: VeriPaketi -> DerlenmisIcerik (kimlik -> indeks eşlemeleri, lojistik sırası, komşuluk).
 * Başlangıçta bir kez çalışır; sonuç salt okunurdur ve dünya durumuna girmez.
 */
import type { VeriPaketi } from "@bolge/veri";
import type { DerlenmisIcerik } from "./tipler";

/** Kimlik listesinden kimlik -> indeks eşlemesi; tekrarlanan kimlikte hata. Prototipsiz nesne (örn. "constructor" güvenli). */
function indeksle(tur: string, kimlikler: readonly string[]): Record<string, number> {
  const harita: Record<string, number> = Object.create(null) as Record<string, number>;
  for (let i = 0; i < kimlikler.length; i++) {
    const id = kimlikler[i] as string;
    if (id in harita) throw new Error(`icerikDerle: tekrarlanan ${tur} kimligi: ${id}`);
    harita[id] = i;
  }
  return harita;
}

/**
 * İçeriği derler: indeks eşlemeleri, lojistikSirasi (lojistikOnceligi artan, eşitlikte mal indeksi)
 * ve komsuKenarlar (bölge -> kenar indeksleri, artan). Yinelenen kimlik veya bilinmeyen kenar ucu hata verir.
 */
export function icerikDerle(veri: VeriPaketi): DerlenmisIcerik {
  const { harita, icerik, param } = veri;
  const malIndeks = indeksle("mal", icerik.mallar.map((m) => m.id));
  const yontemIndeks = indeksle("yontem", icerik.yontemler.map((y) => y.id));
  const tesisTuruIndeks = indeksle("tesis turu", icerik.tesisTurleri.map((t) => t.id));
  const teknolojiIndeks = indeksle("teknoloji", icerik.teknolojiler.map((t) => t.id));
  const birlikIndeks = indeksle("birlik", icerik.birlikler.map((b) => b.id));
  const bolgeIndeks = indeksle("bolge", harita.bolgeler.map((b) => b.id));

  // Depolanamaz mal (elektrik, B2) lojistikten geçmez: akış çözümü bu sıradan çıkarılır.
  const lojistikSirasi = icerik.mallar
    .map((m, i) => ({ i, o: m.lojistikOnceligi, depolanabilir: m.depolanabilir !== false }))
    .filter((x) => x.depolanabilir)
    .sort((x, y) => x.o - y.o || x.i - y.i)
    .map((x) => x.i);

  const komsuKenarlar: number[][] = harita.bolgeler.map(() => []);
  for (let k = 0; k < harita.kenarlar.length; k++) {
    const kenar = harita.kenarlar[k];
    if (!kenar) continue;
    const a = bolgeIndeks[kenar.a];
    const b = bolgeIndeks[kenar.b];
    if (a === undefined || b === undefined) {
      throw new Error(`icerikDerle: kenar ${k} bilinmeyen bolgeye bagli (${kenar.a} - ${kenar.b})`);
    }
    (komsuKenarlar[a] as number[]).push(k);
    if (b !== a) (komsuKenarlar[b] as number[]).push(k);
  }

  return {
    harita,
    icerik,
    param,
    mallar: icerik.mallar,
    malIndeks,
    yontemler: icerik.yontemler,
    yontemIndeks,
    tesisTurleri: icerik.tesisTurleri,
    tesisTuruIndeks,
    teknolojiler: icerik.teknolojiler,
    teknolojiIndeks,
    birlikler: icerik.birlikler,
    birlikIndeks,
    bolgeIndeks,
    lojistikSirasi,
    komsuKenarlar,
  };
}
