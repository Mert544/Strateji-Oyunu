# T1–T2: araştırma ve gerçek tesis yöntemi

2 Ekim. [Root sözleşmesi](codex-t1-t2-teknoloji-sozlesmesi.md) uygulanacak
akışı/iki guard'ı belirler; bu not kaynak incelemesidir, test/build veya
oynanış ölçümü değildir. Kabul kaydı root'un [devam kaydındadır](codex-devam-durumu.md).

**Eşleme.** `packages/veri/icerik/icerik.json` teknoloji/yöntem/tür
tanımları ve `ekonomi/komut.ts` gerçek yöntemi belirler. Dört yöntem
teknolojisi toplam beş tarife geçişi açar; türün yöntem listesi ile
`gerekliTeknoloji` kesişimi kendi gerçek tamamlanmış tesislerle eşlenir.
Aynı türün diğer yöntemleri varsa karşılaştırma tesisteki **gerçek mevcut
yöntemden** yapılır; aşağıdaki varsayılan çiftler oyuncunun yöntemi diye tahmin edilmez.

**Ham içerik tarifeleri — S ölçek, tam kapasite; mal birimi/saat.**
Bakım ayrı satırdır; girdi içindeki parça ile aynı tüketim değildir.

| Teknoloji / kendi tesis türü | Mevcut → açılan yöntem | Saatlik girdiler | Saatlik çıktılar | Bakım: parça/sa |
|---|---|---|---|---|
| `mekanize_tarim` / `ciftlik` | `geleneksel_tarim` → `mekanize_tarim` | Yok → yakıt 20 + parça 4 + elektrik 8 | Tahıl 200 → 320 | 0,5 → 1,5 |
| `derin_madencilik` / `cevher_madeni` | `yuzey_cevher` → `derin_cevher` | Elektrik 5 → yakıt 12 + elektrik 15 | Cevher 100 → 190 | 1 → 1,5 |
| `derin_madencilik` / `komur_ocagi` | `yuzey_komur` → `derin_komur` | Elektrik 5 → yakıt 10 + elektrik 12 | Kömür 90 → 170 | 1 → 1,5 |
| `elektrik_ark_ocagi` / `celikhane` | `yuksek_firin` → `elektrik_ark` | Cevher 100 + kömür 50 + elektrik 25 → cevher 60 + yakıt 20 + elektrik 50 | Çelik 60 → 63 | 1,5 → 1,5 |
| `otomasyon` / `parca_fabrikasi` | `standart_parca` → `otomatik_hat` | Çelik 40 + yakıt 10 + elektrik 12 → çelik 40 + yakıt 10 + elektronik 3 + elektrik 20 | Parça 40 → 50 | 1 → 1 |

Tarifelerin JSON miktarları mili-birimdir; tablo tam mal birimine çevrilmiştir.
Ham bakım tablosu gerçekleşmiş tüketim değildir: canonical
`mulk.bakim.yontemParcaPpm.yuzey_cevher=200000` yüzey cevher bakımını
ayrıca 0,2 parça/sa'ya çarpar (`ekonomi/uretim.ts`). Ölçek/bakım düzeyi,
verim, stok, tarım/rezerv ve şebeke kuralları gerçek sonucu değiştirir.
Yakıt önce stoktan, açık şebekeden gelir; elektrik tüketimi şebeke/öz üretim
kurallarıyla çözülür. Tarife artışı gerçek üretim/kâr veya ücret avantajı değildir;
işçi nominal farkı T1'de gösterilmez. Yeni girdi stoğu adoption önkoşulu olmaz.

**Diğer üç teknoloji.** `sulama_sistemi` yeni `sulama_kanali` inşasını,
`mekanize_ordu` Ordugâhtaki zırhlı birlik üretimini açar; yöntem değildir.
`konteyner_limani` deniz kenarı geliştirme kararını açar fakat mülkte
kamu uçları oyuncuya inşaat yetkisi vermez; bağlı olmayan seçenek hazır gösterilmez.

**Dar karar akışı.** Araştırma kartından gerçek tesis anahtarıyla mevcut
Yapılar seçicisi açılır/odaklanır; seçenek ve onay mevcut akışta kalır.
T2 `arastir.maliyetMili?` güncel core maliyetine, `yontem_degistir.oncekiYontem?`
gerçek yönteme mutasyon öncesi eşleşir. Eski çağrılar alan yokken aynıdır;
süre guard'ı veya otomatik yeniden gönderim yoktur. Canlı güncelleme görülen
bedeli/başlangıç yöntemini sessizce değiştirmez. Yeni veri dengesi,
tarife, wire teklif dizisi veya kalıcı durum eklenmez.

## Sonraki üretim dilimi — en fazla üç öneri

**Gerçek bağlı zincirler.** İçerikte balıkçılık yakıt 15 + elektrik 5 →
balık 100/sa; `balikcilik` liman etiketiyle kurulabilir ve NPC Pazar kanalı
vardır. Mera koyun yöntemi yün/gübre üretir; `hafif_sanayi` yün eğirme,
kumaş dokuma ve konfeksiyon yöntemlerini destekler. Yün→iplik→kumaş→hazır
giyim, üretim panelinin içerikten doğruladığı yol ve mevcut yöntem seçicisinde
gerçekten bağlıdır (`icerik.json`, `parametreler.json`, `uretim-agi-panel.ts`,
`yontem-panel.ts`); tesisler/siluetler vardır. Tek tekstil tesisi aynı anda
üç aşamayı çalıştırmaz. İl etiketi/rezerv denetimi işletmeden veya bağlı
merkezden gelir (`mulk/komut.ts:yapiPlani`); parsel kıyısı/jeolojisi ölçümü değildir.

1. **U1 uygulaması hazır: Üretim kartından kendi tesisinde yöntem seçicisine geçiş.**
   Yöntem kartındaki “Kendi tesislerimde” ayrıntısı gerçek kendi tesislerini
   türün desteklediği yöntemlerle eşler; bilgi bekleniyor, tesis yok, inşaat,
   bilinmeyen mevcut yöntem ve zaten kullanım ayrıdır. Gerçek “Tesis #ID”
   etiketi aynı ilçedeki tesisleri ayırır. Uygun tamamlanmış tesiste düğme
   mevcut seçiciyi açıp odaklar; yöntem seçmez, onay açmaz veya komut göndermez.
   Oyuncunun yöntem seçimi, mevcut onayı ve T2 `oncekiYontem` koruması sürer;
   stok yokluğu geçişi engellemez, kilitli araştırma yöntemi incelenebilir.
   Koyun yöntemi `mera_koyun_yun`, tekstil yöntemleri `yun_egirme`,
   `kumas_dokuma`, `konfeksiyon`dur. Tek tesis aynı anda tek yöntem çalıştırır;
   bu geçiş zincirin bütün aşamalarını birlikte çalıştırmaz. Yeni ekonomi,
   tarife veya komut yoktur. Uygulama A3 tarafından READY bildirildi;
   birleşik kullanım/doğrulama kanıtı root'un devam kaydındadır.
2. **R1 uygulaması hazır: kendi işletmesinin kayıtlı maden rezervi.** Üretim
   kartındaki “Kaydedilmiş kalan rezerv”, tarım dışı tesis türünün
   `gerekliRezerv` malı için kendi özel karedeki `rezervKalan` değerini gerçek
   il adıyla işletme başına gösterir: cevher, kömür, bakır, silis, petrol.
   Bilgi bekleniyor, bilinen işletme yok, satır verisi eksik ve gerçek sıfır
   ayrıdır. Depo stoğundan ayrıdır; son üretim muhasebesinin kaydıdır, anlık
   projeksiyon veya kare zamanına ait rezerv ölçümü değildir. Kalan süre,
   yüzde veya bütün işletmelerin toplamı hesaplanmaz. Sıfır rezerv otomatik
   üretim durması sayılmaz; mevcut sanayi verim tabanı korunur. Tahıl,
   balık ve yün maden değildir. `isletmeAl` merkez başlangıç rezervini her
   işletmeye bağımsız kopyalar: ortak il/ilçe/parsel damarı veya gerçek jeoloji
   değildir. Mevcut harita eşlemesinde Gebze/Körfez silis, Gemlik kömür
   rezervlidir; gerçek kalan ve olağan inşa koşulları kurulabilirliği belirler.
   [R1 sözleşmesi](codex-r1-rezerv-sozlesmesi.md) uygulanmıştır; A3/B2/B4
   READY bildirdi. Bu not ekran ölçümü değildir; kabul kanıtı root'un devam
   kaydında tutulur. Yeni ekonomi, çekirdek kuralı veya wire alanı yoktur.
3. **Zonguldak/Kilimli pilotu erişilebilir gerçek veriden sonra.** Kilimli'nin
   OSM sınırı var; oynanabilir ızgara manifesti yalnız Gemlik/Gebze/Körfez.
   İl sınırı, yürüyüşteki dosya adı veya Batı Karadeniz merkez kömürü oynanabilir
   Kilimli demek değildir. Eksikler nüfus/uygun arsa ızgarası ve gerçek karo
   varlıklarıdır (`codex-devam-durumu.md`, `odbl/izgara/manifest.json`). Bunlar
   sağlanınca tek ilçe mevcut kömür→çelik/parça ağını açabilir; ortak rezerv
   davranışı ayrı göç/ekonomi sözleşmesidir. Hazır olmadığı için ilk tercih değil.

Bu sıra seçim/güvence2 hattını genişletmez; kaynak incelemesidir,
oynanış veya kapasite/denge ölçümü yapılmadı.
