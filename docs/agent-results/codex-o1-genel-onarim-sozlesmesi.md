# O1 — Gerçek teklifli genel onarım

M1–H1 `c0e77ef` üstüne, 2 Ekim 2026. Önce hazır genel onarım akışı
uygulanır. Sondajın başarısızlık/sonuç kaydı yoktur; bu dalgada başlatma
arayüzü açılmaz, ayrı kalıcı sonuç sözleşmesi hazırlanır.

## Ortak karar

Mevcut `genel_onarim` seçilen kendi işletme düğümündeki **bütün aşınmış**
tesisleri kapsar; durmuş tesisler de hedef olabilir. Her tesis için
ölçekli inşa para/mal bedelinin yapılandırılmış oranı ayrı yuvarlanıp
toplanır. Ödeme hemen yapılır; aşınma sıfırlanır, mevcut yapılandırmada
6 simülasyon saati onarım duruşu oluşur. Erken oyun süre indirimi yoktur.
Çalışma tercihi değişmez. Duruş boyunca üretim/üretim girdisi/işçi kullanımı
durur; bakım ve aktif tesisin işletme para gideri sürer. Yeni ücret/denge yok.

Çekirdekte tek saf teklif hesabı hem komut hem özel kare tarafından kullanılır.
`GenelOnarimTeklifi`: tesis kimliği/türü/ölçeği listesi, paraMili,
mal kimliği/miktarı listesi ve durusMs. Listeler kanoniktir. Aşınma oranı
fiyatı değiştirmediğinden onay kimliğine girmez; pozitif aşınmalı hedef
kümesi değişirse teklif değişir. Komutta isteğe bağlı `gorulenTeklif`
güncel teklif ile mutasyon öncesi birebir karşılaştırılır; eski çağrı
korunur. Ödeme yeterliliği işlem anında yeniden denetlenir.

Sahibe özel `ozel.onarim` gerçek teklif/uygunluk/engel ve sürmekteki onarımın
bitiş/hedef kimliklerini taşır. Eksik alan bilinmiyordur; aşınmasız/süren
onarım bilinen durumdan ayrılır. İstemci maliyet hesaplamaz. İşletmem'de
bakım kartının altında il düğümü bazında teklif ve ayrı dondurulmuş onay
sunulur. Seçim/iptal komut göndermez; gerçek sunucu yanıtı beklenir, eski
teklif kabul edilmez. Kabul “onarım başladı”dır, “tamamlandı” değildir.
Aşınmanın sıfırlanması veya istemci saatinin geçmesi tek başına bitiş kanıtı
sayılmaz. Gerçek onarım bitişi etkilenen tesis satırına taşınır.

## Sahiplik ve doğrulama

L1 core/protocol tek yazarı; B2 baglanti.ts/ws köprüsü; B4 yeni
onarim-panel.ts controller; A6 onarim-gorunum.ts/.css ve kısa sondaj Ar-Ge
kaydı; A3 mulk-panel.ts entegrasyonu; B6 hedefli testler; root sözleşme,
inceleme/devam kaydı/teslim. İki kısa vaka: gerçek aşınma→ödeme/duruş/üretim,
saf ret/legacy/save/load/replay ve private kare; istemci frozen onay→WS
payload/pending/ack/ret. Tip kontrolleri ve son build tek sahibinde;
tarayıcı/ekran/geniş test yok.

## Gerçek kabul sonucu

İki O1 vaka ilk koşuda geçti; eski 8 vaka atlandı. Doğal aşınmış iki gerçek
tesis (biri durmuş), kesin ödeme, gerçek duruş/bitiş, legacy ve save/replay,
sahibe özel kare; istemci deep frozen teklif→WS/pending/iptal/ack/ret
doğrulandı. Kök/istemci tip kontrolü ve son build başarılı. Dünya gzip
393,4KB/400KB, harita 517,0KB. Root kaynak incelemesi tamamlandı; tarayıcı
ve ekran yok. Sondajın [sonuç sözleşmesi](codex-sondaj-sonuc-arge.md) ayrı
hazırlandı; sondaj uygulaması değiştirilmedi.
