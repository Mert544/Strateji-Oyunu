# K2a — İlçe meclisine katılım temeli

2 Ekim root kararı; A6'nın günlük idari tıklama yerine başarılı komut
önerisi, B2'nin güvence/aidiyet bulgusu ve L1'in gerçek parsel kontrolü kabul edildi.
Ürün §7.6'daki son 7 günün 3'ünde etkinlik henüz kayıtlı değildir.
Bu dilim tek siyasi ilçe kaydı ve etkinlik kanıtını uygular; seçim, makam,
oy hakkı ve kamu kasası yetkisi vermez. Hesap güvence düzeyi de üretilmez.

## Kesin davranış

- Yeni komut `meclis_katil {ilce: string, oncekiIlce: string | null}`.
  Kimlik mevcut doğrulanmış oyuncu komut yolundan gelir. İlçe bilinen ve
  gerçek `mulk.hucreler` içinde oyuncunun en az bir parseli olan ilçe olmalı.
  İşletme düğümü, katılım ilçesi veya hücre sayısı özeti yetki değildir.
- Oyuncuda optional `meclis?: {ilce: string, kayitZamani: Ms, etkinGunler: number[]}`.
  Aynı anda tek kayıt. İlk kayıtta oncekiIlce null, taşınmada mevcut ilçe
  kimliği tam eşleşir; aynı ilçeye tekrar kayıt reddedilir. Taşınma mevcut
  etkinlik günlerini sıfırlar, yeni ilçenin o gününü kaydeder. Seçim henüz
  olmadığından taşınma bekleme süresi eklenmez; ileride seçmen dondurma ayrıdır.
- İlk kayıt ve sonraki başarılı, sistem dışı oyuncu komutları, kayıtlı ilçede
  gerçek parsel sahipliği varsa `floor(d.zaman / GUN)` gününü kaydeder.
  En fazla 7 artan, eşsiz gün; her yazmada gün < bugun-6 atılır. Aynı gün
  tekrarlar sayıyı artırmaz. Otomatik satış/saatlik olay, sistem komutu ve
  retler gün kazandırmaz. Gerçek saat kullanılmaz, eski günler türetilmez.
- Son parsel bırakılırsa eski üyelik ve geçmiş kalır fakat katılım koşulu
  sağlanmaz; o komut yeni gün kazandırmaz. Yeniden parsel edinilince son
  7 güne giren gerçek kayıtlar sayılabilir. Görünüm günü geçeni saf filtreler;
  görüntü almak/yüklemek durumu veya olay kuyruğunu değiştirmez.
- Son 7 gün bugun-6..bugun dahil; 24 saatlik simülasyon günleridir.
  3 gün + halen gerçek kayıtlı ilçe parseli = yalnız etkinlik koşulu sağlandı.
  Seçime uygunluk veya oy hakkı diye adlandırılmaz.

## Görünüm ve sahiplik

Core `meclisGorunumu(d, ic, oyuncu, ilce)` salt okuma; bilinen ilçe ve
mülk oyuncusu için döner. Protocol yalnız kendi `OyuncuKaresi.meclis?`
dizisinde ilçeye göre satır verir; genel ilçeye kişi/gün kaydı eklenmez.
Alanlar: `ilce`, `kayitliIlce?:string`, `kayitZamani?:number`,
`etkinGunSayisi:number` (0..7, kayıtlı ilçedeki gerçek geçmiş),
`gerekliGun:3`, `pencereGun:7`, `kayitliIlcedeArsa:boolean`,
`buIlcedeArsa:boolean`, `katilimKosulu:boolean`, `kayitUygun:boolean`,
`engel?:string`. `katilimKosulu` yalnız görüntülenen ilçe kayıtlı ilçeyse true.
`kayitUygun` bu ilçe farklı ve kendi gerçek parseli varsa true.

UI: İlçe panelinde tek hafif kart; kayıtlı ilçe, 3/7 etkinlik koşulu,
arsa durumu ve kayıt/taşıma eylemi. Taşınma öncesi ilerlemenin sıfırlanacağı
görünür. Kayıt yoksa seçim faal gibi sunulmaz. “Seçimler henüz açık değil”
bilgisi kısa ve net. Günlük ödül/ayrı yoklama butonu yok. Farklı ilçenin
ilerlemesi yerel ilerleme gibi sunulmaz. Bekleyen işlem kilidi, gerçek ack,
stale önceki ilçe ve panel değişimi koruması; özel hata mesajları taşınır.

## Dosya sahipleri ve kabul

- L1: packages/cekirdek (tek yazar), optional strict save/load/ref/day
  validation, index export ve deterministik başarılı komut kancası.
- B2: packages/protokol, baglanti.ts, baglanti-ws.ts, komut/kayit.ts.
- A3: ilce-yasam-panel.ts ve mulk-panel.ts entegrasyonu.
- B4: packages/istemci/src/harita/meclis-katilim.ts/.css saf kart;
  tek gerçek ekran betiği.
- A6: ürün şartnamesi/docs araştırma notu; veri parametresi eklenmez.
- B6: tek hedefli entegre test dosyası, kök/istemci tip ve son build.
- Root: sözleşme, entegrasyon incelemesi, devam kaydı ve commit/push.

Üç vaka: gerçek kayıt/taşıma/7 günlük sınır; yetkisiz/stale/tekrar retleri
ve gün kazandırmayan işlemler; aynı kural save/load/replay ve private wire.
Sonra tek gerçek tarayıcı kayıt eylemi ve ekran. Tam test matrisi yok.
