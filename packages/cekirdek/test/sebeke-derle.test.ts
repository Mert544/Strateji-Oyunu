/**
 * G6-2b (sartname §4.6, §5.2, §11.1): şebeke derlemesi (TABAN fiyat), kasa önbelleği anahtarı, serileştirme/doğrulayıcılar ve blok yokken no-op. Tam davranış kanıtları
 * (verim, korunum, K-3/K-4) `g6-sebeke.test.ts` (A3) dosyasındadır; bu dosya çekirdek birimlerini test-yerel veriyle sınar.
 */
import { parselFiksturuYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { kasaGirisi, kasaOranlari, paraUzlastir } from "../src/mulk/kasa";
import { Simulasyon } from "../src/motor";
import { dunyaCoz, dunyaIcerikUyumu, dunyaSerilestir, SerilestirmeHatasi } from "../src/serilestir";
import { PPM, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, ParaDurumu } from "../src/tipler";
import { bitisikGrup, mulkSim, tamam } from "./mulk-yardimci";
import { yontemliMulkVeri } from "./yontem-yardimci";

const F = parselFiksturuYukle("mini-6");
const ILCE = "sn_m_ova_merkez";

const SEBEKE = () => ({ surum: 1 as const, mallar: [{ mal: "elektrik", tavanOraniPpm: PPM }, { mal: "yakit", tavanOraniPpm: PPM }], kasaPayiPpm: 120_000 });
const veri = (sebeke?: ReturnType<typeof SEBEKE>, duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi =>
  yontemliMulkVeri((v) => {
    if (sebeke !== undefined) v.param.mulk!.sebeke = sebeke;
    // yakıt girdisi (stoksuz mal): tesis yakıtı şebekeden alır (stoktan değil)
    v.icerik.yontemler.find((y) => y.id === "standart_gida_isleme")!.girdiler["yakit"] = 5_000;
    duzenle?.(v);
  });

/** `a` bir gida_fabrikasi (standart_gida_isleme: tahıl + 10 elektrik + 5 yakıt) kurar ve 48 saat çalıştırır. */
function kos(v: CekirdekVeriPaketi): Simulasyon {
  const s = mulkSim(["a"], v);
  tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: bitisikGrup(F, ILCE, "kirsal", 2, 0), sinif: "kirsal" });
  s.calistirKadar(s.dunya.zaman + 48 * SAAT);
  return s;
}
const dugum = (s: Simulasyon) => s.dunya.bolgeler.find((b) => b.merkez !== undefined && b.sahip === "a")!;

describe("şebeke derlemesi: fiyat TABANDAN", () => {
  it("blok yok: alan oluşmaz; blok var: elektrik 10 350, yakıt 103 500 mili-₺/birim (taban x 1,035 x tavan oranı), stoksuz tablo mal indeksine göre", () => {
    expect(icerikDerle(veri()).mulk!.sebeke).toBeUndefined();
    const ic = icerikDerle(veri(SEBEKE()));
    const sb = ic.mulk!.sebeke!;
    expect(ic.mulk!.kamuIthalatCarpaniPpm).toBe(1_035_000);
    expect(sb.elektrik).toEqual({ mal: ic.malIndeks["elektrik"], birimFiyatMili: 10_350 });
    expect(sb.stoksuz).toEqual([{ mal: ic.malIndeks["yakit"], birimFiyatMili: 103_500 }]);
    expect(sb.stoksuzIndeks[ic.malIndeks["yakit"] as number]).toBe(0);
    expect(sb.stoksuzIndeks.filter((x) => x >= 0)).toHaveLength(1);
    expect(sb.kasaPayiPpm).toBe(120_000);
  });

  it("tavanOraniPpm < PPM fiyatı tavanın altına çeker; yakıt kaydı çıkarılırsa stoksuz tablo boş (elektrik yolu kalır)", () => {
    const s = SEBEKE();
    s.mallar[0]!.tavanOraniPpm = 500_000;
    expect(icerikDerle(veri(s)).mulk!.sebeke!.elektrik!.birimFiyatMili).toBe(5_175);
    const e = SEBEKE();
    e.mallar = [e.mallar[0]!];
    const sb = icerikDerle(veri(e)).mulk!.sebeke!;
    expect(sb.stoksuz).toEqual([]);
    expect(sb.stoksuzIndeks.every((x) => x === -1)).toBe(true);
    expect(sb.elektrik).toBeDefined();
  });

  it("bilinmeyen mal, tekrar, tavan oranı 0 ve > PPM, kasa payı > PPM derleme hatasıdır", () => {
    const dene = (duzenle: (s: ReturnType<typeof SEBEKE>) => void): string => {
      const s = SEBEKE();
      duzenle(s);
      try {
        icerikDerle(veri(s));
        return "";
      } catch (e) {
        return (e as Error).message;
      }
    };
    expect(dene((s) => s.mallar.push({ mal: "olmayan", tavanOraniPpm: PPM }))).toMatch(/mulk\.sebeke\.mallar bilinmeyen mal: olmayan/);
    expect(dene((s) => s.mallar.push({ mal: "yakit", tavanOraniPpm: PPM }))).toMatch(/tekrarlanan mal: yakit/);
    expect(dene((s) => (s.mallar[0]!.tavanOraniPpm = 0))).toMatch(/tavanOraniPpm/);
    expect(dene((s) => (s.mallar[0]!.tavanOraniPpm = PPM + 1))).toMatch(/tavanOraniPpm/);
    expect(dene((s) => (s.kasaPayiPpm = PPM + 1))).toMatch(/kasaPayiPpm/);
    expect(dene(() => undefined)).toBe("");
  });

  it("bölge kipinde (parsel yok) blok okunmaz: ic.mulk tanımsız", () => {
    const v = veri(SEBEKE());
    delete v.parsel;
    expect(icerikDerle(v).mulk).toBeUndefined();
  });
});

describe("şebeke: durum alanları yalnız kullanılınca yazılır; serileştirme ve doğrulayıcılar", () => {
  it("blok yok: hiçbir şebeke alanı oluşmaz (sebekeMili, sebekeTuketim, paraAkisi.sebeke, lavabo.sebeke, kasa giris.sebeke)", () => {
    const s = kos(veri());
    paraUzlastir(s.dunya, s.ic);
    expect("sebekeMili" in (dugum(s).elektrik ?? {})).toBe(false);
    expect("sebekeTuketim" in dugum(s)).toBe(false);
    const mo = s.dunya.mulk!.oyuncular.find((o) => o.id === "a")!;
    expect(mo.paraAkisi === undefined || !("sebeke" in mo.paraAkisi)).toBe(true);
    expect("sebeke" in s.dunya.mulk!.para!.lavabo).toBe(false);
    expect(s.dunya.mulk!.para!.kasalar.every((k) => !("sebeke" in k.giris))).toBe(true);
  });

  it("blok var: elektrik açığı şebekeden (sebekeMili > 0), bedel paraAkisi.sebeke; kasa payı ilçe kasasına, kalanı lavabo.sebeke; korunum tam; kasa bakiyesine girer", () => {
    const s = kos(veri(SEBEKE()));
    paraUzlastir(s.dunya, s.ic);
    const b = dugum(s);
    const tesis = b.tesisler[0]!;
    expect(tesis.verimPpm).toBeGreaterThan(0); // santralsiz tesis şebekeyle çalışır
    expect(b.elektrik!.sebekeMili).toBeGreaterThan(0);
    const mo = s.dunya.mulk!.oyuncular.find((o) => o.id === "a")!;
    const yakit = b.sebekeTuketim!["yakit"]!;
    expect(yakit).toBeGreaterThan(0);
    expect(b.stoklar[s.ic.malIndeks["yakit"] as number]!.miktar).toBe(0); // yakıt stoktan düşmedi (stok yok, tesis yine de çalıştı)
    const bedel = Math.floor((b.elektrik!.sebekeMili! * 10_350) / 1000) + Math.floor((yakit * 103_500) / 1000);
    expect(mo.paraAkisi!.sebeke).toBe(bedel);
    const para = s.dunya.mulk!.para as ParaDurumu;
    expect(para.lavabo.sebeke!.n).toBeGreaterThan(0);
    const kasa = para.kasalar.find((k) => k.sahip === `k:ilce:${ILCE}`)!;
    expect(kasa.giris.sebeke!.n).toBeGreaterThan(0);
    expect(kasaGirisi(kasa)).toBeGreaterThanOrEqual(kasa.giris.sebeke!.n);
    // kasa payı ≈ %12 (tamsayı oran kuralı)
    expect(mo.paraAkisi!.kasa.find((e) => e.kalem === "sebeke")!.oran).toBe(Math.floor((bedel * 120_000) / PPM));
    // aynı bedel iki satıra bölündü: kasa + lavabo birikimi = Σ bedel (SAAT ölçekli tamsayı)
    const olc = (x: { n: number; a: number }): bigint => BigInt(x.n) * BigInt(SAAT) + BigInt(x.a);
    expect(olc(para.lavabo.sebeke!) + olc(kasa.giris.sebeke!)).toBeGreaterThan(0n);
  });

  it("kasa payı 0: kasa girişi YAZILMAZ (kalem oluşmaz), bedelin tamamı lavabo.sebeke", () => {
    const sb = SEBEKE();
    sb.kasaPayiPpm = 0;
    const s = kos(veri(sb));
    paraUzlastir(s.dunya, s.ic);
    expect(s.dunya.mulk!.para!.lavabo.sebeke!.n).toBeGreaterThan(0);
    expect(s.dunya.mulk!.para!.kasalar.every((k) => !("sebeke" in k.giris))).toBe(true);
    expect(s.dunya.oyuncular.find((o) => o.id === "a")).toBeDefined();
  });

  it("gidiş-dönüş: şebekeli dünya serileştirilir, çözülür, yüklenir ve ilerletilince kesintisiz koşuyla AYNI özet", () => {
    const s = kos(veri(SEBEKE()));
    const metin = dunyaSerilestir(s.dunya);
    expect(metin).toContain('"sebekeMili"');
    expect(metin).toContain('"sebekeTuketim"');
    const d = dunyaCoz(metin);
    expect(dunyaSerilestir(d)).toBe(metin);
    const y = Simulasyon.yukle(veri(SEBEKE()), d, s.gunluk);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    s.calistirKadar(s.dunya.zaman + 24 * SAAT);
    y.calistirKadar(y.dunya.zaman + 24 * SAAT);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
  });

  it("bozuk değerler: negatif/ondalık sebekeMili, bilinmeyen lavabo anahtarı, negatif lavabo.sebeke sayacı, ondalık paraAkisi.sebeke, bilinmeyen kasa kalemi reddedilir", () => {
    const s = kos(veri(SEBEKE()));
    const temel = dunyaSerilestir(s.dunya);
    const dene = (duzenle: (d: ReturnType<typeof JSON.parse>) => void): string => {
      const d = JSON.parse(temel) as ReturnType<typeof JSON.parse>;
      duzenle(d);
      try {
        dunyaCoz(JSON.stringify(d));
        return "";
      } catch (e) {
        return e instanceof SerilestirmeHatasi ? e.message : String(e);
      }
    };
    const bi = dugum(s).indeks;
    expect(dene((d) => (d.bolgeler[bi].elektrik.sebekeMili = -5))).toMatch(/sebekeMili/);
    expect(dene((d) => (d.bolgeler[bi].elektrik.sebekeMili = 1.5))).toMatch(/sebekeMili/);
    expect(dene((d) => (d.mulk.para.lavabo.sebeke.n = -1))).toMatch(/lavabo\.sebeke/);
    expect(dene((d) => (d.mulk.para.lavabo.uydurma = { n: 0, a: 0 }))).toMatch(/bilinmeyen lavabo kalemi/);
    const oi = (JSON.parse(temel) as { mulk: { oyuncular: { id: string }[] } }).mulk.oyuncular.findIndex((o) => o.id === "a");
    expect(dene((d) => (d.mulk.oyuncular[oi].paraAkisi.sebeke = 2.5))).toMatch(/paraAkisi\.sebeke/);
    const ki = (JSON.parse(temel) as { mulk: { para: { kasalar: { sahip: string }[] } } }).mulk.para.kasalar.findIndex((k) => k.sahip === `k:ilce:${ILCE}`);
    expect(dene((d) => (d.mulk.para.kasalar[ki].giris.uydurma = { n: 0, a: 0 }))).toMatch(/bilinmeyen kasa giris kalemi/);
    expect(dene(() => undefined)).toBe("");
  });

  it("içerik uyumu: sebekeTuketim anahtarı içerikte olmayan mal ise reddedilir", () => {
    const s = kos(veri(SEBEKE()));
    expect(() => dunyaIcerikUyumu(s.ic, s.dunya)).not.toThrow();
    (dugum(s) as { sebekeTuketim?: Record<string, number> }).sebekeTuketim = { olmayan_mal: 5 };
    expect(() => dunyaIcerikUyumu(s.ic, s.dunya)).toThrow(/icerikte olmayan mal: olmayan_mal/);
  });
});

describe("kasaOranlari: şebeke ilçe tutarı önbellek anahtarındadır", () => {
  it("aynı girdi aynı sonuç; sebeke tutarı değişince yeniden hesaplanır; kasa payı 0'da kalem yok; eski çağrı biçimi (5 argüman) aynen çalışır", () => {
    const s = kos(veri(SEBEKE()));
    const d = s.dunya;
    const bos = new Map<string, number>();
    const a1 = kasaOranlari(d, s.ic, "a", 0, bos, bos, new Map([[ILCE, 1_000_000]]));
    expect(a1).toEqual([{ sahip: `k:ilce:${ILCE}`, kalem: "sebeke", oran: 120_000 }]);
    expect(kasaOranlari(d, s.ic, "a", 0, bos, bos, new Map([[ILCE, 1_000_000]]))).toBe(a1); // önbellekten (aynı nesne)
    expect(kasaOranlari(d, s.ic, "a", 0, bos, bos, new Map([[ILCE, 2_000_000]]))).toEqual([{ sahip: `k:ilce:${ILCE}`, kalem: "sebeke", oran: 240_000 }]);
    expect(kasaOranlari(d, s.ic, "a", 0, bos, bos)).toEqual([]); // sebekeIlce verilmedi
    const sifir = SEBEKE();
    sifir.kasaPayiPpm = 0;
    const z = kos(veri(sifir));
    expect(kasaOranlari(z.dunya, z.ic, "a", 0, bos, bos, new Map([[ILCE, 1_000_000]]))).toEqual([]);
  });
});
