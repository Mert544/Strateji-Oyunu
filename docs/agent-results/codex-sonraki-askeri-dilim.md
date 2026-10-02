# Sonraki dar askerî dilim — Ordu savunma gücü kararı

2 Ekim 2026. A6; kaynak okuması, uygulama/test/build/ağ yok.
Tam PvE kapsamını tekrarlamıyoruz: [D4 PvE sözleşme kaydı](codex-d4-pve-karari.md)
ve onun “Koordinatörün D4 kapanış yönü” bölümü sonraki baskın işinin temelidir.
Bu belge yalnız o iş kapanana kadar uygulanabilir tek ordu teslimini seçer.

## Kodla karşılaştırma ve sayısal boşluk

`askeri/savas.ts:48,221–245` hazır birliklerden ham gücü, ikmal/arazi/duruşu
ve en son ayrı rastgele sapmaları hesaplıyor. Bu **mevcut bölge savaşıdır**.
`SavasDurumu` saldıran/savunan bölge ve oyuncuya bağlı; ilçe NPC baskını değildir.
Kayıpları %30/%10 ve tür başına yukarı yuvarlama; yağma saldırana stok aktarır.
Bu çözümü bir NPC oyuncusuyla çağırmak PvE'yi doğru uygulamak sayılmaz.
`OrduPaneli.html():136–141` temel kuvvet/ikmal yüzdesi gösteriyor; arazi ve
duruşun sayısal kuvvet etkisini göstermiyor. Üretimdeki birlikler hazır güç değildir.

| PvE maddesi | Authority ve hâlâ eksik somut hesap |
|---|---|
| Boy/servet | Root eşik altında yok/üstünde boy≥1 yönünü kabul etti. Eşik/adımın güncel veri sürümü, ekonomik yapı değeri ve ilçe payda/sıfır pay davranışı tek uygulama sözleşmesinde kapanmalı. |
| Yağma/yapı | Sabit defter ve onarimBitis root yönüdür; AK %10 ile tarihsel 0a %25 karışması hâlâ güncel sayısal veri kararı gerektirir. Eski bölge kayıp tavanı bunun kalibrasyonu değildir. |
| Birlik kaybı/revir | PvE %15 aşağı yuvarlama yönü eski %30/%10 tavan yuvarlamadan farklı. Dönüş %40 yuvarlaması, geri gelişte kapasite, tekrar çalıştırma tekilliği kesinleştirilmeli. |
| Ganimet | Mal tablosu yönü belirli; katkı eşiği/payda, kamu/elenen pay, artık mili-birim ve ₺6500 tavanın hafta sınırı/hesabı eksik. Yeni musluk/kasa ödemesi authority kapsamı değildir. |
| Zaman/kalkan | TRT gün/dilim sırası, ilk günlük olayın kural dönemi başlangıcı ve kapatma sırasında açık baskının akıbeti eksik. 14 gün kalkan mevcut; 15–28. gün yumuşatmasının sayı/sınırı canlı PvE'ye uygulanmış değildir. |
| Uyku | sonEtkinlik ve uykuGun veri olarak var; uykuda askerî maaş/ikmal 0 ve uyanış çözümü yok. Baskına katılmama ile ekonomik uyku aynı teslim değildir. |

Tarihsel Ar-Ge onayı parametreleri yeniden değerlendirme girdisidir; güncel
root sözleşmesi ve kural sürümü olmadan çalışıyor/kalibre sayılmaz.
Kullanıcının devam yetkisi mevcut planı sürdürmeyi kapsar; bu rapor sayıları
sessizce değiştirmez. Rutin salt okuma teslimi için ayrıca kullanıcı izni gerekmez.

## Tek uygulanacak teslim: “Savunma gücüm neden değişiyor?”

Ordu ekranında hazır birlik gücü → ikmal etkisi → mevcut arazi/duruş etkisi
görünsün. Oyuncu mevcut savunma_emri ile duruşunu değiştirsin veya gerçek eksik
ikmal malına tedarik yönlendirmesini kullansın; bir sonraki özel kare kuvveti güncellesin.
Yeni baskın/ödül/takvim/komut yok; PvE açılışı ve toplu ilçe savunması diye sunulmaz.

**Tek hesap kaynağı:** K3 mevcut savaş formülünün sapma öncesi savunan hesap
bileşenini salt okuma yardımcıya çıkarır; savaş aynı yardımcıyı kullanır.
İşlem sırası korunur: arazi=etiketlerdeki mevcut en büyük çarpan (yoksa PPM);
carpan=floor(ikmalPpm×araziPpm/PPM), savunma duruşunda bunun üzerine mevcut
duruş çarpanı; güç=floor(hamGuc×carpan/PPM). Geri çekilmede 0.
Ham güce ayrı ayrı çarpan uygulayan istemci hesabı farklı yuvarlanabileceğinden yazılmaz.
PRNG çekilmez, sapma/zafer olasılığı veya gelecekteki baskın gücü tahmin edilmez.

**Minimum sözleşme önerisi:** yalnız sahibinin işletme `ozel.ordu` nesnesinde
isteğe bağlı `savunma?: {hamGuc,ikmalPpm,araziPpm,durusPpm,guc}` sayıları.
Kimlik/son çözüm zamanı zaten ilgili özel kare bağlamından okunur; alan yoksa
“kuvvet hesabı bekleniyor” kullanılır. Son alan mevcut seçili duruşun sapmasız
göstergesidir; hammadde sayısı, yabancı birlikler veya il toplamı taşımaz.
Bağdaştırıcı alanı aynen taşır; UI mevcut ham kuvvet satırıyla birleştirir.
Mevcut arazi/duruş parametreleri kullanılır; yeni değer, önkoşul veya güç bonusu yok.

## Sonraki iş sırası ve kabul

1. L1.2 rota checkpoint'i bitsin; K3 tek çekirdek sahibi hesap yardımcıyı ve
   eski savaşta eşdeğer çağrıyı uygulasın. PvE dalı/parametre verisi bu işte yazılmaz.
2. Protokol sahibi optional özel alan+şema; B2 ordu bağdaştırıcısı; istemci sahibi
   Ordu karar kartı ve mevcut duruş/tedarik eylemleri. Aynı dosyanın tek yazarı korunur.
3. Operasyon tek hedef kontrol: aynı birliklerde ikmal 1/yarım/0; normal/savunma/
   geri çekilme; farklı arazi ve yuvarlama sınırı. Gösterge çekirdeğin sapma öncesi
   hesabına eşit, okuma dünya/RNG özetini değiştirmiyor; eski savaş sonucu aynı.
   Gerçek duruş komutu özel kareyi güncelliyor, yabancıya alan gitmiyor.
4. Bu teslimin ardından root yukarıdaki PvE sayılarını **bir** uygulama brief'inde
   kapatıp deterministik duyuru→sonuç dilimini atar; yeni rapor dalgası gerekmez.
   Duruş kartının bitmesi PvE/AH kapısının geçtiği anlamına gelmez.

## S1 uygulama karar notu — kaynak okuma kabulü

- Etiket kaynağı: `kurulum.ts:131` harita bölgesinin etiketlerini dünyaya kopyalar;
  `mulk/isletme.ts:38` işletme düğümü bağlı merkezden devralır. Parsel eğimi,
  ilçe topoğrafyası veya oyuncunun Ordugâh hücresi okunmaz. Veri hattında dağ/
  ova/geçit oyun etiketleri elle, kıyı/liman türetme+düzeltmeyle gelir (`uret.ts:149`).
- Gerçek hiyerarşide Kocaeli/Sakarya'nın merkez bölgesi izmit, Bursa'nınki
  guney_marmara'dır; şehir merkezinin ölçülmüş arazisi iddia edilemez.
  Koordinatörün son UI kararı B4 tarafından uygulandı: **“Bölgesel savunma
  etkisi”**; detayda oyun bölgesinin arazi özelliklerinden geldiği, parsel
  ölçümü olmadığı açıklanır. Teknik kaynak bağlı merkezin etiketleridir.
- Yeni `savunmaGucuGorunumu` ve savaş çağrısı kaynakta incelendi: ilk tanımlı
  etiket+en büyük çarpan, birleşik ikmal→arazi→duruş yuvarlaması, son ham güç
  çarpımı ve saldıran→savunan RNG çekim sırası eski kodla aynı; fark bulunmadı.
- Geri çekilme hazır birlikleri silmez/taşımaz: mevcut savunma göstergesi ve
  savunan birlik kaybı 0; ikmal/maaş sürer, stok yağma koruması vermez.
  Doğru UI anlamı “Birlikler savunmaya katılmıyor”; tatil/tam muafiyet değildir.
- Kabul burada yalnız kod okuma/formül-dil uyumudur. B6 davranış/regresyon
  kontrolü ayrı; bu görevde test/build çalıştırılmadı, canlı PvE doğrulanmadı.
