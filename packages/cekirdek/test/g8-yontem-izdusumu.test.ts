/**
 * G8-2 / K-1 (sartname §8.4, §13.1, §16.2 `yontem-izdusumu-kanit`): ALTI `mulkKipi` yöntemiyle (G6'nın 4'ü + G8'in `cam_firini`, `celik_dograma`) bölge kipi yöntem izdüşümü.
 * Kanıt (`g6-yontem-izdusumu.test.ts` kalıbı): "P4 öncesi" içerik (6 yöntemin hepsi, `mulk.sebeke`, `mulk.yontemGecersizKilma`, `mulk.perakende` çıkarılmış) ile güncel içerikle AYNI
 * bölge kipi koşusu 12 noktada tam özet, etkin kuyruk, işlenen olay zinciri ve olay sayacı bakımından BİREBİR aynı; koşu sonu `durumOzeti` aynı. Karşıt kanıt: bayraksız G8 yöntemleri
 * (süzgeç yok) kanıtı KIRAR. Bu dosya G8-1 verisi gelmeden de koşar (yöntemler bellekte eklenir; pakette varsa dokunulmaz).
 */
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikKimlikTablosuOlustur } from "../src/goc";
import { Simulasyon, SISTEM_OYUNCUSU } from "../src/motor";
import { kuralSurumuHesapla } from "../src/serilestir";
import { GUN } from "../src/tipler";
import { esitNoktalar, kanitKaydi, NOKTA_SAYISI } from "./esik-budama-kanit";
import { G8_YONTEMLER, g8Veri } from "./g8-yardimci";
import { G6_YONTEMLER, ortakKomutluKos, p4Oncesi } from "./g6-yardimci";

const SAAT = 3_600_000;
const TUM = [...G6_YONTEMLER, ...G8_YONTEMLER];

describe("K-1 (altı yöntem): P4 öncesi ↔ güncel içerik, bölge kipi, 12 noktada tam özet", () => {
  it("içerik gerçekten farklı: altı yöntem SONA eklendi (indeks kayması yok), kural sürümü ve kimlik tablosu 6 yöntem fazla; yalnız `mulkKipi` yöntemleri çıkarıldı", () => {
    const guncel = g8Veri(miniVeriyiYukle());
    const eski = p4Oncesi(guncel);
    const sg = Simulasyon.olustur(guncel, 1);
    const se = Simulasyon.olustur(eski, 1);
    expect(sg.ic.yontemler.length - se.ic.yontemler.length).toBe(6);
    expect(icerikKimlikTablosuOlustur(sg.ic).yontemler.length - icerikKimlikTablosuOlustur(se.ic).yontemler.length).toBe(6);
    expect(kuralSurumuHesapla(guncel)).not.toBe(kuralSurumuHesapla(eski));
    se.ic.yontemler.forEach((y, i) => expect(sg.ic.yontemler[i]!.id).toBe(y.id));
    for (const id of TUM) expect(sg.ic.yontemIndeks[id]).toBeDefined();
    // `parca_fabrikasi` tür listesi (süzülmüş görünüm): bölge kipinde G8 yöntemi görünmez
    const pf = (s: Simulasyon) => s.ic.tesisTurleri.find((t) => t.id === "parca_fabrikasi")!.yontemler;
    expect(pf(sg)).toEqual(pf(se));
    for (const id of G8_YONTEMLER) expect(pf(sg)).not.toContain(id);
  });

  it(`mini-6, 4 bot + bulanık komut, tohum 3, 6 gün: ${NOKTA_SAYISI} noktada durum, etkin kuyruk, işlenen olay zinciri, olay sayacı VE koşu sonu tam özet aynı`, () => {
    const guncel = g8Veri(miniVeriyiYukle());
    const eski = p4Oncesi(guncel);
    const gun = 6;
    const kos = (veri: VeriPaketi) => kanitKaydi(esitNoktalar(gun * GUN, NOKTA_SAYISI), () => void ortakKomutluKos({ veri, bulanikVeri: eski, tohum: 3, sureMs: gun * GUN }));
    const a = kos(eski);
    const b = kos(guncel);
    expect(b.noktalar).toHaveLength(NOKTA_SAYISI);
    b.noktalar.forEach((n, i) => expect({ i, ...n }).toEqual({ i, ...a.noktalar[i]! }));
    expect(b.sonOzet).toBe(a.sonOzet);
    expect(b.kuyruk - b.eskimis).toBe(a.kuyruk - a.eskimis);
    expect(b.islenenEskimis).toBe(a.islenenEskimis);
  }, 240_000);

  it("DUYARLILIK: sabit `yontem_degistir` ile G8 yöntemi denenen koşu: süzgeçli güncel içerik P4 öncesiyle 12 noktada AYNI; bayraksız güncel içerik FARKLI", () => {
    const guncel = g8Veri(miniVeriyiYukle());
    const bayraksiz = g8Veri(miniVeriyiYukle(), { bayrak: false });
    const eski = p4Oncesi(guncel);
    const gun = 4;
    // o0 (kuzey) önce bir parca_fabrikasi kurar (adım 0), 36 saat sonra (adım 6) onu cam fırınına çevirmeyi dener: bot/bulanık akıştan bağımsız, sabit komutlar
    const ekKomut = [
      { adim: 0, oyuncu: "o0", komut: (_: Simulasyon) => ({ tur: "tesis_insa" as const, bolge: "m_ova", tesisTuru: "parca_fabrikasi" }) },
      {
        adim: 6,
        oyuncu: "o0",
        komut: (s: Simulasyon) => {
          const b = s.dunya.bolgeler.find((x) => x.id === "m_ova")!;
          const t = b.tesisler.find((x) => s.ic.tesisTurleri[x.tur]!.id === "parca_fabrikasi");
          if (t === undefined) throw new Error("o0'in parca_fabrikasi tesisi yok (senaryo varsayimi)");
          return { tur: "yontem_degistir" as const, bolge: "m_ova", tesis: t.id, yontem: "cam_firini" };
        },
      },
    ];
    const kos = (veri: VeriPaketi) => kanitKaydi(esitNoktalar(gun * GUN, NOKTA_SAYISI), () => void ortakKomutluKos({ veri, bulanikVeri: eski, tohum: 3, sureMs: gun * GUN, ekKomut }));
    const a = kos(eski);
    const b = kos(guncel);
    b.noktalar.forEach((n, i) => expect({ i, ...n }).toEqual({ i, ...a.noktalar[i]! }));
    expect(b.sonOzet).toBe(a.sonOzet);
    // bayrak yoksa kanıt KIRILIR: ya özet farklıdır ya da P3 yeni-mal izdüşümü (`mal-izdusumu.ts`) yeni malın (cam, pencere) etkisiz olmadığını yakalar (fırlatır)
    let kirildi = false;
    try {
      const c = kos(bayraksiz);
      kirildi = c.noktalar.some((n, i) => n.durum !== a.noktalar[i]!.durum);
    } catch (e) {
      expect((e as Error).message).toMatch(/yeni mal etkisiz degil/);
      kirildi = true;
    }
    expect(kirildi).toBe(true);
  }, 240_000);

  it("bölge kipinde `yontem_degistir` G8 yöntemlerini reddeder ve dünya DEĞİŞMEZ; bayraksız içerikte aynı komut KABUL edilir (karşıt kanıt)", () => {
    const sim = (veri: VeriPaketi): { s: Simulasyon; bolge: string; tesis: number } => {
      const s = Simulasyon.olustur(veri, 5);
      s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman"] } });
      expect(s.uygula({ t: 0, oyuncu: "a", komut: { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "parca_fabrikasi" } })).toEqual({ tamam: true });
      s.calistirKadar(48 * SAAT);
      const b = s.dunya.bolgeler.find((x) => x.id === "m_ova")!;
      const t = b.tesisler.find((x) => s.ic.tesisTurleri[x.tur]!.id === "parca_fabrikasi");
      if (t === undefined) throw new Error("parca_fabrikasi kurulmadi");
      return { s, bolge: b.id, tesis: t.id };
    };
    const y = sim(g8Veri(miniVeriyiYukle()));
    y.s.calistirKadar(y.s.dunya.zaman + 2 * SAAT);
    const once = y.s.durumOzeti();
    for (const yontem of G8_YONTEMLER) {
      const r = y.s.uygula({ t: y.s.dunya.zaman, oyuncu: "a", komut: { tur: "yontem_degistir", bolge: y.bolge, tesis: y.tesis, yontem } });
      expect(r.tamam).toBe(false);
      if (!r.tamam) expect(r.hata).toMatch(/yontem bu tesis turunde yok|bilinmeyen yontem/);
    }
    expect(y.s.durumOzeti()).toBe(once);
    const n = sim(g8Veri(miniVeriyiYukle(), { bayrak: false }));
    n.s.calistirKadar(n.s.dunya.zaman + 2 * SAAT);
    const onceN = n.s.durumOzeti();
    expect(n.s.uygula({ t: n.s.dunya.zaman, oyuncu: "a", komut: { tur: "yontem_degistir", bolge: n.bolge, tesis: n.tesis, yontem: "cam_firini" } })).toEqual({ tamam: true });
    expect(n.s.durumOzeti()).not.toBe(onceN);
  });
});
