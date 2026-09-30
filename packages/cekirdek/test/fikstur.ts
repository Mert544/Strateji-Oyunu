/**
 * Test fikstürü: küçük, satır içi VeriPaketi (4 bölge, 3 mal, 2 tesis türü).
 * packages/veri'nin yüklenmesine bağlı değildir.
 */
import type { VeriPaketi } from "@bolge/veri";

/** Her çağrıda yeni (bağımsız) bir paket döndürür; testler değiştirebilir. */
export function kucukVeri(): VeriPaketi {
  return {
    harita: {
      surum: 1,
      ad: "fikstur",
      devletler: [
        { id: "d1", ad: "Devlet 1", blok: "b1" },
        { id: "d2", ad: "Devlet 2", blok: "b2" },
      ],
      bolgeler: [
        { id: "ova", ad: "Ova", devlet: "d1", etiketler: ["ova"], nufus: 10000, rezervler: { tahil: 500_000_000 }, tesisler: ["ciftlik"], x: 100, y: 100 },
        { id: "sehir", ad: "Sehir", devlet: "d1", etiketler: ["liman"], nufus: 50000, rezervler: {}, tesisler: ["fabrika"], x: 300, y: 100 },
        { id: "dag", ad: "Dag", devlet: "d2", etiketler: ["dag"], nufus: 5000, rezervler: {}, tesisler: [], x: 500, y: 300 },
        { id: "gecit", ad: "Gecit", devlet: "d2", etiketler: ["dar_gecit"], nufus: 1000, rezervler: {}, tesisler: [], x: 700, y: 500 },
      ],
      kenarlar: [
        { a: "ova", b: "sehir", tur: "kara", kapasiteSaat: 100_000, sureSaat: 2 },
        { a: "sehir", b: "dag", tur: "kara", kapasiteSaat: 50_000, sureSaat: 4 },
        { a: "dag", b: "gecit", tur: "kara", kapasiteSaat: 20_000, sureSaat: 6 },
        { a: "ova", b: "dag", tur: "kara", kapasiteSaat: 10_000, sureSaat: 10 },
      ],
    },
    icerik: {
      surum: 1,
      mallar: [
        // Lojistik önceliği bilerek indeks sırasının tersi / eşitlik içeriyor
        { id: "tahil", ad: "Tahil", kategori: "ham", tabanFiyat: 1000, lojistikOnceligi: 2, bozulmaPpmGun: 10_000 },
        { id: "gida", ad: "Gida", kategori: "tuketim", tabanFiyat: 2000, lojistikOnceligi: 1, bozulmaPpmGun: 20_000 },
        { id: "celik", ad: "Celik", kategori: "ara", tabanFiyat: 5000, lojistikOnceligi: 2, bozulmaPpmGun: 0 },
      ],
      yontemler: [
        { id: "temel_tarim", ad: "Temel tarim", girdiler: {}, ciktilar: { tahil: 10_000 }, isci: 100, bakim: {}, rezerv: "tahil" },
        { id: "gida_isleme", ad: "Gida isleme", girdiler: { tahil: 10_000 }, ciktilar: { gida: 8_000 }, isci: 50, bakim: {} },
        { id: "gelismis_isleme", ad: "Gelismis isleme", girdiler: { tahil: 10_000 }, ciktilar: { gida: 12_000 }, isci: 80, bakim: {}, gerekliTeknoloji: "teknik" },
      ],
      tesisTurleri: [
        { id: "ciftlik", ad: "Ciftlik", insaMaliyeti: { celik: 1000 }, insaParasi: 10_000, insaSuresiSaat: 24, yontemler: ["temel_tarim"], gerekliEtiket: "ova", gerekliRezerv: "tahil" },
        { id: "fabrika", ad: "Fabrika", insaMaliyeti: { celik: 2000 }, insaParasi: 20_000, insaSuresiSaat: 48, yontemler: ["gida_isleme", "gelismis_isleme"] },
      ],
      teknolojiler: [
        { id: "teknik", ad: "Teknik", aciklama: "Gelismis isleme", maliyet: 100_000, sureGun: 2, onKosullar: [], acar: { yontemler: ["gelismis_isleme"] } },
      ],
      birlikler: [
        { id: "piyade", ad: "Piyade", maliyet: { celik: 100 }, partiSuresiSaat: 12, guc: 10, ikmal: { gida: 10 } },
        { id: "zirhli", ad: "Zirhli", maliyet: { celik: 500 }, partiSuresiSaat: 24, guc: 60, ikmal: { gida: 20 } },
      ],
    },
    param: {
      surum: 1,
      dunyaHizi: 1,
      baslangic: {
        stok: { tahil: 1_000_000, gida: 2_000_000, celik: 0 },
        hazine: 5_000_000,
        birlikler: { piyade: 3, zirhli: 1 },
      },
      nufus: {
        isgucuPpm: 400_000,
        tuketim1000Saat: { gida: 1_000 },
        buyumePpmGun: 10_000,
        kuculmePpmGun: 10_000,
      },
      ekonomi: {
        depoKapasitesi: 100_000_000,
        vergiTabani1000Saat: 5_000,
        varsayilanVergiPpm: 200_000,
        vergiBuyumeEsigiPpm: 400_000,
      },
      pazar: {
        fiyatEsnekligiPpm: 750_000,
        emilimSaat: { tahil: 100_000, gida: 100_000, celik: 100_000 },
        arzSaat: { tahil: 100_000, gida: 100_000, celik: 100_000 },
        ithalatCarpaniPpm: 1_200_000,
        ihracatCarpaniPpm: 800_000,
        yaptirimIthalatCarpaniPpm: 1_500_000,
        yaptirimIhracatCarpaniPpm: 500_000,
        anlasmaIthalatCarpaniPpm: 1_000_000,
        anlasmaIhracatCarpaniPpm: 1_000_000,
      },
      lojistik: {
        enAzCozumAraligiDakika: 10,
        tamponSaat: 24,
        gelistirmeArtisPpm: 250_000,
        gelistirmeMaliyeti: { celik: 1000 },
        gelistirmeParasi: 50_000,
        gelistirmeSuresiSaat: 24,
      },
      askeri: {
        ilanHazirlikSaatMin: 6,
        ilanHazirlikSaatMax: 12,
        pencereSaat: 6,
        kayipTavaniPpm: 250_000,
        yagmaOraniPpm: 100_000,
        yeniOyuncuKorumasiGun: 3,
        araziSavunmaPpm: { kiyi: 1_000_000, dag: 1_500_000, ova: 1_000_000, liman: 1_100_000, dar_gecit: 1_800_000 },
        savunmaDurusuCarpaniPpm: 1_300_000,
      },
    },
  };
}
