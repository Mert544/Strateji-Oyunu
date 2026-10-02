# U1 — Üretim kartından kendi tesisine

2 Ekim 2026. T1–T2 `9b01521` üstüne; mevcut altı ajan yeniden kullanılır.

## Karar ve kabul

Üretim ağı yöntem kartı, içerikte o yöntemi destekleyen kendi tesislerini
isteğe bağlı ayrıntıda gösterir. Gerçek `IsletmeDurumu.yapilar` ve türün
`yontemler` üyeliği kaynak alınır. Bilinmeyen işletme ile uygun tesis olmaması
ayrılır. İnşaat, mevcut yöntemi bilinmeyen tesis ve zaten hedef yöntemde olan
tesis açıklanır. Yükseltme inşaatı tamamlanmış tesisi çift saydırmaz.

Geçerli tamamlanmış çok yöntemli tesisin eylemi mevcut yöntem seçicisini
idempotent açar ve ilgili kartı odaklar. Eylem yöntem seçmez, onay açmaz,
komut göndermez; gerçek değişiklik mevcut onay ve T2 önceki yöntem korumasıyla
olur. Tıklamada güncel sahipli tesis ve içerik üyeliği yeniden doğrulanır.
Kilitli yöntem incelenebilir; mevcut seçici araştırma koşulunu uygular.
Stok eksikliği yeni yöntem değiştirme engeli yapılmaz. Tek yöntemli tesiste
çalışmayan geçiş düğmesi sunulmaz. Aynı tesisin farklı yöntemlerde görünmesi
bütün zinciri eşzamanlı çalıştırabildiği anlamına gelmez.

Native ayrıntılar ve odak canlı çizimde korunur. Yeni simülasyon kuralı,
komut, ücret, kalıcı durum veya protokol alanı eklenmez.

## Sahiplik

- B2: yeni `uretim-tesisleri.ts` saf tesis eşleştirme verisi.
- A3: `uretim-agi-panel.ts`, `mulk-panel.ts` HTML/eylem/odak entegrasyonu.
- B4: `uretim-agi-panel.css`, son gerçek ekran için `/tmp` betiği.
- L1: salt okuma sınır incelemesi; somut itirazı doğrudan sahibine iletir.
- A6: mevcut teknoloji Ar-Ge notu ve gerektiğinde kısa şartname güncellemesi.
- B6: tek son istemci tip kontrolü/derleme; B4 gerçek akışına GO.
- Root: sözleşme, entegrasyon incelemesi, devam kaydı, galeri ve commit/push.

## Doğrulama

Düşük etkili UI geçişi için yeni test yazılmaz. Önceki çekirdek/protokol
kontrolleri tekrarlanmaz. Son istemci tip kontrolü ve tek derlemeden sonra
bir gerçek oyun akışında seçiciyi açmanın komut göndermediği, ayrı manuel
onayın gerçek tesisi değiştirdiği doğrulanır. Bir masaüstü PNG ve komut
sonuçları JSON'u; mobil/geniş tarayıcı matrisi sona bırakılır.

## Kısa karar görüşmesi

B4 gerçek koyun senaryosunun Gebze'de arazi etiketi gereksinimine takıldığını
bildirdi; varsayılan malzeme ve parayla kurulabilen tekstil üretimhanesinde
yün eğirme→kumaş dokuma önerildi. Root kabul etti. Eksik iplik geçiş engeli
yapılmayacak ve yöntem değişimi gerçekleşmiş üretim gibi sunulmayacak.
L1 helper/selector sınırında core değişikliği gerektiren engel bulmadı.
A3 aynı yöntemin üreten/kullanan kartlarını mal+yön+yöntem anahtarıyla ayırdı.
Root'un aynı ilçedeki benzer tesislerin ayırt edilmesi itirazı, gerçek tesis
numarası eklenerek çözüldü. Uygulama sahipleri hazır; B6 son kontrol sahibi.

## Gerçek ekranda bulunan odak düzeltmesi

B4 gerçek CTA akışında tek seçici, değişmeyen yöntem, sıfır gönderilen komut
ve kapalı onayı doğruladı; hedef kart odağı 300 ms sonra BODY'ye düşüyordu.
A3 kaynağı ayırdı: sekme değişimi zorunlu çizimde odağı veriyor, pointerup
ertelenmiş ikinci çizimi korumalı abonelik yolunun dışında yapıyordu.
Root, bu dar düzeltme için A3 sahipliğini `arayuz/mulk-paneli.ts` ve
`arayuz/panel.ts` dosyalarına genişletti: isteğe bağlı odak yakalama/geri verme callback'i
asıl DOM değişimini çevreleyecek; yeni bekleyen odak isteği en son uygulanacak.
Yalnız ilk çizimde bekleyen bayrağı temizlemek sonraki gerçek veri çizimlerini
korumadığı için tercih edilmedi. Kaynak değişikliği nedeniyle istemci tip
kontrolü/derleme ve aynı gerçek ekran akışı yenilenecek; geniş test eklenmez.
