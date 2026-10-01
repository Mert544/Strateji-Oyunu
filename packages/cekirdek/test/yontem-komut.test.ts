/**
 * G6 (sartname §5.8, §5.5): inşa komutunda isteğe bağlı `yontem` alanı ve `mulkKipi` süzgeci. Test-yerel sentetik yöntemlerle (`yontem-yardimci.ts`).
 * Her kanıtın negatif kontrolü aynı dosyadadır (bayraksız yöntem bölge kipine görünür; reddedilen komut durumu değiştirmez; alan yokken eski sonuç).
 */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { dunyaCoz, dunyaIcerikUyumu, dunyaSerilestir, SerilestirmeHatasi } from "../src/serilestir";
import { SAAT } from "../src/tipler";
import type { Komut, TesisDurumu } from "../src/tipler";
import { bitisikGrup, mulkSim, tamam, ver } from "./mulk-yardimci";
import { BAYRAKSIZ_T, DEGIRMEN_T, KILITLI_T, yontemliBolgeVeri, yontemliMulkVeri } from "./yontem-yardimci";

const F = parselFiksturuYukle("mini-6");
const ILCE = "sn_m_ova_merkez";

const grup = (kume: number): string[] => bitisikGrup(F, ILCE, "kirsal", 2, kume);
const yerlestir = (hucreler: string[], yontem?: unknown, tur = "gida_fabrikasi"): Komut =>
  ({ tur: "yapi_yerlestir", ilce: ILCE, tesisTuru: tur, hucreler, sinif: "kirsal", ...(yontem === undefined ? {} : { yontem }) }) as Komut;

/** Bitmiş tesisleri döndürür. */
function tesisler(s: Simulasyon, oyuncu = "a"): TesisDurumu[] {
  return s.dunya.bolgeler.filter((b) => b.merkez !== undefined && b.sahip === oyuncu).flatMap((b) => b.tesisler);
}
const GUN3 = 72 * SAAT;

describe("yapi_yerlestir ve tesis_insa_hucre: yontem alanı", () => {
  it("yapi_yerlestir + yontem: inşaat kimliği taşır; bitince tesis o yöntemle başlar (kimlik -> indeks)", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    tamam(s, "a", yerlestir(grup(0), DEGIRMEN_T));
    expect(s.dunya.insaatlar).toHaveLength(1);
    expect(s.dunya.insaatlar[0]!.yontem).toBe(DEGIRMEN_T);
    s.calistirKadar(s.dunya.zaman + GUN3);
    expect(s.dunya.insaatlar).toHaveLength(0);
    const t = tesisler(s);
    expect(t).toHaveLength(1);
    expect(t[0]!.yontem).toBe(s.ic.yontemIndeks[DEGIRMEN_T]);
    expect(s.ic.yontemler[t[0]!.yontem]!.mulkKipi).toBe(true);
  });

  it("tesis_insa_hucre + yontem: aynı yol (arsa önceden alınır)", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    const g = grup(1);
    tamam(s, "a", { tur: "parsel_al", ilce: ILCE, hucreler: g, sinif: "kirsal" });
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: g, yontem: BAYRAKSIZ_T });
    expect(s.dunya.insaatlar[0]!.yontem).toBe(BAYRAKSIZ_T);
    s.calistirKadar(s.dunya.zaman + GUN3);
    expect(tesisler(s)[0]!.yontem).toBe(s.ic.yontemIndeks[BAYRAKSIZ_T]);
  });

  it("yontem yokken: tür varsayılanı (yontemler[0]); inşaat kaydında yontem alanı YOK (yalnız kullanılınca yazılır)", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    tamam(s, "a", yerlestir(grup(0)));
    expect("yontem" in s.dunya.insaatlar[0]!).toBe(false);
    s.calistirKadar(s.dunya.zaman + GUN3);
    expect(tesisler(s)[0]!.yontem).toBe(s.ic.yontemIndeks["standart_gida_isleme"]);
  });

  it("geriye uyum: yontem alanı olmadan eski komut, sentetik yöntemsiz içerikle AYNI sonuç ve durumOzeti verir", () => {
    const a = mulkSim(["a"], yontemliMulkVeri());
    const b = mulkSim(["a"], yontemliMulkVeri((v) => {
      // sentetik yöntemleri geri al
      v.icerik.yontemler = v.icerik.yontemler.filter((y) => ![DEGIRMEN_T, BAYRAKSIZ_T, KILITLI_T].includes(y.id));
      const gida = v.icerik.tesisTurleri.find((t) => t.id === "gida_fabrikasi")!;
      gida.yontemler = gida.yontemler.filter((y) => ![DEGIRMEN_T, BAYRAKSIZ_T, KILITLI_T].includes(y));
    }));
    for (const s of [a, b]) {
      tamam(s, "a", yerlestir(grup(0)));
      s.calistirKadar(s.dunya.zaman + GUN3);
    }
    expect(a.durumOzeti()).toBe(b.durumOzeti());
  });

  it("ek yapıda yontem reddedilir (YON-01); durum değişmez", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    s.calistirKadar(s.dunya.zaman); // bekleyen olaylar işlenmiş olsun (başarısız komut yalnız zamanı ilerletir)
    const once = s.durumOzeti();
    const r = ver(s, "a", yerlestir([grup(0)[0]!], DEGIRMEN_T, "ambar"));
    expect(r).toEqual({ tamam: false, hata: "yontem yalniz tesis turunde verilebilir: ambar" });
    expect(s.durumOzeti()).toBe(once);
  });

  it("bilinmeyen yöntem, türde olmayan yöntem, teknoloji şartı: yontem_degistir ile AYNI iletiler; reddedilen komut durumu değiştirmez", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    const g = grup(0);
    expect(ver(s, "a", yerlestir(g, "olmayan_yontem"))).toEqual({ tamam: false, hata: "bilinmeyen yontem: olmayan_yontem" });
    expect(ver(s, "a", yerlestir(g, "mekanize_tarim"))).toEqual({ tamam: false, hata: "yontem bu tesis turunde yok: mekanize_tarim" });
    expect(ver(s, "a", yerlestir(g, KILITLI_T))).toEqual({ tamam: false, hata: `yontem acik degil: ${KILITLI_T}` });
    for (const kotu of [5, null, {}, ["x"], true]) {
      const r = ver(s, "a", yerlestir(g, kotu));
      expect(r.tamam, JSON.stringify(kotu)).toBe(false);
    }
    expect(s.durumOzeti()).toBe(once);
    expect(s.dunya.insaatlar).toHaveLength(0);
    expect(s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a" && g.includes(h.id))).toHaveLength(0); // arsa da alınmadı (atomik)
    // tesis_insa_hucre: aynı iletiler
    const g2 = grup(1);
    tamam(s, "a", { tur: "parsel_al", ilce: ILCE, hucreler: g2, sinif: "kirsal" });
    s.calistirKadar(s.dunya.zaman);
    const once2 = s.durumOzeti();
    expect(ver(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: g2, yontem: "olmayan_yontem" })).toEqual({ tamam: false, hata: "bilinmeyen yontem: olmayan_yontem" });
    expect(s.durumOzeti()).toBe(once2);
  });

  it("teknoloji açılınca (otomasyon) kilitli yöntem seçilebilir (alan gerçekten denetlenir)", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    o.teknolojiler.push(s.ic.teknolojiIndeks["otomasyon"] as number);
    tamam(s, "a", yerlestir(grup(0), KILITLI_T));
    expect(s.dunya.insaatlar[0]!.yontem).toBe(KILITLI_T);
  });

  it("kendi tür listesinde olan yöntem başka türde reddedilir (yönteme ev sahibi tür bağlıdır)", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    const r = ver(s, "a", yerlestir(grup(0), DEGIRMEN_T, "ciftlik"));
    expect(r).toEqual({ tamam: false, hata: `yontem bu tesis turunde yok: ${DEGIRMEN_T}` });
  });
});

describe("inşaat yontem alanı: serileştirme ve doğrulama", () => {
  it("gidiş-dönüş: yontem kimliği korunur; yükleyen dünya ilerleyince tesis o yöntemle başlar", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    tamam(s, "a", yerlestir(grup(0), DEGIRMEN_T));
    const metin = dunyaSerilestir(s.dunya);
    expect(metin).toContain(`"yontem":"${DEGIRMEN_T}"`);
    const d = dunyaCoz(metin);
    expect(dunyaSerilestir(d)).toBe(metin);
    const y = Simulasyon.yukle(yontemliMulkVeri(), d, s.gunluk);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    s.calistirKadar(s.dunya.zaman + GUN3);
    y.calistirKadar(y.dunya.zaman + GUN3);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    expect(tesisler(y)[0]!.yontem).toBe(y.ic.yontemIndeks[DEGIRMEN_T]);
  });

  it("bozuk değer: dize olmayan yontem çözümde SerilestirmeHatasi", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    tamam(s, "a", yerlestir(grup(0), DEGIRMEN_T));
    const bozuk = dunyaSerilestir(s.dunya).replace(`"yontem":"${DEGIRMEN_T}"`, `"yontem":5`);
    expect(() => dunyaCoz(bozuk)).toThrow(SerilestirmeHatasi);
  });

  it("içerik uyumu: içerikte olmayan yöntem, türün listesinde olmayan yöntem ve ek yapı inşaatında yontem reddedilir", () => {
    const s = mulkSim(["a"], yontemliMulkVeri());
    tamam(s, "a", yerlestir(grup(0), DEGIRMEN_T));
    expect(() => dunyaIcerikUyumu(s.ic, s.dunya)).not.toThrow();
    const ins = s.dunya.insaatlar[0]!;
    ins.yontem = "yok_boyle";
    expect(() => dunyaIcerikUyumu(s.ic, s.dunya)).toThrow(/icerikte olmayan yontem: yok_boyle/);
    ins.yontem = "mekanize_tarim";
    expect(() => dunyaIcerikUyumu(s.ic, s.dunya)).toThrow(/yontem tesis turunde yok: mekanize_tarim/);
    ins.yontem = DEGIRMEN_T;
    ins.ekYapi = "ambar";
    expect(() => dunyaIcerikUyumu(s.ic, s.dunya)).toThrow(/yontem yalniz tesis turu insaatinda olabilir/);
  });
});

describe("mulkKipi süzgeci (icerikDerle): bölge kipinde süzülür, mülk kipinde görünür; indeksler sabit", () => {
  it("bölge kipi: mulkKipi yöntemi tür listesinde YOK, bayraksız olan VAR (karşıt kanıt); mülk kipi: ikisi de var; içerik nesnesine dokunulmaz", () => {
    const bolge = yontemliBolgeVeri();
    const tamIcerik = structuredClone(bolge.icerik);
    const ic = icerikDerle(bolge);
    const gida = ic.tesisTurleri[ic.tesisTuruIndeks["gida_fabrikasi"] as number]!;
    expect(gida.yontemler).toEqual(["standart_gida_isleme", BAYRAKSIZ_T, KILITLI_T]); // DEGIRMEN_T süzüldü
    // içerik nesnesi değişmedi (kopya)
    expect(bolge.icerik).toEqual(tamIcerik);
    expect(bolge.icerik.tesisTurleri.find((t) => t.id === "gida_fabrikasi")!.yontemler).toContain(DEGIRMEN_T);
    // mülk kipi: tam liste
    const mulk = icerikDerle(yontemliMulkVeri());
    expect(mulk.tesisTurleri[mulk.tesisTuruIndeks["gida_fabrikasi"] as number]!.yontemler).toEqual(["standart_gida_isleme", DEGIRMEN_T, BAYRAKSIZ_T, KILITLI_T]);
    // indeks ve kimlik tabloları iki kipte aynı sırada ve TAM (süzülmüş yöntem de indekslidir)
    expect(ic.yontemIndeks[DEGIRMEN_T]).toBe(mulk.yontemIndeks[DEGIRMEN_T]);
    expect(ic.yontemler.map((y) => y.id)).toEqual(bolge.icerik.yontemler.map((y) => y.id));
    expect(ic.yontemler).toHaveLength(mulk.yontemler.length);
    // diğer türler aynı referans (süzgeç yalnız etkilenen türü kopyalar)
    const ciftlik = ic.tesisTuruIndeks["ciftlik"] as number;
    expect(ic.tesisTurleri[ciftlik]).toBe(bolge.icerik.tesisTurleri[ciftlik]);
  });

  it("hiçbir yöntem mulkKipi değilse bugünkü dizi referansı aynen döner (bit bit aynı davranış)", () => {
    const v = miniVeriyiYukle();
    expect(icerikDerle(v).tesisTurleri).toBe(v.icerik.tesisTurleri);
  });

  it("bölge kipinde yontem_degistir: bayraklı yöntem reddedilir, bayraksız kabul edilir (süzgeç gerçekten etkili); mülk kipinde bayraklı yöntem seçilebilir", () => {
    const s = Simulasyon.olustur(yontemliBolgeVeri(), 3);
    tamam(s, SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] });
    tamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "gida_fabrikasi" });
    s.calistirKadar(s.dunya.zaman + 24 * SAAT);
    const ts = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!.tesisler.find((t) => t.tur === s.ic.tesisTuruIndeks["gida_fabrikasi"])!;
    expect(ts).toBeDefined();
    const once = s.durumOzeti();
    expect(ver(s, "a", { tur: "yontem_degistir", bolge: "m_ova", tesis: ts.id, yontem: DEGIRMEN_T })).toEqual({ tamam: false, hata: `yontem bu tesis turunde yok: ${DEGIRMEN_T}` });
    expect(s.durumOzeti()).toBe(once);
    tamam(s, "a", { tur: "yontem_degistir", bolge: "m_ova", tesis: ts.id, yontem: BAYRAKSIZ_T });
    expect(ts.yontem).toBe(s.ic.yontemIndeks[BAYRAKSIZ_T]);
    expect(s.durumOzeti()).not.toBe(once); // negatif kontrol: bayraksız yöntem dünyayı değiştirir
  });
});
