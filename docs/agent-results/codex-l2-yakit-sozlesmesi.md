# L2 — Rafineri ve sanayi yakıt kaynağı

2 Ekim 2026. Kullanıcının geliştirmeye devam talimatıyla, L1 gider
görünürlüğünün ardından uygulanır. Tek çekirdek yazarı l1; veri A6;
protokol/köprü B2; Tedarik/Üretim A3; yapı görünümü B4; hedefli kontrol B6.

## Veri ve kapsam

- Mevcut `rafineri` açılır: `yapiYuva=2`, `olcekHucre=[2,3,4]`, inşa süresi
  10 saat. Mevcut yöntem, mal/para maliyeti, üretim, bakım ve kirlilik korunur.
  Yeni rezerv, il bonusu, imar kuralı veya tür başına il tavanı eklenmez.
- Şebeke mal kaydına `stokOncelikli?: boolean` eklenir. Bu sürümde `true`
  yalnız depolanabilir `yakit` için geçerlidir; başka mal/elektrikte reddedilir.
  Varsayılan JSON'da yalnız yakıt kaydı `true` olur. Yok/false eski davranışı
  korur. Elektrik dengesi, bölge kipi ve diğer mallar değişmez.
- Yeni parametre paketi yeni kural hash'i oluşturur. Yok/false eşdeğerliği
  dünya davranışına ilişkindir; farklı JSON'un aynı kural hash'i olduğu
  iddia edilmez. Kabul edilen kural göçü mevcut izin yolunu kullanır.

## Yakıt tahsisi

- Sanayi yakıt talebi fiziksel tedarik/ağ talebine katılır. Şebeke eksik
  sanayi girdisini tamamladığından yakıt açığı tek başına verimi düşürmez.
- Gerçekleşen üretimin girdisi esas alınır; durmuş/inşa hâlindeki tesis için
  yakıt tüketimi yaratılmaz. Mevcut nüfus/ordu, bakım, sanayi, dükkân ve
  ihracat öncelikleri aynı yakıtı iki kez tahsis etmeden korunur.
- Pozitif stok mevcut oran modeliyle tüketilir. Stok sıfırken yalnız gerçek
  yerli üretim, NPC ithalatı ve ulaşmış ağ akışı fiziksel kaynak sayılır;
  henüz yoldaki akış stok değildir. Sanayiye kalan fiziksel pay ayrıldıktan
  sonra açık şebekeye yazılır. Uydurma saatlik stok kotası yoktur.
- Örnek: saatte 10 yakıt isteyen tesiste başka akış yokken 4 birim stok,
  stok tükenene kadar kullanılır; bir saatlik toplamda kalan 6 şebekeden
  gelebilir. Eşzamanlı üretim, diğer tüketim ve mevcut bozulma oranları bu
  basit örneğin gerçek sonucunu değiştirir.
- Fiziksel tüketim stok oranından yalnız bir kez düşer. Şebekeden alınan
  yakıt stoğa yazılmaz. Şebeke bedeli mevcut derlenmiş birim fiyatla sadece
  açık üzerinden alınır; stok yakıtına ayrıca şebeke bedeli eklenmez.
- Bu kuralın yakıt tükenme/ulaşma olayında çözüm aynı oyun anında güncellenir;
  mevcut çözüm gecikmesi ve küçük oran toleransı bedelsiz yakıt doğuramaz.
  Diğer malların/bölge kipinin olay sırası ve toleransı değişmez.
- Şebeke ordu ikmalini satın almaz. Yakıtı olmayan ordunun açığı sanayi
  şebeke ödemesinden kapatılmış gösterilmez.

## Kayıt ve görünüm

- Çekirdek düğümde isteğe bağlı `yakitTedariki` üretir:
  `{mal, tuketimMiliSaat, stokMiliSaat, sebekeMiliSaat}`.
  `tuketimMiliSaat = stokMiliSaat + sebekeMiliSaat` gerçek sanayi tahsisidir.
  Stok payı depo/yerli üretim/ithalat/ulaşmış akış toplamıdır; kaynak türleri
  ayrı hesaplanmadığından aralarında hayalî ayrım yapılmaz.
- Aktif kuralda tüketim yoksa sıfır nesnesi; eski/kapalı kuralda alan yok.
  Alan yalnız sahibine gider. Bütün kendi düğümleri bilinirse toplam bilinir;
  bir düğüm eksikse toplam bilinmeyendir. Şebeke bedeli mevcut gider alanından
  okunur, istemci fiyat veya tahsis motoru kurmaz.
- Yeni isteğe bağlı durum strict doğrulama ve içerik referans kontrolüne
  girer. Aynı kuralla yükleme yeni olay eklemez; yeni kural kabul edilen göçte
  eski oranlar kayıt anına kadar uzlaştırılır ve yeni hesap çözülür. Flag
  kapatılan geçiş de eski yakıt tahsisini ve alanını taşımamalıdır.
- Tedarik ve Üretim gerçek kaynak paylarını gösterir; yöntem açıklamaları
  stokun şebekeyi azaltmadığı eski varsayımından arındırılır. Rafineri Sanayi
  grubunda gösterilir; mevcut görsel dilde tank/kolon silüeti eklenir.

## Tek teslim kontrolü

Üç dar senaryo: gerçek rafineri ve stok tükenmesi/şebeke/tek ödeme ile
kayıt-yükleme/replay; kıt yakıtta ordu önceliği; kapalı kural/bölge uyumu ve
kural göçü. Tek kök/istemci tip kontrolü ve derleme. Başarılı eski kontroller
yinelenmez; değişiklik/failure gerekirse yalnız ilgili kontrol tekrarlanır.
Sokak verisi eksik olduğundan L4 canlı görsel doğrulaması yapılmış sayılmaz.
