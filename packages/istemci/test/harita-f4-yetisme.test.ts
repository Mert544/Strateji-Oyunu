/**
 * WsBaglanti ve sunucu yetişmesi (protokol: `hosgeldin.yetisiyor/hedefZamani`, `durum`, `hata yetisiyor`): komutlar günlüğe girmeden
 * reddedilir; bağdaştırıcı bekletir ve yetişme bitince AYNI anahtarla yeniden gönderir; ilerleme `ozet().yetisiyor`'da.
 * Sunucu yerine sahte WebSocket: mesaj sırası ve zamanı sınama tarafından sürülür.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { WsBaglanti } from "../src/harita/baglanti-ws";

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

  tur(t: string): Array<Record<string, unknown>> {
    return this.gonderilen.filter((m) => m["tur"] === t);
  }
}

const DIZIN = { bolgeler: [], mallar: [], tesisTurleri: ["ciftlik"], yontemler: [], birlikler: [], teknolojiler: [] };
const hos = (ek: Record<string, unknown> = {}): Record<string, unknown> => ({ tur: "hosgeldin", protokolSurumu: 1, kuralSurumu: "k", oyuncu: "ali", yonetici: false, simZamani: 0, seq: 0, hiz: 1, dizin: DIZIN, ...ek });
const kare = (): Record<string, unknown> => ({
  tur: "kare",
  rev: 1,
  seq: 0,
  ilgi: [],
  ilceIlgisi: [],
  kare: {
    t: 0,
    bolgeler: [],
    fiyat: [],
    ilceler: [{ id: "i1", il: "il1", seviye: 0, uygunHucre: 100, satilmisHucre: 0, hucreler: [] }],
    oyuncu: { id: "ali", hazine: [50_000_000, 0, 0, 0, 1e15], vergiPpm: 0, askeriRezervPpm: 0, teknolojiler: [], arastirma: null, korumaBitis: 0, insaatlar: [], mulk: { araziDegeriMili: 0, araziVergisi: [0, 0, 0, 0, 1e15], ilceHucre: [], sonEtkinlik: 0 } },
  },
});

async function bagla(hosEk: Record<string, unknown> = {}): Promise<{ b: WsBaglanti; ws: SahteWs }> {
  const p = WsBaglanti.ac({ url: "ws://sahte", token: "t", istemciKimligi: "t-ali", WebSocketCtor: SahteWs as unknown as typeof WebSocket, komutZamanAsimiMs: 60_000 });
  const ws = SahteWs.ornekler.at(-1)!;
  ws.ac();
  expect(ws.tur("merhaba")).toHaveLength(1);
  ws.mesaj(hos(hosEk));
  const b = await p;
  ws.mesaj(kare());
  await b.hazirBekle();
  return { b, ws };
}

afterEach(() => {
  vi.useRealTimers();
  SahteWs.ornekler = [];
});

describe("yetişme", () => {
  it("hosgeldin.yetisiyor ve durum mesajları ilerlemeyi verir; bitince null", async () => {
    const { b, ws } = await bagla({ yetisiyor: true, hedefZamani: 1000, simZamani: 0 });
    expect(b.ozet()!.yetisiyor).toEqual({ ilerleme: 0 });
    ws.mesaj({ tur: "durum", yetisiyor: true, simZamani: 250, hedefZamani: 1000 });
    expect(b.ozet()!.yetisiyor).toEqual({ ilerleme: 0.25 });
    ws.mesaj({ tur: "durum", yetisiyor: true, simZamani: 5000, hedefZamani: 1000 });
    expect(b.ozet()!.yetisiyor).toEqual({ ilerleme: 1 });
    let degisim = 0;
    b.dinle(() => degisim++);
    ws.mesaj({ tur: "durum", yetisiyor: false, simZamani: 1000, hedefZamani: 1000 });
    await Promise.resolve();
    expect(b.ozet()!.yetisiyor).toBeNull();
    expect(degisim).toBe(1);
    expect(b.simZamani()).toBeGreaterThanOrEqual(1000);
    b.kapat();
  });

  it("yetisiyor hatası: komut bekler (reddedilmez), durum bitişinde AYNI anahtarla yeniden gider ve tamamlanır", async () => {
    const { b, ws } = await bagla();
    const sonuc = b.parselAl({ tur: "parsel_al", ilce: "i1", hucreler: ["1:1"], sinif: "kirsal" });
    const k1 = ws.tur("komut");
    expect(k1).toHaveLength(1);
    const anahtar = k1[0]!["anahtar"] as string;
    ws.mesaj({ tur: "hata", kod: "yetisiyor", mesaj: "yetisiyor", anahtar });
    ws.mesaj({ tur: "durum", yetisiyor: true, simZamani: 100, hedefZamani: 400 });
    let bitti = false;
    void sonuc.then(() => (bitti = true));
    await Promise.resolve();
    expect(bitti).toBe(false);
    expect(ws.tur("komut")).toHaveLength(1); // yetişirken yeniden gönderilmedi
    expect(b.ozet()!.yetisiyor).toEqual({ ilerleme: 0 }); // ilk durum: başlangıç = 100
    ws.mesaj({ tur: "durum", yetisiyor: true, simZamani: 200, hedefZamani: 400 });
    expect(b.ozet()!.yetisiyor).toEqual({ ilerleme: 1 / 3 });
    ws.mesaj({ tur: "durum", yetisiyor: false, simZamani: 400, hedefZamani: 400 });
    const k2 = ws.tur("komut");
    expect(k2).toHaveLength(2);
    expect(k2[1]!["anahtar"]).toBe(anahtar);
    ws.mesaj({ tur: "komutSonucu", anahtar, seq: 1, t: 400, komut: { tur: "parsel_al", ilce: "i1", hucreler: ["1:1"], sinif: "kirsal" }, sonuc: { tamam: true }, tekrar: false });
    expect(await sonuc).toMatchObject({ tamam: true, t: 400 });
    b.kapat();
  });

  it("durum mesajı kaçarsa 1,5 sn sonra aynı anahtarla yeniden dener; zaman aşımı yetişirken yenilenir", async () => {
    const { b, ws } = await bagla();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const sonuc = b.tesisInsa({ tur: "tesis_insa_hucre", ilce: "i1", tesisTuru: "ciftlik", hucreler: ["1:1", "2:1"] });
    const anahtar = ws.tur("komut")[0]!["anahtar"] as string;
    ws.mesaj({ tur: "hata", kod: "yetisiyor", mesaj: "yetisiyor", anahtar });
    expect(ws.tur("komut")).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1600);
    expect(ws.tur("komut")).toHaveLength(2);
    expect(ws.tur("komut")[1]!["anahtar"]).toBe(anahtar);
    ws.mesaj({ tur: "komutSonucu", anahtar, seq: 2, t: 9, komut: { tur: "tesis_insa_hucre", ilce: "i1", tesisTuru: "ciftlik", hucreler: ["1:1", "2:1"] }, sonuc: { tamam: false, hata: "yetersiz hazine" }, tekrar: false });
    expect(await sonuc).toMatchObject({ tamam: false, mesaj: "Hazinede yeterli para yok." });
    b.kapat();
  });

  it("yetişmeyen sunucuda ozet().yetisiyor null; hız sınırı hatası aynı anahtarla yeniden denenir", async () => {
    const { b, ws } = await bagla();
    expect(b.ozet()!.yetisiyor).toBeNull();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const sonuc = b.parselAl({ tur: "parsel_al", ilce: "i1", hucreler: ["3:3"], sinif: "kirsal" });
    const anahtar = ws.tur("komut")[0]!["anahtar"] as string;
    ws.mesaj({ tur: "hata", kod: "hiz_siniri", mesaj: "cok fazla komut", anahtar });
    await vi.advanceTimersByTimeAsync(500);
    expect(ws.tur("komut")).toHaveLength(2);
    ws.mesaj({ tur: "komutSonucu", anahtar, seq: 3, t: 1, komut: { tur: "parsel_al", ilce: "i1", hucreler: ["3:3"], sinif: "kirsal" }, sonuc: { tamam: true }, tekrar: false });
    expect(await sonuc).toMatchObject({ tamam: true });
    b.kapat();
  });
});
