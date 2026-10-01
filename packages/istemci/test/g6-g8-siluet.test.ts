/** G6/G8: üretim yöntemi imza silüetleri (yürüyüş). DOM/GL yok. */
import { describe, expect, it } from "vitest";
import { Scene, ShaderMaterial } from "three";
import type { IlceSahipligi } from "../src/harita/baglanti";
import { ArsaKatmani, asamaKutulari, dukkanKutulari, ornekInsaatlar } from "../src/yuru/arsa";
import type { InsaatBilgisi } from "../src/yuru/arsa";
import type { YuruPaleti } from "../src/yuru/palet";
import { SILUET_RENK, SILUETLI_YONTEMLER, siluetKutulari, siluetliMi } from "../src/yuru/siluet";

const c = 29;
const say = (y: (typeof SILUETLI_YONTEMLER)[number], r: number): number => siluetKutulari(y, c).filter((b) => b[6] === r).length;

describe("yöntem silüetleri", () => {
  it("altı yöntem tanımlı; bilinmeyen ya da tanımsız yöntem silüetsiz", () => {
    expect([...SILUETLI_YONTEMLER]).toEqual(["degirmen", "ekmek_firini", "kepek_gubresi", "sut_kepekli", "cam_firini", "celik_dograma"]);
    expect(siluetliMi("degirmen")).toBe(true);
    expect(siluetliMi("standart_gida_isleme")).toBe(false);
    expect(siluetliMi(undefined)).toBe(false);
  });
  it("her yöntemde kutular hücre içinde ve sayısı ≤ 20 (örneklenmiş kutu bütçesi)", () => {
    for (const y of SILUETLI_YONTEMLER) {
      const k = siluetKutulari(y, c);
      expect(k.length, y).toBeLessThanOrEqual(20);
      for (const [x, , z, sx, , sz] of k) {
        expect(x, y).toBeGreaterThanOrEqual(0);
        expect(z, y).toBeGreaterThanOrEqual(0);
        expect(x + sx, y).toBeLessThanOrEqual(c);
        expect(z + sz, y).toBeLessThanOrEqual(c);
      }
    }
  });
  it("imza parçaları: değirmen silo + 6 çuval; fırın bacası + sıcak ışık; ahır silosu; cam firini yüksek baca + parıltı; çerçeve yığını", () => {
    expect([say("degirmen", SILUET_RENK.metal), say("degirmen", SILUET_RENK.cuval)]).toEqual([1, 6]);
    expect([say("ekmek_firini", SILUET_RENK.tugla), say("ekmek_firini", SILUET_RENK.isik)]).toEqual([1, 1]);
    expect(say("kepek_gubresi", SILUET_RENK.metal)).toBe(1);
    expect([say("kepek_gubresi", SILUET_RENK.toprak), say("kepek_gubresi", SILUET_RENK.cuval)]).toEqual([2, 0]);
    expect([say("sut_kepekli", SILUET_RENK.toprak), say("sut_kepekli", SILUET_RENK.cuval)]).toEqual([0, 4]);
    expect(say("cam_firini", SILUET_RENK.isik)).toBe(2);
    expect(Math.max(...siluetKutulari("cam_firini", c).map((b) => b[1] + b[4]))).toBeGreaterThan(15); // yüksek baca
    expect(say("celik_dograma", SILUET_RENK.metal)).toBe(1 + 12); // palet + 3 çerçeve × 4 çubuk
    // G8: cam ve pencere üreten tesislere ayırt edici cam dokunuşu (cam rafı; çerçeveye takılı cam + cephe pencere şeridi)
    expect([say("cam_firini", SILUET_RENK.cam), say("celik_dograma", SILUET_RENK.cam)]).toEqual([4, 2]);
    for (const y of SILUETLI_YONTEMLER.filter((x) => x !== "cam_firini" && x !== "celik_dograma")) expect(say(y, SILUET_RENK.cam), y).toBe(0);
  });
  it("yalnız tek tutarlı biçim: gövde ve çatı her yöntemde var; iki yöntemin silüeti aynı değil", () => {
    for (const y of SILUETLI_YONTEMLER) expect([say(y, 3), say(y, 4)].every((n) => n >= 1), y).toBe(true);
    expect(siluetKutulari("degirmen", c)).not.toEqual(siluetKutulari("ekmek_firini", c));
  });
});

describe("katman ve örnek veri", () => {
  const sahipl = (h: string[]): IlceSahipligi => ({ ilce: "x", uygun: 1000, satilmis: h.length, hucreler: new Map(h.map((id) => [id, { sahip: "bot", sinif: "kirsal" as const, degerMili: 1, alinma: 0 }])) });
  const pal = {
    koyu: true, ben: [0, 0.47, 0.51], baskasi: [0.5, 0.5, 0.5], sinif: new Float32Array(120).fill(0.4), izgara: [0.5, 0.5, 0.5], izgaraAlfa: 0.1,
    camIsik: [1, 0.7, 0.3], cam: [0.6, 0.75, 0.8], marka: new Float32Array(36).fill(0.5), insaat: [[0.5, 0.5, 0.5], [0.6, 0.5, 0.4], [0.7, 0.7, 0.7], [0.8, 0.8, 0.7]],
  } as unknown as YuruPaleti;
  const m = (): ShaderMaterial => new ShaderMaterial();
  it("yöntemli Tamam yapı silüet kutuları çizer (örnek sayısı farklı), ek nesne açmaz; inşaatta yöntem görünmez", () => {
    const sahne = new Scene();
    const kat = new ArsaKatmani(sahne, { X0: 0, Y0: 0, k: 29 }, pal, { izgara: m(), dolgu: m(), kenar: m(), kutu: m() });
    const n = (i: InsaatBilgisi[]): number => {
      kat.veriAyarla(sahipl(["10:10"]), "ben", i);
      return (kat.insaat.geometry as unknown as { instanceCount: number }).instanceCount;
    };
    const bayrak = n([]); // parsel bayrağının kutuları (yapıdan bağımsız)
    const genel = n([{ hucre: "10:10", asama: 3 }]);
    expect(genel - bayrak).toBe(asamaKutulari(3, 29).length);
    for (const y of SILUETLI_YONTEMLER) expect(n([{ hucre: "10:10", asama: 3, yontem: y }]) - bayrak, y).toBe(siluetKutulari(y, 29).length);
    expect(n([{ hucre: "10:10", asama: 2, yontem: "degirmen" }])).toBe(n([{ hucre: "10:10", asama: 2 }]));
    expect(n([{ hucre: "10:10", asama: 3, yontem: "bilinmeyen" }])).toBe(genel);
    // Dükkân ve yöntem birlikte verilirse dükkân önceliklidir (yöntemli yapı dükkân olmaz; veri çakışması güvenli)
    expect(n([{ hucre: "10:10", asama: 3, yontem: "degirmen", dukkan: { tur: "bakkal", markaRenk: 1 } }]) - bayrak).toBe(dukkanKutulari(29).length);
    expect(sahne.children.length).toBe(4);
  });
  it("örnek (sahte) veride bitmiş yapılar yöntemli ve altı yöntemin hepsi görülür; deterministik", () => {
    const h: [string, string][] = [["5:5", "ben"]];
    for (let o = 0; o < 60; o++) for (let i = 0; i < 9; i++) h.push([`${100 * (o + 1) + (i % 3)}:${50 + Math.floor(i / 3)}`, `bot-${String(o).padStart(2, "0")}`]);
    const s: IlceSahipligi = { ilce: "x", uygun: 1, satilmis: h.length, hucreler: new Map(h.map(([id, sahip]) => [id, { sahip, sinif: "kirsal" as const, degerMili: 1, alinma: 0 }])) };
    const l = ornekInsaatlar(s, "ben");
    for (const i of l) expect(i.asama === 3, `${i.hucre}`).toBe(!!(i.yontem || i.dukkan)); // Tamam örnekler dükkân ya da yöntem silüeti
    expect(new Set(l.filter((i) => i.yontem).map((i) => i.yontem)).size).toBe(6);
    expect(ornekInsaatlar(s, "ben")).toEqual(l);
  });
});
