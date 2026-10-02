# Sabah raporu 2: gece neler oldu (2 Ekim 2026)

> Baş liderden sahibe. Yalnız ürün ve oyun. Ana dal: `cfd0074` (GitHub'da; ilk yazımda `c1bd311`). Gece 10 paket birleşti; hepsi tam kapıdan, gerekenler Postgres doğrulamasından, hepsi uçtan uca tarayıcı testinden geçti.

## Tek cümlede

**Dükkân artık oynanıyor ve üç ilçe açık.** Oyuncu bedava yurdunda çiftliğini kurup tahılını satabiliyor; ilk dükkânını kurup rafını doldurabiliyor, fiyat kademesini seçip ilk satışı görebiliyor. Gebze, Gemlik ve Körfez'de başlanabiliyor. Ekmek zinciri (değirmen, fırın) ve cam → pencere hattı artık **ekrandan seçilebiliyor**: yapı kurarken yöntem seçici son pakette (03:41 UTC) girdi.

## Sabah eki (05:00 UTC): bu rapordan sonra ne değişti

> Önce bunu oku. Aşağıdaki bölümlerde düzeltilen satırlar "(ek)" ile işaretli.

**En önemli düzeltme:** Raporda "ilk satış oynanır" yazıyor; bu yanlıştı. Defter "Çiftliğinin tahılını sat." diyor, ama Mal sekmesinde satış düğmesi yok. Tek yol eski komut panelindeki ticaret formu (6–8 tık) ve Defter'den oraya yol yok. Uçtan uca test yalnız metni denetliyordu, satışı yapmıyordu; açık bu yüzden kaçtı. Düzeltme sıradaki pakette (P13): Mal sekmesinde **"Pazar'da sat"** düğmesi geliyor ve testte gerçek bir ilk satış adımı var.

**Gece sonunda main'e girenler:**
- **Alfa-0 dünyası artık gerçek Karadeniz haritası ve üç ilçenin arsa ızgarası** (Gebze, Gemlik, Körfez). Kurulumun varsayılanı bu oldu; yerel açılış 3,2 sn.
- **Kart, hedef hücreyi artık örtmüyor.** Uçtan uca test gerçek bir ürün kusuru buldu: uzun yöntem kartı (ahır gibi) ekran ortasındaki hücreyi kart üstte de altta da olsa örtüyordu. Kart artık kendi yüksekliğine göre yer seçiyor. Sığmazsa kısalıyor, "Kur" ve "Vazgeç" altta sabit kalıyor.
- **Yürüyüş görünümü oyuncunun gerçek yapılarını gösteriyor** (örnek yapılar yalnız sahte kipte). Aşınma haritada ve yürüyüşte soluklaşarak görünüyor.
- **Dükkân ekranında 24 kusurdan çoğu düzeltildi:** haritada dükkân adı, tek yönerge, ilk gün inşa süresi ve "Pazar'da" ifadeleri.

**Sıradaki paket (P13, ~05:30 UTC hedef):**
- "Pazar'da sat". Satış saat başında gerçekleştiği için altında "ilk gelir ≈ N sonra" satırı var.
- Yeni Defter sırası: **çiftlik → Pazar'da sat → dükkân**, ardından "ham malı işle". Satıştan sonra beklerken "Satışın yolda; beklerken dükkânını kur." yazıyor. Ar-Ge'nin sınamasına göre dükkânı hemen kurmak ilk 2 saatte ≈2.100 ₺ daha iyi ve ilk dükkân satışını 45. dakikadan 31. dakikaya çekiyor. Bu yüzden P14'te sıra "çiftlik → dükkân → tahılı sat → raf → değirmen → ekmek" olacak; Defter aynı anda en çok iki adım gösterecek. Defter öneri; hiçbir adım kilit değil.
- Dükkân yuvası rakamları düzeldi:
  - yuvanın kazancı "katkı", dükkânın kazancı "net" olarak ayrı gösteriliyor;
  - net sıfır ya da eksiyse rakam yerine "şu an geri ödemez" yazıyor;
  - boş rafta "Raf boş: {mal} koy" çıkıyor.
- İnşa süresi doğru yazılıyor: "yeni oyuncu hızı; normalde …". Ayrıca inşa bitince "… hazır." bildirimi geliyor.
- Telefonda geri al şeridi ve bildirim yerleşimi düzeltildi.

**İlk saat (hesap, ölçüm değil):**
- Çiftlik 12 dk.
- Tahıl satış emri ≈16–20. dk. Satış ve 500 ₺ ödül bir sonraki saat başında, ortalama ≈48. dk.
- Dükkân ≈42–44. dk'da hazır; ilk dükkân satışı ≈44–47. dk.
- Ekmek zinciri ve ahır ilk saatin dışında (ilk ekmek ≈80–100. dk).

**Ekonomi düzeltmeleri (Ar-Ge, kâğıt hesap):**
- Üç ilçenin çiftliği de limanlı ve liman primi kalkanda da kesiliyor. İlk tahıl satışı Gebze/Körfez'de ≈3.592 ₺/sa, Gemlik'te ≈3.666 ₺/sa.
- Tek dükkân geri ödemesi ≈19–21 sa.
- İthal edip satma marjı ≈1.730 ₺/sa'e düştü.
- Zarar eden zincir yok.

**Bir sonraki dilim: "üç ilçe, tek oyun".**
- Hedef: Gemlik ve Körfez'de, Gebze'deki tam akışın gerçek harita ve ızgarada kanıtlanması. Yeni mekanik yok.
- 9 iş paketi planlandı.
- Yurtlu katılım gerçek ızgarada üç ilçede sunucu testiyle geçti.
- Tarayıcı testi gerçek harita kipiyle yazıldı. İlk koşusu P13'ten sonra.

**Alfa-0 kapısına kalan:**
- 18 maddeden 4'ü kanıtlı, 14'ü kaldı:
  - 7'sini P14 kapatıyor;
  - 5'i yeni iş, hepsine sahip atandı;
  - 2'si senin kararın: A0-16 (ajan kodu yok, kapsamdan çıksın mı?) ve A0-18 (askeri özellik kapalı yayınlansın mı?).
- Ayrıntı: `docs/arastirma/alfa0-kalan-kanit.md`.

**Davet engelleri** (ayrıntı `docs/arastirma/davet-oncesi-hazirlik.md`, docs paketinde):
- **Oyun gerçek e-posta gönderemiyor;** giriş bağlantıları dosyaya düşüyor. Sağlayıcıdan bağımsız SMTP bağdaştırıcısı P14'te.
- **Senin kararın:**
  - e-posta sağlayıcısı ile gönderen alanı (SPF/DKIM);
  - barındırma ve site adresi;
  - KVKK rıza metni ve destek e-postası (oyunda ikisi de boş);
  - geri yükleme ve dağıtım provası için Docker'lı bir makine.
- Davet metni taslağı hazır: `docs/arastirma/davet-metni-taslak.md`. İçindeki "adresin yalnız giriş için kullanılır" bir gizlilik sözü, onayını istiyor.
- Önerilen davet dağılımı: Gemlik 5 (+2 yedek), Körfez 6, Gebze 9. Yerleşme seçimi serbest kalıyor.
- Davet P13'ten sonra gitmeli.

**Senin adına verdiğim, geri alınabilir kararlar:**
- Yük kabulü Alfa-0'da 100 bot × 30 gün; 1.000 bot Alfa-1'e.
- Alfa-0'da dönem geçişi elle yapılacak (kapat → yedek → göç → 24 sa gölge oynatma). Komut Alfa-1'den önce yazılacak.
- Erken oyunda bakım muafiyeti yok. Parça ithalatının varsayılanı ihtiyacın 1,2 katı olacak ve bakım satırı eklenecek (P14).
- İlçe kartları oyunda olmayan bir yapı ya da zincir vaat etmeyecek (Körfez'deki rafineri vaadi kalktı; 45 ilçe tarandı).

**İzin notu:** 04:10 UTC'de K1'in bir test komutu (içinde `rm -rf` olan bileşik komut) "kullanıcı reddetti" sonucuyla döndü. Ben komutu 04:21'de durdurmuştum; ret mi kesinti mi olduğu kesin değil. Komut hiçbir biçimde yeniden koşulmadı, o yerel test adımı tamamen düşürüldü. Paket olağan kapıdan geçti. Reddettiysen ve kapı da istemiyorsan söyle.

## 1. Oyuncu bugün ne yaşıyor

| An | Oyuncu ne yapar | Durum |
|---|---|---|
| Giriş | E-postasına gelen bağlantıyla parolasız girer, küçük harfli bir ad önerilir; hesap bölümünde "Hesabı sil" var | **Oynanır** |
| Yerleşme | Üç ilçeden birini seçer: **Gebze, Gemlik, Körfez** (her biri gerçek arsa ızgarasıyla) | **Seçilebiliyor**; (ek) Gemlik/Körfez'de tam akış henüz kanıtlanmadı (sonraki dilim) |
| Varış | "Yurdun hazır" kartı: 6 hücrelik **bedava yurt**; 50.000 ₺ hibe; 14 gün yeni oyuncu kalkanı; ilk 5 yapıda %30 indirim | **Oynanır** |
| İlk yapı | Çiftliği yurduna tek tıkla kurar; ilk gün inşa 12 dk; arsa+yapı her zaman **tek işlem** (yarım alım yok) | **Oynanır** |
| İlk satış (emir ≈16–20. dk, gelir saat başında) | Defter "Çiftliğinin tahılını Pazar'da sat." der; başlangıç gıdası rafa saklanır | (ek) **Ekrandan yapılamıyor**: Mal sekmesinde satış düğmesi yok; P13 "Pazar'da sat" ile kapanıyor |
| İlk dükkân (ek: hazır ≈42–44. dk) | Öneri kartı → "Dükkân kur" → tür (bakkal, fırın, şarküteri, şekerci, yapı market) → maliyet → inşa → "Dükkânın hazır" → "Rafa git" → raf, fiyat kademesi, marka | **Oynanır** |
| İlk dükkân satışı | "Dükkânında ilk satış oldu; hayırlı olsun." + Defter ödülü (10 çelik) | **Oynanır** |
| Ekmek zinciri | Gıda fabrikasında değirmen + fırın seçer (varsayılan yok, bilerek seçer); elektrik ve yakıt şebekeden kendiliğinden; panelde "Yöntemi değiştir" (ücretsiz) | **Oynanır** (son paketle) |
| Cam → pencere | Cam fırını + çelik doğrama; yapı market cam/pencere/çelik satar; "ilk pencere" 8 parça ödül | **Oynanır** (son paketle) |
| Bakım | Yapılar zamanla aşınır, makine parçası ister; aşınma ekranda görünecek | Mekanizma **oynanır**; (ek) aşınma haritada ve yürüyüşte görünüyor |
| Dönüş | "Sen yokken" kartı: net sonuç, biten işler, dükkân satışı dahil | **Oynanır** |

Davetli oyuncu kısa adresle girer: `https://<site>/` (barındırma senden; bkz. §5).

### Ekran görüntüleri (`2103af0`, yöntem seçiciden önceki uç; T2'nin gece seti)

| | |
|---|---|
| ![Yurdun hazır](toplanti/3/Y1-yurt-karti-acik-masaustu.png) Varış: bedava yurt | ![Dükkân önerisi](toplanti/3/D0-oneri-karti-acik-masaustu.png) İlk dükkân önerisi ve Defter adımı |
| ![Tür kartları](toplanti/3/D2-tur-kartlari-acik-masaustu.png) Dükkân türü seçimi (5 tür) | ![Maliyet](toplanti/3/D3-maliyet-acik-masaustu.png) Maliyet kartı |
| ![Raf ve kademe](toplanti/3/D5e-kademe-secildi-acik-masaustu.png) Raf, kademe ve Defter | ![Dükkânın hazır](toplanti/3/D6-dukkan-hazir-rafa-git-acik-masaustu.png) "Dükkânın hazır · Rafa git" |
| ![Telefon tür](toplanti/3/D2-tur-kartlari-koyu-telefon.png) Telefon, koyu tema | ![Telefon İşletmem](toplanti/3/D00-isletmem-koyu-telefon.png) Telefon, İşletmem |

Tam set (yaklaşık 60 kare, açık/koyu, masaüstü/telefon) ekipte duruyor; istersen depoya alınır.

## 2. Bu gece verdiğim ürün kararları

- **Boş raf:** ilk satış başlangıç gıdasıyla değil **çiftliğin tahılıyla** yapılır ("Çiftliğinin tahılını sat."); gıda dükkânın rafına kalır. Veri değişmedi, yalnız metin.
- **Arsa + yapı tek işlem:** iki farklı arsa sınıfına düşen yerleşimde bile oyuncu "arsayı aldı, yapı kurulamadı" durumuna düşmez.
- **Pencere zinciri güçlendirildi:** çelik doğrama 28 → 30 pencere/sa, cam fırını yakıtı 16 → 12; geri ödeme 37,9 → 26 sa (en zayıf zincirdi).
- **Arsa fiyatı tam lira:** fiyat yukarı, bırakma iadesi aşağı yuvarlanır (10.001 ₺ / 39.999 ₺ gibi kesirli görünüm bitti).
- **Aşınma görünür olacak:** tesis aşınması protokole eklendi; 3B'de yapı aşındıkça soluklaşacak.
- **Her açılış çiftlikle başlar;** açılış seçimi yalnız ikinci adımı belirler.
- **Yöntem seçiminde varsayılan yok:** gıda fabrikası kurarken oyuncu değirmen/fırın/gıda işlemeden birini bilerek seçer (tek açık yöntem varsa o seçili gelir).
- **Fiyat sınırı açığı kapandı:** boşalt-doldur döngüsüyle 6 saatlik fiyat değişim sınırı aşılabiliyordu; kapatıldı. İlk doldurma ve ilk kademe seçimi serbest.
- **Kamu kasası:** hazine sıfırken ödenmeyen borç kasaya yazılmıyor (ileride para basma açığı olurdu).
- **KVKK:** sunucu günlüğünde e-posta adresinin hiçbir parçası tutulmuyor (yalnız anonim 8 haneli iz); gerçek veritabanı provasıyla kanıtlandı. Hesap silme uçtan uca çalışıyor.
- **Süreç:** gece boyunca `git stash` yasaklandı (ajanlar arası değişiklik karışması yaşandı, kayıp yok).

## 3. Ekonomi ve denge: Ar-Ge'nin bulguları (kâğıt model)

- **Zarar eden zincir yok.** Net ₺/sa: fındık 7.765, süt 4.933, ekmek 4.492, cam → pencere ~3.400 (güçlendirme sonrası). Süt ve fındık **Alfa-0 sonrası**.
- **A0-11 (ilk dükkân ≤ 36 sa, geri ödeme ≤ 48 sa) medyanda tutuyor:** ilk dükkân 0,6–1,0 sa, geri ödeme 22–37 sa. Tutmayan durumlar: 20 binden küçük ilçe, bir kasabada 3+ dükkân.
- **Seyrek oyuncu kalıcı geride kalmıyor:** haftada bir giren, 7. günde her gün girenin servetinin %63'ünde, 30. günde %92'sinde. Uçurum yok.
- **Para sızıntısı taraması:** yüksek ciddiyetli açık yok. İki orta bulgu kapandı (fiyat sınırı döngüsü, ödenmeyen borç).
- **Sunucu yükü:** dükkânlı çözümde p95 22 ms (hedef 300 ms), en kötüye yakın senaryoda.
- **Ölçüm:** Alfa-0 kabul tablosu (A0-1…A0-18), metrik okuma kılavuzu ve açılış günü risk listesi hazır; ekonomi metrikleri sunucuda.

## 4. Riskler ve bilinen açıklar

1. **Yöntem seçici yeni girdi** (son paket): gerçek sunucu testinde değirmen + fırın kuruldu, ekmek üretildi; uçtan uca test geçti. Kartın haritayı örtmesi kompakt liste, kart konumu ve telefonda %55 tavanla giderildi; gerçek telefonda henüz gözle görülmedi (ekran görüntüleri bu paketten önceki uçtan).
2. **Fiyat kademesinde üst kademe hep kazanıyor** (talep modeli fiyata duyarsız): Alfa-0'da kabul, canlıda izleniyor; Alfa-1 için tek parametrelik çözüm notu yazıldı.
3. **İthal edip dükkânda 1,15'te satmak** küçük ama gerçek yeni para üretiyor: Alfa-0'da kabul, %15 eşikli izleme.
4. **Bakım C**, satışın kamu talebiyle sınırlı olduğu zincirlerde kendini ödemiyor: ilk canlı hafta ölçülecek.
5. **Defter ilk satış damgası** satıştan en çok 1 saat sonra geliyor; dükkânın anlık "ilk satış" bildirimi bunu karşılıyor.
6. **Kalabalık:** (ek, düzeltildi) eşik oyuncu değil aynı malı satan dükkân sayısı: Gebze 17, Körfez 7, Gemlik 4 dükkânda geri ödeme 48 saati aşar. Gemlik sınırda; pilot bunu okuyacak.
7. **Caddy (istemci sunumu)** yapılandırıldı ama gerçek makinede denenmedi (bu ortamda Docker yok).
8. **Yürüyüş (sokak) görünümü:** (ek) giderildi; artık oyuncunun gerçek yapılarını çiziyor (P12b).
9. **Dükkân ekranında küçük kusurlar:** (ek) çoğu P12b ile giderildi (dükkân etiketi, tek yönerge, kasa/boş raf iletisi). Yuva satırı rakamı P13 ile düzeliyor: gelir doğruydu; yanlış olan istek ile satışın karışması ve kart netiydi (fırsat maliyeti düşülmemişti).
10. **Gemlik/Körfez ve sunucu ayarı:** (ek) giderildi: Alfa-0 kurulumunun varsayılanı artık gerçek Karadeniz haritası + üç ilçe ızgarası (P12a). Gemlik ve Körfez'de tam akışın kanıtı sonraki dilimde.

## 5. Senden beklenen kararlar

- **Barındırma (A-2) ve site adresi:** sağlayıcı ve alan adı; yapı (Caddy + sunucu + Postgres) sağlayıcıdan bağımsız hazır.
- **KVKK ve yasal metinler:** veri sorumlusu, rıza/aydınlatma metni, destek e-postası, hesap silmede silme süresi ve veri kapsamı; günlük maskesinin hukuki teyidi (Ö13).
- **Alfa-0 davet listesi** (en çok 200; ilk dalgada ~20 öneriyorum) ve **test oturumlarını kim yürütecek** (S1).
- **E-posta sağlayıcısı (SMTP/SES)**, geçici e-posta alanı listesinin lisansı, TÜİK nüfus verisi lisansı.
- Bilgi: marka/görünen ad küçük harfle kaydediliyor (S-12); "serbest" dersen tek satır.

Ayrıntılı liste ekte (aynı içeriğin tamamı `docs/13` §4 ve gece listesinde).

## 6. Alfa-0'a kalan yol

1. **Dükkân ekranı düzeltmeleri** (24 madde), yürüyüş görünümünün gerçek yapılara bağlanması, aşınmanın 3B'de görünmesi ve Alfa-0 sunucu ayarı (gerçek harita + üç ilçe ızgarası): hepsi hazırlanıyor, bugünün ilk paketleri.
2. Dükkân akışı uçtan uca test betiği kapıya (yazıldı, koşuluyor).
3. Barındırma ve gerçek makinede kurulum provası (Caddy dahil) — senin A-2 kararınla.
4. **İnsan testi** (pilot paketi hazır): ilk saat, ilk dükkân, seyrek oyuncu gözlemleri.
5. Askeri 0a şeması güncel (yalnız belge); 0b bayraklı eşkıya Alfa-0 sonrası sırada.

## Kaynaklar

- Oyuncu yolculuğu: `docs/arastirma/alfa0-oyuncu-yolculugu.md`
- Kabul tablosu: `docs/arastirma/alfa0-kabul-tablosu.md`; metrik okuma: `docs/arastirma/alfa0-metrik-okuma.md`
- Zincir kârlılığı ve oyuncu tipleri: `docs/arastirma/alfa0-zincir-karlilik.md`, `docs/arastirma/alfa0-oyuncu-tipleri.md`
- Alfa-1 fiyat esnekliği notu: `docs/arastirma/alfa1-talep-esnekligi.md`
- İşletim kılavuzu: `docs/alfa0-isletim.md`
