/**
 * Mülk kipi ölçek koşusu (S3; docs/11 F3 ölçütü "1k botla 30 gün"): sentetik-50 + sentetik-50 parsel fikstürü. Parsel botları
 * (E20-G10) henüz yok; bunun yerine betikli oyuncular: her oyuncu ilk 10 saatte katılır, bir ilçede 3 hücre alır, merkezi
 * ova ise çiftlik, dağ ise mera kurar; her dördüncü oyuncu bir liman ilinde 1 hücre alıp oradan ihracat emri verir
 * (merkezler arası MCF yükü). Varsayılan: 60 oyuncu, 3 gün (duman). Ağır: `BOLGE_AGIR_TEST=1` ile 1000 oyuncu, 30 gün:
 *   BOLGE_AGIR_TEST=1 nice -n 10 pnpm vitest run packages/cekirdek/test/mulk-olcek.test.ts
 */
import { parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { dunyaCoz, dunyaSerilestir } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, Komut } from "../src/tipler";

function olcekKosusu(oyuncuSayisi: number, gun: number): Record<string, number> {
  const veri: CekirdekVeriPaketi = { ...varsayilanVeriyiYukle(), parsel: parselFiksturuYukle("sentetik-50") };
  const f = veri.parsel!;
  const etiket = new Map(veri.harita.bolgeler.map((b) => [b.id, b.etiketler]));
  const ilMerkez = new Map(f.iller.map((i) => [i.id, i.bolge]));
  const limanIlceleri = f.ilceler.filter((c) => etiket.get(c.bolge)?.includes("liman"));
  const bas = performance.now();
  const s = Simulasyon.olustur(veri, 1);
  // İlçe başına sıradaki boş uygun hücre (betik kendi alımlarını izler).
  const imlec = new Map<string, number>();
  const hucreAl = (ilceId: string, adet: number): string[] => {
    const c = f.ilceler.find((x) => x.id === ilceId)!;
    const uygun = c.hucreler.filter((h) => h.uygun);
    const i = imlec.get(ilceId) ?? 0;
    const sinif = uygun[i]?.sinif;
    const secim = uygun.slice(i).filter((h) => h.sinif === sinif).slice(0, adet).map((h) => h.id);
    imlec.set(ilceId, i + secim.length);
    return secim;
  };
  let basarili = 0;
  let basarisiz = 0;
  const ver = (t: number, oyuncu: string, komut: Komut): boolean => {
    const r = s.uygula({ t, oyuncu, komut });
    if (r.tamam) basarili++;
    else basarisiz++;
    return r.tamam;
  };
  for (let i = 0; i < oyuncuSayisi; i++) {
    const t = Math.floor((i * 10 * SAAT) / oyuncuSayisi);
    const o = `p${String(i).padStart(4, "0")}`;
    ver(t, SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: o, bolgeler: [] });
    const ilce = f.ilceler[(i * 37) % f.ilceler.length]!;
    const hucreler = hucreAl(ilce.id, 3);
    const sinif = f.ilceler.find((c) => c.id === ilce.id)!.hucreler.find((h) => h.id === hucreler[0])?.sinif ?? "kirsal";
    if (!ver(t, o, { tur: "parsel_al", ilce: ilce.id, hucreler, sinif })) continue;
    const et = etiket.get(ilMerkez.get(ilce.il)!) ?? [];
    if (et.includes("ova")) ver(t, o, { tur: "tesis_insa_hucre", ilce: ilce.id, tesisTuru: "ciftlik", hucreler: hucreler.slice(0, 2) });
    else if (et.includes("dag")) ver(t, o, { tur: "tesis_insa_hucre", ilce: ilce.id, tesisTuru: "mera", hucreler });
    if (i % 4 === 0) {
      const li = limanIlceleri[i % limanIlceleri.length]!;
      const lh = hucreAl(li.id, 1);
      const ls = li.hucreler.find((h) => h.id === lh[0])?.sinif ?? "kirsal";
      if (ver(t, o, { tur: "parsel_al", ilce: li.id, hucreler: lh, sinif: ls })) {
        ver(t, o, { tur: "ticaret_emri", bolge: `${li.il}#${o}`, mal: et.includes("ova") ? "tahil" : "gida", yon: "ihracat", oranSaat: 50_000 });
      }
    }
  }
  for (let g = 1; g <= gun; g++) s.calistirKadar(g * GUN);
  const kosuMs = Math.round(performance.now() - bas);
  const t0 = performance.now();
  const metin = dunyaSerilestir(s.dunya);
  const serMs = Math.round(performance.now() - t0);
  const t1 = performance.now();
  const ozet = s.durumOzeti();
  const ozetMs = Math.round(performance.now() - t1);
  expect(Simulasyon.yukle(veri, dunyaCoz(metin)).durumOzeti()).toBe(ozet);
  const d = s.dunya;
  const sonuc = {
    oyuncu: d.oyuncular.length,
    gun,
    kosuMs,
    basarili,
    basarisiz,
    isletme: d.mulk!.isletmeler.length,
    hucre: d.mulk!.hucreler.length,
    tesis: d.bolgeler.reduce((t, b) => t + b.tesisler.length, 0),
    akis: d.lojistik.akislar.length,
    uzakAkis: d.lojistik.akislar.filter((a) => a.yol.length > 0).length,
    cozum: d.lojistik.cozumSayisi,
    cozumBasinaMs: Math.round((kosuMs * 100) / Math.max(1, d.lojistik.cozumSayisi)) / 100,
    kuyruk: d.kuyruk.length,
    baytKB: Math.round(metin.length / 1000),
    gzipKB: Math.round(gzipSync(metin).length / 1000),
    serilestirMs: serMs,
    durumOzetiMs: ozetMs,
  };
  console.log(`mulk olcek: ${JSON.stringify(sonuc)}`);
  return sonuc;
}

describe("mülk kipi ölçek koşusu", () => {
  it("duman: 60 oyuncu, 3 gün; işletmeler, tesisler, merkezler arası akışlar; serileştir/yükle aynı özet", () => {
    const r = olcekKosusu(60, 3);
    expect(r.isletme).toBeGreaterThanOrEqual(60);
    expect(r.tesis).toBeGreaterThan(10);
    expect(r.uzakAkis).toBeGreaterThan(0);
  }, 120_000);

  it.skipIf(process.env.BOLGE_AGIR_TEST !== "1")("AGIR: 1000 oyuncu, 30 gün", () => {
    const r = olcekKosusu(1000, 30);
    expect(r.isletme).toBeGreaterThanOrEqual(1000);
  }, 1_800_000);
});
