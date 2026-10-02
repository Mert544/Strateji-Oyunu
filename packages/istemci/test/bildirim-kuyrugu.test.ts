/**
 * Bildirim kuyruğu (A5; saf, sahte saat): DOM'da aynı anda tek bildirim, süre görünür olunca başlar, hata öne geçer, sırada bekleyen varken
 * en az görünme süresi, Defter birleştirme penceresi, sıra sınırı, kullanıcı kapatması.
 */
import { describe, expect, it } from "vitest";
import { BildirimKuyrugu } from "../src/arayuz/bildirim-kuyrugu";
import type { BildirimOgesi, Cizici, GrupBilgisi } from "../src/arayuz/bildirim-kuyrugu";

interface Is {
  t: number;
  f: () => void;
  iptal: boolean;
}

function ortam() {
  let simdi = 0;
  const isler: Is[] = [];
  const dom: Array<{ mesaj: string; tur: string }> = [];
  const gunluk: string[] = [];
  const cizici: Cizici<{ mesaj: string; tur: string }> = {
    goster: (o) => {
      const h = { mesaj: o.mesaj, tur: o.tur };
      dom.push(h);
      gunluk.push(`+${o.mesaj}`);
      return h;
    },
    guncelle: (h, o) => {
      h.mesaj = o.mesaj;
      gunluk.push(`~${o.mesaj}`);
    },
    kapat: (h, bitti) => {
      // çıkış hareketi 220 ms
      isler.push({ t: simdi + 220, f: () => (dom.splice(dom.indexOf(h), 1), gunluk.push(`-${h.mesaj}`), bitti()), iptal: false });
    },
  };
  const k = new BildirimKuyrugu({
    cizici,
    simdi: () => simdi,
    zamanla: (f, ms) => {
      const is: Is = { t: simdi + ms, f, iptal: false };
      isler.push(is);
      return () => {
        is.iptal = true;
      };
    },
    sure: (tur) => (tur === "hata" ? 8000 : 4500),
  });
  /** Saati ilerletir ve zamanı gelen işleri sırayla çalıştırır. */
  const ilerle = (ms: number): void => {
    const hedef = simdi + ms;
    for (;;) {
      const siradaki = isler.filter((i) => !i.iptal && i.t <= hedef).sort((a, b) => a.t - b.t)[0];
      if (!siradaki) break;
      simdi = Math.max(simdi, siradaki.t);
      siradaki.iptal = true;
      siradaki.f();
    }
    simdi = hedef;
  };
  return { k, dom, gunluk, ilerle, simdi: () => simdi };
}

const oge = (mesaj: string, tur: BildirimOgesi["tur"] = "bilgi", grup?: GrupBilgisi): BildirimOgesi => ({ mesaj, tur, ...(grup ? { grup } : {}) });
const defter = (deger: number): GrupBilgisi => ({ ad: "defter", n: 1, deger, birlestir: (n, d) => `Defterine ${n} satır işlendi${d > 0 ? ` · ≈ ${d} değerinde` : ""}` });

describe("tek görünür bildirim", () => {
  it("dört bildirim art arda: DOM'da hep en çok bir; sıra gelişle; her biri görününce süresi başlar", () => {
    const o = ortam();
    for (const m of ["a", "b", "c", "d"]) o.k.ekle(oge(m));
    expect(o.dom.map((x) => x.mesaj)).toEqual(["a"]);
    expect(o.k.bekleyen).toBe(3);
    const gorulen: string[] = [];
    for (let i = 0; i < 40 && o.k.gorunenMesaj !== null; i++) {
      o.ilerle(250);
      expect(o.dom.length).toBeLessThanOrEqual(1);
      const g = o.k.gorunenMesaj;
      if (g !== null && gorulen.at(-1) !== g) gorulen.push(g);
    }
    expect(gorulen).toEqual(["a", "b", "c", "d"]);
  });

  it("sırada bekleyen varken görünen en az 1,5 sn kalır (okunabilir), sonra kapanır; sıra boşsa tam süre (4,5 sn)", () => {
    const o = ortam();
    o.k.ekle(oge("a"));
    o.ilerle(1000);
    o.k.ekle(oge("b")); // a 1000 ms görünmüş: 500 ms sonra kapanır
    o.ilerle(499);
    expect(o.k.gorunenMesaj).toBe("a");
    o.ilerle(2); // 1501 ms
    o.ilerle(220); // çıkış hareketi
    expect(o.k.gorunenMesaj).toBe("b");
    // b tek başına: 4,5 sn
    o.ilerle(4400);
    expect(o.k.gorunenMesaj).toBe("b");
    o.ilerle(150);
    o.ilerle(220);
    expect(o.k.gorunenMesaj).toBeNull();
    expect(o.dom).toHaveLength(0);
  });

  it("hata sıranın önüne geçer (öteki hataların arkasına, hata-olmayanların önüne); görünen kesilmez", () => {
    const o = ortam();
    o.k.ekle(oge("ilk"));
    o.k.ekle(oge("bilgi-2"));
    o.k.ekle(oge("HATA-1", "hata"));
    o.k.ekle(oge("bilgi-3"));
    o.k.ekle(oge("HATA-2", "hata"));
    expect(o.k.gorunenMesaj).toBe("ilk");
    const sira: string[] = [];
    for (let i = 0; i < 80 && (o.k.gorunenMesaj !== null || o.k.bekleyen > 0); i++) {
      o.ilerle(250);
      const g = o.k.gorunenMesaj;
      if (g !== null && sira.at(-1) !== g) sira.push(g);
    }
    expect(sira).toEqual(["ilk", "HATA-1", "HATA-2", "bilgi-2", "bilgi-3"]);
  });

  it("kullanıcı kapatınca sıradaki hemen (çıkış hareketinden sonra) gelir", () => {
    const o = ortam();
    o.k.ekle(oge("a"));
    o.k.ekle(oge("b"));
    o.k.kapatGorunen();
    expect(o.k.gorunenMesaj).toBe("a"); // çıkış hareketi sürüyor
    o.ilerle(220);
    expect(o.k.gorunenMesaj).toBe("b");
    expect(o.dom.map((x) => x.mesaj)).toEqual(["b"]);
  });

  it("sıra sınırı: aşılırsa en eski hata-olmayan düşer, hata korunur", () => {
    const o = ortam();
    o.k.ekle(oge("gorunen"));
    o.k.ekle(oge("H", "hata"));
    for (let i = 0; i < 10; i++) o.k.ekle(oge(`m${i}`));
    expect(o.k.bekleyen).toBe(8);
    const gorulen: string[] = [];
    for (let i = 0; i < 200 && (o.k.gorunenMesaj !== null || o.k.bekleyen > 0); i++) {
      o.ilerle(250);
      const g = o.k.gorunenMesaj;
      if (g !== null && gorulen.at(-1) !== g) gorulen.push(g);
    }
    expect(gorulen[1]).toBe("H");
    expect(gorulen).not.toContain("m0");
    expect(gorulen).toContain("m9");
  });
});

describe("Defter birleştirme (2 sn pencere)", () => {
  it("görünen Defter bildirimine pencere içinde gelen yenisi yerinde birleşir; süre yenilenir", () => {
    const o = ortam();
    o.k.ekle(oge("Defter: İlk arsan.", "bilgi", defter(500)));
    o.ilerle(1500);
    o.k.ekle(oge("Defter: İlk yapın.", "bilgi", defter(100)));
    expect(o.gunluk).toEqual(["+Defter: İlk arsan.", "~Defterine 2 satır işlendi · ≈ 600 değerinde"]);
    expect(o.dom).toHaveLength(1);
    expect(o.k.bekleyen).toBe(0);
    o.ilerle(4400); // süre yenilendi: 1500'de değil, birleşmeden itibaren 4,5 sn
    expect(o.k.gorunenMesaj).not.toBeNull();
  });

  it("pencere dışında (ilkinden 2 sn sonra) yeni bildirim olarak sıraya girer", () => {
    const o = ortam();
    o.k.ekle(oge("Defter: a", "bilgi", defter(10)));
    o.ilerle(2100);
    o.k.ekle(oge("Defter: b", "bilgi", defter(20)));
    expect(o.k.bekleyen).toBe(1);
  });

  it("sıradaki Defter bildirimi de birleşir; değer yoksa tutarsız metin", () => {
    const o = ortam();
    o.k.ekle(oge("önce"));
    o.k.ekle(oge("Defter: a", "bilgi", defter(0)));
    o.k.ekle(oge("Defter: b", "bilgi", defter(0)));
    o.k.ekle(oge("Defter: c", "bilgi", defter(0)));
    expect(o.k.bekleyen).toBe(1);
    o.ilerle(1500);
    o.ilerle(220);
    expect(o.k.gorunenMesaj).toBe("Defterine 3 satır işlendi");
  });

  it("başka gruplar ve grupsuz bildirimler birleşmez", () => {
    const o = ortam();
    o.k.ekle(oge("a", "bilgi", defter(1)));
    o.k.ekle(oge("b"));
    o.k.ekle(oge("c", "bilgi", { ...defter(1), ad: "baska" }));
    expect(o.k.bekleyen).toBe(2);
  });
});

describe("inşa bitişi bildirimi ve Defter bildirimi sırası", () => {
  it("önce 'hazır', sonra Defter: kuyruk tek tek gösterir (Defter bildirimi sonradan gelir, öne geçmez)", () => {
    const o = ortam();
    o.k.ekle(oge("Gebze: Çiftlik hazır.")); // mulk-panel oku(): inşa bitişi önce
    o.k.ekle(oge("Defterine bir satır işlendi", "bilgi", defter(0))); // defterOku(): okuma sonrası
    expect(o.k.gorunenMesaj).toBe("Gebze: Çiftlik hazır.");
    expect(o.k.bekleyen).toBe(1);
    o.ilerle(1500);
    o.ilerle(220);
    expect(o.k.gorunenMesaj).toBe("Defterine bir satır işlendi");
    expect(o.gunluk.filter((g) => g.startsWith("+"))).toEqual(["+Gebze: Çiftlik hazır.", "+Defterine bir satır işlendi"]);
  });
});

