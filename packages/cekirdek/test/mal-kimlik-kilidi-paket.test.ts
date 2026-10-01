/**
 * Mal ve yapı kimlik kilidi, VERİ PAKETİ düzeyinde (docs/06 §15.8): paket `kimlikListesi` taşıyorsa `dogrulaKimlikKilidi` (yükleyiciler `dogrulaVeriPaketi`den sonra çağırır) içeriği
 * listeye karşı denetler; ihlalde paket geçersizdir. Kilit `icerikDerle`'de ve `dogrulaVeriPaketi`de DEĞİLDİR: çekirdek ve doğrulayıcı istemci paketine girdiğinden `@bolge/veri`den yalnız TİP
 * alır (çalışma zamanı importu yok; aşağıdaki güvence testi). Kuralların ayrıntılı ret testleri: `veri/test/kimlik-listesi.test.ts`; burada çekirdeğin
 * gördüğü paketler (mini, mülk, dondurulmuş fikstür) ve çekirdeğin kilidi UYGULAMADIĞI sınanır.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dogrulaKimlikKilidi, miniVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { Simulasyon } from "../src/motor";
import { b2Veri } from "./regresyon-pazar-senaryo";
import { mulkVeriTam } from "./mulk-yardimci";

const hatalar = (v: ReturnType<typeof miniVeriyiYukle>): string => {
  const r = dogrulaKimlikKilidi(v);
  return r.gecerli ? "" : r.hatalar.join("\n");
};

describe("paket kimlik kilidi (çekirdeğin paketleri; `dogrulaKimlikKilidi`)", () => {
  it("güncel paketler (mini, mülk) geçerli ve 24 mallıdır; çekirdek derler", () => {
    expect(hatalar(miniVeriyiYukle())).toBe("");
    expect(icerikDerle(miniVeriyiYukle()).mallar).toHaveLength(24);
    expect(Simulasyon.olustur(mulkVeriTam(), 1).ic.mallar).toHaveLength(24);
  });

  it("(a) listede olmayan mal / tesis türü / ek yapı reddedilir", () => {
    const v = miniVeriyiYukle();
    v.icerik.mallar.push({ id: "uydurma_mal", ad: "U", kategori: "ara", tabanFiyat: 1000, lojistikOnceligi: 5, bozulmaPpmGun: 0 });
    expect(hatalar(v)).toMatch(/\[kimlik-listesi\] icerik\.mallar: kimlik listede yok .*: uydurma_mal/);
    const t = miniVeriyiYukle();
    t.icerik.tesisTurleri.push({ ...t.icerik.tesisTurleri[0]!, id: "uydurma_tesis" });
    expect(hatalar(t)).toMatch(/icerik\.tesisTurleri: kimlik listede yok .*: uydurma_tesis/);
    const m = mulkVeriTam();
    m.param.mulk!.ekYapilar!["uydurma_yapi"] = { ...m.param.mulk!.ekYapilar!["ambar"]! };
    const r = dogrulaKimlikKilidi(m);
    expect(r.gecerli === false && r.hatalar.join("\n")).toMatch(/mulk\.ekYapilar: kimlik listede yok .*: uydurma_yapi/);
  });

  it("(b) araya ekleme ve yeniden sıralama reddedilir (silme: yöntem/tesis başvuruları içerik şemasını önce kırar; veri/test/kimlik-listesi.test.ts'te ayrı sınanır); sona ekleme (listedeki kimlik) kabul", () => {
    const araya = miniVeriyiYukle();
    araya.icerik.mallar.splice(2, 0, { ...araya.icerik.mallar[0]!, id: "cimento" });
    expect(hatalar(araya)).toMatch(/icerik\.mallar\[2\]: onek ihlali: icerikte "cimento", listede "cevher"/);
    const ters = miniVeriyiYukle();
    ters.icerik.mallar.reverse();
    expect(hatalar(ters)).toMatch(/onek ihlali/);
    const tesis = miniVeriyiYukle();
    tesis.icerik.tesisTurleri.reverse();
    expect(hatalar(tesis)).toMatch(/icerik\.tesisTurleri\[0\]: onek ihlali/);
    const sona = miniVeriyiYukle();
    sona.icerik.mallar.push({ ...sona.icerik.mallar[0]!, id: "cimento", ad: "Çimento", tabanFiyat: 45_000 });
    sona.param.pazar.emilimSaat["cimento"] = 160_000;
    sona.param.pazar.arzSaat["cimento"] = 110_000;
    expect(hatalar(sona)).toBe("");
  });

  it("(c) yasaklı kimlikler ve (f) taban fiyat (biçim (e): içerik şeması kendi kuralıyla önce yakalar; kimlik listesi düzeyinde veri/test'te)", () => {
    for (const id of ["tekstil", "sarkuteri"]) {
      const v = miniVeriyiYukle();
      v.icerik.mallar.push({ ...v.icerik.mallar[0]!, id });
      expect(hatalar(v)).toMatch(new RegExp(`yasakli mal kimligi: ${id}`));
    }
    const f = miniVeriyiYukle();
    f.icerik.mallar.find((m) => m.id === "findik_urunu")!.tabanFiyat = 190_000;
    expect(hatalar(f)).toMatch(/findik_urunu: tabanFiyat 190000 listedeki taban 240 TL/);
  });

  it("çekirdek kilidi UYGULAMAZ (istemci paketine kimlik doğrulayıcı kodu girmez): liste olsa da icerikDerle uydurma kimliği derler; liste yoksa dondurulmuş fikstürler geçerli", () => {
    const v = miniVeriyiYukle();
    v.icerik.mallar.push({ ...v.icerik.mallar[0]!, id: "uydurma_mal" });
    expect(v.kimlikListesi).toBeDefined();
    expect(() => icerikDerle(v)).not.toThrow();
    const eski = b2Veri();
    expect(eski.kimlikListesi).toBeUndefined();
    expect(icerikDerle(eski).mallar).toHaveLength(14);
  });
});

describe("güvence: cekirdek/src, @bolge/veri'den yalnız TİP alır (istemci paketi bütçesi)", () => {
  function kaynaklar(dizin: URL): URL[] {
    const sonuc: URL[] = [];
    for (const ad of readdirSync(dizin)) {
      const u = new URL(ad, dizin);
      if (statSync(u).isDirectory()) sonuc.push(...kaynaklar(new URL(`${ad}/`, dizin)));
      else if (ad.endsWith(".ts")) sonuc.push(u);
    }
    return sonuc;
  }

  it("src altında `@bolge/veri` (ya da /saf) çalışma zamanı importu yok: her import `import type` olmalı", () => {
    const dosyalar = kaynaklar(new URL("../src/", import.meta.url));
    expect(dosyalar.length).toBeGreaterThan(50);
    const ihlal: string[] = [];
    for (const d of dosyalar) {
      const metin = readFileSync(d, "utf8");
      // import ... from "@bolge/veri[/...]"  (çok satırlı olabilir) ve dinamik import("@bolge/veri...") ve require
      for (const m of metin.matchAll(/(^|\n)\s*(import|export)\s+(type\s+)?[^;]*?from\s+["'](@bolge\/veri[^"']*)["']/g)) {
        if (m[3] === undefined) ihlal.push(`${d.pathname}: ${m[0].trim().slice(0, 80)}`);
      }
      for (const m of metin.matchAll(/(import\(|require\()\s*["']@bolge\/veri/g)) ihlal.push(`${d.pathname}: ${m[0]}`);
    }
    expect(ihlal).toEqual([]);
  });
});
