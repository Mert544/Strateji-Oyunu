/**
 * Parsel botları ve süren ölçek yükseltmesi: `InsaatDurumu.hedef` türe göre farklı anlam taşır (tesis: tür indeksi, kenar: kenar indeksi,
 * olcek: TESİS KİMLİĞİ). Süren bir `olcek` inşaatı (mülk kipinde `hucreler` tanımlıdır, boş olabilir) bot kararında tür indeksi sanılmamalı:
 * `yapiSayilari` ve `netCikti` yalnız `tesis` inşaatlarına bakar; karar atmaz ve ölçek inşaatı yokmuş gibi aynıdır.
 */
import { describe, expect, it } from "vitest";
import { GUN } from "@bolge/cekirdek";
import type { InsaatDurumu } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { parselBotuOlustur, parselKos } from "../src";

describe("parsel botları: süren ölçek yükseltmesi", () => {
  it("olcek inşaatının hedefi (tesis kimliği) tür indeksi sanılmaz: karar atmaz ve inşaat yokmuş gibi aynıdır", () => {
    for (const onayar of ["ciftci", "sanayici", "tuccar"] as const) {
      const bot = parselBotuOlustur(onayar, "b1");
      const r = parselKos({ veri: { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") }, tohum: 1, oyuncular: [{ id: "b1", bot, katilmaMs: 0 }], sureMs: 3 * GUN });
      const sim = r.sim;
      const d = sim.dunya;
      const dugum = d.mulk!.isletmeler.find((i) => i.oyuncu === "b1")!;
      const tesis = (d.bolgeler[dugum.bolgeIndeksi]!).tesisler[0]!;
      // Tesis kimliği tür sayısından büyük: tür indeksi sanılırsa tesisTurleri[hedef] tanımsız olur ve bot atar.
      expect(tesis.id).toBeGreaterThanOrEqual(sim.ic.tesisTurleri.length);
      const onceki = JSON.stringify(bot.karar(sim));
      const olcek: InsaatDurumu = { id: 999_001, tur: "olcek", sahip: "b1", bolge: dugum.bolgeIndeksi, hedef: tesis.id, bitis: d.zaman + GUN, olcek: 1, hucreler: [], baslangic: d.zaman };
      d.insaatlar.push(olcek);
      expect(() => bot.karar(sim)).not.toThrow();
      expect(JSON.stringify(bot.karar(sim))).toBe(onceki);
    }
  });
});
