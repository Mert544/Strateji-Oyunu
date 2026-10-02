# Ekonomi ve pazar: oyuncuya yeni kararlar

2 Ekim 2026. Bu çalışma kaynak incelemesidir; kod, test, hesap veya yük koşusu yapılmadı. S/M/L göreli uygulama kapsamıdır; süre ya da başarı garantisi değildir. Öneriler uygulama kararı bekler, mevcut ekonomi ayarını değiştirmez.

## Kaynaktan doğrulanan durum

Yerel müşteri havuzu nüfus, takvim ve bayramla belirleniyor; `yerelTalep` fiyat almıyor (`packages/cekirdek/src/perakende/yerelPazar.ts:392`). Fiyatın etkisi yok demek yanlış: `fiyatKaresi` ve `yuvaAgirligi` dükkânların çekimini değiştiriyor (:117–127). Sorun toplam talep değil, mevcut fiyat bandında yüksek kademenin baskın kalabilmesi. `docs/arastirma/alfa1-talep-esnekligi.md` §3–4, yalnız toplam talep esnekliği eklemenin veya kasa kapasitesini değiştirmenin az rakipli pazarı çözmediğini anlatıyor. Bunlar tarihsel kâğıt sonuçlarıdır; yeni ölçüm sayılmaz.

İthal edip perakendede satmak yasak bir para açığı olarak belgelenmemiş; meşru ticaret, fakat üretim ve yerel satış göstergelerini karıştırabiliyor (`alfa0-ekonomi-izleme.md:78–84`). Aynı belgedeki kazanç rakamları farklı tarihsel varsayımlara dayanıyor; güncel oyuncu kârı diye aktarılmamalı. `pazar/fiyat.ts:61,96,105` makas, liman, ofis ve komisyon kırılımlarını gerçekten uyguluyor. Sabit ihracat katsayısı bütün oyuncular için doğru değildir.

Raf uygunluğu oyuncunun bütün işletme ağındaki stok, üretim ve gelen akışa bakıyor (`mulk/perakende.ts:61–67`). Pazar emrinin çıkış düğümü yerel olsa da ihracat da bütün ağdan beslenebiliyor (`pazar/piyasa.ts:98–104`). Bu yüzden tek il stoğunu kesin satış sınırı olarak kullanmak doğru olmaz.

## 1. Malın kullanımını görünür kıl: üretime ayır veya sat

**Oyuncu kararı ve karşılığı:** Çiftlikten çıkan tahılı doğrudan gelire çevirmekle değirmen/fırına geçmek arasında bilinçli seçim yapar. Mal satırında üretim, tesis girdisi, rafta gerçekleşen satış ve aktif ihracat oranını birlikte görür; ihracatı azaltabilir veya durdurabilir. Böylece yapı zinciri ekonomik bir tercih olur.

**Mevcut/eksik:** Kullanım öncelikleri ve karşılanma oranları `ekonomi/uretim.ts:526–552` içinde var. Tesis girdisi ihracattan önce karşılanır; “Pazar satışı her zaman fabrikayı aç bırakır” iddiası doğru değildir. Eksik olan bu ilişkinin oyuncuya açıklanmasıdır. Raf satışı ve ihracatın gerçekleşen oranları da mevcut (:602–604).

**En küçük dilim — S:** Seçili mal için aktif Pazar emrini ve ağ stoğu açıklamasını göster; mevcut emir üzerinden “Pazar satışını durdur” eylemi sun. Ayrıntılı karşılanma dökümü protokol genişlemesi gerektirirse M'ye ayrılır. Yeni stok rezervi veya otomatik ekonomi kuralı eklenmez.

**Risk:** Anlık üretimi kalıcı fazla sanmak, mevsim ve lojistik değişiminde yanlış yönlendirir. “Güvenle satılabilir” garantisi yerine mevcut oran ve güncelleme zamanı gösterilmeli. Üretim lideriyle stok, bakım ve zincir paneli kapsamı ortaklaştırıldı.

## 2. Fiyat seçimine satış ve marj karşılaştırması ekle

**Oyuncu kararı ve karşılığı:** Daha çok müşteri isteyen uygun fiyatı, sınırlı stok veya güçlü yerel konum için yüksek marjı seçer. Fiyat düğmesinin anlamı sadece büyük rakam değildir.

**Mevcut/eksik:** Kademeler, fiyat değişimi sınırı ve çekim paylaşımı var; rekabet yoğunluğunu açıklayan karşılaştırma eksik. Üst kademenin baskınlığını çözmek için eski not, isteğe bağlı çekim üssü öneriyor; mevcut kod yalnız kareyi kullanıyor.

**En küçük dilim — S, mekanik devamı M:** Önce mevcut kademe, gerçekleşen miktar, dükkân gideri ve gerçek ihracat fırsat maliyetini göster. Kaynak yoksa kesin kâr yazma. Sonraki ayrı kural dönemi diliminde varsayılanı mevcut davranışı koruyan çekim üssü eklenebilir; doğrudan güçlü bir değer seçilmez.

**Risk:** Az rakipli ilçede yüksek fiyatın üstünlüğü sürebilir. Daha güçlü rekabet yeni oyuncuyu da sıkıştırabilir. Toplam talep esnekliğini veya fiyat tavanını birlikte değiştirmek hangi kararın neyi etkilediğini belirsizleştirir.

## 3. İthal ticaret ile üretim getirisini ayır

**Oyuncu kararı ve karşılığı:** Eksik malı ithal ederek rafı açık tutmakla kendi üretimine yatırım yapmak arasında toplam gideri görerek karar verir. Ticaret yolu oyunda kalır; üretim başarısı ayrı okunur.

**Mevcut/eksik:** İthalat defteri ve raf satış sayaçları var; raf satışının ithal kökeni kesin ayrışmıyor. Karışık stok, aktarım ve işleme nedeniyle ithalat miktarını aynı dönemin satışına eşitlemek kesin kaynak kanıtı değildir.

**En küçük dilim — S/M:** Oyuncuya aynı dönemin ithalat gideri, yerel satış geliri ve üretim çıktısını yan yana göster; kaynak payı varsa “tahmini” etiketle. Kesin kaynak muhasebesi L olabilir ve ayrı tasarlanmalıdır.

**Risk:** Tahmini etikete dayanarak fiyat cezası uygulamak yanlış üreticiyi cezalandırır. Belgelerdeki ithal raf tavanı, güvenilir köken muhasebesi kurulmadan devreye alınmamalı.

## 4. Geç gelen oyuncuya pazar nişi göster

**Oyuncu kararı ve karşılığı:** Yerleşeceği ilçeyi veya ikinci üretimini karşılanmayan mal talebine göre seçer; erken oyuncunun kurduğu ağı kopyalamak zorunda kalmaz.

**Mevcut/eksik:** Yerel talep ve gerçekleşen satışlar var; henüz dükkân olmayan ilçeler mevcut geçici talep haritasında bulunmayabilir. Yurt, hibe, ilk yapı indirimi ve ayrılmış arsalar zaten mevcut (`parametreler.json:221–234`); yeni yetişme hibesi önerilmiyor.

**En küçük dilim — M:** Üç ilçede anonim, mal bazlı talep/karşılanma panosu; dükkânsız ilçede de mevcut içerikten talep gösterimi. Özel oyuncu stokları açıklanmaz.

**Risk:** Görünen nişe herkes girince talep paylaşılır; pano gelir vaadi vermemeli. İlerleme lideriyle bu ayrım paylaşıldı. Sosyal kamu hedeflerinin gerçek siparişe dönüşmesi ayrı bütçe kararıdır: kasa ödeneği ve ithalat paritesi tavanı korunmalı; mevcut oyuncu ödeme sınırı hesap başına değil toplam kasa sınırıdır.

Önerilen ilk teslim 1'dir; 2'nin görünürlük dilimi ardından gelir. Yeni fiyat mekaniği ve kesin stok kökeni daha sonra ayrı kararlarla ele alınır.
