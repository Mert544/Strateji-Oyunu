/**
 * G6-4 / K-1, K-4 (bölge kipi etkisizlik), karşıt kanıt ve `mulkKipi` süzgeci (şartname §13.1 K-1, K-4, §13.3, §5.5; §16.1).
 *
 * Kanıt (P3 `mal-izdusumu-kanit.test.ts` kalıbı, ama yöntem uzayı durumda indeks dizisi olarak YER ALMADIĞI için izdüşüm gerekmez):
 * "P4 öncesi" içerikle (yeni yöntemler, `mulk.sebeke`, `mulk.yontemGecersizKilma` çıkarılmış) ve güncel içerikle AYNI bölge kipi koşusu 12 kontrol
 * noktasında TAM durum özeti (`kanitKaydi.durum`: kuyruk ve olay sayacı hariç dünyanın kanonik özeti), etkin kuyruk, işlenen olay zinciri ve olay
 * sayacı bakımından BİREBİR aynı olmalıdır; koşu sonu tam `durumOzeti` de aynıdır. Bulanık komutlar iki dünyada AYNI içerik listesinden üretilir
 * (`ortakKomutluKos`): aksi halde karşılaştırma içeriği değil komut akışını ölçerdi.
 *
 * Yeni yöntemler bu testte SENTETİKTİR (`g6Veri`); G6-3 sonrası gerçek veri paketinde aynı kanıt ayrıca koşar (aşağıda "gerçek veri" bloğu).
 */
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { Bakis, yontemAdaylari } from "../../botlar/src";
import { icerikKimlikTablosuOlustur } from "../src/goc";
import { Simulasyon, SISTEM_OYUNCUSU } from "../src/motor";
import { kuralSurumuHesapla } from "../src/serilestir";
import { GUN } from "../src/tipler";
import { esitNoktalar, kanitKaydi, NOKTA_SAYISI } from "./esik-budama-kanit";
import { G6_YONTEMLER, g6Veri, mulkParam, ortakKomutluKos, p4Oncesi, sebekeMiliOku } from "./g6-yardimci";

const SAAT = 3_600_000;

function sim(veri: VeriPaketi, tohum = 5): Simulasyon {
  const s = Simulasyon.olustur(veri, tohum);
  s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman"] } });
  return s;
}

/** `m_ova`daki `gida_fabrikasi` tesisinin (bölge, tesis) kimliği: mini-6'da oyuncuya baştan verilir. */
function gidaFabrikasi(s: Simulasyon): { bolge: string; tesis: number } {
  for (const b of s.dunya.bolgeler) {
    const t = b.tesisler.find((x) => s.ic.tesisTurleri[x.tur]!.id === "gida_fabrikasi");
    if (t !== undefined) return { bolge: b.id, tesis: t.id };
  }
  throw new Error("gida_fabrikasi yok");
}

describe("K-1: yöntem izdüşümü (bölge kipi): P4 öncesi ↔ güncel içerik, 12 noktada tam özet", () => {
  const senaryolar: { ad: string; veri: () => VeriPaketi; tohum: number; gun: number }[] = [
    { ad: "mini-6, 4 bot + bulanık komut, tohum 3, 6 gün", veri: miniVeriyiYukle, tohum: 3, gun: 6 },
  ];
  for (const s of senaryolar) {
    it(`${s.ad}: ${NOKTA_SAYISI} kontrol noktasında durum, etkin kuyruk, işlenen olay zinciri, olay sayacı VE koşu sonu tam özet aynı`, () => {
      const guncel = g6Veri(s.veri());
      const eski = p4Oncesi(guncel);
      const kos = (veri: VeriPaketi) => kanitKaydi(esitNoktalar(s.gun * GUN, NOKTA_SAYISI), () => void ortakKomutluKos({ veri, bulanikVeri: eski, tohum: s.tohum, sureMs: s.gun * GUN }));
      const a = kos(eski);
      const b = kos(guncel);
      expect(b.noktalar).toHaveLength(NOKTA_SAYISI);
      b.noktalar.forEach((n, i) => expect({ i, ...n }).toEqual({ i, ...a.noktalar[i]! }));
      // P3'ten farkı: yöntem uzayı durumda indeksli dizi olarak yer almadığından TAM özet de eşit olmalıdır (eşit çıkmazsa süzgeç hatalıdır).
      expect(b.sonOzet).toBe(a.sonOzet);
      expect(b.kuyruk - b.eskimis).toBe(a.kuyruk - a.eskimis);
      expect(b.islenenEskimis).toBe(a.islenenEskimis);
    }, 180_000);
  }

  it("DUYARLILIK: sabit `yontem_degistir` (yeni yönteme) enjekte edilen koşu: süzgeçli güncel içerik P4 öncesiyle 12 noktada AYNI; bayraksız güncel içerik FARKLI", () => {
    const guncel = g6Veri(miniVeriyiYukle());
    const bayraksiz = g6Veri(miniVeriyiYukle(), { bayrak: false });
    const eski = p4Oncesi(guncel);
    const gun = 4;
    // o0 (kuzey: m_ova) gida_fabrikasi'ni değirmene çevirmeyi dener (bot/bulanık akıştan bağımsız, sabit komut)
    const ekKomut = [
      {
        adim: 2,
        oyuncu: "o0",
        komut: (s: Simulasyon) => {
          const b = s.dunya.bolgeler.find((x) => x.id === "m_ova")!;
          const t = b.tesisler.find((x) => s.ic.tesisTurleri[x.tur]!.id === "gida_fabrikasi")!;
          return { tur: "yontem_degistir" as const, bolge: "m_ova", tesis: t.id, yontem: "degirmen" };
        },
      },
    ];
    const kos = (veri: VeriPaketi) => kanitKaydi(esitNoktalar(gun * GUN, NOKTA_SAYISI), () => void ortakKomutluKos({ veri, bulanikVeri: eski, tohum: 3, sureMs: gun * GUN, ekKomut }));
    const a = kos(eski);
    const b = kos(guncel);
    b.noktalar.forEach((n, i) => expect({ i, ...n }).toEqual({ i, ...a.noktalar[i]! }));
    expect(b.sonOzet).toBe(a.sonOzet);
    const c = kos(bayraksiz);
    expect(c.noktalar.some((n, i) => n.durum !== a.noktalar[i]!.durum)).toBe(true); // bayrak yoksa kanıt KIRILIR: yöntem izdüşümü duyarlı
  }, 180_000);

  it("P4 öncesi ve güncel içerik gerçekten farklı: kural sürümü farklı, kimlik tablosu 4 yöntem uzun, içerik/tür listeleri tutarlı", () => {
    const guncel = g6Veri(miniVeriyiYukle());
    const eski = p4Oncesi(guncel);
    expect(kuralSurumuHesapla(guncel)).not.toBe(kuralSurumuHesapla(eski));
    const sg = Simulasyon.olustur(guncel, 1);
    const se = Simulasyon.olustur(eski, 1);
    expect(sg.ic.yontemler.length - se.ic.yontemler.length).toBe(G6_YONTEMLER.length);
    expect(icerikKimlikTablosuOlustur(sg.ic).yontemler.length).toBe(icerikKimlikTablosuOlustur(se.ic).yontemler.length + G6_YONTEMLER.length);
    // Yeni yöntemler SONA eklendi: eski yöntemlerin indeksleri aynı (indeks kayması yok)
    se.ic.yontemler.forEach((y, i) => expect(sg.ic.yontemler[i]!.id).toBe(y.id));
    expect(Object.keys(mulkParam(eski)!)).not.toContain("sebeke");
    expect(Object.keys(mulkParam(guncel)!)).toContain("sebeke");
  });
});

describe("§5.5 / §13.3: `mulkKipi` süzgeci yalnız `ic.tesisTurleri` görünümünde; indeksler ve içerik TAM kalır", () => {
  it("bölge kipinde tür listeleri P4 öncesiyle aynı; `ic.yontemler` ve `ic.icerik` tam (yeni yöntemler içinde)", () => {
    const guncel = g6Veri(miniVeriyiYukle());
    const eski = p4Oncesi(guncel);
    const sg = Simulasyon.olustur(guncel, 1);
    const se = Simulasyon.olustur(eski, 1);
    expect(sg.ic.tesisTurleri.map((t) => [t.id, t.yontemler])).toEqual(se.ic.tesisTurleri.map((t) => [t.id, t.yontemler]));
    for (const id of G6_YONTEMLER) {
      expect(sg.ic.yontemIndeks[id]).toBeDefined(); // indeks tam içerikten
      expect(sg.ic.icerik.yontemler.some((y) => y.id === id)).toBe(true);
    }
    // süzülmüş görünümde hiçbir türün listesinde yeni yöntem yok
    for (const t of sg.ic.tesisTurleri) for (const id of G6_YONTEMLER) expect(t.yontemler).not.toContain(id);
  });

  it("bölge kipinde `yontem_degistir` yeni yöntemi reddeder ve dünya DEĞİŞMEZ", () => {
    const s = sim(g6Veri(miniVeriyiYukle()));
    const { bolge, tesis } = gidaFabrikasi(s);
    s.calistirKadar(2 * SAAT);
    const once = s.durumOzeti();
    for (const yontem of ["degirmen", "ekmek_firini", "kepek_gubresi", "sut_kepekli"]) {
      const r = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "yontem_degistir", bolge, tesis, yontem } });
      expect(r.tamam).toBe(false);
      if (!r.tamam) expect(r.hata).toMatch(/yontem bu tesis turunde yok|bilinmeyen yontem/);
    }
    expect(s.durumOzeti()).toBe(once);
  });

  it("KARŞIT KANIT (süzgeç gerçekten etkili): bayraksız yöntem bölge kipinde tür listesinde, `yontem_degistir` ile seçilebilir ve dünyayı DEĞİŞTİRİR; bayraklısı değil", () => {
    const bayraksiz = g6Veri(miniVeriyiYukle(), { bayrak: false });
    const sb = sim(bayraksiz);
    const turB = sb.ic.tesisTurleri.find((t) => t.id === "gida_fabrikasi")!;
    expect(turB.yontemler).toContain("degirmen"); // süzgeç YOK: yöntem listede
    const { bolge, tesis } = gidaFabrikasi(sb);
    sb.calistirKadar(2 * SAAT);
    const once = sb.durumOzeti();
    const r = sb.uygula({ t: sb.dunya.zaman, oyuncu: "a", komut: { tur: "yontem_degistir", bolge, tesis, yontem: "degirmen" } });
    expect(r).toEqual({ tamam: true });
    expect(sb.durumOzeti()).not.toBe(once); // bayrak yoksa dünya gerçekten değişir: kanıt duyarlıdır

    const bayrakli = sim(g6Veri(miniVeriyiYukle()));
    const turY = bayrakli.ic.tesisTurleri.find((t) => t.id === "gida_fabrikasi")!;
    expect(turY.yontemler).not.toContain("degirmen"); // süzgeç VAR
  });

  it("KARŞIT KANIT (botlar): bayraksız yöntem `yontemAdaylari`nda görünür, bayraklısı görünmez", () => {
    const adaylar = (veri: VeriPaketi): string[] => {
      const s = sim(veri);
      s.calistirKadar(GUN);
      return yontemAdaylari(new Bakis(s, "a"), true).map((a) => a.konu);
    };
    const bayraksiz = adaylar(g6Veri(miniVeriyiYukle(), { bayrak: false }));
    const bayrakli = adaylar(g6Veri(miniVeriyiYukle()));
    expect(bayraksiz.some((k) => (G6_YONTEMLER as readonly string[]).includes(k))).toBe(true);
    expect(bayrakli.some((k) => (G6_YONTEMLER as readonly string[]).includes(k))).toBe(false);
  });
});

describe("K-4 (bölge kipi, şebeke etkisizliği): `mulk.sebeke` bölge kipinde OKUNMAZ", () => {
  it("(b) santralsiz elektrik girdili tesis bölge kipinde verim 0 kalır (bugünkü davranış); `sebekeMili` ve `sebekeTuketim` hiç yazılmaz", () => {
    const guncel = g6Veri(miniVeriyiYukle());
    expect(mulkParam(guncel)!["sebeke"]).toBeDefined(); // blok veride VAR
    const kos = (veri: VeriPaketi) => {
      const s = sim(veri);
      const { bolge, tesis } = gidaFabrikasi(s);
      // m_ova'nın santrali kapatılır: tesis elektriksiz kalır
      const ova = s.dunya.bolgeler.find((b) => b.id === "m_ova")!;
      for (const t of ova.tesisler) {
        if (s.ic.tesisTurleri[t.tur]!.id === "santral") expect(s.uygula({ t: 0, oyuncu: "a", komut: { tur: "tesis_durum", bolge: "m_ova", tesis: t.id, aktif: false } }).tamam).toBe(true);
      }
      s.calistirKadar(2 * GUN);
      const b = s.dunya.bolgeler.find((x) => x.id === bolge)!;
      const t = b.tesisler.find((x) => x.id === tesis)!;
      return { s, b, t };
    };
    const g = kos(guncel);
    expect(g.t.verimPpm).toBe(0);
    expect(g.b.elektrik?.karsilanmaPpm).toBe(0);
    for (const b of g.s.dunya.bolgeler) {
      expect(sebekeMiliOku(b)).toBeUndefined();
      expect((b as { sebekeTuketim?: unknown }).sebekeTuketim).toBeUndefined();
    }
    // aynı koşu P4 öncesi içerikle: tam özet aynı
    const e = kos(p4Oncesi(guncel));
    expect(g.s.durumOzeti()).toBe(e.s.durumOzeti());
  });
});
