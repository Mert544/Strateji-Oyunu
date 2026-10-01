/**
 * G7-4 (sartname §9.4, §16.2): ARSA FİYATI TAM LİRAYA YUKARI yuvarlanır; `parsel_birak` iadesi AŞAĞI tam liraya.
 *  - birim: `arsaTamLiraYukari` / `arsaTamLiraAsagi` sınırları; `parselFiyati` her hücre için ceil (toplam = Σ tek hücre; KARŞIT KANIT: yuvarlamasız (floor) sürüm 1 000'in katı olmayan değer verir);
 *  - komut: `parsel_al` bedeli = saklanan `degerMili` toplamı = `araziDegeriMili`; her hücre 1 000'in katıdır;
 *  - `parsel_birak`: iade = `arsaTamLiraAsagi(carpBol(Σ ceil'li değer, 700 000, PPM))` (toplam üzerinde BİR kez), hazine farkı = -alım + iade, `iade` musluğu sayacı tam o tamsayı kadar artar; korunum tam eşitlik;
 *  - ayrılmış (taban) hücre fiyatı da aynı işlevden geçer (parametre güvenliği); eski görüntüdeki 1 000'in katı olmayan `degerMili` olduğu gibi yüklenir (doğrulayıcı "1 000'in katı" KOYMAZ).
 * Bölge kipi altınları değişmez (arsa yalnız mülk kipindedir): mevcut regresyon testleri.
 */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { hucreBul, hucreFiyatiMili, ilceBul, mulkOyuncuBul, parselFiyati } from "../src/mulk";
import { arsaTamLiraAsagi, arsaTamLiraYukari } from "../src/mulk/komut";
import { dunyaCoz, dunyaSerilestir } from "../src/serilestir";
import { carpBol } from "../src/sabit";
import { anlikHazine } from "../src/stok";
import { PPM } from "../src/tipler";
import type { CekirdekVeriPaketi, ParaDurumu } from "../src/tipler";
import { sayacOlcekli } from "../src/paraSayac";
import { SAAT } from "../src/tipler";
import { korunumTutar } from "./perakende-komut-yardimci";
import { bitisikGrup, mulkSim, mulkVeri, tamam } from "./mulk-yardimci";

const F = parselFiksturuYukle("mini-6");
const OVA = "sn_m_ova_merkez";

function veri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 2_000_000_000;
    duzenle?.(v);
  });
}

describe("birim: tam lira yuvarlama ve parselFiyati", () => {
  it("arsaTamLiraYukari: tam kat değişmez, +1 mili bir sonraki liraya; arsaTamLiraAsagi: -1 mili bir önceki liraya; 0 ve 999 sınırları", () => {
    for (const [x, yukari, asagi] of [[0, 0, 0], [1, 1000, 0], [999, 1000, 0], [1000, 1000, 1000], [1001, 2000, 1000], [1_000_000, 1_000_000, 1_000_000], [1_000_001, 1_001_000, 1_000_000], [9_007_199_254_739_000, 9_007_199_254_739_000, 9_007_199_254_739_000]] as const) {
      expect(arsaTamLiraYukari(x), `yukari(${x})`).toBe(yukari);
      expect(arsaTamLiraAsagi(x), `asagi(${x})`).toBe(asagi);
    }
  });

  it("parselFiyati: her hücre 1 000'in katı; toplam = Σ tek hücre; KARŞIT KANIT: floor sürümü aynı girdide 1 000'in katı olmayan değer verir", () => {
    const BIN = 1_000_000;
    const tek = (k: number) => parselFiyati(BIN, 2 * PPM, k, 81, 1);
    expect(tek(0)).toBe(BIN); // tam kat değişmez
    expect(tek(1)).toBe(1_025_000); // floor: 1 024 691
    expect(Math.floor((BIN * (PPM + Math.floor((2 * PPM) / 81))) / PPM)).toBe(1_024_691); // yuvarlamasız sürüm 1 000'in katı değil
    for (let k = 0; k < 40; k++) expect(tek(k) % 1000, `hücre ${k}`).toBe(0);
    expect(parselFiyati(BIN, 2 * PPM, 0, 81, 5)).toBe([0, 1, 2, 3, 4].reduce((t, k) => t + tek(k), 0));
  });

  it("ayrılmış hücre (taban) fiyatı da aynı işlevden geçer: 1 000'in katı olmayan taban parametresi yukarı yuvarlanır; ayrılmışsız hücre eğriden", () => {
    const s = mulkSim(["a"], veri((v) => (v.param.mulk!.hucreFiyati.kirsal = 1_000_500)));
    const ilce = ilceBul(s.dunya, OVA)!;
    expect(hucreFiyatiMili(s.ic, ilce, "kirsal", 0, true)).toBe(1_001_000);
    expect(hucreFiyatiMili(s.ic, ilce, "kirsal", 0, false) % 1000).toBe(0);
  });
});

describe("komut: parsel_al ve parsel_birak", () => {
  it("parsel_al: bedel = Σ saklanan degerMili = araziDegeriMili; her hücre ve toplam 1 000'in katı; hazine düşüşü tam bedel", () => {
    const s = mulkSim(["a"], veri());
    const d = s.dunya;
    const g = bitisikGrup(F, OVA, "kirsal", 4, 0);
    const hz0 = anlikHazine(d, "a");
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: g, sinif: "kirsal" });
    const degerler = g.map((id) => hucreBul(d, id)!.degerMili);
    for (const x of degerler) expect(x % 1000).toBe(0);
    const toplam = degerler.reduce((t, x) => t + x, 0);
    expect(hz0 - anlikHazine(d, "a")).toBe(toplam);
    expect(mulkOyuncuBul(d, "a")!.araziDegeriMili).toBe(toplam);
    expect(toplam).toBe(parselFiyati(1_000_000, 2 * PPM, 0, ilceBul(d, OVA)!.uygunHucre, 4));
  });

  it("parsel_al -> parsel_birak aynı hücreler: iade = aşağı tam lira(%70 x Σ değer) TOPLAM üzerinde bir kez; hazine farkı = -alım + iade; iade musluğu tam o tamsayı; yuvarlamasız sürüm farklı (karşıt kanıt); korunum tam", () => {
    const s = mulkSim(["a"], veri());
    const d = s.dunya;
    const g = bitisikGrup(F, OVA, "kirsal", 3, 0);
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: g, sinif: "kirsal" });
    const degerler = g.map((id) => hucreBul(d, id)!.degerMili);
    const toplam = degerler.reduce((t, x) => t + x, 0);
    const ham = carpBol(toplam, 700_000, PPM); // yuvarlamasız (eski) iade
    const beklenen = Math.floor(ham / 1000) * 1000;
    expect(ham % 1000, "örnek anlamlı: yuvarlamasız iade 1 000'in katı değil").not.toBe(0);
    const hz0 = anlikHazine(d, "a");
    const iadeMuslugu = (): bigint => sayacOlcekli((d.mulk!.para as ParaDurumu).musluk.iade);
    const m0 = iadeMuslugu();
    korunumTutar(s, "once");
    tamam(s, "a", { tur: "parsel_birak", ilce: OVA, hucreler: g });
    expect(anlikHazine(d, "a") - hz0).toBe(beklenen);
    expect(beklenen).toBeLessThan(ham);
    expect(ham - beklenen).toBeLessThan(1000); // yuvarlanan <= 999 mili hiçbir yere yazılmaz
    expect((iadeMuslugu() - m0) / BigInt(SAAT)).toBe(BigInt(beklenen));
    // toplam üzerinde BİR kez: hücre başına yuvarlama farklı (daha küçük ya da eşit) değer verirdi
    const hucreBasina = degerler.reduce((t, x) => t + Math.floor(carpBol(x, 700_000, PPM) / 1000) * 1000, 0);
    expect(beklenen).toBeGreaterThanOrEqual(hucreBasina);
    korunumTutar(s, "sonra");
  });

  it("iade payı %100: iade = Σ değer (1 000'in katı olduğundan yuvarlama etkisiz); 10.001 ₺ hücre örneği: %70 = 7.000,7 ₺ -> 7.000 ₺", () => {
    const tam = mulkSim(["a"], veri((v) => (v.param.mulk!.parselBirakIadePpm = PPM)));
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    tamam(tam, "a", { tur: "parsel_al", ilce: OVA, hucreler: g, sinif: "kirsal" });
    const hz0 = anlikHazine(tam.dunya, "a");
    const toplam = g.reduce((t, id) => t + hucreBul(tam.dunya, id)!.degerMili, 0);
    tamam(tam, "a", { tur: "parsel_birak", ilce: OVA, hucreler: g });
    expect(anlikHazine(tam.dunya, "a") - hz0).toBe(toplam);
    // 10 001 ₺ (10_001_000 mili) hücre: %70 -> 7_000_700 mili -> aşağı tam lira 7_000_000 (yuvarlamasız 7_000_700)
    expect(carpBol(10_001_000, 700_000, PPM)).toBe(7_000_700);
    expect(arsaTamLiraAsagi(carpBol(10_001_000, 700_000, PPM))).toBe(7_000_000);
  });
});

describe("eski görüntü ve doğrulayıcı", () => {
  it("degerMili 1 000'in katı olmak ZORUNDA DEĞİL: 1 000'in katı olmayan (eski görüntü) değer yüklenir, olduğu gibi kalır; iade bundan hesaplanır", () => {
    const s = mulkSim(["a"], veri());
    const g = bitisikGrup(F, OVA, "kirsal", 1, 0);
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: g, sinif: "kirsal" });
    const kopya = JSON.parse(dunyaSerilestir(s.dunya)) as typeof s.dunya;
    const h = kopya.mulk!.hucreler.find((x) => x.id === g[0])!;
    h.degerMili = 1_024_691;
    const o = kopya.mulk!.oyuncular.find((x) => x.id === "a")!;
    o.araziDegeriMili = o.araziDegeriMili - 1_025_000 + 1_024_691;
    const yuklu = dunyaCoz(JSON.stringify(kopya));
    expect(yuklu.mulk!.hucreler.find((x) => x.id === g[0])!.degerMili).toBe(1_024_691);
  });
});
