/**
 * Dünya kurulumu: derlenmiş içerik ve haritadan t = 0 başlangıç durumu.
 * Sonuç düz veridir (Map/Set/sınıf yok); structuredClone ile kopyalanabilir.
 * Olay kuyruğu boştur; ilk saatlik tık ve çözümü Simulasyon.olustur planlar.
 */
import { carpBol, kelepce } from "./sabit";
import { pazarTablosu } from "./pazar/tablo";
import { prngOlustur } from "./prng";
import { sanayiTablosu } from "./sanayi/tablo";
import { tarimTablosu } from "./tarim/tablo";
import { mulkDurumuKur } from "./mulk/durum";
import { PPM, SAAT } from "./tipler";
import type {
  BolgeDurumu,
  BolgeTarimDurumu,
  DerlenmisIcerik,
  Dunya,
  KapsamHucresi,
  KenarDurumu,
  PrngAkisi,
  Stok,
  TesisDurumu,
} from "./tipler";

export const PRNG_AKISLARI: readonly PrngAkisi[] = ["ekonomi", "pazar", "savas", "olay"];

/**
 * Bölgeye katman alanlarını yazar (yalnız açık katmanlar): tarım (B1; `tarimVar` ise toprak PPM, ekim %100 ilk ürün,
 * gübre 0), sanayi (B2; elektrik, kirlilik, keşif, bakım) ve pazar v1 (B3; kıtlık kademesi 0, `kitlikT = t`). Kapalı
 * katmanın alanı HİÇ yazılmaz. Harita bölgeleri (kurulum) ve mülk kipinin işletme düğümleri ortak kullanır.
 */
export function katmanAlanlariniYaz(ic: DerlenmisIcerik, bolge: BolgeDurumu, tarimVar: boolean, t: number): void {
  const tarimTb = tarimTablosu(ic);
  if (tarimTb !== null && tarimVar) {
    const tarim: BolgeTarimDurumu = {
      toprakPpm: PPM,
      ekimPpm: tarimTb.urun.map((_, i) => (i === 0 ? PPM : 0)),
      gubreDozu: 0,
      iklimPpm: PPM,
      olayKaybiPpm: 0,
      gubreKarsilanmaPpm: 0,
    };
    bolge.tarim = tarim;
  }
  if (sanayiTablosu(ic) !== null) {
    bolge.elektrik = { uretimMili: 0, talepMili: 0, karsilanmaPpm: PPM, haneKarsilanmaPpm: PPM, yukPpm: PPM };
    bolge.kirlilikPpm = 0;
    bolge.kesifSayisi = sifirlar(ic.mallar.length);
    bolge.bakimKarsilanmaPpm = PPM;
  }
  // Pazar v1 (B3): kıtlık kademesi (0), son değişim anı ve temel ihtiyaç karşılanması; kapalıyken HİÇ yazılmaz.
  if (pazarTablosu(ic) !== null) {
    bolge.kitlikKademesi = 0;
    bolge.kitlikT = t;
    bolge.temelKarsilanmaPpm = PPM;
  }
}

/** Başlangıç miktarlarından (mal indeksine göre) stok dizisi: kapasite = ekonomi.depoKapasitesi, t0 = t. */
export function stokDizisiKur(ic: DerlenmisIcerik, miktarlar: readonly number[], t: number): Stok[] {
  const kapasite = ic.param.ekonomi.depoKapasitesi;
  return miktarlar.map((m) => ({ miktar: kelepce(m, 0, kapasite), yerelOran: 0, gelenOran: 0, t0: t, artik: 0, kapasite, surum: 0 }));
}

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
 * - Sanayi (B2, yalnız param.sanayi tanımlıysa): bölgeye elektrik/kirlilik/keşif/bakım durumu, tesislere ölçek (S) ve
 *   aşınma (0) yazılır; kapalıysa bu alanlar HİÇ yazılmaz (özet Tarım v1 ile aynı).
 * - Pazar (B3, yalnız param.pazar B3 ek alanlarını taşıyorsa): `pazar.kaynak = "npc"` ve bölgelere `kitlikKademesi` (0), `kitlikT`,
 *   `temelKarsilanmaPpm`; kapalıysa bu alanlar HİÇ yazılmaz (özet Sanayi v1 ile aynı).
 * - Tarım (B1, yalnız param.iklim + param.tarim tanımlıysa): tarım alanı olan bölgelere `tarim` durumu (toprak PPM,
 *   ekim %100 ilk ürün, gübre 0) ve dünyaya `iklim` durumu yazılır. Kapalıysa bu alanlar HİÇ yazılmaz (özet v0.2 ile aynı).
 */
export function dunyaKur(ic: DerlenmisIcerik, tohum: number): Dunya {
  const param = ic.param;
  const malSayisi = ic.mallar.length;
  const birlikSayisi = ic.birlikler.length;
  let kimlik = 1;

  // Başlangıç stokları (mal kimliği -> miktar) indekse çevrilir; bilinmeyen mal hata.
  const baslangicStok = sifirlar(malSayisi);
  for (const malId of Object.keys(param.baslangic.stok).sort()) {
    const mi = ic.malIndeks[malId];
    if (mi === undefined) throw new Error(`dunyaKur: baslangic.stok bilinmeyen mal: ${malId}`);
    baslangicStok[mi] = param.baslangic.stok[malId] as number;
  }

  const tarimTb = tarimTablosu(ic);
  const sanayiTb = sanayiTablosu(ic);
  const pazarTb = pazarTablosu(ic);

  const bolgeler: BolgeDurumu[] = ic.harita.bolgeler.map((bt, indeks) => {
    const rezervIlk = sifirlar(malSayisi);
    for (const malId of Object.keys(bt.rezervler).sort()) {
      const mi = ic.malIndeks[malId];
      if (mi === undefined) throw new Error(`dunyaKur: bolge ${bt.id} rezervi bilinmeyen mal: ${malId}`);
      rezervIlk[mi] = bt.rezervler[malId] as number;
      // Sanayi (B2): çekirdek kurulumda ek damar ölçeği uygular (harita zaten ölçekliyse 1 000 000 = etkisiz).
      if (sanayiTb !== null && sanayiTb.p.damar.rezervOlcegiPpm !== PPM) {
        rezervIlk[mi] = carpBol(rezervIlk[mi] as number, sanayiTb.p.damar.rezervOlcegiPpm, PPM);
      }
    }
    const stoklar: Stok[] = stokDizisiKur(ic, baslangicStok, 0);
    const tesisler: TesisDurumu[] = bt.tesisler.map((turId) => {
      const tur = ic.tesisTuruIndeks[turId];
      if (tur === undefined) throw new Error(`dunyaKur: bolge ${bt.id} bilinmeyen tesis turu: ${turId}`);
      const ilkYontem = (ic.tesisTurleri[tur] as { yontemler: string[] }).yontemler[0];
      const yontem = ilkYontem === undefined ? undefined : ic.yontemIndeks[ilkYontem];
      if (yontem === undefined) throw new Error(`dunyaKur: tesis turu ${turId} gecerli yonteme sahip degil`);
      const tesis: TesisDurumu = { id: kimlik++, tur, yontem, aktif: true, verimPpm: 0, isciPpm: 0 };
      if (sanayiTb !== null) {
        tesis.olcek = 0;
        tesis.asinmaPpm = 0;
      }
      return tesis;
    });
    const bolge: BolgeDurumu = {
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
    katmanAlanlariniYaz(ic, bolge, bt.tarim !== undefined, 0);
    return bolge;
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

  const dunya: Dunya = {
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
  // Pazar v1 (B3): fiyatı belirleyen "npc" (Dünya Piyasa Yapıcısı) açıkça işaretlenir; kapalıyken alan yazılmaz.
  if (pazarTb !== null) dunya.pazar.kaynak = "npc";
  // İklim durumu yalnız tarım açıkken yazılır. İlk günlük tık (t = 0) Simulasyon.olustur tarafından planlanır.
  if (tarimTb !== null) dunya.iklim = { olaylar: [], sonGun: tarimTb.iklim.baslangicGunu - 1 };
  // Mülk kipi (S3): fikstürün tüm ilçeleri (kimliğe göre sıralı), boş hücre/işletme/oyuncu listeleri; kapalıyken alan yazılmaz.
  if (ic.mulk !== undefined) dunya.mulk = mulkDurumuKur(ic.mulk);
  return dunya;
}
