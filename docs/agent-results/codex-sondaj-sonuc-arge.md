# Sondaj sonucu — başlangıç Ar-Ge kaydı

2 Ekim 2026. O1 genel onarım tesliminden ayrı kaynak incelemesi; aşağıdaki
sonuç sözleşmesi o aşamadaki öneridir. Devamında
[S1 uygulama sözleşmesi](codex-s1-sondaj-sozlesmesi.md) ile kalıcı iş,
sonuç ve başlatma arayüzü geliştirildi. Aşağıdaki eksikler S1 öncesini
anlatır; güncel kabul sonucu [devam kaydında](codex-devam-durumu.md) tutulur.

## Mevcut davranış ve gerçek eksik

- `packages/cekirdek/src/sanayi/komut.ts:150` içindeki `arama_sondaji`, gerçek
  kendi düğümünde ham mal ve mevcut damar ister; tarımsal rezervi dışlar.
  Düğüm×mal için iki hak vardır. Hak başlatmada harcanır; aynı mal için
  birden fazla bekleyen sondajı engelleyen ayrı kural yoktur.
- `packages/veri/icerik/parametreler.json:222`: bedel 8.000 TL ve 20 parça,
  temel süre 24 oyun saati; mevcut erken oyun süre hızlandırması uygulanır.
  Başarı olasılığı %40, ek rezerv tamamlanma anındaki `rezervIlk` değerinin
  %30–60'ıdır. Yeni denge değeri önerilmez.
- `packages/cekirdek/src/sanayi/damar.ts:20` sonuçtan bağımsız iki RNG çekimi
  yapar. Başarıda başlangıç ve kalan rezerv aynı kesin miktarda artar;
  başarısızlıkta ayrı sonuç kaydı yazılmaz.
- `packages/cekirdek/src/tipler.ts:764` olay yalnız düğüm ve mal indislerini
  taşır. Kuyruk, kullanılan haklar ve rezervler kaydedilebilir; ayrı iş kimliği,
  sahibi ve kalıcı başarı/başarısızlık görünümü yoktur. R1 rezerv farkından
  sonuç çıkarılamaz: üretim aynı sırada rezerv tüketebilir.

## Önerilen en küçük sözleşme ve iş sırası

1. Core sahibi, kararlı iş kimliğiyle isteğe bağlı bekleyen/sonuç kaydı ekler:
   sahip, düğüm/mal kimliği, başlama/bitiş oyun zamanı, ödenen bedel,
   kullanılan hak; bitince başarı/başarısızlık ve kesin ek rezerv miktarı.
   Başarısızlığın miktarı sıfırdır; bilinmeyen geçmişle aynı durum değildir.
   Aynı maldaki iki işi ayırır; yeni hak veya başarı garantisi vermez.
2. Yeni olay işi kimliğiyle bulur; düğüm/sahip bağlantısı doğrulanır. Mevcut iki
   RNG çekimi, sırası ve rezerv hesabı korunur. Sonuç yalnız gerçek sahibin
   görünümüne çıkar; yabancı rezerv veya hak listesi yayımlanmaz.
3. Save/load/replay ve içerik-indis göçü iş/olay bağını birlikte taşır. Eski
   kimliksiz bekleyen olayların mevcut sonucu ve RNG yolu korunur; geçmiş
   bitmiş işlere sonuç uydurulmaz. Kayıt saklama sınırı ve eski bekleyen işi
   görünür kayda dönüştürme yöntemi ayrı root kararıdır.
4. Sonuç görünümü hazır olunca başlatma UI'ı eklenir: sunucunun bedel/hak
   teklifini ayrı onayla, değişmiş teklif için yeniden inceleme iste;
   tamamlanma zamanı mevcut hızlandırma semantiğine göre sunucudan gelsin.

Kabul: aynı tohum/günlük aynı rezerv ve RNG sırasını verir; bekleyen iki iş
save/load sonrası karışmaz; başarısızlık açık sonuç olur; hak/para/mal tek
kez harcanır. Bu kabul kontrolleri burada çalıştırılmadı.
