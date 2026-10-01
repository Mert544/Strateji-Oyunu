/**
 * Para güvenliği (docs/06 §15.7): ödül (`sistem_odul`), "para alanı taşıyan sistem komutu yok" ilkesi, kamu kasaları ve kaynak dağılımı,
 * PARA KORUNUMU (tohumlu rastgele mülk koşusunda her kontrol noktasında tamsayıda tam eşitlik), kamu NPC alıcısı ve fiyat tavanı,
 * ayrılmış hücre kuralı.
 */
import { parselFiksturuYukle } from "@bolge/veri";
import type { ParselFiksturu } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { KOMUT_SEMASI, SISTEM_ALAN_TURLERI, sistemKomutuMu } from "../src/komutSemasi";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { miniVeriyiYukle } from "@bolge/veri";
import { alinanOdulDegeri, odulDegeri } from "../src/odul";
import { icerikDerle } from "../src/derle";
import { hucreFiyatiMili, mulkOyuncuBul, parselToplamFiyatiMili } from "../src/mulk";
import { kamuIlKimligi, kamuIlceKimligi, kamuMahalleKimligi } from "../src/mulk/kamu";
import {
  dugumIlcesi,
  kamuAlici,
  kamuFiyatGecerli,
  kamuFiyatTavani,
  kamuOdenekIptal,
  kamuOdenekOde,
  kamuOdenekRezerv,
  kasaBakiyesi,
  kasaBul,
  kasaGirisi,
  paraUzlastir,
} from "../src/mulk/kasa";
import { ithalatKirilimi, ticaretCarpanlari, ticaretNakitCarpanlari } from "../src/pazar";
import { sayacOlcekli } from "../src/paraSayac";
import { dunyaCoz, dunyaIcerikUyumu, dunyaSerilestir, SerilestirmeHatasi } from "../src/serilestir";
import { aralik, prngOlustur } from "../src/prng";
import { anlikHazine, anlikMiktar, hazineEkle, oyuncuBul } from "../src/stok";
import { DAKIKA, GUN, LAVABO_KALEMLERI, MUSLUK_KALEMLERI, PPM, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, Komut, KomutTuru, ParaDurumu, ParaSayaci } from "../src/tipler";
import { bitisikCift, mulkSim, mulkVeriTam, tamam, ver } from "./mulk-yardimci";

const F: ParselFiksturu = parselFiksturuYukle("mini-6");
const OVA = "sn_m_ova_merkez";
const LIMAN = "sn_m_liman_merkez";
const SEHIR = "sn_m_sehir_merkez";

/** Kalkansız (komisyon/tarife işler), bol hibeli ve indirimsiz oyuncu paketi; kamu arsası kapalı (mulkVeriTam). */
function para(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 2_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000, tahil: 200_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.yeniOyuncu.yurtHucre = 0;
    m.yeniOyuncu.kalkanGun = 0;
    m.esZamanliInsaat = 10;
    duzenle?.(v);
  });
}

/** Sistem komutu (yönetici yolu). */
function sistemVer(s: Simulasyon, komut: Komut) {
  return s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut });
}

function hucreler(ilce: string, sinif: "kirsal" | "kasaba" | "sehir"): string[] {
  return F.ilceler.find((c) => c.id === ilce)!.hucreler.filter((h) => h.uygun && h.sinif === sinif).map((h) => h.id);
}

// ---------------------------------------------------------------------------
// KORUNUM
// ---------------------------------------------------------------------------

interface Korunum {
  /** Σ oyuncu hazinesi (SAAT ölçekli). */
  hazine: bigint;
  /** Σ kasa bakiyesi (giriş − çıkış; rezerv kasadadır). */
  kasa: bigint;
  /** Σ lavabo. */
  lavabo: bigint;
  /** Σ musluk. */
  musluk: bigint;
}

/** Her şeyi d.zaman'a uzlaştırır ve SAAT ile ölçeklenmiş kesin tamsayı toplamlarını döndürür. */
function korunumOlc(s: Simulasyon): Korunum {
  const d = s.dunya;
  paraUzlastir(d, s.ic);
  const p = d.mulk!.para as ParaDurumu;
  let hazine = 0n;
  for (const o of d.oyuncular) {
    expect(o.hazine.t0).toBe(d.zaman);
    hazine += BigInt(o.hazine.miktar) * BigInt(SAAT) + BigInt(o.hazine.artik);
  }
  let kasa = 0n;
  for (const k of p.kasalar) {
    for (const kalem of Object.keys(k.giris) as (keyof typeof k.giris)[]) kasa += sayacOlcekli(k.giris[kalem] as ParaSayaci); // isteğe bağlı `sebeke` anahtarı varsa o da toplanır
    kasa -= BigInt(k.cikisOyuncu + k.cikisNpc) * BigInt(SAAT);
  }
  let lavabo = 0n;
  for (const k of LAVABO_KALEMLERI) lavabo += sayacOlcekli(p.lavabo[k]);
  if (p.lavabo.sebeke !== undefined) lavabo += sayacOlcekli(p.lavabo.sebeke); // isteğe bağlı (şebeke; G6) kalem de toplanır
  let musluk = 0n;
  for (const k of MUSLUK_KALEMLERI) musluk += sayacOlcekli(p.musluk[k]);
  if (p.musluk.yerelNpc !== undefined) musluk += sayacOlcekli(p.musluk.yerelNpc); // isteğe bağlı (yerel pazar; G7-2) kalem de toplanır
  return { hazine, kasa, lavabo, musluk };
}

function korunumTutar(s: Simulasyon, nerede: string): Korunum {
  const k = korunumOlc(s);
  // Σ hazine + Σ kasa + Σ lavabo = Σ musluk (tamsayı, kesin)
  if (k.hazine + k.kasa + k.lavabo !== k.musluk) {
    throw new Error(`para korunumu bozuldu (${nerede}, t=${s.dunya.zaman}): hazine ${k.hazine} + kasa ${k.kasa} + lavabo ${k.lavabo} = ${k.hazine + k.kasa + k.lavabo} != musluk ${k.musluk}`);
  }
  return k;
}

interface KosuSonucu {
  basarili: Record<string, number>;
  basarisiz: number;
}

const TESISLER = ["ciftlik", "ahir", "gida_fabrikasi", "celikhane", "cevher_madeni", "komur_ocagi"];
const MALLAR = ["tahil", "gida", "celik", "parca"];
const ILCELER: { id: string; il: string; siniflar: ("kirsal" | "kasaba" | "sehir")[] }[] = [
  { id: OVA, il: "sn_m_ova", siniflar: ["kirsal", "kasaba"] },
  { id: LIMAN, il: "sn_m_liman", siniflar: ["kirsal", "kasaba"] },
  { id: SEHIR, il: "sn_m_sehir", siniflar: ["kirsal", "kasaba", "sehir"] },
];

/** Tohumlu rastgele mülk koşusu: komutlar ve kontrol noktaları rastgele aralıklarla; her kontrol noktasında korunum denetlenir. */
function rastgeleKosu(tohum: number, adim: number, kontrol: boolean): { s: Simulasyon; sonuc: KosuSonucu } {
  const v = para((x) => {
    x.param.mulk!.araziVergisiHaftalikPpm = 100_000; // vergi kaynağı belirgin olsun
  });
  const s = mulkSim(["a", "b", "c"], v, tohum);
  const rng = prngOlustur(tohum, "para-korunum");
  const sonuc: KosuSonucu = { basarili: {}, basarisiz: 0 };
  const oyuncular = ["a", "b", "c"];
  const say = (tur: string, r: { tamam: boolean }) => {
    if (r.tamam) sonuc.basarili[tur] = (sonuc.basarili[tur] ?? 0) + 1;
    else sonuc.basarisiz++;
  };
  const odulKavramlari = ["ilk_yapi", "ilk_satis", "ilk_isleme", "ikinci_ilce"];
  for (let i = 0; i < adim; i++) {
    const dt = (aralik(rng, 90) + 1) * DAKIKA;
    s.calistirKadar(s.dunya.zaman + dt);
    if (aralik(rng, 3) === 0 && kontrol) korunumTutar(s, `adim ${i} oncesi`);
    const o = oyuncular[aralik(rng, oyuncular.length)] as string;
    const d = s.dunya;
    const secim = aralik(rng, 10);
    const mo = mulkOyuncuBul(d, o);
    const sahip = d.mulk!.hucreler.filter((h) => h.sahip === o);
    if (secim <= 2) {
      const c = ILCELER[aralik(rng, ILCELER.length)] as (typeof ILCELER)[number];
      const sinif = c.siniflar[aralik(rng, c.siniflar.length)] as "kirsal" | "kasaba" | "sehir";
      const l = hucreler(c.id, sinif);
      const ad = 1 + aralik(rng, 4);
      const bas = aralik(rng, Math.max(1, l.length - ad));
      say("parsel_al", ver(s, o, { tur: "parsel_al", ilce: c.id, hucreler: l.slice(bas, bas + ad), sinif }));
    } else if (secim === 3 && sahip.length >= 2) {
      const ilce = (sahip[aralik(rng, sahip.length)] as (typeof sahip)[number]).ilce;
      const ids = sahip.filter((h) => h.ilce === ilce).map((h) => h.id);
      try {
        const cift = bitisikCift(ids);
        const t = TESISLER[aralik(rng, TESISLER.length)] as string;
        say("tesis_insa_hucre", ver(s, o, { tur: "tesis_insa_hucre", ilce, tesisTuru: t, hucreler: cift }));
      } catch {
        sonuc.basarisiz++;
      }
    } else if (secim === 4 || secim === 5) {
      const c = ILCELER[aralik(rng, ILCELER.length)] as (typeof ILCELER)[number];
      const mal = MALLAR[aralik(rng, MALLAR.length)] as string;
      const yon = aralik(rng, 2) === 0 ? "ithalat" : "ihracat";
      const oranSaat = aralik(rng, 4) === 0 ? 0 : (1 + aralik(rng, 60)) * 1000;
      say(`ticaret_${yon}`, ver(s, o, { tur: "ticaret_emri", bolge: `${c.il}#${o}`, mal, yon, oranSaat }));
    } else if (secim === 6 && sahip.length > 0) {
      const h = sahip[aralik(rng, sahip.length)] as (typeof sahip)[number];
      say("parsel_birak", ver(s, o, { tur: "parsel_birak", ilce: h.ilce, hucreler: [h.id] }));
    } else if (secim === 7 && mo !== undefined) {
      const ins = d.insaatlar.filter((x) => x.sahip === o);
      if (ins.length > 0) say("insaat_iptal", ver(s, o, { tur: "insaat_iptal", insaat: (ins[0] as (typeof ins)[number]).id }));
    } else if (secim === 8) {
      const kav = odulKavramlari[aralik(rng, odulKavramlari.length)] as string;
      say("sistem_odul", sistemVer(s, { tur: "sistem_odul", oyuncu: o, kavram: kav }));
    } else if (secim === 9) {
      const tk = s.ic.icerik.teknolojiler[aralik(rng, s.ic.icerik.teknolojiler.length)];
      if (tk !== undefined) say("arastir", ver(s, o, { tur: "arastir", teknoloji: tk.id }));
    }
    if (aralik(rng, 3) === 0 && kontrol) korunumTutar(s, `adim ${i} sonrasi`);
  }
  return { s, sonuc };
}

describe("PARA KORUNUMU: Σ hazine + Σ kasa + Σ lavabo = Σ musluk (tamsayı, tam)", () => {
  for (const tohum of [11, 2024, 90210]) {
    it(`tohumlu rastgele mülk koşusu (tohum ${tohum}): her kontrol noktasında eşitlik tam tutar; koşu çeşitli kaynakları gerçekten kullanır`, () => {
      const { s, sonuc } = rastgeleKosu(tohum, 140, true);
      const son = korunumTutar(s, "son");
      expect(son.musluk).toBeGreaterThan(0n);
      // Koşu anlamlı: hem alım hem satım, hem ithalat hem ihracat, hem ödül çalıştı
      expect(sonuc.basarili["parsel_al"]).toBeGreaterThan(3);
      expect(sonuc.basarili["sistem_odul"]).toBeGreaterThan(0);
      const p = s.dunya.mulk!.para!;
      expect(sayacOlcekli(p.musluk.hibe)).toBe(BigInt(3 * 2_000_000_000) * BigInt(SAAT));
      expect(p.lavabo.arsa.n).toBeGreaterThan(0);
      expect(p.lavabo.araziVergisi.n + p.lavabo.isletme.n).toBeGreaterThan(0);
    });
  }

  it("uzlaştırma NÖTRDÜR: sık kontrol noktalı koşu ile hiç kontrol noktasız koşu aynı sayaçları verir (kayıpsız n + a/SAAT)", () => {
    const sikli = rastgeleKosu(77, 120, true);
    const seyrek = rastgeleKosu(77, 120, false);
    expect(sikli.s.dunya.zaman).toBe(seyrek.s.dunya.zaman);
    const a = korunumTutar(sikli.s, "sikli");
    const b = korunumTutar(seyrek.s, "seyrek");
    expect(a).toEqual(b);
    const pa = sikli.s.dunya.mulk!.para!;
    const pb = seyrek.s.dunya.mulk!.para!;
    for (const k of MUSLUK_KALEMLERI) expect(sayacOlcekli(pa.musluk[k])).toBe(sayacOlcekli(pb.musluk[k]));
    for (const k of LAVABO_KALEMLERI) expect(sayacOlcekli(pa.lavabo[k])).toBe(sayacOlcekli(pb.lavabo[k]));
    expect(pa.kasalar.map((k) => k.sahip)).toEqual(pb.kasalar.map((k) => k.sahip));
    for (let i = 0; i < pa.kasalar.length; i++) {
      expect(kasaGirisi(pa.kasalar[i]!)).toBe(kasaGirisi(pb.kasalar[i]!));
    }
  });

  it("hazine kelepçesi (negatif bakiye 0'a) silinen borcu musluğa yazar; korunum yine tam tutar", () => {
    const v = para((x) => {
      x.param.mulk!.yeniOyuncu.hibe = 1_000_000;
      x.param.mulk!.araziVergisiHaftalikPpm = 1_000_000; // hazine 0'a iner
    });
    const s = mulkSim(["a"], v, 5);
    const l = hucreler(OVA, "kirsal");
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: l.slice(0, 1), sinif: "kirsal" });
    s.calistirKadar(s.dunya.zaman + 30 * GUN);
    const k = korunumTutar(s, "kelepce");
    expect(anlikHazine(s.dunya, "a")).toBe(0);
    expect(sayacOlcekli(s.dunya.mulk!.para!.musluk.borcSilme)).toBeGreaterThan(0n);
    expect(k.hazine + k.kasa + k.lavabo).toBe(k.musluk);
  });
});

describe("koşu kapsamı (korunum testinin gerçekten sınadığı kaynaklar)", () => {
  it("rastgele koşu ithalat ve ihracat emri, ödül, vergi ve ithalat kasası, parsel bırakma ve işletme gideri içerir", () => {
    const toplam: Record<string, number> = {};
    let kasaVergi = 0;
    let kasaIth = 0;
    let ihracat = 0n;
    let ithalat = 0n;
    let iade = 0n;
    for (const tohum of [11, 2024, 90210, 77]) {
      const { s, sonuc } = rastgeleKosu(tohum, 140, false);
      korunumTutar(s, "kapsam");
      for (const [k, n] of Object.entries(sonuc.basarili)) toplam[k] = (toplam[k] ?? 0) + n;
      const p = s.dunya.mulk!.para!;
      for (const k of p.kasalar) {
        kasaVergi += k.giris.vergi.n;
        kasaIth += k.giris.ithalatMakas.n + k.giris.ithalatKomisyon.n;
      }
      ihracat += sayacOlcekli(p.musluk.ihracatNpc);
      ithalat += sayacOlcekli(p.lavabo.ithalatNpc);
      iade += sayacOlcekli(p.musluk.iade);
    }
    for (const tur of ["parsel_al", "parsel_birak", "tesis_insa_hucre", "ticaret_ithalat", "ticaret_ihracat", "sistem_odul", "arastir"]) {
      expect(toplam[tur] ?? 0, tur).toBeGreaterThan(0);
    }
    expect(kasaVergi).toBeGreaterThan(0);
    expect(kasaIth).toBeGreaterThan(0);
    expect(ihracat).toBeGreaterThan(0n);
    expect(ithalat).toBeGreaterThan(0n);
    expect(iade).toBeGreaterThan(0n);
  });

  it("test duyarlıdır: defter dışı para (hazineye doğrudan yazılan) korunumu bozar; defterli giriş bozmaz", () => {
    const s = mulkSim(["a"], para(), 3);
    s.calistirKadar(s.dunya.zaman + GUN);
    korunumTutar(s, "temiz");
    expect(hazineEkle(s.dunya, "a", 1_000, "odul")).toBe(true); // defterli (musluk.odul)
    korunumTutar(s, "defterli");
    oyuncuBul(s.dunya, "a")!.hazine.miktar += 1; // defter dışı
    expect(() => korunumTutar(s, "sizinti")).toThrow(/para korunumu bozuldu/);
  });
});

// ---------------------------------------------------------------------------
// KOMUT ALAN SÖZLÜĞÜ: para/miktar taşıyan sistem komutu yok
// ---------------------------------------------------------------------------

describe("komut alan sözlüğü (KOMUT_SEMASI)", () => {
  const turler = Object.keys(KOMUT_SEMASI) as KomutTuru[];

  it("sistem yolundaki komutlar yalnız kimlik, seçim ve bayrak alanı taşır (miktar/oran/adet YOK)", () => {
    const sistem = turler.filter((t) => sistemKomutuMu(t)).sort();
    expect(sistem).toEqual(["marka_sifirla", "oyuncu_katil", "sistem_odul"]); // marka_sifirla (G7 moderasyon): yalnız {oyuncu: kimlik, marka: secim}
    for (const t of sistem) {
      for (const [alan, tur] of Object.entries(KOMUT_SEMASI[t].alanlar)) {
        expect(SISTEM_ALAN_TURLERI, `${t}.${alan}`).toContain(tur);
      }
    }
    expect(SISTEM_ALAN_TURLERI).toEqual(["kimlik", "secim", "bayrak"]);
  });

  it("miktar / oran / adet taşıyan komutların açık listesi: hepsi OYUNCU yolundadır ve yalnız oyuncunun kendi ekonomisini yönetir", () => {
    const tasiyan: Record<string, string[]> = {};
    for (const t of turler) {
      for (const [alan, tur] of Object.entries(KOMUT_SEMASI[t].alanlar)) {
        // `metin` (marka adı; G7) miktar/oran/adet DEĞİLDİR: ayrı sınanır (yalnız `marka_tanimla.ad`, yalnız oyuncu yolunda).
        if (!SISTEM_ALAN_TURLERI.includes(tur) && tur !== "metin") (tasiyan[t] ??= []).push(`${alan}:${tur}`);
      }
    }
    const metinler = turler.flatMap((t) => Object.entries(KOMUT_SEMASI[t].alanlar).filter(([, tur]) => tur === "metin").map(([alan]) => `${t}.${alan}`));
    expect(metinler).toEqual(["marka_tanimla.ad"]);
    expect(KOMUT_SEMASI.marka_tanimla.yol).toBe("oyuncu");
    expect(tasiyan).toEqual({
      ticaret_emri: ["oranSaat:miktar"],
      vergi_ayarla: ["oranPpm:oran"],
      ekim_plani: ["ekimPpm:oran"],
      askeri_rezerv: ["oranPpm:oran"],
      birlik_uret: ["adet:adet"],
    });
    for (const t of Object.keys(tasiyan)) expect(KOMUT_SEMASI[t as KomutTuru].yol).toBe("oyuncu");
  });

  it("sistem_odul komutunun alanları tutar taşımaz: yalnız {oyuncu, kavram}", () => {
    expect(Object.keys(KOMUT_SEMASI.sistem_odul.alanlar).sort()).toEqual(["kavram", "oyuncu"]);
  });

  it("motor yolu sözlüğe uyar: sistem komutunu oyuncu veremez; oyuncu komutunu sistem veremez", () => {
    const s = mulkSim(["a"], para(), 4);
    const d = s.dunya;
    s.calistirKadar(s.dunya.zaman); // bekleyen olaylar işlensin (komutlar önce zamanı ilerletir)
    const once = s.durumOzeti();
    const r1 = ver(s, "a", { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" });
    expect(r1).toEqual({ tamam: false, hata: "sistem_odul yalnizca 'sistem' ile verilebilir" });
    const r2 = ver(s, "a", { tur: "oyuncu_katil", oyuncu: "x", bolgeler: [] });
    expect(r2.tamam).toBe(false);
    const r3 = sistemVer(s, { tur: "vergi_ayarla", oranPpm: 1 });
    expect(r3.tamam).toBe(false);
    expect(s.durumOzeti()).toBe(once);
    expect(d.mulk!.para!.musluk.odul.n).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ÖDÜL
// ---------------------------------------------------------------------------

describe("ödül (sistem_odul)", () => {
  const ODUL = { ilk_satis: 500_000, ilk_yapi: 600_000 }; // ilk_yapi: 5000 çelik × 120000 / 1000

  it("ödül değeri = para + Σ mal × tabanFiyat/MILI; varsayılan tablo tavanın altında", () => {
    const s = mulkSim(["a"], para(), 1);
    expect(odulDegeri(s.ic, "ilk_satis")).toBe(ODUL.ilk_satis);
    expect(odulDegeri(s.ic, "ilk_yapi")).toBe(ODUL.ilk_yapi);
    expect(odulDegeri(s.ic, "yok")).toBeUndefined();
    expect(odulDegeri(s.ic, "toString")).toBeUndefined(); // prototip anahtarı kavram değildir
    const tum = Object.keys(s.ic.param.odul!.kavramlar).reduce((t, k) => t + odulDegeri(s.ic, k)!, 0);
    expect(tum).toBeLessThanOrEqual(s.ic.param.odul!.tavanMili);
  });

  it("mülk kipi: para hazineye girer ve musluk.odul'a yazılır; mal ilk işletme düğümünün stoğuna girer; alinanOdul sıralı", () => {
    const s = mulkSim(["a"], mulkVeriTam((v) => {
      v.param.mulk!.yeniOyuncu.ayrilmisHucrePpm = 0;
    }), 2); // yurt (6 hücre) açık: işletme düğümü var
    const d = s.dunya;
    const celik = s.ic.malIndeks["celik"]!;
    const b = d.bolgeler[mulkOyuncuBul(d, "a") ? d.mulk!.isletmeler.find((e) => e.oyuncu === "a")!.bolgeIndeksi : 0]!;
    const h0 = anlikHazine(d, "a");
    const c0 = anlikMiktar(b.stoklar[celik]!, d.zaman);
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_yapi" })).toEqual({ tamam: true });
    expect(anlikMiktar(b.stoklar[celik]!, d.zaman) - c0).toBe(5000);
    expect(anlikHazine(d, "a")).toBe(h0); // yalnız mal
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" }).tamam).toBe(true);
    expect(anlikHazine(d, "a") - h0).toBe(500_000);
    expect(sayacOlcekli(d.mulk!.para!.musluk.odul)).toBe(BigInt(500_000) * BigInt(SAAT));
    expect(oyuncuBul(d, "a")!.alinanOdul).toEqual(["ilk_satis", "ilk_yapi"]); // sıralı, tekil
    expect(alinanOdulDegeri(s.ic, oyuncuBul(d, "a")!)).toBe(ODUL.ilk_satis + ODUL.ilk_yapi);
    korunumTutar(s, "odul");
  });

  it("kavram başına bir kez: ikinci alım reddedilir ve hiçbir şeyi (özet dahil) değiştirmez", () => {
    const s = mulkSim(["a"], mulkVeriTam(), 2);
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" }).tamam).toBe(true);
    s.calistirKadar(s.dunya.zaman); // bekleyen olaylar işlensin (komutlar önce zamanı ilerletir)
    const once = s.durumOzeti();
    const r = sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" });
    expect(r).toEqual({ tamam: false, hata: "odul zaten alinmis: ilk_satis" });
    expect(s.durumOzeti()).toBe(once);
  });

  it("bilinmeyen kavram, bilinmeyen oyuncu, tablo yok: reddedilir, durum değişmez", () => {
    const s = mulkSim(["a"], mulkVeriTam(), 2);
    s.calistirKadar(s.dunya.zaman); // bekleyen olaylar işlensin (komutlar önce zamanı ilerletir)
    const once = s.durumOzeti();
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "yok_kavram" })).toEqual({ tamam: false, hata: "bilinmeyen odul kavrami: yok_kavram" });
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "z", kavram: "ilk_satis" })).toEqual({ tamam: false, hata: "bilinmeyen oyuncu: z" });
    expect(s.durumOzeti()).toBe(once);
    const t = mulkSim(["a"], mulkVeriTam((v) => delete v.param.odul), 2);
    expect(sistemVer(t, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" })).toEqual({ tamam: false, hata: "odul tablosu yok" });
  });

  it("oyuncu başına toplam ödül tavanı (tavanMili): aşan kavram reddedilir, tavan altı olan alınır", () => {
    const s = mulkSim(["a"], mulkVeriTam((v) => {
      v.param.odul = {
        surum: 1,
        tavanMili: 1_000_000,
        kavramlar: { ilk: { para: 600_000 }, ikinci: { para: 500_000 }, kucuk: { para: 400_000 } },
      };
    }), 2);
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk" }).tamam).toBe(true);
    const r = sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ikinci" });
    expect(r).toEqual({ tamam: false, hata: "odul tavani asilir: 1100000 > 1000000" });
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "kucuk" }).tamam).toBe(true); // tam tavan (1 000 000) kabul
    expect(alinanOdulDegeri(s.ic, oyuncuBul(s.dunya, "a")!)).toBe(1_000_000);
    expect(sayacOlcekli(s.dunya.mulk!.para!.musluk.odul)).toBe(BigInt(1_000_000) * BigInt(SAAT));
  });

  it("mülk kipinde işletme düğümü yoksa mal ödülü reddedilir (para ödülü alınır)", () => {
    const s = mulkSim(["a"], para(), 2); // yurt yok, parsel de yok: işletme düğümü yok
    expect(s.dunya.mulk!.isletmeler.filter((e) => e.oyuncu === "a")).toHaveLength(0);
    s.calistirKadar(s.dunya.zaman); // bekleyen olaylar işlensin (komutlar önce zamanı ilerletir)
    const once = s.durumOzeti();
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_yapi" })).toEqual({ tamam: false, hata: "odul malini alacak isletme/bolge yok: a" });
    expect(s.durumOzeti()).toBe(once);
    expect(sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" }).tamam).toBe(true);
  });

  it("bölge kipi (mülk yok): para ve mal ilk bölgeye girer; para defteri yoktur", () => {
    const s = Simulasyon.olustur(miniVeriyiYukle(), 3);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    const d = s.dunya;
    const celik = s.ic.malIndeks["celik"]!;
    const b = d.bolgeler[s.ic.bolgeIndeks["m_ova"]!]!;
    const h0 = anlikHazine(d, "a");
    const c0 = anlikMiktar(b.stoklar[celik]!, d.zaman);
    expect(s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_yapi" } }).tamam).toBe(true);
    expect(s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" } }).tamam).toBe(true);
    expect(anlikMiktar(b.stoklar[celik]!, d.zaman) - c0).toBe(5000);
    expect(anlikHazine(d, "a") - h0).toBe(500_000);
    expect(d.mulk).toBeUndefined();
  });

  it("ödül tablosu derleme zamanında doğrulanır: kozmetik/boş kavram, bilinmeyen mal, tek başına tavan aşımı, kasa payı toplamı > PPM", () => {
    const dene = (duzenle: (v: CekirdekVeriPaketi) => void) => () => icerikDerle(mulkVeriTam(duzenle));
    expect(dene((v) => (v.param.odul!.kavramlar["unvan"] = {}))).toThrow(/para ya da mal tasimali/);
    expect(dene((v) => (v.param.odul!.kavramlar["x"] = { mal: { yok_mal: 5 } }))).toThrow(/bilinmeyen mal: yok_mal/);
    expect(dene((v) => (v.param.odul!.kavramlar["buyuk"] = { para: v.param.odul!.tavanMili + 1 }))).toThrow(/tek basina tavani asiyor/);
    expect(dene((v) => (v.param.mulk!.kasa!.vergiPayi = { mahallePpm: 500_000, ilcePpm: 400_000, ilPpm: 150_000 }))).toThrow(/vergiPayi toplami/);
    expect(dene(() => undefined)).not.toThrow();
  });

  it("ödüllü koşu yeniden oynatılınca aynı özet (günlük yalnız başarılı komutlar)", () => {
    const kos = () => {
      const s = mulkSim(["a", "b"], mulkVeriTam(), 6);
      sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" });
      sistemVer(s, { tur: "sistem_odul", oyuncu: "a", kavram: "ilk_satis" }); // reddedilir
      sistemVer(s, { tur: "sistem_odul", oyuncu: "b", kavram: "ilk_yapi" });
      s.calistirKadar(s.dunya.zaman + 2 * GUN);
      return s.durumOzeti();
    };
    expect(kos()).toBe(kos());
  });
});

// ---------------------------------------------------------------------------
// KASA KAYNAKLARI
// ---------------------------------------------------------------------------

/** Kasa girişini kalem toplamıyla SAAT ölçekli döndürür. */
function kasaOlcekli(s: Simulasyon, sahip: string, kalem: "vergi" | "ithalatMakas" | "ithalatKomisyon"): bigint {
  const k = kasaBul(s.dunya.mulk!.para!, sahip);
  return k === undefined ? 0n : sayacOlcekli(k.giris[kalem]);
}

function carp(x: number, p: number): number {
  return Math.floor((x * p) / PPM);
}

describe("kamu kasaları: kaynaklar yalnız ZATEN YANAN paradır", () => {
  /** a: ova_merkez'de 4, liman_merkez'de 3 kasaba hücresi; vergi %10/hafta. */
  function vergiSenaryosu() {
    const s = mulkSim(["a"], para((v) => (v.param.mulk!.araziVergisiHaftalikPpm = 100_000)), 21);
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: hucreler(OVA, "kasaba").slice(0, 4), sinif: "kasaba" });
    tamam(s, "a", { tur: "parsel_al", ilce: LIMAN, hucreler: hucreler(LIMAN, "kasaba").slice(0, 3), sinif: "kasaba" });
    s.calistirKadar(s.dunya.zaman + GUN);
    return s;
  }

  it("arazi vergisi: %20 mahalle havuzu / %40 ilçe / %15 il, oyuncunun ilçelerine hücre sayısıyla orantılı; %25 yanar", () => {
    const s = vergiSenaryosu();
    const d = s.dunya;
    const akis = mulkOyuncuBul(d, "a")!.paraAkisi!;
    expect(akis.vergi).toBeGreaterThan(0);
    // Beklenen oranlar: ilçelere hücre sayısıyla (4:3; artık ilk ilçeye = kimliğe göre ilki: liman), her pay %20/%40/%15
    const hucre: [string, number][] = [[LIMAN, 3], [OVA, 4]];
    const pay = hucre.map(([, n]) => Math.floor((akis.vergi * n) / 7));
    pay[0] = pay[0]! + (akis.vergi - pay[0]! - pay[1]!);
    const beklenen = new Map<string, number>();
    hucre.forEach(([ilce], i) => {
      const il = F.ilceler.find((c) => c.id === ilce)!.il;
      for (const [sahip, ppm] of [[kamuMahalleKimligi(ilce), 200_000], [kamuIlceKimligi(ilce), 400_000], [kamuIlKimligi(il), 150_000]] as [string, number][]) {
        beklenen.set(sahip, (beklenen.get(sahip) ?? 0) + carp(pay[i]!, ppm));
      }
    });
    const gercek = new Map(akis.kasa.filter((e) => e.kalem === "vergi").map((e) => [e.sahip, e.oran]));
    // (iki ilçe farklı ilde: il kasaları ayrı)
    expect([...gercek.keys()].sort()).toEqual([...beklenen.keys()].sort());
    for (const [sahip, oran] of beklenen) expect(gercek.get(sahip), sahip).toBe(oran);
    // Kasalara giden toplam ≈ %75 (yuvarlama payı ≤ 6 mili/saat); kalan %25 yanar
    const kasaToplam = [...gercek.values()].reduce((a, b) => a + b, 0);
    expect(Math.abs(kasaToplam - carp(akis.vergi, 750_000))).toBeLessThanOrEqual(6);
    // Kasa girişi = oran × süre (kesin, SAAT ölçekli); yanan kısım lavabo.araziVergisi
    paraUzlastir(d, s.ic);
    const t1 = d.zaman;
    const k1 = new Map([...gercek.keys()].map((k) => [k, kasaOlcekli(s, k, "vergi")]));
    const yan1 = sayacOlcekli(d.mulk!.para!.lavabo.araziVergisi);
    s.calistirKadar(t1 + 3 * GUN);
    paraUzlastir(d, s.ic);
    const dt = BigInt(d.zaman - t1);
    for (const [sahip, oran] of gercek) expect(kasaOlcekli(s, sahip, "vergi") - k1.get(sahip)!, sahip).toBe(BigInt(oran) * dt);
    expect(sayacOlcekli(d.mulk!.para!.lavabo.araziVergisi) - yan1).toBe(BigInt(akis.vergi - kasaToplam) * dt);
    korunumTutar(s, "vergi kasasi");
  });

  it("ithalat makasının %20'si ve komisyonunun %50'si oyuncunun o ildeki en çok hücreli ilçesinin kasasına; kalanı yanar", () => {
    const s = mulkSim(["a"], para(), 22);
    const TASRA = "sn_m_ova_tasra";
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: hucreler(OVA, "kirsal").slice(0, 2), sinif: "kirsal" });
    tamam(s, "a", { tur: "parsel_al", ilce: TASRA, hucreler: hucreler(TASRA, "kirsal").slice(0, 3), sinif: "kirsal" });
    const d = s.dunya;
    expect(dugumIlcesi(d, s.ic, "a", "sn_m_ova#a")).toBe(TASRA); // 3 > 2 hücre
    tamam(s, "a", { tur: "ticaret_emri", bolge: "sn_m_ova#a", mal: "gida", yon: "ithalat", oranSaat: 50_000 });
    s.calistirKadar(d.zaman + GUN);
    const o = oyuncuBul(d, "a")!;
    expect(o.ticaretDefteri!.oran.makas).toBeGreaterThan(0);
    expect(o.ticaretDefteri!.oran.komisyon).toBeGreaterThan(0);
    const akis = mulkOyuncuBul(d, "a")!.paraAkisi!;
    const makas = akis.kasa.find((e) => e.kalem === "ithalatMakas");
    const kom = akis.kasa.find((e) => e.kalem === "ithalatKomisyon");
    expect(makas?.sahip).toBe(kamuIlceKimligi(TASRA));
    expect(kom?.sahip).toBe(kamuIlceKimligi(TASRA));
    expect(makas!.oran).toBe(carp(o.ticaretDefteri!.oran.makas, 200_000));
    expect(kom!.oran).toBe(carp(o.ticaretDefteri!.oran.komisyon, 500_000));
    // Lavabo (NPC ithalat tahsilatı) = ithalat nakit gideri − kasa payları
    expect(akis.ithalat).toBeGreaterThan(makas!.oran + kom!.oran);
    korunumTutar(s, "ithalat kasasi");
  });

  it("İHRACAT tarafı ASLA kaynak değildir: yalnız ihracat yapan oyuncunun ithalat kasası girişi sıfırdır; para yeni basılmıştır (musluk.ihracatNpc)", () => {
    const s = mulkSim(["a"], para((v) => (v.param.mulk!.yeniOyuncu.baslangicStok["tahil"] = 5_000_000)), 23); // 2 gün ihracata yetecek stok
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: hucreler(OVA, "kirsal").slice(0, 2), sinif: "kirsal" });
    tamam(s, "a", { tur: "ticaret_emri", bolge: "sn_m_ova#a", mal: "tahil", yon: "ihracat", oranSaat: 20_000 });
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    const d = s.dunya;
    expect(oyuncuBul(d, "a")!.ticaretDefteri!.oran.makas).toBeGreaterThan(0); // NPC makası var, ama kasaya gitmez
    paraUzlastir(d, s.ic);
    const p = d.mulk!.para!;
    expect(sayacOlcekli(p.musluk.ihracatNpc)).toBeGreaterThan(0n);
    for (const k of p.kasalar) {
      expect(k.giris.ithalatMakas.n, k.sahip).toBe(0);
      expect(k.giris.ithalatKomisyon.n, k.sahip).toBe(0);
    }
    expect(mulkOyuncuBul(d, "a")!.paraAkisi!.kasa.filter((e) => e.kalem !== "vergi")).toEqual([]);
    korunumTutar(s, "ihracat");
  });

  it("kasalar tembel: oran değişmeden dilimlenmiş ve tek seferlik uzlaştırma aynı girişi verir", () => {
    const a = vergiSenaryosu();
    const b = vergiSenaryosu();
    for (let i = 1; i <= 24; i++) {
      a.calistirKadar(a.dunya.zaman + 53 * DAKIKA);
      paraUzlastir(a.dunya, a.ic);
    }
    b.calistirKadar(a.dunya.zaman);
    paraUzlastir(b.dunya, b.ic);
    expect(b.dunya.zaman).toBe(a.dunya.zaman);
    for (const k of a.dunya.mulk!.para!.kasalar) expect(kasaOlcekli(b, k.sahip, "vergi"), k.sahip).toBe(kasaOlcekli(a, k.sahip, "vergi"));
  });

  it("para defteri yalnız `mulk.kasa` parametresiyle açılır: parametre yoksa yeni alan yazılmaz (özet değişmez)", () => {
    const kapali = mulkSim(["a"], mulkVeriTam((v) => delete v.param.mulk!.kasa), 8);
    expect(kapali.dunya.mulk!.para).toBeUndefined();
    expect(mulkOyuncuBul(kapali.dunya, "a")!.paraAkisi).toBeUndefined();
    tamam(kapali, "a", { tur: "parsel_al", ilce: OVA, hucreler: hucreler(OVA, "kirsal").slice(0, 1), sinif: "kirsal" });
    kapali.calistirKadar(kapali.dunya.zaman + GUN);
    expect(mulkOyuncuBul(kapali.dunya, "a")!.paraAkisi).toBeUndefined();
    expect(kamuAlici(kapali.dunya, kapali.ic, "k:ilce:x")).toBeUndefined();
    expect(kamuOdenekRezerv(kapali.dunya, kapali.ic, "k:ilce:x", 1, "npc")).toEqual({ tamam: false, hata: "para defteri kapali" });
  });
});

// ---------------------------------------------------------------------------
// KAMU NPC ALICISI VE FİYAT TAVANI
// ---------------------------------------------------------------------------

describe("kamu NPC alıcısı: ödenek rezervi, pay tavanları, fiyat tavanı", () => {
  const KASA = kamuIlceKimligi(OVA);

  /** a: ova_merkez'de bol kasaba hücresi; 20 gün vergi birikir (ilçe kasasında bakiye). */
  function dolu(duzenle?: (v: CekirdekVeriPaketi) => void) {
    const s = mulkSim(["a"], para((v) => {
      v.param.mulk!.araziVergisiHaftalikPpm = 150_000;
      duzenle?.(v);
    }), 31);
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: hucreler(OVA, "kasaba"), sinif: "kasaba" });
    s.calistirKadar(s.dunya.zaman + 20 * GUN);
    return s;
  }

  it("görünüm: bakiye, pencere girişi ve haftalık bütçe (pencere girişinin %25'i); kasa yokken sıfır değerli", () => {
    const s = dolu();
    const al = kamuAlici(s.dunya, s.ic, KASA)!;
    expect(al.tur).toBe("kamu");
    expect(al.kaynak).toBe(KASA);
    expect(al.bakiye).toBeGreaterThan(0);
    expect(al.pencereGiris).toBe(al.bakiye); // 20 gün < 28 gün pencere, hiç çıkış yok
    expect(al.haftalikButce).toBe(carp(al.pencereGiris, 250_000));
    expect(al.haftalikKullanilan).toBe(0);
    const yok = kamuAlici(s.dunya, s.ic, "k:ilce:yok")!;
    expect(yok).toMatchObject({ bakiye: 0, haftalikButce: 0, pencereGiris: 0 });
  });

  it("ödeneği olmayan alım açılmaz: kasa yok / bakiye yetersiz; geçersiz tutar; kasa değişmez", () => {
    const s = dolu();
    const d = s.dunya;
    const b = kamuAlici(d, s.ic, KASA)!.bakiye;
    expect(kamuOdenekRezerv(d, s.ic, "k:ilce:yok", 1, "npc")).toEqual({ tamam: false, hata: "kasa yok: k:ilce:yok" });
    const r = kamuOdenekRezerv(d, s.ic, KASA, b + 1, "npc");
    expect(r.tamam === false && r.hata).toMatch(/^odenek yetersiz/);
    for (const x of [0, -5, 1.5, Number.NaN]) expect(kamuOdenekRezerv(d, s.ic, KASA, x, "npc").tamam).toBe(false);
    const k = kasaBul(d.mulk!.para!, KASA)!;
    expect(k.rezervNpc + k.rezervOyuncu).toBe(0);
    expect(kasaBakiyesi(k)).toBe(b);
  });

  it("haftalık bütçe: rezerv ve ödemeler bütçeye sayılır; iptal bütçeyi geri verir", () => {
    const s = dolu((v) => (v.param.mulk!.kasa!.tekAlimTavaniPpm = PPM));
    const d = s.dunya;
    const al = kamuAlici(d, s.ic, KASA)!;
    const butce = al.haftalikButce;
    expect(kamuOdenekRezerv(d, s.ic, KASA, butce, "npc")).toEqual({ tamam: true });
    expect(kamuAlici(d, s.ic, KASA)!.haftalikKullanilan).toBe(butce);
    const r = kamuOdenekRezerv(d, s.ic, KASA, 1, "npc");
    expect(r.tamam === false && r.hata).toMatch(/^haftalik butce asildi/);
    expect(kamuOdenekIptal(d, KASA, butce + 1, "npc").tamam).toBe(false); // rezervden fazlası iptal edilemez
    expect(kamuOdenekIptal(d, KASA, butce, "npc")).toEqual({ tamam: true });
    expect(kamuAlici(d, s.ic, KASA)!.haftalikKullanilan).toBe(0);
    expect(kamuOdenekRezerv(d, s.ic, KASA, butce, "npc").tamam).toBe(true);
  });

  it("tek alım tavanı: kullanılabilir bakiyenin %40'ı", () => {
    const s = dolu((v) => (v.param.mulk!.kasa!.haftalikButcePpm = PPM));
    const d = s.dunya;
    const b = kamuAlici(d, s.ic, KASA)!.bakiye;
    const tavan = carp(b, 400_000);
    const r = kamuOdenekRezerv(d, s.ic, KASA, tavan + 1, "npc");
    expect(r.tamam === false && r.hata).toMatch(/^tek alim tavani asildi/);
    expect(kamuOdenekRezerv(d, s.ic, KASA, tavan, "npc")).toEqual({ tamam: true });
  });

  it("oyuncu payı ≤ pencere girişinin %50'si (ödenen + bekleyen rezerv); NPC alımları bu paya girmez", () => {
    const s = dolu((v) => (v.param.mulk!.kasa!.haftalikButcePpm = PPM));
    const d = s.dunya;
    const al = kamuAlici(d, s.ic, KASA)!;
    const tavan = carp(al.pencereGiris, 500_000);
    const ilk = carp(al.bakiye, 400_000);
    expect(kamuOdenekRezerv(d, s.ic, KASA, ilk, "oyuncu").tamam).toBe(true);
    expect(kamuOdenekRezerv(d, s.ic, KASA, tavan - ilk, "oyuncu").tamam).toBe(true); // tam tavan
    const r = kamuOdenekRezerv(d, s.ic, KASA, 1, "oyuncu");
    expect(r.tamam === false && r.hata).toMatch(/^oyuncu payi tavani asildi/);
    expect(kamuOdenekRezerv(d, s.ic, KASA, 1, "npc").tamam).toBe(true); // NPC payı ayrı
  });

  it("ödeme: oyuncuya TRANSFER (musluk değil), NPC'ye YANAR (lavabo.kamuNpc); rezervden fazlası ödenemez; korunum bozulmaz", () => {
    const s = dolu((v) => (v.param.mulk!.kasa!.haftalikButcePpm = PPM));
    const d = s.dunya;
    const p = d.mulk!.para!;
    korunumTutar(s, "oncesi");
    const musluk0 = MUSLUK_KALEMLERI.reduce((t, k) => t + sayacOlcekli(p.musluk[k]), 0n);
    const tutar = 100_000;
    expect(kamuOdenekRezerv(d, s.ic, KASA, tutar * 2, "oyuncu").tamam).toBe(true);
    expect(kamuOdenekRezerv(d, s.ic, KASA, tutar, "npc").tamam).toBe(true);
    const r = kamuOdenekOde(d, s.ic, KASA, tutar * 3, "oyuncu", "a");
    expect(r.tamam === false && r.hata).toMatch(/^odenek rezervi yetersiz/);
    expect(kamuOdenekOde(d, s.ic, KASA, tutar * 2, "oyuncu", "yok").tamam).toBe(false);
    expect(kamuOdenekOde(d, s.ic, KASA, tutar * 2, "oyuncu")).toMatchObject({ tamam: false }); // oyuncu verilmedi
    const h0 = anlikHazine(d, "a");
    expect(kamuOdenekOde(d, s.ic, KASA, tutar * 2, "oyuncu", "a")).toEqual({ tamam: true });
    expect(anlikHazine(d, "a") - h0).toBe(tutar * 2);
    const yan0 = p.lavabo.kamuNpc.n;
    expect(kamuOdenekOde(d, s.ic, KASA, tutar, "npc")).toEqual({ tamam: true });
    expect(p.lavabo.kamuNpc.n - yan0).toBe(tutar);
    const k = kasaBul(p, KASA)!;
    expect([k.cikisOyuncu, k.cikisNpc, k.rezervOyuncu, k.rezervNpc]).toEqual([tutar * 2, tutar, 0, 0]);
    const musluk1 = MUSLUK_KALEMLERI.reduce((t, kk) => t + sayacOlcekli(p.musluk[kk]), 0n);
    expect(musluk1).toBe(musluk0); // ödeme musluk açmadı (transfer)
    korunumTutar(s, "sonrasi");
    const al = kamuAlici(d, s.ic, KASA)!;
    expect(al.pencereOyuncu).toBe(tutar * 2);
    expect(al.pencereNpc).toBe(tutar);
  });

  it("kayan pencere: pencereGun (28) günden eski girişler pencere toplamından düşer; kasa bakiyesi düşmez", () => {
    const s = dolu();
    s.calistirKadar(s.dunya.zaman + 25 * GUN); // toplam 45 gün
    const d = s.dunya;
    const al = kamuAlici(d, s.ic, KASA)!;
    const k = kasaBul(d.mulk!.para!, KASA)!;
    expect(kasaGirisi(k)).toBeGreaterThan(al.pencereGiris);
    expect(al.pencereGiris).toBeGreaterThan(0);
    expect(k.gunler.length).toBeLessThanOrEqual(28);
    expect(al.bakiye).toBe(kasaGirisi(k));
  });

  /** Oyuncunun işletme düğümü ve NPC ithalat birim nakit çarpanı (ppm; ref = PPM). */
  function ithalatCarpani(s: Simulasyon, oyuncu: string): number {
    const d = s.dunya;
    const o = oyuncuBul(d, oyuncu)!;
    const dugum = d.bolgeler[d.mulk!.isletmeler.find((e) => e.oyuncu === oyuncu)!.bolgeIndeksi]!;
    return ticaretNakitCarpanlari(d, s.baglam, o, dugum.merkez!, dugum).ithalatPpm;
  }

  /** a ve b: ticaret anlaşması (aktif), a'nın düğümünde `ofis` Ticaret ofisi; kalkan açık (komisyon 0): ulaşılabilecek EN DÜŞÜK ithalat çarpanı. */
  function enIyiOyuncu(duzenle?: (v: CekirdekVeriPaketi) => void, ofis = 2) {
    const s = mulkSim(["a", "b"], para((v) => {
      v.param.mulk!.yeniOyuncu.kalkanGun = 14;
      v.param.mulk!.yeniOyuncu.hibe = 5_000_000_000;
      duzenle?.(v);
    }), 6);
    tamam(s, "a", { tur: "parsel_al", ilce: OVA, hucreler: hucreler(OVA, "kirsal").slice(0, 8), sinif: "kirsal" });
    tamam(s, "b", { tur: "parsel_al", ilce: LIMAN, hucreler: hucreler(LIMAN, "kirsal").slice(0, 2), sinif: "kirsal" });
    const hs = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a").map((h) => h.id);
    const kullanilan: string[] = [];
    for (let i = 0; i < ofis; i++) {
      const h = hs.filter((x) => !kullanilan.includes(x))[0]!;
      kullanilan.push(h);
      tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ticaret_ofisi", hucreler: [h] });
    }
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    tamam(s, "a", { tur: "anlasma_teklif", karsi: "b", anlasma: "ticaret" });
    tamam(s, "b", { tur: "anlasma_teklif", karsi: "a", anlasma: "ticaret" });
    return s;
  }

  it("fiyat tavanı: ref × kamuIthalatCarpaniPpm (derlemede, en düşük ulaşılabilir NPC ithalat çarpanı: anlaşma makası + en iyi Ticaret ofisi); sınır değerinde geçerli, +1 geçersiz", () => {
    const s = mulkSim(["a"], para(), 5);
    const d = s.dunya;
    // anlaşma ithalat çarpanı 1,05; 2 ofis × %15 makas indirimi (her biri PPM'e doğru) = %30: 1,05 → 1,05 − 0,05 × 0,30 = 1,035
    expect(s.ic.param.pazar.anlasmaIthalatCarpaniPpm).toBe(1_050_000);
    expect(s.ic.mulk!.kamuIthalatCarpaniPpm).toBe(1_035_000);
    for (let mal = 0; mal < s.ic.mallar.length; mal++) {
      const ref = d.pazar.fiyat[mal]!;
      const tavan = kamuFiyatTavani(d, s.ic, mal);
      expect(tavan, s.ic.mallar[mal]!.id).toBe(carp(ref, 1_035_000));
      expect(kamuFiyatGecerli(d, s.ic, mal, tavan)).toBe(true);
      expect(kamuFiyatGecerli(d, s.ic, mal, tavan + 1)).toBe(false);
      expect(kamuFiyatGecerli(d, s.ic, mal, 0)).toBe(true);
      expect(kamuFiyatGecerli(d, s.ic, mal, -1)).toBe(false);
      expect(kamuFiyatGecerli(d, s.ic, mal, 1.5)).toBe(false);
      expect(kamuFiyatGecerli(d, s.ic, mal, Number.NaN)).toBe(false);
    }
    expect(() => kamuFiyatTavani(d, s.ic, 9999)).toThrow(RangeError);
    // oyuncu durumundan bağımsız: tavan oyuncu eklenince/silinince/zaman geçince değişmez
    s.calistirKadar(d.zaman + 5 * GUN);
    expect(kamuFiyatTavani(d, s.ic, 0)).toBe(carp(d.pazar.fiyat[0]!, 1_035_000));
  });

  it("ARBİTRAJ ≤ 0: anlaşmalı ve en çok Ticaret ofisli (komisyonsuz) oyuncunun NPC ithalat maliyeti ≥ tavan (tam eşit: marj 0); diğer oyuncular için maliyet > tavan", () => {
    const s = enIyiOyuncu();
    const d = s.dunya;
    // 2 ofis (enFazlaIlBasina), ticaret anlaşması aktif
    const dugumA = d.bolgeler[d.mulk!.isletmeler.find((e) => e.oyuncu === "a")!.bolgeIndeksi]!;
    expect(dugumA.ekYapilar?.filter((y) => y.tur === "ticaret_ofisi")).toHaveLength(2);
    expect(d.anlasmalar.some((x) => x.tur === "ticaret" && x.aktif)).toBe(true);
    const enIyi = ithalatCarpani(s, "a");
    expect(enIyi).toBe(s.ic.mulk!.kamuIthalatCarpaniPpm); // ulaşılabilen en düşük çarpan = tavan çarpanı
    for (const oy of ["a", "b"]) {
      const c = ithalatCarpani(s, oy);
      for (let mal = 0; mal < s.ic.mallar.length; mal++) {
        const ref = d.pazar.fiyat[mal]!;
        // NPC'den ithalatla bir birimin gerçek nakit maliyeti (kırılım brüt değer üzerinden)
        const maliyet = ithalatKirilimi(ref, ticaretCarpanlari(d, s.baglam, oyuncuBul(d, oy)!, d.bolgeler[d.mulk!.isletmeler.find((e) => e.oyuncu === oy)!.bolgeIndeksi]!.merkez!, d.bolgeler[d.mulk!.isletmeler.find((e) => e.oyuncu === oy)!.bolgeIndeksi]!)).nakit;
        const tavan = kamuFiyatTavani(d, s.ic, mal);
        expect(maliyet, `${oy} ${s.ic.mallar[mal]!.id}`).toBeGreaterThanOrEqual(tavan); // kamuya tavandan satmak zarar ya da sıfır
        expect(tavan - maliyet).toBeLessThanOrEqual(0);
        if (oy === "b") expect(c).toBeGreaterThan(enIyi);
      }
    }
    // komisyon açıkken (kalkan bitti) maliyet tavanın üstüne çıkar: marj negatif
    s.calistirKadar(d.zaman + 15 * GUN);
    expect(ithalatCarpani(s, "a")).toBeGreaterThan(s.ic.mulk!.kamuIthalatCarpaniPpm);
  });

  it("parametre değişince tavan değişir ve arbitraj yine ≤ 0: ofis makas indirimi, ofis sayısı sınırı, anlaşma çarpanı", () => {
    // ofis indirimi 0: tavan çarpanı anlaşma çarpanı (1,05)
    const a = enIyiOyuncu((v) => (v.param.mulk!.ekYapilar!["ticaret_ofisi"]!.makasIndirimPpm = 0), 0);
    expect(a.ic.mulk!.kamuIthalatCarpaniPpm).toBe(1_050_000);
    expect(ithalatCarpani(a, "a")).toBe(1_050_000);
    // ofis başına sınır 1: %15 → 1,05 − 0,05 × 0,15 = 1,0425
    const b = enIyiOyuncu((v) => (v.param.mulk!.ekYapilar!["ticaret_ofisi"]!.enFazlaIlBasina = 1), 1);
    expect(b.ic.mulk!.kamuIthalatCarpaniPpm).toBe(1_042_500);
    expect(ithalatCarpani(b, "a")).toBe(1_042_500);
    const mal = 0;
    const ref = b.dunya.pazar.fiyat[mal]!;
    expect(kamuFiyatTavani(b.dunya, b.ic, mal)).toBe(carp(ref, 1_042_500));
    expect(kamuFiyatGecerli(b.dunya, b.ic, mal, carp(ref, 1_042_500))).toBe(true);
    expect(kamuFiyatGecerli(b.dunya, b.ic, mal, carp(ref, 1_042_500) + 1)).toBe(false);
    // ofis yoksa en düşük çarpan = anlaşma çarpanı; anlaşma makası düşünce (1,03) tavan da düşer (doğrulayıcı tutarlılığı: makas = 60 000)
    const c = enIyiOyuncu((v) => {
      const p = v.param.pazar;
      v.param.mulk!.ekYapilar!["ticaret_ofisi"]!.makasIndirimPpm = 0;
      p.anlasmaMakasPpm = 60_000;
      p.anlasmaIthalatCarpaniPpm = 1_030_000;
      p.anlasmaIhracatCarpaniPpm = 970_000;
    }, 0);
    expect(c.ic.mulk!.kamuIthalatCarpaniPpm).toBe(1_030_000);
    expect(ithalatCarpani(c, "a")).toBe(1_030_000);
    expect(kamuFiyatTavani(c.dunya, c.ic, mal)).toBeLessThan(kamuFiyatTavani(a.dunya, a.ic, mal));
    // eski (yaptırımsız) normal çarpan en düşük olursa o alınır (min)
    const d2 = mulkSim(["a"], para((v) => {
      const p = v.param.pazar;
      v.param.mulk!.ekYapilar!["ticaret_ofisi"]!.makasIndirimPpm = 0;
      p.makasPpm = 40_000;
      p.ithalatCarpaniPpm = 1_020_000;
      p.ihracatCarpaniPpm = 980_000;
    }), 1);
    expect(d2.ic.mulk!.kamuIthalatCarpaniPpm).toBe(1_020_000);
  });
});

// ---------------------------------------------------------------------------
// AYRILMIŞ HÜCRE: yeni oyuncu hakkı, hesap sınırı, taban fiyat, ilçe eğrisinden muaf
// ---------------------------------------------------------------------------

describe("ayrılmış hücre kuralı (ayrilmisHucreHesapTavani, taban fiyat, ilçe eğrisinden muafiyet)", () => {
  const TABAN = 1_000_000; // kırsal
  /** Arsa hücre fiyatı tam liraya YUKARI yuvarlanır (şartname §9.4; G7-4): bağımsız ifade (çekirdek işlevini çağırmaz). */
  const yukari = (mili: number): number => Math.ceil(mili / 1000) * 1000;
  const PAY = 2_000_000; // satisPayiCarpaniPpm

  function ayrSim(duzenle?: (v: CekirdekVeriPaketi) => void, oyuncular = ["a"]) {
    const s = mulkSim([], para((v) => {
      const m = v.param.mulk!;
      m.yeniOyuncu.ayrilmisHucrePpm = 500_000;
      m.ilcePayTavaniPpm = PPM; // yalnız ayrılmış hücre kuralı sınanır
      m.ilceHucreTavani = 72;
      m.yeniOyuncu.hibe = 5_000_000_000;
      // Çok hesaplı alıcı kuralları (P3b) kendi dosyasında sınanır (mulk-ayrilmis-coklu-hesap.test.ts); burada hesap sınırı ve fiyat kuralı için kapalı.
      delete m.yeniOyuncu.ayrilmisIlceGunlukPpm;
      delete m.yeniOyuncu.ayrilmisIlceGunlukEnAz;
      duzenle?.(v);
    }), 41);
    // katılım ilçesi OVA (yurtsuz katılım: `oyuncu_katil.ilce`)
    for (const o of oyuncular) tamam(s, SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: o, bolgeler: [], ilce: OVA });
    return s;
  }

  /** İlçenin `sinif` hücrelerinden (uygun) ayrılmış ya da serbest olanlar, fikstür sırasıyla. */
  function sec(s: Simulasyon, ilce: string, sinif: "kirsal" | "kasaba" | "sehir", ayrilmis: boolean): string[] {
    return hucreler(ilce, sinif).filter((id) => s.ic.mulk!.ayrilmis.has(id) === ayrilmis);
  }
  const al = (ilce: string, hucre: string[], sinif: "kirsal" | "kasaba" | "sehir" = "kirsal"): Komut => ({ tur: "parsel_al", ilce, hucreler: hucre, sinif });
  const ilceDurum = (s: Simulasyon, id: string) => s.dunya.mulk!.ilceler.find((c) => c.id === id)!;

  it("12 ayrılmış hücre tek komutta TABAN fiyattan (satış payı çarpanından muaf); sayaçlar ve hücre değerleri taban", () => {
    const s = ayrSim();
    const ayr = sec(s, OVA, "kirsal", true);
    expect(ayr.length).toBeGreaterThanOrEqual(13);
    const h0 = anlikHazine(s.dunya, "a");
    tamam(s, "a", al(OVA, ayr.slice(0, 12)));
    expect(h0 - anlikHazine(s.dunya, "a")).toBe(12 * TABAN);
    expect(ilceDurum(s, OVA).satilmisHucre).toBe(12);
    expect(ilceDurum(s, OVA).ayrilmisSatilmis).toBe(12);
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBe(12);
    const sahip = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a");
    expect(sahip.every((h) => h.degerMili === TABAN)).toBe(true);
    expect(mulkOyuncuBul(s.dunya, "a")!.araziDegeriMili).toBe(12 * TABAN);
    korunumTutar(s, "ayrilmis alim");
  });

  it("hesap başına en çok 12 ayrılmış hücre: 13.'sü reddedilir (hiçbir şey değişmez); ayrılmamış hücre serbesttir", () => {
    const s = ayrSim();
    const ayr = sec(s, OVA, "kirsal", true);
    tamam(s, "a", al(OVA, ayr.slice(0, 7)));
    tamam(s, "a", al(OVA, ayr.slice(7, 12)));
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    const r = ver(s, "a", al(OVA, ayr.slice(12, 13)));
    expect(r).toEqual({ tamam: false, hata: "hesap basina en cok 12 ayrilmis hucre (mevcut 12)" });
    expect(s.durumOzeti()).toBe(once);
    // tek komutta toplam aşımı da reddedilir (ayrı hesapta)
    const t = ayrSim(undefined, ["x"]);
    const r2 = ver(t, "x", al(OVA, sec(t, OVA, "kirsal", true).slice(0, 13)));
    expect(r2.tamam === false && r2.hata).toBe("hesap basina en cok 12 ayrilmis hucre (mevcut 0)");
    // serbest hücre sınırdan etkilenmez
    tamam(s, "a", al(OVA, sec(s, OVA, "kirsal", false).slice(0, 2)));
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBe(12);
  });

  it("ayrılmış alımlar ilçe fiyat eğrisini ilerletmez: sonraki normal alımın fiyatı ayrılmışsız dünyayla aynıdır", () => {
    const normalFiyat = (once: boolean) => {
      const s = ayrSim(undefined, ["a", "b"]);
      if (once) tamam(s, "a", al(OVA, sec(s, OVA, "kirsal", true).slice(0, 8)));
      const h0 = anlikHazine(s.dunya, "b");
      tamam(s, "b", al(OVA, sec(s, OVA, "kirsal", false).slice(0, 3)));
      return h0 - anlikHazine(s.dunya, "b");
    };
    const f = normalFiyat(false);
    expect(normalFiyat(true)).toBe(f);
    // ilk 3 normal hücre: taban × (1 + 2,0 × k/uygun)
    const uygun = ilceDurum(ayrSim(), OVA).uygunHucre;
    let beklenen = 0;
    for (let k = 0; k < 3; k++) beklenen += yukari(Math.floor((TABAN * (PPM + Math.floor((PAY * k) / uygun))) / PPM));
    expect(f).toBe(beklenen);
  });

  it("karma alım: ayrılmış hücre taban, normal hücre eğriden; normal hücreler ayrılmışlarla birlikte artmaz", () => {
    const s = ayrSim();
    const ayr = sec(s, OVA, "kirsal", true).slice(0, 3);
    const normal = sec(s, OVA, "kirsal", false).slice(0, 2);
    const h0 = anlikHazine(s.dunya, "a");
    tamam(s, "a", al(OVA, [...ayr, ...normal].sort()));
    const uygun = ilceDurum(s, OVA).uygunHucre;
    let beklenen = 3 * TABAN;
    for (let k = 0; k < 2; k++) beklenen += yukari(Math.floor((TABAN * (PPM + Math.floor((PAY * k) / uygun))) / PPM));
    expect(h0 - anlikHazine(s.dunya, "a")).toBe(beklenen);
    expect(ilceDurum(s, OVA).satilmisHucre).toBe(5);
    expect(ilceDurum(s, OVA).ayrilmisSatilmis).toBe(3);
    const sahip = new Map(s.dunya.mulk!.hucreler.map((h) => [h.id, h.degerMili]));
    for (const id of ayr) expect(sahip.get(id)).toBe(TABAN);
    expect(sahip.get(normal[0]!)).toBe(TABAN);
    expect(sahip.get(normal[1]!)).toBe(yukari(Math.floor((TABAN * (PPM + Math.floor(PAY / uygun))) / PPM)));
  });

  it("parsel_birak ayrılmış hücre: hesap ve ilçe sayaçları düşer, iade taban değerin %70'i; yeniden alınca sayaç geri gelir", () => {
    const s = ayrSim();
    const ayr = sec(s, OVA, "kirsal", true);
    tamam(s, "a", al(OVA, ayr.slice(0, 4)));
    const h0 = anlikHazine(s.dunya, "a");
    tamam(s, "a", { tur: "parsel_birak", ilce: OVA, hucreler: ayr.slice(0, 2) });
    expect(anlikHazine(s.dunya, "a") - h0).toBe(Math.floor((2 * TABAN * 700_000) / PPM));
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBe(2);
    expect(ilceDurum(s, OVA).ayrilmisSatilmis).toBe(2);
    tamam(s, "a", { tur: "parsel_birak", ilce: OVA, hucreler: ayr.slice(2, 4) });
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBeUndefined(); // sıfırda alan silinir (özet değişmez)
    expect(ilceDurum(s, OVA).ayrilmisSatilmis).toBeUndefined();
    tamam(s, "a", al(OVA, ayr.slice(0, 1)));
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBe(1);
    korunumTutar(s, "birak");
  });

  it("yapi_yerlestir aynı kuralı uygular: ayrılmış hücrelerde taban fiyat, sayaç artar, hesap sınırı geçerli", () => {
    const s = ayrSim((v) => (v.param.mulk!.yeniOyuncu.ayrilmisHucreHesapTavani = 2));
    const ayr = sec(s, OVA, "kirsal", true);
    const cift = bitisikCift(ayr);
    const h0 = anlikHazine(s.dunya, "a");
    const yapi = s.ic.icerik.tesisTurleri.find((t) => t.id === "ciftlik")!;
    tamam(s, "a", { tur: "yapi_yerlestir", ilce: OVA, tesisTuru: "ciftlik", hucreler: cift, sinif: "kirsal" });
    expect(h0 - anlikHazine(s.dunya, "a")).toBe(2 * TABAN + yapi.insaParasi);
    expect(mulkOyuncuBul(s.dunya, "a")!.ayrilmisHucre).toBe(2);
    expect(ilceDurum(s, OVA).ayrilmisSatilmis).toBe(2);
    const sonraki = ayr.filter((id) => !cift.includes(id)).slice(0, 1);
    const r = ver(s, "a", al(OVA, sonraki));
    expect(r.tamam === false && r.hata).toBe("hesap basina en cok 2 ayrilmis hucre (mevcut 2)");
  });

  it("parametre yoksa sınır yoktur; yurdun ayrılmış hücreleri de sayılır; parametre 3 ile tam değer kabul, 4. ret", () => {
    const sinirsiz = ayrSim((v) => delete v.param.mulk!.yeniOyuncu.ayrilmisHucreHesapTavani);
    tamam(sinirsiz, "a", al(OVA, sec(sinirsiz, OVA, "kirsal", true).slice(0, 14)));
    expect(mulkOyuncuBul(sinirsiz.dunya, "a")!.ayrilmisHucre).toBe(14);

    const uc = ayrSim((v) => (v.param.mulk!.yeniOyuncu.ayrilmisHucreHesapTavani = 3));
    tamam(uc, "a", al(OVA, sec(uc, OVA, "kirsal", true).slice(0, 3)));
    expect(ver(uc, "a", al(OVA, sec(uc, OVA, "kirsal", true).slice(3, 4))).tamam).toBe(false);

    // yurt: tüm hücreler ayrılmış; yurt (6) sayaca girer, ilçe muaf sayacı ise bedelsiz yurtla artmaz
    const yurt = mulkSim(["a"], para((v) => {
      const m = v.param.mulk!;
      m.yeniOyuncu.yurtHucre = 6;
      m.yeniOyuncu.ayrilmisHucrePpm = PPM;
      m.yeniOyuncu.ayrilmisHucreHesapTavani = 8;
    }), 42);
    const mo = mulkOyuncuBul(yurt.dunya, "a")!;
    expect(mo.ayrilmisHucre).toBe(6);
    const yurtIlce = yurt.dunya.mulk!.hucreler.find((h) => h.sahip === "a")!.ilce;
    expect(ilceDurum(yurt, yurtIlce).ayrilmisSatilmis).toBeUndefined();
    const bos = hucreler(yurtIlce, "kirsal").filter((id) => yurt.dunya.mulk!.hucreler.every((h) => h.id !== id));
    const r = ver(yurt, "a", al(yurtIlce, bos.slice(0, 3)));
    expect(r.tamam === false && r.hata).toBe("hesap basina en cok 8 ayrilmis hucre (mevcut 6)");
    tamam(yurt, "a", al(yurtIlce, bos.slice(0, 2)));
    expect(mulkOyuncuBul(yurt.dunya, "a")!.ayrilmisHucre).toBe(8);
    expect(ilceDurum(yurt, yurtIlce).ayrilmisSatilmis).toBe(2);
  });

  it("hucreFiyatiMili / parselToplamFiyatiMili arsa fiyatının TEK KAYNAĞIDIR: komut yolunun hazineden düştüğüyle birebir (ayrılmış taban, normal eğri, ayrılmışlar eğriyi ilerletmez)", () => {
    const s = ayrSim(undefined, ["a", "b"]);
    const ilce = () => ilceDurum(s, OVA);
    const kirsal = (ayr: boolean) => sec(s, OVA, "kirsal", ayr);
    // başlangıç (hiç satış yok): normal k. hücre eğriden, ayrılmış taban
    expect(hucreFiyatiMili(s.ic, ilce(), "kirsal", 0)).toBe(TABAN);
    expect(hucreFiyatiMili(s.ic, ilce(), "kirsal", 5, true)).toBe(TABAN);
    expect(hucreFiyatiMili(s.ic, ilce(), "kirsal", 3)).toBe(yukari(Math.floor((TABAN * (PPM + Math.floor((PAY * 3) / ilce().uygunHucre))) / PPM)));
    // a: 4 ayrılmış + 2 normal tek komutta
    const beklenen = parselToplamFiyatiMili(s.ic, ilce(), "kirsal", 2, 4);
    const h0 = anlikHazine(s.dunya, "a");
    tamam(s, "a", al(OVA, [...kirsal(true).slice(0, 4), ...kirsal(false).slice(0, 2)].sort()));
    expect(h0 - anlikHazine(s.dunya, "a")).toBe(beklenen);
    // ayrılmış alımlar eğriyi ilerletmedi: şimdi (6 satılmış, 4'ü ayrılmış) sıradaki normal hücre eğrinin 2. noktasındadır
    expect(ilce().satilmisHucre).toBe(6);
    expect(ilce().ayrilmisSatilmis).toBe(4);
    const sonraki = hucreFiyatiMili(s.ic, ilce(), "kirsal", 0);
    expect(sonraki).toBe(yukari(Math.floor((TABAN * (PPM + Math.floor((PAY * 2) / ilce().uygunHucre))) / PPM)));
    const h1 = anlikHazine(s.dunya, "b");
    tamam(s, "b", al(OVA, kirsal(false).slice(2, 3)));
    expect(h1 - anlikHazine(s.dunya, "b")).toBe(sonraki);
    // mülk kipi kapalıysa RangeError
    const kapali = Simulasyon.olustur(miniVeriyiYukle(), 1);
    expect(() => hucreFiyatiMili(kapali.ic, { uygunHucre: 10, satilmisHucre: 0 }, "kirsal")).toThrow(RangeError);
  });

  it("ayrılmış hücre yalnız katılımın ilk ayrilmisGun gününde alınır (kural değişmedi); 14 gün sonra yalnız serbest hücre", () => {
    const s = ayrSim();
    const ayr = sec(s, OVA, "kirsal", true);
    expect(ver(s, "a", al(OVA, ayr.slice(0, 1)), 14 * GUN).tamam).toBe(false);
    expect(ver(s, "a", al(OVA, sec(s, OVA, "kirsal", false).slice(0, 1)), 14 * GUN).tamam).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SERİLEŞTİRME
// ---------------------------------------------------------------------------

describe("para durumu serileştirme: gidiş-dönüş ve bozuk veri reddi", () => {
  function zengin() {
    const { s } = rastgeleKosu(31, 100, false);
    // ayrılmış hücre ve ödül de bulunsun
    return s;
  }

  it("dunyaSerilestir/dunyaCoz gidiş-dönüş: aynı metin; para defteri, ödüller korunur; yüklenen dünyayla sürdürülen koşu kesintisiz koşuyla AYNI özeti ve korunumu verir", () => {
    const s = zengin();
    const metin = dunyaSerilestir(s.dunya);
    const d2 = dunyaCoz(metin);
    expect(dunyaSerilestir(d2)).toBe(metin);
    expect(d2.mulk!.para).toEqual(s.dunya.mulk!.para);
    expect(d2.mulk!.para!.kasalar.length).toBeGreaterThan(0);
    expect(d2.oyuncular.some((o) => o.alinanOdul !== undefined)).toBe(true);
    const veri = () => para((v) => (v.param.mulk!.araziVergisiHaftalikPpm = 100_000));
    const yuklu = Simulasyon.yukle(veri(), d2);
    s.calistirKadar(s.dunya.zaman + 3 * GUN);
    yuklu.calistirKadar(yuklu.dunya.zaman + 3 * GUN);
    expect(yuklu.durumOzeti()).toBe(s.durumOzeti());
    korunumTutar(yuklu, "yukleme sonrasi");
    korunumTutar(s, "kesintisiz");
  });

  type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const boz = (duzenle: (j: Json) => void): (() => unknown) => () => {
    const s = zengin();
    paraUzlastir(s.dunya, s.ic);
    const j = JSON.parse(dunyaSerilestir(s.dunya));
    duzenle(j);
    return dunyaCoz(JSON.stringify(j));
  };

  it("bozuk para durumu yüklenmez: negatif sayaç, artık aralık dışı, kasa sırası, sürüm", () => {
    expect(boz((j) => (j.mulk.para.musluk.hibe.n = -1))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.mulk.para.lavabo.arsa.a = SAAT))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.mulk.para.lavabo.arsa.a = -1))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => j.mulk.para.kasalar.reverse())).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.mulk.para.surum = 2))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => delete j.mulk.para.musluk.odul)).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.mulk.para.kasalar[0].cikisNpc = 1.5))).toThrow(SerilestirmeHatasi);
  });

  it("bozuk ödül ve ayrılmış sayaçlar yüklenmez: sırasız/tekrarlı alinanOdul, ayrilmisSatilmis > satilmisHucre", () => {
    expect(boz((j) => (j.oyuncular[0].alinanOdul = ["b", "a"]))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.oyuncular[0].alinanOdul = ["a", "a"]))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.oyuncular[0].alinanOdul = [1]))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.mulk.ilceler[0].ayrilmisSatilmis = j.mulk.ilceler[0].satilmisHucre + 1))).toThrow(SerilestirmeHatasi);
    expect(boz((j) => (j.mulk.oyuncular[0].ayrilmisHucre = 0))).toThrow(SerilestirmeHatasi);
  });

  it("para durumu yalnız `mulk.kasa` parametresi olan dünyada bulunabilir; parametre yok iken dünyada para durumu reddedilir", () => {
    const s = zengin();
    paraUzlastir(s.dunya, s.ic);
    const kapali = mulkSim(["a"], mulkVeriTam((v) => delete v.param.mulk!.kasa), 9);
    const j = JSON.parse(dunyaSerilestir(s.dunya));
    expect(() => dunyaIcerikUyumu(kapali.ic, dunyaCoz(JSON.stringify(j)))).toThrow(SerilestirmeHatasi);
  });
});
