/**
 * Perakende derlemesi (G7-1b; şartname §4.6): `perakendeDerle(veri, ic)` -> `DerlenmisPerakende`. Hiçbir yerden bağlı değildir; bağlama K3'ündür.
 * Bloğu bellekte kurulan paketle sınanır (JSON'a bağımlı değil: G7-4'te T3 JSON'a koyunca da aynı); T3'ün G7 yamasıyla (bdb055aa7975) ayrıca elle doğrulandı (rapor).
 */
import { ilceSinifiTuret } from "@bolge/veri";
import type { MulkPerakendeParametreleri } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { perakendeDerle } from "../src/perakende/derle";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { perakendeBlogu } from "../../veri/test/perakende-g7-yardimci";
import { sentetikDunya, sentetikIzgara } from "./hucre-dizini-yardimci";
import { mulkVeriTam } from "./mulk-yardimci";

/** mini-6 parsel dünyası + bellekte `ekYapilar.dukkan` ve perakende bloğu. */
function veri(duzenle?: (v: CekirdekVeriPaketi, pr: MulkPerakendeParametreleri) => void): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const mulk = v.param.mulk!;
    mulk.ekYapilar = { ...(mulk.ekYapilar ?? {}), dukkan: { ad: "Dukkan", yuva: 1, insaSaati: 4, insaParasi: 6_000_000, insaMaliyeti: { celik: 20_000, parca: 8_000 }, enFazlaIlBasina: 6, olcekHucre: [1, 2, 3] } };
    mulk.perakende = perakendeBlogu();
    duzenle?.(v, mulk.perakende);
  });
}
const derle = (v: CekirdekVeriPaketi) => perakendeDerle(v, icerikDerle(v));

describe("kapalı durumlar: undefined", () => {
  it("perakende bloğu yok; mulk parametresi yok; parsel dünyası (mülk kipi) yok", () => {
    const blokYok = veri((v) => delete v.param.mulk!.perakende);
    expect(derle(blokYok)).toBeUndefined();
    const parselsiz = veri((v) => {
      delete v.parsel;
    });
    expect(perakendeDerle(parselsiz, icerikDerle(veri()))).toBeUndefined();
    const mulksuz = veri((v) => delete v.param.mulk);
    expect(perakendeDerle(mulksuz, icerikDerle(veri()))).toBeUndefined();
  });
});

describe("derlenmiş içerik", () => {
  const v = veri();
  const ic = icerikDerle(v);
  const d = perakendeDerle(v, ic)!;

  it("dükkân türleri: kimliğe göre sıralı, mal indeksleri artan ve kimlikle eşleşir; malKumesi aynı; tamCesit ve ölçek aralığı korunur", () => {
    expect([...d.turler.keys()]).toEqual(["bakkal", "firin"]);
    const bakkal = d.turler.get("bakkal")!;
    const beklenen = ["gida", "ekmek", "un", "sut", "sut_urunu", "sekerleme"].map((m) => ic.malIndeks[m] as number).sort((a, b) => a - b);
    expect(bakkal.mallar).toEqual(beklenen);
    expect([...bakkal.malKumesi].sort((a, b) => a - b)).toEqual(beklenen);
    expect(bakkal.tamCesit).toBe(6);
    expect(bakkal.olcekAraligi).toEqual([0]);
    expect(d.turler.get("firin")!.mallar).toEqual(["ekmek", "un"].map((m) => ic.malIndeks[m] as number).sort((a, b) => a - b));
    expect(d.p).toBe(v.param.mulk!.perakende);
  });

  it("mal grupları: grup indeksi kimliğe göre sıralı (gida 0, tatli 1); grupsuz mal -1; 12 aylık takvim toplamı 12 000 000; bayram dalgası ve günleri", () => {
    expect(d.malGrubu[ic.malIndeks["gida"] as number]).toBe(0);
    expect(d.malGrubu[ic.malIndeks["sut"] as number]).toBe(0);
    expect(d.malGrubu[ic.malIndeks["sekerleme"] as number]).toBe(1);
    expect(d.malGrubu[ic.malIndeks["celik"] as number]).toBe(-1);
    expect(d.malGrubu).toHaveLength(ic.mallar.length);
    expect(d.grupTakvim).toHaveLength(2);
    for (const t of d.grupTakvim) {
      expect(t).toHaveLength(12);
      expect(t.reduce((a, b) => a + b, 0)).toBe(12_000_000);
    }
    expect(d.grupBayram).toEqual([{ oncesiGun: 3, oncesiPpm: 1_200_000, sonrasiGun: 3, sonrasiPpm: 800_000 }, null]);
    expect(d.bayramGunleri).toEqual([10, 30]);
  });

  it("dukkanEkYapi = icerikDerle'nin ek yapı indeksi; kampanya açık (kademe ve iki sınır tanımlı)", () => {
    expect(d.dukkanEkYapi).toBe(ic.mulk!.ekYapiIndeks.get("dukkan"));
    expect(d.kampanyaAcik).toBe(true);
    for (const duzen of [(p: MulkPerakendeParametreleri) => delete p.kampanyaKademesi, (p: MulkPerakendeParametreleri) => (p.kampanyaGunlukEnFazlaSaat = 0), (p: MulkPerakendeParametreleri) => delete p.kampanyaHaftalikEnFazlaGun]) {
      expect(derle(veri((_, pr) => duzen(pr)))!.kampanyaAcik).toBe(false);
    }
  });

  it("belirlenimci: iki derleme aynı tablolar; ilçe satırı mal sayısı uzunluğunda", () => {
    const e = perakendeDerle(v, ic)!;
    expect([...e.talepTaban.entries()]).toEqual([...d.talepTaban.entries()]);
    expect([...e.ilceNufus.entries()]).toEqual([...d.ilceNufus.entries()]);
    for (const satir of d.talepTaban.values()) expect(satir).toHaveLength(ic.mallar.length);
  });
});

describe("ilçe nüfusu ve taban talep (nufus'lu ve nufus'suz ilçe)", () => {
  it("fikstürde nufus varsa o, yoksa sinif yedek sabiti; taban = floor(talep1000Saat x yerelOlcek x nüfus / 1000); satırı olmayan mal 0", () => {
    const v = veri((x) => {
      const ilceler = x.parsel!.ilceler;
      (ilceler[0] as { nufus?: number }).nufus = 152_345;
      delete (ilceler[1] as { nufus?: number }).nufus;
    });
    const ic = icerikDerle(v);
    const d = perakendeDerle(v, ic)!;
    const sabit = v.param.mulk!.perakende!.talep.ilceSinifiNufus;
    const [a, b] = v.parsel!.ilceler;
    expect(d.ilceNufus.get(a!.id)).toBe(152_345);
    expect(d.ilceNufus.get(b!.id)).toBe(sabit[b!.sinif]);
    const gida = ic.malIndeks["gida"] as number;
    const celik = ic.malIndeks["celik"] as number;
    expect((d.talepTaban.get(a!.id) as number[])[gida]).toBe(Math.floor((90_000 * 40 * 152_345) / 1000) /* yerelOlcek 40 değil, bloktaki değer: aşağıda */ === 0 ? 0 : (d.talepTaban.get(a!.id) as number[])[gida]);
    const olcek = v.param.mulk!.perakende!.talep.yerelOlcek;
    expect((d.talepTaban.get(a!.id) as number[])[gida]).toBe(Math.floor((90_000 * olcek * 152_345) / 1000));
    expect((d.talepTaban.get(b!.id) as number[])[gida]).toBe(Math.floor((90_000 * olcek * sabit[b!.sinif]) / 1000));
    expect((d.talepTaban.get(a!.id) as number[])[celik]).toBe(0);
    expect(d.talepTaban.size).toBe(v.parsel!.ilceler.length);
  });

  it("ızgara girdisi: `sinif` yoksa hücre dizininin türetimiyle bulunur (veri `ilceSinifiTuret` ile aynı sonuç); nufus'lu ilçe nufus'u, nufus'suz ilçe türetilen sınıfın sabitini kullanır", () => {
    const dunya = sentetikDunya(60);
    const v = mulkVeriTam() as CekirdekVeriPaketi;
    delete v.parsel;
    v.param.mulk!.ekYapilar = { ...(v.param.mulk!.ekYapilar ?? {}), dukkan: { ad: "Dukkan", yuva: 1, insaSaati: 4, insaParasi: 1, insaMaliyeti: {}, olcekHucre: [1, 2, 3] } };
    v.param.mulk!.perakende = perakendeBlogu();
    v.parselIzgara = { ...dunya.izgara, ilceler: dunya.izgara.ilceler.map((c, i) => ({ ...c, ...(i === 0 ? { nufus: 99_000 } : {}) })) };
    const ic = icerikDerle({ ...v, parselIzgara: undefined, parsel: undefined } as CekirdekVeriPaketi);
    const d = perakendeDerle(v, ic)!;
    const [c0, c1] = v.parselIzgara.ilceler;
    expect(d.ilceNufus.get(c0!.id)).toBe(99_000);
    const sabit = v.param.mulk!.perakende!.talep.ilceSinifiNufus;
    expect(d.ilceNufus.get(c1!.id)).toBe(sabit[ilceSinifiTuret(c1!.izgara)]);
    expect(sentetikIzgara(60, 0, 0, 1).durum.length).toBe(3600); // yardımcı sağlam
  });
});

describe("derleme hataları (Error)", () => {
  it("bilinmeyen raf malı; bilinmeyen grup/talep malı; mal iki grupta; boş acikOlcekler; dukkan ek yapısı yok", () => {
    expect(() => derle(veri((_, pr) => pr.dukkanTurleri[0]!.mallar.push("yok_mal")))).toThrow("icerikDerle: mulk.perakende.dukkanTurleri.bakkal.mallar bilinmeyen mal: yok_mal");
    expect(() => derle(veri((_, pr) => pr.talep.gruplar["tatli"]!.mallar.push("yok_mal")))).toThrow("talep.gruplar.tatli.mallar bilinmeyen mal: yok_mal");
    expect(() => derle(veri((_, pr) => (pr.talep.talep1000Saat["yok_mal"] = 5)))).toThrow("talep.talep1000Saat bilinmeyen mal: yok_mal");
    expect(() => derle(veri((_, pr) => pr.talep.gruplar["tatli"]!.mallar.push("sut")))).toThrow("mal birden cok grupta: sut");
    expect(() => derle(veri((_, pr) => (pr.talep.talep1000Saat["celik"] = 5_000)))).toThrow("icerikDerle: mulk.perakende.talep.talep1000Saat: mal grubu yok: celik");
    expect(() => derle(veri((_, pr) => (pr.acikOlcekler = [])))).toThrow("acikOlcekler bos olamaz");
    expect(() => derle(veri((v) => delete v.param.mulk!.ekYapilar!["dukkan"]))).toThrow("mulk.ekYapilar.dukkan gerekli");
    expect(() => derle(veri((_, pr) => pr.dukkanTurleri.push({ ...pr.dukkanTurleri[0]! })))).toThrow("tekrarlanan tur: bakkal");
  });
});
