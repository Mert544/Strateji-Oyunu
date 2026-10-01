/** Bellek içi depo (testler ve geçici geliştirme dünyası). Kayıtlar yapısal kopyayla saklanır. */
import { seqSurekliligiDenetle } from "./tipler";
import type { AnlikGoruntuKaydi, Depo, GoruntuDeposu, GunlukDeposu, GunlukKaydi } from "./tipler";

export class BellekGunlukDeposu implements GunlukDeposu {
  private readonly kayitlar: GunlukKaydi[] = [];

  async ekle(toplu: readonly GunlukKaydi[]): Promise<void> {
    seqSurekliligiDenetle(this.kayitlar.at(-1)?.seq ?? 0, toplu);
    for (const k of toplu) this.kayitlar.push(structuredClone(k));
  }

  async oku(seqSonrasi: number): Promise<GunlukKaydi[]> {
    return this.kayitlar.filter((k) => k.seq > seqSonrasi).map((k) => structuredClone(k));
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

  get sayi(): number {
    return this.goruntuler.length;
  }

  async kapat(): Promise<void> {}
}

export function bellekDeposu(): Depo & { gunluk: BellekGunlukDeposu; goruntu: BellekGoruntuDeposu } {
  return { gunluk: new BellekGunlukDeposu(), goruntu: new BellekGoruntuDeposu() };
}
