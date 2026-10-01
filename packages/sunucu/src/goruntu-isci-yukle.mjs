// Görüntü işçisi önyükleyicisi: TypeScript işçi dosyasını tsx ile yükler (worker_threads `--import`'u uygulamaz).
// `workerData.betik` = yüklenecek .ts dosyasının file: URL'si. tsx kök bağımlılıktır (CLI zaten `node --import tsx` ile açılır).
import { workerData } from "node:worker_threads";
const { tsImport } = await import("tsx/esm/api");
await tsImport(workerData.betik, import.meta.url);
