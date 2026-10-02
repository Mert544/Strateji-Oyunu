/** S2: gerçek motor kuyruğu, orta kayıt-yükleme, tekil sonuç ve güvenli genel/özel kare. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { GUN, PPM, SAAT } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaCoz, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikMiktar } from "../../cekirdek/src/stok";
import { bitisikGrup, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const ILCE = "sn_m_ova_merkez";
const BOLGE = "sn_m_ova#a";
const TOHUM = 41;
const kare = (s: SimT, oyuncu: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), oyuncu), oyuncu, ilceIlgisiKur(s, [ILCE], oyuncu), {});

function veri(kazansin: boolean): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    Object.assign(v.param.askeri.eskiya!, { etkin: true, gunlukOlasilikPpm: PPM, servetEsigiMili: 1, servetAdimiMili: 1_000_000_000_000, boyGucu: 1000 });
    const yo = v.param.mulk!.yeniOyuncu;
    yo.kalkanGun = 0;
    yo.hibe = 5_000_000_000;
    yo.baslangicStok = { celik: 10_000_000, parca: 10_000_000, gida: 10_000_000, muhimmat: 10_000_000, yakit: 10_000_000 };
    v.param.mulk!.esZamanliInsaat = 10;
    v.param.mulk!.ekYapilar!.ordugah!.birlikKapasitesi = 40;
    v.icerik.birlikler.find((b) => b.id === "piyade_tumeni")!.guc = kazansin ? 100 : 1;
  });
}

function kur(v: CekirdekVeriPaketi): SimT {
  const s = mulkSim(["a", "b"], v, TOHUM);
  const f = parselFiksturuYukle("mini-6");
  const ordu = bitisikGrup(f, ILCE, "kirsal", 3);
  const tarlalar = [2, 3, 4, 5].map((k) => bitisikGrup(f, ILCE, "kirsal", 2, k));
  tamam(s, "a", { tur: "parsel_al", ilce: ILCE, hucreler: [...ordu, ...tarlalar.flat()], sinif: "kirsal" });
  tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ordugah", hucreler: ordu });
  for (const hucreler of tarlalar) tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler });
  s.calistirKadar(Math.max(...s.dunya.insaatlar.map((x) => x.bitis)));
  tamam(s, "a", { tur: "birlik_uret", bolge: BOLGE, birlik: "piyade_tumeni", adet: 40 });
  s.calistirKadar(s.dunya.partiler[0]!.bitis);
  return s;
}

function kopyala(v: CekirdekVeriPaketi, s: SimT): SimT {
  const metin = dunyaSerilestir(s.dunya);
  expect(dunyaSerilestir(dunyaCoz(metin))).toBe(metin);
  const yuklu = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
  expect(yuklu.durumOzeti()).toBe(s.durumOzeti());
  expect(yuklu.dunya.kuyruk.filter((o) => o.veri.tur === "eskiya_gunluk")).toHaveLength(1);
  return yuklu;
}

describe("S2 bayraklı ilçe baskını", () => {
  it("aynı tohum/günlük, plan-duyuru-pencere-sonuç ve revir ortasında yükleme aynı gerçek ödül/kayıp sonucuna varır", () => {
    for (const kazansin of [true, false]) {
      const v = veri(kazansin);
      const s = kur(v);
      // Plan saatleri motorun gerçek günlük olayından alınır; test kendi baskın olayını üretmez.
      for (let gun = 1; !s.dunya.baskinlar?.length && gun <= 4; gun++) s.calistirKadar(Math.max(s.dunya.zaman, gun * GUN));
      const baskin = s.dunya.baskinlar!.find((b) => b.ilce === ILCE)!;
      expect(baskin).toMatchObject({ boy: 1, gb: 1000, evre: "planli" });
      const k0 = kare(s, "a");
      expect(k0.oyuncu!.pve!.olaylar).toEqual([]);
      expect(k0.ilceler!.find((c) => c.id === ILCE)!.pve!.olaylar).toEqual([]);
      const kopyalar = [kopyala(v, s)];
      s.calistirKadar(baskin.duyuruZamani - 1);
      expect(kare(s, "a").oyuncu!.pve!.olaylar).toEqual([]);
      s.calistirKadar(baskin.duyuruZamani);
      const ilan = kare(s, "a");
      expect(ilan.ilceler!.find((c) => c.id === ILCE)!.pve!.olaylar[0]).toMatchObject({ id: baskin.id, evre: "duyuru" });
      expect(ilan.ilceler!.find((c) => c.id === ILCE)!.pve!.olaylar[0]).not.toHaveProperty("gb");
      kopyalar.push(kopyala(v, s));
      s.calistirKadar(baskin.pencereBaslangic);
      expect(baskin.evre).toBe("pencere");
      expect(baskin.katilimcilar.find((k) => k.oyuncu === "a")!.birlikler).toContainEqual(["piyade_tumeni", 40]);
      kopyalar.push(kopyala(v, s));
      const dugum = s.dunya.bolgeler.find((b) => b.id === BOLGE)!;
      const sahiplik = s.dunya.mulk!.hucreler.map((h) => [h.id, h.sahip]);
      const aktif = dugum.tesisler.map((t) => [t.id, t.aktif]);
      s.calistirKadar(baskin.pencereBitis - 1);
      const stoklar = dugum.stoklar.map((x) => anlikMiktar(x, s.dunya.zaman));
      s.calistirKadar(baskin.pencereBitis);
      expect(baskin.evre).toBe("bitti");
      expect(baskin.sonuc!.kazandi).toBe(kazansin);
      const kayit = baskin.sonuc!.oyuncular.find((o) => o.oyuncu === "a")!;
      const pi = s.ic.birlikIndeks["piyade_tumeni"]!;
      if (kazansin) {
        expect(kayit.kayit.birlikKaybi).toEqual([]);
        expect(kayit.kayit.malKaybi).toEqual([]);
        expect(kayit.kayit.ganimet.reduce((n, [, q]) => n + q, 0)).toBeGreaterThan(0);
        for (const [mal, q] of kayit.kayit.ganimet) expect(q).toBeLessThanOrEqual(v.param.askeri.eskiya!.ganimet[mal]!);
      } else {
        expect(kayit.kayit.birlikKaybi).toEqual([["piyade_tumeni", 6]]);
        expect(dugum.birlikler[pi]).toBe(34);
        expect(kayit.revir).toMatchObject({ evre: "bekliyor", birlikler: [["piyade_tumeni", 2]], donusZamani: baskin.pencereBitis + 24 * SAAT });
        expect(kayit.kayit.malKaybi.length).toBeGreaterThan(0);
        for (const [mal, q] of kayit.kayit.malKaybi) {
          expect(s.ic.mallar[s.ic.malIndeks[mal]!]!.depolanabilir).not.toBe(false); // Tanımsız alan mevcut içerikte depolanabilir varsayılanıdır.
          expect(q).toBeLessThanOrEqual(Math.ceil(stoklar[s.ic.malIndeks[mal]!]! / 4));
        }
        expect(dugum.yagmaPenceresi!.kullanilanPpm).toBeLessThanOrEqual(250_000);
        expect(kayit.kayit.onarim.length).toBeGreaterThan(0);
        expect(ver(s, "a", { tur: "birlik_uret", bolge: BOLGE, birlik: "piyade_tumeni", adet: 5 }).tamam).toBe(false); // 34+2 revir+5 >40.
      }
      expect(s.dunya.mulk!.hucreler.map((h) => [h.id, h.sahip])).toEqual(sahiplik);
      expect(dugum.tesisler.map((t) => [t.id, t.aktif])).toEqual(aktif);
      const sonucOnce = structuredClone(baskin.sonuc);
      const ozetOnce = s.durumOzeti();
      const sahip = kare(s, "a");
      const yabanci = kare(s, "b");
      const genel = kare(s, null);
      expect(sahip.oyuncu!.pve!.sonuclar).toContainEqual(kayit.kayit);
      expect(yabanci.oyuncu!.pve!.sonuclar).toEqual([]);
      expect(yabanci.oyuncu!.pve!.revir).toEqual([]);
      expect(genel.oyuncu).toBeUndefined();
      expect(genel.ilceler!.find((c) => c.id === ILCE)!.pve!.olaylar[0]!.sonuc).toHaveProperty("kazandi", kazansin);
      expect(JSON.stringify(genel.ilceler!.map((c) => c.pve))).not.toMatch(/ganimet|malKaybi|birlikKaybi|katilimcilar|revir|dugum/);
      expect(IlgiKaresiSemasi.parse(sahip)).toEqual(sahip);
      expect(s.durumOzeti()).toBe(ozetOnce); // Kare okuması RNG/defter/dünyayı ilerletmez.
      kopyalar.push(kopyala(v, s));
      let kapaliRevir: SimT | undefined;
      if (!kazansin) {
        const kapali = structuredClone(v);
        kapali.param.askeri.eskiya!.etkin = false;
        kapaliRevir = Simulasyon.yukle(kapali, dunyaCoz(dunyaSerilestir(s.dunya)));
        expect(kare(kapaliRevir, "a").oyuncu!.pve).toMatchObject({ etkin: false, revir: [kayit.revir] });
        expect(kapaliRevir.dunya.kuyruk.some((o) => o.veri.tur === "eskiya_gunluk")).toBe(false);
      }
      const tekKapanis = kopyala(v, s);
      tekKapanis.calistirKadar(baskin.pencereBitis + 1);
      const tekDugum = tekKapanis.dunya.bolgeler.find((b) => b.id === BOLGE)!;
      // Tekillik gerçek kuyrukta yinelenen kapanışla sınanır; handler doğrudan çağrılmaz.
      for (const x of [s, ...kopyalar]) {
        x.calistirKadar(baskin.pencereBitis);
        x.baglam.planla(x.dunya, baskin.pencereBitis + 1, { tur: "eskiya_pencere_kapa", baskin: baskin.id });
        x.calistirKadar(baskin.pencereBitis + 1);
        expect(x.dunya.baskinlar!.find((b) => b.id === baskin.id)!.sonuc).toEqual(sonucOnce);
        const xDugum = x.dunya.bolgeler.find((b) => b.id === BOLGE)!;
        expect(xDugum.stoklar).toEqual(tekDugum.stoklar); // Aynı kayıt tutulurken ikinci ödeme/yağma da yapılamaz.
        expect(xDugum.birlikler).toEqual(tekDugum.birlikler);
        expect(xDugum.yagmaPenceresi).toEqual(tekDugum.yagmaPenceresi);
      }
      const hedef = baskin.pencereBitis + 24 * SAAT;
      for (const x of [s, ...kopyalar]) x.calistirKadar(hedef);
      for (const x of kopyalar) expect(x.durumOzeti()).toBe(s.durumOzeti());
      if (!kazansin) {
        expect(dugum.birlikler[pi]).toBe(36);
        expect(baskin.sonuc!.oyuncular.find((o) => o.oyuncu === "a")!.revir!.evre).toBe("dondu");
        expect(dugum.tesisler.every((t) => (t.onarimBitis ?? 0) <= hedef)).toBe(true);
        kapaliRevir!.calistirKadar(hedef);
        expect(kapaliRevir!.dunya.bolgeler.find((b) => b.id === BOLGE)!.birlikler[pi]).toBe(36);
        expect(kare(kapaliRevir!, "a").oyuncu!.pve!.revir[0]!.evre).toBe("dondu"); // Kapatma kazanılmış dönüş hakkını silmez.
      }
      // Aynı seed+başarılı günlükle başlangıçtan tekrar; testin tekillik olayı her kola eşit eklenir.
      const oynat = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk);
      oynat.calistirKadar(baskin.pencereBitis);
      oynat.baglam.planla(oynat.dunya, baskin.pencereBitis + 1, { tur: "eskiya_pencere_kapa", baskin: baskin.id });
      oynat.calistirKadar(hedef);
      expect(oynat.durumOzeti()).toBe(s.durumOzeti());
    }
  });

  it("blok yok/kapalı aynı eski dünya ve RNG/olay kuyruğunu korur; mevcut ordu üretimi açık kalır", () => {
    const kapali = veri(true);
    kapali.param.askeri.eskiya!.etkin = false;
    const eski = structuredClone(kapali);
    delete eski.param.askeri.eskiya;
    const a = kur(kapali);
    const b = kur(eski);
    a.calistirKadar(4 * GUN);
    b.calistirKadar(4 * GUN);
    expect(dunyaSerilestir(a.dunya)).toBe(dunyaSerilestir(b.dunya));
    expect(a.dunya).not.toHaveProperty("baskinlar");
    expect(a.dunya).not.toHaveProperty("eskiyaTakvim");
    expect(a.dunya.kuyruk.some((o) => o.veri.tur.startsWith("eskiya_"))).toBe(false);
    expect(a.dunya.bolgeler.find((b) => b.id === BOLGE)!.birlikler[a.ic.birlikIndeks["piyade_tumeni"]!]).toBe(40);
    expect(Simulasyon.yukle(eski, dunyaCoz(dunyaSerilestir(b.dunya))).durumOzeti()).toBe(b.durumOzeti());
    expect(kare(a, "a").oyuncu!.pve).toMatchObject({ etkin: false });
    expect(kare(b, "a").oyuncu!.pve).toBeUndefined();
  });
});
