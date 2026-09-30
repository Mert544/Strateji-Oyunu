# 04 — Yol Haritası

> **Özet.** Plan 4 aşama ve 3 kapıdan oluşur; **kapılar kanıt sırasıdır, takvim taahhüdü değildir:** bir kapı geçilmezse önceki aşama yinelenir. Şu an Aşama 1 (tasarım/araştırma) belgeleri yazılıyor ve Aşama 2 (arayüzsüz çekirdek simülasyon) kod işi altı adıma bölünmüş durumda. Bu belge aşamaları, Aşama 2 iş kırılımını ve kapı kriterini, Aşama 3 önerisini (2D arayüz + H4 insan testi), açık kararları ve sonraki adımları toplar.

İlgili belgeler: [00 — Vizyon](00-vizyon-ve-kararlar.md) · [02 — Tasarım Ar-Ge](02-tasarim-arge.md) · [03 — Teknik Mimari](03-teknik-mimari.md) · [06 — Simülasyon Spesifikasyonu](06-simulasyon-spesifikasyonu.md) · [08 — Altı Katman](08-alti-katman.md) · [Araştırma](arastirma/)

> **Güncelleme (30 Eylül gece):** Aşama 3'ün yönü 3D gerçek Dünya + altı katman olarak değişti; bkz. [§8](#8-güncelleme-30-eylül-gece-aşama-3-yönü-3d-gerçek-dünya-ve-altı-katman).

---

## 1. Yol haritası: 4 aşama, 3 kapı

> **Yorum uyarısı.** Sahibin PDF'inde yol haritası bir diyagramdır ve "4 aşama, 3 kapı" dışında ayrıntı verilmemiştir. Aşağıdaki aşama içerikleri ve kapı tanımları **bizim yorumumuzdur;** yalnızca Aşama 2'nin kodlama listesi ve hipotez eşikleri PDF'ten gelir.

| Aşama | İçerik (yorum) | Çıktı | Sonraki kapı |
|---|---|---|---|
| **Aşama 1** — Tasarım ve araştırma | Rakip/pazar araştırması, tasarım Ar-Ge, vizyon ve kararlar, teknik mimari, simülasyon spesifikasyonu | Belgeler 00–04 ve 06 | **Kapı 1:** Tasarım kapısı — kararlar, hipotezler ve ölçüm tanımları yazılı ve takım lideri tarafından onaylı; simülasyon spesifikasyonu (06) kodlanabilir durumda |
| **Aşama 2** — Arayüzsüz simülasyon | Sentetik harita, deterministik olay motoru, ekonomi/lojistik/askeri/teknoloji/politika çekirdeği, bot ve ölçüm koşum takımı | Çalışan çekirdek + H1–H3, H5–H7 raporları | **Kapı 2:** Simülasyon kapısı — §3 |
| **Aşama 3** — Oynanabilir 2D arayüz prototipi | PixiJS 2D harita, kapsam görünümü, H4 insan testi | Oynanabilir prototip + H4 sonucu | **Kapı 3:** Okunurluk/oynanabilirlik kapısı — H4 geçer; ilk insan geri bildirimi toplanmıştır |
| **Aşama 4** — Çok oyunculu / gerçek harita dilimi (yorum) | Olay kaynaklı yetkili sunucu; gerçek coğrafya diliminin (30–60 bölge) seçimi ve veriye dönüştürülmesi | Çok oyunculu ve gerçek haritalı prototip | — (Aşama 4 kapısı bu planın dışında kalır) |

**Yineleme kuralı [PDF]:** kapı geçilmezse önceki aşama yinelenir. Örnek: Kapı 2'de H2 başarısız olursa, sorun Aşama 1'e (tasarım: lavabo/musluk dengesi, [02](02-tasarim-arge.md)) döner; parametre veya kural değişip Aşama 2 yeniden koşulur.

## 2. Aşama 2 iş kırılımı (6 adım)

Kodlama sırası PDF'tendir; paket eşlemesi [03 §2](03-teknik-mimari.md) ve takım yapısına göredir. Kaynak kuralları [06](06-simulasyon-spesifikasyonu.md) içindedir.

| # | Adım | Paket / konum | Kabul ölçütü (öneri) |
|---|---|---|---|
| 1 | **Bölge grafı ve JSON veri biçimi** (sentetik test haritası) | `packages/veri`: zod şeması, yükleyici/doğrulayıcı, `haritalar/sentetik-50.json`, `haritalar/mini-6.json`, `icerik/icerik.json`, `icerik/parametreler.json`, deterministik harita üreticisi (`pnpm harita:uret`) | Harita ve içerik şemadan geçer; aynı tohumla üretici aynı haritayı verir |
| 2 | **Sürekli zamanlı deterministik olay motoru** | `packages/cekirdek`: sabit-nokta, sfc32 PRNG, öncelik kuyruğu, `motor/Simulasyon`, tembel stok birikimi, durum özeti | "Aynı tohum → aynı özet" testi; tembel birikim birim testleri |
| 3 | **Ekonomi zinciri ve lojistik ağı** (kapasite, taşıma süresi, "neresi açık" hesabı) | `cekirdek/ekonomi/`, `cekirdek/lojistik/{graf,mcf,kapsam,cozum}` | Min-maliyet akış testleri; kapsam neden sınıfları; 30 günlük koşuda stok/israf makul |
| 4 | **Askeri üretim, ikmal, önceden ilanlı çatışma penceresi** | `cekirdek/askeri/` | Kayıp tavanı testi; ilan → hazırlık → pencere → otomatik çözüm akışı |
| 5 | **Teknoloji ve politika için en küçük veri güdümlü kurallar** | `cekirdek/teknoloji`, `cekirdek/politika` | Teknoloji yeni yöntem açar; anlaşma/yaptırım pazar çarpanını değiştirir |
| 6 | **Ölçüm koşum takımı:** bot stratejileri, H1–H3 ve H5–H7 raporları, testler | `packages/botlar` (sanayici, tuccar, lojistikci, militarist, kur-ve-unut, gec-katilan + politika önayarları), `packages/olcum` (CLI) | `pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-10` JSON + Markdown rapor üretir |

**Performans hedefleri (hedef, ölçülecek):** 30 günlük koşu < 1 sn; 10 tohumla tam H paketi < 60 sn ([03 §4, §6](03-teknik-mimari.md)).

**Kalite kapısı:** `pnpm kontrol` (tipkontrol + lint + test) yeşil olmadan bir adım bitmiş sayılmaz.

## 3. Kapı 2 kriteri (Aşama 2 → Aşama 3)

**Geçiş koşulu:** H1, H2, H3, H5, H6 ve H7 raporlarının **üretilmesi** ve değerlendirilmesi ([02 §8.4](02-tasarim-arge.md) ölçüm tanımları).

| Hipotez | Geçme (vazgeçme **değil**) koşulu | Başarısızsa önce bakılacak yer |
|---|---|---|
| H1 | Aynı politika bölgelerin ≤ %70'inde ilk üçte | Bölgeler arası farklılaştırma: rezerv dağılımı, yöntem bedelleri, tükenme |
| H2 | 30. günde tekrar endeksi ≤ %60; karar tükenmesi 30. güne kadar > 0 | Lavabolar, bakım, bozulma, azalan getiri, şoklar ([02 §2](02-tasarim-arge.md)) |
| H3 | Kapasitenin %20'si askeriyeye kayınca en az bir mal fiyatı veya kapsamı ≥ %10 değişir | Askeri maliyet, ikmal talebi, `askeriRezervPpm` |
| H5 | 48 saat çevrimdışı oyuncunun tek pencerede kaybı ≤ %25 | Kayıp tavanı uygulaması |
| H6 | Yeni oyuncuların ≥ %50'si 14 günde yerel ekonominin ilk yarısına ulaşır | Yetişme mekanizmaları (C6–C9, [02 §7](02-tasarim-arge.md)); koruma süresi |
| H7 | Kur-ve-unut üretimi aktif oyuncunun %50–85'i | Kuyruk derinliği, hazır emir verimi (~%60–70 önerisi), akış modeli |

- **Başarısız hipotez → önceki aşama yinelenir** (tasarım/parametre değişikliği, ardından Aşama 2 yeniden koşulur).
- **Eşik disiplini (öneri):** eşikler başlangıç önerisidir ve ilk simülasyondan sonra kalibre edilir; ancak her eşik değişikliği gerekçesiyle kayda geçirilmeli ve takım lideri tarafından onaylanmalıdır (hedef kaydırmayı önlemek için).
- **Geçerlilik sınırı:** simülasyon **dengeyi ölçer, eğlenceyi kanıtlamaz** ([00 R5](00-vizyon-ve-kararlar.md)). Kapı 2 yalnızca "matematiksel olarak sağlıklı" anlamına gelir.
- H4 bu kapıda değerlendirilmez; Aşama 3'te insan testiyle ölçülür.

## 4. Aşama 3 önerisi: oynanabilir 2D prototip

**Amaç:** lojistiğin okunur olduğunu (H4) ve simülasyonun insan elinde anlaşılır olduğunu sınamak. **Öneri niteliğindedir;** Kapı 2 geçilmeden ayrıntılandırılmaz.

| Bileşen | Öneri | Not |
|---|---|---|
| Çizim | **PixiJS v8 + d3-geo** projeksiyonu, 2D harita | [03 §7](03-teknik-mimari.md); Canvas2D yedek |
| Mimari | Arayüz, sim anlık görüntülerinin **saf çizicisidir;** yalnızca komut gönderir | Determinizm korunur |
| Harita | Başlangıçta sentetik harita; gerçek dilim seçilince aynı veri biçimine geçilir | [00 A1](00-vizyon-ve-kararlar.md) |
| **Kapsam görünümü** | "Neresi açık ve neden": 3–4 durum, renk körü güvenli rampa + ikinci kanal, kenar genişliği = kapasite / renk = kullanım, neden glifi, tıkla → tek satır neden, darboğaz tırmanışı, "ya olursa" önizleme | [02 §6](02-tasarim-arge.md) U1–U7 |
| Zaman kontrolü | Dünya hızı: 1x (insan testi), 6x, 24x | [00 §3](00-vizyon-ve-kararlar.md) |
| Komutlar | Emir (politika düzeyinde), kenar geliştirme, birlik üretimi, araştırma, ticaret emri, anlaşma/yaptırım | [06](06-simulasyon-spesifikasyonu.md) komut kümesi |
| Kapsam dışı | Hesap/giriş, ödeme, çok oyunculu, mobil, 3D, gerçek karolar | [00 §5](00-vizyon-ve-kararlar.md) |
| Ölçüm | H4 testi ve küçük ölçekli ilk tutma gözlemi (20–25. günde tekrar sorunu için ilk **insan** verisi) | Bağımsız tutma verisi ancak burada başlar |

## 5. H4 insan testi: 5 kişilik protokol taslağı

**Hipotez H4 [PDF]:** lojistik okunur. **Ölçüm:** 5 kişilik testte "neresi açık ve neden?" sorusu. **Vazgeçme ölçütü [PDF]:** 5 kişiden en az 4'ü 60 saniyede yanıtlayamıyorsa. Aşağıdaki protokol **taslaktır;** ayrıntılar Aşama 3 başında netleşir.

| Başlık | Taslak |
|---|---|
| Katılımcı | 5 kişi; en az 2'si strateji/yönetim oyunu oynamayan (öneri); bu oyunu daha önce görmemiş |
| Hazırlık | Sabit tohumdan üretilmiş ve **önceden bilinen cevaplı** 3 durum (ör. kapasite darboğazı, girdi eksik, mesafe). Doğru cevap çekirdeğin kapsam çıktısından ([06 §5](06-simulasyon-spesifikasyonu.md) neden sınıfları: `kapasite`, `girdi_eksik`, `mesafe`, `erisim_yok`) türetilir |
| Bilgilendirme | Kısa (≤ 1 dk) sözlü açıklama; sonrasında ek yardım yok (Karar gerekli: lejant gösterilsin mi?) |
| Görev | Durum haritası yüklenir, dünya 1x. Soru: "Şu bölgede hangi mal açık ve neden?" 60 saniye sayacı |
| Ölçülenler | Doğruluk (mal + neden doğru mu), süre, tıklama yolu, yüksek sesle düşünme notları, yanlış cevap tipleri |
| Kapanış | Kısa mülakat: "Sizi en çok ne şaşırttı?", "Hangi bilgiyi aradınız ve bulamadınız?" |
| **Karar kuralı** | PDF ölçütü: ≥4/5 başarısızsa vazgeç/tasarımı yinele. **Öneri:** PDF ölçütü gevşektir (2/5 yanıtlasa da geçer); hedef olarak ≥ 4/5 doğru ve ≤ 60 sn önerilir. Ara durum (2–3 başarılı) → arayüz yinelenir. Karar takım liderinindir ([00 A5](00-vizyon-ve-kararlar.md)) |
| Sınırlar | n = 5 istatistiksel kanıt değil, **tasarım problemi bulucu** bir testtir |

## 6. Açık kararlar

Ayrıntı ve öneriler: [00 §8](00-vizyon-ve-kararlar.md).

| # | Karar | Durum |
|---|---|---|
| A1 | Coğrafya dilimi | Açık; sentetikle ilerlenir |
| A2 | Sınır ve isim politikası | Açık; öneri: gerçek bölge (ülke değil), oyun içi bloklar, güncel çatışma senaryosu yok |
| A3 | Sezon seçeneği | Kalıcı dünya seçildi; H6 başarısızsa yeniden değerlendirilir |
| A4 | Gelir modeli | Kapsam dışı; ilke: kritik kararlarda parayla güç yok |
| A5 | H4 vazgeçme ölçütü sıkılığı | Takım lideri kararı |
| A6 | H6 işletimsel tanımı ("yerel ekonominin ilk yarısı") | Ölçüm paketinde sabitlenecek |
| A7 | Yetişme mekanizmaları (C6–C9) v0'a girecek mi | H6 sonucuna bağlı |
| A8 | Çok oyunculu sunucu zamanlaması | Aşama 4 (yorum) |
| A9 | H1 başarı skoru ve H2 "en iyi düzenleme" tanımı | Ölçüm paketinde sabitlenecek ([02 §8.4](02-tasarim-arge.md)) |
| A10 | v0 sonrası kalibrasyon adayları: istihdam üssü (0,8), esneklik (−1,5), yapı yıpranması (%1–2/gün), şoklar, keşif olayları, yağma–taşıma bağı | Kalibrasyon taramasından sonra |

## 7. Sonraki adımlar

1. **Aşama 2 kodunu tamamla** (§2'deki 6 adım); `pnpm kontrol` yeşil tutulur.
2. **İlk ölçüm turunu çalıştır:** `pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-10`; raporları incele (ileride ölçüm raporu belgesi `docs/05-…` numarasıyla yazılacaktır; numara ayrılmıştır).
3. **Duyarlılık taraması** (tek-tek veya Sobol) ile v0 sabitlerinin kalibrasyonu; ardından ≥200 tohumlu güven aralığı koşuları ([02 §8.3](02-tasarim-arge.md)).
4. **Başarısız hipotezler için tasarım yinelemesi** (özellikle H2: Gate 0 gözlemi).
5. **Kapı 2 değerlendirmesi** ve Aşama 3'e geçiş kararı (takım lideri).
6. **Sınır/isim politikası ve coğrafya dilimi** kararlarını Aşama 3 sonuna kadar netleştir.
7. Belgeleri, ölçüm sonuçlarına göre güncel tut (06 değişirse 02 ve 03'ü eşle).

## 8. Güncelleme (30 Eylül gece): Aşama 3 yönü 3D gerçek Dünya ve altı katman

Bu bölüm yukarıdaki planı **bozmaz;** yeni kararların ([00 K17–K22](00-vizyon-ve-kararlar.md)) yol haritasına etkisini toplar. §1–§7'deki kapı sırası ve Kapı 2 ölçütleri geçerlidir.

**Yeni yön.**
- **3D gerçek Dünya (K17):** §4'teki "PixiJS 2D" önerisinin yerine, stilize 3D küre (three.js; yakın plan için MapLibre küre + PMTiles) ana istemci yönüdür. Aşama 3 tablosundaki "kapsam dışı: 3D, gerçek karolar" satırı **Aşama 2 kodu** için geçerli kalır. Mevcut 2D inceleme sayfası (`pnpm izle`) hata ayıklama aracı olarak sürer. H4 (lojistik okunurluğu) insan testi aynen yapılır; arayüz 3D küre üzerinde olacaktır. Aşamalı plan ve bütçeler (tahmin): [arastirma/3d-teknoloji](arastirma/3d-teknoloji.md) §5.
- **İlk gerçek dilim (K18):** Türkiye + Balkanlar + Karadeniz (30–60 bölge). Aşama 4'teki "gerçek harita diliminin seçimi" bu kararla öne çekildi; bölge listesi, sınır ve isim politikası (A2) ve çevrimdışı veri hattı ([arastirma/acik-kaynak-ve-veri](arastirma/acik-kaynak-ve-veri.md)) açık iş kalemidir.
- **Altı katman (K19) ve iklim takvimi (K20):** çekirdek simülasyon Tarım, Sanayi, Lojistik, Teknoloji, Pazar ve Devlet olarak genişler; oyun içi iklim takvimi dünyayı sıfırlamaz (K21). Tasarım, sayılar ve uygulama sırası: [08](08-alti-katman.md).

**Sıralama (öneri; kanıt sırası, takvim taahhüdü değil).**

| Adım | İçerik | Kapı / ölçüt |
|---|---|---|
| 1 | **Faz B: altı katman çekirdek uygulaması** (B1 Tarım → B2 Sanayi → B3 Pazar → B4 Devlet → B5 Lojistik → B6 Teknoloji; [08 §7](08-alti-katman.md#7-faz-b-uygulama-sırası)). Aşama 2'nin yinelemesi sayılır; her adımda bot ölçümü ve regresyon kalkanı | Kapı 2 ölçütleri (§3); v0.2/v0.3 H1 ve H2 turlarıyla birlikte yürür |
| 2 | **Gerçek veri hattı ve dilim** (bölge listesi, sınır/isim politikası, tarım/sanayi/liman/nüfus verilerinin bölge başına JSON'a indirgenmesi) | Veri sözleşmesi hazır; K22 lisans ilkesi; gerçek verili harita aynı biçimle yüklenir |
| 3 | **3D istemci** (MVP küre → gezen kamera → bölge yakın planı) | Kapı 2 geçildikten sonra; H4 insan testi Kapı 3'tür |
| 4 | Çok oyunculu sunucu ve (v1.5) emir defteri, tedarik sözleşmesi, `ortak_sebeke` | Aşama 4; [08 §5.4](08-alti-katman.md#54-oyuncular-arası-emir-defteri-ne-zaman-v15-kapısı) koşulları |

**Açık kararlar (yeni/güncel).**

| # | Karar | Durum |
|---|---|---|
| A1 | Coğrafya dilimi | Kısmen kapandı (K18); bölge listesi açık |
| A2 | Sınır ve isim politikası | Açık ve **öncelikli:** Balkan ve Karadeniz diliminde ihtilaflı bölgeler ve güncel çatışma alanları vardır; dilim verisinden önce yazılmalı |
| A11 | Teknoloji düğüm sayısı (PDF 5–8 → ≈ 17) | Öneri; takım lideri onayı ([08 §4](08-alti-katman.md#4-teknoloji)) |
| A12 | Sayısal değerlerin kalibrasyonu (iklim eğrileri, olay olasılıkları, ceza tabanları) | Her Faz B adımında bot ölçümüyle; ölçümde `gunCarpani = 12` ile 12 ay görülür |
| A13 | Veri hattı ve hukuki inceleme (ODbL, atıf sayfası) | Yayından önce; [araştırma](arastirma/acik-kaynak-ve-veri.md) §4 |

**Hatırlatma.** Simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz ([00 R5](00-vizyon-ve-kararlar.md)); altı katmanın yinelenen kararları (toprak yorgunluğu, brownout, filo, bütçe, yasa) 20–25. gün sıkılmasına karşı **hipotezdir** ve insan testine kadar kanıtlanmış sayılmaz.
