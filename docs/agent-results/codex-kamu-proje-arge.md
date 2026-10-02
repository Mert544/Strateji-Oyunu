# İlk kamu dilimi: ilçe gıda siparişine tedarik

**Güncel durum:** Bu Ar-Ge önerisinin ilk tedarik dilimi K1'de uygulandı;
[kesin fiyat/rezerv/teslim sözleşmesi](codex-k1-kamu-sozlesmesi.md) ve
[kabul kaydı](codex-devam-durumu.md) günceldir. Aşağıdaki ilk inceleme
makam/yetki ile sistem siparişini ayıran kararın gerekçesidir.

**İlk öneri.** Sistem ilçe kasasından tek gıda talebi açar; oyuncu “stoğumu kamuya mı, üretim/ticarete mi ayırayım?” kararını alır. Politik yönetim hazır değildir; proje önceliğini oyuncunun seçmesi ayrı makam/yetki dilimini gerektirir.

**Mevcut / taslak ayrımı.**
- `packages/cekirdek/src/mulk/kasa.ts:384–494`: alıcı/rezerv/iptal/ödeme/fiyat tavanı çalışır; oyuncuya ödeme kasadan transfer, NPC ödemesi `kamuNpc` lavabosudur. Rezervler toplamdır; projeye özel sahiplik yoktur.
- Mevcut korumalar: tek alım kullanılabilir bakiyenin %40'ını, haftalık kullanım 28 günlük girişin %25'ini, oyuncu ödemesi/rezervi aynı girişin %50'sini aşamaz. Bu sayılar değişmeden kullanılmalı.
- `tipler.ts:1115` makamları yalnız kasa açıklamasında taşır; görev sahibi/seçmen/dönem/proje yok. `komutSemasi.ts` ve `protokol/src/komut-sema.ts` kamu komutu sunmaz. Kasa kimliği yetki değildir.
- `docs/16-cok-katmanli-gelistirme-plani.md`, Dalga 3, makam/yetki sözleşmesini proje kararının önüne koyar. `docs/arastirma/kamu-ve-kamu-arazileri.md §2.1` katalog, takvim, meclis ve gıda tetikleyicilerini önerir; çalışan seçim/ilan motoru değildir.
- `mulk/perakende.ts:23–87` hane talebini ve kayıtlı dükkân satış payını bilir; toplam halk tüketimini veya yedi günlük açlık geçmişini ölçmez. “Gıda payı %80 altında → otomatik yardım” mevcut veriyle gerekçelendirilemez.

**En dar uygulama sırası.**
1. Root katalog/fiyat/takvim/yerel teslim sözleşmesini kapatır. Sistem güvenilir çekirdek olayıyla talep açar; oyuncuya sistem komutu/keyfî ödeme/kasa seçimi açılmaz. Ödeneksiz ilan yok; yeni kasa geliri/hibe yok.
2. Optional durum: ilçe/sipariş kimliği, mal, paket miktarı, fiyat sözleşmesi, vade, kalan miktar, **siparişe ait kalan rezerv**, teslim/ödeme toplamı, durum. Tek açık sipariş; mili-birimli güvenli tamsayılar. Sipariş defteri başka siparişin rezervinin harcanmasını engeller.
3. Öneri `kamu_teslim {siparis, bolge}`: oyuncunun aynı ilçedeki kendi stoğundan katalog paketi. Çekirdek stok zamanını uzlaştırır; sahiplik/stok/süre/fiyat tavanını doğrular; **atomik** stok tüketimi + rezerv azaltımı + kasa→oyuncu transferi yapar. Eksikte kısmi işlem yok; bitişte kullanılmamış rezerv çözülür. Uzak taşıma/ithalat taklit edilmez.
4. İşletmem → İlçe → kasa altında kart: hedef/teslim/kalan gıda, ödenek/harcama/süre; tedarikçiye kendi stoku ve bedeli. Halk etkisi **“kamu dağıtımına teslim edilen X birim gıda”** kaydıdır; mutluluk/nüfus/verim/karşılama bonusu değildir. Başkalarının stokları veya hane talebi/satış payıyla birleşik sonuç gösterilmez.

**Makamlı devam.** İlçe→İlçe Başkanı→dönem kaydı ve çekirdek yetki kontrolünden sonra “siparişi aç / bütçeyi koru” kararı gelir. Muhtar/Vali yetkisi ve seçim sayıları yorumlardan türetilmez. Sistem talebi + oyuncu tedariki makam olmadan oynanabilir.

**Root kararları.** Paket/ilan ömrü/açılma koşulu/yerel teslim sınırı; canlı `kamuFiyatGecerli` tavanıyla ilan fiyatının teslimde bağdaşması. Sabit fiyat, piyasa düşüşünde ithal-al/kamuya-sat marjını tek başına engellemez; sözleşme kapanmadan fiyat dondurulmaz.

**Kapsam / kabul.** Makamsız dilim yaklaşık **16 ürün dosyası**: veri tipi/şema/doğrulama/parametre (4), çekirdek tip/komut/motor/serileştirme/yeni kamu modülü (5), protokol kare/komut şeması (2), sunucu özet (1), istemci kare/bağlantı/ilçe kartı/komut kaydı (4); test dosyaları ayrıca. Kabul: ödeneksiz ilan yok; yetkisiz stok kullanımı ve tekrarlı teslim reddedilir; teslim miktarı kadar stok eksilir; oyuncu artışı=kasa çıkışı; kapanan rezerv serbest; save/load/replay aynı defteri verir; mevcut kasalar ve perakende davranışı korunur.

**İlk dilime alınmayan gerçek alternatif.** `lojistik/cozum.ts:400` kenar geliştirme ve `ekonomi/insaat.ts:74` kapasite artışı çalışır; fakat oyuncu uç sahipliği mülkün kamu merkezine yetki sağlamaz. Mevcut 400 çelik + 100 parça + 20 bin TL, taban fiyatla yaklaşık 86 bin TL'dir; küçük ilçe kasasına uygun ilk proje diye ucuzlatılmaz. Kamu arsası hakkı/ihale, AI karar ajanı ve kamu savunma bonusu da bu dilimin dışında kalır.
