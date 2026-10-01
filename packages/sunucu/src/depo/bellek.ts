/** Bellek içi depo (testler ve geçici geliştirme dünyası). Kayıtlar yapısal kopyayla saklanır. */
import { OZET_KAYIT_OMRU_MS, OZET_KAYIT_TAVANI, damgaSirasi, ozetKaydiAnahtari, seqSurekliligiDenetle } from "./tipler";
import { OTURUM_GUN_MS, OYUN_OTURUM_OMRU_MS, OyuncuCakismasi } from "./tipler";
import type { AnlikGoruntuKaydi, BaglantiKaydi, BaglantiTuketimi, Capa, Damga, Depo, GoruntuDeposu, GunlukDeposu, GunlukKaydi, GunlukOturumSayisi, HesapDeposu, HesapKaydi, OturumKaydi, OyunOturumDeposu, OyunOturumu, OzetKaydi, ProfilDeposu } from "./tipler";

export class BellekGunlukDeposu implements GunlukDeposu {
  private readonly kayitlar: GunlukKaydi[] = [];

  async ekle(toplu: readonly GunlukKaydi[]): Promise<void> {
    seqSurekliligiDenetle(this.kayitlar.at(-1)?.seq ?? 0, toplu);
    for (const k of toplu) this.kayitlar.push(structuredClone(k));
  }

  async oku(seqSonrasi: number, enCok?: number): Promise<GunlukKaydi[]> {
    const l = this.kayitlar.filter((k) => k.seq > seqSonrasi);
    return (enCok === undefined ? l : l.slice(0, enCok)).map((k) => structuredClone(k));
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
  protected readonly damgalar = new Map<string, Map<string, Damga>>();

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

  async damgaEkle(oyuncu: string, damgalar: readonly Damga[]): Promise<number> {
    return this.damgaUygula(oyuncu, damgalar).length;
  }

  async damgaOku(oyuncu: string): Promise<Damga[]> {
    return [...(this.damgalar.get(oyuncu)?.values() ?? [])].map((d) => ({ ...d })).sort(damgaSirasi);
  }

  async esitle(): Promise<void> {}

  async kapat(): Promise<void> {}

  /** Yeni (daha önce olmayan) damgalar; ilk yazım kazanır. */
  protected damgaUygula(oyuncu: string, damgalar: readonly Damga[]): Damga[] {
    let m = this.damgalar.get(oyuncu);
    if (!m) this.damgalar.set(oyuncu, (m = new Map()));
    const yeni: Damga[] = [];
    for (const d of damgalar) {
      if (m.has(d.kavram)) continue;
      m.set(d.kavram, { kavram: d.kavram, t: d.t, kaynak: d.kaynak });
      yeni.push(d);
    }
    return yeni;
  }

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

/** Hesap deposundaki bir değişiklik (dosya deposunda satır başına bir işlem; yeniden oynatma aynı `uygula` ile yapılır). */
export type HesapIslemi =
  | { o: "h+"; h: HesapKaydi }
  | { o: "h-"; id: string }
  | { o: "b+"; k: BaglantiKaydi }
  | { o: "b-"; ozet: string }
  | { o: "o+"; k: OturumKaydi }
  | { o: "o~"; id: string; s: number; b: number }
  | { o: "o-"; id: string }
  | { o: "oh-"; h: string }
  | { o: "s"; t: number };

/**
 * Bellek içi hesap deposu; dosya deposunun da tabanıdır. Her işlem eşzamanlı uygulanır (atomik) ve ardından `yaz` beklenir
 * (bellekte boş; dosyada satır + fdatasync): yanıt ancak kayıt kalıcı olunca döner.
 */
export class BellekHesapDeposu implements HesapDeposu {
  protected readonly hesaplar = new Map<string, HesapKaydi>();
  protected readonly anahtarlar = new Map<string, string>();
  protected readonly oyuncular = new Map<string, string>();
  protected readonly baglantilar = new Map<string, BaglantiKaydi>();
  protected readonly oturumlar = new Map<string, OturumKaydi>();

  /** Kalıcılık kancası (dosya deposu geçersiz kılar). */
  protected async yaz(_islem: HesapIslemi): Promise<void> {}

  /** Bir işlemi uygular; döndürdüğü sayı ya da kimlikler çağıranın sonucudur. Yeniden oynatma da bunu kullanır. */
  protected uygula(i: HesapIslemi): string[] {
    switch (i.o) {
      case "h+":
        this.hesaplar.set(i.h.id, structuredClone(i.h));
        this.anahtarlar.set(i.h.anahtar, i.h.id);
        this.oyuncular.set(i.h.oyuncu, i.h.id);
        return [];
      case "h-": {
        const h = this.hesaplar.get(i.id);
        if (!h) return [];
        this.hesaplar.delete(i.id);
        this.anahtarlar.delete(h.anahtar);
        this.oyuncular.delete(h.oyuncu);
        for (const [ozet, b] of this.baglantilar) if (b.anahtar === h.anahtar) this.baglantilar.delete(ozet);
        return this.oturumlariSil(i.id);
      }
      case "b+":
        for (const [ozet, b] of this.baglantilar) if (b.anahtar === i.k.anahtar) this.baglantilar.delete(ozet);
        this.baglantilar.set(i.k.ozet, structuredClone(i.k));
        return [];
      case "b-":
        this.baglantilar.delete(i.ozet);
        return [];
      case "o+":
        this.oturumlar.set(i.k.id, structuredClone(i.k));
        return [];
      case "o~": {
        const o = this.oturumlar.get(i.id);
        if (o) this.oturumlar.set(i.id, { ...o, sonKullanim: i.s, bitis: i.b });
        return [];
      }
      case "o-":
        this.oturumlar.delete(i.id);
        return [];
      case "oh-":
        return this.oturumlariSil(i.h);
      case "s":
        this.suresiGecenleriSil(i.t);
        return [];
    }
  }

  private suresiGecenleriSil(t: number): { baglanti: number; oturum: number } {
    let baglanti = 0;
    let oturum = 0;
    for (const [ozet, b] of this.baglantilar) {
      if (b.bitis > t) continue;
      this.baglantilar.delete(ozet);
      baglanti++;
    }
    for (const [id, o] of this.oturumlar) {
      if (o.bitis > t && o.mutlakBitis > t) continue;
      this.oturumlar.delete(id);
      oturum++;
    }
    return { baglanti, oturum };
  }

  private oturumlariSil(hesap: string): string[] {
    const silinen: string[] = [];
    for (const [id, o] of this.oturumlar) {
      if (o.hesap !== hesap) continue;
      this.oturumlar.delete(id);
      silinen.push(id);
    }
    return silinen;
  }

  async hesapOlustur(h: HesapKaydi): Promise<{ hesap: HesapKaydi; yeni: boolean }> {
    const mevcut = this.anahtarlar.get(h.anahtar);
    if (mevcut !== undefined) return { hesap: structuredClone(this.hesaplar.get(mevcut) as HesapKaydi), yeni: false };
    if (this.oyuncular.has(h.oyuncu) || this.hesaplar.has(h.id)) throw new OyuncuCakismasi(h.oyuncu);
    const i: HesapIslemi = { o: "h+", h };
    this.uygula(i);
    await this.yaz(i);
    return { hesap: structuredClone(h), yeni: true };
  }

  async hesapBulAnahtar(anahtar: string): Promise<HesapKaydi | null> {
    const id = this.anahtarlar.get(anahtar);
    const h = id === undefined ? undefined : this.hesaplar.get(id);
    return h ? structuredClone(h) : null;
  }

  async hesapBulId(id: string): Promise<HesapKaydi | null> {
    const h = this.hesaplar.get(id);
    return h ? structuredClone(h) : null;
  }

  async hesapSil(id: string): Promise<string[] | null> {
    if (!this.hesaplar.has(id)) return null;
    const i: HesapIslemi = { o: "h-", id };
    const silinen = this.uygula(i);
    await this.yaz(i);
    return silinen;
  }

  async baglantiEkle(k: BaglantiKaydi): Promise<void> {
    const i: HesapIslemi = { o: "b+", k };
    this.uygula(i);
    await this.yaz(i);
  }

  async baglantiTuket(ozet: string, simdi: number, tarayiciOzeti: string | null): Promise<BaglantiTuketimi> {
    const b = this.baglantilar.get(ozet);
    if (!b || b.bitis <= simdi) return { durum: "yok" };
    if (b.tarayiciOzeti !== null && b.tarayiciOzeti !== tarayiciOzeti) return { durum: "tarayici" };
    const i: HesapIslemi = { o: "b-", ozet };
    this.uygula(i);
    await this.yaz(i);
    return { durum: "tamam", kayit: structuredClone(b) };
  }

  async oturumEkle(o: OturumKaydi): Promise<void> {
    const i: HesapIslemi = { o: "o+", k: o };
    this.uygula(i);
    await this.yaz(i);
  }

  async oturumBul(id: string): Promise<OturumKaydi | null> {
    const o = this.oturumlar.get(id);
    return o ? structuredClone(o) : null;
  }

  async oturumUzat(id: string, sonKullanim: number, bitis: number): Promise<void> {
    if (!this.oturumlar.has(id)) return;
    const i: HesapIslemi = { o: "o~", id, s: sonKullanim, b: bitis };
    this.uygula(i);
    await this.yaz(i);
  }

  async oturumSil(id: string): Promise<boolean> {
    if (!this.oturumlar.has(id)) return false;
    const i: HesapIslemi = { o: "o-", id };
    this.uygula(i);
    await this.yaz(i);
    return true;
  }

  async hesabinOturumlariniSil(hesap: string): Promise<string[]> {
    const i: HesapIslemi = { o: "oh-", h: hesap };
    const silinen = this.uygula(i);
    if (silinen.length > 0) await this.yaz(i);
    return silinen;
  }

  async sureGecmisleriSil(simdi: number): Promise<{ baglanti: number; oturum: number }> {
    const sonuc = this.suresiGecenleriSil(simdi);
    if (sonuc.baglanti + sonuc.oturum > 0) await this.yaz({ o: "s", t: simdi });
    return sonuc;
  }

  async sayilar(): Promise<{ hesap: number; oturum: number; baglanti: number }> {
    return { hesap: this.hesaplar.size, oturum: this.oturumlar.size, baglanti: this.baglantilar.size };
  }

  /** Canlı durumu işlem listesi olarak verir (dosya sıkıştırması; yeniden oynatınca aynı durum). */
  protected durumIslemleri(): HesapIslemi[] {
    return [
      ...[...this.hesaplar.values()].map((h): HesapIslemi => ({ o: "h+", h })),
      ...[...this.baglantilar.values()].map((k): HesapIslemi => ({ o: "b+", k })),
      ...[...this.oturumlar.values()].map((k): HesapIslemi => ({ o: "o+", k })),
    ];
  }

  async esitle(): Promise<void> {}

  async kapat(): Promise<void> {}
}

/** Oyun oturumu deposundaki bir değişiklik (dosya deposunda satır başına bir işlem). */
export type OyunOturumIslemi = { o: "a"; k: OyunOturumu } | { o: "k"; id: number; t: number | null } | { o: "t"; kesim: number } | { o: "s" } | { o: "g"; g: GunlukOturumSayisi };

/** Bellek içi oyun oturumu deposu; dosya deposunun da tabanıdır (`yaz` kancası kalıcılığı ekler). */
export class BellekOyunOturumDeposu implements OyunOturumDeposu {
  protected readonly oturumlar = new Map<number, OyunOturumu>();
  protected readonly gunluk = new Map<number, GunlukOturumSayisi>();
  protected sonId = 0;

  protected async yaz(_islem: OyunOturumIslemi): Promise<void> {}

  protected uygula(i: OyunOturumIslemi): number {
    switch (i.o) {
      case "a":
        this.oturumlar.set(i.k.id, { ...i.k });
        this.sonId = Math.max(this.sonId, i.k.id);
        return 0;
      case "k": {
        const o = this.oturumlar.get(i.id);
        if (o) o.kapanis = i.t;
        return 0;
      }
      case "t": {
        // Yalnız TAM günler: kesim gün başlangıcıdır; o güne ait bütün ayrıntı satırları aynı anda toplulaşır (günlük farklı-oyuncu sayısı bölünmesin).
        const gruplar = new Map<number, { oturum: number; oyuncular: Set<string>; sureMs: number }>();
        let silinen = 0;
        for (const [id, o] of this.oturumlar) {
          if (o.acilis >= i.kesim) continue;
          const gun = Math.floor(o.acilis / OTURUM_GUN_MS) * OTURUM_GUN_MS;
          let g = gruplar.get(gun);
          if (!g) gruplar.set(gun, (g = { oturum: 0, oyuncular: new Set(), sureMs: 0 }));
          g.oturum++;
          g.oyuncular.add(o.oyuncu);
          if (o.kapanis !== null) g.sureMs += Math.max(0, o.kapanis - o.acilis);
          this.oturumlar.delete(id);
          silinen++;
        }
        for (const [gun, g] of gruplar) {
          const onceki = this.gunluk.get(gun);
          // Bir gün iki kez toplulaşırsa (tutarsız saatle) oyuncu sayısı üst sınırla toplanır; normal akışta gün tek seferde gelir.
          this.gunluk.set(gun, { gun, oturum: (onceki?.oturum ?? 0) + g.oturum, oyuncu: (onceki?.oyuncu ?? 0) + g.oyuncular.size, sureMs: (onceki?.sureMs ?? 0) + g.sureMs });
        }
        return silinen;
      }
      case "g":
        this.gunluk.set(i.g.gun, { ...i.g });
        return 0;
      case "s": {
        const n = this.oturumlar.size;
        this.oturumlar.clear();
        this.gunluk.clear();
        return n;
      }
    }
  }

  async ac(oyuncu: string, acilis: number): Promise<OyunOturumu> {
    const k: OyunOturumu = { id: this.sonId + 1, oyuncu, acilis, kapanis: null };
    const i: OyunOturumIslemi = { o: "a", k };
    this.uygula(i);
    await this.yaz(i);
    return { ...k };
  }

  async sonOturum(oyuncu: string): Promise<OyunOturumu | null> {
    let en: OyunOturumu | null = null;
    for (const o of this.oturumlar.values()) if (o.oyuncu === oyuncu && (en === null || o.acilis > en.acilis || (o.acilis === en.acilis && o.id > en.id))) en = o;
    return en ? { ...en } : null;
  }

  async kapanisYaz(id: number, kapanis: number | null): Promise<void> {
    if (!this.oturumlar.has(id)) return;
    const i: OyunOturumIslemi = { o: "k", id, t: kapanis };
    this.uygula(i);
    await this.yaz(i);
  }

  async oku(oyuncu?: string): Promise<OyunOturumu[]> {
    return [...this.oturumlar.values()].filter((o) => oyuncu === undefined || o.oyuncu === oyuncu).sort((a, b) => a.acilis - b.acilis || a.id - b.id).map((o) => ({ ...o }));
  }

  async toplulastir(simdi: number, omurMs = OYUN_OTURUM_OMRU_MS): Promise<number> {
    const kesim = Math.floor((simdi - omurMs) / OTURUM_GUN_MS) * OTURUM_GUN_MS;
    const i: OyunOturumIslemi = { o: "t", kesim };
    const n = this.uygula(i);
    if (n > 0) await this.yaz(i);
    return n;
  }

  async gunlukSayilar(): Promise<GunlukOturumSayisi[]> {
    return [...this.gunluk.values()].sort((a, b) => a.gun - b.gun).map((g) => ({ ...g }));
  }

  async dunyayiSil(): Promise<{ oturum: number; gunluk: number }> {
    const gunluk = this.gunluk.size;
    const oturum = this.uygula({ o: "s" });
    await this.yaz({ o: "s" });
    return { oturum, gunluk };
  }

  /** Canlı durumu işlem listesi (dosya sıkıştırması). Gün özetleri `g`, açık/kapalı oturumlar `a` (kapanış dahil). */
  protected durumSatirlari(): OyunOturumIslemi[] {
    return [...[...this.gunluk.values()].map((g): OyunOturumIslemi => ({ o: "g", g })), ...[...this.oturumlar.values()].map((k): OyunOturumIslemi => ({ o: "a", k }))];
  }

  async esitle(): Promise<void> {}

  async kapat(): Promise<void> {}
}

export function bellekDeposu(): Depo & { gunluk: BellekGunlukDeposu; goruntu: BellekGoruntuDeposu; profil: BellekProfilDeposu; hesap: BellekHesapDeposu; oyunOturumu: BellekOyunOturumDeposu } {
  const gunluk = new BellekGunlukDeposu();
  const goruntu = new BellekGoruntuDeposu();
  return { gunluk, goruntu, profil: new BellekProfilDeposu(), hesap: new BellekHesapDeposu(), oyunOturumu: new BellekOyunOturumDeposu(), boyut: async () => ({ gunlukBayt: gunluk.bayt(), goruntuBayt: goruntu.bayt() }) };
}
