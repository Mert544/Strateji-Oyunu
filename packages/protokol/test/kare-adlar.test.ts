/**
 * Görünen ad kare üzerinden (`IlgiKaresi.adlar?`, `KareDeltasi.adlar?`; isteğe bağlı nesne alanı, demete öğe EKLENMEZ): sahiplerin adları (bölge sahibi, ilçe hücre
 * sahipleri, isteyenin kendisi), adı olmayanın girdisizliği, sıralı anahtar, delta yalnız yeni/değişen girdiler, birikimli deltaUygula, çekirdek durumuna/`durumOzeti`'ne
 * etki yok, eski istemci şemasıyla geriye uyum (dondurulmuş: alan atılır, geri kalan aynı).
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { IlgiKaresiSemasi, KareDeltasiSemasi, deltaBosMu, deltaUygula, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";
import type { IlgiKaresi } from "../src/index";

const ILCE = "sn_m_ova_merkez";

/** ali ve veli ilçede hücre alır; "yeni" katılmış ama hücresi yok. */
function dunya(): Simulasyon {
  const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
  const yo = v.param.mulk?.yeniOyuncu;
  if (yo) {
    yo.hibe = 500_000_000;
    yo.yurtHucre = 0;
  }
  delete v.param.mulk?.kamu;
  const sim = Simulasyon.olustur(v, 3);
  for (const o of ["ali", "veli", "yeni"]) sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler: [] } });
  const uygun = (v.parsel?.ilceler.find((c) => c.id === ILCE)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal").map((h) => h.id);
  expect(sim.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [uygun[0] as string], sinif: "kirsal" } }).tamam).toBe(true);
  expect(sim.uygula({ t: SAAT, oyuncu: "veli", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [uygun[5] as string], sinif: "kirsal" } }).tamam).toBe(true);
  return sim;
}

const ALI = "çalışkan değirmenci 427";
const VELI = "sakin balıkçı 100";
const ADLAR: Record<string, string> = { ali: ALI, veli: VELI, yeni: "cesur terzi 200" };
const cozucu = (adlar: Record<string, string>) => (o: string): string | undefined => adlar[o];

function kare(sim: Simulasyon, oyuncu: string | null, adlar?: Record<string, string>): IlgiKaresi {
  return ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [], oyuncu), oyuncu, ilceIlgisiKur(sim, [ILCE], oyuncu), adlar ? { adlar: cozucu(adlar) } : {});
}

describe("kare.adlar", () => {
  it("ilçe hücre sahiplerinin ve isteyenin adı gelir; adı olmayan oyuncunun girdisi yoktur; anahtarlar sıralı; şema geçerli", () => {
    const sim = dunya();
    // veli ister: kendisi (veli) + hücre sahibi ali; "yeni" karede görünmez (hücresi yok).
    const k = kare(sim, "veli", ADLAR);
    expect(k.adlar).toEqual({ ali: ALI, veli: VELI });
    expect(Object.keys(k.adlar ?? {})).toEqual(["ali", "veli"]);
    expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
    // Hücresi olmayan ama isteyen "yeni": yalnız kendi adı (başkası ilçede görünmüyorsa değil; ali ve veli hücre sahibi olarak görünür).
    expect(kare(sim, "yeni", ADLAR).adlar).toEqual(ADLAR);
    // İzleyici/yönetici (oyuncu null): yalnız karede görünen sahipler.
    expect(kare(sim, null, ADLAR).adlar).toEqual({ ali: ALI, veli: VELI });
    // Adı olmayan oyuncu girdisiz: veli'nin adı yok.
    expect(kare(sim, null, { ali: ALI }).adlar).toEqual({ ali: ALI });
    // Hiç ad yoksa alan YOK (boş nesne yazılmaz).
    expect("adlar" in kare(sim, null, {})).toBe(false);
  });

  it("seçenek verilmezse alan yoktur ve kare ESKİSİYLE aynıdır; adlar çekirdek durumunu ve durumOzeti'ni etkilemez", () => {
    const sim = dunya();
    const ozetOnce = sim.durumOzeti();
    const adsiz = kare(sim, "veli");
    const adli = kare(sim, "veli", ADLAR);
    expect("adlar" in adsiz).toBe(false);
    const { adlar: _a, ...geri } = adli;
    expect(geri).toEqual(adsiz); // ad dışında hiçbir alan değişmedi
    expect(sim.durumOzeti()).toBe(ozetOnce);
    // Aynı komutlar iki dünyada: adlı kare çıkaran dünya ile çıkarmayan dünya aynı özeti verir.
    const a = dunya();
    const b = dunya();
    kare(a, "ali", ADLAR);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
  });

  it("bölge sahibi adı (bölge kipi): bölge sahipleri karede görünür; ad bölge karesindeki sahip kimliğiyle eşleşir", () => {
    const v = miniVeriyiYukle();
    const sim = Simulasyon.olustur(v, 3);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: ["m_ova"] } });
    const k = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [], "ali"), "ali", [], { adlar: cozucu(ADLAR) });
    expect(k.bolgeler.some((b) => b.genel.sahip === "ali")).toBe(true);
    expect(k.adlar).toEqual({ ali: ALI });
  });
});

describe("kareFarki / deltaUygula: adlar", () => {
  it("yeni sahip belirince delta YALNIZ yeni girdiyi taşır; ad değişince yalnız o girdi; değişmediyse delta boş; deltaUygula(a, fark) ≡ b", () => {
    const sim = dunya();
    const a = kare(sim, "yeni", { ali: ALI });
    // Yeni sahip (veli) eklenir: delta.adlar = { veli }.
    const b = kare(sim, "yeni", { ali: ALI, veli: VELI });
    const d1 = kareFarki(a, b);
    expect(d1.adlar).toEqual({ veli: VELI });
    expect(deltaBosMu(d1)).toBe(false);
    expect(deltaUygula(a, d1)).toEqual(b);
    expect(KareDeltasiSemasi.parse(d1)).toEqual(d1);
    // Ad değişir: yalnız o girdi.
    const c = kare(sim, "yeni", { ali: "yeni ad 1", veli: VELI });
    const d2 = kareFarki(b, c);
    expect(d2.adlar).toEqual({ ali: "yeni ad 1" });
    expect(deltaUygula(b, d2)).toEqual(c);
    // Değişmedi: delta boş (yalnız t değişse bile gönderilmez).
    const ayni = kareFarki(c, kare(sim, "yeni", { ali: "yeni ad 1", veli: VELI }));
    expect(ayni.adlar).toBeUndefined();
    expect(deltaBosMu(ayni)).toBe(true);
    // Yalnız ad değişimi bile delta ÜRETİR (başka alan değişmese de).
    expect(deltaBosMu(d2)).toBe(false);
  });

  it("birikimli: görünümden çıkan sahibin adı delta'da silinmez (istemci önbelleği); adlar hiç yokken ve yalnız deltada gelince de çalışır", () => {
    const sim = dunya();
    const a = kare(sim, "yeni", ADLAR);
    const b: IlgiKaresi = { ...a };
    delete b.adlar; // sahip artık görünmüyor/adı yok
    const d = kareFarki(a, b);
    expect(d.adlar).toBeUndefined();
    expect(deltaUygula(a, d).adlar).toEqual(a.adlar); // birikimli: önceki adlar kalır
    // Kare adsız başladı, delta ilk adları getirir.
    const adsiz = kare(sim, "yeni");
    const d2 = kareFarki(adsiz, a);
    expect(d2.adlar).toEqual(a.adlar);
    expect(deltaUygula(adsiz, d2)).toEqual(a);
  });
});

describe("geriye uyum (eski istemci şeması, dondurulmuş)", () => {
  // 8064ded'deki IlgiKaresi/KareDeltasi nesne şemalarının biçimi: bilinmeyen anahtar ATILIR (zod nesne varsayılanı), `adlar` yoktur.
  const eskiKare = z.object({ t: z.number().int(), bolgeler: z.array(z.unknown()), fiyat: z.array(z.number().int()), oyuncu: z.unknown().optional(), ilceler: z.array(z.unknown()).optional() });
  const eskiDelta = z.object({ t: z.number().int(), bolgeler: z.array(z.unknown()), cikan: z.array(z.number().int()), fiyat: z.array(z.number().int()).optional(), oyuncu: z.unknown().optional(), ilceler: z.array(z.unknown()).optional(), cikanIlceler: z.array(z.string()).optional() });

  it("eski istemci adli kareyi ve adli deltayı ayrıştırır (adlar atılır, geri kalanı aynı); yeni şema eski (adsız) kareyi de kabul eder", () => {
    const sim = dunya();
    const adli = JSON.parse(JSON.stringify(kare(sim, "veli", ADLAR))) as Record<string, unknown>;
    const r = eskiKare.safeParse(adli);
    expect(r.success).toBe(true);
    if (r.success) {
      expect("adlar" in r.data).toBe(false);
      const { adlar: _a, ...geri } = adli;
      expect(r.data).toEqual(geri);
    }
    const delta = JSON.parse(JSON.stringify(kareFarki(kare(sim, "veli", { ali: ALI }), kare(sim, "veli", ADLAR)))) as Record<string, unknown>;
    expect(delta.adlar).toBeDefined();
    const rd = eskiDelta.safeParse(delta);
    expect(rd.success).toBe(true);
    if (rd.success) expect("adlar" in rd.data).toBe(false);
    // Yeni şema, adı olmayan eski sunucu karesini kabul eder.
    expect(IlgiKaresiSemasi.safeParse(JSON.parse(JSON.stringify(kare(sim, "veli")))).success).toBe(true);
  });

  it("demetlere öğe eklenmedi: hücre, inşaat ve bölge demetlerinin uzunlukları değişmedi (adlar yalnız üst düzey nesne alanı)", () => {
    const sim = dunya();
    const k = kare(sim, "ali", ADLAR);
    for (const c of k.ilceler ?? []) for (const h of c.hucreler) expect(h.length).toBeLessThanOrEqual(7);
    expect(Object.keys(k).sort()).toEqual(["adlar", "bolgeler", "fiyat", "ilceler", "oyuncu", "t"].sort());
  });

  it("bayt maliyeti: kare başına adlar nesnesi sahip başına ~40 bayt; 200 sahipte tam karede tek sefer, deltada yalnız değişenler", () => {
    const sahipler: Record<string, string> = {};
    for (let i = 0; i < 200; i++) sahipler[`o_${(1_000_000_000 + i * 7919).toString(32).padStart(8, "0").slice(0, 8)}`] = `${["çalışkan", "sakin", "cesur", "neşeli"][i % 4]} ${["değirmenci", "fırıncı", "kayıkçı", "bahçıvan"][(i >> 2) % 4]} ${100 + (i % 900)}`;
    const bayt = Buffer.byteLength(JSON.stringify(sahipler), "utf8");
    expect(bayt / 200).toBeLessThan(50);
    expect(bayt).toBeLessThan(10_000);
    // Bir sahibin adı değişince delta yalnız onu taşır.
    const [ilk] = Object.keys(sahipler);
    const yeni = { ...sahipler, [ilk as string]: "yeni ad 999" };
    const a: IlgiKaresi = { t: 0, bolgeler: [], fiyat: [], adlar: sahipler };
    const b: IlgiKaresi = { t: 1, bolgeler: [], fiyat: [], adlar: yeni };
    expect(kareFarki(a, b).adlar).toEqual({ [ilk as string]: "yeni ad 999" });
    expect(Buffer.byteLength(JSON.stringify(kareFarki(a, b).adlar), "utf8")).toBeLessThan(60);
    console.log(`kare.adlar bayt: 200 sahip = ${bayt} bayt (~${Math.round(bayt / 200)} bayt/sahip); ad degisimi delta = ${Buffer.byteLength(JSON.stringify(kareFarki(a, b).adlar), "utf8")} bayt`);
  });
});
