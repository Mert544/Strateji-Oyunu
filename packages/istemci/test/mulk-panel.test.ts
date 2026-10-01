/**
 * Mülk kipi paneli (saf HTML üreticileri): kimlik, kalkan dili (savaş yok), ilçe ilçe arsalar, yapılar, Dikkat maddeleri
 * (yalnız oyuncunun yapılarından), Mal tablosu ve sekme listesi. DOM yok.
 */
import { describe, expect, it } from "vitest";
import type { IsletmeDurumu } from "../src/harita/baglanti";
import { isletmePaneli, korumaSatirlari, MULK_SEKMELERI, mulkDikkatMaddeleri, mulkDikkatPaneli, mulkHazinePaneli, mulkMalPaneli } from "../src/harita/mulk-panel";
import type { MulkAdlari } from "../src/harita/mulk-panel";

const SA = 3_600_000;
const ad: MulkAdlari = {
  yapi: (t) => ({ ciftlik: "Çiftlik", ahir: "Ahır" })[t] ?? t,
  mal: (m) => ({ gida: "Gıda", tahil: "Tahıl" })[m] ?? m,
  ilce: (i) => ({ tr_41_gebze: "Gebze" })[i] ?? i,
  il: (i) => ({ tr_41: "Kocaeli" })[i] ?? i,
};

function durum(ek: Partial<IsletmeDurumu> = {}): IsletmeDurumu {
  return {
    simZamani: 100 * SA,
    hazineMili: 41_500_000,
    hazineOraniMili: -12_000,
    araziDegeriMili: 16_000_000,
    araziVergisiMili: 3_000,
    ilceHucre: [["tr_41_gebze", 16]],
    korumaBitis: 100 * SA + 13 * 24 * SA,
    ayrilmisBitis: 100 * SA + 6 * 24 * SA,
    indirimliYapiKalan: 1,
    yapilar: [
      { anahtar: "i7", durum: "insaat", tur: "ahir", ilce: "tr_41_gebze", baslangic: 99 * SA, bitis: 103 * SA },
      { anahtar: "t3", durum: "tesis", tur: "ciftlik", ilce: "tr_41_gebze", aktif: true, verimPpm: 400_000 },
      { anahtar: "t4", durum: "tesis", tur: "ciftlik", il: "tr_41", aktif: false, verimPpm: 0 },
    ],
    mallar: [{ mal: "tahil", stokMili: 12_500, uretimMili: 3_000, satisMili: 2_000, alisMili: 0 }],
    ...ek,
  };
}

describe("mülk kipi paneli", () => {
  it("sekmeler: İşletmem, Hazine, Mal, Dikkat, Olaylar; Bölge, Devlet ve Savaş yok", () => {
    expect(MULK_SEKMELERI.map((s) => s.ad)).toEqual(["İşletmem", "Hazine", "Mal", "Dikkat", "Olaylar"]);
  });

  it("İşletmem: kimlik, kalkan ve ayrılmış hücre (savaş dili yok), ilçe ilçe arsa, yapılar, rehber boş durumu", () => {
    const h = isletmePaneli(durum(), { ad: "Ali Tarım" }, ad);
    expect(h).toContain("Ali Tarım");
    expect(h).toContain("1 ilçede 16 hücre");
    expect(h).toContain("Yeni oyuncu kalkanı");
    expect(h).toContain("13 gün kaldı");
    expect(h).toContain("Ayrılmış hücre hakkı");
    expect(isletmePaneli(durum({ katilimIlcesi: "tr_41_gebze" }), { ad: "Ali" }, ad)).toContain("Yalnız katılım ilçen Gebze ve katılımının ilk 14 gününde geçerli");
    expect(h).toContain("İlk yapı indirimi");
    expect(h).not.toMatch(/savaş|devlet|bölge/i);
    expect(h).toContain('data-mulk-ilce="tr_41_gebze"');
    expect(h).toMatch(/Ahır<\/b><span class="soluk">İnşaat · Temel · 3 sa kaldı · Gebze/);
    expect(h).toContain("Çalışıyor · verim %40");
    expect(h).toContain("Durdu · Kocaeli");
    expect(h).toContain("Rehber görevler yakında.");
    // Kalkan bittiyse satır yok; arsasız oyuncu için boş durum
    expect(korumaSatirlari(durum({ korumaBitis: null, ayrilmisBitis: null, indirimliYapiKalan: 0 }))).toBe("");
    expect(isletmePaneli(durum({ ilceHucre: [], yapilar: [] }), { ad: "Ali" }, ad)).toContain("Henüz arsan yok");
  });

  it("Dikkat: yalnız kendi yapılarından; eksik girdi, boşta, inşaat bitti (24 sa)", () => {
    const bitenler = new Map([["9", { tur: "ciftlik", ilce: "tr_41_gebze", bitis: 98 * SA }], ["1", { tur: "ahir", bitis: 10 * SA }]]);
    const l = mulkDikkatMaddeleri(durum(), ad, bitenler);
    expect(l.map((m) => m.tur)).toEqual(["eksik", "bosta", "bitti"]);
    expect(l[0]!.baslik).toBe("Gebze: Çiftlik: girdi eksik");
    expect(l[1]!.baslik).toBe("Kocaeli: Çiftlik boşta");
    expect(l[2]!.baslik).toBe("Gebze: Çiftlik inşaatı bitti");
    expect(l[2]!.ayrinti).toBe("2 sa önce");
    const h = mulkDikkatPaneli(l);
    expect(h).toContain("Yapılarında ilgilenmen gerekenler");
    expect(mulkDikkatPaneli([])).toContain("Bereket versin");
  });

  it("Hazine ve Mal", () => {
    const h = mulkHazinePaneli(durum());
    expect(h).toContain("41.500 ₺");
    expect(h).toContain("−12 ₺ / sa");
    expect(h).toContain("Arazi değeri");
    const m = mulkMalPaneli(durum(), ad);
    expect(m).toContain("Tahıl");
    expect(m).toMatch(/<td class="sayi">13<\/td><td class="sayi">3<\/td><td class="sayi">2<\/td>/);
    expect(mulkMalPaneli(durum({ mallar: [] }), ad)).toContain("Deponda henüz mal yok");
  });
});
