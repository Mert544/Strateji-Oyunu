/**
 * G7-3 (sartname §7.5b, §9.2 `dukkan_fiyat`, §16.2 `perakende-kampanya` (a)-(h)): kampanya penceresi (kademe 0; günde en çok 6 saat, sim haftasında en çok 2 gün).
 *  (a) kapalıyken DUK-20; (b) 6 saat sınırı ve tam saat sayımı (10:20'de başlayan 16:00'da biter; aynı gün ikinci başlatma DUK-22);
 *  (c) gün sonu kesmesi (21:00'de başlayan 24:00'te biter; kalan saat ertesi güne TAŞINMAZ); (d) haftalık gün sınırı DUK-21 ve hafta sıfırlaması;
 *  (e) bitişte etkin kademe varsayılana döner, durum (yuva `fiyat`) DEĞİŞMEZ; (f) tek sıçrama = parçalı sıçrama = günlükten yeniden oynatma;
 *  (g) iki yuvada paylaşılan pencere (ücretsiz, sayaç artmaz) ve erken bitirme (saat iade edilmez); (h) hız sınırı DUK-18 ile etkileşim.
 * Zaman: sim günü `floor(t / GUN)`, sim haftası `floor(gun / 7)`; epoch 0 = gün 0, 00:00.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { etkinKademe } from "../src/perakende/yerelPazar";
import { yerelPazarGorunumu } from "../src/mulk/perakende";
import { GUN, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, DukkanDurumu, Komut } from "../src/tipler";
import { dukkanlar } from "./perakende-yardimci";
import { dukkanliDunya, komutVeri, reddedilir } from "./perakende-komut-yardimci";
import { tamam, ver } from "./mulk-yardimci";

/** Saat sınırı yok (hız sınırı 0): kampanya kuralları yalın sınanır; (h) kendi verisiyle. */
function veri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return komutVeri((v, pr) => {
    pr.fiyatDegisimEnAzSaat = 0;
    duzenle?.(v);
  });
}

const fiyat = (dukkan: number, yuva: number, f: number): Komut => ({ tur: "dukkan_fiyat", dukkan, yuva, fiyat: f });
const raf = (dukkan: number, yuva: number, mal: string): Komut => ({ tur: "dukkan_raf", dukkan, yuva, mal });
/** Gün `g` saat `s` dakika `m` (ms). */
const an = (g: number, s: number, m = 0): number => g * GUN + s * SAAT + m * 60_000;

function hazir(v: CekirdekVeriPaketi = veri()) {
  const { s, dukkan } = dukkanliDunya(["a"], v);
  const id = dukkan["a"]!.id;
  tamam(s, "a", raf(id, 0, "ekmek"));
  tamam(s, "a", raf(id, 1, "gida"));
  const dk = (): DukkanDurumu => dukkanlar(s).find((x) => x.e.id === id)!.e.dukkan!;
  return { s, id, dk };
}

describe("(a) kapalıyken DUK-20", () => {
  it("kampanya parametreleri yokken ya da sınırlar 0 iken kampanya kademesi seçilemez; durum değişmez; kademe tanımsızsa 0 sıradan bir kademedir", () => {
    for (const duzenle of [(pr: { kampanyaGunlukEnFazlaSaat?: number }) => (pr.kampanyaGunlukEnFazlaSaat = 0), (pr: { kampanyaHaftalikEnFazlaGun?: number }) => delete pr.kampanyaHaftalikEnFazlaGun]) {
      const { s, id, dk } = hazir(komutVeri((_, pr) => void duzenle(pr as never)));
      expect(reddedilir(s, "a", fiyat(id, 0, 0), "kampanya kademesi acik degil")).toBe("kampanya kademesi acik degil");
      expect(dk().kampanya).toBeUndefined();
    }
    const { s, id, dk } = hazir(komutVeri((_, pr) => delete pr.kampanyaKademesi));
    tamam(s, "a", fiyat(id, 0, 0)); // kampanya kademesi yok: 0 yalnız bir kademe
    expect(dk().raf[0]!.fiyat).toBe(0);
    expect(dk().kampanya).toBeUndefined();
  });
});

describe("(b) günlük saat sınırı ve tam saat sayımı", () => {
  it("10:20'de başlayan kampanya 16:00'da biter (6 tam saat); sayaçlar yazılır; aynı gün ikinci başlatma DUK-22; kampanya etkinken ikinci yuva ücretsiz", () => {
    const { s, id, dk } = hazir();
    expect(ver(s, "a", fiyat(id, 0, 0), an(1, 10, 20))).toEqual({ tamam: true });
    expect(dk().kampanya).toEqual({ hafta: 0, gunSayisi: 1, gun: 1, saat: 6, bitis: an(1, 16) });
    // etkin kampanya: başka yuva ücretsiz (sayaçlar aynı)
    tamam(s, "a", fiyat(id, 1, 0), an(1, 12));
    expect(dk().kampanya).toEqual({ hafta: 0, gunSayisi: 1, gun: 1, saat: 6, bitis: an(1, 16) });
    // bitişten sonra (16:00) aynı gün yeni başlatma: saat sayacı dolu -> DUK-22
    tamam(s, "a", fiyat(id, 0, 2), an(1, 17)); // normal kademeye dön
    expect(reddedilir(s, "a", fiyat(id, 0, 0), "kampanya gunluk saat siniri (en cok 6 saat)")).toBe("kampanya gunluk saat siniri (en cok 6 saat)");
    expect(dk().kampanya).toEqual({ hafta: 0, gunSayisi: 1, gun: 1, saat: 6, bitis: an(1, 16) });
  });
});

describe("(c) gün sonu kesmesi", () => {
  it("21:00'de başlayan kampanya 24:00'te biter (3 saat sayılır); kalan 3 saat ertesi güne taşınmaz: ertesi gün yeniden 6 saat", () => {
    const { s, id, dk } = hazir();
    tamam(s, "a", fiyat(id, 0, 0), an(2, 21));
    expect(dk().kampanya).toEqual({ hafta: 0, gunSayisi: 1, gun: 2, saat: 3, bitis: an(3, 0) });
    tamam(s, "a", fiyat(id, 0, 2), an(3, 8)); // ertesi gün: normal kademe, sonra yeni başlatma
    tamam(s, "a", fiyat(id, 0, 0), an(3, 9, 30));
    expect(dk().kampanya).toEqual({ hafta: 0, gunSayisi: 2, gun: 3, saat: 6, bitis: an(3, 15) }); // 6 saat (taşınan yok), yeni gün sayısı 2
  });
});

describe("(d) haftalık gün sınırı", () => {
  it("3. farklı günde DUK-21; yeni sim haftasında (gun / 7 değişince) sayaç sıfırlanır", () => {
    const { s, id, dk } = hazir();
    const baslat = (g: number, saat = 9): void => {
      tamam(s, "a", fiyat(id, 0, 2), an(g, saat - 1)); // normal kademe (kampanya zaten bitmiş / ilk kez)
      tamam(s, "a", fiyat(id, 0, 0), an(g, saat));
    };
    tamam(s, "a", fiyat(id, 0, 0), an(1, 9)); // gün 1
    baslat(2); // gün 2: iki gün doldu
    expect(dk().kampanya).toMatchObject({ hafta: 0, gunSayisi: 2, gun: 2 });
    tamam(s, "a", fiyat(id, 0, 2), an(3, 8));
    expect(reddedilir(s, "a", fiyat(id, 0, 0), "kampanya haftalik gun siniri (en cok 2 gun)")).toBe("kampanya haftalik gun siniri (en cok 2 gun)");
    // gün 6 hâlâ hafta 0: reddedilir; gün 7 = hafta 1: sayaç sıfırlanır
    s.calistirKadar(an(6, 9));
    reddedilir(s, "a", fiyat(id, 0, 0), "kampanya haftalik gun siniri");
    tamam(s, "a", fiyat(id, 0, 0), an(7, 9));
    expect(dk().kampanya).toEqual({ hafta: 1, gunSayisi: 1, gun: 7, saat: 6, bitis: an(7, 15) });
  });
});

describe("(e) bitişte etkin kademe", () => {
  it("kampanya bitince etkin kademe varsayılana döner; yuvanın `fiyat` alanı kampanya kademesinde KALIR (durum yazılmaz); okuma API'si aynı işlevi kullanır", () => {
    const { s, id, dk } = hazir();
    tamam(s, "a", fiyat(id, 0, 0), an(1, 10, 20));
    const pk = s.ic.mulk!.perakende!;
    const k = dk().kampanya!;
    const ek = (t: number): number => etkinKademe(dk().raf[0]!.fiyat, pk.p.kampanyaKademesi, k.bitis, pk.p.varsayilanFiyatKademesi, t);
    expect(ek(an(1, 15, 59))).toBe(0);
    expect(ek(an(1, 16))).toBe(pk.p.varsayilanFiyatKademesi);
    s.calistirKadar(an(1, 12));
    expect(yerelPazarGorunumu(s.dunya, s.baglam, "a").find((g) => g.ekYapi === id)!.yuvalar[0]).toMatchObject({ fiyatKademesi: 0, etkinKademe: 0 });
    s.calistirKadar(an(1, 17));
    expect(yerelPazarGorunumu(s.dunya, s.baglam, "a").find((g) => g.ekYapi === id)!.yuvalar[0]).toMatchObject({ fiyatKademesi: 0, etkinKademe: pk.p.varsayilanFiyatKademesi });
    expect(dk().raf[0]!.fiyat).toBe(0); // durum değişmedi
    expect(dk().kampanya).toEqual({ hafta: 0, gunSayisi: 1, gun: 1, saat: 6, bitis: an(1, 16) });
  });
});

describe("(f) tek sıçrama = parçalı sıçrama = günlükten yeniden oynatma", () => {
  it("kampanyalı koşu: durumOzeti BİREBİR (satış sayaçları ve gelir dahil); yeniden oynatma günlük + tohum ile aynı", () => {
    const kos = (parcali: boolean): Simulasyon => {
      const { s, id } = hazir();
      const adimlar: [number, Komut][] = [
        [an(1, 10, 20), fiyat(id, 0, 0)],
        [an(1, 18), fiyat(id, 0, 2)],
        [an(2, 21), fiyat(id, 1, 0)],
        [an(4, 7), fiyat(id, 1, 2)],
      ];
      for (const [t, k] of adimlar) {
        if (parcali) for (let x = s.dunya.zaman + 977_777; x < t; x += 3_333_333) s.calistirKadar(x); // düzensiz ara adımlar
        tamam(s, "a", k, t);
      }
      s.calistirKadar(an(6, 5));
      return s;
    };
    const tek = kos(false);
    const parca = kos(true);
    expect(parca.durumOzeti()).toBe(tek.durumOzeti());
    const gelir = tek.dunya.mulk!.oyuncular[0]!.dukkanGeliri;
    expect(gelir).toBeDefined(); // ölçüt anlamlı: satış oldu
    const v = veri();
    const oynat = Simulasyon.yenidenOynat(v, 7, tek.gunluk);
    oynat.calistirKadar(tek.dunya.zaman);
    expect(oynat.durumOzeti()).toBe(tek.durumOzeti());
  });
});

describe("(g) iki yuvada paylaşılan pencere ve erken bitirme", () => {
  it("kampanya etkinken ikinci yuvaya kampanya kademesi ücretsiz (sayaç artmaz); erken bitirme tüketilmiş saati İADE ETMEZ, kalan pencere diğer yuva için sürer", () => {
    const { s, id, dk } = hazir();
    tamam(s, "a", fiyat(id, 0, 0), an(1, 10));
    tamam(s, "a", fiyat(id, 1, 0), an(1, 11));
    expect(dk().kampanya).toEqual({ hafta: 0, gunSayisi: 1, gun: 1, saat: 6, bitis: an(1, 16) });
    const pk = s.ic.mulk!.perakende!;
    tamam(s, "a", fiyat(id, 0, 2), an(1, 12)); // yuva 0 erken bitirdi
    expect(dk().kampanya).toEqual({ hafta: 0, gunSayisi: 1, gun: 1, saat: 6, bitis: an(1, 16) }); // iade yok
    const e = (yuva: number, t: number): number => etkinKademe(dk().raf[yuva]!.fiyat, pk.p.kampanyaKademesi, dk().kampanya!.bitis, pk.p.varsayilanFiyatKademesi, t);
    expect(e(0, an(1, 13))).toBe(2);
    expect(e(1, an(1, 13))).toBe(0); // diğer yuva için pencere sürer
    expect(e(1, an(1, 16))).toBe(pk.p.varsayilanFiyatKademesi);
  });
});

describe("(h) hız sınırı (DUK-18) ile etkileşim", () => {
  it("kampanya başlatmak da bir fiyat değişimidir: fiyatT yazılır; kampanya yuvasını 6 saat dolmadan değiştirmek DUK-18 (kalan saat yukarı yuvarlanır); süre dolunca değişir", () => {
    const { s, id, dk } = hazir(komutVeri()); // hız sınırı 6 saat
    tamam(s, "a", fiyat(id, 0, 0), an(1, 10, 20));
    expect(dk().raf[0]!.fiyatT).toBe(an(1, 10, 20));
    s.calistirKadar(an(1, 12));
    expect(reddedilir(s, "a", fiyat(id, 0, 2), "fiyat degisimi icin 5 saat beklenmeli")).toBe("fiyat degisimi icin 5 saat beklenmeli"); // 4 sa 20 dk kaldı
    expect(reddedilir(s, "a", raf(id, 0, "un"), "fiyat degisimi icin 5 saat beklenmeli")).toBe("fiyat degisimi icin 5 saat beklenmeli");
    tamam(s, "a", fiyat(id, 0, 2), an(1, 16, 20));
    // başarısız komut (günlük saat sınırı dolu) kampanya sayacını da değiştirmez
    const once = JSON.stringify(dk().kampanya);
    s.calistirKadar(an(1, 16, 25));
    expect(reddedilir(s, "a", fiyat(id, 1, 0), "kampanya gunluk saat siniri (en cok 6 saat)")).toBe("kampanya gunluk saat siniri (en cok 6 saat)");
    expect(JSON.stringify(dk().kampanya)).toBe(once);
  });
});
