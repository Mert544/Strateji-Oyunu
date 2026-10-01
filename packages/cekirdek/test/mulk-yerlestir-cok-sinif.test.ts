/**
 * `yapi_yerlestir.siniflar` (hücre başına arsa sınıfı): iki sınıfa düşen yapı tek komutta ATOMİK alınır; her hücre kendi sınıfıyla
 * denetlenir ve fiyatlanır; yapı denetimi başarısızsa dünya hiç değişmez; `siniflar` yokken ya da tek sınıflıyken eski davranış birebir.
 * mini-6 fikstürü: `sn_m_ova_merkez` ilçesinde yatay komşu kasaba/kırsal hücre çiftleri vardır (çiftlik 2 hücre, il etiketi ova).
 */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import type { Simulasyon } from "../src/motor";
import { hucreBul, hucreFiyatiMili, ilceBul } from "../src/mulk";
import { anlikHazine } from "../src/stok";
import { SAAT } from "../src/tipler";
import type { ArsaSinifi, CekirdekVeriPaketi, Komut } from "../src/tipler";
import { mulkSim, mulkVeri, tamam, ver } from "./mulk-yardimci";

const F = parselFiksturuYukle("mini-6");
const OVA = "sn_m_ova_merkez";

function veri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 500_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
    duzenle?.(v);
  });
}

/** Ova ilçesinde yatay komşu (kasaba, kırsal) çifti; kimlikler "x:y" sırasındadır (kasaba ve kırsal hücreler fikstürde bulunur). */
function karmaCift(ilce = OVA, atla = 0): { kasaba: string; kirsal: string } {
  const c = F.ilceler.find((x) => x.id === ilce)!;
  const uygun = new Map(c.hucreler.filter((h) => h.uygun).map((h) => [h.id, h.sinif]));
  let say = 0;
  for (const [id, sn] of uygun) {
    if (sn !== "kasaba") continue;
    const [x, y] = id.split(":").map(Number) as [number, number];
    for (const k of [`${x + 1}:${y}`, `${x - 1}:${y}`]) if (uygun.get(k) === "kirsal" && say++ === atla) return { kasaba: id, kirsal: k };
  }
  throw new Error("komsu kasaba/kirsal cifti yok");
}

const yerlestir = (hucreler: string[], siniflar: ArsaSinifi[] | undefined, sinif: ArsaSinifi = "kirsal"): Komut => ({
  tur: "yapi_yerlestir",
  ilce: OVA,
  tesisTuru: "ciftlik",
  hucreler,
  sinif,
  ...(siniflar === undefined ? {} : { siniflar }),
});

function reddedilir(s: Simulasyon, oyuncu: string, k: Komut, parca: string): void {
  s.calistirKadar(s.dunya.zaman);
  const once = s.durumOzeti();
  const r = ver(s, oyuncu, k);
  expect(r.tamam, `${k.tur} reddedilmeliydi`).toBe(false);
  expect((r as { hata: string }).hata).toContain(parca);
  expect(s.durumOzeti()).toBe(once);
}

describe("yapi_yerlestir siniflar: iki sınıfa düşen yapı", () => {
  it("atomik başarı: tek komutla iki sınıftan arsa alınır, arsa bedeli = her hücrenin kendi sınıf fiyatı, inşaat başlar", () => {
    const { kasaba, kirsal } = karmaCift();
    const s = mulkSim(["a"], veri());
    const d = s.dunya;
    const ilce = ilceBul(d, OVA)!;
    const hz0 = anlikHazine(d, "a");
    // Liste dizgeye göre sıralanır; fiyat bu sırayla artımlı: k = 0, 1.
    const sirali = [kasaba, kirsal].sort((a, b) => (a < b ? -1 : 1));
    const sn = (id: string): ArsaSinifi => (id === kasaba ? "kasaba" : "kirsal");
    const beklenenArsa = hucreFiyatiMili(s.ic, ilce, sn(sirali[0]!), 0) + hucreFiyatiMili(s.ic, ilce, sn(sirali[1]!), 1);
    expect(hucreFiyatiMili(s.ic, ilce, "kasaba", 0)).not.toBe(hucreFiyatiMili(s.ic, ilce, "kirsal", 0)); // sınıf fiyatları farklı: test anlamlı
    tamam(s, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"]));
    const tanim = s.ic.icerik.tesisTurleri.find((t) => t.id === "ciftlik")!;
    expect(hz0 - anlikHazine(d, "a")).toBe(beklenenArsa + tanim.insaParasi);
    expect(hucreBul(d, kasaba)).toMatchObject({ sahip: "a", sinif: "kasaba" });
    expect(hucreBul(d, kirsal)).toMatchObject({ sahip: "a", sinif: "kirsal" });
    expect(ilce.satilmisHucre).toBe(2);
    expect(d.insaatlar).toHaveLength(1);
    expect(d.insaatlar[0]!.hucreler).toEqual(sirali);
  });

  it("hücre ve sınıf sırası: ters sırada verilen (hücreler, siniflar) çifti aynı sonucu verir (hizalama kimliğe göredir)", () => {
    const { kasaba, kirsal } = karmaCift();
    const a = mulkSim(["a"], veri());
    const b = mulkSim(["a"], veri());
    tamam(a, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"]));
    tamam(b, "a", yerlestir([kirsal, kasaba], ["kirsal", "kasaba"]));
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    expect(JSON.stringify(a.dunya.mulk)).toBe(JSON.stringify(b.dunya.mulk));
  });

  it("sonuç zincirle aynıdır: yapi_yerlestir(siniflar) = parsel_al(kasaba) + parsel_al(kirsal) sıralı + tesis_insa_hucre (hazine, hücreler)", () => {
    const { kasaba, kirsal } = karmaCift();
    const a = mulkSim(["a"], veri());
    const b = mulkSim(["a"], veri());
    tamam(a, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"]));
    // Zincirde artımlı eğri sırası liste sırasıdır (iki ayrı parsel_al: ilk alınan k = 0). Sıralı ilk hücre önce alınır.
    const sirali = [kasaba, kirsal].sort((x, y) => (x < y ? -1 : 1));
    for (const id of sirali) tamam(b, "a", { tur: "parsel_al", ilce: OVA, hucreler: [id], sinif: id === kasaba ? "kasaba" : "kirsal" });
    tamam(b, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: [kasaba, kirsal] });
    // Zincirde iki komut arasında vergi muhasebesi tembelce işler; iki dünya aynı ana getirilince durum alanları eşit olmalı.
    a.calistirKadar(2 * SAAT);
    b.calistirKadar(2 * SAAT);
    expect(anlikHazine(a.dunya, "a")).toBe(anlikHazine(b.dunya, "a"));
    // Arazi vergisi muhasebesinin `surum` sayacı komut sayısına bağlıdır (zincirde iki parsel_al); hücreler, ilçeler ve oyuncu arazi alanları eşit olmalı.
    const mulkOzeti = (s: Simulasyon): string => {
      const m = s.dunya.mulk as unknown as { hucreler: unknown; ilceler: unknown; isletmeler: unknown; oyuncular: { id: string; araziDegeriMili: number; ilceHucre: unknown }[] };
      return JSON.stringify([m.hucreler, m.ilceler, m.isletmeler, m.oyuncular.map((o) => [o.id, o.araziDegeriMili, o.ilceHucre])]);
    };
    expect(mulkOzeti(a)).toBe(mulkOzeti(b));
    expect(JSON.stringify(a.dunya.insaatlar)).toBe(JSON.stringify(b.dunya.insaatlar));
  });

  it("karma sahiplik: oyuncunun kendi (kasaba) hücresi sayılır, yalnız sahipsiz (kırsal) hücre kendi sınıfıyla alınır", () => {
    const { kasaba, kirsal } = karmaCift();
    const s = mulkSim(["a"], veri());
    const d = s.dunya;
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: [kasaba], sinif: "kasaba" });
    const hz0 = anlikHazine(d, "a");
    tamam(s, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"]));
    const tanim = s.ic.icerik.tesisTurleri.find((t) => t.id === "ciftlik")!;
    const ilce = ilceBul(d, OVA)!;
    // Eğri: kasaba zaten satıldı (satilmisHucre = 1 iken kırsal k = 0). Şimdiki satilmisHucre = 2; önceki durumu yeniden kur.
    const onceki = { ...ilce, satilmisHucre: 1 };
    expect(hz0 - anlikHazine(d, "a")).toBe(hucreFiyatiMili(s.ic, onceki, "kirsal", 0) + tanim.insaParasi);
    expect(hucreBul(d, kirsal)).toMatchObject({ sahip: "a", sinif: "kirsal" });
  });
});

describe("yapi_yerlestir siniflar: eski davranış ve reddedilen durumlar", () => {
  it("tek sınıflı çift: siniflar verilse de verilmese de sonuç birebir aynıdır (özet, hücreler, hazine)", () => {
    // Kırsal komşu çift: ilçede iki kırsal hücre (mulk-yardimci bitisikGrup mantığı).
    const c = F.ilceler.find((x) => x.id === OVA)!;
    const uygun = new Set(c.hucreler.filter((h) => h.uygun && h.sinif === "kirsal").map((h) => h.id));
    let cift: string[] | undefined;
    for (const id of uygun) {
      const [x, y] = id.split(":").map(Number) as [number, number];
      if (uygun.has(`${x + 1}:${y}`)) {
        cift = [id, `${x + 1}:${y}`];
        break;
      }
    }
    expect(cift).toBeDefined();
    const a = mulkSim(["a"], veri());
    const b = mulkSim(["a"], veri());
    tamam(a, "a", yerlestir(cift!, undefined));
    tamam(b, "a", yerlestir(cift!, ["kirsal", "kirsal"]));
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    expect(anlikHazine(a.dunya, "a")).toBe(anlikHazine(b.dunya, "a"));
    expect(JSON.stringify(a.dunya.mulk)).toBe(JSON.stringify(b.dunya.mulk));
  });

  it("siniflar yokken karma çift eski tek `sinif` kuralıyla reddedilir (bugünkü davranış)", () => {
    const { kasaba, kirsal } = karmaCift();
    const s = mulkSim(["a"], veri());
    reddedilir(s, "a", yerlestir([kasaba, kirsal], undefined, "kirsal"), "hucre sinifi uyusmuyor");
    reddedilir(s, "a", yerlestir([kasaba, kirsal], undefined, "kasaba"), "hucre sinifi uyusmuyor");
  });

  it("yapı denetimi başarısızsa dünya HİÇ değişmez (arsa hiçbir sınıftan alınmaz): yetersiz malzeme ve yetersiz hazine", () => {
    const { kasaba, kirsal } = karmaCift();
    // Malzeme: ilk işletme kiti çiftliğe yetmez; arsa kısmı geçerli ama alınmamalı.
    const az = mulkSim(["a"], veri((v) => (v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 10_000, parca: 40_000 })));
    const hz0 = anlikHazine(az.dunya, "a");
    reddedilir(az, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"]), "yetersiz stok");
    expect(hucreBul(az.dunya, kasaba)).toBeUndefined();
    expect(hucreBul(az.dunya, kirsal)).toBeUndefined();
    expect(ilceBul(az.dunya, OVA)!.satilmisHucre).toBe(0);
    expect(anlikHazine(az.dunya, "a")).toBe(hz0);
    // Hazine: iki sınıfın arsası karşılanır, yapı karşılanmaz.
    const fakir = mulkSim(["a"], veri((v) => (v.param.mulk!.yeniOyuncu.hibe = 7_000_000)));
    reddedilir(fakir, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"]), "yetersiz hazine");
    expect(hucreBul(fakir.dunya, kasaba)).toBeUndefined();
    expect(anlikHazine(fakir.dunya, "a")).toBe(7_000_000);
  });

  it("yanlış sınıf, geçersiz sınıf, uzunluk uyuşmazlığı ve dizi olmayan değer reddedilir; dünya değişmez", () => {
    const { kasaba, kirsal } = karmaCift();
    const s = mulkSim(["a"], veri());
    reddedilir(s, "a", yerlestir([kasaba, kirsal], ["kirsal", "kirsal"]), `hucre sinifi uyusmuyor: ${kasaba}`);
    reddedilir(s, "a", yerlestir([kasaba, kirsal], ["kasaba", "kasaba"]), `hucre sinifi uyusmuyor: ${kirsal}`);
    reddedilir(s, "a", yerlestir([kasaba, kirsal], ["kasaba"]), "ayni uzunlukta");
    reddedilir(s, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal", "kirsal"]), "ayni uzunlukta");
    reddedilir(s, "a", yerlestir([kasaba, kirsal], []), "ayni uzunlukta");
    reddedilir(s, "a", yerlestir([kasaba, kirsal], ["kasaba", "saray" as ArsaSinifi]), "gecersiz arsa sinifi");
    reddedilir(s, "a", yerlestir([kasaba, kirsal], "kasaba" as unknown as ArsaSinifi[]), "siniflar dizi olmali");
    // geçerli `sinif` alanı hâlâ zorunlu biçimde denetlenir
    reddedilir(s, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"], "saray" as ArsaSinifi), "gecersiz arsa sinifi");
    expect(hucreBul(s.dunya, kasaba)).toBeUndefined();
    // geçerli komut hâlâ geçer
    tamam(s, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"]));
  });

  it("başkasının hücresi ve tekrarlanan hücre siniflar varken de reddedilir", () => {
    const { kasaba, kirsal } = karmaCift();
    const s = mulkSim(["a", "b"], veri());
    reddedilir(s, "a", yerlestir([kasaba, kasaba], ["kasaba", "kasaba"]), "tekrarlanan");
    tamam(s, "b", { tur: "parsel_al", ilce: OVA, hucreler: [kirsal], sinif: "kirsal" });
    reddedilir(s, "a", yerlestir([kasaba, kirsal], ["kasaba", "kirsal"]), "hucre zaten sahipli");
    expect(hucreBul(s.dunya, kasaba)).toBeUndefined();
  });
});
