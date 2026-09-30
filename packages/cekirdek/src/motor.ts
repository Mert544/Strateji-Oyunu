/**
 * SAPLAMA (stub) — Ajan B tarafından uygulanacak. Genel API imzaları sözleşmedir.
 */
import type { VeriPaketi } from "@bolge/veri";
import type { DamgaliKomut, DerlenmisIcerik, Dunya, DunyaGorunumu, KomutSonucu, Ms } from "./tipler";

export class Simulasyon {
  private constructor(
    readonly ic: DerlenmisIcerik,
    readonly dunya: Dunya,
    readonly gunluk: DamgaliKomut[],
  ) {}

  /** İçeriği derler, dünyayı haritadan kurar, ilk saatlik tıkı ve ilk çözümü planlar. */
  static olustur(_veri: VeriPaketi, _tohum: number): Simulasyon {
    throw new Error("uygulanmadı");
  }

  /** Aynı veri + tohum + günlük ile baştan oynatır. */
  static yenidenOynat(veri: VeriPaketi, tohum: number, gunluk: readonly DamgaliKomut[]): Simulasyon {
    const s = Simulasyon.olustur(veri, tohum);
    for (const k of gunluk) s.uygula(k);
    return s;
  }

  /** Önce calistirKadar(k.t); komutu uygular; başarılıysa günlüğe ekler ve kirletir. */
  uygula(_k: DamgaliKomut): KomutSonucu {
    throw new Error("uygulanmadı");
  }

  /** t'ye kadar (dahil) tüm olayları işler; dunya.zaman = t. */
  calistirKadar(_t: Ms): void {
    throw new Error("uygulanmadı");
  }

  /** Kanonik durum özeti (FNV-1a 64, onaltılık). */
  durumOzeti(): string {
    throw new Error("uygulanmadı");
  }

  gorunum(): DunyaGorunumu {
    return { zaman: this.dunya.zaman, dunya: this.dunya, ic: this.ic };
  }

  /** Bağımsız kopya (structuredClone); ileriye bakan botlar için. */
  klonla(): Simulasyon {
    return new Simulasyon(this.ic, structuredClone(this.dunya), [...this.gunluk]);
  }
}
