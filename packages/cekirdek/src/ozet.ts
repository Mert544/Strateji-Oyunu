/**
 * Dünya durumunun kanonik serileştirmesi ve özeti.
 * Serileştirme: nesne anahtarları sıralı, JSON benzeri ama tamsayı dışı sayıları reddeder.
 * Özet: UTF-8 baytları üzerinde FNV-1a 64 bit, 16 haneli onaltılık dize.
 */
import type { Dunya } from "./tipler";

const kodlayici = new TextEncoder();

/** Değerde ilk geçersiz (tamsayı olmayan sayı, bigint, fonksiyon...) yerin yolunu bulur; yoksa null. */
function gecersizYol(v: unknown, yol: string): string | null {
  if (v === null || v === undefined || typeof v === "boolean" || typeof v === "string") return null;
  if (typeof v === "number") return Number.isInteger(v) ? null : `${yol} = ${String(v)}`;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const r = gecersizYol(v[i], `${yol}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (typeof v === "object") {
    for (const k of Object.keys(v).sort()) {
      const r = gecersizYol((v as Record<string, unknown>)[k], `${yol}.${k}`);
      if (r) return r;
    }
    return null;
  }
  return `${yol} (${typeof v})`;
}

function yaz(v: unknown, cikti: string[]): boolean {
  if (v === null || v === undefined) {
    cikti.push("null");
    return true;
  }
  switch (typeof v) {
    case "boolean":
      cikti.push(v ? "true" : "false");
      return true;
    case "number":
      if (!Number.isInteger(v)) return false;
      cikti.push(Object.is(v, -0) ? "0" : String(v));
      return true;
    case "string":
      cikti.push(JSON.stringify(v));
      return true;
    case "object": {
      if (Array.isArray(v)) {
        cikti.push("[");
        for (let i = 0; i < v.length; i++) {
          if (i > 0) cikti.push(",");
          if (!yaz(v[i], cikti)) return false;
        }
        cikti.push("]");
        return true;
      }
      const o = v as Record<string, unknown>;
      const anahtarlar = Object.keys(o).sort();
      cikti.push("{");
      let ilk = true;
      for (const k of anahtarlar) {
        const deger = o[k];
        if (deger === undefined) continue; // tanımsız alan yok sayılır (JSON gibi)
        if (!ilk) cikti.push(",");
        ilk = false;
        cikti.push(JSON.stringify(k), ":");
        if (!yaz(deger, cikti)) return false;
      }
      cikti.push("}");
      return true;
    }
    default:
      return false;
  }
}

/**
 * Değeri kanonik dizeye çevirir: anahtarlar sıralı; null/boolean/tamsayı/dize/dizi/nesne.
 * Tamsayı olmayan sayı, bigint veya fonksiyon görülürse hata fırlatır (determinizm ihlali).
 */
export function kanonikSerilestir(deger: unknown): string {
  const cikti: string[] = [];
  if (!yaz(deger, cikti)) {
    throw new TypeError(`kanonikSerilestir: desteklenmeyen deger: ${gecersizYol(deger, "$") ?? "?"}`);
  }
  return cikti.join("");
}

const FNV64_ILK_HI = 0xcbf29ce4;
const FNV64_ILK_LO = 0x84222325;

/** Dizenin UTF-8 baytları üzerinden FNV-1a 64; 16 haneli küçük harf onaltılık. */
export function fnv1a64(metin: string): string {
  const bayt = kodlayici.encode(metin);
  let hi = FNV64_ILK_HI;
  let lo = FNV64_ILK_LO;
  for (let i = 0; i < bayt.length; i++) {
    lo = (lo ^ (bayt[i] as number)) >>> 0;
    // (hi:lo) × 0x100000001b3 mod 2^64 = (hi:lo) × 0x1b3 + ((hi:lo) << 40)
    const p = lo * 0x1b3; // < 2^42: kesin
    const carry = Math.floor(p / 4294967296);
    const yeniLo = p >>> 0;
    hi = (Math.imul(hi, 0x1b3) + carry + (lo << 8)) >>> 0;
    lo = yeniLo;
  }
  return hi.toString(16).padStart(8, "0") + lo.toString(16).padStart(8, "0");
}

/** Kanonik serileştirme (anahtarlar sıralı) üzerinden FNV-1a 64 özeti, 16 hane onaltılık. */
export function durumOzeti(d: Dunya): string {
  return fnv1a64(kanonikSerilestir(d));
}
