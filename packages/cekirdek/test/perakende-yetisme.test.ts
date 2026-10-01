/**
 * G7-2 (sartname §6.7, §7.1b, §16.2 `perakende-yetisme`): yerel satış ek mekanizma gerektirmez; oranlar çözümde yazılır, tembel birikir. Tek sıçrama = parçalı sıçrama = anlık görüntüden
 * yükleyip devam, `durumOzeti` BİREBİR (yuva satış sayaçları, dükkân geliri, musluk `yerelNpc`, `ilkSatisT`, `paraAkisi.yerel` dahil). Sunucu kapalıyken geçen süre: tek 30 günlük sıçrama.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { paraUzlastir } from "../src/mulk/kasa";
import { anlikGoruntuOlustur, dunyaSerilestir, kuralSurumuHesapla } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { dukkanEkle, dukkanlar, perakendeVeri } from "./perakende-yardimci";
import { mulkSim } from "./mulk-yardimci";

const OVA = "sn_m_ova_merkez";
const LIMAN = "sn_m_liman_merkez";

function veri(): CekirdekVeriPaketi {
  return perakendeVeri((v, pr) => {
    // stok 7 gün boyunca yeter (satış sürer: oran > 0 olarak sonda da görünür); kasa küçük
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 9_000_000, ekmek: 9_000_000, un: 9_000_000, tahil: 200_000 };
    pr.olcekler[0].kasaMiliSaat = 20_000;
  });
}

function kur(): Simulasyon {
  const s = mulkSim(["a", "b"], veri(), 5);
  dukkanEkle(s, "a", [{ mal: "gida", fiyat: 1 }, { mal: "ekmek", fiyat: 3 }, { mal: "un", fiyat: 2 }], "bakkal", 0, OVA);
  dukkanEkle(s, "b", [{ mal: "ekmek", fiyat: 0 }, { mal: "un", fiyat: 2 }], "firin", 0, LIMAN);
  return s;
}

describe("yetişme: tek sıçrama = parçalı sıçrama = görüntüden yükleyip devam", () => {
  it("7 gün: tek sıçrama, düzensiz parçalar ve ortada anlık görüntüden yükleme AYNI durumOzeti; satış sayaçları GERÇEKTEN dolu", () => {
    const T = 7 * GUN;
    const tek = kur();
    tek.calistirKadar(T);

    const parca = kur();
    const adimlar = [13, 61, 3_599_999, 7_200_001, 86_400_000, 90_000_000, 5 * 60_000];
    let t = 0;
    for (const a of adimlar) {
      t = Math.min(T, t + a);
      parca.calistirKadar(t);
    }
    parca.calistirKadar(T);

    const yarim = kur();
    yarim.calistirKadar(T / 2 + 777);
    const v = veri();
    const yuklu = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(yarim, kuralSurumuHesapla(v)));
    expect(yuklu.durumOzeti()).toBe(yarim.durumOzeti()); // yükleme kendi başına sadıktır (dükkân durumu doğrulayıcılardan geçer)
    yuklu.calistirKadar(T);

    expect(parca.durumOzeti()).toBe(tek.durumOzeti());
    expect(yuklu.durumOzeti()).toBe(tek.durumOzeti());

    // ölçüt anlamlı: sayaçlar, gelir ve ilk satış anı durumda VAR
    const metin = dunyaSerilestir(tek.dunya);
    expect(metin).toContain('"satis"');
    expect(metin).toContain('"satisOran"');
    expect(metin).toContain('"yerelNpc"');
    expect(metin).toContain('"dukkanGeliri"');
    expect(metin).toContain('"ilkSatisT"');
    expect(metin).toContain('"yerel"'); // paraAkisi.yerel
    paraUzlastir(tek.dunya, tek.ic);
    expect(dukkanlar(tek).some(({ e }) => e.dukkan!.raf.some((y) => (y.satis?.n ?? 0) > 0))).toBe(true);
  });

  it("negatif kontrol: farklı zaman ya da farklı fiyat kademesi DURUM ÖZETİNİ değiştirir (eşitlik boş değil)", () => {
    const a = kur();
    a.calistirKadar(3 * GUN);
    const b = kur();
    b.calistirKadar(3 * GUN + SAAT);
    expect(b.durumOzeti()).not.toBe(a.durumOzeti());
    const c = kur();
    dukkanlar(c)[0]!.e.dukkan!.raf[0]!.fiyat = 3;
    c.baglam.kirlet(c.dunya);
    c.calistirKadar(3 * GUN);
    expect(c.durumOzeti()).not.toBe(a.durumOzeti());
  });

  it("sunucu kapalıyken geçen süre: 30 günlük TEK sıçrama = saatlik adımlar", () => {
    const T = 30 * GUN;
    const tek = kur();
    tek.calistirKadar(T);
    const saatlik = kur();
    for (let t = SAAT; t <= T; t += SAAT) saatlik.calistirKadar(t);
    expect(saatlik.durumOzeti()).toBe(tek.durumOzeti());
  });
});
