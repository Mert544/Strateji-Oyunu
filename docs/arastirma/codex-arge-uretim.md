# Üretim, teknoloji ve lojistik: uygulanabilir oyun döngüleri

**2 Ekim 2026 · K-L · kaynak incelemesi; uygulama ve ölçüm yapılmadı.** S: mevcut sözleşmelerle dar istemci dilimi; M: birkaç katmanda sınırlı sözleşme/akış değişimi; L: kalıcı durum, zamanlı olay ve ekonomi güvenliği birlikte. Bunlar göreli kapsam tahminidir, takvim taahhüdü değildir.

## Mevcut zemin ve gerçek boşluk

Ekmek, cam/pencere, yöntem değiştirme, ölçek büyütme, araştırma, bakım ve otomatik lojistik kodda mevcut. `icerik.json:151–168` değirmenin un yanında kepek ürettiğini, ahırın `kepek_gubresi` ve `sut_kepekli` yöntemlerini içerdiğini gösteriyor. Eski üretim ağı raporundaki “kepeği ekle” önerisi tamamlanmamış yeni iş sayılamaz; içerikte bulunmak tam oyuncu deneyimi kanıtı da değildir.

Mülk ölçeği teknoloji kilidi taşımıyor (`sanayi/komut.ts:80`); araştırma ayrı yöntem seçeneklerini açıyor. Aynı oyuncunun illerdeki işletmeleri zaten otomatik taşıma ağına bağlı (`lojistik/akis.ts`). İhracat emri çıkış düğümünde veriliyor, fakat oyuncunun **bütün işletme ağından** mal çekebiliyor (`pazar/piyasa.ts:100`). Dolayısıyla yeni manuel sevk sistemi gerekli başlangıç işi değildir.

## 1. “Depoda tut mu, sat mı?” üretim stratejisi

**Karar:** Oyuncu tahılı doğrudan satmak, değirmende işlemek veya ununu ekmek hattına saklamak arasında seçim yapar. Camı satmakla pencere hattını beslemek aynı karar ailesidir. Böylece tarım, sanayi ve satış birbirine bağlanır; bir sonraki yapı sadece daha büyük rakam değildir.

**Alfa-0 en küçük teslim — S/M:** Malda brüt üretim yanında gerçek net stok eğilimi ve mevcut tüketiciler gösterilir; oyuncu mevcut satış oranını değiştirir veya durdurur. Yeni otomatik davranış yok. `mulk-panel`, `pazar-panel`, `baglanti-ws` ve gerekirse sahibine özel `protokol/kare` tüketim/akış kırılımı yeterlidir. Net oran mevcut stok formülünden okunabilir; bütün tüketim nedenlerini güvenilir ayırmak ek protokol alanı gerektirebilir. Ekonomi liderinin marj kartıyla aynı veri kullanılır, ayrı hesap motoru yazılmaz.

**Sonraki gerçek yeni mekanik — M:** Oyuncu mal başına “iki saatlik üretim tamponu tut” politikası seçebilir. Ancak mevcut çözücü zaten nüfus, bakım, tesis girdisi ve satış katmanlarını önceliklendiriyor (`ekonomi/uretim.ts:481–602`); öneri mevcut korumayı yeniden eklemek değildir. Ağ genelindeki gelecek üretim tamponunu oyuncunun seçmesi yenidir. `tipler`, `stok/motor`, `pazar/piyasa`, protokol ve istemciye dokunur. Tembel stok eşik olayları, birden fazla ihracat emrinin ortak bütçesi ve henüz ulaşmamış taşımanın stok sayılmaması çözülmeden kesin güvence verilemez. Alfa-0 görsel dilimine bu mekanik sessizce eklenmemeli.

## 2. “Parçayı ithal et, üret veya onarımı ertele” ikinci gün kararı

**Karar:** Çiftlik ve fırın aşınırken oyuncu parça ithalatıyla üretimi korumak, çelikten parça üretimine yatırım yapmak veya nakdi başka zincire ayırmak arasında seçim yapar. Tarım ve gıda işi makine sanayisine müşteri olur; ticaret yedek tedarik kanalıdır.

**Mevcut:** Aşınma, `bakim_duzeyi`, parça tüketimi ve `genel_onarim` çekirdekte var; komut panelinde formları da bulunuyor. Mülk bağlantısında bu kararları yapıdan başlatan bağlamlı akış eksik. Yeni bakım modeli veya ilk gün muafiyeti önermiyorum.

**En küçük teslim — M, Alfa-0:** Dikkat/yapı satırında mevcut aşınma ve yaklaşık parça ihtiyacı; aynı işletme düğümünde ithalat formuna veya mevcut genel onarıma geçiş. İlk dilim otomatik ithalat açmaz; miktar ve maliyet oyuncu tarafından onaylanır. `harita/baglanti*`, bakım paneli, özel kare ve mevcut komut eşlemesi yeterli olabilir. Onarım bütün düğümdeki aşınmış tesisleri kapsadığı için tek yapı onarımı gibi sunulamaz. Risk, giderleri küçük gösterip kalıcı ithalat açtırmak; bakımın kendi geri ödemesini garanti etmemek gerekir. Ekonomi lideri maliyet yorumunu, ilerleme lideri yatırım karşılaştırmasını sahiplenir.

## 3. Yöntemden araştırmaya, araştırmadan üretim kararına

**Karar:** Çiftlikte daha çok tahıl için makineli tarım seçeneğine yönelen oyuncu araştırma bedelini ve yakıt/parça ihtiyacını değerlendirir; sonraki ziyarette mevcut tesiste yöntemini değiştirir. Üretim artışı, ekmek hattının hammaddesi veya satış kanalıyla anlam kazanır.

**En küçük teslim — S/M, Alfa-0 sonrası yakın dilim:** Kilitli yöntem kartından yalnız ilgili teknolojiye geçiş, mevcut araştırmanın süresi ve tamamlandığında yöntem seçicisine dönüş. `yontem-panel/secici`, `baglanti-ws` ve mevcut `arastir` komutu/kare bilgisi kullanılır. `teknoloji.ts` tek eşzamanlı araştırma, önkoşul ve yayılım indirimini zaten yönetiyor. Büyük teknoloji ağacı, yeni beceri puanı veya ölçeği araştırmaya bağlama yok.

**Risk:** Yayılım ve erken oyun süreleri nedeniyle sabit katalog bedeli kesin fiyat değildir; sunucu davranışıyla uyumlu tutar gösterilmeli. Daha çok çıktı net kâr değildir: işçi, parça, enerji ve satılabilen miktar ayrıca görünür. Ar-Ge liderinin sonuç/proje kartına tek teknoloji hedefi olarak bağlanabilir.

## 4. Ürettiğini ilçeye teslim et: bütçeli kamu siparişi v0

**Karar:** Oyuncu ekmeği dükkânda sürekli satmak yerine sınırlı kamu alımına ayırır; yapı malzemesinde cam/pencere hattı aynı modeli kullanabilir. Hedef gerçek stok teslimidir, yalnız görev işareti değildir.

**Aşama:** `docs/12-yon-taslagi.md:80` bunu Defter P0 ardından Alfa-0 sırasına koyuyor. Sonraki Alfa-0 dilimi için ürün kararıyla değerlendirilmeli; mevcut davet akışına zorunlu kapsam artışı sayılmamalı.

**En küçük teslim — M/L:** Tek mal, sabit fiyat, sınırlı miktar, tek teslim; ilan öncesi ödenek rezervi. `mulk/kasa` alıcı/rezerv/ödeme kancaları mevcut, `siparis_al` ve `siparis_teslim` yok. Yeni sipariş kaydı, atomik stok düşümü ve ödeme, sona ermede rezerv çözme; çekirdek durum/komut/serileştirme, protokol, sunucu ve pano gerektirir. Kamu oyuncu payı tavanı kişi başına değil toplam pencere girişine uygulanır. İthal edip kamuya satarak para yaratılmaması için ithalat paritesi korunmalı. Sosyal liderin çok üreticili küçük lot/imece önerisi bu temel üzerine ikinci dilimdir; ihale ve oyuncular arası emanet sözleşmesi ayrı kalır.

**Önerilen başlangıç:** İlk stok kararının görünürlüğü, ardından bakım tedarik akışı. Tampon politikası ve sipariş daha güçlü yeni mekaniklerdir; kalıcı ekonomi etkileri nedeniyle bağımsız teslim olarak ele alınmalı.
