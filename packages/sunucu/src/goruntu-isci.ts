/**
 * Görüntü işçisi (worker_threads girişi): anlık görüntünün KANONİK serileştirmesi, durum özeti ve (istenirse) gzip'i ana
 * döngüden ayrı iş parçacığında yapılır. Ana iş parçacığı yalnız dünyanın yapısal kopyasını verir (`postMessage`).
 *
 * İşçi `anlikGoruntuOlusturOzetli`'yi çekirdekten AYNEN çağırır: metin ve özet, ana döngüde eşzamanlı üretilenle bayt bayt aynıdır
 * (test/goruntu-isci.test.ts). Tek fark `ic`: işçiye yalnız kimlik tablosu verilir ve onunla `{ icerik }` biçiminde bir
 * kabuk kurulur; `icerikKimlikTablosuOlustur` yalnız bu kimlikleri okur.
 *
 * Bu dosya doğrudan çalıştırılmaz; `goruntu.ts` içindeki `GoruntuIscisi` başlatır.
 */
import { parentPort } from "node:worker_threads";
import { gzipSync } from "node:zlib";
import { anlikGoruntuOlusturOzetli } from "@bolge/cekirdek";
import type { Dunya, IcerikKimlikTablosu } from "@bolge/cekirdek";
import type { IsciIstegi, IsciYaniti } from "./goruntu";

if (!parentPort) throw new Error("goruntu-isci yalniz worker_threads icinde calisir");
const port = parentPort;

let kabuk: { icerik: Record<string, Array<{ id: string }>> } | null = null;
let kuralSurumu = "";

function kabukKur(t: IcerikKimlikTablosu): { icerik: Record<string, Array<{ id: string }>> } {
  const icerik: Record<string, Array<{ id: string }>> = {};
  for (const [ad, ids] of Object.entries(t)) icerik[ad] = (ids as string[]).map((id) => ({ id }));
  return { icerik };
}

port.on("message", (m: IsciIstegi) => {
  if (m.tur === "kur") {
    kabuk = kabukKur(m.tablo);
    kuralSurumu = m.kuralSurumu;
    return;
  }
  const bas = performance.now();
  try {
    if (kabuk === null) throw new Error("isci kurulmadi");
    const { metin, durumOzeti } = anlikGoruntuOlusturOzetli({ dunya: m.dunya as Dunya, ic: kabuk as never }, kuralSurumu);
    const serilestirMs = performance.now() - bas;
    let gzip: Uint8Array | undefined;
    let sikistirMs = 0;
    if (m.sikistir) {
      const g0 = performance.now();
      const b = gzipSync(metin);
      // Havuzdan gelmeyen, kendi ArrayBuffer'ına sahip kopya: devredilebilir (kopyasız).
      gzip = b.byteOffset === 0 && b.byteLength === b.buffer.byteLength ? new Uint8Array(b.buffer, 0, b.byteLength) : Uint8Array.from(b);
      sikistirMs = performance.now() - g0;
    }
    const yanit: IsciYaniti = { id: m.id, tamam: true, metin, durumOzeti, ...(gzip ? { gzip } : {}), serilestirMs, sikistirMs, isciMs: performance.now() - bas };
    port.postMessage(yanit, gzip ? [gzip.buffer as ArrayBuffer] : []);
  } catch (e) {
    const yanit: IsciYaniti = { id: m.id, tamam: false, hata: e instanceof Error ? e.message : String(e) };
    port.postMessage(yanit);
  }
});
