/**
 * İnsan testi çıkarması (İ1 + İ4): sentetik bir günlük fikstürüyle (sunucunun yaptığı gibi başarısız komutlar DA günlükte) çevrimdışı oynatma:
 * kabul/ret ayrımı, ilk kabul edilen yapı, inşa tamamlanma, ilk gerçekleşen satış, Y7, H6 (i)/(ii), gerçek saat (TRT), determinizm, kişisel veri yokluğu,
 * anlık görüntü doğrulaması ve dosya deposu okuyucusu (sunucunun gerçek `DosyaGunlukDeposu` / `DosyaGoruntuDeposu` çıktısıyla).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GUN, SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikGoruntuOlustur, anlikHazine, kuralSurumuHesapla, yurtPlanla } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, KomutSonucu } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { parselBotuOlustur } from "@bolge/botlar";
import { DosyaGoruntuDeposu, DosyaGunlukDeposu } from "../../sunucu/src/depo/dosya";
import type { AnlikGoruntuKaydi, GunlukKaydi } from "../../sunucu/src/depo/tipler";
import { cikar, cikarmaAna, cikarmaArgumanAyristir, dosyaDeposundanOku } from "../src";
import type { CikarmaGoruntusu, CikarmaGunlukKaydi } from "../src";

function veri(): CekirdekVeriPaketi {
  return { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
}

/** Türkiye gece yarısı (2026-10-08T00:00:00+03:00). */
const EPOCH = Date.UTC(2026, 9, 7, 21, 0, 0);
const KATILMA = 1 * GUN; // 6 saatin katı: Y7 pencere uçları adım sınırına oturur
const TEST_OYUNCU = "ayse_demir"; // kişisel veri sızıntısı denetimi için "ad gibi" kimlik

interface Fikstur {
  gunluk: CikarmaGunlukKaydi[];
  sim: Simulasyon;
  sonuclar: KomutSonucu[];
  goruntu: CikarmaGoruntusu;
  /** Dünyanın gözlem bitişi (sim ms): son kayıttan sonra komut gelmeyebilir. */
  bitis: number;
  /** Test oyuncusu için bağımsız beklenen değerler. */
  beklenen: {
    ilkRetT: number;
    ilkKabulYapiT: number;
    ilkKabulYapiTur: string;
    insaatBitis: number;
    emirT: number | null;
    hazineBas: Map<string, number>;
    hazineBit: Map<string, number>;
    sermaye: Map<string, Array<{ t: number; tutar: number }>>;
    yon: Array<{ t: number; tur: string }>;
  };
}

/** Sunucunun yaptığı gibi kaydeder: başarılı ya da değil her komut günlüğe girer (yalnız `uygula` zamanı geçmiş olmamalı). */
function fikstur(): Fikstur {
  const v = veri();
  const sim = Simulasyon.olustur(v, 1);
  const gunluk: CikarmaGunlukKaydi[] = [];
  const sonuclar: KomutSonucu[] = [];
  const kaydet = (t: number, oyuncu: string, komut: Komut): KomutSonucu => {
    const r = sim.uygula({ t, oyuncu, komut });
    gunluk.push({ seq: gunluk.length + 1, t, oyuncu, komut: structuredClone(komut) });
    sonuclar.push(r);
    return r;
  };
  const katil = (t: number, oyuncu: string, ilceVerilen?: string): void => {
    sim.calistirKadar(t);
    const plan = yurtPlanla(sim.dunya, sim.ic);
    const ilce = ilceVerilen ?? (plan !== null && typeof plan !== "string" ? plan.ilce : undefined);
    kaydet(t, SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu, bolgeler: [], ...(ilce !== undefined ? { ilce } : {}) });
  };
  const botlar = [
    { id: "ali", bot: parselBotuOlustur("ciftci", "ali") },
    { id: "veli", bot: parselBotuOlustur("sanayici", "veli") },
    { id: TEST_OYUNCU, bot: parselBotuOlustur("ciftci", TEST_OYUNCU) },
  ];
  const beklenen: Fikstur["beklenen"] = { ilkRetT: -1, ilkKabulYapiT: -1, ilkKabulYapiTur: "", insaatBitis: -1, emirT: null, hazineBas: new Map(), hazineBit: new Map(), sermaye: new Map(), yon: [] };
  const hazineKopya = (): Map<string, number> => new Map(sim.dunya.oyuncular.map((o) => [o.id, anlikHazine(sim.dunya, o.id)] as const));
  let goruntu: CikarmaGoruntusu | null = null;
  const BITIS = KATILMA + 14 * GUN + 2 * GUN;
  for (let t = 0; t <= BITIS; t += 6 * SAAT) {
    sim.calistirKadar(t);
    if (t === 0) {
      katil(t, "ali");
      katil(t, "veli");
    }
    // Test oyuncusu ali ile AYNI ilçeye katılır: ali (daha önce katılmış, o ilçede hücresi var) Y7 emsali olur
    if (t === KATILMA) katil(t, TEST_OYUNCU, sim.dunya.mulk!.hucreler.find((x) => x.sahip === "ali")!.ilce);
    for (const b of botlar) {
      if (b.id === TEST_OYUNCU && t < KATILMA) continue;
      if (!sim.dunya.oyuncular.some((o) => o.id === b.id)) continue;
      let dt = 0;
      if (b.id === TEST_OYUNCU && t === KATILMA) {
        // İlk yapı denemesi REDDEDİLİR (bilinmeyen tür), 4 dk sonra bot kararı kabul edilir; yapı onayı 7. dakika
        const ilce = yurtIlcesi();
        const r = kaydet(t + 3 * 60_000, TEST_OYUNCU, { tur: "yapi_yerlestir", ilce, tesisTuru: "yok_tur", hucreler: [], sinif: "kirsal" });
        expect(r.tamam).toBe(false);
        beklenen.ilkRetT = t + 3 * 60_000;
        dt = 7 * 60_000;
        sim.calistirKadar(t + dt);
      }
      for (const komut of b.bot.karar(sim)) {
        const once = anlikHazine(sim.dunya, b.id);
        const r = kaydet(t + dt, b.id, komut);
        if (r.tamam && (komut.tur === "yapi_yerlestir" || komut.tur === "parsel_al" || komut.tur === "tesis_insa_hucre")) {
          const l = beklenen.sermaye.get(b.id) ?? [];
          l.push({ t: t + dt, tutar: once - anlikHazine(sim.dunya, b.id) });
          beklenen.sermaye.set(b.id, l);
        }
        if (b.id === TEST_OYUNCU && r.tamam) {
          if (komut.tur === "yapi_yerlestir" && beklenen.ilkKabulYapiT < 0) {
            beklenen.ilkKabulYapiT = t + dt;
            beklenen.ilkKabulYapiTur = komut.tesisTuru;
            let ins: (typeof sim.dunya.insaatlar)[number] | undefined;
            for (const i of sim.dunya.insaatlar) if (i.sahip === TEST_OYUNCU && i.baslangic === t + dt && (ins === undefined || i.id > ins.id)) ins = i;
            beklenen.insaatBitis = (ins as NonNullable<typeof ins>).bitis;
          }
          if (komut.tur === "ticaret_emri" && komut.yon === "ihracat" && komut.oranSaat > 0 && beklenen.emirT === null) beklenen.emirT = t + dt;
        }
      }
    }
    // Yön komutu: test oyuncusu 3. günde bir yurt hücresini bırakır (kabul ya da ret fark etmez: günlükte ikisi de olur)
    if (t === KATILMA + 3 * GUN) {
      const h = sim.dunya.mulk!.hucreler.find((x) => x.sahip === TEST_OYUNCU);
      if (h !== undefined) {
        const r = kaydet(t + 60_000, TEST_OYUNCU, { tur: "parsel_birak", ilce: h.ilce, hucreler: [h.id] });
        if (r.tamam) beklenen.yon.push({ t: t + 60_000, tur: "parsel_birak" });
      }
    }
    if (t === KATILMA + 7 * GUN) beklenen.hazineBas = hazineKopya();
    if (t === KATILMA + 14 * GUN) beklenen.hazineBit = hazineKopya();
    if (t === 8 * GUN) {
      sim.calistirKadar(t);
      const kural = kuralSurumuHesapla(v);
      goruntu = { seq: gunluk.length, simZamani: sim.dunya.zaman, kuralSurumu: kural, durumOzeti: sim.durumOzeti(), metin: anlikGoruntuOlustur(sim, kural), ek: { tohum: 1, dunyaEpochMs: EPOCH } };
    }
  }
  sim.calistirKadar(BITIS);
  return { gunluk, sim, sonuclar, goruntu: goruntu as unknown as CikarmaGoruntusu, bitis: BITIS, beklenen };

  function yurtIlcesi(): string {
    return sim.dunya.mulk!.hucreler.find((x) => x.sahip === TEST_OYUNCU)!.ilce;
  }
}

const OYUNCULAR = [{ id: TEST_OYUNCU, kod: "K1", profil: "strateji-masaustu-windows" }];

let fk: Fikstur | null = null;
const f = (): Fikstur => (fk ??= fikstur());

describe("insan testi çıkarması: günlük oynatma", () => {
  it("katılım, kabul/ret ayrımı, ilk kabul edilen yapı, inşa tamamlanma ve gerçek saat (TRT)", () => {
    const { gunluk, beklenen, bitis } = f();
    const c = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, dunyaEpochMs: EPOCH, bitisTMs: bitis, commit: "abc1234", dunya: "test-dunyasi" });
    const k = c.katilimcilar[0]!;
    expect(k.kod).toBe("K1");
    expect(k.profil).toBe("strateji-masaustu-windows");
    expect(k.katilma).toMatchObject({ tMs: KATILMA, kabul: true });
    expect(k.katilma!.ilce).not.toBeNull();
    // İ4: TRT = dunyaEpochMs + t (+03:00); katılım 1. gün 00:00
    expect(k.katilma!.trt).toBe("2026-10-09T00:00:00+03:00");
    // Başarısız komut da günlükte: ilk deneme reddedildi, ilk KABUL edilen yapı sonra geldi
    expect(k.yapiDenemeleri[0]).toMatchObject({ tMs: beklenen.ilkRetT, tur: "yok_tur", kabul: false });
    expect(k.yapiDenemeleri[0]!.hata).toMatch(/.+/);
    expect(k.yapiDenemeleri.find((d) => d.kabul)!.tMs).toBe(beklenen.ilkKabulYapiT);
    expect(k.ilkYapi).toMatchObject({ tMs: beklenen.ilkKabulYapiT, kabul: true, tur: beklenen.ilkKabulYapiTur, gecikmeMs: beklenen.ilkKabulYapiT - KATILMA });
    expect(k.ilkYapi!.trt).toBe(new Date(EPOCH + beklenen.ilkKabulYapiT + 3 * 3_600_000).toISOString().slice(0, 19) + "+03:00");
    // inşa tamamlanma: inşaat kaydındaki bitiş (tam ms)
    expect(k.insaTamam).toMatchObject({ tMs: beklenen.insaatBitis, durum: "tamam" });
    expect(k.komutOzeti.kabul).toBeGreaterThan(0);
    expect(k.komutOzeti.red).toBeGreaterThanOrEqual(1);
    expect(c.test).toMatchObject({ commit: "abc1234", dunya: "test-dunyasi", baslangic: "bastan", dunyaEpochMs: EPOCH, kayitSayisi: gunluk.length, sonSeq: gunluk.length });
    expect(c.test.kuralSurumu).toBe(kuralSurumuHesapla(veri()));
  });

  it("ilk gerçekleşen satış, ikinci yapı ve katmanı, yön komutları", () => {
    const { gunluk, beklenen, bitis } = f();
    const k = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, dunyaEpochMs: EPOCH, bitisTMs: bitis }).katilimcilar[0]!;
    expect(beklenen.emirT).not.toBeNull();
    expect(k.ilkSatis!.emirTMs).toBe(beklenen.emirT);
    expect(k.ilkSatis!.gerceklesenTMs).not.toBeNull();
    expect(k.ilkSatis!.gerceklesenTMs! >= k.ilkSatis!.emirTMs).toBe(true);
    expect([60_000, SAAT]).toContain(k.ilkSatis!.cozunurlukMs);
    if (k.ilkSatis!.gerceklesenTMs! - k.ilkSatis!.emirTMs <= 3 * SAAT) expect(k.ilkSatis!.cozunurlukMs).toBe(60_000);
    // ikinci yapı: katman Y5 tablosundan
    if (k.ikinciYapi !== null) expect(["tarim", "hammadde", "sanayi", "enerji", "hizmet", "diger"]).toContain(k.ikinciYapi.katman);
    expect(k.yonKomutlari.map((y) => ({ tMs: y.tMs, tur: y.tur }))).toEqual(f().beklenen.yon.map((y) => ({ tMs: y.t, tur: y.tur })));
    expect(k.dukkan).toBeNull(); // çekirdekte dükkân yok
    expect(k.oturumlar).toBeNull();
  });

  it("H6 (ii): geniş bağlayıcı (herhangi üretim yapısı), resmî ikincil (açılış türü); (i) taban hücre", () => {
    const { gunluk, beklenen, bitis } = f();
    const k = cikar({ veri: veri(), gunluk, oyuncular: [{ ...OYUNCULAR[0]!, acilis: "ciftci" }], dunyaEpochMs: EPOCH, bitisTMs: bitis }).katilimcilar[0]!;
    expect(k.h6.baglayici).toBe("genis");
    expect(k.h6.pencereTamam).toBe(true);
    expect(k.h6.iiGenis).toBe(true);
    expect(k.h6.iiGenisT!.tMs).toBe(beklenen.ilkKabulYapiT);
    expect(k.h6.iiBagimsiz).toBeNull();
    // ciftci acilişi: ciftlik/mera; bot çiftçi ilk yapıyı bu türlerden kurar
    expect(k.h6.ii).toBe(true);
    expect(k.ilkYapi!.acilisTuru).toBe(true);
    expect(k.h6.ayakIzi).toBe(2);
    expect(k.h6.ayrilmisBosKatilim).toBeGreaterThanOrEqual(0);
    expect(k.h6.tabanYeter).toBe((k.h6.ayrilmisBosKatilim as number) >= 2);
    expect(k.h6.tabanYeterYurtDahil).toBe((k.h6.ayrilmisBosKatilim as number) + (k.h6.ayakIziYurtHucre as number) >= 2);
    // açılış verilmezse ilk üretim yapısından çıkarılır (ciftlik -> ciftci ve pazar; ikisi de olabilir: belirsizse null)
    const k2 = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: bitis }).katilimcilar[0]!;
    expect(k2.katilma!.trt).toBeNull(); // epoch yok
    expect(k2.h6.iiGenis).toBe(true);
  });

  it("Y7: katılım + 14 günün son 7 günü; hazine farkı + sermaye harcaması; emsal yalnız üreten yerleşikler", () => {
    const { gunluk, beklenen, bitis } = f();
    const k = cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, bitisTMs: bitis }).katilimcilar[0]!;
    expect("olculemez" in k.y7).toBe(false);
    if ("olculemez" in k.y7) return;
    expect(k.y7.pencereBasTMs).toBe(KATILMA + 7 * GUN);
    expect(k.y7.pencereBitTMs).toBe(KATILMA + 14 * GUN);
    // Bağımsız beklenti: hazine(T) − hazine(T−7g) + (T−7g, T] aralığındaki sermaye harcaması (arsa + yapı parası)
    const gelir = (id: string): number =>
      (beklenen.hazineBit.get(id) as number) - (beklenen.hazineBas.get(id) as number) + (beklenen.sermaye.get(id) ?? []).filter((x) => x.t > KATILMA + 7 * GUN && x.t <= KATILMA + 14 * GUN).reduce((a, x) => a + x.tutar, 0);
    expect(k.y7.net7gunMili).toBe(gelir(TEST_OYUNCU));
    // Emsal: ali (ayse'den önce katıldı, aynı ilçede hücresi var); geliri > 0 olduğundan üreten emsal ve ilçe düzeyi
    expect(gelir("ali")).toBeGreaterThan(0);
    expect(k.y7.emsalDuzeyi).toBe("ilce");
    expect(k.y7.emsalSayisi).toBe(1);
    expect(k.y7.uretenEmsalSayisi).toBe(1);
    expect(k.y7.emsalMedyanMili).toBe(gelir("ali"));
  });

  it("gözlem 14 günü tamamlamadıysa Y7 ölçülemez ve (ii) pencere tamam değil", () => {
    const { gunluk } = f();
    const kisa = gunluk.filter((g) => g.t <= KATILMA + 5 * GUN);
    const k = cikar({ veri: veri(), gunluk: kisa, oyuncular: OYUNCULAR }).katilimcilar[0]!;
    expect("olculemez" in k.y7).toBe(true);
    expect(k.h6.pencereTamam).toBe(false);
  });

  it("aynı günlük iki kez oynatılınca bayt bayt aynı çıktı; çıktıda oyuncu kimliği ya da ad yok", () => {
    const { gunluk, bitis } = f();
    const a = JSON.stringify(cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, dunyaEpochMs: EPOCH, bitisTMs: bitis, commit: "x" }), null, 2);
    const b = JSON.stringify(cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, dunyaEpochMs: EPOCH, bitisTMs: bitis, commit: "x" }), null, 2);
    expect(a).toBe(b);
    expect(a).not.toContain(TEST_OYUNCU);
    expect(a).not.toContain("ayse");
    expect(a).not.toContain('"ali"');
    expect(a).not.toContain('"veli"');
    expect(JSON.parse(a).katilimcilar).toHaveLength(1);
  });

  it("eşlemede olmayan oyuncular (botlar) çıktıda görünmez; eşleme tekrarlı kimlikte hata", () => {
    const { gunluk } = f();
    const c = cikar({ veri: veri(), gunluk, oyuncular: [{ id: "ali", kod: "K9" }] });
    expect(c.katilimcilar.map((x) => x.kod)).toEqual(["K9"]);
    expect(() => cikar({ veri: veri(), gunluk, oyuncular: [{ id: "ali", kod: "K1" }, { id: "ali", kod: "K2" }] })).toThrow(/tekrar/);
  });

  it("anlık görüntü: oynatma görüntünün durum özetiyle eşleşir; kural sürümü farklıysa durur", () => {
    const { gunluk, goruntu } = f();
    const c = cikar({ veri: veri(), gunluk, goruntu, oyuncular: OYUNCULAR });
    expect(c.test.goruntuDogrulama).toEqual({ seq: goruntu.seq, simZamani: goruntu.simZamani, durumOzetiAyni: true });
    expect(c.test.dunyaEpochMs).toBe(EPOCH); // görüntü ekinden
    expect(() => cikar({ veri: veri(), gunluk, goruntu: { ...goruntu, kuralSurumu: "baska" }, oyuncular: OYUNCULAR })).toThrow(/kural surumu/);
    // görüntüden başlama: görüntü öncesi olaylar bilinmez (not düşer)
    const g = cikar({ veri: veri(), gunluk, goruntu, baslangic: "goruntu", oyuncular: OYUNCULAR });
    expect(g.test.baslangic).toBe("goruntu");
    expect(g.notlar.some((n) => n.includes("goruntu oncesi"))).toBe(true);
  });

  it("günlük seq boşluğu hatadır; başlangıç görüntü olmadan seq 1'den değilse bastan oynatılamaz", () => {
    const { gunluk } = f();
    expect(() => cikar({ veri: veri(), gunluk: gunluk.filter((g) => g.seq !== 5), oyuncular: OYUNCULAR })).toThrow(/seq boslugu/);
    expect(() => cikar({ veri: veri(), gunluk: gunluk.slice(3), oyuncular: OYUNCULAR })).toThrow(/bastan oynatilamaz/);
  });
});

const geciciler: string[] = [];
afterEach(() => {
  for (const d of geciciler.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("dosya deposu okuyucusu (sunucunun gerçek dosya deposu çıktısıyla)", () => {
  it("DosyaGunlukDeposu ve DosyaGoruntuDeposu ile yazılan dizini okur; çıkarma aynı sonucu verir", async () => {
    const { gunluk, goruntu } = f();
    const dizin = mkdtempSync(join(tmpdir(), "cikarma-"));
    geciciler.push(dizin);
    const kural = kuralSurumuHesapla(veri());
    const gd = await DosyaGunlukDeposu.ac(dizin);
    const kayitlar: GunlukKaydi[] = gunluk.map((g) => ({ seq: g.seq, t: g.t, oyuncu: g.oyuncu, komut: g.komut, istemci: "test", anahtar: `a${g.seq}`, kuralSurumu: kural, semaSurumu: 1 }));
    await gd.ekle(kayitlar);
    await gd.kapat();
    const gor = await DosyaGoruntuDeposu.ac(dizin);
    const kayit: AnlikGoruntuKaydi = { seq: goruntu.seq, simZamani: goruntu.simZamani, kuralSurumu: kural, semaSurumu: 1, durumOzeti: goruntu.durumOzeti, metin: goruntu.metin, ek: { tohum: 1, dunyaEpochMs: EPOCH, idempotans: [] } };
    await gor.kaydet(kayit);
    const okuma = dosyaDeposundanOku(dizin);
    expect(okuma.uyarilar).toEqual([]);
    expect(okuma.gunluk.map((g) => g.seq)).toEqual(gunluk.map((g) => g.seq));
    expect(okuma.goruntu).toMatchObject({ seq: goruntu.seq, simZamani: goruntu.simZamani, durumOzeti: goruntu.durumOzeti });
    const a = JSON.stringify(cikar({ veri: veri(), gunluk: okuma.gunluk, goruntu: okuma.goruntu, oyuncular: OYUNCULAR }));
    const b = JSON.stringify(cikar({ veri: veri(), gunluk, goruntu, oyuncular: OYUNCULAR }));
    expect(a).toBe(b);
  });

  it("sondaki yarım satır atılır ve bildirilir (dosya değiştirilmez); ortadaki bozuk satır hatadır", () => {
    const dizin = mkdtempSync(join(tmpdir(), "cikarma-"));
    geciciler.push(dizin);
    const komut: Komut = { tur: "savunma_emri", bolge: "m_ova", durus: "normal" };
    const satir = (seq: number): string => JSON.stringify({ seq, t: seq * 1000, oyuncu: "x", komut, istemci: "i", anahtar: "a", kuralSurumu: "k", semaSurumu: 1 });
    writeFileSync(join(dizin, "gunluk.jsonl"), `${satir(1)}\n${satir(2)}\n{"seq":3,"t":3`, "utf8");
    const o = dosyaDeposundanOku(dizin);
    expect(o.gunluk.map((g) => g.seq)).toEqual([1, 2]);
    expect(o.uyarilar[0]).toMatch(/tamamlanmamis satir/);
    expect(o.goruntu).toBeNull();
    writeFileSync(join(dizin, "gunluk.jsonl"), `${satir(1)}\nbozuk\n${satir(3)}\n`, "utf8");
    expect(() => dosyaDeposundanOku(dizin)).toThrow(/bozuk JSON/);
    writeFileSync(join(dizin, "gunluk.jsonl"), `${satir(1)}\n${satir(3)}\n`, "utf8");
    expect(() => dosyaDeposundanOku(dizin)).toThrow(/seq boslugu/);
  });
});

describe("komut satırı: pnpm olcum --kip cikarma", () => {
  it("bayraklar ayrıştırılır; geçersiz değer ve bilinmeyen seçenek hata", () => {
    const a = cikarmaArgumanAyristir(["--depo", "d", "--oyuncular=o.json", "--cikti", "c.json", "--harita", "mini", "--parsel", "mini", "--epoch", "5", "--bitis-trt", "2026-10-23T12:00:00+03:00", "--baslangic", "goruntu", "--commit", "abc"]);
    expect(a).toMatchObject({ depo: "d", oyuncular: "o.json", cikti: "c.json", harita: "mini", parsel: "mini", epoch: 5, bitisTrt: "2026-10-23T12:00:00+03:00", baslangic: "goruntu", commit: "abc" });
    expect(() => cikarmaArgumanAyristir(["--baslangic", "x"])).toThrow(/baslangic/);
    expect(() => cikarmaArgumanAyristir(["--epoch", "-1"])).toThrow(/--epoch/);
    expect(() => cikarmaArgumanAyristir(["--yok"])).toThrow(/bilinmeyen/);
    expect(() => cikarmaAna(["--depo", "d"])).toThrow(/gerekli/);
  });

  it("dosya deposundan çıktı dosyasına: doğrudan çıkarmayla aynı JSON (bitiş gerçek saatle verilebilir)", async () => {
    const { gunluk, bitis } = f();
    const dizin = mkdtempSync(join(tmpdir(), "cikarma-cli-"));
    geciciler.push(dizin);
    const kural = kuralSurumuHesapla(veri());
    const gd = await DosyaGunlukDeposu.ac(dizin);
    await gd.ekle(gunluk.map((g) => ({ seq: g.seq, t: g.t, oyuncu: g.oyuncu, komut: g.komut, istemci: "test", anahtar: `a${g.seq}`, kuralSurumu: kural, semaSurumu: 1 })));
    await gd.kapat();
    const eslesme = join(dizin, "eslesme.json");
    writeFileSync(eslesme, JSON.stringify(OYUNCULAR), "utf8");
    const cikti = join(dizin, "alt", "cikti.json");
    const bitisTrt = new Date(EPOCH + bitis + 3 * 3_600_000).toISOString().slice(0, 19) + "+03:00";
    cikarmaAna(["--depo", dizin, "--oyuncular", eslesme, "--cikti", cikti, "--harita", "mini", "--parsel", "mini", "--tohum", "1", "--epoch", String(EPOCH), "--bitis-trt", bitisTrt, "--commit", "abc1234", "--dunya", "d1"]);
    const yazilan = readFileSync(cikti, "utf8");
    const dogrudan = JSON.stringify(cikar({ veri: veri(), gunluk, oyuncular: OYUNCULAR, tohum: 1, dunyaEpochMs: EPOCH, bitisTMs: bitis, commit: "abc1234", dunya: "d1" }), null, 2) + "\n";
    expect(yazilan).toBe(dogrudan);
    expect(yazilan).not.toContain(TEST_OYUNCU);
  });
});
