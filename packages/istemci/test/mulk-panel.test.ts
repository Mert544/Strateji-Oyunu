/**
 * Mülk kipi paneli (saf HTML üreticileri): kimlik, kalkan dili (savaş yok), ilçe ilçe arsalar, yapılar, Dikkat maddeleri
 * (yalnız oyuncunun yapılarından), Mal tablosu ve sekme listesi. DOM yok.
 */
import { describe, expect, it } from "vitest";
import type { IsletmeDurumu } from "../src/harita/baglanti";
import { gecenSureMetni, insaatBittiMetni, insaatlariIzle, isletmePaneli, korumaSatirlari, MULK_SEKMELERI, mulkDikkatMaddeleri, mulkDikkatPaneli, mulkHazinePaneli, mulkMalPaneli } from "../src/harita/mulk-panel";
import type { InsaatIzleme, MulkAdlari } from "../src/harita/mulk-panel";

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
    expect(isletmePaneli(durum({ katilimIlcesi: "tr_41_gebze" }), { ad: "Ali" }, ad)).toContain("Gebze ilçesinde, ilk 14 gün boyunca yeni oyunculara ayrılmış hücreleri taban fiyattan alabilirsin.");
    expect(h).toContain("Katılım ilçende, ilk 14 gün boyunca yeni oyunculara ayrılmış hücreleri taban fiyattan alabilirsin.");
    expect(h).toContain("İlk yapı indirimi");
    expect(h).not.toMatch(/savaş|devlet|bölge/i);
    expect(h).toContain('data-mulk-ilce="tr_41_gebze"');
    expect(h).toMatch(/Ahır<\/b><span class="soluk">İnşa sürüyor · Temel · 3 sa kaldı\u00a0· Gebze/);
    expect(h).toContain("Çalışıyor · verim %40");
    expect(h).toContain("Durdu\u00a0· Kocaeli");
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
    expect(l[2]!.baslik).toBe("Gebze: Çiftlik hazır.");
    expect(l[2]!.ayrinti).toBe("2 sa önce");
    const h = mulkDikkatPaneli(l);
    expect(h).toContain("Yapılarında ilgilenmen gerekenler");
    expect(mulkDikkatPaneli([])).toContain("Bereket versin");
  });

  it("Hazine ve Mal", () => {
    const h = mulkHazinePaneli(durum());
    expect(h).toContain("41.500\u00a0₺");
    expect(h).toContain("−12\u00a0₺/sa");
    expect(h).toContain("Arazi değeri");
    const m = mulkMalPaneli(durum(), ad);
    expect(m).toContain("Tahıl");
    expect(m).toMatch(/<td class="sayi">12<\/td><td class="sayi">3<\/td><td class="sayi">2<\/td>/); // stok 12,5 → 12 (B4: stok AŞAĞI, "en yakın" yok)
    expect(mulkMalPaneli(durum({ mallar: [{ mal: "tahil", stokMili: 0, uretimMili: 0, satisMili: 0, alisMili: 1_200 }] }), ad)).toContain("alış 2"); // alış (ödenen) YUKARI
    expect(mulkMalPaneli(durum({ mallar: [] }), ad)).toContain("Deponda henüz mal yok");
  });

  it("Büyüt: tesis satırında düğme (ilçe ve anahtar veri öznitelikleri), süren büyütme satırı ve bitiş dili", () => {
    const d = durum({
      yapilar: [
        { anahtar: "t3", durum: "tesis", tur: "ciftlik", ilce: "tr_41_gebze", hucre: 2, aktif: true, verimPpm: 1_000_000 },
        { anahtar: "t5", durum: "tesis", tur: "ciftlik", ilce: "tr_41_gebze", hucre: 2, aktif: true, verimPpm: 1_000_000 },
        { anahtar: "i9", durum: "insaat", tur: "ciftlik", ilce: "tr_41_gebze", baslangic: 99 * SA, bitis: 101 * SA, yukseltme: { tesis: 5, olcek: 1 } },
      ],
    });
    const buyut = (y: { anahtar: string }, tumu: readonly { yukseltme?: { tesis: number } }[]): boolean => y.anahtar === "t3" || !tumu.some((x) => x.yukseltme?.tesis === Number(y.anahtar.slice(1)));
    const h = isletmePaneli(d, { ad: "Ali" }, { ...ad, buyut });
    expect(h).toContain('data-mulk-buyut="t3"');
    expect(h).toContain('data-mulk-buyut-ilce="tr_41_gebze"');
    expect(h).not.toContain('data-mulk-buyut="t5"'); // büyütmesi sürüyor
    expect(h).toMatch(/Çiftlik<\/b><span class="soluk">Ölçek büyütme sürüyor · M · 1 sa kaldı\u00a0· Gebze/);
    expect(h).toContain("Büyüt</button>");
    // buyut tanımsızsa (bağdaştırıcı desteklemiyor) düğme yok
    expect(isletmePaneli(d, { ad: "Ali" }, ad)).not.toContain("data-mulk-buyut");
    // biten büyütme: "inşaatı" değil "büyütmesi bitti"
    const dikkat = mulkDikkatMaddeleri(durum({ yapilar: [] }), ad, new Map([["9", { tur: "ciftlik", ilce: "tr_41_gebze", bitis: 99 * SA, yukseltme: true }]]));
    expect(dikkat[0]?.baslik).toBe("Gebze: Çiftlik büyütmesi hazır.");
  });
});

describe("İşletmem dükkân yüzeyleri (G9 iskeleti)", () => {
  it("üst kart kimlik satırının hemen altında, hak özetinden ve Arsalarım'dan önce; Dükkânlarım Yapılar'dan sonra, Defter'den önce", () => {
    const h = isletmePaneli(durum(), { ad: "Ali" }, ad, `<h3>Defter</h3>`, { ust: `<div class="dk-oneri" data-tur="dukkan"></div>`, dukkan: `<section class="dk-bolum"></section>` });
    const sira = [h.indexOf("mulk-kimlik"), h.indexOf("dk-oneri"), h.indexOf("mk-ozet"), h.indexOf("<h3>Arsalarım"), h.indexOf("<h3>Yapılar"), h.indexOf("dk-bolum"), h.indexOf("<h3>Defter")];
    expect(sira.every((x) => x >= 0)).toBe(true);
    expect([...sira].sort((a, b) => a - b)).toEqual(sira);
  });

  it("ek yoksa yazılan HTML değişmez (dükkân kaynağı yokken panel eskisi gibi)", () => {
    expect(isletmePaneli(durum(), { ad: "Ali" }, ad, undefined, {})).toBe(isletmePaneli(durum(), { ad: "Ali" }, ad));
  });

  it("Dikkat: dükkân maddeleri oyuncunun yapı maddelerine eklenir ve türüne göre sıralanır", () => {
    const l = mulkDikkatMaddeleri(durum(), ad, new Map(), [{ tur: "eksik", baslik: "Gıda stoğun bitti; rafta satılmıyor", ayrinti: "", sira: 0 }]);
    expect(l.some((m) => m.baslik.includes("rafta satılmıyor"))).toBe(true);
    expect(l.length).toBe(mulkDikkatMaddeleri(durum(), ad, new Map()).length + 1);
  });

  it('Dikkat: biten dükkân inşaatı "Dükkân hazır." ve "Rafa git" (dükkân ayrıntısını açar); başka yapıda eskisi gibi', () => {
    const adD: MulkAdlari = { ...ad, dukkanRafa: (ilce) => (ilce === "tr_41_gebze" ? 7 : null) };
    const biten = new Map([
      ["11", { tur: "dukkan", ilce: "tr_41_gebze", bitis: 99 * SA }],
      ["12", { tur: "ciftlik", ilce: "tr_41_gebze", bitis: 99 * SA }],
    ]);
    const l = mulkDikkatMaddeleri(durum(), adD, biten);
    const d = l.find((m) => m.baslik.includes("Dükkân hazır."))!;
    expect(d.baslik).toBe("Gebze: Dükkân hazır.");
    expect(d.rafaGit).toEqual({ dukkan: 7, etiket: "Rafa git" });
    expect(l.find((m) => m.baslik.includes("Çiftlik hazır"))?.rafaGit).toBeUndefined();
    const h = mulkDikkatPaneli(l);
    expect(h).toContain('data-eylem="dukkan-rafa" data-dukkan="7">Rafa git</button>');
    // dükkân bulunamazsa ("açık dükkân yok") metin kalır, düğme yok
    const yok = mulkDikkatMaddeleri(durum(), { ...ad, dukkanRafa: () => null }, biten).find((m) => m.baslik.includes("Dükkân hazır."))!;
    expect(yok.rafaGit).toBeUndefined();
    expect(mulkDikkatPaneli([yok])).not.toContain("Rafa git");
  });

  it("Yapılar listesinde dükkân yok (yalnız Dükkânlarım'da); Dikkat 'önce' süresi ondalıksız", () => {
    const dd = durum({ yapilar: [{ anahtar: "i9", durum: "insaat", tur: "dukkan", ilce: "tr_41_gebze", baslangic: 99 * SA, bitis: 103 * SA }, { anahtar: "t3", durum: "tesis", tur: "ciftlik", ilce: "tr_41_gebze", aktif: true, verimPpm: 1_000_000 }] });
    const h = isletmePaneli(dd, { ad: "Ali" }, ad);
    expect(h).toContain("Çiftlik</b>");
    expect(h).not.toContain("Dükkân</b>");
    expect(gecenSureMetni(36 * 60_000)).toBe("36 dk");
    expect(gecenSureMetni(96 * 60_000)).toBe("1 sa 36 dk");
    expect(gecenSureMetni(120 * 60_000)).toBe("2 sa");
    expect(gecenSureMetni(2.8 * 3_600_000)).toBe("2 sa 48 dk");
    expect(gecenSureMetni(3.4 * 3_600_000)).toBe("yaklaşık 3 sa");
    expect(gecenSureMetni(30 * 3_600_000)).toBe("yaklaşık 1 gün");
    const biten = new Map([["12", { tur: "ciftlik", ilce: "tr_41_gebze", bitis: 98.4 * SA }]]);
    expect(mulkDikkatMaddeleri(durum(), ad, biten).find((m) => m.baslik.includes("Çiftlik hazır"))?.ayrinti).toBe("1 sa 36 dk önce");
  });
});

describe("inşa bitişi bildirimi (nötr toast; Dikkat ile aynı cümle)", () => {
  const izleme = (): InsaatIzleme => ({ insaatlar: new Map(), bitenler: new Map(), duyurulan: new Set() });
  const yap = (anahtar: string, durum: "insaat" | "tesis", ek: Record<string, unknown> = {}): IsletmeDurumu["yapilar"][number] =>
    ({ anahtar, durum, tur: "ciftlik", ilce: "tr_41_gebze", ...ek }) as IsletmeDurumu["yapilar"][number];

  it("cümle Dikkat maddesinin başlığıyla aynı kaynaktan: 'Gebze: Çiftlik hazır.'; dükkân 'Gebze: Dükkân hazır.'; büyütme; ilçesiz", () => {
    expect(insaatBittiMetni({ tur: "ciftlik", ilce: "tr_41_gebze" }, ad)).toBe("Gebze: Çiftlik hazır.");
    expect(insaatBittiMetni({ tur: "dukkan", ilce: "tr_41_gebze" }, ad)).toBe("Gebze: Dükkân hazır.");
    expect(insaatBittiMetni({ tur: "ciftlik", ilce: "tr_41_gebze", yukseltme: true }, ad)).toBe("Gebze: Çiftlik büyütmesi hazır.");
    expect(insaatBittiMetni({ tur: "ahir" }, ad)).toBe("Ahır hazır.");
    // Dikkat maddesi aynı cümleyi taşır
    const dk = mulkDikkatMaddeleri(durum({ yapilar: [] }), ad, new Map([["9", { tur: "ciftlik", ilce: "tr_41_gebze", bitis: 99 * SA }]]));
    expect(dk.find((x) => x.tur === "bitti")?.baslik).toBe(insaatBittiMetni({ tur: "ciftlik", ilce: "tr_41_gebze" }, ad));
    // ton bilgi verici: kutlama/ödül sözü yok
    expect(insaatBittiMetni({ tur: "ciftlik", ilce: "tr_41_gebze" }, ad)).not.toMatch(/tebrik|harika|kutla|ödül|!/i);
  });

  it("devam eden inşaat bitip listeden düşünce BİR KEZ duyurulur; sonraki turlarda tekrar yok", () => {
    const iz = izleme();
    expect(insaatlariIzle(iz, [yap("i7", "insaat", { bitis: 103 * SA })], 101 * SA)).toEqual([]);
    const biten = insaatlariIzle(iz, [yap("t3", "tesis", { bitis: 103 * SA })], 103 * SA + 5000);
    expect(biten.map(([id]) => id)).toEqual(["7"]);
    expect(biten[0]![1]).toMatchObject({ tur: "ciftlik", ilce: "tr_41_gebze" });
    expect(insaatlariIzle(iz, [yap("t3", "tesis", { bitis: 103 * SA })], 104 * SA)).toEqual([]);
    expect(insaatlariIzle(iz, [yap("t3", "tesis", { bitis: 103 * SA })], 110 * SA)).toEqual([]);
    expect(iz.duyurulan.has("7")).toBe(true);
  });

  it("sayfa yenilenince (açılışta zaten bitmiş yapı; yeni izleme durumu) toast çıkmaz; Dikkat maddesi için biten kaydı yine tutulur", () => {
    const iz = izleme();
    expect(insaatlariIzle(iz, [yap("t3", "tesis", { bitis: 103 * SA })], 105 * SA)).toEqual([]);
    expect(iz.bitenler.has("3")).toBe(true);
  });

  it("açılışta inşa sürüyorsa ve sonra biterse (yenilemeden sonra) bir kez duyurulur", () => {
    const iz = izleme();
    insaatlariIzle(iz, [yap("i8", "insaat", { bitis: 106 * SA })], 105 * SA);
    expect(insaatlariIzle(iz, [], 106 * SA + 1000).map(([id]) => id)).toEqual(["8"]);
  });

  it("iptal edilen inşaat (bitişe çok var) duyurulmaz", () => {
    const iz = izleme();
    insaatlariIzle(iz, [yap("i9", "insaat", { bitis: 110 * SA })], 101 * SA);
    expect(insaatlariIzle(iz, [], 102 * SA)).toEqual([]);
    expect(iz.duyurulan.size).toBe(0);
  });

  it("birden çok yapı aynı turda: bitişe göre sıralı (önce erken biten)", () => {
    const iz = izleme();
    insaatlariIzle(iz, [yap("i1", "insaat", { bitis: 104 * SA }), yap("i2", "insaat", { bitis: 103 * SA, tur: "ahir" })], 101 * SA);
    expect(insaatlariIzle(iz, [], 105 * SA).map(([id]) => id)).toEqual(["2", "1"]);
  });
});

