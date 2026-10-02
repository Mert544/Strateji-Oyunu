/**
 * Mülk panelinin yeniden çizim yolları (P13 f4 hatası): kare/delta dinleyicisi, Defter okuma ve iki saniyelik tur TEK korumalı çizimden geçer; çizim `#pz-oran` alanını yeniden kursa bile
 * odak ve imleç çizimden hemen sonra (eşzamanlı) geri verilir. DOM yok: odak yakalama ve çizim sahtedir (`PazarSatPaneli.odagiYakala` ile aynı sözleşme: yakala -> geri yükle).
 */
import { describe, expect, it } from "vitest";
import { mulkDinleKur } from "../src/harita/mulk-panel";
import type { MulkDinleGirdisi } from "../src/harita/mulk-panel";

/** Sahte sayfa: tek `#pz-oran` alanı; çizim (`f`) alanı YENİDEN kurar (yeni nesne, odak ve imleç kaybolur). */
function sayfa() {
  const olay: string[] = [];
  const girdi = { id: "pz-oran", odakta: true, imlec: [2, 4] as [number, number] };
  const durum = { alan: girdi };
  const f = (): void => {
    olay.push("cizim");
    durum.alan = { id: "pz-oran", odakta: false, imlec: [0, 0] };
  };
  const yakala = (): (() => void) | null => {
    const a = durum.alan;
    if (!a.odakta) return null;
    const imlec: [number, number] = [a.imlec[0], a.imlec[1]];
    olay.push("yakala");
    return () => {
      olay.push("geri");
      durum.alan.odakta = true;
      durum.alan.imlec = imlec;
    };
  };
  return { olay, durum, f, yakala };
}

function girdiKur(yakala: MulkDinleGirdisi["yakala"]) {
  let delta: (() => void) | null = null;
  let tur: (() => void) | null = null;
  let defterBitir: (() => void) | null = null;
  let defterCiz: (() => void) | null = null;
  let tikCiz: ((c: () => void) => void) | null = null;
  const g: MulkDinleGirdisi = {
    bDinle: (cb) => {
      delta = cb;
      return () => undefined;
    },
    defterOku: async (cb) => {
      defterCiz = cb;
      defterBitir = cb;
    },
    tik: (ciz) => {
      tikCiz = ciz;
      void g.defterOku(ciz);
    },
    yakala,
    zamanla: (fn) => {
      tur = fn;
      return () => undefined;
    },
    yenileAyarla: () => undefined,
  };
  return { g, delta: () => delta!(), tur: () => tur!(), defterOkundu: () => defterBitir!(), defterCiz: () => defterCiz, tikCiz: () => tikCiz };
}

describe("mulkDinleKur: korumalı yeniden çizim", () => {
  it("kare/delta yolu: #pz-oran odaktayken çizim yapılınca odak ve imleç korunur (yakala -> çizim -> geri, eşzamanlı)", () => {
    const s = sayfa();
    const k = girdiKur(s.yakala);
    mulkDinleKur(k.g, s.f);
    s.olay.length = 0;
    k.delta();
    expect(s.olay).toEqual(["yakala", "cizim", "geri"]);
    expect(s.durum.alan).toMatchObject({ odakta: true, imlec: [2, 4] });
  });

  it("Defter okuma yolu: okuma bitince çizim korumalı (P13: her sim saatinde tetiklenir)", () => {
    const s = sayfa();
    const k = girdiKur(s.yakala);
    mulkDinleKur(k.g, s.f);
    s.olay.length = 0;
    k.defterOkundu();
    expect(s.olay).toEqual(["yakala", "cizim", "geri"]);
    expect(s.durum.alan).toMatchObject({ odakta: true, imlec: [2, 4] });
  });

  it("iki saniyelik tur ve turdaki Defter okuması da korumalı; tur çizimden önce `tik` işini yapar", () => {
    const s = sayfa();
    const k = girdiKur(s.yakala);
    mulkDinleKur(k.g, s.f);
    s.olay.length = 0;
    k.tur();
    expect(s.olay).toEqual(["yakala", "cizim", "geri"]);
    s.olay.length = 0;
    s.durum.alan = { id: "pz-oran", odakta: true, imlec: [1, 1] };
    k.defterOkundu(); // tik'in verdiği çizim de aynı korumalı çizimdir
    expect(s.olay).toEqual(["yakala", "cizim", "geri"]);
    expect(s.durum.alan).toMatchObject({ odakta: true, imlec: [1, 1] });
    s.olay.length = 0;
    s.durum.alan = { id: "pz-oran", odakta: true, imlec: [3, 5] };
    k.tikCiz()!(s.f);
    expect(s.olay).toContain("cizim");
  });

  it("odak başka yerdeyse yakalanacak şey yok: çizim yapılır, geri yükleme çağrılmaz; çizim hata verse de geri yüklenir", () => {
    const s = sayfa();
    s.durum.alan.odakta = false;
    const k = girdiKur(s.yakala);
    mulkDinleKur(k.g, s.f);
    s.olay.length = 0;
    k.delta();
    expect(s.olay).toEqual(["cizim"]);
    s.durum.alan = { id: "pz-oran", odakta: true, imlec: [2, 2] };
    s.olay.length = 0;
    const patlayan = (): void => {
      s.olay.push("cizim");
      throw new Error("çizim");
    };
    const k2 = girdiKur(s.yakala);
    mulkDinleKur(k2.g, patlayan);
    s.olay.length = 0;
    expect(() => k2.delta()).toThrow("çizim");
    expect(s.olay).toEqual(["yakala", "cizim", "geri"]);
  });

  it("negatif kontrol: korumasız çizim (düzeltme kaldırılırsa) odağı ve imleci kaybeder", () => {
    const s = sayfa();
    s.f(); // eski kod: f() doğrudan
    expect(s.durum.alan).toMatchObject({ odakta: false, imlec: [0, 0] });
  });

  it("dönen işlev dinleyiciyi bırakır ve yenile bağlantısını sıfırlar", () => {
    const s = sayfa();
    const k = girdiKur(s.yakala);
    const yenile: Array<(() => void) | null> = [];
    let birakildi = 0;
    let durdu = 0;
    const g: MulkDinleGirdisi = { ...k.g, bDinle: () => () => void birakildi++, zamanla: () => () => void durdu++, yenileAyarla: (y) => void yenile.push(y) };
    const bitir = mulkDinleKur(g, s.f);
    expect(yenile).toHaveLength(1);
    expect(typeof yenile[0]).toBe("function");
    bitir();
    expect(yenile.at(-1)).toBeNull();
    expect([birakildi, durdu]).toEqual([1, 1]);
  });
});
