# M1–H1 — Bakım tercihi ve haritada gerçek tesis odağı

N1 `832064c` üstüne, 2 Ekim 2026. Mevcut altı uzmanla iki bağlı geliştirme.

## Karar ve kapsam

M1 hazır `bakim_duzeyi` komutunu oyuncunun kendi bütün işletmelerini kapsayan
bir kontrole bağlar. Sahibe özel `bakimDuzeyi?: 0 | 1 | 2` sanayi etkinse
sunucunun geçerli değerini (eski kayıtta normal=1) taşır. İstemci bilinmeyeni
normal saymaz. Komutta isteğe bağlı `oncekiDuzey`, geçerli değerle mutasyon
öncesi karşılaştırılır; eski çağrı geçerlidir. 0 kaybolmaz. Seçim yalnız
teklif açar, görülen önceki/hedef düzey dondurulmuş ayrı onayla gönderilir.
Sunucu yanıtı beklenir; tekrar gönderim, değişmiş teklif ve kaybolan bilgi
korunur. Vazgeç/Escape komut üretmez; klavye odağı korunur.

Mevcut bakım girdisi ve işletme gideri çarpanları, günlük aşınma ve kıtlık
kuralları değiştirilmez. Oyuncuya kapsam ve tercih açıklanır; yüksek bakım
anında onarım veya garanti üretim artışı değildir. Duran tesiste bakım
sürer, günlük aşınma/iyileşme işlenmez. Yeni peşin ücret yok.

H1 kendi tesis satırındaki Git eylemine gerçek tesis anahtarını ekler.
İlçe yüklenince güncel sahiplik ve ayak izi doğrulanıp yalnız o tesisin
hücre sınırlarına odaklanılır. Sayısal hücre adedi koordinat değildir.
Eski asenkron istek yeni seçimi ezmez; hedef bulunamazsa tesis odağı olduğu
iddia edilmeden ilçeye dönülür. Kendi gerçek `aktif === false` üretim
etiketi durdurulmuş olarak gösterilir; bilinmeyen/verimsiz tesis aynı
anlama gelmez. Eksik sokak varlıkları bu dalgada tekrar denenmez.

## Tek yazarlı görevler

- L1: çekirdek komut tipi/metadata/guard; özel kare ve protokol şeması.
- B2: istemci bağlantı arayüzü ve WS bakım komutu/mevcut değer köprüsü.
- B4: yeni bakım controller/görünüm ve kapsamlı CSS.
- A3: `mulk-panel.ts` bakım entegrasyonu, tesis Git kimliği.
- A6: `gorunum.ts`, `denetci.ts`, gerekiyorsa saf odak/etiket yardımcısı.
- B6: gerçek davranışa odaklı az sayıda kontrol, son tip/derleme.
- Root: kapsam/entegrasyon incelemesi, devam kaydı ve GitHub teslimi.

## Entegrasyon kararları

M1 sunucu kabulü sonrası istemci bakım düzeyini tahmin ederek yazmaz; güncel
tercih özel kareden gelir. Hedef düzey görülene kadar kalıcı kilit konmaz:
başka oturum farklı düzeye geçmiş olabilir. Bekleyen komut sırasında tekrar
engellenir; sonraki onay yine görülen düzey ve çekirdek korumasıyla çalışır.
İstemcinin interpolasyonlu simülasyon saati yeni kare kanıtı sayılmaz.

H1 gezinme sürümü yalnız hâlâ geçerli isteğin odağı uygulamasını sağlar;
iptal/küreye dönüş yollarında yükleniyor durumu da temizlenir. Durma etiketi
üretim çıktısı olan geçerli yönteme sahip tamamlanmış kendi tesiste gösterilir.

## Kabul sınırı

Bakım komutunun gerçek sonucu, 0/legacy/stale ret, sahiplik ve kayıt uyumu;
istemcinin onaysız komut üretmemesi, doğru tesis ayak izi ve geçersiz hedef
koruması incelenir. İlgili hedefli vakalar ve tip/derleme tek sahibinde
çalışır. Rutin tarayıcı, ekran ve önceki geniş test paketleri yok.

## Gerçek kabul sonucu

B6 tek vitest seçimiyle üç yeni M1/H1 vakayı çalıştırdı; ilk koşuda 3 geçti,
eski 26 vaka atlandı. Çekirdekte gerçek bakım tüketimi/komut/saf ret/özel kare
ve save/load/replay; istemcide controller→WS onay/0/pending/gerçek ack/ret,
farklı güncel tercih; haritada saf exact own ayak izi ve durma ayrımı kapsandı.
Kök/istemci tip kontrolü ve son build başarılı. Dünya gzip 392,7KB/400KB,
harita 513,7KB. Root kaynak incelemesi yapıldı; tarayıcı animasyonu/DOM
odağı sınanmadı, ekran alınmadı. Ayrıntı [devam kaydında](codex-devam-durumu.md).
