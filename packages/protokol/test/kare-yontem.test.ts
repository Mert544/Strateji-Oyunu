/**
 * Kare: oyuncunun KENDI inşaatlarında seçtiği yöntem (`oyuncu.insaatYontem`, isteğe bağlı alan, demetler büyümez).
 * Yalnız komutla yöntem verilmiş inşaat için yazılır; yöntemsiz dünyada kare ESKİ KARE ile bire bir aynıdır; başkasına/izleyiciye gitmez.
 * Eski (dondurulmuş) şema yeni kareyi yine ayrıştırır.
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { IlgiKaresiSemasi, KareDeltasiSemasi, deltaUygula, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";
import type { IlgiKaresi } from "../src/index";

const DAG = "sn_m_dag_merkez";
const YONTEM = "mera_hayvancilik";

/** Ali dağ ilçesinde 3 bitişik kırsal hücre alır; `yontem` verilirse mera inşası o yöntemle başlar. */
function kurulum(yontem: string | undefined): Simulasyon {
  const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
  delete v.param.mulk?.kamu;
  const yo = v.param.mulk?.yeniOyuncu;
  if (yo) {
    yo.hibe = 5_000_000_000;
    yo.yurtHucre = 0;
    yo.ilkYapiIndirimPpm = 0;
    yo.indirimliYapiSayisi = 0;
    yo.ayrilmisHucrePpm = 0;
    yo.baslangicStok = { celik: 50_000_000, parca: 50_000_000, gida: 200_000 };
  }
  const sim = Simulasyon.olustur(v, 7);
  for (const o of ["ali", "veli"]) sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler: [] } });
  const uygun = new Set((v.parsel?.ilceler.find((c) => c.id === DAG)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal").map((h) => h.id));
  const g = [...uygun].map((id) => [0, 1, 2].map((i) => `${Number(id.split(":")[0]) + i}:${id.split(":")[1]}`)).find((l) => l.every((id) => uygun.has(id))) as string[];
  const t = 200 * SAAT;
  expect(sim.uygula({ t, oyuncu: "ali", komut: { tur: "parsel_al", ilce: DAG, hucreler: g, sinif: "kirsal" } }).tamam).toBe(true);
  const r = sim.uygula({ t, oyuncu: "ali", komut: { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "mera", hucreler: g, olcek: 0, ...(yontem === undefined ? {} : { yontem }) } });
  expect(r.tamam, JSON.stringify(r)).toBe(true);
  return sim;
}

function kare(sim: Simulasyon, oyuncu: string | null): IlgiKaresi {
  return ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [], oyuncu), oyuncu, ilceIlgisiKur(sim, [DAG], oyuncu), {});
}

describe("oyuncu.insaatYontem (yalniz sahibine, istege bagli)", () => {
  it("komutla yontem verilmisse sahibinin karesinde [insaatKimligi, yontem] satiri var; sema gecerli; demetler degismez", () => {
    const sim = kurulum(YONTEM);
    const ins = sim.dunya.insaatlar.find((i) => i.sahip === "ali");
    expect(ins?.yontem).toBe(YONTEM);
    const k = kare(sim, "ali");
    expect(k.oyuncu?.insaatYontem).toEqual([[ins?.id, YONTEM]]);
    // Mevcut insaat demeti (id, bitis, ...) oldugu gibi: yeni bilgi demete eklenmedi.
    expect(k.oyuncu?.insaatlar.find((d) => d[0] === ins?.id)).toBeDefined();
    expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
  });

  it("yontemsiz komutta alan HIC yazilmaz ve kare, yontem bilgisinden bagimsiz ayni anahtar kumesini tasir", () => {
    const sim = kurulum(undefined);
    const k = kare(sim, "ali");
    expect(k.oyuncu).toBeDefined();
    expect("insaatYontem" in (k.oyuncu ?? {})).toBe(false);
    expect(Object.keys(JSON.parse(JSON.stringify(k.oyuncu)) as object)).not.toContain("insaatYontem");
    // Yontemli ve yontemsiz karenin farki YALNIZ insaatYontem alanidir (digeri yeni alan eklemez).
    const y = kare(kurulum(YONTEM), "ali");
    const { insaatYontem: _yok, ...geri } = y.oyuncu ?? ({} as NonNullable<IlgiKaresi["oyuncu"]>);
    expect(geri).toEqual(k.oyuncu);
  });

  it("baska oyuncu ve izleyici (oyuncusuz) yontemi gormez", () => {
    const sim = kurulum(YONTEM);
    expect(kare(sim, "veli").oyuncu?.insaatYontem).toBeUndefined();
    expect(kare(sim, null).oyuncu).toBeUndefined();
    expect(JSON.stringify(kare(sim, "veli"))).not.toContain(YONTEM);
    expect(JSON.stringify(kare(sim, null))).not.toContain(YONTEM);
  });

  it("insaat bitince satir kaybolur (delta); deltaUygula(a, kareFarki(a, b)) = b", () => {
    const sim = kurulum(YONTEM);
    const a = kare(sim, "ali");
    expect(a.oyuncu?.insaatYontem?.length).toBe(1);
    sim.calistirKadar(sim.dunya.zaman + 30 * SAAT);
    expect(sim.dunya.insaatlar.some((i) => i.sahip === "ali")).toBe(false);
    const b = kare(sim, "ali");
    expect(b.oyuncu?.insaatYontem).toBeUndefined();
    const d = kareFarki(a, b);
    expect(KareDeltasiSemasi.parse(d)).toEqual(d);
    expect(deltaUygula(a, d)).toEqual(b);
  });

  it("ESKI sema (insaatYontem'siz oyuncu karesi) yeni kareyi ayristirir, alani sessizce atar; yeni sema eski (alansiz) kareyi aynen kabul eder", () => {
    // Eski istemcinin gordugu sema: bugunku oyuncu karesi semasindan YALNIZ bu alan cikarilmis hali (zod object bilinmeyen anahtari atar).
    const eski = IlgiKaresiSemasi.shape.oyuncu.unwrap().omit({ insaatYontem: true });
    const yeni = kare(kurulum(YONTEM), "ali").oyuncu;
    const sonuc = eski.safeParse(yeni);
    expect(sonuc.success).toBe(true);
    if (sonuc.success) {
      expect("insaatYontem" in sonuc.data).toBe(false);
      const { insaatYontem: _y, ...beklenen } = yeni as NonNullable<typeof yeni>;
      expect(sonuc.data).toEqual(beklenen);
    }
    // Eski sunucunun karesi (alan yok) yeni semadan oldugu gibi gecer.
    const alansiz = kare(kurulum(undefined), "ali");
    expect(IlgiKaresiSemasi.parse(alansiz)).toEqual(alansiz);
  });
});
