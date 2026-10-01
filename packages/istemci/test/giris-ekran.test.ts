/**
 * Giriş ekranları iskeleti (G9-b; saf dizge): T1 sözleşmesi adları, metin tablosu, erişilebilirlik kuralları, sızdırmazlık ve boş sahip
 * metni. DOM katmanı (`gorunum.ts`) ince bağlamadır; uçtan uca görünüm sınaması kapıdadır.
 */
import { describe, expect, it } from "vitest";
import type { GirisDurumu } from "../src/giris/akis";
import type { IstemciHataKodu } from "../src/giris/api";
import { cumleBol, epostaMaske, girisHtml, hesapHtml, sayimMetni } from "../src/giris/ekran-html";
import { GIRIS_METIN, destekEpostasi, kvkkAdresi, metin, metinAnahtari, metinVar } from "../src/giris/giris-metin";
import { hataAnahtari } from "../src/giris/hata";

const BUYUK_SOZCUK = /\b[A-ZÇĞİÖŞÜ]{2,}\b/;

function durum(k: Partial<GirisDurumu> = {}): GirisDurumu {
  return {
    ekran: "g1",
    eposta: "",
    gonderiyor: false,
    hata: null,
    yenidenGonderBitis: 0,
    gonderimSayisi: 0,
    tekrarSiniri: false,
    tekrarGonderildi: false,
    gecerlilikSn: 600,
    jetonVar: false,
    basari: false,
    oyuncu: null,
    yeniHesap: false,
    cikisYapildi: false,
    ...k,
  };
}

const SIMDI = 1_000_000;
const b = (epostaDegeri = ""): Parameters<typeof girisHtml>[1] => ({ kalanSn: (bitis) => Math.max(0, Math.ceil((bitis - SIMDI) / 1000)), epostaDegeri });
const hata = (kod: IstemciHataKodu, ek: { dakika?: number; bitis?: number; eylem?: GirisDurumu["hata"] extends infer H ? (H extends { eylem: infer E } ? E : never) : never } = {}): NonNullable<GirisDurumu["hata"]> => ({
  kod,
  anahtar: hataAnahtari(kod),
  eylem: ek.eylem ?? "yeniden-dene",
  ...(ek.dakika !== undefined ? { dakika: ek.dakika } : {}),
  ...(ek.bitis !== undefined ? { bitis: ek.bitis } : {}),
});
const metinOnly = (html: string): string => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("metin tablosu", () => {
  it("anahtarlar giris.*; büyük harfli sözcük ve ₺ yok; her değer dolu (sahip metni hariç)", () => {
    for (const [k, v] of Object.entries(GIRIS_METIN)) {
      expect(k.startsWith("giris."), k).toBe(true);
      expect(BUYUK_SOZCUK.test(v), `${k}: ${v}`).toBe(false);
      expect(v.includes("₺"), k).toBe(false);
      if (k !== "giris.destek_eposta" && k !== "giris.kvkk_url") expect(v.length, k).toBeGreaterThan(0);
    }
  });

  it("sahip metni tek yerde ve boş: destek e-postası ve KVKK adresi (kodda sabit yok)", () => {
    expect(destekEpostasi()).toBe("");
    expect(kvkkAdresi()).toBe("");
    expect(Object.keys(GIRIS_METIN).filter((k) => /destek_eposta|kvkk_url/.test(k)).sort()).toEqual(["giris.destek_eposta", "giris.kvkk_url"]);
  });

  it("yer tutucular doldurulur; bilinmeyeni olduğu gibi bırakır; bilinmeyen anahtar anahtarın kendisi", () => {
    expect(metin("giris.G6.hiz_siniri", { n: 3 })).toBe("Çok sık denendi. 3 dakika sonra yeniden dene.");
    expect(metin("giris.G2.dugme_tekrar_bekle", { n: 45 })).toBe("Yeniden gönder (45 sn)");
    expect(metin("giris.G2.destek")).toContain("{destek_eposta}");
    expect(metin("giris.yok.anahtar")).toBe("giris.yok.anahtar");
    expect(metinVar("giris.yok.anahtar")).toBe(false);
  });

  it("her hata kodunun metni tabloda var (mantık anahtarı → takma ad dahil)", () => {
    const kodlar: IstemciHataKodu[] = ["gecersiz_istek", "gecersiz_eposta", "gecici_eposta", "hiz_siniri", "baglanti_gecersiz", "tarayici_uyumsuz", "oturum_yok", "origin", "yontem", "bulunamadi", "ic_hata", "ag_hatasi", "zaman_asimi", "yanit"];
    for (const k of kodlar) expect(metinVar(hataAnahtari(k)), k).toBe(true);
    expect(metinAnahtari("giris.G6.zaman_asimi")).toBe("giris.G6.ag_hatasi");
    expect(metin("giris.G6.oturum_yok")).toBe("Oturumun doldu. Devam etmek için yeniden giriş yap.");
  });

  it("sızdırmazlık: davetli/hesap/sınır/posta sonucu ima eden söz yok", () => {
    const hepsi = Object.values(GIRIS_METIN).join(" ").toLowerCase();
    for (const yasak of ["davetli misin", "listede yok", "hesabın var", "zaten kayıtlı", "kayıtlı değil", "posta gönderilemedi", "gönderilemedi"]) expect(hepsi.includes(yasak), yasak).toBe(false);
    // g2 "gönderdik" cümleleri koşulsuz: metin adrese ya da duruma bağlı bir koşul taşımaz
    expect(metin("giris.G2.govde", { adres: "x" })).toContain("gönderdik");
  });
});

describe("yardımcılar", () => {
  it("epostaMaske, cumleBol, sayimMetni", () => {
    expect(epostaMaske("ali@ornek.org")).toBe("a***@ornek.org");
    expect(epostaMaske("a@b.co")).toBe("a***@b.co");
    expect(epostaMaske("yazi")).toBe("yazi");
    expect(cumleBol("Oturumun doldu. Devam etmek için yeniden giriş yap.")).toEqual({ ilk: "Oturumun doldu", kalan: "Devam etmek için yeniden giriş yap." });
    expect(cumleBol("Tek cümle.")).toEqual({ ilk: "Tek cümle", kalan: "" });
    expect(sayimMetni(0)).toBe("0:00");
    expect(sayimMetni(59)).toBe("0:59");
    expect(sayimMetni(125)).toBe("2:05");
  });
});

describe("ekranlar: T1 sözleşmesi adları", () => {
  it("g1: başlık odaklanabilir, alan etiketli ve doğru öznitelikli, tek birincil gönderme düğmesi", () => {
    const h = girisHtml(durum(), b());
    expect(h).toContain('<main class="gr-kart">');
    expect(h).toContain('data-ekran="g1"');
    expect(h).toContain('<h1 id="gr-baslik" class="gr-baslik" tabindex="-1">Bölge Stratejisi&#39;ne gir</h1>');
    expect(h).toContain('<label class="gr-etiket" for="gr-eposta">E-posta adresin</label>');
    for (const o of ['id="gr-eposta"', 'class="gr-girdi"', 'type="email"', 'name="email"', 'autocomplete="email"', 'autocapitalize="off"', 'spellcheck="false"', 'inputmode="email"', "required", 'placeholder="ad@ornek.com"']) expect(h, o).toContain(o);
    expect(h).toContain('<button class="birincil gr-dugme" type="submit" data-eylem="baglanti-gonder">Bağlantı gönder</button>');
    expect(h).toContain('role="alert"');
    expect(h).toContain("Adresin yalnız giriş için kullanılır.");
    expect(h).toContain('data-durum="bos"');
    // KVKK adresi boşken veri kullanımı bağlantısı yok
    expect(h).not.toContain("veri-kullanimi");
  });

  it("g1: yazılan değer korunur ve kaçışlıdır", () => {
    const h = girisHtml(durum(), b('a"><script>x</script>@b.co'));
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
  });

  it("g1 hata: alan aria-invalid, hata satırı data-kod ve metin; yükleniyor: düğme kapalı", () => {
    const h = girisHtml(durum({ hata: hata("gecersiz_eposta", { eylem: "alanda-kal" }) }), b("ali"));
    expect(h).toContain('aria-invalid="true"');
    expect(h).toContain('data-kod="gecersiz_eposta"');
    expect(h).toContain("Bu adres geçerli görünmüyor. Kontrol edip yeniden dene.");
    expect(h).toContain('aria-describedby="gr-hata-g1"');
    expect(h).toContain('data-durum="hata"');
    const y = girisHtml(durum({ gonderiyor: true }), b("ali@b.co"));
    expect(y).toContain('data-durum="yukleniyor" disabled>Gönderiliyor…</button>');
  });

  it("g1 hız sınırı: düğme kapalı, geri sayım satırı ve yukarı yuvarlı dakika", () => {
    const h = girisHtml(durum({ hata: hata("hiz_siniri", { eylem: "bekle", dakika: 2, bitis: SIMDI + 100_000 }) }), b());
    expect(h).toContain("Çok sık denendi. 2 dakika sonra yeniden dene.");
    expect(h).toContain('<p class="gr-sayim" data-sayim="hiz" data-saniye="100">1:40</p>');
    expect(h).toMatch(/data-eylem="baglanti-gonder" aria-disabled="true">/);
    // süre dolmuşsa satır ve kilit yok
    const dolmus = girisHtml(durum({ hata: hata("hiz_siniri", { eylem: "bekle", dakika: 2, bitis: SIMDI - 1 }) }), b());
    expect(dolmus).not.toContain("gr-sayim");
    expect(dolmus).not.toMatch(/baglanti-gonder" (aria-)?disabled/);
  });

  it("çıkıştan sonra g1: sonuç satırı", () => {
    expect(girisHtml(durum({ cikisYapildi: true }), b())).toContain("Çıkış yaptın. Yeniden girmek için bağlantı iste.");
    expect(girisHtml(durum(), b())).not.toContain("Çıkış yaptın");
  });

  it("g2: adres kaçışlı ve kalın, bekleme sırasında aria-disabled ve geri sayım etiketi; yardım tek paragraf", () => {
    const d = durum({ ekran: "g2", eposta: "ali<b>@ornek.org", yenidenGonderBitis: SIMDI + 60_000, gonderimSayisi: 1 });
    const h = girisHtml(d, b());
    expect(h).toContain('data-ekran="g2"');
    expect(h).toContain('<b class="gr-adres">ali&lt;b&gt;@ornek.org</b> adresine bir giriş bağlantısı gönderdik. Bağlantı 10 dk geçerli ve yalnız bir kez kullanılır.');
    // geçerlilik süresi sunucudan (gecerlilikSn): ham yer tutucu çıkmaz
    expect(girisHtml(durum({ ekran: "g2", eposta: "a@b.co", gecerlilikSn: 1800 }), b())).toContain("Bağlantı 30 dk geçerli");
    expect(girisHtml(durum({ ekran: "g2", eposta: "a@b.co", gecerlilikSn: 7200 }), b())).toMatch(/Bağlantı 2(,0)? sa geçerli/);
    expect(girisHtml(durum({ ekran: "g2", eposta: "a@b.co" }), b())).not.toMatch(/\{[a-z_]+\}/);
    expect(h).toContain("Yeni bağlantı gönderince eskisi geçersiz olur.");
    expect(h).toContain('data-eylem="yeniden-gonder" data-sayim="tekrar" aria-disabled="true">Yeniden gönder (60 sn)</button>');
    expect(h).toContain('data-durum="bekliyor"');
    expect(h).toContain('<details class="gr-yardim"><summary>Gelmedi mi?</summary><p class="gr-yardim-metin">Gelmediyse gereksiz ya da spam klasörüne bak. Adresi yanlış yazdıysan değiştir. Davet edildiğin adresi kullandığından emin ol.</p></details>');
    expect(h).toContain('data-eylem="adresi-degistir"');
    expect(h).toContain('<span class="gr-simge" aria-hidden="true">');
    // posta uygulamasını açan kısayol ve "davetli" ima yok
    expect(metinOnly(h).toLowerCase()).not.toContain("posta uygulamasını aç");
  });

  it("g2: süre dolunca düğme açık; yeniden gönderildi satırı; sınır satırı destek e-postası boşken yalnız sınır metni", () => {
    const hazir = girisHtml(durum({ ekran: "g2", eposta: "a@b.co", yenidenGonderBitis: SIMDI - 1, tekrarGonderildi: true, gonderimSayisi: 2 }), b());
    expect(hazir).toContain('data-eylem="yeniden-gonder" data-sayim="tekrar">Yeniden gönder</button>');
    expect(hazir).toContain("Yeni bir bağlantı gönderdik.");
    expect(hazir).toContain('data-durum="hazir"');
    const sinir = girisHtml(durum({ ekran: "g2", eposta: "a@b.co", yenidenGonderBitis: SIMDI - 1, tekrarSiniri: true, gonderimSayisi: 3 }), b());
    expect(sinir).toContain("Birkaç kez gönderdin. Biraz bekleyip posta kutunu yeniden kontrol et.");
    expect(sinir).not.toContain("Hâlâ gelmediyse bize yaz"); // destek e-postası sahip metni: boşken satır yok
    const normal = girisHtml(durum({ ekran: "g2", eposta: "a@b.co", yenidenGonderBitis: SIMDI - 1 }), b());
    expect(normal).not.toContain("Birkaç kez gönderdin");
  });

  it("g2: gönderilirken kapalı + 'Gönderiliyor…'; hata satırı düğmenin üstünde", () => {
    const h = girisHtml(durum({ ekran: "g2", eposta: "a@b.co", gonderiyor: true, yenidenGonderBitis: SIMDI - 1 }), b());
    expect(h).toContain('data-durum="yukleniyor" disabled>Gönderiliyor…</button>');
    const e = girisHtml(durum({ ekran: "g2", eposta: "a@b.co", yenidenGonderBitis: SIMDI - 1, hata: hata("ag_hatasi") }), b());
    expect(e).toContain("Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.");
    expect(e.indexOf("gr-hata-g2")).toBeLessThan(e.indexOf('data-eylem="yeniden-gonder"'));
  });

  it("g3: onay düğmesi; yükleniyor; başarı; geçersiz bağlantıda başlık ve 'yeni bağlantı iste'", () => {
    const bos = girisHtml(durum({ ekran: "g3", jetonVar: true }), b());
    expect(bos).toContain('data-ekran="g3"');
    expect(bos).toContain("Giriş yapıyorsun");
    expect(bos).toContain('data-eylem="giris-yap">Giriş yap</button>');
    expect(bos).toContain("Başka bir tarayıcıdan oynamak istersen orada yeniden bağlantı iste.");
    const yuk = girisHtml(durum({ ekran: "g3", jetonVar: true, gonderiyor: true }), b());
    expect(yuk).toContain('data-durum="yukleniyor" disabled>Giriş yapılıyor…</button>');
    const bas = girisHtml(durum({ ekran: "g3", basari: true }), b());
    expect(bas).toContain('role="status">Giriş yaptın.</p>');
    const gec = girisHtml(durum({ ekran: "g3", jetonVar: false, hata: hata("baglanti_gecersiz", { eylem: "yeni-baglanti-iste" }) }), b());
    expect(gec).toContain("Bu bağlantı geçerli değil");
    expect(gec).toContain("Bu bağlantı artık geçerli değil (kullanılmış ya da süresi dolmuş olabilir). Yeni bir bağlantı iste.");
    expect(gec).toContain('data-eylem="yeni-baglanti-iste">Yeni bağlantı iste</button>');
    expect(gec).not.toContain("giris-yap");
    expect(gec).not.toContain("Başka bir tarayıcıdan");
  });

  it("g3 hız sınırı (onayda 429): düğme kapalı + geri sayım; tarayıcı uyumsuz metni", () => {
    const h = girisHtml(durum({ ekran: "g3", jetonVar: true, hata: hata("hiz_siniri", { eylem: "bekle", dakika: 1, bitis: SIMDI + 60_000 }) }), b());
    expect(h).toContain("Çok sık denendi. 1 dakika sonra yeniden dene.");
    expect(h).toMatch(/data-eylem="giris-yap" aria-disabled="true">/);
    expect(h).toContain('data-sayim="hiz"');
    const t = girisHtml(durum({ ekran: "g3", jetonVar: true, hata: hata("tarayici_uyumsuz", { eylem: "yeni-baglanti-iste" }) }), b());
    expect(t).toContain("Bu bağlantıyı isteği yaptığın tarayıcıda aç.");
  });

  it("g7: başlık ilk cümle, gövde kalan + alt; tek birincil 'Giriş yap'", () => {
    const h = girisHtml(durum({ ekran: "g7", hata: hata("oturum_yok", { eylem: "giris" }) }), b());
    expect(h).toContain('data-ekran="g7"');
    expect(h).toContain('tabindex="-1">Oturumun doldu</h1>');
    expect(h).toContain("Devam etmek için yeniden giriş yap. İlerlemen korunuyor; hesabın aynı kalır.");
    expect(h).toContain('data-eylem="yeniden-giris">Giriş yap</button>');
  });

  it("açılış yükleniyor ve oyun: yükleniyor durumu bekleme metni; oyun ekranında içerik yok", () => {
    expect(girisHtml(durum({ ekran: "yukleniyor" }), b())).toContain("Dünyana bağlanıyoruz.");
    expect(girisHtml(durum({ ekran: "g4" }), b())).toContain("Dünyana bağlanıyoruz."); // G9-c'ye dek adım atlanır
    expect(girisHtml(durum({ ekran: "oyun" }), b())).toBe("");
  });
});

describe("ekran kuralları (tüm durumlar)", () => {
  const durumlar: Array<[string, GirisDurumu]> = [
    ["yukleniyor", durum({ ekran: "yukleniyor" })],
    ["g1", durum()],
    ["g1 hata", durum({ hata: hata("gecersiz_eposta", { eylem: "alanda-kal" }) })],
    ["g1 hız", durum({ hata: hata("hiz_siniri", { eylem: "bekle", dakika: 5, bitis: SIMDI + 300_000 }) })],
    ["g1 yükleniyor", durum({ gonderiyor: true })],
    ["g2", durum({ ekran: "g2", eposta: "a@b.co", yenidenGonderBitis: SIMDI + 5_000 })],
    ["g2 sınır", durum({ ekran: "g2", eposta: "a@b.co", tekrarSiniri: true, tekrarGonderildi: true })],
    ["g3", durum({ ekran: "g3", jetonVar: true })],
    ["g3 geçersiz", durum({ ekran: "g3", hata: hata("baglanti_gecersiz", { eylem: "yeni-baglanti-iste" }) })],
    ["g7", durum({ ekran: "g7", hata: hata("oturum_yok", { eylem: "giris" }) })],
  ];

  it("tek h1 (odaklanabilir) ve en çok bir birincil düğme; yalnız sözleşme sınıfları; büyük harfli sözcük yok", () => {
    for (const [ad, d] of durumlar) {
      const h = girisHtml(d, b("a@b.co"));
      // açılış yükleniyor ekranında h1 yok (durum bölgesi; başlık yerine `p#gr-baslik`)
      expect((h.match(/<h1\b/g) ?? []).length, ad).toBe(d.ekran === "yukleniyor" ? 0 : 1);
      expect(h, ad).toContain('id="gr-baslik"');
      expect((h.match(/class="birincil\b/g) ?? []).length, ad).toBeLessThanOrEqual(1);
      for (const [, sinif] of h.matchAll(/class="([^"]+)"/g)) for (const s of sinif!.split(/\s+/)) expect(s, `${ad}: ${s}`).toMatch(/^(gr-[a-z-]+|birincil|eylem|ilerleme|ikon)$/);
      expect(BUYUK_SOZCUK.test(metinOnly(h).replace(/Bölge Stratejisi/g, "")), ad).toBe(false);
      expect(h.includes("₺"), ad).toBe(false);
      expect(h, ad).not.toMatch(/style=/);
    }
  });

  it("her alan etiketli; aria-describedby var olan öğeyi gösterir; hata satırları role=alert", () => {
    for (const [ad, d] of durumlar) {
      const h = girisHtml(d, b("a@b.co"));
      for (const [, id] of h.matchAll(/<input[^>]*\bid="([^"]+)"/g)) expect(h, `${ad}: label for=${id}`).toContain(`for="${id}"`);
      for (const [, id] of h.matchAll(/aria-describedby="([^"]+)"/g)) expect(h, `${ad}: ${id}`).toContain(`id="${id}"`);
      for (const [ust] of h.matchAll(/<p[^>]*class="gr-hata"[^>]*>/g)) expect(ust, ad).toContain('role="alert"');
    }
  });

  it("sızdırmazlık: hiçbir ekran hesabın varlığını ya da e-posta sınırını ima etmez", () => {
    for (const [ad, d] of durumlar) {
      const t = metinOnly(girisHtml(d, b())).toLowerCase();
      for (const yasak of ["davetli", "listede", "hesabın var", "kayıtlı"]) {
        // "Davet edildiğin adresi kullandığından emin ol" yardım cümlesi genel bilgidir (A1: davetli olup olmadığını söylemez)
        if (yasak === "davetli") expect(t.includes("davetli misin"), ad).toBe(false);
        else expect(t.includes(yasak), `${ad}: ${yasak}`).toBe(false);
      }
    }
  });
});

describe("G-8 hesap bölümü", () => {
  it("e-posta maskeli, çıkış ve tümünden çık düğmeleri; silme bilgisi destek adresi boşken yok", () => {
    const h = hesapHtml({ eposta: "ali@ornek.org", onayAcik: false, cikiyor: false });
    expect(h).toContain('class="gr-hesap-eposta">E-posta: a***@ornek.org</p>');
    expect(h).not.toContain("ali@ornek.org");
    expect(h).toContain('data-eylem="cikis"');
    expect(h).toContain("Çıkış yap");
    expect(h).toContain('data-eylem="cikis-tumu"');
    expect(h).toContain("Tüm cihazlardan çık");
    expect(h).not.toContain("Hesabını silmek istersen");
    expect(h).not.toContain("gr-onay");
    expect(h).not.toContain("hesabımı sil");
  });

  it("onay: alertdialog, tehlike düğmesi ve vazgeç; çıkarken düğmeler kapalı; e-posta henüz yoksa satır yok", () => {
    const o = hesapHtml({ eposta: "", onayAcik: true, cikiyor: false });
    expect(o).not.toContain("gr-hesap-eposta");
    expect(o).toContain('role="alertdialog"');
    expect(o).toContain("Hesabının bütün oturumları kapanır. Devam edilsin mi?");
    expect(o).toContain('class="tehlike" type="button" data-eylem="cikis-tumu-onayla"');
    expect(o).toContain('data-eylem="cikis-tumu-vazgec">Vazgeç</button>');
    const k = hesapHtml({ eposta: "a@b.co", onayAcik: false, cikiyor: true });
    expect(k.match(/disabled/g)?.length).toBe(2);
  });
});
