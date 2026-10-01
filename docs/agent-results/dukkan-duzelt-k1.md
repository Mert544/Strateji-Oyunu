# dukkan-duzelt: A1 akış okuması düzeltmeleri 1-9 (K1)

Dal `takim/k1/dukkan-duzelt` (taban T1 `takim/t1/dukkan-duzelt-metin` ed5112a = e531467 + metin anahtarları). Kapı durumu: Playwright ve pnpm dunya koşulmadı (PG ve P6b2 kapısı koşuyordu). Doğrulama: istemci tsc ve eslint temiz; tek dosya, tek işçi vitest: harita-dukkan-html 42, harita-dukkan-veri 11, harita-dukkan-metin 6, mulk-panel 8, defter 7, tasarim-metin 12 geçti.

1. D0 kartı yalnız `dukkanKur` bağlıyken çıkar (`OneriGirdisi.dukkanKurulabilir`); bağlı değilse Defter kartı yerine geçer (ölü uç yok).
2. `insaat_siniri` `{n}` `MaliyetGirdisi.esZamanliInsaat`'tan (`param.mulk.esZamanliInsaat`); sabit 3 kalktı.
3. Dikkat: inşadaki dükkân stoksuzsa `D4.dikkat_stoksuz`; açık dükkânın rafı tamamen boşsa stok varken `D4.raf_oneri`, yoksa `D5.bos_raf_uyari`; "başka mal var" yalnız en az bir yuva doluyken.
4. D0 kartı Defter'in sıradaki adımını `D0.defter_adim` ("Sıradaki adım: …") soluk satırıyla taşır (`.dk-oneri-defter-satir`).
5. Rafı boş açık dükkân D1'de `D1.satir_bos_raf` der (net yok); D8'de `satis_yok` yerine boş raf uyarısı.
6. Dolu yuvaların hepsi stoksuzsa `D5.raf_hepsi_stoksuz` ve "Yapı kur" mini düğmesi.
7. Seçicide stoklu mallar önce (stok çoktan aza).
8. B7 Defter kartına ikincil "Dükkân kur" (`data-eylem="dukkan-kur"`): yalnız `dukkanKur` bağlıyken ve adım `ilk_dukkan` iken; "Atla" kalır.
9. fiyatT döngüsü: boş yuvada da geri sayım (`data-bekleme`), "mal koy" aria-disabled; bütün yuvalar bekliyorsa `D5.bos_raf_bekleme` (en kısa süre). DUK-18 ret metni yuva dilinde `{sure}` ile (`retMetni`; ham yer tutucu çıkmaz); `D5.bosalt_uyari` "Yuvayı boşalt" yanında (`bosaltBeklemeSaat`). K3 `fiyatT-dongu` ile aynı pakete girmeli: köprü boş yuva için `beklemeSaat` doldurmalı (kare `DukkanRaf[5]` fiyatT boş yuvada da gelir).

Boyut (harita.js; kaba, esbuild minify + gzip): `dukkan-html` yaklaşık +0,4 KB; kesin ölçüm kapıda.

Bilinen: T1 md tablosunda henüz dalda olmayan değişiklikler var (`{hucre}`, `{ilce_enfazla}`, `{il_enfazla}`, `{sure}`, `D7.onizleme {kucuk_hali}`, `D7.uzunluk {en_az}/{en_cok}`, `tur_yapi_market` satırında tür adı yok). Bunlar T1 tablosu dala girince html'e işlenecek; `turAdi` için K1 ek anahtarı gerekecek (`dukkan.D2.tur_adi_yapi_market`).
