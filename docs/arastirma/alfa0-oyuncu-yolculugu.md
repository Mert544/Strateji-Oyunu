# Alfa-0 oyuncu yolculuğu: ilk 60 dakika, ilk gün, ilk hafta (A1)

> **Bu belge ne.** Yeni bir oyuncunun Alfa-0'da ilk haftasını, oyuncunun gözünden anlatır: ne yapar, ne görür, neye karar verir. Baş liderin sahibe sunacağı ürün raporunun omurgasıdır; bu yüzden sade yazıldı. **Yalnız belge**: hiçbir şey çalıştırılmadı.
>
> **Durum işaretleri.** **Bugün kodda var** = **ana dalda** (P5c, `0691310`; yurt önce `08b7ee8`, giriş mantığı `c327653` ve giriş ekranları iskeleti `0691310`, yapı yerleşimi dahil) çalışan özellik; **kaynak kod okumasıyla doğrulandı, hiçbir şey çalıştırılmadı**; ekran görüntüsü seti gelince ekranlar gözle de doğrulanacak. **Geliyor** = ekmek zinciri, dükkân, cam ve pencere (P4/P5) ya da ilk saat düzeltmeleri (G1–G9'un kalanı) gibi henüz ana dalda olmayan iş; belgelerde **tanımlıdır, oynanmış değildir**. **(doğrulanmadı)** = kaynaktan teyit edilemeyen bilgi. Süreler **hedeftir**; gerçek oyuncu hızı insan testinde (pilot paketi) ölçülecek.

## Bu geceki kararlar (belgeye giren)

| Karar | Ne demek oyuncu için |
|---|---|
| **Yurt önce** | Yeni oyuncuya ücretsiz yurt arsası (6 hücre) verilir; arsa satın almak zorunda değildir. **Ana dalda kodda** (`0691310`): yurt çekirdekte verilir (`4a7a91b`, 6 hücre, ayrılmış olmayan hücreler önce) ve istemcide varışta "Yurdun hazır" kartı çıkar; birincil düğme "Yurdunda kur · ücretsiz", ikincil "Arsa satın al" (`08b7ee8`, `harita/yurt.ts`). Ekran görüntüsü P5 setinde **doğrulanacak**. P4 görüntü setinde ilk akış hâlâ ücretli "hazır arsa" göstermişti |
| **Başlangıç kitinde 3 pencere** | İlk dükkân için pencere beklemek gerekmez; ilk dükkân ilk saatte **kurulabilir** (≈49. dakikada hazır; **hesap**, doğrulanmadı). Rafa konacak mal da kitten gelir: **kit gıdası ilk dükkânın rafı için saklanır** (aşağıda "Stok riski": karar verildi) |
| **İlk satış tahılla** | Defter'in "ilk satış" adımı **"Çiftliğinin tahılını sat."** der: ilk satış çiftliğin kendi ürünüyle yapılır, kitteki gıda satılmaz. İlk dükkân önerisi kartında tek satır: "Kitteki gıdayı rafın için sakla." **Kit verisi değişmedi** (gıda 200); çözüm yalnız metindir (baş lider kararı) |
| **Ekmek zinciri** | Buğday → un (değirmen) → ekmek (fırın) zinciri; elektrik ve yakıt **şebekeden otomatik** gelir, santral kurmak gerekmez |
| **Dükkân ve yerel pazar** | Kendi dükkânın ilçenin hane halkına satış yapar; raf, fiyat ve marka oyuncuda |
| **Defter ödülleri** | İlk ekmek: 5 ekmek · ilk pencere: 8 makine parçası · ilk dükkân: **ilk satışta** 10 çelik |
| **Kilit yok, seçim var** | Hiçbir şey seviye ya da sınıfla kilitli değil; yanlış kurulum geri alınabilir (inşada iptalde yarı iade; bitmiş dükkân iadesiz kaldırılır, arsa ve mallar kalır) |

## 1. İlk 60 dakika

| Zaman | Oyuncu ne yapar | Ne görür | Neye karar verir | Durum |
|---|---|---|---|---|
| **0–3 dk** | E-postasını yazar, postadaki bağlantıya dokunur; parola yok | "Postanı kontrol et", "Giriş yapıyorsun", sana önerilen küçük harfli ad | Adı kabul etmek ya da değiştirmek | E-posta girişi ve giriş ekranları (G-1…G-5, G-7, G-8 hesap bölümü) **bugün kodda** (`0691310`, `istemci/giris/`; yalnız e-posta kipinde, geliştirme kipinde giriş ekranı yok). Destek e-postası ve veri kullanımı bağlantısı sahip metni olarak **boş**: sahip söyleyene dek o satırlar görünmez. Ekranlar gözle **doğrulanacak**; hesap silme düğmesi ekranda yok ("bize yaz" satırı), sunucu ucu protokolde var |
| **3–6 dk** | Yerleş ekranında üç ilçeden birini seçer (Gebze, Gemlik, Körfez) | İlçe kartları, önerilen açılış, "başka ilçe öner"; "bu bir sınıf değil" notu | Hangi ilçe | **Ana dalda yalnız Gebze'de başlanabilir** (kodda: `veri.ts` `IZGARALI_ILCELER` yalnız Gebze). Gemlik ve Körfez kartlarda "arsa ızgarası yakında: yalnız gezebilirsin" der; açılışları **P6'daki ızgara zincirine** bağlı (veri ana dalda, istemciye bağlanması P6'da). Ekran düzeltmeleri de **geliyor** |
| **6–9 dk** | Arsasına bakar | Hazinede **50.000 ₺** hibe; ücretsiz yurt hücreleri (varışta "Yurdun hazır" kartı kodda; arsa listesindeki ayrı gösterim **doğrulanacak**); ilk 14 gün ilçende yeni oyunculara "ayrılmış hücreler"; ilk 14 gün ticarette komisyon ve vergi yok | Yapıyı nereye kuracağı | **Bugün kodda** |
| **9–15 dk** | "Yapı kur" der, çiftliği seçip yerleştirir | Maliyet kartı ("gereken / var"); ilk 5 yapıda %30 indirim; yapı iskele olur | Ne kuracağı, nereye | **Bugün kodda**; para biçimi ve kart düzeltmeleri **geliyor** (G1) |
| **15–27 dk** | Bekler (çiftlik ilk gün 12 dk'da biter) ya da çıkar | İskele ve "kuruluyor · m:ss içinde geri alabilirsin" geri alma sayacı; inşa sunucuda sürer, oyuncu çıksa da biter (olgu; bunu söyleyen bir metin istemci kodunda **bulunamadı**, rehber metni) | Beklemek, gezmek ya da çıkmak | Geri alma sayacı **bugün kodda**; "kapatsan da biter" metni ve haritada kalan süre etiketi **geliyor** |
| **≈25–30 dk** | **Çiftliğinin tahılını** Pazar'da satar (satış emri verir); **kit gıdasını (200) rafa saklar** | Nakit artar; "ilk satış" (Defter damgası ve ₺500 ödülü **saat sınırında** gelir: satıştan sonra en çok bir saat içinde, ≈25–90 dk arası) | Ne kadar tahıl, hangi fiyata | **Bugün kodda**; "Çiftliğinin tahılını sat." metni **geliyor** |
| **sürekli** | Esnaf Defteri'ne bakar | Sıradaki adımlar ve işlenenler; ödüller (ilk yapı 5 çelik, ilk satış 500 ₺) | Defteri izlemek, sıradaki adımı "Atla" ile gizlemek ya da yok saymak (zorunlu değil; atlayınca ödül hakkı ve Defter yerinde kalır) | **Bugün kodda**; "Atla" düğmesi ve dükkân kartı **geliyor** |
| **≈25–50 dk** | İkinci karar: **ekmek zinciri** ve/ya da **dükkân** | Gıda fabrikasında "değirmen" ve "fırın" seçimi; maliyet kartında eksik malzeme | Zinciri uzatmak mı, dükkân mı, ikisi mi (ikisi de zorunlu değil) | **Geliyor** (P4/P5) |
| ↳ dükkân | Dükkân türünü (bakkal, fırın, şarküteri, şekerci) ve bir hücreyi seçer | Bedel **6.000 ₺ + 20 çelik + 8 makine parçası + 4 pencere** (ilk 5 yapıda indirimli); pencereler başlangıç kitinden karşılanır; inşa ≈24 dk | Tür ve yer | **Geliyor** (G7, G9) |
| ↳ ekmek zinciri | Gıda fabrikası kurar, değirmen ve fırın seçer | Elektrik şebekeden gelir (ayrı bir şey kurmaz); tesisler ≈36 dk'da biter; ilk ekmek | Kaç fabrika, hangi yöntem | **Geliyor** (G6) |
| **≈49. dk** | Dükkân hazır; rafına kit gıdasını koyar | "Dükkânın hazır; hayırlı olsun"; **boş rafta satış olmaz** uyarısı ("bir yuvaya mal koyunca satış başlar") | Hangi mallar (4 yuva; ilk satış için **1 yuva** yeter) | **Geliyor**; ≈49. dk bir **hesap** |
| **≈50–60 dk** (kit gıdası rafta) | İlk dükkân satışını görür | Defter: "ilk satışını dükkânından yaptın", **10 çelik**; ilk satış zamanı **(doğrulanmadı: ilk çözüm anı)** | Fiyat kademesine bakmak (normal varsayılan) | **Geliyor** |
| **≈1–1,5 sa** (**kalan küçük durum:** oyuncu metne uymayıp kit gıdasını da sattıysa) | Ekmek zinciri (değirmen + fırın) kurulunca rafa ekmek koyar; ilk dükkân satışı o zaman olur | Rafta "stoğun yok" ya da "Rafa koyacak malın yok. Gıda ya da ekmek üret." görünür | Zinciri kurmak mı, gıda üretmek mi | **Geliyor** (P4/P5); süre A2'nin kâğıt modeli |
| **60. dk** | Çıkar | "Çıkabilirsin, dönünce özet gösteririz" notu (rehber ve test kılavuzu metni; istemci kodunda **bulunamadı**) | Çıkmak | Not **geliyor** (doğrulanmadı); dönüşte "Sen yokken" kartı **bugün kodda** |

## 2. İlk gün (ilk 24 saat)

| Konu | Oyuncu ne yapar | Ne görür | Neye karar verir | Durum |
|---|---|---|---|---|
| **Erken oyun hızı** | Yapıları hızlı kurar | İlk 24 saatte inşa süreleri normalin %10'u; sonra 7. güne doğru yavaşça normale döner | Kaç yapı, hangi sırayla (aynı anda en çok 2 inşaat) | **Bugün kodda** |
| **Dükkânı çalıştırmak** | Raf, fiyat ve marka ayarlar | Her yuvaya bir mal; fiyat kademesi: **Alfa-0'da kampanya varsayılan kapalıdır, oyuncu 3 kademe görür** (uygun, normal, yüksek; normal varsayılan); kampanya sonradan açılırsa 4. kademe gelir; fiyatı en çok 6 saatte bir değiştirir; marka adı **herkese görünür** (küçük harfle kaydedilir) | Fiyat, marka, hangi mal | **Geliyor** (G7, G9) |
| **Dükkân kendi kendine satar** | Çıkar, döner | "Sen yokken" sayfası: net sonuç, biten yapılar, dükkândan satış | Rafı yenilemek, fiyatı değiştirmek | Sen yokken ekranı **bugün kodda**; dükkân satırı **geliyor** |
| **Zincirin ilk ürünleri** | Ekmeği satar ya da dükkâna koyar | Defter: "ilk ekmek" (5 ekmek); zincir kapanınca Defter ödülü | Ekmeği nerede satacağı | **Geliyor** (P4) |
| **İkinci yapı** | Ahır ya da bir başka yapı kurabilir | Maliyet kartı, Dikkat paneli önerileri | Hangi yön (zorunlu yol yok) | **Bugün kodda**; ahırın kepek yöntemi **geliyor** |
| **Yanlış kurdum** | Yapıyı iptal eder ya da kaldırır | İnşadaysa iptal (ödenenin yarısı geri); bitmiş dükkân için "dükkânı kaldır" (iade yok, arsa ve mallar kalır, açık uyarıyla) | Vazgeçmek | İnşa iptali **bugün kodda**; dükkân kaldırma **geliyor** (G7) |
| **Dönüş** | Birkaç saat sonra döner | "Sen yokken" kartı: 1–6 saatte kısa kart, 6 saatten sonra tam kart (en çok 8 satır, tek düğme "Devam", suçlayan dil yok) | Neye devam edeceği | **Bugün kodda** (`harita/donus-ekrani.ts`, "en küçük hâl"); tasarımdaki tek satırlık şerit ve "Gün Sayfası" düzeni **geliyor** |

## 3. İlk hafta (ilk 7 gün)

| Konu | Oyuncu ne yapar | Ne görür | Neye karar verir | Durum |
|---|---|---|---|---|
| **Korunma** | Rahat kurar | İlk 14 gün yeni oyuncu kalkanı (ticarette komisyon ve vergi yok), ayrılmış hücre hakkı, ilk 5 yapıda indirim | Hakları nasıl kullanacağı | **Bugün kodda** |
| **Cam → pencere** (3. günden sonra) | İki parça fabrikası kurup biri cam, biri doğrama yapar | Cam fırını, çelik doğrama; pencere satışı; Defter: "ilk pencere" (**8 makine parçası** ödül) | Bu hatta girmek (çoğu oyuncu için zorunlu değil) | **Geliyor** (G8) |
| **İkinci dükkân** | Ek bir dükkân ya da "yapı market" kurar | İlçede en çok 2 dükkân; yapı market cam, pencere, çelik satar | Kaç dükkân, hangi tür | **Geliyor** (G7, G8) |
| **Bakım** | Yapıların bakımına bakar | Yapılar zamanla makine parçası ister; başlangıç parçası (40) hızla biter; "ilk pencere" ödülü bunu besler | Parçayı üretmek mi, almak mı | Bakım **bugün kodda**; ödül **geliyor** |
| **Yön değiştirme** | Arsayı bırakır, yeni ilçeye geçer | Arsa bırakınca %70 iade; ikinci ilçe ödülü | Yönünü değiştirmek | **Bugün kodda** |
| **Sessiz günler** | Girmeyebilir | Giriş ödülü yok, geri çağırma yok; döndüğünde yargısız özet | Ne zaman döneceği (tamamen kendi tercihi) | **Bugün kodda** (hafta özeti tasarımı **geliyor**; **doğrulanmadı**) |
| **Hafta sonu** | Durumuna bakar | Defter, işlenen damgalar; dünya haberleri | Devam etmek | Defter **bugün kodda**; haberler **geliyor** (**doğrulanmadı**) |

## Stok riski (ilk dükkân anı incelemesi): karar verildi, risk kapandı sayılır

- **Sorun.** Dükkânlara konabilen mallar arasında tahıl yok; çiftlik tahıl üretir. Dükkânın tek başlangıç malı kitteki **200 gıda**. Defter'in ilk adımı o gıdayı satmaya yönlendirebilirdi; gıdayı satan oyuncunun dükkân rafı boş kalır, ilk dükkân satışı ancak gıda ya da ekmek zinciriyle (≈1–1,5 sa) olurdu.
- **Karar (baş lider, yalnız metinle; kit verisi değişmez).** Defter ilk satış adımı **"Çiftliğinin tahılını sat."** olur; ilk dükkân önerisi kartına **"Kitteki gıdayı rafın için sakla."** satırı eklenir. Böylece ilk satış tahılla yapılır, kit gıdası rafa kalır ve ilk dükkân satışı ≈50–60. dakikaya döner. Metin anahtarları: `defter.kavram.ilk_satis.siradaki`, `dukkan.D0.oneri_not`.
- **İlk satış ne zaman?** Çiftliğin ilk tahılı **yapı bitince** gelir; ilk tam saat tıkını beklemez (üretim sürekli akıştır; yapı bitişi çözümü aynı anda tetikler; kaynak okuması, çalıştırılmadı). Çiftlik 2 sa × %10 = **12 dk** sürer; ≈9–15. dakikada kurulursa **≈21–27. dakikada** biter. Çiftlik nominal **200 tahıl/sa** (≈3,3/dk; gerçek verim toprak ve iklime bağlı, **doğrulanmadı**). Satış emri yapı bitmeden de verilebilir (stok şartı yok; kaynak okuması). Bu yüzden ilk satış **≈25–30. dakikaya** kayar (eski tablo ≈20–25: kit gıdası t=0'da satılabildiği için erken görünüyordu). **Defter damgası ve ₺500 ödülü** kavramlar saat sınırında değerlendirildiği için satıştan **en çok bir saat sonra** gelir (≈25–90 dk); oyuncu "sattım ama Defter yazmadı" diyebilir (YA11/T4 gözlemi). Hepsi **hedeftir, hesap/kaynak okumasıdır; çalışan sürümde doğrulanacak**.
- **Kalan küçük durum.** Oyuncu metne uymayıp kit gıdasını da satarsa (ör. Pazar'da "elindeki her şeyi sat") rafı yine boş kalır; arayüz bunu iki yerde karşılar (seçici "Rafa koyacak malın yok. Gıda ya da ekmek üret." + Yapı kur; inşa sırasında Dikkat çipi). Ayrıntı: `ilk-dukkan-ani.md` (A1 notu).

## Açık sorular (sahip ve baş lider için)

- **Büyük harf (S-12):** marka ve görünen ad **küçük harfle** kaydedilir (varsayılan); sahip "serbest" derse tek satır değişir.
- **Destek e-postası ve veri kullanımı metni** sahibin işi (giriş ekranında yer tutucu).
- **Zincir ve dükkân oynanmadan yazıldı:** bu belgenin "Geliyor" satırları insan testinde ve bot koşularında doğrulanacak; ≈49. dakika yalnız bir hesaptır.
