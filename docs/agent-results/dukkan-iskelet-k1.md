# dukkan-iskelet: dükkân paneli iskeleti, D0 öneri kartı, B7 Defter kartı, ilk satış bildirimi (K1)

Dal: `takim/k1/dukkan-iskelet` (taban `takim/kod/p6b-zincir` d2f9beb; p4-bildirim zincirde a783f1d). Kapı durumu: Playwright ve pnpm dunya koşulmadı (kapı koşuyordu). Veri: sahte (K3 `kare.ozel.dukkanlar` köprüsü henüz yok); sözleşme `SP/takim/t1/g9-sozlesme.md` §B, §D, §I; metin `g9-dukkan-metin-son.md` (194 anahtar, T3 akış okuması dahil).

## Yapılanlar

1. **`harita/dukkan-metin.ts`**: T1 tablosu birebir (A1 anahtarları; yer tutucu ASCII: `{sure}`, `{ad}` = dükkân adı, `{kucuk}`, `{tur}`; T1'in `tasarim-metin.test` kuralı "dukkan" yazımını yasaklar) ve `DUKKAN_RET_ANAHTARI` (DUK-xx/MRK-xx → anahtar; DUK-19 üç ileti taşıdığı için eşlenmez). Tabloya K1 eklemesi: `dukkan.D1.baslik` ("Dükkânlarım"). Tablodan üretildi (elle değil); ₺ şablonda yok.
2. **`harita/dukkan-veri.ts`**: panelin tek veri yüzü `DukkanGorunumu` (dükkânlar, yuvalar, kampanya, marka, `ilkSatisT`, `kurmaKarsilaniyor`, `satilabilirMallar`) ve `DukkanKaynagi` (null = G7 kapalı, panel çıkmaz); `sahteDukkanKaynagi`. Saf kurallar: `oneriDurumu` (D0 ve B7 tek kart, öncelik dükkân önerisi), `uretimTesisiBasladi` (ilk üretim yapısının inşası BAŞLAMIŞ: ek yapı, dükkân ve büyütme sayılmaz), `rafaKonabilirStok`, `IlkSatisIzleyici` (alan bu oturumda ilk göründüğünde bir kez), `tarayiciDeposu` (localStorage try/catch, erişilemezse oturum içi).
3. **`harita/dukkan-html.ts`** (saf HTML; sınıf ve `data-*` sözleşmeyle birebir, stil yok): D0 öneri kartı, B7 Defter kartı, D1 Dükkânlarım, D2 tür seçimi (şekerci `yok_ithal`), D3 maliyet satırları (pencere yeter/eksik, tüm `data-durum`), D4 etiket, D5 raf (yuva durumu önceliği, kısa neden yuvada, tam cümle `title`/`aria-describedby`, dükkân düzeyi `p.dk-neden`) ve seçici, D6 kademe/kampanya (ipucu_kademe, kasa ≥ %95 ipucu `KASA_DOLU_IPUCU_ESIGI_PPM`, esnaf payı ipucu ≥ 2 dükkân), D8 özet (dört satır: satış BİRİM/sa, gelir, gider, net; toplam gelir ayrı satır), D8.1 menü ve onay, Dikkat maddeleri. Sabit sayı yok: iade yüzdesi, ilk yapı indirimi, kasa kapasitesi, esnaf payı parametreden.
4. **Çalışan yüzeyler (`mulk-panel.ts`)**: İşletmem'in üstünde (kimlik satırı sonrası, hak özetinden önce) tek kart: D0 koşulları sağlanınca dükkân önerisi, değilse ilk etkin Defter adımı ("Sıradaki adım", "ödül: …", tek eylem "Atla"); kapatma ve atlama tercihi `dukkan.oneri.kapali` / `defter.ust.atlandi` (localStorage, try/catch; atlanan yeniden çıkmaz). `#isletme-dugme[data-oneri="1"]` ve `aria-label` "İşletmem, yeni öneri var" yalnız dükkân önerisinde. "Dükkânlarım" Yapılar'ın altında; Dikkat sekmesine dükkân maddeleri; ilk satışta bir kez "Dükkânında ilk satış oldu; hayırlı olsun." bildirimi (`D8.ilk_satis`). `dukkan-panel.css` ilk kez `mulk-panel-stil`e dahil edildi (öncesinde hiçbir yerde içe aktarılmıyordu).
5. Defter metinleri T1 I.Ek 5'e: `ilk_dukkan` siradaki "Kendi tezgâhın: bir dükkân kur ve oradan ilk satışını yap.", kazanildi "İlk satışını dükkânından yaptın.".

## Test ve doğrulama

Yeni: `harita-dukkan-metin` (6), `harita-dukkan-veri` (10), `harita-dukkan-html` (31); `mulk-panel` (+3: kart sırası, ek yokken değişmez, Dikkat). tsc ve eslint (src+test) temiz. Tek dosya vitest 1 işçi: yeni üçü, mulk-panel 8, defter 7, tasarim 30, tasarim-metin 12 geçti.

## Boyut

Tümü harita.js yığınında (dunya.html bütçesine girmez). Kaba tahmin (esbuild minify + gzip, dosya dosya): metin tablosu 4,3 KB, html 4,8 KB (kullanılmayan dışa aktarımlar ağaç sallamayla düşer; yalnız `ustKartHtml`, `dukkanBolumuHtml`, `dukkanDikkatMaddeleri` ve bağımlıları kalır), veri 0,7 KB, `dukkan-panel.css` 3,2 KB (ilk kez dahil). Kesin ölçüm kapıda.

## Bağlı olmayanlar ve açık notlar

- **Veri köprüsü (K3/K2 sonrası)**: `MulkPaneliSecenekleri.dukkan` verilmezse yalnız B7 Defter kartı çalışır. `kare.ozel.dukkanlar`/`genel.dukkanlar`/`oyuncu.markalar`/`ilceler[].talep`/`oyuncu.ilkSatisT` → `DukkanGorunumu` çevirisi ayrı iştir (`kurmaKarsilaniyor` ve `satilabilirMallar` çekirdek planlayıcıdan gelir).
- **Çalışma akışına bağlanmayanlar**: D2, D3, D5, D6, D8 ve D8.1 yalnız saf HTML üretecidir; harita/yerleşim akışına (yapı menüsünde dükkân türü, `#yapi-kart` satırları, bina paneli, komutlar `dukkan_raf/fiyat/marka/yik`) bağlama G7 komutları istemci adaptörüne girince yapılır. `dukkanKur` geri çağrısı da verilmedi (D0 düğmesi şimdilik etkisiz).
- **D-7 marka formu yapılmadı**: simge ikonlarından yedisi `IKONLAR`ta yok (leaf, flame, gem, mountain, feather, flower, bird; T1) ve görünen ad kuralı çekirdekten (`adKanonik`) G9-c ile birlikte alınacak.
- **CSS (T1)**: `.dk-oneri` ailesi (`.dk-oneri-kapat`, `.dk-oneri-satir`, `.dk-oneri-sag`) henüz dosyada yok; ayrıca sözleşmede olmayan ek sınıflar kullanıldı: `.dk-tur-ad`, `.dk-tur-uyum`, `.dk-yuva-satir`, `.dk-yuva-tam` (gizli tam cümle), `.dk-maliyet`, `.dk-stok`, `.dk-menu-liste`, `.dk-ozet-toplam`. Metin öğeleri sınıfsız da okunur.
- B6 (harita etiketi kalan süre) ve B9 (dönüş "Net:" satırı) bu iste değil.
- D3 `D3.pencere_bekleme` ve `D6.ipucu_esnaf_payi` kuralları parametre verildiğinde çalışır; çağıran `param.mulk.perakende` değerlerini verecek.
