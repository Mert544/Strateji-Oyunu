# Pilot gözlem formu: üç ilçe oturumu (gözlemci, oturum sırasında doldurur)

> Dayanak: A3 `uc-ilce-pilot-davet.md` (99912ca) ve A1 pilot paketi `insan-testi-pilot-paketi.md` (080f670, dal `takim/a1/pilot-paketi`; adım betiği ve ipucu merdiveni oradadır). **Gözlemci hiçbir ekranı adlandırmaz, hiçbir şeyi önermez**; yalnız izler ve yazar. Süreler **oturum başından** `dd:ss` (T0 = oturumun ilk kaydı; duvar saati ofseti üst bilgide). Sözler **aynen** yazılır, yorum eklenmez. Katılımcı kodla anılır, ad yazılmaz.

## 1. Üst bilgi

| Alan | Değer |
|---|---|
| Katılımcı kodu / profil | K__ / ______ |
| Tarih · sürüm commit'i | ____ · ____ |
| **İlçe** (katıldığı ilçe) | Gemlik ☐  Körfez ☐  Gebze ☐  (davetteki atama: ____ / seçtiği: ____) |
| **Cihaz** · işletim sistemi | telefon ☐  masaüstü ☐ · ______ |
| **Tarayıcı** (sürüm) | ______ (uygulama içi tarayıcı: evet ☐ hayır ☐) |
| **Yurtlu mu** | "Yurdun hazır" kartı geldi ☐ evet ☐ hayır (yurtsuz katıldı) |
| **Kit gıdası ihraç edildi mi** | ☐ evet (dd:ss ____) ☐ hayır ☐ bilinmiyor |
| T0 duvar saati · sunucu `t` · ofset | ____ · ____ · ____ |
| Yönetici / gözlemci · kayıt | ____ / ____ · ekran ☐ ses ☐ |

## 2. Olay satırları (oturum başından dd:ss)

Bir olay gerçekleşmediyse "yok" yazılır (boş bırakılmaz). Günlükten (O2) gelen alanlar **elle yazılmaz**, sonra karşılaştırılır.

| # | Olay | dd:ss | Ayrıntı (yalnız gözlem) |
|---|---|---|---|
| 1 | **Katılım**: "Burada başla" basıldı | | ilçe kartı seçimi ____ ; "Başka ilçe öner" kullanıldı ☐ |
| 2 | **"Yurdun hazır" kartı göründü** | | süre (1 → 2): ____ sn ; kart hiç gelmedi ☐ |
| 3 | **Çiftlik kuruldu** (kabul bildirimi) | | kaç denemede ____ ; arsa satın aldı ☐ yurda kurdu ☐ |
| 3b | **Çiftlik bitti** (Dikkat sekmesi; toast yok, bitiş "kabul"tan ayrıdır) | | günlükle karşılaştır (§5) |
| 4 | **Pazar'da sat emri verildi** | | yol: Mal sekmesi ☐ komut paneli ☐ bulamadı ☐ ; kaç deneme ____ ; mal ____ ; oran ____ |
| 5a | **İlk gelir görüldü: para artışı** (hazine çipi) | | söyledi mi: "____" |
| 5b | **İlk gelir görüldü: Defter damgası** (bildirim ya da satır) | | 5a'dan ayrı işaret; ikisi de ____ ; yalnız biri ____ |
| 6 | **Dükkân kuruldu** (kabul bildirimi) | | tür ____ ; hazır oldu (dd:ss ____) ; kaç deneme ____ |
| 6b | **Dükkân hazır oldu** (Dikkat sekmesi; toast yok) | | |
| 7 | **Rafa mal kondu** | | mal ____ ; kit gıdası ☐ ; boş raf uyarısını gördü ☐ |
| 8 | **İlk dükkân satışı** (bildirim) | | söyledi mi: "____" |
| 9 | Çıkış / oturum sonu | | süre ____ ; yarıda bıraktı ☐ |

### Ek: gözlemcinin ekranda göreceği işaretler ("bunu görürsen olay X oldu"; yalnız gözlemci içindir, katılımcıya söylenmez)

Kaynak: T3 `pilot-ekran-ipuclari.md` (SP; main 45ac5b0). Metinler P12b/P13'te değişebilir; gözlem yapılan sürüm üst bilgideki commit ile eşleşmelidir. Bildirim (toast) 4,5 sn, hata 8 sn görünür; iki bildirim art arda gelirse ikincisi birincisi kapanınca çıkar.

| Olay | Ekranda görünen (45ac5b0) |
|---|---|
| 2 | Alt çubukta "Yurdun hazır" ve "Yurdunda kur"; zamanlayıcı yok, eyleme ya da kapatmaya kadar kalır |
| 3 (kabul) | Üstte "Çiftlik kuruluyor: yapı …" bandı **ve** solda "geri alma: m:ss" şeridi **ve** haritada "Çiftlik · Temel · 12 dk" |
| 3b (bitti) | Haritada çiftlik etiketi kalkar; Dikkat sekmesinde rozet ve "Çiftlik inşaatı bitti"; toast yok |
| 4 | Komutlar paneli › Ticaret ya da (P13) Mal sekmesi; Mal satırında "Satışta: saatte N birim" ya da "satışa çıktı" bandı |
| 5a | Sol üst çipteki tutar artar (ayrı mesaj yok) |
| 5b | "Defter: İlk satışın yapıldı … Ödül: 500 ₺" bandı; **satıştan en çok 1 saat sonra** gelir, 5a'dan ayrı işaretlenir |
| 6 (kabul) | "Dükkân kuruluyor: yapı …" bandı ve etiket ("Yapı" ya da "Dükkân" · Temel · 24 dk) |
| 6b (hazır) | Dikkat'te "Dükkânın hazır." ve "Rafa git"; toast yok |
| 7 | Yuvada "Boş: mal koy" yerine "Gıda · Normal · …"; başarı bandı yok |
| 8 | "Dükkânında ilk satış oldu…" bandı; **yalnız bir kez ve oturum açıkken** (sayfa yenilenirse çıkmaz; o durumda İşletmem'de dükkân satırı ve Defter bandına bak) |

## 3. Kutular (olay olay doldurulur; satır sayısı sınırsız)

| dd:ss | **Takıldığı yer** (ekran, ne yapıyordu, süre) | **Sorduğu soru** (aynen) | **"Kilit" algısı** (sözleri aynen: "buna izin yok", "açılması lazım", "kapalı" gibi) | İpucu (IP-L#, dd:ss) | Not (yalnız gözlem) |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |

"Takıldı" = 45 sn işlem yok ve ne yapacağını sormadı/söylemedi ya da aynı adımı ≥ 2 kez denedi. "Kilit algısı" yalnız katılımcı **kendisi** söylerse yazılır; gözlemci sormaz, ima etmez.

## 4. Oturum sonu soruları (sırayla, aynen sorulur, yönlendirmesiz)

| # | Soru | Yanıt |
|---|---|---|
| 1 | Oyunun ne olduğunu iki cümleyle anlatır mısınız? | |
| 2 | Yarın bu oyunu yeniden açar mıydınız? 1 kesinlikle hayır … 5 kesinlikle evet. Neden? | ___ / 5 · |
| 3 | Oyun, bir sonraki adımı size gösterdi mi? 1 hiç … 5 tamamen. Nerede? | ___ / 5 · |
| 4 | Oyunda "şunu yapamıyorum" dediğiniz bir an oldu mu? Neydi? | |
| 5 | Bir arkadaşınıza önerir miydiniz? 0–10. Neden? | ___ / 10 · |

Sorular başka açıklama olmadan okunur; yanıt verilmezse tekrarlanır, yorumlanmaz. Katılımcı ekrandaki bir şeyi sorarsa yanıt verilmez ("Ne düşünüyorsunuz?" ya da pilot paketindeki ipucu merdiveni; verilen her ipucu §3'e **düzeyiyle ve zamanıyla** yazılır).

## 5. Oturumdan sonra (gözlemci, aynı gün)

Günlük/O2 çıktısıyla karşılaştır: `katilim`, ilk yapı kabul ve bitiş, ilk satış emri ve gerçekleşme, `kurulus`, `ilkSatisT` (elle yazılan satırlarla fark ofset kontrolüdür). Fark ≥ 10 sn ise ofset hatası olarak işaretle, ölçüt satırlarını günlükten al.
