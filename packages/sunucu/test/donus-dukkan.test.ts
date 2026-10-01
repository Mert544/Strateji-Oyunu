/**
 * "Sen yokken" ve dükkân geliri (G7): `net.kalemler.satis` = NPC ihracat farkı + dükkân (yerel NPC) geliri farkı; çapa `dukkanGeliri?` isteğe bağlıdır (alan yoksa 0 =
 * eski çapa); `satis + gider + diger = hazineFarki` korunur; dükkânsız dünyada çıktı ESKİSİYLE bayt bayt aynıdır; gün sınırı özet kaydı satışa dükkân gelirini katar.
 * Dükkân DURUMU çekirdek test yardımcısıyla doğrudan yazılır (kurma komutu G7-3'tedir).
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, Simulasyon } from "@bolge/cekirdek";
import { mulkSim } from "../../cekirdek/test/mulk-yardimci";
import { dukkanEkle, perakendeVeri } from "../../cekirdek/test/perakende-yardimci";
import { oyuncuAnligi } from "../src/donus/anlik";
import { OzetIzleyici } from "../src/donus/izleyici";
import { donusOzeti } from "../src/donus/ozet";
import type { SonGorulen } from "../src/depo/tipler";

function sim(dukkan: boolean): Simulasyon {
  const s = mulkSim(["a", "b"], perakendeVeri());
  s.calistirKadar(2 * SAAT);
  if (dukkan) dukkanEkle(s, "a", [{ mal: "gida" }]);
  return s;
}
const anlik = (s: Simulasyon, o: string): SonGorulen => oyuncuAnligi(s, o) as SonGorulen;

describe("oyuncuAnligi.dukkanGeliri", () => {
  it("dukkan geliri yokken alan YAZILMAZ (capa eskisiyle ayni); satis baslayinca > 0 ve zamanla (tembel) artar", () => {
    const s = sim(true);
    expect(anlik(s, "a")).not.toHaveProperty("dukkanGeliri"); // henuz satis yok
    expect(anlik(s, "b")).not.toHaveProperty("dukkanGeliri");
    s.calistirKadar(s.dunya.zaman + 4 * SAAT);
    const g1 = anlik(s, "a").dukkanGeliri ?? 0;
    expect(g1).toBeGreaterThan(0);
    s.calistirKadar(s.dunya.zaman + 4 * SAAT);
    expect(anlik(s, "a").dukkanGeliri ?? 0).toBeGreaterThan(g1);
    // Durumu degistirmez (saf okuma).
    const once = s.durumOzeti();
    anlik(s, "a");
    expect(s.durumOzeti()).toBe(once);
  });
});

describe("donusOzeti: satis = ihracat + dukkan geliri", () => {
  it("dukkan satisi yokluk suresince net.kalemler.satis'a girer; satis + gider + diger = hazineFarki; capada alan yoksa (eski capa) ilk degerden itibaren sayilir", () => {
    const s = sim(true);
    const sg = anlik(s, "a");
    s.calistirKadar(s.dunya.zaman + 12 * SAAT);
    const simdi = anlik(s, "a");
    const o = donusOzeti({ oyuncu: "a", simdi: s.dunya.zaman, anlik: simdi, capa: { sonGorulen: sg }, kayitlar: [] });
    expect(o).not.toBeNull();
    const k = o?.net.kalemler;
    const dukkanFarki = (simdi.dukkanGeliri ?? 0) - (sg.dukkanGeliri ?? 0);
    expect(dukkanFarki).toBeGreaterThan(0);
    expect(k?.satis).toBe(simdi.defter.brutIhracat - sg.defter.brutIhracat + dukkanFarki);
    expect((k?.satis ?? 0) + (k?.gider ?? 0) + (k?.diger ?? 0)).toBe(o?.net.hazineFarki);
    // Eski capa (alan yok) ayni sonucu verir (alan yok = 0).
    const eskiCapa: SonGorulen = { ...sg };
    delete eskiCapa.dukkanGeliri;
    expect(donusOzeti({ oyuncu: "a", simdi: s.dunya.zaman, anlik: simdi, capa: { sonGorulen: eskiCapa }, kayitlar: [] })).toEqual(o);
  });

  it("dukkansiz oyuncuda ve dukkansiz dunyada ozet ESKISIYLE bayt bayt ayni (satis yalniz ihracat)", () => {
    const s = sim(false);
    const sg = anlik(s, "a");
    s.calistirKadar(s.dunya.zaman + 12 * SAAT);
    const simdi = anlik(s, "a");
    expect(simdi).not.toHaveProperty("dukkanGeliri");
    const o = donusOzeti({ oyuncu: "a", simdi: s.dunya.zaman, anlik: simdi, capa: { sonGorulen: sg }, kayitlar: [] });
    expect(o?.net.kalemler.satis).toBe(simdi.defter.brutIhracat - sg.defter.brutIhracat);
  });
});

describe("OzetIzleyici gun siniri: satis_toplami dukkan gelirini katar", () => {
  it("dukkan geliri olan (ticaret defteri olmayan) oyuncu icin de kayit uretilir; degerler [gunlukSatis, gunlukGider, kumSatis, kumGider]; dukkansiz dunyada kayit yok", () => {
    const s = sim(true);
    s.calistirKadar(GUN); // gun siniri
    const iz = new OzetIzleyici(s.ic);
    const kayitlar = iz.gunSiniri(s.dunya);
    const a = kayitlar.find((k) => k.oyuncu === "a" && k.kayit.tur === "satis_toplami");
    expect(a).toBeDefined();
    const [gunluk, gider, kum] = a?.kayit.degerler as number[];
    expect(kum).toBeGreaterThan(0);
    expect(gunluk).toBe(kum); // ilk kayit: onceki 0
    expect(gider).toBe(0);
    expect(kayitlar.find((k) => k.oyuncu === "b")).toBeUndefined();
    // Dukkansiz dunya: kayit yok (ticaret defteri de yok).
    const t = sim(false);
    t.calistirKadar(GUN);
    expect(new OzetIzleyici(t.ic).gunSiniri(t.dunya)).toEqual([]);
  });
});
