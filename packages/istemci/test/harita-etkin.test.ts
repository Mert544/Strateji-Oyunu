/** G8 kararları içerik dizininden (saf): Defter etkin kuralı protokolle aynı yoldan, "G8 açık", dükkân türü mal grubu ve tür uyumu. */
import { describe, expect, it } from "vitest";
import { kavramEtkin as protokolEtkin } from "@bolge/protokol";
import type { Icerik } from "../src/komut/tablo";
import { dukkanTuruMallari, etkinGirdisi, g8Acik, kavramEtkin, kavramEtkinBos, satilabilirMallar, turUyumlari } from "../src/harita/etkin";

const MALLAR = ["tahil", "gida", "ekmek", "celik", "parca", "silis", "cam", "pencere"];

function icerik(o: { yontemler?: string[][]; perakende?: Array<{ id: string; mallar: string[] }> | null } = {}): Icerik {
  const mallar = MALLAR.map((id) => ({ id, ad: id, kategori: "x", taban: 1000, depolanabilir: true }));
  const malIdx = Object.fromEntries(MALLAR.map((m, i) => [m, i]));
  const yontemler = (o.yontemler ?? [["gida"]]).map((cikti, i) => ({ indeks: i, id: `y${i}`, ad: `y${i}`, girdi: [], cikti: cikti.map((m) => [malIdx[m]!, 1000]), isci: 0 }));
  const perakende = o.perakende === null ? undefined : { dukkanTurleri: (o.perakende ?? [{ id: "bakkal", mallar: ["gida"] }]).map((t) => ({ ...t, ad: t.id, tamCesit: 1, olcekAraligi: [0] })) };
  return { mallar, malIdx, yontemler, param: { mulk: perakende ? { perakende } : {} } } as unknown as Icerik;
}

describe("etkin girdisi ve protokol kuralı", () => {
  it("girdi içerikten: yöntem çıktı mal kimlikleri ve dükkân verisi; dizin başına bir kez", () => {
    const ic = icerik({ yontemler: [["gida"], ["ekmek", "pencere"]] });
    const g = etkinGirdisi(ic);
    expect([...g.yontemCiktilari].sort()).toEqual(["ekmek", "gida", "pencere"]);
    expect(g.perakende).toBe(true);
    expect(etkinGirdisi(ic)).toBe(g);
    expect(etkinGirdisi(icerik({ perakende: null })).perakende).toBe(false);
  });

  it("kavramEtkin protokol işleviyle aynı sonucu verir (kavram kimliklerine elle bakılmaz)", () => {
    const ic = icerik({ yontemler: [["gida"], ["ekmek"], ["cam"]] });
    for (const k of ["ilk_yapi", "ilk_ekmek", "ilk_pencere", "ilk_cam", "ilk_dukkan", "ilk_raf", "ilk_sozlesme", "ilk_satis"]) expect(kavramEtkin(ic, k), k).toBe(protokolEtkin(etkinGirdisi(ic), k));
    expect(kavramEtkin(ic, "ilk_ekmek")).toBe(true);
    expect(kavramEtkin(ic, "ilk_cam")).toBe(true);
    expect(kavramEtkin(ic, "ilk_pencere")).toBe(false);
    expect(kavramEtkin(ic, "ilk_sozlesme")).toBe(false);
  });

  it("G8 açık = ilk_pencere etkin: içerikte pencere üreten yöntem var mı; yöntemin kimliği önemsiz", () => {
    expect(g8Acik(icerik({ yontemler: [["gida"]] }))).toBe(false);
    expect(g8Acik(icerik({ yontemler: [["gida"], ["pencere"]] }))).toBe(true);
    // pencereyi üreten yöntem hangi kimlikle olursa olsun
    const ic = icerik({ yontemler: [["pencere", "parca"]] });
    expect(ic.yontemler[0]?.id).toBe("y0");
    expect(g8Acik(ic)).toBe(true);
  });

  it("boş içerik kuralı (sahte bağdaştırıcı varsayılanı): yer tutucu ve içerik bağımlı kavramlar kapalı, genel kavramlar açık", () => {
    expect(kavramEtkinBos("ilk_dukkan")).toBe(false);
    expect(kavramEtkinBos("ilk_sozlesme")).toBe(false);
    expect(kavramEtkinBos("ilk_pencere")).toBe(false);
    expect(kavramEtkinBos("ilk_yapi")).toBe(true);
  });
});

describe("dükkân türü mal grubu içerikten", () => {
  const ic = icerik({
    perakende: [
      { id: "bakkal", mallar: ["gida", "tahil"] },
      { id: "yapi_market", mallar: ["cam", "pencere", "celik", "parca"] },
    ],
  });

  it("tür mallarını içerikten okur; listede olmayan tür boş", () => {
    expect(dukkanTuruMallari(ic, "yapi_market")).toEqual(["cam", "pencere", "celik", "parca"]);
    expect(dukkanTuruMallari(ic, "yok")).toEqual([]);
    expect([...satilabilirMallar(ic)].sort()).toEqual(["cam", "celik", "gida", "parca", "pencere", "tahil"]);
    expect(satilabilirMallar(icerik({ perakende: null })).size).toBe(0);
  });

  it("D2 tür uyumu: yapı market cam, pencere, çelik ve parçayı sayar; stok yoksa false", () => {
    const stok = new Set(["parca"]);
    expect(turUyumlari(ic, (m) => stok.has(m))).toEqual({ bakkal: false, yapi_market: true });
    expect(turUyumlari(ic, (m) => m === "celik").yapi_market).toBe(true);
    expect(turUyumlari(ic, (m) => m === "silis").yapi_market).toBe(false); // silis yapı marketin değil
    expect(turUyumlari(ic, () => false)).toEqual({ bakkal: false, yapi_market: false });
    expect(turUyumlari(icerik({ perakende: null }), () => true)).toEqual({});
  });
});
