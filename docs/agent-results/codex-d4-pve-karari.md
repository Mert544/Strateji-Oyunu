# D4 A6 — PvE için uygulanacak sonraki dilim

2 Ekim 2026. Sahip: A6; karar/entegrasyon: ana koordinatör.
Kanıt: AGENTS, D3 teslimi, çalışan çekirdek ve iki askerî belge okundu.
Bu kayıt önerilen uygulama sözleşmesidir; bayrak, ekonomi ve yetki değiştirilmedi.
Test/build/ağ çalıştırılmadı. Yazılan tek dosya bu kayıttır.

## Tek teslim

**PvE-0b: bayrağı varsayılan kapalı tutulan deterministik ilçe baskını**:
ön duyuru → pencere → savunma sonucu → sahip için kayıp/ganimet dökümü;
aynı durum kayıt/yeniden yükleme ve mevcut Ordu/İlçe ekranlarında okunur.
D3 birlik üretimi/duruş/inşa açık kalır; PvE bayrağı yalnız baskın yollarını yönetir.
Canlı açılış, AH1/AH2/AH4 + parsel H5 kanıtından sonra ayrı karardır.
Karakol/Kule/Nöbet Evi katkıları mevcut içerik/dondurulmuş kamu hücresinden okunur;
Nöbet Evi için kasa harcaması, yeni kamu yapısı inşası ya da mülk devri eklenmez.

## Root'un kod yazımından önce kapatacağı kararlar

| Konu | Bulgu ve uygulanması önerilen karar |
|---|---|
| D3 ile bayrak | 0a §5 tüm askerî işleri kapatıyor; çalışan `askeri/uretim.ts` ve D3 bunu geçersiz kıldı. PvE `etkin:false` birlik üretimini kapatmasın; mülk PvP yolu ayrı kapalı kalsın. |
| Boy sıfırı | 0a §4.1 eşik ₺250bin, adım ₺500bin, `floor(S/adim)` veriyor: eşik üstünde boy 0 mümkün. **Öneri:** eşik altında yok; üstünde `min(enCokBoy,max(1,floor(S/adim)))`. Root onayına kadar formül uygulanmaz. |
| Servet/ilçe payı | 0a §9.4 D3 öneri durumunda: hücre + tamamlanmış ekonomik yapı taban değeri; stok/hazine/birlik/askerî ek yapı hariç. İlçe payında tamamlanmış tesis + ek yapı yuvası ve sıfır payda davranışı açıkça onaylansın; eksik konumdan başka ilçe varsayılmasın. |
| Yapı etkisi | AK %10 yuva, güncel 0a %25 yazıyor. %25 tarihsel onaylı olsa da AH4/küçük işletme hedefi değişir. Root oranı seçsin. `aktif=false` kullanılmasın: mevcut `onarimBitis=max(eski,t+sure)` yolu yeterli; `ekonomi/uretim.ts:335` bunu okur. |
| Yağma penceresi | 0a S-7 açıkça **ilk yağmada başlayan sabit** 24 sa onaylıyor. Kayan 24 sa diye sunulmasın: 23:59 ve 24:01 sınırında iki pencere oranı bir kayan aralıkta toplanabilir. Bu dilimde sabit semantik korunsun; gerçek kayan garanti istenirse ayrıca liste şeması gerekir. |
| Ganimet ve kayıp | Mal tablosu/katkı yönü mevcut; küçük katkı payı, Nöbet Evi payının yanması, eşik altı payların yeniden dağıtılıp dağıtılmaması, yuvarlama artığı ve haftanın tanımı kesinleşmemiş. Root tek hesap örneğiyle kapatsın; para ödülü/PvP %60 aktarımı eklenmesin. Revir %40 geri dönüşün yuvarlama yöntemi ve kapasite doluyken dönüş davranışı da seçilsin. |
| Takvim ve geçiş | TRT UTC+3 sim günü, il başına 19–23 dört dilim, planlama +2 gün önerisi; anma günü/gerçek tarih istisnası eklenmesin. Bayrak açılışındaki ilk tik, tekrar yüklemede tekillik, açık baskında kapatma ve Kule etkisinin ne zaman kilitlendiği root kararıyla kayda bağlansın. |

Bu kararlar başka belgeye sessizce yeni ekonomik kural ekleme yetkisi değildir.
Önerilen kapatma sırası: bayrak → boy/servet → yapı/defter → paylaşım → takvim.

## Hangi sayılar kararlı, hangileri kalibrasyon değil?

- **Çalışan D3:** `parametreler.json:89` ikmal 250000 ppm; maaş 8000 mili/sa;
  genel kayıp tavanı 250000 ppm; savunma duruşu 1300000 ppm.
  Mülk kalkanı 14 gün (`mulk.yeniOyuncu.kalkanGun`); `korumaBitis` kayıtta var.
  Bunlar bu dilimde yeniden ayarlanmaz; oynanış dengesi kanıtı sayılmaz.
- **Tarihsel 0a kararı:** baskın gününden `beklemeGun=3`; günlük olasılık
  250000 ppm; servet adımı ₺500bin; yağma/yapı önerisi 250000 ppm.
  AK'nin eski 4 gün, 1/3, ₺250bin, %10 tabloları bunlarla karıştırılmaz.
  `79ea178` kalibrasyonu belgede atıftır; D3 tekstiliyle tekrar ölçülmedi.
- **Yönü belirli, güncel dengesi kanıtlanmamış:** boy gücü 100/tavan 8,
  24/36 sa duyuru, 15–28. gün %5 yağma, %15 birlik kaybı,
  %40/24 sa revir, boy başına 3 mühimmat + 2 yakıt, ₺6500 haftalık tavan.
  Boy ≥6 savunmanın maliyeti açık sorun; kamu sübvansiyonu eklenmez.

## Minimum durum ve API (kararlar kapandıktan sonra)

1. `askeri.eskiya?` strict/isteğe bağlı veri bloğu; yok/kapalı → yeni olay yok.
   Yeni dünyada kurulum, mevcut dünyada kural dönemi başlangıcı **bir kez**
   `eskiya_gunluk` planlar; aynı kuyruğa ikinci açılış tiki eklenmez.
2. `Dunya.baskinlar?: BaskinDurumu[]`: 0a §9.3 kimlik/il/ilçe/boy/güç,
   duyuru/başlangıç/bitiş ve evre alanları; planlanmış kayıt duyuru anına
   kadar telde görünmez. Bekleme için son gerçekleşen baskın zamanı, sonuçlardan
   türetilir; planlama tarihiyle sayılmaz. Bekleyen aynı ilçe yeniden planlanmaz.
3. Katılımcılar açılışta sahip+düğüm+birlik adedi+etkin güç olarak kilitlenir.
   `korumaBitis>d.zaman` hedef/servet/katkı dışı; uyku mevcut `sonEtkinlik`
   ve `hareketsizlik.uykuGun` ile okunur. Tatil modu kaydı yok; icat edilmez.
   Uykuda askerî ikmal/maaşın sıfırlanması açılış ve uyanışta lojistik çözümünü
   gerektirir; yalnız baskından dışlamak bu kabulün tamamı sayılmaz.
4. `BolgeDurumu.yagmaPenceresi?: {baslangic,kullanilanPpm}` ve tek
   `yagmaTavaniUygula(d,ctx,bi,oranPpm)`; mal düşüşü yalnız `stokEkle` yoluyla.
   İlçe payı/kalkan yumuşatması → kalan oran → mal başına tamsayı miktar.
   Kamu kasası/hazine ve `HucreDurumu.sahip` bu işlemden etkilenmez.
5. Sonuç: etkin iki güç, kazanma durumu, katılımcı başına birlik kaybı,
   mal kaybı/ganimeti ve tesis onarım bitişleri; yeniden hesaplayıp ödül verilmez.
   Geri dönecek birlikler+zaman sonuçta kaydedilir. **Ek olay önerisi:**
   `eskiya_toparlanma` (baskın kimliği); mevcut `parti_bitti`yi revir diye
   kullanma. Root bunu üç olaylık tarihsel kapsamın açık genişlemesi olarak seçsin.
6. Üç eskiya olayı + onaylanan toparlanma `motor`, kuyruk, serileştirici ve
   özet doğrulamasına birlikte girer. `askeri_rezerv` mevcut lojistik önceliğidir;
   yağma sigortası veya ayrı korunan stok yapılmaz.
7. Kare: genel baskın kimliği/ilçe/evre/zaman/tahmin/sonuç özeti;
   özel oyuncu karesinde yalnız sahibinin katılımı, mal kaybı, ganimet, revir.
   Duyuru öncesi gerçek boy/güç ve yabancı stok/birlik karesi gönderilmez.
   UI yeni oyuncu komutu açmaz; mevcut `savunma_emri` ile duruş değişir.
   Ordu'da nöbet kartı, İlçe'de duyuru/sonuç; defter sabit pencere diye yazılır.

## Kesin iş sırası ve kısa kabul

1. Root yukarıdaki kararları tek sözleşmede kaydeder; K3 tek çekirdek yazarı.
2. K3 veri/derleme/durum/serileştirme → kapalı bayrak ve eski kayıt uyumu.
3. K3 TRT planlama/duyuru/katılım → çözüm/defter/revir; istemci okuması PRNG çekmez.
4. Protokol sahibi özel/genel okuma; ardından istemci sahibi kartları bağlar.
5. Operasyon sahibi tek hedef senaryo: aynı tohum/günlük tek-parçalı zaman
   ilerlemede aynı özet; duyuru/bekleme sınırları ve eşik üstü boy ≥1;
   kalkanlı/uykulu hedef sıfır; iki yağmada sabit pencere tavanı ve sınır yenileme;
   kazanma/yenilgi/revir ortasında kayıt-yükleme aynı sonucu verir, ödül tek kez;
   tesis geri çalışır, parsel sahipliği/para korunur, yabancı özel veri görünmez.
6. Bu dar kabulden sonra AH ölçümü açılış kararı içindir; hedef test geçti diye
   tüm denge veya canlı PvE açılışı tamamlandı denmez.

## Kamu yetkisi — üç satır bulgu

- `mulk/kasa.ts:405,449`: ödenek rezerv/ödeme yardımcıları bakiye/bütçe sınırlar; çağıranın oyuncu veya makam yetkisini kontrol etmez.
- `komutSemasi.ts:59` sistem yolları katılım/ödül/marka; kamu proje/harcama komutu ve ilk yetkili proje kararı mevcut kodda yok.
- `sunucu.ts:486` doğrulanmış kimliği damgalar; mevcut sistem komutunu oyuncuya açmak yetki çözümü değildir. İlk proje için katalogdan kimlik seçen yetkili yol + kaydedilen proje/ödenek bağlantısı ayrı tasarlanmalıdır.

## Koordinatörün D4 kapanış yönü

D4'te PvE oynanışı açılmaz. Sonraki uygulamada bayrak yalnız baskın yollarını
kapsayacak, D3 ordu erişimi korunacak. Eşik üstü boyun en az 1 olması,
yapının `aktif` tercihini bozmadan `onarimBitis` kullanılması ve sabit pencerenin
kayan pencere diye sunulmaması kabul edildi. Ganimet/revir, servet paylaşımı
ve takvim geçişinin kalan sayısal sözleşmesi o uygulama başlamadan tek yerde
kapatılacak; mevcut oyuna bu değerler uygulanmış değildir.
