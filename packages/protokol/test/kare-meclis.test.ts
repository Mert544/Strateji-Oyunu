/** K2a: gerçek siyasi kayıt, başarılı komut günleri ve özel kare/kayıt sınırları. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { GUN, SAAT, meclisGorunumu, mulkOyuncuBul } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon, SISTEM_OYUNCUSU } from "../../cekirdek/src/motor";
import { anlikGoruntuOlustur, dunyaCoz, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { hucreSec, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, KomutSemasi, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const ILCE = "sn_m_ova_merkez", DIGER = "sn_m_liman_merkez", YABANCI = "sn_m_gecit_merkez", TOHUM = 67;
const f = parselFiksturuYukle("mini-6");
const hucre = hucreSec(f, ILCE, "kirsal", 1)[0]!;
const kayit = (s: SimT, o = "a") => mulkOyuncuBul(s.dunya, o)!.meclis!;
const gorunum = (s: SimT, ilce = ILCE, o = "a") => meclisGorunumu(s.dunya, s.ic, o, ilce)!;
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, ilceIlgisiKur(s, [ILCE, DIGER], o), {});
const etkin = (s: SimT) => tamam(s, "a", { tur: "vergi_ayarla", oranPpm: s.dunya.oyuncular.find((o) => o.id === "a")!.vergiPpm });

function veri(): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    v.param.mulk!.yeniOyuncu.hibe = 500_000_000;
    v.param.mulk!.kamuSiparis!.etkin = false; // K1 ekonomik senaryosu burada tekrar çalıştırılmaz.
  });
}

function kur(v = veri()): SimT {
  const s = mulkSim(["a", "b", "c"], v, TOHUM);
  tamam(s, "a", { tur: "parsel_al", ilce: ILCE, hucreler: [hucre], sinif: "kirsal" });
  tamam(s, "a", { tur: "parsel_al", ilce: DIGER, hucreler: hucreSec(f, DIGER, "kirsal", 1), sinif: "kirsal" });
  tamam(s, "b", { tur: "parsel_al", ilce: ILCE, hucreler: hucreSec(f, ILCE, "kirsal", 1, 1), sinif: "kirsal" });
  tamam(s, "c", { tur: "parsel_al", ilce: YABANCI, hucreler: hucreSec(f, YABANCI, "kirsal", 1), sinif: "kirsal" });
  return s;
}

function retDegismez(s: SimT, o: string, k: Komut): void {
  s.calistirKadar(s.dunya.zaman);
  const once = dunyaSerilestir(s.dunya), gunluk = structuredClone(s.gunluk);
  expect(ver(s, o, k).tamam).toBe(false);
  expect(dunyaSerilestir(s.dunya)).toBe(once);
  expect(s.gunluk).toEqual(gunluk);
}

function safOku(s: SimT, ilce = ILCE) {
  const once = dunyaSerilestir(s.dunya), kuyruk = structuredClone(s.dunya.kuyruk);
  const g = gorunum(s, ilce);
  kare(s, "a");
  expect(dunyaSerilestir(s.dunya)).toBe(once);
  expect(s.dunya.kuyruk).toEqual(kuyruk);
  return g;
}

describe("K2a tek siyasi ilçe ve etkinlik koşulu", () => {
  it("gerçek kayıt/başarılı komut günleri eşsizdir; yedi günlük sınır saf okunur, taşıma tek kaydı ve ilerlemeyi sıfırlar", () => {
    const v = veri(), s = kur(v);
    expect(mulkOyuncuBul(s.dunya, "a")!.meclis).toBeUndefined();
    expect(safOku(s)).toMatchObject({ buIlcedeArsa: true, kayitUygun: true, katilimKosulu: false, etkinGunSayisi: 0, gerekliGun: 3, pencereGun: 7 });
    tamam(s, "a", { tur: "meclis_katil", ilce: ILCE, oncekiIlce: null });
    expect(kayit(s)).toEqual({ ilce: ILCE, kayitZamani: 0, etkinGunler: [0] });
    etkin(s); etkin(s);
    s.calistirKadar(GUN - 1);
    etkin(s);
    expect(kayit(s).etkinGunler).toEqual([0]);
    expect(safOku(s).etkinGunSayisi).toBe(1);
    s.calistirKadar(GUN); etkin(s);
    expect(kayit(s).etkinGunler).toEqual([0, 1]);
    expect(safOku(s).katilimKosulu).toBe(false);
    s.calistirKadar(2 * GUN); etkin(s);
    expect(safOku(s).katilimKosulu).toBe(true); // Yalnız 3 günlük etkinlik koşuludur.
    for (let gun = 3; gun <= 6; gun++) { s.calistirKadar(gun * GUN); etkin(s); }
    expect(kayit(s).etkinGunler).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(safOku(s).etkinGunSayisi).toBe(7);
    s.calistirKadar(7 * GUN - 1);
    expect(safOku(s).etkinGunSayisi).toBe(7); // bugun-6 dahil.
    s.calistirKadar(7 * GUN);
    expect(safOku(s).etkinGunSayisi).toBe(6); // bugun-7 artık sayılmaz, okuma eski kaydı silmez.
    expect(kayit(s).etkinGunler).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const eskiGunlu = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
    expect(eskiGunlu.durumOzeti()).toBe(s.durumOzeti());
    expect(eskiGunlu.dunya.kuyruk).toEqual(s.dunya.kuyruk);
    expect(kayit(eskiGunlu).etkinGunler).toEqual([0, 1, 2, 3, 4, 5, 6]);
    etkin(s);
    expect(kayit(s).etkinGunler).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(safOku(s, DIGER)).toMatchObject({ kayitliIlce: ILCE, etkinGunSayisi: 7, katilimKosulu: false, kayitUygun: true });
    tamam(s, "a", { tur: "meclis_katil", ilce: DIGER, oncekiIlce: ILCE });
    expect(kayit(s)).toEqual({ ilce: DIGER, kayitZamani: 7 * GUN, etkinGunler: [7] });
    expect(safOku(s, DIGER)).toMatchObject({ kayitliIlce: DIGER, etkinGunSayisi: 1, katilimKosulu: false, kayitUygun: false });
    expect(safOku(s)).toMatchObject({ kayitliIlce: DIGER, etkinGunSayisi: 1, katilimKosulu: false });
  });

  it("yabancı/stale/tekrar retleri, otomatik ve sistem işlemleri gün kazandırmaz; son parsel kaybı gerçek aidiyeti kaldırır, sahte alanlar yetki taşımaz", () => {
    const s = kur();
    tamam(s, "a", { tur: "meclis_katil", ilce: ILCE, oncekiIlce: null });
    s.calistirKadar(GUN);
    expect(kayit(s).etkinGunler).toEqual([0]); // Saatlik motor olayları gün saymaz.
    tamam(s, SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "yeni", bolgeler: [] });
    expect(kayit(s).etkinGunler).toEqual([0]);
    retDegismez(s, "a", { tur: "meclis_katil", ilce: ILCE, oncekiIlce: ILCE });
    retDegismez(s, "a", { tur: "meclis_katil", ilce: DIGER, oncekiIlce: null });
    retDegismez(s, "a", { tur: "meclis_katil", ilce: DIGER, oncekiIlce: YABANCI });
    retDegismez(s, "a", { tur: "meclis_katil", ilce: "bilinmeyen", oncekiIlce: ILCE });
    retDegismez(s, "c", { tur: "meclis_katil", ilce: ILCE, oncekiIlce: null });
    expect(kayit(s).etkinGunler).toEqual([0]);
    const ham = { tur: "meclis_katil", ilce: ILCE, oncekiIlce: null, oyuncu: "a", kayitZamani: -1, etkinGunler: [0, 1, 2, 3, 4, 5, 6], katilimKosulu: true };
    const guvenli = KomutSemasi.parse(ham);
    expect(guvenli).toEqual({ tur: "meclis_katil", ilce: ILCE, oncekiIlce: null });
    tamam(s, "b", guvenli);
    expect(kayit(s, "b")).toEqual({ ilce: ILCE, kayitZamani: GUN, etkinGunler: [1] });
    expect(kayit(s).etkinGunler).toEqual([0]); // Kimlik yalnız doğrulanmış komut sahibinden gelir.
    tamam(s, "a", { tur: "parsel_birak", ilce: ILCE, hucreler: [hucre] });
    expect(s.dunya.bolgeler.some((b) => b.id === "sn_m_ova#a")).toBe(true); // Depo kalır, aidiyet kalmaz.
    expect(kayit(s)).toEqual({ ilce: ILCE, kayitZamani: 0, etkinGunler: [0] });
    expect(safOku(s)).toMatchObject({ kayitliIlcedeArsa: false, buIlcedeArsa: false, katilimKosulu: false });
    s.calistirKadar(2 * GUN); etkin(s);
    expect(kayit(s).etkinGunler).toEqual([0]); // Parselsiz başarılı komut da gün eklemez.
    tamam(s, "a", { tur: "parsel_al", ilce: ILCE, hucreler: [hucre], sinif: "kirsal" });
    expect(kayit(s).etkinGunler).toEqual([0, 2]);
    expect(safOku(s)).toMatchObject({ kayitliIlcedeArsa: true, etkinGunSayisi: 2, katilimKosulu: false });
  });

  it("aynı kuralda kayıt/kuyruk ve parçalı zaman/replay eşittir; bozuk günler reddedilir, yalnız kendi meclis görünümü yayınlanır", () => {
    const v = veri(), s = kur(v);
    const eski = anlikGoruntuOlustur(s, kuralSurumuHesapla(v));
    expect(Simulasyon.anlikGoruntudenYukle(v, eski).durumOzeti()).toBe(s.durumOzeti()); // Optional alan yokluğu gerçektir.
    tamam(s, "a", { tur: "meclis_katil", ilce: ILCE, oncekiIlce: null });
    s.calistirKadar(GUN); etkin(s);
    s.calistirKadar(GUN + 137);
    safOku(s);
    const metin = dunyaSerilestir(s.dunya);
    expect(dunyaSerilestir(dunyaCoz(metin))).toBe(metin);
    const x = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
    expect(x.durumOzeti()).toBe(s.durumOzeti());
    expect(x.dunya.kuyruk).toEqual(s.dunya.kuyruk);
    const hedef = 2 * GUN + 173;
    s.calistirKadar(hedef);
    for (let t = x.dunya.zaman; t < hedef;) x.calistirKadar(t = Math.min(hedef, t + 7 * SAAT + 19));
    etkin(s); etkin(x);
    s.calistirKadar(hedef); x.calistirKadar(hedef);
    expect(kayit(x)).toEqual(kayit(s));
    expect(x.durumOzeti()).toBe(s.durumOzeti());
    const r = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk);
    r.calistirKadar(hedef);
    expect(r.durumOzeti()).toBe(s.durumOzeti());
    expect(safOku(s).katilimKosulu).toBe(true);
    const bozuk = structuredClone(s.dunya);
    mulkOyuncuBul(bozuk, "a")!.meclis!.etkinGunler = [0, 0];
    expect(() => dunyaCoz(dunyaSerilestir(bozuk))).toThrow(/etkinGunler/);
    mulkOyuncuBul(bozuk, "a")!.meclis!.etkinGunler = [3];
    expect(() => dunyaCoz(dunyaSerilestir(bozuk))).toThrow(/etkinGunler/);
    const asil = kare(s, "a");
    expect(asil.oyuncu!.meclis!.find((m) => m.ilce === ILCE)).toEqual(gorunum(s));
    expect(asil.oyuncu!.meclis!.find((m) => m.ilce === DIGER)).toMatchObject({ kayitliIlce: ILCE, etkinGunSayisi: 3, katilimKosulu: false });
    expect(IlgiKaresiSemasi.parse(asil)).toEqual(asil);
    for (const o of ["b", null]) {
      const g = kare(s, o);
      expect(g.ilceler!.map(({ hucreler: _, ...c }) => c)).toEqual(asil.ilceler!.map(({ hucreler: _, ...c }) => c));
      expect(g.oyuncu?.meclis?.some((m) => m.kayitliIlce === ILCE)).not.toBe(true);
    }
    expect(JSON.stringify(asil.ilceler)).not.toMatch(/etkinGunler|kayitZamani|kayitliIlce|katilimKosulu/);
    const eskiWire = structuredClone(asil);
    delete eskiWire.oyuncu!.meclis;
    expect(IlgiKaresiSemasi.parse(eskiWire)).toEqual(eskiWire);
  });
});
