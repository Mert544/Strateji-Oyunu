/** K1: gerçek kasa bütçesi, atomik gıda teslimi ve kayıt/göç sınırları. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { GUN, MILI, PPM, SAAT, kamuSiparisGorunumu, kamuTeslimGorunumu } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaCoz, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikHazine, anlikMiktar } from "../../cekirdek/src/stok";
import { kasaBakiyesi, kasaBul, kamuFiyatTavani } from "../../cekirdek/src/mulk/kasa";
import { kamuIlceKimligi } from "../../cekirdek/src/mulk/kamu";
import { g6KorunumTutar } from "../../cekirdek/test/g6-yardimci";
import { hucreSec, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const ILCE = "sn_m_ova_merkez", DIGER_ILCE = "sn_m_liman_merkez";
const BOLGE = "sn_m_ova#a", DIGER_BOLGE = "sn_m_liman#a", YABANCI = "sn_m_ova#b";
const TOHUM = 61, KASA = kamuIlceKimligi(ILCE);
const bolge = (s: SimT, id = BOLGE) => s.dunya.bolgeler.find((b) => b.id === id)!;
const stok = (s: SimT) => anlikMiktar(bolge(s).stoklar[s.ic.malIndeks.gida!]!, s.dunya.zaman);
const kasa = (s: SimT) => kasaBul(s.dunya.mulk!.para!, KASA)!;
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, ilceIlgisiKur(s, [ILCE, DIGER_ILCE], o), {});

function veri(policy: boolean | "absent" = true, gida = 30_000): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    if (policy === "absent") delete v.param.mulk!.kamuSiparis;
    else v.param.mulk!.kamuSiparis!.etkin = policy;
    // Gerçek arazi vergisiyle kısa sürede bütçe oluşur; kasa alım/pay tavanları değişmez.
    v.param.mulk!.araziVergisiHaftalikPpm = 150_000;
    v.param.mulk!.yeniOyuncu.kalkanGun = 0;
    v.param.mulk!.yeniOyuncu.hibe = 5_000_000_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = { gida };
    v.icerik.mallar.find((m) => m.id === "gida")!.bozulmaPpmGun = 0;
    v.param.nufus.tuketim1000Saat.gida = 0;
  });
}

function kur(v: CekirdekVeriPaketi): SimT {
  const s = mulkSim(["a", "b"], v, TOHUM), f = parselFiksturuYukle("mini-6");
  const kasaba = f.ilceler.find((c) => c.id === ILCE)!.hucreler.filter((h) => h.uygun && h.sinif === "kasaba").map((h) => h.id);
  tamam(s, "a", { tur: "parsel_al", ilce: ILCE, hucreler: kasaba, sinif: "kasaba" });
  tamam(s, "a", { tur: "parsel_al", ilce: DIGER_ILCE, hucreler: hucreSec(f, DIGER_ILCE, "kirsal", 1), sinif: "kirsal" });
  tamam(s, "b", { tur: "parsel_al", ilce: ILCE, hucreler: hucreSec(f, ILCE, "kirsal", 1), sinif: "kirsal" });
  // Gerçek ithalat makası/komisyonu da kamu kasasına girer; sentetik kasa girdisi yoktur.
  tamam(s, "a", { tur: "ticaret_emri", bolge: BOLGE, mal: "petrol", yon: "ithalat", oranSaat: 100_000 });
  return s;
}

function kopyala(v: CekirdekVeriPaketi, s: SimT): SimT {
  const metin = dunyaSerilestir(s.dunya);
  expect(dunyaSerilestir(dunyaCoz(metin))).toBe(metin);
  const x = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
  expect(x.durumOzeti()).toBe(s.durumOzeti());
  expect(x.dunya.kuyruk).toEqual(s.dunya.kuyruk);
  return x;
}

/** Rette zaman ilerlemesiyle ilgisiz fark üretmemek için tüm denemeler şimdiki sim anındadır. */
function retDegismez(s: SimT, o: string, k: Komut): void {
  s.calistirKadar(s.dunya.zaman);
  const once = dunyaSerilestir(s.dunya), gunluk = structuredClone(s.gunluk);
  expect(ver(s, o, k).tamam).toBe(false);
  expect(dunyaSerilestir(s.dunya)).toBe(once);
  expect(s.gunluk).toEqual(gunluk);
}

const kayit = (s: SimT) => s.dunya.mulk!.kamuSiparis!.ilceler.find((c) => c.ilce === ILCE)!;
const siparis = (s: SimT) => kayit(s).siparis;
const teklif = (s: SimT) => kamuTeslimGorunumu(s.dunya, s.ic, "a", ILCE).find((t) => t.bolge === BOLGE)!;
const teslim = (s: SimT): Extract<Komut, { tur: "kamu_teslim" }> => {
  const t = teklif(s);
  return { tur: "kamu_teslim", siparis: t.siparis, bolge: t.bolge, bedelMili: t.bedelMili, teslimSirasi: t.teslimSirasi };
};

function ilanAc(s: SimT): void {
  for (let saat = 1; !s.dunya.mulk!.kamuSiparis?.ilceler.some((c) => c.ilce === ILCE) && saat <= 7 * 24; saat++) {
    s.calistirKadar(saat * SAAT);
  }
  expect(kayit(s)).toBeDefined();
  expect(siparis(s).durum).toBe("acik");
  expect(siparis(s).hedefPaket).toBeLessThanOrEqual(3);
  expect(kasa(s).giris.vergi.n).toBeGreaterThan(0); // Kasaya testten doğrudan para yazılmadı.
  expect(siparis(s).rezervMili).toBeGreaterThan(0);
}

describe("K1 bütçeli kamu gıda siparişi", () => {
  it("gerçek gelirle açılır; kendi stokunun tam paketi atomik nakit transferidir, canlı fiyat indirimi rezerv farkını serbest bırakır", () => {
    const v = veri(), s = kur(v);
    ilanAc(s);
    const onceOkuma = dunyaSerilestir(s.dunya);
    const genel = kamuSiparisGorunumu(s.dunya, s.ic, ILCE)!;
    expect(genel.etkin).toBe(true);
    expect(teklif(s).uygun).toBe(true);
    expect(kare(s, "a").ilceler!.find((c) => c.id === ILCE)!.kamuSiparis).toEqual(genel);
    expect(dunyaSerilestir(s.dunya)).toBe(onceOkuma); // Görünüm çıkarma muhasebe uzlaştırmaz.
    const mal = s.ic.malIndeks.gida!;
    s.dunya.pazar.fiyat[mal] = Math.floor(s.dunya.pazar.fiyat[mal]! / 2); // Kontrollü canlı kotasyon sınırı.
    const canliFiyat = Math.min(siparis(s).ilanBirimFiyatMili, Math.floor(s.dunya.pazar.fiyat[mal]! * siparis(s).fiyatPpm / PPM), kamuFiyatTavani(s.dunya, s.ic, mal));
    expect(teklif(s).bedelMili).toBe(Math.floor(teklif(s).paketMili * canliFiyat / MILI));
    expect(teklif(s).bedelMili).toBeLessThan(siparis(s).ilanPaketBedeliMili);
    g6KorunumTutar(s, "K1 teslim öncesi");
    const ilkRezerv = siparis(s).rezervMili, serbestOnce = siparis(s).serbestMili;
    const kasaRezerv = kasa(s).rezervOyuncu, bakiye = kasaBakiyesi(kasa(s)), odeme = kasa(s).cikisOyuncu;
    const paraOnce = structuredClone(s.dunya.mulk!.para!), hazine = anlikHazine(s.dunya, "a"), stokOnce = stok(s);
    let odenen = 0, verilen = 0, sayi = 0;
    while (siparis(s).durum === "acik" && sayi < 3) {
      const t = teklif(s), once = siparis(s).rezervMili;
      tamam(s, "a", teslim(s));
      odenen += t.bedelMili;
      verilen += t.paketMili;
      sayi++;
      expect(siparis(s).teslimSirasi).toBe(sayi);
      expect(once - siparis(s).rezervMili).toBe(siparis(s).ilanPaketBedeliMili);
    }
    expect(sayi).toBeGreaterThan(0);
    expect(siparis(s).durum).not.toBe("acik");
    expect(stokOnce - stok(s)).toBe(verilen);
    expect(anlikHazine(s.dunya, "a") - hazine).toBe(odenen);
    expect(kasa(s).cikisOyuncu - odeme).toBe(odenen);
    expect(siparis(s).odenenMili).toBe(odenen);
    expect(siparis(s).serbestMili - serbestOnce).toBe(ilkRezerv - odenen);
    expect(kasaRezerv - kasa(s).rezervOyuncu).toBe(ilkRezerv);
    expect(kasaBakiyesi(kasa(s)) - bakiye).toBe(ilkRezerv - odenen);
    expect(kayit(s).toplamTeslimMili).toBe(verilen);
    expect(kayit(s).toplamOdemeMili).toBe(odenen);
    expect(s.dunya.mulk!.para!.musluk).toEqual(paraOnce.musluk);
    expect(s.dunya.mulk!.para!.lavabo).toEqual(paraOnce.lavabo); // Kamu teslimi yeni musluk/lavabo değildir.
    g6KorunumTutar(s, "K1 teslim sonrası");
    expect(IlgiKaresiSemasi.parse(kare(s, "a"))).toEqual(kare(s, "a"));
  });

  it("yabancı/yanlış ilçe, tam stok/kapasite yetersizliği, eski fiyat/sıra ve vade sonrası tekrar hiçbir ekonomik durumu değiştirmez", () => {
    const v = veri(), s = kur(v);
    ilanAc(s);
    const k = teslim(s);
    retDegismez(s, "b", k);
    retDegismez(s, "a", { ...k, tur: "kamu_teslim", bolge: YABANCI });
    retDegismez(s, "a", { ...k, tur: "kamu_teslim", bolge: DIGER_BOLGE });
    retDegismez(s, "a", { ...k, tur: "kamu_teslim", siparis: "kamu:yok" });
    const y = kopyala(v, s), sahip = y.dunya.oyuncular.find((o) => o.id === "a")!;
    sahip.hazine.kapasite = anlikHazine(y.dunya, "a") + teklif(y).bedelMili - 1; // Yalnız kapasite sınırı daraltıldı.
    retDegismez(y, "a", teslim(y));
    const bos = kur(veri(true, 0));
    ilanAc(bos);
    expect(stok(bos)).toBe(0);
    expect(teklif(bos).uygun).toBe(false);
    retDegismez(bos, "a", teslim(bos));
    const mal = s.ic.malIndeks.gida!;
    s.dunya.pazar.fiyat[mal] = Math.floor(s.dunya.pazar.fiyat[mal]! / 2);
    retDegismez(s, "a", k); // Eski gösterilen bedel, aynı ilan kimliğinde bile kabul edilmez.
    const yeni = teslim(s);
    tamam(s, "a", yeni);
    retDegismez(s, "a", yeni); // Tekrar paket teslimi ve stale sıra reddedilir.
    if (siparis(s).durum === "acik") retDegismez(s, "a", { ...teslim(s), teslimSirasi: yeni.teslimSirasi });
    const acik = kopyala(v, bos), vadeKomutu = teslim(acik), vade = siparis(acik).bitis;
    acik.calistirKadar(vade);
    expect(siparis(acik).durum).not.toBe("acik");
    expect(siparis(acik).rezervMili).toBe(0);
    retDegismez(acik, "a", vadeKomutu);
  });

  it("aynı kuralda hash/kuyruk, parçalı zaman ve replay korunur; eski optional alanlar, mahremiyet ve kapatma göçü rezervi geri verir", () => {
    const v = veri(), s = kur(v);
    ilanAc(s);
    const x = kopyala(v, s), hedef = siparis(s).bitis;
    const komut = teslim(s);
    tamam(s, "a", komut);
    tamam(x, "a", komut);
    s.calistirKadar(hedef);
    for (let t = x.dunya.zaman; t < hedef;) x.calistirKadar(t = Math.min(hedef, t + 7 * SAAT + 137));
    expect(stok(x)).toBe(stok(s));
    expect(anlikHazine(x.dunya, "a")).toBe(anlikHazine(s.dunya, "a"));
    expect(x.durumOzeti()).toBe(s.durumOzeti());
    const r = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk);
    r.calistirKadar(hedef);
    expect(r.durumOzeti()).toBe(s.durumOzeti());
    expect(siparis(s).rezervMili).toBe(0);
    expect(siparis(s).serbestMili).toBeGreaterThan(0); // Kalan paketlerin vadesi saatlik motorda çözülür.
    g6KorunumTutar(s, "K1 replay gerçek para");
    g6KorunumTutar(x, "K1 yüklenen gerçek para");
    g6KorunumTutar(r, "K1 replay gerçek para ikinci kol");
    expect(r.durumOzeti()).toBe(s.durumOzeti());
    expect(x.durumOzeti()).toBe(s.durumOzeti());

    const acik = kur(v);
    expect(kare(acik, "a").ilceler!.find((c) => c.id === ILCE)!.kamuSiparis).toEqual({ etkin: true, toplamTeslimMili: 0, toplamOdemeMili: 0 });
    expect(kare(acik, "a").oyuncu!.kamuTeslim).toEqual([]);
    ilanAc(acik);
    const asil = kare(acik, "a");
    expect(asil.oyuncu!.kamuTeslim!.some((t) => t.bolge === BOLGE)).toBe(true);
    const publicView = asil.ilceler!.find((c) => c.id === ILCE)!.kamuSiparis;
    for (const o of ["b", null]) {
      const g = kare(acik, o);
      expect(g.ilceler!.find((c) => c.id === ILCE)!.kamuSiparis).toEqual(publicView);
      expect(g.bolgeler.find((b) => b.id === BOLGE)!.ozel).toBeUndefined();
      expect(g.oyuncu?.kamuTeslim?.some((t) => t.bolge === BOLGE)).not.toBe(true);
    }
    expect(JSON.stringify(publicView)).not.toMatch(/stokMili|bolge|oyuncu/);
    const eskiWire = structuredClone(asil);
    for (const c of eskiWire.ilceler ?? []) delete c.kamuSiparis;
    if (eskiWire.oyuncu) delete eskiWire.oyuncu.kamuTeslim;
    expect(IlgiKaresiSemasi.parse(eskiWire)).toEqual(eskiWire);
    const kapali = veri(false), absent = veri("absent");
    const a = kur(kapali), b = kur(absent);
    a.calistirKadar(2 * GUN); b.calistirKadar(2 * GUN);
    expect(dunyaSerilestir(a.dunya)).toBe(dunyaSerilestir(b.dunya));
    expect(a.dunya.mulk!.kamuSiparis).toBeUndefined();
    expect(kare(a, "a").ilceler!.find((c) => c.id === ILCE)!.kamuSiparis).toBeUndefined();

    tamam(acik, "a", teslim(acik));
    expect(kayit(acik).toplamOdemeMili).toBeGreaterThan(0); // Göç, gerçekten ödenmiş geçmişi korur.
    const rezerv = siparis(acik).rezervMili, cikis = kasa(acik).cikisOyuncu;
    expect(rezerv).toBeGreaterThan(0);
    const bakiye = kasaBakiyesi(kasa(acik)), tarih = structuredClone(kayit(acik));
    const mig = Simulasyon.anlikGoruntudenYukleSonuclu(kapali, anlikGoruntuOlustur(acik, kuralSurumuHesapla(v)), [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(mig.goc).toMatchObject({ kuralDegisti: true, yenidenIndekslendi: false });
    expect(siparis(mig.sim).rezervMili).toBe(0);
    expect(siparis(mig.sim).durum).not.toBe("acik");
    expect(siparis(mig.sim).serbestMili - tarih.siparis.serbestMili).toBe(rezerv);
    expect(kasaBakiyesi(kasa(mig.sim)) - bakiye).toBe(rezerv);
    expect(kasa(mig.sim).cikisOyuncu).toBe(cikis);
    expect(kayit(mig.sim).toplamTeslimMili).toBe(tarih.toplamTeslimMili);
    expect(kayit(mig.sim).toplamOdemeMili).toBe(tarih.toplamOdemeMili);
    expect(kare(mig.sim, "a").ilceler!.find((c) => c.id === ILCE)!.kamuSiparis!.etkin).toBe(false);
    const sonId = siparis(mig.sim).id;
    mig.sim.calistirKadar(mig.sim.dunya.zaman + 2 * GUN);
    expect(siparis(mig.sim).id).toBe(sonId);
    expect(siparis(mig.sim).rezervMili).toBe(0);
    g6KorunumTutar(mig.sim, "K1 kapatma sonrası");
  });
});
