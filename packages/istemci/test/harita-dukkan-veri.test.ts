import { afterEach, describe, expect, it } from "vitest";
import { IlkSatisIzleyici, oneriDurumu, rafaKonabilirStok, sahteDukkanKaynagi, tarayiciDeposu, uretimTesisiBasladi } from "../src/harita/dukkan-veri";
import type { Depo, DukkanGorunumu, OneriGirdisi } from "../src/harita/dukkan-veri";

const EK = new Set(["ambar", "ticaret_ofisi", "dukkan"]);
const ekMi = (t: string): boolean => EK.has(t);

function gorunum(ek: Partial<DukkanGorunumu> = {}): DukkanGorunumu {
  return { kapali: false, dukkanlar: [], markalar: [], ilkSatisT: null, satilabilirMallar: new Set(["gida"]), kurmaKarsilaniyor: true, kampanyaAcik: true, ...ek };
}

function girdi(ek: Partial<OneriGirdisi> = {}): OneriGirdisi {
  return { yapilar: [{ durum: "insaat", tur: "ciftlik" }], ekYapiMi: ekMi, dukkan: gorunum(), stokVar: true, oneriKapatildi: false, defterAtlandi: false, defterSiradaki: true, ...ek };
}

function bellekDeposu(): Depo & { m: Map<string, string> } {
  const m = new Map<string, string>();
  return { m, oku: (a) => m.get(a) ?? null, yaz: (a, d) => void m.set(a, d) };
}

describe("D0 dükkân önerisi ve B7 Defter kartı kuralı", () => {
  it("ilk üretim yapısının inşası BAŞLAMIŞSA (bitmesi beklenmez) öneri çıkar", () => {
    expect(oneriDurumu(girdi())).toBe("dukkan");
    expect(oneriDurumu(girdi({ yapilar: [{ durum: "tesis", tur: "ciftlik" }] }))).toBe("dukkan");
  });

  it("ek yapılar, dükkân ve büyütme sayılmaz: üretim tesisi yoksa öneri yok", () => {
    expect(uretimTesisiBasladi([{ durum: "tesis", tur: "ambar" }, { durum: "insaat", tur: "dukkan" }], ekMi)).toBe(false);
    expect(uretimTesisiBasladi([{ durum: "insaat", tur: "ciftlik", yukseltme: { tesis: 1 } }], ekMi)).toBe(false);
    expect(oneriDurumu(girdi({ yapilar: [{ durum: "tesis", tur: "ambar" }] }))).toBe("defter");
    expect(oneriDurumu(girdi({ yapilar: [] }))).toBe("defter");
  });

  it("dükkân varsa (inşadaki dahil), kapatılmışsa, stok yoksa, bedel karşılanmıyorsa, dünya kapalıysa öneri yok", () => {
    const var1 = gorunum({ dukkanlar: [{ id: 1 } as never] });
    expect(oneriDurumu(girdi({ dukkan: var1 }))).toBe("defter");
    expect(oneriDurumu(girdi({ oneriKapatildi: true }))).toBe("defter");
    expect(oneriDurumu(girdi({ stokVar: false }))).toBe("defter");
    expect(oneriDurumu(girdi({ dukkan: gorunum({ kurmaKarsilaniyor: false }) }))).toBe("defter");
    expect(oneriDurumu(girdi({ dukkan: gorunum({ kapali: true }) }))).toBe("defter");
  });

  it("dükkân verisi yoksa yalnız Defter kartı: atlanınca ya da sıradaki adım yoksa kart yok; atlanan yeniden çıkmaz", () => {
    expect(oneriDurumu(girdi({ dukkan: null }))).toBe("defter");
    expect(oneriDurumu(girdi({ dukkan: null, defterAtlandi: true }))).toBe(null);
    expect(oneriDurumu(girdi({ dukkan: null, defterSiradaki: false }))).toBe(null);
  });

  it("dükkân önerisi varken Defter kartı ona katlanır (tek kart)", () => {
    expect(oneriDurumu(girdi({ defterAtlandi: true }))).toBe("dukkan");
    expect(oneriDurumu(girdi({ defterSiradaki: false }))).toBe("dukkan");
  });

  it("rafa konabilir stok: dükkân türlerinden birinin satabileceği mal ve mevcut > 0", () => {
    const s = new Set(["gida", "ekmek"]);
    expect(rafaKonabilirStok([{ mal: "gida", stokMili: 1 }], s)).toBe(true);
    expect(rafaKonabilirStok([{ mal: "gida", stokMili: 0 }], s)).toBe(false);
    expect(rafaKonabilirStok([{ mal: "celik", stokMili: 5000 }], s)).toBe(false);
  });
});

describe("ilk satış bildirimi", () => {
  it("alan bu oturumda ilk göründüğünde bir kez; önceki oturumun satışı ya da yeniden yükleme sessiz", () => {
    const d = bellekDeposu();
    const iz = new IlkSatisIzleyici(d);
    expect(iz.kontrol(null)).toBe(false);
    expect(iz.kontrol(null)).toBe(false);
    expect(iz.kontrol(5_000)).toBe(true);
    expect(iz.kontrol(5_000)).toBe(false);
    expect(iz.kontrol(6_000)).toBe(false);
    // yeniden yükleme: bayrak var, alan ilk okumada zaten dolu
    expect(new IlkSatisIzleyici(d).kontrol(5_000)).toBe(false);
    // başka depoda (temiz) ilk okuma zaten doluysa: önceki oturumun satışı, bildirim yok
    expect(new IlkSatisIzleyici(bellekDeposu()).kontrol(5_000)).toBe(false);
  });
});

describe("kalıcı tercih deposu", () => {
  const eski = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  afterEach(() => {
    if (eski) Object.defineProperty(globalThis, "localStorage", eski);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("localStorage yokken ya da atarken oturum belleğine düşer", () => {
    const d = tarayiciDeposu();
    expect(d.oku("a")).toBeNull();
    d.yaz("a", "1");
    expect(d.oku("a")).toBe("1");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("erişilemez");
      },
    });
    const d2 = tarayiciDeposu();
    expect(() => d2.yaz("b", "2")).not.toThrow();
    expect(d2.oku("b")).toBe("2");
  });

  it("localStorage varsa oraya yazar", () => {
    const m = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } });
    const d = tarayiciDeposu();
    d.yaz("x", "1");
    expect(m.get("x")).toBe("1");
    expect(tarayiciDeposu().oku("x")).toBe("1");
  });
});

describe("sahte kaynak", () => {
  it("görünümü verir ve güncellenir", () => {
    const k = sahteDukkanKaynagi(null);
    expect(k.gorunum()).toBeNull();
    const g = gorunum();
    k.guncelle(g);
    expect(k.gorunum()).toBe(g);
  });
});
