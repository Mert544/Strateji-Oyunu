/**
 * Parsel fikstürünü dosyadan yükleme (CLI `--parsel-dosya`): JSON okunur, `@bolge/veri` doğrulayıcısından
 * (`dogrulaParselFiksturu`, harita ile) geçirilir ve veri paketine bağlanır. Geçersizse anlaşılır tek bir hata fırlatılır.
 *
 * Mülk kipi çekirdekte ancak `param.mulk` ve parsel fikstürü BİRLİKTE verilince açılır; fikstür verilip `param.mulk` yoksa
 * sessizce bölge kipinde kalmak yerine açıkça hata verilir.
 */
import { readFileSync } from "node:fs";
import { dogrulaParselFiksturu } from "@bolge/veri";
import type { ParselFiksturu } from "@bolge/veri";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";

export function parselDosyasiYukle(yol: string, veri: CekirdekVeriPaketi): ParselFiksturu {
  let metin: string;
  try {
    metin = readFileSync(yol, "utf8");
  } catch (e) {
    throw new Error(`parsel dosyasi okunamadi (${yol}): ${e instanceof Error ? e.message : String(e)}`);
  }
  let ham: unknown;
  try {
    ham = JSON.parse(metin);
  } catch (e) {
    throw new Error(`parsel dosyasi gecerli JSON degil (${yol}): ${e instanceof Error ? e.message : String(e)}`);
  }
  const s = dogrulaParselFiksturu(ham, { harita: veri.harita });
  if (!s.gecerli) {
    const ilk = s.hatalar.slice(0, 10);
    const fazla = s.hatalar.length - ilk.length;
    throw new Error(`parsel fiksturu gecersiz (${yol}):\n - ${ilk.join("\n - ")}${fazla > 0 ? `\n - ... ve ${fazla} hata daha` : ""}`);
  }
  if (veri.param.mulk === undefined) {
    throw new Error("mulk kipi icin parametreler.mulk de gerekli (fikstur verildi ama veri paketinde param.mulk yok)");
  }
  return ham as ParselFiksturu;
}
