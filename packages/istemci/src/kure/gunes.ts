/** Güneş yönü (saf): sim saatinden gece/gündüz terminatörü için alt-güneş noktası. */
import { llVek } from "./matematik";
import type { Vek3 } from "./matematik";

/** Sim saat 0'ın UTC saati (başlangıçta Türkiye/Karadeniz gündüz olsun diye 09:00). */
export const BASLANGIC_SAAT_UTC = 9;

/** Yılın başlangıcı: sim gün 0 = ilkbahar ekinoksu (deklinasyon 0). */
export function altGunesNoktasi(simSaat: number): { boylam: number; enlem: number } {
  const utc = (((simSaat + BASLANGIC_SAAT_UTC) % 24) + 24) % 24;
  let boylam = 180 - 15 * utc;
  if (boylam > 180) boylam -= 360;
  if (boylam < -180) boylam += 360;
  const gun = simSaat / 24;
  const dekl = 23.44 * Math.sin((2 * Math.PI * gun) / 365.25);
  return { boylam, enlem: dekl };
}

export function gunesYonu(simSaat: number): Vek3 {
  const n = altGunesNoktasi(simSaat);
  return llVek(n.boylam, n.enlem);
}

/** "Gün N · SS:00" biçiminde sim saati (UTC saat dilimi). */
export function simSaatMetni(simSaat: number): string {
  const s = Math.floor(simSaat);
  const gun = Math.floor(s / 24) + 1;
  const utc = (((s + BASLANGIC_SAAT_UTC) % 24) + 24) % 24;
  return `Gün ${gun} · ${String(utc).padStart(2, "0")}:00`;
}

