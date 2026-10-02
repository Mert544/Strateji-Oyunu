# S2 — Bayraklı ilçe baskını uygulama sözleşmesi

2 Ekim 2026. Koordinatör uygulama kararı; D4/0a araştırmasındaki açık
maddeleri bu dilim için kapatır. Kullanıcının geliştirmeye devam yetkisi
içinde uygulanır. Canlı açılış ve denge kabulü değildir.

## Bayrak, veri ve takvim

- `askeri.eskiya` isteğe bağlı, varsa 0a §4.1'deki tüm alanlar zorunlu.
  JSON'a aynı örnek değerler ve `etkin:false` girer. Yeni denge sayısı yok;
  D3 ikmal çarpanı/ordu komutları aynı kalır. Blok yok/kapalı yeni dünyada
  yeni durum veya olay yazmaz; bölge kipinde çalışmaz.
- Dünya zamanı 0 = mevcut arayüzdeki oyun günü 00:00 Türkiye saati.
  Gün `floor(t/GUN)`; çekirdeğe gerçek saat veya Date eklenmez. Günlük ilk
  olay açılıştan sonraki gün sınırı (yeni dünyada t=0), yüklemede aynı olay
  varsa ikinci kez yazılmaz. Yeni kurala geçiş mevcut izinli göç yolunu kullanır.
- Günlük ilçe sırası kimliğe göre kanoniktir. Yalnız parsel verisi olan
  ilçeler; eşik altı, bekleyen baskını olan, son gerçekleşen baskın gününden
  3 gün dolmayan ilçeler elenir. Uygun ilçede bir `savas` PRNG olasılık
  çekimi; başarılıysa +2 oyun gününe planla. İl dilimi sıralı il kimliğinin
  indeksinin 4'e kalanı, başlangıç 19+dilim saat; pencere 1 saat.
- Duyuru 24 saat önce; planlama anında hedef ilçede uygun sahibin tamamlanmış
  Kulesi varsa +12 saat ve dar tahmin aralığı kilitlenir. Gerçek güç yalnız
  sonuçta genel veriye açılır; öncesinde parametre aralığından alt/üst tahmin.
- `planli→duyuru→pencere→bitti`, ayrıca `iptal`. `eskiya_duyuru` ve
  `eskiya_toparlanma` olayları tarihsel üç olaya açıkça eklenir.
  Bayrak kapatılınca bitmemiş baskınlar iptal, yeni planlama yok; daha önce
  doğmuş revir hakkı kendi olayında yalnız bir kez geri verilir.

## Servet, katılım ve kuvvet

- Servet: hedef ilçedeki özel hücre değerleri + tamamlanmış ekonomik
  tesis/ek yapı taban inşa değerleri, gerçek ölçekleriyle. Dükkân dahil;
  stok/hazine/birlik/Ordugâh/Karakol/Kule hariç. Konumu çözülemeyen yapı
  başka ilçeye atanmaz. Kalkanlı ve uykulu sahipler servet/katılım/hedef dışı.
- Boy: S<250.000.000 mili ise yok; aksi halde
  `min(8,max(1,floor(S/500.000.000)))`. Güç boy×100.
- Uyku, `sonEtkinlik + uykuGun*GUN` sonrasındaki ilk saatlik tikte işler;
  yalnız etkin PvE mülk kipinde askerî ikmal ve maaş sıfırlanır. Başarılı
  oyuncu komutu mevcut çözüm yoluyla uyandırır. Tatil modu eklenmez.
- Normal duruş hedef ilçede tamamlanmış yapısı varsa, savunma duruşu aynı
  oyun bölgesinin her ilçesinde katılır; geri çekilme katılmaz. Aynı düğüm
  bir açık pencereye kilitliyse başka eşzamanlı baskında ikinci kez sayılmaz;
  aynı zamandaki açılışlarda olay/kimlik sırası karar verir.
- Açılışta uygun hedefler ve katılımcıların düğüm kimliği, birlik adetleri,
  güçleri, ilçe payları kilitlenir. Kapanışta artık sahibi farklı/yok olan
  düğüme kayıp/ödül yazılmaz; kalkan veya uykuya geçmiş hedefe yağma yok.
- Güç: hazır birlik×ikmal×duruş (mevcut sıralı tamsayı hesabı), hedef ilçede
  Karakol katkısı ilk iki yapıya kanonik kimlik sırasıyla 100/50, Nöbet Evi
  tabanı 100. Kamu tabanı hücrenin varlığından bağımsızdır; hücre yalnız ikon
  konumudur. Ortak toplam hedef bölgenin mevcut arazi çarpanıyla çarpılır.
- Kapanışta önce baskın, sonra savunma için mevcut %90–110 sapma çekilir;
  eşitlik savunmanın. Gerçek sapmalı güç ve katkı dökümü sonuçta saklanır.

## Kayıp, onarım ve revir

- Yenilgide hazır kilitli birliklerden tür başına `floor(adet*0,15)` düşer;
  güncel mevcudu aşmaz. Galibiyette kayıp 0. Kaybın `floor(kayip*0,4)`'ı
  24 saat sonra döner. Yeni eğitilen birlikler eski kilitli sayıya eklenmez.
- Bekleyen revir kapasiteyi ayırır; yeni üretim bunu sayar. Kapasite sonradan
  azalsa da kazanılmış dönüş hakkı korunur; kapasite üzerindeyken yeni üretim
  durur. Düğüm artık aynı sahibin değilse dönüş iptal olarak kaydedilir.
- İlçe payı = hedef ilçedeki tamamlanmış ekonomik yapıların hücre/yuva
  sayısı / aynı sahip-düğümün bütün ilçelerindeki ekonomik yuvaları; payda
  sıfırsa pay 0. Yağma oranı %25×pay; kalkan bitişinden sonraki 14 günde
  önce %5 tabanı seçilir. Mülk düğümünde ilk yağmada açılan sabit 24 saat
  defteri, oranların toplamını mevcut %25 tavanda tutar. Kayan pencere değildir.
- Bu dilimde defteri PvE kullanır. Mevcut `savasIlan` yalnız harita bölgesi
  kimliklerini çözer; oyuncunun mülk işletmesi kimliği bu tabloda olmadığı
  için çalışan bir mülk PvP ilan yolu yoktur. Bölge kipi savaşına yeni tavan
  uygulanmaz. İleride mülk PvP açılırsa aynı deftere bağlanması gerekir.
- Yalnız depolanabilir mal, `stokEkle` üzerinden düşer; nakit/kasa/raf ayarı
  veya parsel sahipliği değişmez. Gerçek kayıp miktarı sonuçta saklanır.
- Hedef ilçedeki tamamlanmış tesis yuvalarının %25'i (aşağı yuvarlama),
  tesis kimliği sırasıyla bütçeye sığan bütün tesisler seçilerek 24 saat
  onarıma girer. `aktif` değiştirilmez; `onarimBitis=max(eski,t+24sa)`.
  Ek yapılar onarıma alınmaz, ilçe payı ikinci kez uygulanmaz.

## Mal ganimeti ve görünürlük

- Galibiyette boy başına 3 mühimmat+2 yakıt. Katılım eşiği kişinin arazi
  öncesi katkısının baskın temel gücüne oranı ≥%10. Payda kamu dahil toplam
  arazi öncesi savunma katkısıdır; kamu/eşik altı payları ve yuvarlama artığı
  yeniden dağıtılmaz. Kişinin Karakol katkısı kendi payına dahildir.
- Hafta `floor(oyunGunu/7)`; ilçe/oyun haftası başına toplam taban değer
  6.500.000 miliyle sınırlı. Kalan bütçeye göre tüm mal havuzu aynı ppm
  oranıyla aşağı yuvarlanır, sonra katkı payı uygulanır. Depoya sığmayan
  miktar kaydedilir, nakde çevrilmez. Deftere yalnız gerçekten verilen
  malların taban değeri eklenir; çift ödül sonuç evresiyle engellenir.
- Planlı kayıt hiçbir kareye çıkmaz. Genel ilçe: ilan/pencere/zaman/tahmin,
  bitişte toplam güç ve sonuç. Oyuncu: yalnız kendi ilan ilgisi, katkısı,
  mal/birlik kaybı, gerçek ganimet, onarım ve revir. Sonuçlardan tekrar ödeme
  hesaplanmaz. Kapalı bayrak ile bilinmeyen/eski sunucu ayrı gösterilir.
- Mal/birlik/düğüm kimlikleri sonuçta string tutulur. Optional kayıtlar,
  kuyruk olayları ve defterler strict doğrulama ve kayıt-yükleme yoluna girer.
- Görünüm bütün ilgili aktif olayları ve son 10 baskın kimliğinin bütün
  kendi düğüm sonuçlarını taşır; sınır sonuç satırı sayısı değildir.
  Bekleyen revir hakları geçmiş görünüm sınırından bağımsız korunur.

## Teslim

Tek çekirdek yazarı l1_protokol; veri A6; protokol/bridge B2; UI A3/B4;
hedefli doğrulama B6. Yeni ajan yok. Kontroller: kapalı/yok eşdeğerliği,
gerçek olay akışı+yeniden yükleme+ödül tekilliği, gizlilik ve kayıp sınırları.
Varsayılan bayrak kapalı kalır; geniş denge/tarayıcı kabulü yapılmış sayılmaz.
