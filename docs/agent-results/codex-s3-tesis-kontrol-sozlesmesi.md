# S3 — Kendi üretim tesisini durdur / başlat

2 Ekim 2026. R1 `142bcc4` üstüne. Kullanıcı rutin ekran alınmasını istemedi;
bu dalgada tarayıcı/ekran senaryosu yok. Mevcut altı ajan yeniden kullanılır.

## Oyuncu kararı

İşletmem → Yapılar satırında kendi tamamlanmış üretim tesisini durdur veya
başlat. Mevcut `tesis_durum` çekirdek komutu kullanılır. Durunca üretim ve
üretim girdileri kesilir; bakım tüketimi devam eder. Mevcut ticaret emirleri,
arazi vergisi ve birlikler iptal edilmez. Başlatmak tedarik/onarım/verim
sorunlarını otomatik çözmez. Yeni ücret, ekonomi kuralı veya kalıcı durum yok.

UI kapsamı: canonical `t<safeID>`, gerçek sahipli işletme düğümü, boolean aktif
bilgisi, türün desteklediği bilinen mevcut yöntem ve pozitif çıktılı yöntem.
İnşaat, eksik veri ve üretim çıktısı olmayan yardımcı yapıda çalışmayan
kontrol sunulmaz. Ordugâhı durdurmanın orduları durdurduğu iddia edilmez.

## Güvenli eylem

Düğme sadece onay açar. Onay tesis adı/konumu/numarası, görülen aktif durum
ve açık hedef durumunu sabitler. Canlı kare veya başka sekme bu onayı sessizce
yeni işleme çevirmez. Varsayılan odak Vazgeç; bekleyen komutta yinelenen
onay ve Escape engellenir. Başarı yalnız gerçek komut kabulüyle gösterilir;
ret açıklanır, otomatik yeniden deneme yapılmaz. Odak mevcut çizim korumasına
bağlanır. Durum değiştirme kendi başına yöntem, stok veya satış emrini seçmez.

`tesis_durum.oncekiAktif?: boolean` geriye uyumlu korumadır. Varsa boolean
olmalı ve gerçek mevcut aktif durumuyla eşleşmeli; aksi durumda mutasyon
öncesi ret. Yoksa eski davranış korunur. Yeni istemci her zaman görülen
booleanı gönderir, false alanını yokluk saymaz. Hedef `aktif` açık boolean;
istemcide son veriden türetilmiş sessiz toggle yok.

## Sahiplik

- L1: çekirdek `tipler.ts`, `komutSemasi.ts`, `ekonomi/komut.ts` koruma.
- B2: protokol `komut-sema.ts`; istemci `baglanti.ts`, `baglanti-ws.ts`.
- A3: yeni `tesis-durum-panel.ts`, `mulk-panel.ts` denetleyici/entegrasyon.
- B4: yeni `tesis-durum-gorunum.ts`, `.css`; ekran betiği yazılmaz.
- A6: kısa davranış/Ar-Ge notu ve şartname.
- B6: tek hedefli gerçek durdur/başlat kontrolü; son tip/derleme.
- Root: sözleşme, inceleme, devam kaydı, commit/push.

## Kabul

Gerçek üretim tesisinde durma ve yeniden başlama çıktı/girdi akışlarına
uygulanır; bakım tüketimi ayrı kalır. Sahiplik ve eskimiş aktif bilgi reddi
aynı anda dünya/günlüğü değiştirmez. Legacy çağrı korunur. Değişen davranışa
uygun küçük hedefli kontrol ve tip/derleme dışında eski paketler, rutin
inceleme turları, tarayıcı veya ekran çekimi yok.

## Birleşik inceleme

A6 mevcut `tesis_durum` komutunun mülk arayüzünde eksik olduğunu ve bakımın
sürmesi sınırını doğruladı; L1 günlük aşınma/iyileşmenin de kapalı tesiste
ilerlemediğini ekledi. Root onarım/sondajın ek maliyet ve sonuç sözleşmesi
istediğini değerlendirip bu dar gerçek üretim kararını seçti. B4 saf görünüm
ile A3 denetleyici sözleşmesini doğrudan eşledi. Root kaynak incelemesinde
onay düğmesindeki klavye odağının canlı çizimde Vazgeç'e kaçmaması için
aynı etkin eylemin önce korunmasını istedi; A3 düzeltti. Test kurulumundaki
fırın çıktı kimliği, çalıştırmadan önce gerçek ekmek tarifiyle eşlendi.

İki hedefli gerçek senaryo ilk çalıştırmada geçti; kök ve istemci tip
kontrolleri başarılı. Son derleme sonucu devam kaydında tutulur. Rutin
tarayıcı, ekran, eski paket tekrarı yapılmadı.
