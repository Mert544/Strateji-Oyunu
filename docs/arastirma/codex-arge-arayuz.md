# Codex Ar-Ge: arayüz, harita ve bilgi tasarımı

2 Ekim 2026 · T-L · Kaynak incelemesine dayanan ürün önerileri. Kod, test ve kurulum yapılmadı; oyuncu gözlemi veya tarayıcı ölçümü yok. İnceleme yeni `pazar-panel.ts` dahil mevcut çalışma ağacını esas alır. S/M/L, mevcut sözleşmelerle uygulama büyüklüğüdür: S tek yüzey; M birkaç istemci yüzeyi; L yeni sunucu/protokol davranışı. Süre taahhüdü değildir.

Öncelik, mevcut Kâğıt ve Çini kimliğini koruyarak oyuncunun gördüğü bilgiden yapacağı işe geçmesini kolaylaştırmak. [Arayüz araştırması](arayuz-ux.md) §2 eyleme dönük Dikkat ve sakin harita öneriyor; [dönüş araştırması](donus-deneyimi.md) Dİ-6/Dİ-8 her satırın ilgili yere götürmesini ve aynı bilginin açılış dışında erişilmesini istiyor. Bunlar tasarım hedefleri; aşağıda uygulanan ve eksik kalan parçalar ayrılıyor. İlk 5/15/60 dakika anlatısı ve Defter sırası ayrı araştırma sahiplerinde.

## 1. Dikkat maddesinden ilgili raf veya yapıya geçiş

**Zor karar:** “Dükkânım boşta; hangi dükkânı açıp neyi düzenlemeliyim?” Birden çok aynı tür yapı olduğunda ilçeye gitmek problemi çözmeye yetmiyor. Üretimde de düşük verim görülüyor, fakat oyuncu gerçek sebebi henüz bilmiyor.

**Kodda var:** `mulk-panel.ts::mulkDikkatMaddeleri` en çok beş maddelik görünümün girdisini topluyor; biten dükkânda kimlikli `rafaGit` bağlantısı var. `dukkan-html.ts::dukkanDikkatMaddeleri` boş raf, biten stok, dolu kasa ve kampanya durumlarını ayırıyor. **Eksik:** bu ikinci listenin kayıtları dükkân kimliği taşımıyor; çoğu madde yalnız `gitDugmesi(ilce)` ile ilçeye götürüyor. Düşük `verimPpm` ayrıca doğrudan “girdi eksik” diye sunuluyor; mevcut işletme yapı görünümü kesin darboğaz sebebi taşımıyor.

**Önerilen akış:** Dikkat → “Rafı düzenle” → ilgili dükkânın mevcut raf ekranı. Tesis için Dikkat → “Haritada göster” → ilgili ilçeyi açıp aynı yapıyı vurgulama; mevcut Arazi/Sahiplik merceği korunur. `denetci.ts` bugün yalnız bu iki merceği kuruyor; sekiz yeni katman ilk dilimin gereği değil. Sebep doğrulanamıyorsa “Verim düşük · %N” gösterilir; belirli malı satın alma önerisi verilmez.

**En küçük dilim — S:** boş raf ve stoksuz raf kayıtlarına mevcut dükkân kimliği ile `dukkan-rafa` hedefi eklemek. **Devamı — M:** `IsletmeYapisi.anahtar` ve haritadaki `YapiKaydi.hucreler` üzerinden yapıya odaklanmak. `gorunum.ts::yapilariCiz` zaten yapı kimlikli etiketler üretir; kimliğe hedeflenen genel Dikkat geçişi ayrıca bağlanmalıdır. Risk: eski bildirimde yapı silinmiş olabilir; o durumda listeye dönülür. Başarı işareti, oyuncunun doğru rafı yeniden aramadan açabilmesi.

## 2. Ağ stoğu, emrin çıkış yeri ve raf ihtiyacını birlikte okumak

**Zor karar:** “Tahılı Pazar'a mı vereyim, işleyeyim mi, rafım için mi tutayım?” Toplam stok ve saatlik miktarlar farklı kapsamlarla yan yana duruyor; malın mevcut olması satışın karşılandığı anlamına gelmiyor.

**Kodda var:** `baglanti-ws.ts::isletme` malları toplam olarak topluyor, yeni `PazarKaynagi` ise il/işletme düğümü bazında stok, üretim ve emir taşıyor. `mulk-panel.ts::mulkMalPaneli` gerçekleşen saatlik satışı gösteriyor. `dukkan-panel.ts::adaylar` toplam stok kullanıyor; bu tek başına hata değildir: `cekirdek/src/mulk/perakende.ts::malVarMi` ağdaki stok, üretim veya gelen akışı değerlendiriyor. **İhracat da ağdan beslenir:** `cekirdek/src/pazar/piyasa.ts:99–105` bunu açıkça uygular. Pazar'daki il, emrin/çıkışın konumudur; yalnız o ilin deposu değildir. **Eksik:** yeni `pazar-panel.ts::neden/gonder` yerel sıfır stoğa göre açılışı veya pozitif emri engellerken ağ uygunluğunu hesaba katmıyor. Bu, mevcut çekirdek kuralıyla uyumlandırılması gereken istemci davranışıdır.

**Önerilen akış:** Mal → tahıl ayrıntısı → “Ağındaki toplam stok” → illere göre mevcut emir/çıkış yeri → “Bu malı satan raflar” → ilgili raf. Gebze ile Körfez aynı Kocaeli işletme düğümünü paylaşır; Gemlik Bursa düğümüdür. Her ilçeyi ayrı depo gibi sunmak mevcut kurala aykırı olur.

**En küçük dilim — S:** ağ/yerel depo/emir yeri etiketlerini açıklamak, açılış engelini ağ bilgisiyle uyumlandırmak ve aktif Pazar emirleriyle ilgili rafları bağlamak. **Devamı — M:** mevcut yöntem girdileri ve gerçekleşen karşılama bilgisini göstermek; tahminler ayrıca işaretlenir. Otomatik satış oranı veya stok rezervasyonu eklenmez. Risk: ağda mal bulunması, lojistiğin talebi tamamen karşılayacağı garantisi değildir; emir, satış isteği ve gerçekleşen satış ayrı kalır. Ekonomi ve ilk saat sahipleri ağ kuralını teyit etti. Başarı işareti, oyuncunun emrin konumu ile malın beslenme ağını ayırabilmesi.

## 3. “Sen yokken”den bugünkü işe devam

**Zor karar:** “Geçmişte işler tamamlandı; şimdi hangi ekrandan devam edeceğim?” Özet doğru bilgi veriyor, fakat hazır dükkân satırındaki Git ilçeye götürüyor; raf düzenlemeye ulaşmak tekrar arama gerektiriyor.

**Kodda var:** `donus-ekrani.ts::donusSatirlari` net, üretim ve önem sıralı tamamlanan işleri sekiz satıra sığdırıyor. `donusAc` kapanınca özeti okundu işaretliyor. **Eksik:** Git yalnız ilçe hedefi; `protokol/src/donus.ts` öneri sözleşmesi bulunsa da `sunucu/src/donus/ozet.ts` bugün `oneri: null` üretiyor. Araştırmadaki kalıcı “kaldığın yer” yüzünün tümü uygulanmış sayılmaz.

**Önerilen akış:** Sen yokken → Devam → İşletmem'de ayrı “Şimdi” satırı → güncel Dikkat veya mevcut Defter kartı. Geçmişte tamamlanan iş ile güncel problem birleştirilmez; geçmiş özet güncel arıza teşhisi yapmaz.

**En küçük dilim — S:** özet kapandıktan sonra mevcut Dikkat'e isteğe bağlı geçiş sunmak. **Devamı — M:** biten dükkânın hâlâ mevcut olduğu doğrulanınca güncel Rafa git bağlantısı göstermek. Kimlik geçmiş özette bulunmadığından aynı ilçedeki iki dükkân arasında tahmin yapılmaz. Risk: dünyadaki durum girişten sonra değişebilir; hedef tekrar doğrulanır. Yeni öneri motoru, ödül veya giriş baskısı yok. Başarı işareti, dönen oyuncunun güncel işi tek bağlantıyla bulması.

Önerilen sıra: önce Pazar'ın ağ uygunluğu ve açıklığı, sonra Dikkat'te raf bağlantıları, ardından dönüşten güncel işe geçiş. Ortak bağımlılıklar ilk saat, ekonomi ve ilerleme sahiplerine iletildi; nihai öncelik koordinatörün sentezindedir.
