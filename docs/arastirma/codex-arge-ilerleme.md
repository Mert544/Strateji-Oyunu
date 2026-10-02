# Ar-Ge: 7–30. gün oyuncu ilerlemesi

2 Ekim 2026; A-L. Yalnız depo kodu ve belgeleri okundu; dış araştırma, insan oturumu, simülasyon veya test yapılmadı. Aşağıdakiler uygulanmış özellikler veya doğrulanmış motivasyon sonuçları değildir. S/M/L göreli uygulama tahminidir. Gün örnekleri zorunlu takvim ve seviye kapısı değil, farklı olgunlukta oyuncu durumlarıdır.

## Bugünkü taban ve ürün sorunu

Üretim yöntemini değiştirme, S/M/L tesis yatırımı, arazi satın alma, saatlik ticaret emri, raf ve fiyat seçimi kodda vardır. Mülk ölçeği teknoloji kilidi aramaz; araştırma kodu ise tek eşzamanlı araştırma yürütür. Eski belgelerdeki iki araştırma yuvası ve dışlayan büyük teknoloji ağacı mevcut uygulama sayılmaz [1][2]. Dükkân ölçeğinde ayrıca içerik yalnız S'yi açar [3].

Defter ilk başarıları ve tek seferlik ödülleri işler; dönüş özeti para, üretim ve biten işleri anlatır, önerisi `null` döner [4][5]. Bu, ilk zincirlerden sonra oyuncunun kendi amacı, alternatif yatırım tercihi ve kararının sonucu arasında kalıcı bağ kurulduğunu göstermiyor. Aranan ilerleme **gözle → amaç seç → sınırlı sermayeyi ayır → sonucu anla → amacı değiştir** döngüsüdür. Daha çok yapı kurmak tek başına ilerleme ölçüsü değildir.

## 1. Oyuncunun seçtiği yatırım hedefi — P1, S/M

**Sorun:** İlk satıştan sonra kalan Defter adımları oyuncunun kendi stratejisi yerine tamamlanacak listeye dönüşebilir. Eski başlangıç araştırması portföyle uzmanlaşmayı öneriyordu; eksik dilim, bunu oyuncunun durumuna bağlayan uygulanabilir kişisel projedir [6].

**Karar döngüsü:** Oyuncu mevcut işletmesinde bir sonuç seçer; mevcut durumla kıyaslar, bir sonraki yatırımını buna ayırır, koşullar değişince projeyi değiştirir. Sınıf, XP, beceri puanı ve ödül yoktur. Aynı anda tek proje yeterlidir; oyuncu hiç seçmeden oynayabilir.

**Örnekler:** 1. gün “Başlangıç gıdası bitince de rafım satış yapsın.” 7. gün “İthal un yerine kendi değirmenimden un sağlayayım mı?” 30. gün “Mevcut ekmek işini büyüteyim mi, ikinci ilçede farklı bir işe sermaye ayırayım mı?” Bunlar günle açılmaz; aynı seçenek yeni oyuncuda da ekonomik şartlarıyla görünür.

**Minimum dilim:** Yeni proje sistemi yerine mevcut Defter'de tek seçili hedefi sabitle; gerçek engeli ve mevcut eyleme bağlantıyı göster. Yalnız ekmek işi için iki amaç ve “şimdilik seçme”. İlk sürüm ayrı hedef şeması kurmaz; ziyaretler arasında hatırlama gerekirse profil tercihi ayrıca tasarlanır. Dünya özeti ve ekonomik kurallar değişmez. Otomatik komut, son teslim tarihi ve sürekli görev yenileme yoktur.

**Bağ ve risk:** İlk saat sahibinin amaç seçimi aynı veri sözleşmesini kullanmalı. Yeni öneri motoru yerine mevcut çiftlik/dükkân/raflardan başlanır. “Tamamlandı” etiketi yalnız emir kabulünden çıkmaz. Sahte hedef üretme ve görev angaryasına dönüşme riski vardır; oyuncu amacı serbestçe bırakabilir. İlk görüşmede kendi seçiminin nedenini anlatabilmesi, butona basma sayısından daha anlamlı araştırma sorusudur.

## 2. İki yatırım arasında gerçek tercih — P1, M; ayrıntılı tahmin L

**Sorun:** Çok sayıda yöntem veya ölçek bulunması, oyuncunun sermayesiyle hangi fedakârlığı yaptığını bilmesi anlamına gelmez. Nominal üretim artışı, girdi veya talep sınırlıyken net kazancı artırmayabilir.

**Karar döngüsü:** Oyuncu iki seçeneği karşılaştırır; harcama, gerekli hücre/mal, girdiye bağımlılık ve mevcut satış sınırını görür; birini uygular veya parayı korur. Üçüncü “bekle” seçeneği meşrudur.

**Örnekler:** 1. gün gerçek stok/girdi karşılanmasını görerek ihracat oranı seçmek. 7. gün değirmen yatırımı veya ithal unla devam. 30. gün mevcut tesisi büyütmek veya başka zincire yatırım. Çözücü nüfus/bakım/üretim girdisini öncelikle korur; satış her zaman zinciri aç bırakır denmez. İhracat tüm işletme ağına erişir.

**Minimum dilim:** Yalnız bir mevcut zincirde “ithalatla devam / değirmen kur” kartı. Bugünkü fiyat ve oranlar, peşin bedel, elde kalacak para, girdi ihtiyacı ve gerçekleşmiş satış ayrı gösterilir. İlk sürüm kesin gelecek kâr veya garantili geri ödeme yazmaz; dünya klonuyla uzun senaryo oynatmaz. Son işlem mevcut komuta gider, normal maliyet/ret kuralları geçerlidir.

**Bağ ve risk:** Mevcut yöntem, stok, ticaret ve ölçek altyapısı kullanılabilir [1][2]. E5 çıkarıcısı satış sayacını henüz değerlendirmiyor [7]; geri ödeme rakamı eklemeden bu tanım tamamlanmalı. İhracattan vazgeçilen gelir ve gerçek ilçe/düğüm çarpanı dikkate alınır. Yanlış kesinlik en büyük risktir. Piyasa veya başka oyuncu davranışı değiştiğinde eski tahmin geçerliliğini kaybeder; kaynak zamanı açık görünür.

## 3. Kendi kararının sonucunu öğrenme — P2, M

**Sorun:** “Sen yokken +para” işletmenin büyüdüğünü gösterir ama oyuncunun son seçiminin işe yarayıp yaramadığını açıklamaz. Daha fazla kazanmak hibe, kit tüketimi veya piyasa değişimiyle de oluşabilir.

**Karar döngüsü:** Oyuncu uyguladığı yatırımın önceki durumunu hatırlar, gerçekleşen sonucu görür, sürdürme veya yön değiştirme kararı verir. Günlük giriş gerektirmez; rapor ancak anlamlı sonuç oluştuğunda sunulur.

**Örnekler:** 1. gün satış emrinin gelir üretmesiyle emir kabulünü ayırmak. 7. gün değirmen sonrası un ithalatının gerçekten düşüp düşmediğini görmek. 30. gün ikinci yatırımın satışa mı, atıl kapasiteye mi dönüştüğünü anlayıp portföyü yeniden değerlendirmek.

**Minimum dilim:** Oyuncunun seçtiği tek yatırım için önce/sonra üretim, ithalat ve satış olgusu; zaman aralığı ve “piyasa da değişti” notu. Nedensellik veya tasarruf iddiası yalnız ölçülebiliyorsa kurulur. Geçmiş sonuçla güncel sorun ayrı gösterilir; T-L'nin dönüşte “Şimdi” alanı önerisiyle birleşebilir. Profil kaydı, mevcut dönüş çapasını ve sahibine ait sayaçları kullanır [5][7]. Ekonomi hesabının paydası ve stok tüketimi yanlışsa başarı hikâyesi yanıltır; bu nedenle yatırım projesinden sonra gelir.

## Öncelik ve sonraki ufuk

İlk aday **stok/karşılanma görünümü→oyuncunun satış oranı seçimi**. Garantili stok tamponu eşik olayı ve ağdaki emir paylaşımı ister: M, sonraki dilim. Defter seçili hedefi hatırlatır. Kamu siparişi v0 mevcut Alfa-0 P0 sonundadır (`docs/12` §8); ihale/imece sonradır. Askeri PvE ve il rekabeti önemli eğlence ayağıdır [8]; mülk uygulaması/yayın takvimi ayrı değerlendirilir. Geniş savaş sistemi bu raporda önerilmez. Öneriler nihai ürün kararı değildir.

## Kaynaklar

1. `packages/cekirdek/src/sanayi/komut.ts` (`tesis_olcek_yukselt`, mülk teknolojisizliği), `ekonomi/komut.ts` (`yontem_degistir`, `ticaret_emri`).
2. `packages/cekirdek/src/teknoloji.ts` (`teknolojiKomutu`, tek araştırma, yayılım).
3. `packages/veri/icerik/parametreler.json` (`mulk.perakende.acikOlcekler`).
4. `packages/protokol/src/defter.ts`, `packages/istemci/src/harita/defter.ts`, `packages/cekirdek/src/odul.ts`.
5. `packages/sunucu/src/donus/ozet.ts:144`, `packages/istemci/src/harita/donus-ekrani.ts`.
6. `docs/arastirma/baslangic-ve-ustalik.md`; `docs/11-urun-donusu.md` §7 ve son ek.
7. `packages/olcum/src/insan-ekonomi.ts:370`, `packages/cekirdek/src/tipler.ts` (`RafYuvasi.satis`); `docs/arastirma/uc-ilce-pilot-davet.md` §3.
8. `docs/arastirma/oyun-tasarim-belgesi-v1.md` §3D; `docs/11-urun-donusu.md` son ek.
