/**
 * Dünya kurulumu: derlenmiş içerik ve haritadan t = 0 başlangıç durumu.
 * Sonuç düz veridir (Map/Set/sınıf yok); structuredClone ile kopyalanabilir.
 * Olay kuyruğu boştur; ilk saatlik tık ve çözümü Simulasyon.olustur planlar.
 */
import { kelepce } from "./sabit";
import { prngOlustur } from "./prng";
import { SAAT } from "./tipler";
import type {
  BolgeDurumu,
  DerlenmisIcerik,
  Dunya,
  KapsamHucresi,
  KenarDurumu,
  PrngAkisi,
  Stok,
  TesisDurumu,
} from "./tipler";

const PRNG_AKISLARI: readonly PrngAkisi[] = ["ekonomi", "pazar", "savas", "olay"];

function sifirlar(n: number): number[] {
  return new Array<number>(n).fill(0);
}

/**
 * Haritadan başlangıç dünyasını kurar.
 * - Bölge stokları: parametreler.baslangic.stok, kapasite = ekonomi.depoKapasitesi, t0 = 0.
 * - Başlangıç tesisleri: tesis türünün ilk yöntemi, aktif, verimPpm = isciPpm = 0; kimlikler d.sayac.kimlik'ten
 *   (bölge sırasıyla, 1'den başlar).
 * - gidaKarsilanmaPpm ve ikmalKarsilanmaPpm başlangıçta PPM (ilk çözüme kadar sıfır kıtlık varsayılır).
 * - lojistik.sonCozum = 0, cozumSayisi = 0; kapsam hücreleri { 0, -1, "yok" }.
 * - rng: "ekonomi" | "pazar" | "savas" | "olay" akışları (tohum, akış adı)ndan türetilir.
 */
export function dunyaKur(ic: DerlenmisIcerik, tohum: number): Dunya {
  const param = ic.param;
  const malSayisi = ic.mallar.length;
  const birlikSayisi = ic.birlikler.length;
  const kapasite = param.ekonomi.depoKapasitesi;
  let kimlik = 1;

  // Başlangıç stokları (mal kimliği -> miktar) indekse çevrilir; bilinmeyen mal hata.
  const baslangicStok = sifirlar(malSayisi);
  for (const malId of Object.keys(param.baslangic.stok).sort()) {
    const mi = ic.malIndeks[malId];
    if (mi === undefined) throw new Error(`dunyaKur: baslangic.stok bilinmeyen mal: ${malId}`);
    baslangicStok[mi] = param.baslangic.stok[malId] as number;
  }

  const bolgeler: BolgeDurumu[] = ic.harita.bolgeler.map((bt, indeks) => {
    const rezervIlk = sifirlar(malSayisi);
    for (const malId of Object.keys(bt.rezervler).sort()) {
      const mi = ic.malIndeks[malId];
      if (mi === undefined) throw new Error(`dunyaKur: bolge ${bt.id} rezervi bilinmeyen mal: ${malId}`);
      rezervIlk[mi] = bt.rezervler[malId] as number;
    }
    const stoklar: Stok[] = baslangicStok.map((m) => ({
      miktar: kelepce(m, 0, kapasite),
      yerelOran: 0,
      gelenOran: 0,
      t0: 0,
      artik: 0,
      kapasite,
      surum: 0,
    }));
    const tesisler: TesisDurumu[] = bt.tesisler.map((turId) => {
      const tur = ic.tesisTuruIndeks[turId];
      if (tur === undefined) throw new Error(`dunyaKur: bolge ${bt.id} bilinmeyen tesis turu: ${turId}`);
      const ilkYontem = (ic.tesisTurleri[tur] as { yontemler: string[] }).yontemler[0];
      const yontem = ilkYontem === undefined ? undefined : ic.yontemIndeks[ilkYontem];
      if (yontem === undefined) throw new Error(`dunyaKur: tesis turu ${turId} gecerli yonteme sahip degil`);
      return { id: kimlik++, tur, yontem, aktif: true, verimPpm: 0, isciPpm: 0 };
    });
    return {
      indeks,
      id: bt.id,
      devlet: bt.devlet,
      etiketler: [...bt.etiketler],
      sahip: null,
      nufus: bt.nufus,
      stoklar,
      israf: sifirlar(malSayisi),
      uretimToplam: sifirlar(malSayisi),
      uretimOrani: sifirlar(malSayisi),
      uretimT0: 0,
      rezervIlk,
      rezervKalan: [...rezervIlk],
      tesisler,
      ticaretEmirleri: [],
      birlikler: sifirlar(birlikSayisi),
      savunma: { durus: "normal" },
      gidaKarsilanmaPpm: 1_000_000,
      ikmalKarsilanmaPpm: 1_000_000,
    };
  });

  const kenarlar: KenarDurumu[] = ic.harita.kenarlar.map((kt, indeks) => {
    const a = ic.bolgeIndeks[kt.a];
    const b = ic.bolgeIndeks[kt.b];
    if (a === undefined || b === undefined) throw new Error(`dunyaKur: kenar ${indeks} bilinmeyen bolgeye bagli`);
    return {
      indeks,
      a,
      b,
      tur: kt.tur,
      kapasiteSaat: kt.kapasiteSaat,
      sureMs: kt.sureSaat * SAAT,
      kullanilanSaat: 0,
      askeriKullanilanSaat: 0,
    };
  });

  const kapsam: KapsamHucresi[][] = bolgeler.map(() =>
    ic.mallar.map((): KapsamHucresi => ({ karsilanmaPpm: 0, enYakinKaynakMs: -1, neden: "yok" })),
  );

  const rng = {} as Dunya["rng"];
  for (const akis of PRNG_AKISLARI) rng[akis] = prngOlustur(tohum, akis);

  return {
    zaman: 0,
    tohum,
    bolgeler,
    kenarlar,
    oyuncular: [],
    pazar: {
      fiyat: ic.mallar.map((m) => m.tabanFiyat),
      oyuncuTalebi: sifirlar(malSayisi),
      oyuncuArzi: sifirlar(malSayisi),
    },
    savaslar: [],
    anlasmalar: [],
    yaptirimlar: [],
    insaatlar: [],
    partiler: [],
    lojistik: { akislar: [], kirli: false, cozumPlanli: false, sonCozum: 0, cozumSayisi: 0, kapsam },
    rng,
    sayac: { olay: 0, kimlik },
    kuyruk: [],
  };
}
