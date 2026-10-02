/**
 * WsBaglanti ← yeni isteğe bağlı kare alanları (K2: `oyuncu.insaatYontem`, `ozel.tesisAsinma`, `IlgiKaresi/KareDeltasi.adlar`) — sahte WebSocket ve sahte kareyle:
 *   - inşaatta seçilen yöntem `isletme().yapilar[].yontem` ve `sahiplikAl().yapilar[].yontem`'e (inşaat kimliğiyle eşlenerek) taşınır;
 *   - tesis aşınması tesis kaydına `asinmaPpm` (ve ölçek büyütme inşaatında büyüyen tesisin aşınması) olarak taşınır; aşınmasız tesiste alan YOK;
 *   - görünen adlar bağlantıda BİRİKİMLİ önbellektir: `ad(oyuncu)`, `oyuncuAdi` (yoksa kimlik); delta, kopan zincir ve tam kare sonrası kaybolmaz;
 *   - alanlar yokken davranış BİREBİR aynıdır (kayıtlarda yeni anahtar yok, oyuncuAdi kimliği döner).
 */
import { afterEach, describe, expect, it } from "vitest";
import { WsBaglanti, insaatYontemi, tesisAsinmasi } from "../src/harita/baglanti-ws";
import { miniVeriyiYukle } from "@bolge/veri";
import type { IlgiKaresi } from "@bolge/protokol";
import { icerikTablosu } from "../src/komut/tablo";
import { BakimPaneli } from "../src/harita/bakim-panel";

type Dinleyici = (e: { data?: string; code?: number }) => void;

class SahteWs {
  static ornekler: SahteWs[] = [];
  readyState = 0;
  readonly gonderilen: Array<Record<string, unknown>> = [];
  private dinleyiciler = new Map<string, Dinleyici[]>();
  constructor(readonly url: string) {
    SahteWs.ornekler.push(this);
  }
  addEventListener(tur: string, f: Dinleyici): void {
    const l = this.dinleyiciler.get(tur) ?? [];
    l.push(f);
    this.dinleyiciler.set(tur, l);
  }
  send(m: string): void {
    this.gonderilen.push(JSON.parse(m) as Record<string, unknown>);
  }
  close(): void {
    this.readyState = 3;
  }
  ac(): void {
    this.readyState = 1;
    for (const f of this.dinleyiciler.get("open") ?? []) f({});
  }
  mesaj(m: Record<string, unknown>): void {
    for (const f of this.dinleyiciler.get("message") ?? []) f({ data: JSON.stringify(m) });
  }
}

const DIZIN = { bolgeler: [], mallar: [], tesisTurleri: ["ciftlik", "gida_fabrikasi"], yontemler: [], birlikler: [], teknolojiler: [] };
const hos = (): Record<string, unknown> => ({ tur: "hosgeldin", protokolSurumu: 1, kuralSurumu: "k", oyuncu: "ali", yonetici: false, simZamani: 0, seq: 0, hiz: 1, dizin: DIZIN });

/** Tesis demeti: [id, tür, ?, aktif, verim, ?]. */
const tesis = (id: number, tur: number): number[] => [id, tur, 0, 1, 900_000, 0];

interface KareEk {
  insaatYontem?: Array<[number, string]>;
  tesisAsinma?: Array<[number, number]>;
  adlar?: Record<string, string>;
}

function kare(ek: KareEk = {}, rev = 1): Record<string, unknown> {
  return {
    tur: "kare",
    rev,
    seq: 0,
    ilgi: [],
    ilceIlgisi: [],
    kare: {
      t: 0,
      bolgeler: [
        {
          i: 1,
          id: "il1#ali",
          genel: { sahip: "ali", nufus: 0, tesisler: [], durus: 0 },
          ozel: { stoklar: [], uretimOrani: [], tesisler: [tesis(3, 1), tesis(4, 0)], ...(ek.tesisAsinma ? { tesisAsinma: ek.tesisAsinma } : {}), emirler: [], birlikler: [], gidaPpm: 0, ikmalPpm: 0, rezervKalan: [] },
        },
      ],
      fiyat: [],
      ilceler: [
        {
          id: "i1",
          il: "il1",
          seviye: 0,
          uygunHucre: 100,
          satilmisHucre: 3,
          hucreler: [
            ["5:5", "ali", "kirsal", -1, 7],
            ["6:6", "ali", "kirsal", 3, -1],
            ["7:7", "ali", "kirsal", 4, -1],
          ],
        },
      ],
      oyuncu: {
        id: "ali",
        hazine: [50_000_000, 0, 0, 0, 1e15],
        vergiPpm: 0,
        askeriRezervPpm: 0,
        teknolojiler: [],
        arastirma: null,
        korumaBitis: 0,
        // 7: gida_fabrikasi (tür indeksi 1) inşaatı; 8: ölçek büyütme (hedef = tesis 3)
        insaatlar: [
          [7, "tesis", 1, 1, 9_000_000, 0],
          [8, "olcek", 1, 3, 9_000_000, 0],
        ],
        ...(ek.insaatYontem ? { insaatYontem: ek.insaatYontem } : {}),
        mulk: { araziDegeriMili: 0, araziVergisi: [0, 0, 0, 0, 1e15], ilceHucre: [], sonEtkinlik: 0 },
      },
      ...(ek.adlar ? { adlar: ek.adlar } : {}),
    },
  };
}

async function bagla(ek: KareEk = {}): Promise<{ b: WsBaglanti; ws: SahteWs }> {
  const p = WsBaglanti.ac({ url: "ws://sahte", token: "t", istemciKimligi: "t-ali", WebSocketCtor: SahteWs as unknown as typeof WebSocket, komutZamanAsimiMs: 60_000 });
  const ws = SahteWs.ornekler.at(-1)!;
  ws.ac();
  ws.mesaj(hos());
  const b = await p;
  ws.mesaj(kare(ek));
  await b.hazirBekle();
  b.ilgi("test", ["i1"]);
  return { b, ws };
}

afterEach(() => {
  SahteWs.ornekler = [];
});

it("M1 bakım onayı: bilinmeyen ve 0 ayrılır; seçim/Vazgeç komutsuz, frozen/stale/pending korunur, bridge gerçek ack/ret bekler", async () => {
  const { b, ws } = await bagla();
  try {
    const v = miniVeriyiYukle();
    const p = new BakimPaneli({ ic: icerikTablosu(v.icerik, v.param), isletme: () => b.isletme(), komut: (i) => b.bakimDuzeyiDegistir(i), degisti: () => {} });
    let rev = 1;
    const guncelle = (duzey: 0 | 1 | 2) => {
      const m = kare({}, ++rev), k = m["kare"] as unknown as IlgiKaresi;
      k.oyuncu!.bakimDuzeyi = duzey;
      k.bolgeler[0]!.ozel!.tesisler[0]![3] = 0;
      ws.mesaj(m);
    };
    const komutlar = () => ws.gonderilen.filter((k) => k["tur"] === "komut");
    const teklif = { oncekiDuzey: 0 as const, duzey: 2 as 0 | 1 | 2 };
    expect(b.isletme()).not.toHaveProperty("bakimDuzeyi");
    await p.eylem({ eylem: "sec", onay: teklif });
    expect(p.durum.onay).toBeNull();
    guncelle(0);
    expect(b.isletme()!.bakimDuzeyi).toBe(0);
    await p.eylem({ eylem: "sec", onay: teklif });
    teklif.duzey = 1;
    expect(p.durum.onay).toEqual({ oncekiDuzey: 0, duzey: 2 });
    await p.eylem({ eylem: "vazgec" });
    expect(p.durum.onay).toBeNull();
    expect(komutlar()).toEqual([]);
    const onay = { oncekiDuzey: 0 as const, duzey: 2 as const };
    await p.eylem({ eylem: "sec", onay });
    guncelle(1);
    await p.eylem({ eylem: "onayla", onay });
    expect(komutlar()).toEqual([]);
    expect(p.durum.hata).toContain("değişmiş");
    p.kapat(); guncelle(0);
    await p.eylem({ eylem: "sec", onay });
    await p.eylem({ eylem: "onayla", onay: { oncekiDuzey: 0, duzey: 1 } });
    expect(komutlar()).toEqual([]);
    const bekleyen = p.eylem({ eylem: "onayla", onay });
    expect(p.durum.bekliyor).toBe(true);
    await p.eylem({ eylem: "onayla", onay });
    p.kapat();
    expect(p.durum.onay).toEqual(onay);
    expect(komutlar()).toHaveLength(1);
    const k = komutlar()[0]!;
    expect(k["komut"]).toEqual({ tur: "bakim_duzeyi", duzey: 2, oncekiDuzey: 0 });
    ws.mesaj({ tur: "komutSonucu", anahtar: k["anahtar"], seq: 1, t: 1, komut: k["komut"], sonuc: { tamam: true }, tekrar: false });
    await bekleyen;
    expect(p.durum).toMatchObject({ onay: null, bekliyor: false });
    expect(b.isletme()!.bakimDuzeyi).toBe(0); // Ack kaynak karesini optimistik değiştirmez.
    guncelle(1); p.html(); // Başka oturumun güncel tercihi ack hedefinden farklı olabilir.
    await p.eylem({ eylem: "sec", onay: { oncekiDuzey: 1, duzey: 0 } });
    expect(p.durum.onay).toEqual({ oncekiDuzey: 1, duzey: 0 });
    expect(komutlar()).toHaveLength(1);
    p.kapat(); guncelle(2);
    const sahiplik = await b.sahiplikAl("i1");
    expect(sahiplik!.yapilar!.find((y) => y.anahtar === "t3")!.aktif).toBe(false);
    expect(sahiplik!.yapilar!.find((y) => y.anahtar === "i7")).not.toHaveProperty("aktif");
    const sifir = { oncekiDuzey: 2 as const, duzey: 0 as const };
    await p.eylem({ eylem: "sec", onay: sifir });
    const ret = p.eylem({ eylem: "onayla", onay: sifir }), son = komutlar().at(-1)!;
    expect(son["komut"]).toEqual({ tur: "bakim_duzeyi", duzey: 0, oncekiDuzey: 2 });
    ws.mesaj({ tur: "komutSonucu", anahtar: son["anahtar"], seq: 2, t: 2, komut: son["komut"], sonuc: { tamam: false, hata: "bakim duzeyi degisti" }, tekrar: false });
    await ret;
    expect(p.durum.hata).toContain("değişmiş");
    expect(b.isletme()!.bakimDuzeyi).toBe(2);
    expect(b.sunucuHatalari).toEqual([]);
  } finally { b.kapat(); }
});

describe("insaatYontem -> yapı kaydı (inşaat kimliğiyle eşlenir)", () => {
  it("işletme özeti ve sahiplik: yöntemli inşaatın `yontem`'i; yöntemsiz inşaatta alan YOK", async () => {
    const { b } = await bagla({ insaatYontem: [[7, "degirmen"]] });
    const yapilar = b.isletme()!.yapilar;
    const i7 = yapilar.find((y) => y.anahtar === "i7")!;
    expect(i7.durum).toBe("insaat");
    expect(i7.yontem).toBe("degirmen");
    // ölçek büyütme inşaatı (8) listede yok: yöntem taşımaz
    expect("yontem" in yapilar.find((y) => y.anahtar === "i8")!).toBe(false);
    const s = await b.sahiplikAl("i1");
    const y7 = s!.yapilar!.find((y) => y.anahtar === "i7")!;
    expect(y7.yontem).toBe("degirmen");
    b.kapat();
  });

  it("yardımcı: kimlik eşlemesi (başka inşaat kimliği eşleşmez); alan yoksa tanımsız", () => {
    expect(insaatYontemi({ insaatYontem: [[7, "degirmen"], [9, "ekmek_firini"]] }, 9)).toBe("ekmek_firini");
    expect(insaatYontemi({ insaatYontem: [[7, "degirmen"]] }, 8)).toBeUndefined();
    expect(insaatYontemi({}, 7)).toBeUndefined();
  });
});

describe("tesisAsinma -> tesis kaydı", () => {
  it("aşınması > 0 olan tesiste `asinmaPpm`; aşınmasız tesiste alan YOK; ölçek büyütme inşaatında büyüyen tesisin aşınması; sahiplikte de", async () => {
    const { b } = await bagla({ tesisAsinma: [[3, 250_000]] });
    const yapilar = b.isletme()!.yapilar;
    const t3 = yapilar.find((y) => y.anahtar === "t3")!;
    const t4 = yapilar.find((y) => y.anahtar === "t4")!;
    expect(t3.asinmaPpm).toBe(250_000);
    expect("asinmaPpm" in t4).toBe(false);
    expect(yapilar.find((y) => y.anahtar === "i8")!.asinmaPpm).toBe(250_000);
    const s = await b.sahiplikAl("i1");
    expect(s!.yapilar!.find((y) => y.anahtar === "t3")!.asinmaPpm).toBe(250_000);
    expect("asinmaPpm" in s!.yapilar!.find((y) => y.anahtar === "t4")!).toBe(false);
    b.kapat();
  });

  it("yardımcı: tavan (1 000 000) taşınır; 0 ve eksik tanımsız", () => {
    expect(tesisAsinmasi({ tesisAsinma: [[3, 1_000_000]] }, 3)).toBe(1_000_000);
    expect(tesisAsinmasi({ tesisAsinma: [[3, 0]] }, 3)).toBeUndefined();
    expect(tesisAsinmasi({ tesisAsinma: [[3, 5]] }, 4)).toBeUndefined();
    expect(tesisAsinmasi({}, 3)).toBeUndefined();
  });
});

describe("kare.adlar -> birikimli ad önbelleği", () => {
  it("tam kare adları, delta yeni/değişen adları ekler; eski adlar kalır; bilinmeyen oyuncu için ad() tanımsız ve oyuncuAdi kimlik", async () => {
    const { b, ws } = await bagla({ adlar: { ali: "ali firini", veli: "veli" } });
    expect(b.ad("ali")).toBe("ali firini");
    expect(b.oyuncuAdi("veli")).toBe("veli");
    expect(b.ad("zeynep")).toBeUndefined();
    expect(b.oyuncuAdi("zeynep")).toBe("zeynep");
    // delta: yeni ad + değişen ad; öncekiler kalır
    ws.mesaj({ tur: "delta", onceki: 1, rev: 2, seq: 1, delta: { t: 1, bolgeler: [], cikan: [], adlar: { zeynep: "zeynep unlu", veli: "veli market" } } });
    expect(b.ad("zeynep")).toBe("zeynep unlu");
    expect(b.ad("veli")).toBe("veli market");
    expect(b.ad("ali")).toBe("ali firini");
    expect(b.oyuncuAdi("zeynep")).toBe("zeynep unlu");
    // adlı delta olmayan delta: önbellek aynı
    ws.mesaj({ tur: "delta", onceki: 2, rev: 3, seq: 2, delta: { t: 2, bolgeler: [], cikan: [] } });
    expect(b.ad("ali")).toBe("ali firini");
    expect(b.ad("zeynep")).toBe("zeynep unlu");
    b.kapat();
  });

  it("zincir koparsa (kare silinir) önbellek KALIR; yeniden gelen tam kare birleşir (yeni ad eklenir, eskisi silinmez, değişen güncellenir)", async () => {
    const { b, ws } = await bagla({ adlar: { ali: "ali firini" } });
    ws.mesaj({ tur: "delta", onceki: 99, rev: 5, seq: 1, delta: { t: 1, bolgeler: [], cikan: [], adlar: { gizli: "yok sayilir" } } }); // zincir kopuk: delta uygulanmaz
    expect(b.ad("ali")).toBe("ali firini");
    expect(b.ad("gizli")).toBeUndefined();
    ws.mesaj(kare({ adlar: { veli: "veli", ali: "ali yeni" } }, 6));
    expect(b.ad("ali")).toBe("ali yeni");
    expect(b.ad("veli")).toBe("veli");
    b.kapat();
  });
});

describe("alanlar yokken davranış birebir aynı", () => {
  it("yapı kayıtlarında yeni anahtar yok (yontem, asinmaPpm); oyuncuAdi kimliği döner; ad() tanımsız", async () => {
    const { b } = await bagla();
    for (const y of b.isletme()!.yapilar) {
      expect("yontem" in y, y.anahtar).toBe(false);
      expect("asinmaPpm" in y, y.anahtar).toBe(false);
    }
    const s = await b.sahiplikAl("i1");
    for (const y of s!.yapilar!) {
      expect("yontem" in y, y.anahtar).toBe(false);
      expect("asinmaPpm" in y, y.anahtar).toBe(false);
    }
    expect(b.oyuncuAdi("ali")).toBe("ali");
    expect(b.ad("ali")).toBeUndefined();
    b.kapat();
  });
});
