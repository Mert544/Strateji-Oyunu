# İnsan testi pilot paketi: adım betiği, gözlemci formu, ölçüt tablosu (G10 hazırlığı, A1)

> **Durum.** 2 Ekim 2026 gece, Ar-Ge A1. **Yalnız belge**: hiçbir uygulama açılmadı, hiçbir sunucu başlatılmadı, hiçbir test koşulmadı. Bu paket [insan testi kılavuzunu](insan-testi-kilavuzu.md) P4 sonrası birleşik yapıya (G5/G9 giriş, G6 ekmek zinciri, G7 dükkân) uygular; kılavuzun profil, KVKK, ipucu merdiveni ve yönetici metni bölümlerini **tekrar etmez**. Pilot oturum (kılavuz Ö10, K0) bu paketle yapılır; sonuç kılavuzu ve formu düzeltir.
>
> **Kaynaklar (dalda olanlar, `entegrasyon`'da henüz yok; bağlantı verilmedi):** G9 oyuncu akışı belgesi (`docs/arastirma/g9-oyuncu-akisi.md`, dal `takim/a1/g9-akis`, d1df3b7); A3 şartnamesi (`docs/arastirma/p4-p5-sartname.md`, dal `takim/a3/p4-p5-sartname`, 8b10e60); ilk saat ekran incelemesi (`docs/arastirma/ilk-saat-ekran-incelemesi.md`, dal `takim/a1/ilk-saat-inceleme`; B1…B10). Ekran adları ve metinler G9 belgesindendir; **uydurma ekran yoktur**: çalışan sürümde görülmeyen her adım "P" ile işaretlidir.

## 0. Durum işaretleri ve okuma kuralları

| İşaret | Anlamı |
|---|---|
| **M** | Mevcut: kılavuz [§2.2](insan-testi-kilavuzu.md) tablosunda bitmemiş bağımlılık yok (bu turda yeniden denenmedi) |
| **B:xx** | Bitmemiş işe bağlı (G1, G3, B7 ...): o iş bitince **doğrulanacak** |
| **P** | **P4/G9 sonrası doğrulanacak:** akış yalnız G9/A3 belgesinde tanımlı, çalışan sürüm görülmedi |

- Yönetici bu betikte **hiçbir ekran ögesini adlandırmaz**; "doğru yol" sütunu **gözlemci içindir**, katılımcıya söylenmez (kılavuz [§4.4, §4.5](insan-testi-kilavuzu.md)).
- G6 ve G7 dalları **zorunlu görev değildir**: katılımcıya ekmek ya da dükkân önerilmez; yalnız kendiliğinden yönelirse gözlenir (kilit yok, seçim var).
- **Gerçekçi kapsam (60 dk):** dükkân inşası ≈24 dk (4 sa × %10), pencere ithalatı bir sonraki **tam saat tıkında** gerçekleşir (A3 §7.4: ≥1 saat), ekmek zinciri tesisleri ≈36 dk (6 sa × %10; içerik taslağı, **doğrulanacak**). Bu yüzden S1'de en çok **karar ve maliyet kartı** görülür; üretim ve ilk dükkân satışı S2 ve sessiz dönemde (A0-11 ≤36 sa) ölçülür.
- Görüntü sütunu: Tasarım liderinin birleşik setinin ad şablonu **`NN-ekran-tema-cihaz.png`** (ör. `05b-maliyet-karti-acik-telefon.png`); tema `acik|koyu`, cihaz `masaustu|telefon`. Tabloda yalnız **ekran adı (slug)** yazılıdır; `NN` Tasarım liderine aittir. **Adım kodu dosya adına girmez**, bu belgedeki sütun eşler.

## 1. Adım adım betik

Süreler T0'dan (oyun adresinin açıldığı an), "hedef / kabul" kılavuz [§3.2](insan-testi-kilavuzu.md) ile aynıdır. "Gözlem" sütunu olay kodlarını ([§5.3](insan-testi-kilavuzu.md)) ve aşağıda §2.3'teki pilot ek sınıflarını kullanır.

### 1.1 S1: ilk saat (60 dk oyun)

| Adım | Beklenen ekran (G9 adı) | Oyuncunun doğru yolu | Gözlem noktası | Hedef / kabul | Durum | Görüntü (slug) |
|---|---|---|---|---|---|---|
| **S0** | Oyun dışı | Karşılama (§4.2), rıza (§8.6), sesli düşünme alıştırması (§4.3); kayıt açılır; T0 ve sunucu `t` ofseti forma | Rıza maddeleri ayrı işaretlendi mi; kayıt çalışıyor mu | oyun saati yok | M | — |
| **S1.1** | G-1 E-posta ekranı → G-2 "Postanı kontrol et" → posta → G-3 bağlantı onay sayfası ("giriş yap") → G-4 görünen ad ("Sana ne diyelim?") → G-5 Yerleş | Adresi yaz, "bağlantı gönder", posta uygulamasında bağlantıya dokun, "giriş yap", hazır küçük harfli adı "tamam" ile kabul et | Posta gecikmesi ve spam (T4); telefonda bağlantının **uygulama içi tarayıcıda** açılıp oyuna dönülememesi; "kod mu istiyor" şaşkınlığı; G-4'te "gerçek adını yazman gerekmez" okundu mu; büyük harf yazınca önizlemenin küçük hâli | ≤3 dk / 6 dk | **B:G5, G9** (geçici: test kimliği, kılavuz §2.3); P | `giris-eposta`, `giris-postani-kontrol-et`, `giris-onay`, `giris-gorunen-ad` |
| **S1.2** | Yerleş: "Nerede başlamak istersin?", 3 ilçe kartı, açılış önerisi, "Burada başla" | Kartı oku, önerilen ilçeyi ya da kendi ilçesini seç, "Burada başla" | **YA1** (sınıf/kilit sandı mı); "Başka ilçe öner", "Şimdilik atla"; 3 karttan kaçı oynanabilir (ilk saat incelemesi B1, B10) | ≤3 dk / 6 dk | M; **B:G3** (3 ilçe de oynanabilir olacak) | `yerles` |
| **S1.3** | "Arsalarım": yurt (ücretsiz), ayrılmış hücre, kamu arsası; üst çubukta hazine **50.000 ₺** | Yurdu fark et; ek arsa almayı gereksiz bul (B2) | **YA2/YA3**: hazine neden düşmedi/düştü; ayrılmış hücre kutusunun anlaşılması; B3 (istemci ayrılmış hücreyi bilmiyor) | ≤2 dk / 5 dk | M; **B:G1** | `arsalarim` |
| **S1.4** | "Yapı kur" → yapı paleti → hayalet yerleştirme → **maliyet kartı** ("gereken/var") → "Çiftlik kur" | Palette önerilen yapıyı seç, hücreye yerleştir, kartı oku, onayla | **Y1**; kart, çip ve sonuç satırında **aynı sayı** (B4: maliyet yukarı, hazine aşağı yuvarlı); Defter bildirimi kartı örtüyor mu (BK-3); "Dönder" | ≤4 dk / 15 dk | **B:G1** (para biçimi, örtme) | `yapi-paleti`, `maliyet-karti` |
| **S1.5** | Haritada iskele; geri alma sayacı; Çiftlik **12 dk** | Bekle; gez; Defter'e ya da Pazar'a yönel | **Y10 (BE-B)**; "kapatsam biter mi" (YA4); haritada kalan süre etiketi var mı (B6) | 12 dk | M; etiket **B:G1/T1** | `insa-iskele` |
| **S1.6** | Pazar ya da mal paneli: başlangıç gıda stoku (200) → satış emri (oran) → nakit artışı | Stoku bul, satış emri ver, nakdin arttığını gör | **YA5** (tek seferlik mi oran emri mi); gerçekleşme gecikmesi; **yardımsız bulma** | ≤5 dk (yapıdan) / 25 dk | M (B-6 oran emri sunumu) | `pazar-satis` |
| **S1.7** | Esnaf Defteri: "Sıradaki adımlar", "Defterine işlenenler", ödül çubuğu. **G9 ile:** "Kendi tezgâhın: bir dükkân kur ve ilk satışını yap." kartı | Kartlara bak, görmezden ya da keşfet | **YA6**; Defter'i hiç açmadı mı (55. dk cümlesi); ödül çubuğunun zorluğu (B8); Defter'in telefonda gizli olması (B7); Atla yok (BK-10) | süre yok | M; dükkân kartı **P** | `defter`, `defter-dukkan-karti` |
| **S1.8** | Serbest keşif (35 dk'ya kadar): Dikkat paneli, ikinci yapı, komşu ilçe, harita katmanları, yükseltme | **Zorunlu yol yok**; aşağıdaki üç dal yalnız kendiliğinden gelirse gözlenir | Neye yöneldi, **neden**; Y5 (ikinci yapının katmanı); yükseltme (BK-9) | 35 dk | M | `dikkat`, `ikinci-yapi` |
| ↳ **S1.8a** Zincir (G6) | "Yapı kur" → Gıda fabrikası → **yöntem seçici** (Değirmen / Ekmek fırını; bina adları içerik taslağında "Değirmen Atölyesi", "Fırın Atölyesi") → maliyet kartı | Yöntemi seç, kartı oku (eksik mal satırı varsa fark et), kur; elektriğin **şebekeden otomatik** geldiğini görür/görmezden gelir | **YA10:** bina mı yöntem mi sandı; **santral lazım mı** diye aradı; kartta "yetersiz stok" iletisi mal adını söylüyor mu (A3 §9.3 K1 notu); fabrikayı **tahıl** yokken mi kurdu | karar ≤5 dk; kurma yok sınır | **P** (G6) | `yapi-yontem-secici`, `maliyet-karti-eksik` |
| ↳ **S1.8b** Dükkân (G7+G9) | D-1 palet kartı **Dükkân** veya Defter kartı → D-2 "Hangi dükkânı kuruyorsun?" (tür, yer) → D-3 maliyet kartı (**6.000 ₺ + 20 çelik + 8 makine parçası + 4 pencere**; ilk 5 yapıda indirim) → pencere yoksa "Pencere 4: stokta 0" + **Pazar'dan al** | Türü seç, ücretsiz bir hücreye yerleştir ya da kartta dur; pencere eksikse Pazar yolunu bul | **YA11:** "tür kilit mi", M/L neden yok (DUK-04), pencere eksik satırı anlaşıldı mı, ithalat emrinin **iptal hatırlatması**; yeni oyuncu 3'te kaç adımda; **A0-11 yapı komutu zamanı** (`baslangic`) | karar süre sınırı yok | **P** (G7+G9) | `dukkan-kart`, `dukkan-tur-yer`, `dukkan-maliyet-karti` |
| **S1.9** | "Çıkabilirsin, dönünce özet gösteririz" notu | Sekmeyi kapat ya da çık | Çıkış öncesi ruh hâli; "yarın açar mıydın" (§5.6) | 60. dk | M | — |

### 1.2 S1b ve S2 (dönüşler)

| Adım | Beklenen ekran | Oyuncunun doğru yolu | Gözlem noktası | Durum | Görüntü (slug) |
|---|---|---|---|---|---|
| **S1b** (1–6 sa, isteğe bağlı) | G-5 yönlendirme → K1 bandı: kısa kart ya da tek satırlık şerit | Kartı oku, `Devam`/`Git` | Kısa kart mı şerit mi (kılavuz §3.4: tasarım şerit der, kodda kısa kart; **ikisi farklı**) | M; **B:G9** (şerit) | `sen-yokken-k1` |
| **S2.1** | G-5 → (oturum açıksa) doğrudan oyun; gerekirse G-1…G-3 | Yönlendirmesiz aç | Yeniden giriş sürtünmesi; "sessiz yenileme" (G-7) | M; **B:G5** | — |
| **S2.2** | "Sen yokken" ekranı (Gün Sayfası): net sonuç, inşa bitişi ("{yapı} bitti; hayırlı olsun"); **G9 ile** dükkân satırı "{n} birim satıldı: +1.234 ₺" | Oku, `Devam` ya da `Git` | **A0-13** (Dö2 okuma süresi, Dö3 atlama); **YA8** (kayıp/ceza); geri anlatım. **Pilotta `?donus=ornek` sabit verisi kullanılmaz** (ilk saat incelemesi B9): gerçek dönüş | M (ekran), dükkân satırı **P** | `sen-yokken-k2` |
| **S2.3** | Ekran kapandıktan sonraki 60 sn; öneri/`Git` bağlantısı | Önerileni yap ya da kendi yolunu seç | Dö4 (öneri tıklama), Gö8 | **B:B7** (öneri motoru) | `oneri-git` |
| **S2.4** | Dikkat paneli, bina paneli, İşletmem; kılavuz H4-1…H4-3 | Üç soruyu 60 sn içinde yanıtla. **Pilot eki H4-1b (yalnız dükkân varsa):** "Bu dükkân neden satmıyor?" doğru yanıt D-5 "neden satmıyor" satırından ("stoğun yok", "kasa dolu", "kampanya bitti") | H4 ön (≥4/5, ≤60 sn); ek soru bilgi amaçlı | **B:E1-G10, E21-G8**; H4-1b **P** | `dikkat-rozet`, `bina-paneli`, `dukkan-neden-satmiyor` |
| **S2.5** | `parsel_birak`, `insaat_iptal`; **G9 ile** "dükkânı kaldır" | Yönlendirilmiş soru (kılavuz §3.7). Dükkân varsa: "yanlış yere kurdunuz diyelim, ne yaparsınız?" Doğru yol: inşadaysa "iptal et (iade %50)", bitmişse "dükkânı kaldır" (iadesiz, arsa ve mallar kalır) | Ceza/kilit bekledi mi; **iadesiz** onay metni anlaşıldı mı; geri alınır sandı mı (YA11) | M (iptal/bırak); kaldırma **P** | `iptal-onay`, `dukkan-kaldir-onay` |
| **S2.6** | Görüşme | Kılavuz §4.8, §5.6 | Duygu, "baskı" | M | — |
| **S2.7** (koşullu) | İşletmem "Dükkânlarım", dükkân kartı, raf, fiyat kademesi, **kasa doluluğu**, Dikkat | Yalnız dükkân kurmuş katılımcıda, yönlendirmesiz: rafı doldur, fiyata bak | Raf **boşken satış olmaz** anlaşıldı mı (D-4); **YA11** (kampanya kâr sandı, "normal en iyi" fark edildi mi); kademe sayısı (kampanya kapalıysa 3 seçenek); hız sınırı geri sayımı; ≤8 dk | **P** (G7+G9) | `dukkan-raf`, `dukkan-fiyat`, `dukkan-satis` |

### 1.3 Sessiz dönem ve G15

Kılavuz [§3.8](insan-testi-kilavuzu.md) aynen (G2–G14 temas yok). **Ek (P4):** A0-11 üç zaman günlükten okunur (A3 §15.3: yapı komutu `baslangic`, kurulma `kurulus`, ilk satış `ilkSatisT`); G15'te "dükkânı ne zaman kurdunuz, ilk satışı hatırlıyor musunuz?" sorusu eklenir (önce kendi cevabı, sonra günlük). Durum: **P** ve **B:İ1** (çevrimdışı oynatma betiği).

## 2. Gözlemci formu (doldurulabilir)

Kod kullanılır, ad yazılmaz ([§5](insan-testi-kilavuzu.md), [§8.2](insan-testi-kilavuzu.md)). Aşağıdaki tablolar kopyalanıp doldurulur.

### 2.1 Başlık

| Alan | Değer |
|---|---|
| Katılımcı kodu / profil | K__ / ______ |
| Oturum | S1 ☐  S1b ☐  S2 ☐  G15 ☐ · tarih: ____ · **sürüm commit'i:** ____ · dünya: taze ☐ yaşlı ☐ |
| Cihaz / işletim sistemi / tarayıcı | ______ |
| T0 duvar saati · sunucu `t` · ofset | ____ · ____ · ____ |
| Yönetici / gözlemci | ____ / ____ |
| Kayıt (rıza kapsamına uygun) | ekran ☐ ses ☐ |
| Dallar | S1.8a zincir görüldü ☐ · S1.8b dükkân görüldü ☐ · dükkân kuruldu ☐ |

### 2.2 Olay satırları

| Zaman (ss:dd:ss) | Adım | Kod | Ayrıntı ("alıntı") | Sınıf (T/YA) | Duygu + yoğ. | İpucu (L) | Ciddiyet | BK |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

Kodlar kılavuz [§5.3](insan-testi-kilavuzu.md) ile aynıdır (`AD KM OK TK YA DU IP SO AL BE BK TE CK`; T1–T7, YA1–YA9; S0–S3). `KM` alt kodları **pilot ekleri**: `KM-ZINCIR` (yöntem seçti/fabrika kurdu), `KM-DUKKAN` (dükkân komutu), `KM-RAF` (rafa mal koydu), `KM-FIYAT` (kademe seçti), `KM-KALDIR` (iptal/kaldır).

### 2.3 Pilot ek sınıfları (kılavuz §5.3 tablosuna pilot sonrası işlenir)

| Kod | Konu | Örnek (ne sandı) |
|---|---|---|
| **YA10** | Zincir ve yöntem (G6) | Yöntemi ayrı bina sandı; santral gerekli sandı ya da elektriği bedava sandı; un ile ekmeği karıştırdı; şebeke giderinin nerede göründüğünü bulamadı |
| **YA11** | Dükkân (G7, G9) | Tür/boyu kilit sandı; raf boşken satış olur sandı; kampanyayı kâr sandı; markanın satışı etkilediğini sandı; büyük harf yazınca adın küçüldüğünü yadırgadı; kaldırmayı geri alınır ya da iadeli sandı |

### 2.4 Adım özeti

| Adım | Başlangıç | Bitiş | Süre | En yüksek ipucu | Takılma (sınıf) | Yanlış anlama | Baskın duygu | Kurtarıldı mı |
|---|---|---|---|---|---|---|---|---|
| S1.1 | | | | | | | | |
| S1.2 | | | | | | | | |
| S1.3 | | | | | | | | |
| S1.4 | | | | | | | | |
| S1.5 | | | | | | | | |
| S1.6 | | | | | | | | |
| S1.7 | | | | | | | | |
| S1.8 (a/b) | | | | | | | | |
| S2.2 | | | | | | | | |
| S2.4 | | | | | | | | |
| S2.5 | | | | | | | | |
| S2.7 | | | | | | | | |

### 2.5 Anket (kılavuz §5.6'ya ek)

| Ne zaman | Soru | Yanıt |
|---|---|---|
| S1.2, S1.4, S1.6, S1.7 sonrası (+ S1.8b'de maliyet kartı sonrası) | "Bu adım ne kadar kolaydı? 1 çok zor … 7 çok kolay" | ___ · ___ · ___ · ___ · ___ |
| S1 sonu | Kılavuz §5.6 altı madde (anlatım, yarın açar mı 1–5, sonraki adım 1–5, "hayırlı olsun" tonu, gerçek para, öner 0–10) | ______ |
| S1 sonu (yalnız dükkân gördüyse) | "Dükkânı kurmak için bir engel var mıydı? Nasıl bir şey sanıyordunuz?" | ______ |
| S2 sonu | Ekranda ne yazıyordu (geri anlatım); baskı/merak/rahatlama/ilgisiz; kayıp hissi evet/hayır | ______ |

## 3. Ölçüt tablosu (son hâli)

Eşik → kişi sayısı kuralı: k = ⌈oran × 5⌉; **1 kişi eksik = belirsiz, ≥2 = kaldı** (kılavuz [§0.2](insan-testi-kilavuzu.md)). Hepsi **hipotezdir, kapı değildir**; çıktı `Geçti / Belirsiz / Kaldı / Ölçülmedi`.

> **Kılavuzla ilişki (lider kararı):** bu bölümdeki **A0-11 satırı**, kılavuz §6.2 tablosundaki A0-11 satırının (ve "dükkân kurulum `t`" ifadesinin) **yerine geçer**: süre = `ilkSatisT − katılım`, ara kırılımlar raporda. Kılavuz dalı ayrıca değiştirilmez; sonuç raporu bu paketin tanımını kullanır.

| Ölçüt | Tanım | Eşik | n=5 karşılığı | Veri | Pilotta durum |
|---|---|---|---|---|---|
| **Y1** | `oyuncu_katil` ile ilk **kabul edilen** yapı komutu ≤10 dk | ≥%75 | **≥4/5**; 3/5 belirsiz | Günlük + oynatma (İ1); gözlem uçtan uca süre | Ölçülür; kabul bilgisi **İ1** olmadan yok |
| **Y2** (60 dk) | İlk gerçekleşen satış ≤60 dk | ≥%70 | **≥4/5** | Günlük (dakikalık örnekleme) + gözlem | Ölçülür |
| **Y2** (10 dk) | Aynı, ≤10 dk | ≥%50 | **≥3/5** | aynı | Ölçülür |
| **Y10** | İlk saatte ≥5 dk komutsuz bekleme sayısı ≤1/oyuncu | ≤1 | **≥4/5 oyuncu ≤1** | **İşlemsel:** gözlem `BE-B` (≥5 dk, boşta ve ne yapacağını bilmiyor); **ham:** günlükte komutsuz aralık (yalnız bilgi). 12 dk inşa beklemesi tek başına bir aralık yaratır (kılavuz §6.3) | Ölçülür; tanım lider onayına bağlı (kılavuz S4) |
| **A0-11** | İlk dükkân medyan ≤36 sa. **Üç zaman** (A3 §15.3): yapı komutu `baslangic`, kurulma `kurulus`, ilk satış `ilkSatisT`; **süre = `ilkSatisT − katılım`**, ara kırılım `baslangic − katılım`, `kurulus − baslangic`, `ilkSatisT − kurulus` | medyan ≤36 sa | **≥3 kişi kurmuş** ve kuranların medyanı ≤36 sa; <3 kuran = **Ölçülmedi**. "Geri ödeme ≤48 sa" n=5'te **ölçülmez** | Durum alanları + oynatma (İ1); pencere G2–G14 (S1 dışı); yönlendirmesiz (yalnız Defter ve palet kartı) | **P** ve **B:G7+G9**; kılavuz §6.2'deki "dükkân kurulum t" ifadesinin yerine geçer |
| **A0-13** (okuma) | "Sen yokken" ortanca okuma ≈12 sn, p90 ≤30 sn | ≈12 sn | 5 değerin **3.'sü ≤12 sn**, en büyüğü ≤30 sn | **Ekran kaydı** (kare kare) | Ölçülür |
| **A0-13** (atlama) | Devam ≤3 sn ya da okunmadan kapanan ≤%50 | ≤%50 | **≤2/5** | Ekran kaydı | Ölçülür |
| **A0-13** (öneri tıklama) | Öneri tıklama ≥%30; yapılamaz öneri ≤%2 | ≥%30 | **≥2/5**; yapılamaz öneri **0** | Gözlem + günlük | **Ölçülmez** (B7 olmadan) |
| **A0-14** (ilk satış) | İlk saatte ilk satış ≥%70 (= Y2 60 dk) | ≥%70 | **≥4/5** | Günlük + gözlem | Ölçülür. Not: Defter `ilk_dukkan` damgası **ilk dükkân satışıyla** gelir; ilk saatin satışı ihracattır |
| **A0-14** (kart atlama) | Defter/öneri kartını görmezden gelme ≤%30 | ≤%30 | **≤1/5** | Gözlem | Atla düğmesi yok (BK-10): yalnız görmezden gelme |
| **H6 (ii)** | Katılımdan sonra 336 saat içinde **kabul edilen** üretim yapısı komutu. Üç okuma: **resmî** (önerilen açılışın ilk yapı türü), **geniş** (herhangi üretim yapısı), **bağımsız** (geniş ve ilk yapı komutu ipucu ≤L2) | (öneri) | resmî ve geniş **≥4/5**, 3/5 belirsiz; bağımsız **≥3/5** | Günlük + oynatma (İ1) + gözlem (ipucu); `ilk_yapi` tanımıyla ek yapı (Ambar, Ticaret ofisi) sayılmaz; **dükkân** da ek yapı olduğundan sayılmaması beklenir (doğrulanacak) | Ölçülür; **iyimser** (gözlemli oturum üst sınır, kılavuz §7.5); P4'te ek: fabrika (G6) üretim yapısıdır, dükkân (ek yapı) değil |

## 4. Görüntü seti eşleme (yer tutucu)

| Konu | Karar |
|---|---|
| Ad şablonu | `NN-ekran-tema-cihaz.png` (Tasarım lideri; toplantı 2 seti gibi) |
| Slug kaynağı | §1 tablolarındaki "Görüntü (slug)" sütunu (G9 ekran adları: giriş G-1…G-4, dükkân D-1…D-8.1) |
| Set sahibi ve zamanı | Tasarım lideri; **P4 sonrası** birleşik görüntü seti (K1 + T1 + T2 birleşik durumu, ilk saat incelemesi sınırı) |
| Eşleme | Adım kodu (S1.4) dosya adında **yok**; bu belgede sütunda. Bir adım birden çok ekran içerir: her slug için açık/koyu ve masaüstü/telefon ayrı dosya |
| Doldurma | Set gelince her satıra `NN` eklenir; **olmayan görüntü "yok" yazılır, uydurulmaz** |

## 5. Pilot kontrol listesi (kılavuz Ö10)

1. Kronometre, sunucu `t` ve duvar saati ofseti tek sabit; ofset hatası ≤10 sn (İ1 çıktısıyla karşılaştır).
2. Form tabloları dolduruluyor mu: satır sayısı, sütunlar fazla mı; kısaltılacak sütun işaretlenir.
3. İpucu merdiveni zamanları ve `IP-L#` kaydı.
4. Ekran kaydından A0-13 süresi okunabiliyor mu (kare kare).
5. S1.8a/b dalları **yönlendirmesiz** kaldı mı (yönetici dalları anmadı).
6. S1 toplam süresi 60 dk'yı aştı mı; S1.8b gerçekten karar/kart ile bitti mi.
7. G-1…G-4 (P): telefonda uygulama içi tarayıcı davranışı **doğrulanır** (G9 belgesi S5).
8. Pilot bulguları: kılavuz ve bu paket güncellenir; pilot katılımcısı havuzdan **tek kullanımlık** sayılır.

## 6. Doğrulanmayanlar ve sınırlar

| Konu | Durum |
|---|---|
| G5 e-posta girişi, G9 giriş ve dükkân ekranları, G6 ve G7 akışı | **Çalışan sürüm görülmedi**; betikteki "P" ve "B" satırları sürüm donunca (kılavuz Ö11) yeniden okunur |
| Fabrika ve dükkân inşa süreleri (≈36 dk, ≈24 dk), pencere ithalat gecikmesi | İçerik taslağı ve A3 §7.4; **çalışan sürümde doğrulanacak** |
| H4-1b (dükkân "neden satmıyor") ve YA10/YA11 | **Pilot eki (öneri)**; kılavuz kod tablosuna pilot sonrası işlenir; lider onayı |
| A0-11 süre tanımı (`ilkSatisT − katılım`) | A3 §15.3'ten; kılavuz §6.2'nin eski ifadesini değiştirir (lider onayı) |
| Hiçbir test koşulmadı; hiçbir sunucu başlatılmadı | Yalnız belge |
