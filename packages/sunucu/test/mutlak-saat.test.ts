/**
 * Mutlak duvar saati ve kapalıyken yetişme (sahip kararı: dünya sunucu kapalıyken de akar; docs/12 §7).
 * Hepsi SAHTE duvar saatiyle koşar (enjekte `duvar` işlevi); gerçek bekleme yoktur. Dünyayı `birTur()` sürer.
 *
 * (a) kapalıyken geçen süre sonrası açılışta sim zamanı = duvar saati − epoch; yetişme adımlı ve ilerleme bildirimli;
 * (b) kapalıyken yetişen dünya ile hiç kapanmayan dünya aynı komutlarla aynı t'de AYNI `durumOzeti` (+ bağımsız
 *     günlük yeniden oynatması); yetişirken komut reddi (kuyruklanmaz) ve WebSocket "yetişiyor" durumu;
 * (c) duvar saati geri giderse sim zamanı geri gitmez (çalışırken ve yeniden başlatmada);
 * ayrıca saat sınıfları, epoch doğrulaması ve epoch'suz eski dünyanın bağlanması.
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { botOlustur } from "@bolge/botlar";
import { bellekDeposu } from "../src/depo/bellek";
import { GelistirmeKimligi } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { DuvarSaati, ElleSaat, TURKIYE_OFSETI_MS, VARSAYILAN_DUNYA_EPOCH_MS, turkiyeGeceYarisi, turkiyeGeceYarisiMi } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import { DunyaYazari, YetisiyorHatasi } from "../src/yazar";
import type { YazarSecenekleri, YetismeDurumu } from "../src/yazar";
import { GUNEY, KUZEY, SIR, token, veri } from "./yardimci";

const E = VARSAYILAN_DUNYA_EPOCH_MS;
const GUN = 24 * SAAT;
const TOHUM = 11;

/** Elle ilerletilen sahte duvar saati (epoch ms). */
class SahteDuvar {
  constructor(public ms: number) {}
  readonly oku = (): number => this.ms;
}

type Depo = ReturnType<typeof bellekDeposu>;

function yazarAc(depo: Depo, duvar: SahteDuvar, ek: Partial<YazarSecenekleri> = {}): Promise<DunyaYazari> {
  return DunyaYazari.ac({
    veri: veri(),
    tohum: TOHUM,
    depo,
    saat: new DuvarSaati(1, { duvar: duvar.oku }),
    commitAraligiMs: 15,
    goruntuAraligiMs: 6 * SAAT,
    ...ek,
  });
}

/** Yetişme bitene kadar tur sürer; her turda dünyanın ilerlemesi `adim`'ı aşmaz. Tur sayısını döndürür. */
async function yetis(y: DunyaYazari, enCokAdim = SAAT): Promise<number> {
  let tur = 0;
  while (y.yetisiyor) {
    const z = y.sim.dunya.zaman;
    await y.birTur();
    expect(y.sim.dunya.zaman - z).toBeLessThanOrEqual(enCokAdim);
    if (++tur > 100_000) throw new Error("yetisme bitmiyor");
  }
  return tur;
}

/** Komutu gönderir, bir tur sürer, yanıtı bekler. */
async function komutla(y: DunyaYazari, oyuncu: string, anahtar: string, komut: Komut): Promise<void> {
  const p = y.komutGonder(oyuncu, "test", anahtar, komut);
  await y.birTur();
  await p;
}

function insanKomutlari(adim: number): Array<[string, Komut]> {
  const bolge = GUNEY[adim % 3] as string;
  return [
    ["veli", { tur: "vergi_ayarla", oranPpm: 80_000 + adim * 1_000 }],
    ["veli", { tur: "tesis_insa", bolge: adim % 2 ? "m_sehir" : bolge, tesisTuru: adim % 3 ? "ciftlik" : "gida_fabrikasi" }],
    ["veli", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }], // yabancı bölge: başarısız
    ["veli", { tur: "savunma_emri", bolge, durus: adim % 2 ? "savunma" : "normal" }],
  ];
}

describe("saat sinifi", () => {
  it("varsayilan epoch 2026-09-30T21:00Z = 1 Ekim 00:00 TRT ve bir Turkiye gece yarisidir", () => {
    expect(E).toBe(Date.UTC(2026, 8, 30, 21, 0, 0));
    expect(turkiyeGeceYarisiMi(E)).toBe(true);
    expect(turkiyeGeceYarisiMi(E + SAAT)).toBe(false);
    expect(turkiyeGeceYarisi(E + 17 * SAAT + 123)).toBe(E);
    expect(turkiyeGeceYarisi(E - 1)).toBe(E - GUN);
    expect(TURKIYE_OFSETI_MS).toBe(3 * SAAT);
  });

  it("mutlak saat: simdi = duvar - epoch; geri giden duvar sim zamanini geri goturmez", () => {
    const d = new SahteDuvar(E + 5 * SAAT);
    const s = new DuvarSaati(1, { duvar: d.oku });
    expect(s.mutlak).toBe(true);
    expect(s.duvarMs()).toBe(E + 5 * SAAT);
    s.baslat(0, E);
    expect(s.simdi()).toBe(5 * SAAT);
    d.ms += 1_500;
    expect(s.simdi()).toBe(5 * SAAT + 1_500);
    d.ms -= SAAT; // NTP geri aldi
    expect(s.simdi()).toBe(5 * SAAT + 1_500);
    expect(s.gerideMs).toBe(SAAT);
    d.ms += SAAT - 500; // hala 500 ms geride
    expect(s.simdi()).toBe(5 * SAAT + 1_500);
    expect(s.gerideMs).toBe(500);
    d.ms += 1_000; // eski degeri 500 ms asti
    expect(s.simdi()).toBe(5 * SAAT + 2_000);
    expect(s.gerideMs).toBe(0);
    expect(() => s.baslat(0)).toThrow(/dunyaEpochMs/);
  });

  it("baslatildiginda dunya zamani duvardan ilerideyse (kayit sonrasi saat geri) simdi dunya zamaninda kalir", () => {
    const d = new SahteDuvar(E + SAAT);
    const s = new DuvarSaati(1, { duvar: d.oku });
    s.baslat(4 * SAAT, E);
    expect(s.simdi()).toBe(4 * SAAT);
    expect(s.gerideMs).toBe(3 * SAAT);
  });

  it("hiz != 1 ya da birikimli: eski davranis (saat dunyanin zamanindan baslar, epoch yok); elle saat degismez", () => {
    const d = new SahteDuvar(1_000_000);
    const hizli = new DuvarSaati(3600, { duvar: d.oku });
    expect(hizli.mutlak).toBe(false);
    expect(hizli.duvarMs()).toBeNull();
    hizli.baslat(10 * SAAT);
    d.ms += 2;
    expect(hizli.simdi()).toBe(10 * SAAT + 7200);
    const eski = new DuvarSaati(1, d.oku); // eski imza: (hiz, duvar) = birikimli
    expect(eski.mutlak).toBe(false);
    eski.baslat(5);
    d.ms += 40;
    expect(eski.simdi()).toBe(45);
    expect(new DuvarSaati(1, { birikimli: true, duvar: d.oku }).mutlak).toBe(false);
    expect(() => new DuvarSaati(2, { birikimli: false })).toThrow(/hiz 1/);
    const elle = new ElleSaat();
    expect(elle.mutlak).toBe(false);
    elle.baslat(7);
    elle.ilerlet(3);
    expect(elle.simdi()).toBe(7);
    elle.ilerlet(9);
    expect(elle.simdi()).toBe(9);
  });
});

describe("(a) kapaliyken gecen sure: acilista sim zamani = duvar - epoch", () => {
  it("yeni dunya epoch'a baglanir; yeniden acilista kapali sure 1 sim-saatlik adimlarla yetistirilir ve ilerleme bildirilir", async () => {
    const duvar = new SahteDuvar(E + 5 * SAAT + 30 * 60_000);
    const depo = bellekDeposu();
    const y1 = await yazarAc(depo, duvar);
    expect(y1.dunyaEpochMs).toBe(E);
    expect(y1.kurtarma.dunyaEpochMs).toBe(E);
    expect(y1.kurtarma.yetisecekMs).toBe(5 * SAAT + 30 * 60_000);
    expect(y1.yetisiyor).toBe(true); // yeni dunya da gece yarisindan simdiye yetisir
    await expect(y1.komutGonder(SISTEM_OYUNCUSU, "test", "erken", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY })).rejects.toBeInstanceOf(YetisiyorHatasi);
    await yetis(y1);
    expect(y1.sim.dunya.zaman).toBe(5 * SAAT + 30 * 60_000);
    await komutla(y1, SISTEM_OYUNCUSU, "katil-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    await komutla(y1, SISTEM_OYUNCUSU, "katil-veli", { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY });
    const t1 = y1.sim.dunya.zaman;
    await y1.kapat();

    // Sunucu 3 gun 7,5 saat kapali kaldi (ve baska bir epoch istense de saklanan epoch gecerli).
    const kapali = 3 * GUN + 7 * SAAT + 30 * 60_000;
    duvar.ms += kapali;
    const y2 = await yazarAc(depo, duvar, { dunyaEpochMs: E - GUN });
    expect(y2.dunyaEpochMs).toBe(E);
    expect(y2.kurtarma.yetisecekMs).toBe(kapali);
    expect(y2.kurtarma.saatGeriMs).toBe(0);
    expect(y2.yetisiyor).toBe(true);
    expect(y2.sim.dunya.zaman).toBe(t1); // acilis anindaki dunya: kayit zamani
    const durumlar: YetismeDurumu[] = [];
    y2.yetismeDinle((d) => durumlar.push(d));
    const bekle = y2.yetismeBekle();
    const tur = await yetis(y2);
    await bekle;
    expect(tur).toBe(Math.ceil(kapali / SAAT)); // 79 tur: 1 sim-saatlik adimlar
    expect(y2.yetisiyor).toBe(false);
    expect(y2.sim.dunya.zaman).toBe(duvar.ms - E); // sim zamani = duvar farki
    expect(y2.saat.simdi()).toBe(duvar.ms - E);
    expect(durumlar[0]?.yetisiyor).toBe(true);
    expect(durumlar.at(-1)).toMatchObject({ yetisiyor: false, kalanMs: 0, simZamani: duvar.ms - E });
    expect(durumlar.some((d) => d.yetisiyor && d.kalanMs > 0)).toBe(true);
    // Bitista tam bir goruntu alindi: bir sonraki acilis yeniden yetismez.
    await y2.kapat();
    const y3 = await yazarAc(depo, duvar);
    expect(y3.yetisiyor).toBe(false);
    expect(y3.kurtarma.yetisecekMs).toBe(0);
    expect(y3.kurtarma.simZamani).toBe(duvar.ms - E);
    await y3.kapat();
  });

  it("epoch dogrulamasi: gece yarisi olmayan ya da gelecekteki epoch yeni dunyada reddedilir", async () => {
    const duvar = new SahteDuvar(E + SAAT);
    await expect(yazarAc(bellekDeposu(), duvar, { dunyaEpochMs: E + SAAT })).rejects.toThrow(/gece yarisi/);
    await expect(yazarAc(bellekDeposu(), duvar, { dunyaEpochMs: E + GUN })).rejects.toThrow(/gelecekte/);
    const y = await yazarAc(bellekDeposu(), duvar, { dunyaEpochMs: E - 10 * GUN });
    expect(y.kurtarma.yetisecekMs).toBe(10 * GUN + SAAT);
  });

  it("epoch'suz eski dunya (elle saatle kurulmus) ilk mutlak acilista 'simdi = dunyanin zamani' olarak baglanir ve kalici olur", async () => {
    const depo = bellekDeposu();
    const elle = new ElleSaat();
    const e = await DunyaYazari.ac({ veri: veri(), tohum: TOHUM, depo, saat: elle, commitAraligiMs: 15 });
    expect(e.dunyaEpochMs).toBeNull();
    elle.ilerlet(5 * SAAT); // tur basina en cok 6 sim-saat
    await e.birTur();
    const dz = e.sim.dunya.zaman;
    expect(dz).toBe(5 * SAAT);
    await e.kapat();
    const duvar = new SahteDuvar(E + 400 * GUN + 3_000);
    const y = await yazarAc(depo, duvar);
    expect(y.dunyaEpochMs).toBe(duvar.ms - dz);
    expect(y.yetisiyor).toBe(false);
    expect(y.kurtarma.yetisecekMs).toBe(0);
    expect((await depo.goruntu.sonuncu())?.ek.dunyaEpochMs).toBe(duvar.ms - dz);
    await y.kapat();
    // Mutlak dunyayi elle saatle acmak epoch'u korur.
    const e2 = await DunyaYazari.ac({ veri: veri(), tohum: TOHUM, depo, saat: new ElleSaat(), commitAraligiMs: 15 });
    expect(e2.dunyaEpochMs).toBe(duvar.ms - dz);
    expect(e2.yetisiyor).toBe(false);
    await e2.kapat();
    expect((await depo.goruntu.sonuncu())?.ek.dunyaEpochMs).toBe(duvar.ms - dz);
  });
});

describe("(b) kapaliyken yetisen dunya = hic kapanmayan dunya (ayni komutlar, ayni t, ayni ozet)", () => {
  /**
   * Senaryo: dunya E+2sa'te kurulur; 30 saat boyunca saat saat ilerler (insan komutlari); sonra 20 gun
   * 5,5 saatlik bosluk: `kapat` ise sunucu kapanir ve yeniden acilip yetisir, degilse dunya bosluk boyunca saat saat
   * ilerlemeyi surdurur. Sonra ikisine de ayni bir komut seti verilir.
   */
  async function senaryo(kapat: boolean): Promise<{ t: number; seq: number; durumOzeti: string; depo: Depo }> {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const depo = bellekDeposu();
    let y = await yazarAc(depo, duvar);
    await yetis(y);
    await komutla(y, SISTEM_OYUNCUSU, "katil-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    await komutla(y, SISTEM_OYUNCUSU, "katil-veli", { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY });
    for (let h = 1; h <= 30; h++) {
      duvar.ms += SAAT;
      if (h % 5 === 0) {
        for (const [i, [o, k]] of insanKomutlari(h).entries()) await komutla(y, o, `a${h}-${i}`, k);
      } else await y.birTur();
    }
    const bosluk = 20 * GUN + 5 * SAAT + 30 * 60_000;
    if (kapat) {
      await y.kapat();
      duvar.ms += bosluk;
      y = await yazarAc(depo, duvar);
      expect(y.yetisiyor).toBe(true);
      await yetis(y);
    } else {
      for (let h = 0; h < 20 * 24 + 5; h++) {
        duvar.ms += SAAT;
        await y.birTur();
      }
      duvar.ms += 30 * 60_000;
      await y.birTur();
    }
    expect(y.sim.dunya.zaman).toBe(duvar.ms - E);
    // Bosluktan sonra ortak komutlar (ayni duvar anlarinda).
    for (let j = 1; j <= 3; j++) {
      duvar.ms += SAAT;
      for (const [i, [o, k]] of insanKomutlari(40 + j).entries()) await komutla(y, o, `son${j}-${i}`, k);
    }
    const ozet = y.ozet();
    await y.kapat();
    return { t: ozet.t, seq: ozet.seq, durumOzeti: ozet.durumOzeti, depo };
  }

  it("ozet birebir ayni; ve bagimsiz gunluk yeniden oynatmasiyla da ayni", async () => {
    const kesintisiz = await senaryo(false);
    const kapatilan = await senaryo(true);
    expect(kapatilan.t).toBe(kesintisiz.t);
    expect(kapatilan.seq).toBe(kesintisiz.seq);
    expect(kapatilan.durumOzeti).toBe(kesintisiz.durumOzeti);
    expect(kapatilan.seq).toBeGreaterThan(20);
    // Gunluk iki dunyada ayni. (Sunucu botlari bu karsilastirmada yok: bot ic durumu anlik goruntuye girmez, yeniden
    // baslatmada sifirlanir; bu onceden vardir ve yetisme ile ilgisizdir.)
    const g1 = await kesintisiz.depo.gunluk.oku(0);
    const g2 = await kapatilan.depo.gunluk.oku(0);
    expect(g2.map((k) => [k.t, k.oyuncu, k.komut])).toEqual(g1.map((k) => [k.t, k.oyuncu, k.komut]));
    const ref = Simulasyon.olustur(veri(), TOHUM);
    for (const k of g2) ref.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
    ref.calistirKadar(kapatilan.t);
    expect(ref.durumOzeti()).toBe(kapatilan.durumOzeti);
  }, 120_000);
});

describe("yetisirken komut sozlesmesi (kuyruklanmaz, reddedilir) ve WebSocket 'yetisiyor' durumu", () => {
  it("yazar: disaridan gelen yeni komut YetisiyorHatasi; islenmis anahtar ilk sonucla doner; sunucu botlari kabul edilir", async () => {
    const duvar = new SahteDuvar(E + SAAT);
    const depo = bellekDeposu();
    const y1 = await yazarAc(depo, duvar);
    await yetis(y1);
    await komutla(y1, SISTEM_OYUNCUSU, "katil-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    await y1.kapat();
    duvar.ms += 2 * GUN;
    const y2 = await yazarAc(depo, duvar, { botlar: [{ bot: botOlustur("tuccar", "bot0", 1), bolgeler: ["m_col"] }] });
    expect(y2.yetisiyor).toBe(true);
    const seq0 = y2.seq;
    await expect(y2.komutGonder("ali", "test", "yeni", { tur: "vergi_ayarla", oranPpm: 90_000 })).rejects.toBeInstanceOf(YetisiyorHatasi);
    expect(y2.bekleyenSayisi).toBe(1); // yalniz botun acilis katilimi (ic komut)
    const eski = await y2.komutGonder(SISTEM_OYUNCUSU, "test", "katil-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    expect(eski.tekrar).toBe(true);
    await yetis(y2);
    expect(y2.seq).toBeGreaterThan(seq0); // bot katildi ve yetisirken karar verdi
    const botKayitlari = (await depo.gunluk.oku(0)).filter((k) => k.oyuncu === "bot0");
    expect(botKayitlari.length).toBeGreaterThan(1);
    // Bot komutlari duvar saatinin simdisiyle degil, yetisen dunyanin zamaniyla damgalanir (zaman icinde dagilir).
    expect(Math.min(...botKayitlari.map((k) => k.t))).toBeLessThan(duvar.ms - E - GUN);
    expect(Math.max(...botKayitlari.map((k) => k.t))).toBeLessThanOrEqual(duvar.ms - E);
    expect((await depo.gunluk.oku(0)).every((k) => k.anahtar !== "yeni")).toBe(true); // reddedilen gunluge girmedi
    const bekleyen = y2.komutGonder("ali", "test", "yeni", { tur: "vergi_ayarla", oranPpm: 90_000 });
    await y2.birTur();
    const y = await bekleyen;
    expect(y.sonuc.tamam).toBe(true);
    expect(y.t).toBe(duvar.ms - E);
    await y2.kapat();
  });

  it("istemci: hosgeldin yetisiyor=true, komut 'yetisiyor' hatasi, 'durum' mesajlari, bitince komut kabul edilir", async () => {
    const duvar = new SahteDuvar(E + SAAT);
    const depo = bellekDeposu();
    const y1 = await yazarAc(depo, duvar);
    await yetis(y1);
    await komutla(y1, SISTEM_OYUNCUSU, "katil-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    await y1.kapat();
    duvar.ms += 3 * GUN;

    // Yetisme ilk adimdan sonra kapida bekletilir (deterministik: yarisma yok).
    let birak!: () => void;
    const kapi = new Promise<void>((c) => (birak = c));
    const y2 = await yazarAc(depo, duvar, { ilerlemeAraligiMs: 0, yetismeAdimKancasi: () => kapi });
    const sunucu = await sunucuBaslat({ yazar: y2, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0 });
    const ist = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("ali"), "ali-istemci");
    try {
      expect(ist.hosgeldin?.yetisiyor).toBe(true);
      expect(ist.hosgeldin?.hedefZamani).toBe(duvar.ms - E);
      expect(ist.hosgeldin?.simZamani).toBeLessThan(duvar.ms - E);
      const bitis = ist.bekle((m) => m.tur === "durum" && !m.yetisiyor);
      const r = await ist.komut("erken", { tur: "vergi_ayarla", oranPpm: 90_000 });
      expect(r.tur).toBe("hata");
      if (r.tur === "hata") expect(r.kod).toBe("yetisiyor");
      expect(y2.yetisiyor).toBe(true);
      expect((await depo.gunluk.oku(0)).some((k) => k.anahtar === "erken")).toBe(false);
      birak();
      const son = await bitis;
      expect(son).toMatchObject({ tur: "durum", yetisiyor: false, simZamani: duvar.ms - E, hedefZamani: duvar.ms - E });
      expect(ist.gelenler.some((m) => m.tur === "durum" && m.yetisiyor)).toBe(true);
      // Ayni anahtarla yeniden deneme artik kabul edilir.
      const yeniden = await ist.komut("erken", { tur: "vergi_ayarla", oranPpm: 90_000 });
      expect(yeniden.tur).toBe("komutSonucu");
      if (yeniden.tur === "komutSonucu") {
        expect(yeniden.sonuc.tamam).toBe(true);
        expect(yeniden.t).toBeGreaterThanOrEqual(duvar.ms - E);
      }
      // Yetisme bitti: yeni baglanti 'yetisiyor' gormez.
      const ist2 = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("ali"), "ali-2");
      expect(ist2.hosgeldin?.yetisiyor).toBeFalsy();
      await ist2.kapat();
    } finally {
      birak();
      await ist.kapat();
      await sunucu.kapat();
    }
  }, 60_000);
});

describe("(c) duvar saati geri gider (NTP): sim zamani asla geri gitmez", () => {
  it("calisirken: dunya ve damga yerinde bekler, bir kez uyarilir; saat eski degeri asinca akis surer", async () => {
    const duvar = new SahteDuvar(E + 10 * SAAT);
    const depo = bellekDeposu();
    const y = await yazarAc(depo, duvar);
    const uyarilar: string[] = [];
    y.uyari((m) => uyarilar.push(m));
    await yetis(y);
    await komutla(y, SISTEM_OYUNCUSU, "katil-veli", { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY });
    duvar.ms += 2 * SAAT;
    await y.birTur();
    expect(y.sim.dunya.zaman).toBe(12 * SAAT);
    expect(uyarilar).toHaveLength(0);

    duvar.ms -= 3 * SAAT; // saat 3 saat geri alindi
    await y.birTur();
    expect(y.sim.dunya.zaman).toBe(12 * SAAT);
    expect(y.saat.simdi()).toBe(12 * SAAT);
    expect(y.saat.gerideMs).toBe(3 * SAAT);
    expect(y.yetisiyor).toBe(false);
    expect(uyarilar).toHaveLength(1);
    expect(uyarilar[0]).toMatch(/geri gitti/);
    // Komut damgasi geri gitmez.
    const ilk = y.komutGonder("veli", "test", "geride-1", { tur: "vergi_ayarla", oranPpm: 70_000 });
    await y.birTur();
    expect((await ilk).t).toBe(12 * SAAT);
    duvar.ms += SAAT; // hala 2 saat geride
    await y.birTur();
    expect(y.sim.dunya.zaman).toBe(12 * SAAT);
    expect(uyarilar).toHaveLength(1); // ayni olay icin tekrar uyarilmaz

    duvar.ms += 3 * SAAT; // eski degeri 1 saat asti: akis surer
    await y.birTur();
    expect(y.sim.dunya.zaman).toBe(13 * SAAT);
    expect(y.saat.gerideMs).toBe(0);
    const iki = y.komutGonder("veli", "test", "geride-2", { tur: "vergi_ayarla", oranPpm: 71_000 });
    await y.birTur();
    expect((await iki).t).toBe(13 * SAAT);
    // Ikinci geri gidis yeniden uyarilir.
    duvar.ms -= 10 * 60_000;
    await y.birTur();
    expect(uyarilar).toHaveLength(2);
    expect(y.sim.dunya.zaman).toBe(13 * SAAT);
    await y.kapat();
  });

  it("yeniden baslatmada: duvar saati dunya zamaninin gerisindeyse hata yok; dunya yerinde, saat bekler", async () => {
    const duvar = new SahteDuvar(E + 14 * SAAT);
    const depo = bellekDeposu();
    const y1 = await yazarAc(depo, duvar);
    await yetis(y1);
    await komutla(y1, SISTEM_OYUNCUSU, "katil-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    const ozet1 = y1.ozet();
    await y1.kapat();

    duvar.ms = E + 5 * SAAT; // sunucu kapaliyken saat 9 saat geri alindi
    const y2 = await yazarAc(depo, duvar);
    expect(y2.kurtarma.saatGeriMs).toBe(9 * SAAT);
    expect(y2.kurtarma.simZamani).toBe(14 * SAAT);
    expect(y2.yetisiyor).toBe(false);
    const uyarilar: string[] = [];
    y2.uyari((m) => uyarilar.push(m));
    await y2.birTur();
    expect(y2.sim.dunya.zaman).toBe(14 * SAAT);
    expect(y2.ozet().durumOzeti).toBe(ozet1.durumOzeti);
    expect(uyarilar).toHaveLength(1);
    // Saat ilerleyip dunya zamanini asinca akis kaldigi yerden surer.
    duvar.ms = E + 16 * SAAT;
    await y2.birTur();
    expect(y2.sim.dunya.zaman).toBe(16 * SAAT);
    await y2.kapat();
  });
});
