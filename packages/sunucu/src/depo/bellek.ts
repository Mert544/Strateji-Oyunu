/** Bellek içi depo (testler ve geçici geliştirme dünyası). Kayıtlar yapısal kopyayla saklanır. */
import { OZET_KAYIT_OMRU_MS, OZET_KAYIT_TAVANI, ozetKaydiAnahtari, seqSurekliligiDenetle } from "./tipler";
import type { AnlikGoruntuKaydi, Capa, Depo, GoruntuDeposu, GunlukDeposu, GunlukKaydi, OzetKaydi, ProfilDeposu } from "./tipler";

export class BellekGunlukDeposu implements GunlukDeposu {
  private readonly kayitlar: GunlukKaydi[] = [];

  async ekle(toplu: readonly GunlukKaydi[]): Promise<void> {
    seqSurekliligiDenetle(this.kayitlar.at(-1)?.seq ?? 0, toplu);
    for (const k of toplu) this.kayitlar.push(structuredClone(k));
  }

  async oku(seqSonrasi: number): Promise<GunlukKaydi[]> {
    return this.kayitlar.filter((k) => k.seq > seqSonrasi).map((k) => structuredClone(k));
  }

  /** Yaklaşık bayt (JSON uzunluğu). */
  bayt(): number {
    return this.kayitlar.reduce((n, k) => n + JSON.stringify(k).length + 1, 0);
  }

  async kapat(): Promise<void> {}
}

export class BellekGoruntuDeposu implements GoruntuDeposu {
  private readonly goruntuler: AnlikGoruntuKaydi[] = [];

  async kaydet(g: AnlikGoruntuKaydi): Promise<void> {
    this.goruntuler.push(structuredClone(g));
  }

  async sonuncu(): Promise<AnlikGoruntuKaydi | null> {
    let en: AnlikGoruntuKaydi | null = null;
    for (const g of this.goruntuler) if (en === null || g.seq >= en.seq) en = g;
    return en ? structuredClone(en) : null;
  }

  /** Göç yedekleri (etiket -> kayıt; yapısal kopya). */
  readonly yedekler = new Map<string, AnlikGoruntuKaydi>();

  async yedekle(g: AnlikGoruntuKaydi, etiket: string): Promise<string> {
    this.yedekler.set(etiket, structuredClone(g));
    return `bellek:${etiket}`;
  }

  get sayi(): number {
    return this.goruntuler.length;
  }

  /** Yaklaşık bayt (metin + üst veri). */
  bayt(): number {
    return this.goruntuler.reduce((n, g) => n + g.metin.length + JSON.stringify(g.ek).length, 0);
  }

  async kapat(): Promise<void> {}
}

/** Ortak: oyuncu başına özet kaydı halkası (anahtarlı, tavanlı, ömürlü) ve çapalar; bellek ve dosya depoları paylaşır. */
export class BellekProfilDeposu implements ProfilDeposu {
  protected readonly capalar = new Map<string, Capa>();
  protected readonly kayitlar = new Map<string, Map<string, OzetKaydi>>();

  async capaOku(oyuncu: string): Promise<Capa | null> {
    const c = this.capalar.get(oyuncu);
    return c ? structuredClone(c) : null;
  }

  async capaYaz(oyuncu: string, kismi: Capa): Promise<void> {
    this.capaUygula(oyuncu, kismi);
  }

  async kayitEkle(oyuncu: string, kayitlar: readonly OzetKaydi[], simdi: number): Promise<number> {
    return this.kayitUygula(oyuncu, kayitlar, simdi).length;
  }

  async kayitOku(oyuncu: string): Promise<OzetKaydi[]> {
    return [...(this.kayitlar.get(oyuncu)?.values() ?? [])].map((k) => structuredClone(k)).sort(kayitSirasi);
  }

  async esitle(): Promise<void> {}

  async kapat(): Promise<void> {}

  protected capaUygula(oyuncu: string, kismi: Capa): void {
    this.capalar.set(oyuncu, { ...(this.capalar.get(oyuncu) ?? {}), ...structuredClone(kismi) });
  }

  /** Yeni (daha önce olmayan) kayıtlar; tavan ve ömür uygulanır. */
  protected kayitUygula(oyuncu: string, kayitlar: readonly OzetKaydi[], simdi: number): OzetKaydi[] {
    let m = this.kayitlar.get(oyuncu);
    if (!m) this.kayitlar.set(oyuncu, (m = new Map()));
    const yeni: OzetKaydi[] = [];
    for (const k of kayitlar) {
      const a = ozetKaydiAnahtari(k);
      if (m.has(a)) continue;
      m.set(a, structuredClone(k));
      yeni.push(k);
    }
    // Ömür (30 sim-günü) ve halka (≤200, en eski t önce atılır).
    for (const [a, k] of m) if (k.t < simdi - OZET_KAYIT_OMRU_MS) m.delete(a);
    if (m.size > OZET_KAYIT_TAVANI) {
      const sirali = [...m.entries()].sort((x, y) => kayitSirasi(x[1], y[1]));
      for (const [a] of sirali.slice(0, m.size - OZET_KAYIT_TAVANI)) m.delete(a);
    }
    return yeni;
  }
}

export function kayitSirasi(a: OzetKaydi, b: OzetKaydi): number {
  return a.t - b.t || (a.tur < b.tur ? -1 : a.tur > b.tur ? 1 : 0) || a.sira - b.sira;
}

export function bellekDeposu(): Depo & { gunluk: BellekGunlukDeposu; goruntu: BellekGoruntuDeposu; profil: BellekProfilDeposu } {
  const gunluk = new BellekGunlukDeposu();
  const goruntu = new BellekGoruntuDeposu();
  return { gunluk, goruntu, profil: new BellekProfilDeposu(), boyut: async () => ({ gunlukBayt: gunluk.bayt(), goruntuBayt: goruntu.bayt() }) };
}
