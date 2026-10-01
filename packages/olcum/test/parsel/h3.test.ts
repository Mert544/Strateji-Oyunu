import { describe, expect, it } from "vitest";
import { esliDegisim, h3ParselDegerlendir, ordugahPayi } from "../../src/parsel";

describe("H3 parsel: ordugah kaymasi", () => {
  const yapilar = [
    { il: "sn_a", tur: "tarla", yuva: 2 },
    { il: "sn_a", tur: "celikhane", yuva: 3 },
    { il: "sn_a", tur: "ordugah", yuva: 3 },
    { il: "sn_a", tur: "konut", yuva: 7 },
    { il: "sn_b", tur: "ordugah", yuva: 3 },
  ];

  it("ordugah payi yuva uzerinden, yalniz verilen il", () => {
    expect(ordugahPayi(yapilar, "sn_a")).toEqual({ payPpm: 200_000, ordugahYuva: 3, toplamYuva: 15 });
    expect(ordugahPayi(yapilar, "sn_c").payPpm).toBeNull();
  });

  it("esli degisim: yalniz ortak anahtarlar; temel 0 tanimsiz; esik >= %10", () => {
    const d = esliDegisim({ "fiyat:sn_a:celik": 1000, "arz:sn_a:celik": 500, "arz:sn_b:gida": 0, "fiyat:sn_c:x": 5 }, { "fiyat:sn_a:celik": 1099, "arz:sn_a:celik": 450, "arz:sn_b:gida": 10 });
    expect(d.degisimler).toEqual({ "arz:sn_a:celik": 100_000, "arz:sn_b:gida": null, "fiyat:sn_a:celik": 99_000 });
    expect(d.enBuyukPpm).toBe(100_000);
    expect(d.enBuyukAnahtar).toBe("arz:sn_a:celik");
    expect(d.esikAsan).toEqual(["arz:sn_a:celik"]);
  });

  it("karar: onkosul tutmazsa belirsiz", () => {
    const pay = ordugahPayi(yapilar, "sn_a");
    expect(h3ParselDegerlendir(pay, esliDegisim({ k: 100 }, { k: 110 })).verdict).toBe("gecti");
    expect(h3ParselDegerlendir(pay, esliDegisim({ k: 100 }, { k: 109 })).verdict).toBe("kaldi");
    const az = ordugahPayi([{ il: "x", tur: "ordugah", yuva: 1 }, { il: "x", tur: "tarla", yuva: 9 }], "x");
    const r = h3ParselDegerlendir(az, esliDegisim({ k: 100 }, { k: 200 }));
    expect(r.mudahaleGecerli).toBe(false);
    expect(r.verdict).toBe("belirsiz");
  });
});
