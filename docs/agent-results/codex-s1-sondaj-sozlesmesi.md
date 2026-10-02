# S1 — Teklifli sondaj ve kalıcı iş sonucu

O1 `c1328c6` üstüne, 2 Ekim 2026. Mevcut altı uzmanla sondajın gerçek
başlatma, bekleyen iş ve sonuç takibi tamamlanır. Yeni denge/ücret/hak yok.

## Kesin kararlar

- `Dunya.sondajlar` isteğe bağlı, ilk yeni başarılı başlatmada oluşur.
  Kararlı iş kimliği düğüm/mal/deneme kimliklerinden gelir; genel kimlik
  sayacı için ek tüketim yapılmaz. Kayıt asıl sahibi, kaynak/mal kimliği,
  başlangıç/bitiş, ödenen teklif ve gerçek başarı/ek rezerv sonucunu taşır.
- Kuyruktaki mevcut `sondaj_bitti` olayına isteğe bağlı iş kimliği eklenir.
  Yeni olay kayıtla eşleşir, aynı bitmiş iş ikinci kez sonuç üretmez.
  Eski kimliksiz olay eski davranışını korur; geçmişe sonuç uydurulmaz.
- Başarıdan bağımsız mevcut iki RNG çekimi, sıra ve tamamlanma anındaki
  başlangıç rezervine uygulanan ek miktar hesabı aynıdır. Beklerken kural
  değişiminde mevcut tamamlanma kuralları geçerlidir; başlangıç teklifi
  tarihsel bilgidir. Yeni dondurulmuş olasılık veya sahip değişince iptal
  mekaniği eklenmez. Sonuç asıl işi başlatan sahibin özel görünümündedir.
- Sanayi koşulları beklerken kaldırılırsa eski olayın RNG/rezervsiz bitişi
  korunur; yeni kayıt `sanayi_kapali` nedeni ile tamamlanır. Bu durum doğal
  başarısızlıktan ayrı gösterilir, iade veya yeni hak doğurmaz. Olasılık
  başarılı olsa da tamsayı yuvarlaması sıfır ek rezerv üretebilir; gerçek
  ek miktar aynen saklanır.
- İş kayıtları saklanır; özel görünüm bütün bekleyenleri ve son 10 bitmiş
  sonucu taşır. Mevcut iki hak ve eşzamanlı iki iş izni korunur. Teklifler
  yalnız güncel kendi düğümündeki uygun mevcut, tarımsal olmayan damarlardır.
- Tek saf sunucu teklifi: mal, kullanılmış/tavan hak, para/malzeme, temel
  süre, güncel süre tahmini, olasılık ve ek rezerv oranı aralığı. Görülen
  teklif komutta isteğe bağlıdır; ücret/hak/mal/temel süre/olasılık/aralık
  değişmişse mutasyon öncesi ret, legacy çağrı korunur.
- **Süre tahmini exact eşitlikten hariçtir:** erken oyun rampasında her an
  değişebilir. UI tahmini vaat edilen bitiş saymaz; kesin başlangıç/bitiş
  kabul edilmiş iş kaydından gelir. İstemci maliyet veya sonuç türetmez.

## Oyuncu akışı

Üretim'de seçili maden için kendi il kaynakları ve ayrı onay gösterilir.
Mal veya kaynak değişince eski onay başka hedefe taşınmaz. Seçim ve iptal
komut üretmez; bekleyen komut tekrarı engellenir. Kabul sondajın başlamasıdır,
başarı değildir. Sonuçta eklenen değer stok değil rezervdir; başarısızlık
0 ek rezerv olarak bilinir, eski bilinmeyen geçmişle karıştırılmaz.

## Sahiplik ve kontrol

L1 core/kalıcılık/göç tek yazarı; B2 protokol+WS; B4 sondaj-panel.ts;
A6 sondaj-gorunum.ts/.css; A3 mulk-panel.ts; B6 hedefli kontroller; root
sözleşme/inceleme/devam/teslim. Kayıt yükleme ve mal indeks göçü, iş/olay
bağını doğrular; asıl sahibinin geçmişi yeni sahibine veya public kareye
sızmaz. İki odaklı senaryo ve son tip/derleme, gerekli somut hata düzeltmesi
dışında tekrar yok. Rutin tarayıcı, ekran veya geniş paket yok.

## Kabul sonucu

İki seçili S1 vakası ilk koşuda geçti (9 eski vaka atlandı). Gerçek iki iş,
ödeme/hak, doğal başarı/başarısızlık, eski kimliksiz olayla aynı RNG ve
ekonomi, pending yükleme/replay/içerik göçü; gerçek controller→WS frozen
onay/iptal/değişim/pending/ack ve 0–bilinmeyen ayrımı doğrulandı. Kök ve
istemci tip kontrolleri ile son derleme birer kez başarılı. Dünya gzip
395,8KB/400KB; gerçek DOM/tarayıcı kontrolü bu dilimde yapılmadı.
