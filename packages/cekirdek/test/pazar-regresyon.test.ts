/**
 * Pazar (B3) regresyon kalkanı: pazar KAPALIYKEN çekirdek Sanayi v1 (B3 öncesi) davranışını BİREBİR verir.
 *
 * 1. Altın özetler: B3 öncesi kodla (git: Sanayi v1 commit'i ee4ee50) üretilmiş durum özetleri; B3 sonrası kod, B3 öncesi veri
 *    (fikstur-b2: pazar v1 alanı, liman tanımı ve kıtlık yok) ile aynı özetleri verir. Senaryo ticaret emirleri, ticaret anlaşması
 *    ve yaptırımı (üç makas kümesi) kapsar; bol hazineli ve yoksul hazineli (ithalat kısıtlama, ödeme gücü) iki varyant.
 * 2. Nötr açık mod: pazar v1 AÇIK ama prim 0 (limansız harita), komisyon 0, tarife 0, kıtlık cezası 0 ve oyuncu sayısı <= 4 iken
 *    ekonomik sonuç B3 öncesiyle aynıdır (B3 alanları özetten çıkarılınca özet birebir eşit).
 * 3. Kapalı dünyada B3 alanları hiç yazılmaz.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { GUN } from "../src/tipler";
import { durumOzeti } from "../src/ozet";
import { b2Veri, pazarSenaryoOzetleri } from "./regresyon-pazar-senaryo";
import { pazarAc, pazarOzetiEkAlansiz } from "./pazar-yardimci";

/**
 * B3 öncesi kodla (Sanayi v1 commit'i ee4ee50) üretilmiş altın özetler: 3., 7., 12. ve 16. gün sonu. S3 eşik budamasıyla
 * (docs/06 §14.1) yeniden üretildi: yalnız kuyruk değişti, kuyruk hariç durum ve işlenen etkin olaylar 12 noktada aynı
 * (`esik-budama-kanit.test.ts`). Budama öncesi son (16. gün) değerler: zengin t5 52f18829c5cf3602, t6 4011a1a3c295c444;
 * yoksul t5 8a7fa3a64b970fbd, t6 6fcf44855e9a5913.
 */
const ALTIN_ZENGIN_5 = ["4c632b9e416bcbe2", "716415d7c6571779", "4dbc05924ce43b9b", "567eaf4a10bbca02"];
const ALTIN_ZENGIN_6 = ["9d28926f0fe7c9ee", "6c69b23f7ab93c24", "88bb31b1b814fa93", "4726b62815531844"];
const ALTIN_YOKSUL_5 = ["916493114c616e20", "ea548be2336a3340", "51ce1cf5be94049d", "7a837ff7c2fb51c3"];
const ALTIN_YOKSUL_6 = ["4117a96fe5bf8d6c", "5cb4e98599dc663d", "85f3516f5a1958d5", "a97640b26a28e90d"];

describe("regresyon kalkanı: B3 öncesi veri + B3 sonrası kod = B3 öncesi özetler", () => {
  it("bol hazine: tohum 5 ve 6 özetleri B3 öncesi kodla birebir aynıdır", () => {
    expect(pazarSenaryoOzetleri(b2Veri(), 5)).toEqual(ALTIN_ZENGIN_5);
    expect(pazarSenaryoOzetleri(b2Veri(), 6)).toEqual(ALTIN_ZENGIN_6);
  });

  it("yoksul hazine (ithalat kısıtlama, ödeme gücü): tohum 5 ve 6 özetleri aynıdır", () => {
    expect(pazarSenaryoOzetleri(b2Veri(false), 5, false)).toEqual(ALTIN_YOKSUL_5);
    expect(pazarSenaryoOzetleri(b2Veri(false), 6, false)).toEqual(ALTIN_YOKSUL_6);
  });

  it("fikstürde pazar v1 yoktur: B3 parametreleri ve liman tanımı bulunmaz", () => {
    const v = b2Veri();
    for (const a of ["makasPpm", "anlasmaMakasPpm", "yaptirimMakasPpm", "limanPrimPpmSaat", "limanPrimTavaniPpm", "islemKomisyonuPpm", "npcLikiditeTabanOyuncu", "kitlik", "tarife"] as const) {
      expect(v.param.pazar[a]).toBeUndefined();
    }
    expect(v.harita.bolgeler.some((b) => b.liman !== undefined)).toBe(false);
    // tarım ve sanayi (B1, B2) açık: kalkan yalnız pazarı sınar
    expect(v.param.iklim).toBeDefined();
    expect(v.param.sanayi).toBeDefined();
  });

  it("kapalı dünyada pazar alanları hiç yazılmaz", () => {
    const s = Simulasyon.olustur(b2Veri(), 5);
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman"] } });
    s.calistirKadar(3 * GUN);
    expect(s.dunya.pazar.kaynak).toBeUndefined();
    for (const b of s.dunya.bolgeler) {
      expect(b.kitlikKademesi).toBeUndefined();
      expect(b.kitlikT).toBeUndefined();
      expect(b.temelKarsilanmaPpm).toBeUndefined();
    }
    for (const o of s.dunya.oyuncular) {
      expect(o.ticaretRejimi).toBeUndefined();
      expect(o.ticaretDefteri).toBeUndefined();
    }
  });
});

describe("nötr açık mod: pazar v1 açık ama etkisiz parametrelerle ekonomi B3 öncesiyle aynı", () => {
  function notrAc(zengin: boolean) {
    const v = b2Veri(zengin);
    pazarAc(v, { notr: true });
    return v;
  }

  it("makas 200000, prim/komisyon/tarife 0, kıtlık cezası 0: özet (B3 alanları çıkarılınca) altınla eşit", () => {
    for (const [tohum, altin] of [[5, ALTIN_ZENGIN_5], [6, ALTIN_ZENGIN_6]] as const) {
      const ozetler: string[] = [];
      pazarSenaryoOzetleri(notrAc(true), tohum, true, (s) => ozetler.push(pazarOzetiEkAlansiz(s.dunya)));
      // Son kontrol noktası (16. gün): altının son elemanı
      expect(ozetler[0]).toBe(altin[3]);
    }
  });

  it("yoksul hazinede de aynı (ithalat kısıtlama ve ödeme gücü yolları)", () => {
    const ozetler: string[] = [];
    pazarSenaryoOzetleri(notrAc(false), 5, false, (s) => ozetler.push(pazarOzetiEkAlansiz(s.dunya)));
    expect(ozetler[0]).toBe(ALTIN_YOKSUL_5[3]);
  });

  it("açık dünyada B3 alanları vardır ve özet kapalı moddan farklıdır", () => {
    const s = Simulasyon.olustur(notrAc(true), 5);
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman"] } });
    s.calistirKadar(1 * GUN);
    expect(s.dunya.pazar.kaynak).toBe("npc");
    expect(s.dunya.bolgeler.every((b) => b.kitlikKademesi !== undefined && b.kitlikT !== undefined)).toBe(true);
    expect(s.dunya.oyuncular[0]?.ticaretRejimi).toEqual({ ithalatTarifePpm: 0, ihracatVergisiPpm: 0 });
    expect(durumOzeti(s.dunya)).not.toBe(pazarOzetiEkAlansiz(s.dunya));
  });
});
