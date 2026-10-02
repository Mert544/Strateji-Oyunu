# N1 — Üretim, kamu ve ordudan doğru ilde tedarike

2 Ekim 2026. S3 `95b3bef` üstüne. Altı uzman kalan işleri koddan değerlendirdi;
ortak Ar-Ge sıralaması ayrı belgede. Bu dalga mevcut mal/il deposu kararlarını
bağlar; yeni ekonomi, komut, protokol veya kalıcı durum yok.

## Uygulanan kapsam

1. Üretim yöntem kartının kendi tesisleri ayrıntısında incelenen **hedef
   yöntemin** pozitif, depolanabilir girdisini gerçek tesisin il işletmesine
   tedarik et. Geçerli tamamlanmış kendi tesis/tür/yöntem üyeliği yeniden
   doğrulanır. Tek yöntemli tesiste de tedarik anlamlıdır. Elektrik ve stokla
   ikame edilmeyen şebeke girdileri için ithalat düğmesi yok. Yakıt istisnası
   gerçek kaynağın stok öncelikli yakıt desteği biliniyorsa uygulanır.
2. Açık K1 kamu siparişinde kendi eşleşen teslim kaynağının bir paket için
   stoğu eksikse ilandaki mal ve gerçek il işletmesiyle Tedarik açılır.
   Eksik/kapalı/uyuşmayan ilan, bilinmeyen kaynak veya bekleyen işlemde düğme
   çalışmaz. Tıklamada ilçe, ilan, mal ve kaynak yeniden denetlenir.
3. Ordu eğitiminde gereken teknoloji için doğru araştırma kartına; geçerli
   seçilmiş adet için eksik depolanabilir maliyet malında aynı il işletmesinin
   Tedarik paneline geçilir. Güncel birlik/tür/teknoloji/mal/own kaynak bilgisi
   yeniden doğrulanır. Kapasite veya diğer engeller çözülmüş gibi sunulmaz.

Her geçiş yalnız panel ve seçim açar. İthalat oranı/emri, asker eğitimi,
araştırma ve kamu teslimi ayrı oyuncu eylemleri kalır. İthalat ücretli ve zaman
alan mevcut akıştır; tedarik edilen malın sipariş yetiştirme garantisi yok.
Taslaklar korunur, başka depoya sessiz geri dönüş veya otomatik komut yok.

Mevcut `TedarikPaneli.ac({mal,bolge})` her iki kimliği doğrular ve boolean
döner; yeni bir yönlendirme motoru yazılmaz. Başarıda sekme ve oran alanı
odağı açılır, başarısızlıkta kullanıcıya güncel kaynağı incelemesi söylenir.
Görülen eylem canlı yeniden çizimde başka hedefe dönüşmemelidir. Kaynak
bilgileri yalnız sunucunun kendi işletme/ordu/teslim görünümlerinden alınır.

## Sahipler

- A3: `uretim-agi-panel.ts`, `mulk-panel.ts`; bütün root yönlendirmeleri.
- B2: `ordu-panel.ts` ve gerekiyorsa ilgili CSS; eğitim engeli eylemleri.
- B4: `kamu-siparis.ts`, `ilce-yasam-panel.ts`, gerekirse ilgili CSS.
- L1: paralel salt okuma hazine taşması/defter bulgusunun kanıtını netleştirir;
  bu N1 kapsamına ekonomi değişikliği eklemez.
- A6: ortak kalan işler Ar-Ge kaydı ve ana plana güncel bağlantı.
- B6: yeni yönlendirmeler için küçük hedefli kontrol; istemci tip/derleme.
- Root: kapsam, birleşik inceleme, devam kaydı ve GitHub teslimi.

## Kabul

Doğru kendi depo ve mal eşleşir; yönlendirme komut göndermez. Artık mevcut
olmayan kaynak, yanlış yöntem girdisi, geçersiz asker adedi veya kapalı ilan
başka depoya yönlendirilmez. Elektrik ithalata sunulmaz. Mevcut onay/fiyat/
sıra korumaları değişmez. Tek küçük hedefli kontrol ve istemci derlemesi;
rutin tarayıcı, ekran görüntüsü ve önceki test paketleri yok.

## Gerçek kontrol sonucu

İki hedefli N1 vaka geçti (ilk koşudaki iki test verisi sorunu düzeltilerek
yalnız aynı seçim tekrarlandı); önceki 12 vaka atlandı. İstemci tip kontrolü
ve derleme birer kez başarılı. Dünya gzip 392,4KB/400KB, harita 510,9KB.
Root kaynak entegrasyonunu inceledi. Tarayıcı/DOM etkileşim doğrulaması veya
ekran çekimi yapılmadı. Ayrıntı [devam kaydında](codex-devam-durumu.md).
