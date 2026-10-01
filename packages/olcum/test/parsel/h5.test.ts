import { describe, expect, it } from "vitest";
import { depoKaybiOrani, h5ParselDegerlendir, parselKaybi } from "../../src/parsel";

describe("H5 parsel: cevrimdisi kayip", () => {
  const bas = [
    { id: "1:1", sahip: "b" },
    { id: "1:2", sahip: "b" },
    { id: "1:3", sahip: "a" },
    { id: "1:4", sahip: null },
  ];

  it("parsel kaybi: yalniz oyuncunun basta sahip oldugu ve sonda sahip olmadigi hucreler", () => {
    expect(parselKaybi(bas, bas, "b")).toEqual({ kayip: 0, kaybedilenler: [], baslangicHucre: 2 });
    const son = [
      { id: "1:1", sahip: "a" },
      { id: "1:3", sahip: "b" },
      { id: "1:4", sahip: "b" },
    ];
    // 1:1 el değiştirdi, 1:2 sonda hiç yok (silinmiş = kayıp); 1:3/1:4 kazanılanlar kayıp sayılmaz.
    expect(parselKaybi(bas, son, "b")).toEqual({ kayip: 2, kaybedilenler: ["1:1", "1:2"], baslangicHucre: 2 });
  });

  it("depo kaybi: pencere ici en yuksek stoka oran; bos pencereler; tutarsiz kayit", () => {
    const d = depoKaybiOrani([
      { kayip: 250, enYuksekStok: 1000 },
      { kayip: 100, enYuksekStok: 1000 },
      { kayip: 0, enYuksekStok: 0 },
    ]);
    expect(d).toEqual({ enBuyukPpm: 250_000, esikAsanPencere: 0, pencereSayisi: 3, bosPencere: 1 });
    expect(depoKaybiOrani([{ kayip: 251, enYuksekStok: 1000 }]).esikAsanPencere).toBe(1);
    expect(depoKaybiOrani([]).enBuyukPpm).toBeNull();
    expect(() => depoKaybiOrani([{ kayip: 1, enYuksekStok: 0 }])).toThrow(/tutarsiz/);
  });

  it("karar: parsel kaybi > 0 ya da %25 asimi kaldi; yagma yoksa belirsiz", () => {
    const sifir = parselKaybi(bas, bas, "b");
    expect(h5ParselDegerlendir(sifir, depoKaybiOrani([{ kayip: 250, enYuksekStok: 1000 }])).verdict).toBe("gecti");
    expect(h5ParselDegerlendir(sifir, depoKaybiOrani([{ kayip: 251, enYuksekStok: 1000 }])).verdict).toBe("kaldi");
    expect(h5ParselDegerlendir(sifir, depoKaybiOrani([])).verdict).toBe("belirsiz");
    const kayip = parselKaybi(bas, [{ id: "1:1", sahip: "b" }], "b");
    expect(h5ParselDegerlendir(kayip, depoKaybiOrani([])).verdict).toBe("kaldi");
  });
});
