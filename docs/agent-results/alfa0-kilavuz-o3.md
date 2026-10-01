# alfa0-kilavuz: operatör kılavuzu (O3)

Dal `takim/o3/alfa0-kilavuz`, taban `takim/o3/alfa0-yedek` (32af184). Yeni dosya `docs/alfa0-isletim.md` (tek sayfa, 49 satır) ve sunucu README'sindeki yedek paragrafında kılavuza bağlantı.

İçerik: kurulum, davetli ekleme, test dünyası silme, yedek ve geri dönüş, ölümcül durumda ne yapılır, kural dönemi göçü, hızlı başvuru tablosu. Komutlar kopyalanmadı; her madde README'deki bölüme, kontrol listesi adımına ya da KIMLIK.md'ye bağlanır.

Doğrulama: kılavuzdaki 20 göreli bağlantının dosyaları ve başlık bağlantıları (GitHub biçimli) betikle denetlendi, kırık bağlantı 0. Bilgiler README ve provada gerçek çıktılarla doğrulanmış davranışlardan alındı (fail-stop, `/saglik` 503, yetişme, yedek döndürme, geri yükleme, boş/bozuk davet listesi reddi, test dünyası silme). Tek sayfa sınırı için ayrıntı bilerek bağlantıya bırakıldı.

Not: kılavuz Docker komut biçimlerine (`$D ...`) dayanır; Docker daemon olmadığından o biçimler ilk gerçek makinede ilk kez denenecek (README'de de işaretli).
