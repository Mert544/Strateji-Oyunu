/** Sahip metni DOLU olduğunda (destek e-postası ve KVKK adresi tabloda dolu): ilgili satırlar ve bağlantı görünür. */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/giris/giris-metin", async (orijinal) => {
  const m = await orijinal<typeof import("../src/giris/giris-metin")>();
  return { ...m, destekEpostasi: () => "destek@ornek.org", kvkkAdresi: () => "https://ornek.org/kvkk" };
});

import type { GirisDurumu } from "../src/giris/akis";
import { girisHtml, hesapHtml } from "../src/giris/ekran-html";

const d = (k: Partial<GirisDurumu>): GirisDurumu => ({
  ekran: "g2", eposta: "a@b.co", gonderiyor: false, hata: null, yenidenGonderBitis: 0, gonderimSayisi: 3, tekrarSiniri: false, tekrarGonderildi: false,
  gecerlilikSn: 600, jetonVar: false, basari: false, oyuncu: null, yeniHesap: false, cikisYapildi: false, ad: null, adSecildi: null, adGirdi: "", adSurumu: 0, adYukleniyor: false, adSinirBitis: 0, adSonuc: null, ...k,
});
const b = { kalanSn: () => 0, epostaDegeri: "" };

describe("sahip metni dolu", () => {
  it("destek satırı yalnız sınır açıkken ve tekrar_siniri ile BİRLİKTE görünür", () => {
    const sinir = girisHtml(d({ tekrarSiniri: true }), b);
    expect(sinir).toContain("Birkaç kez gönderdin.");
    expect(sinir).toContain('data-kod="destek">Hâlâ gelmediyse bize yaz: <a class="gr-baglanti" href="mailto:destek@ornek.org">destek@ornek.org</a></p>');
    const yok = girisHtml(d({ tekrarSiniri: false }), b);
    expect(yok).not.toContain("destek@ornek.org");
    expect(yok).not.toContain("Birkaç kez gönderdin");
  });

  it("g1'de veri kullanımı bağlantısı dolu adresle; hesap bölümünde silme bilgisi", () => {
    const g1 = girisHtml(d({ ekran: "g1" }), b);
    expect(g1).toContain('<a class="gr-baglanti" data-eylem="veri-kullanimi" href="https://ornek.org/kvkk" target="_blank" rel="noopener noreferrer">Veri kullanımı</a>');
    const h = hesapHtml({ eposta: "a@b.co", onayAcik: false, cikiyor: false });
    expect(h).toContain('Hesabınla ilgili bir sorun olursa bize yaz: <a class="gr-baglanti" href="mailto:destek@ornek.org">destek@ornek.org</a>');
  });
});
