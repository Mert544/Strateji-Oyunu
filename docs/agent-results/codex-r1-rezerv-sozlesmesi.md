# R1 — Kendi işletmesinin kayıtlı maden rezervi

2 Ekim 2026. U1 `6a1ee0d` üstüne, mevcut altı ajan yeniden kullanılır.

## Karar

Üretim seçili mal kartının gerçek işletme özetine ayrı rezerv bölümü eklenir.
Kapsam mevcut içerikte tarım dışı tesis türlerinin `gerekliRezerv` malıdır:
cevher, kömür, bakır, silis, petrol. Sabit mal listesi yerine
`!tur.tarimTesisi && tur.gerekliRezerv === seciliMalIndeksi` kullanılır.

Kaynak yalnız sahibinin gerçek işletme düğümlerinin mevcut özel karesindeki
`rezervKalan` dizisidir. Merkez/public rezervinden istemcide kopyalanmaz.
İşletme başına il adı ve miktar gösterilir; bütün kaynakları belirsiz bir
toplamda birleştirme veya kalan süre/yüzde hesabı yapılmaz. Tesis kurulmamış
olsa da alınmış kendi işletme düğümünün gerçek rezervi gösterilebilir.

Bridge sözleşmesi: `IsletmeDurumu.rezervler?: Array<{bolge:string, il:string,
rezervKalan?: Array<[mal:string,miktarMili:number]>}>`. Alan yoksa henüz
bilinmiyor; [] bilinen işletme yok. Kaynak satırında eksik/bozuk/boyutu uymayan
mal dizisi bilinmiyor, 0 gerçek sıfırdır. Bütün tutarlar güvenli negatif
olmayan tamsayı olmalıdır. Eksik özel veri kaynak satırını gizlemez.

Başlık **Kaydedilmiş kalan rezerv**. Açıklama: son üretim hesabındaki değer,
ildeki kendi işletmesine ait, depo stoğundan ayrı. Çekirdek işletmeye merkez
başlangıç rezervinin bağımsız kopyasını verdiğinden ortak il/ilçe/parsel damarı
veya gerçek jeoloji iddiası yok. Kayıt `uretimT0`'a kadar işlenmiştir; o an
wire'da yoktur. Kare zamanı rezerv muhasebe zamanı diye gösterilmez, istemcide
anlık projeksiyon yapılmaz. Rezerv sıfırken sanayi verim tabanı üretime izin
verir: otomatik kapanma/üretim durması söylenmez. Tahıl/balık/yün maden sayılmaz.
Yeni çekirdek kuralı, wire alanı, kalıcı durum veya ekonomi ayarı yok.

## Sahiplik ve kabul

- B2: `baglanti.ts`, `baglanti-ws.ts` kendi kaynak bridge alanı/mapping.
- A3: `uretim-agi-panel.ts`, `mulk-panel.ts` gate/il adı/normal+portable CSS.
- B4: yeni `rezerv-gorunum.ts` ve `.css`; tek gerçek ekran `/tmp` betiği.
- L1: salt okuma çekirdek sınırı; lazy muhasebe ve sıfır davranışı doğrulandı.
- A6: mevcut Ar-Ge notu ve şartnameye kısa gerçek teslim güncellemesi.
- B6: bridge için tek hedefli anlamlı kontrol, son istemci tip/derleme.
- Root: sözleşme, birleşik inceleme, devam kaydı, galeri ve commit/push.

Gerçek ekran önerisi Gebze'de başlangıç malzemeleriyle silis ocağıdır.
Gerçek komutla kurulur, üretim muhasebesinden önce/sonra kayıtlı miktar
çekirdek→özel kare→bridge→UI karşılaştırılır; rezerv/para/stok enjeksiyonu yok.
Görselde depo stoku ve yeraltı rezervi ayrı gösterilir. Tek masaüstü ekran;
geniş test paketi ve mobil matris yok.

## Kısa karar görüşmesi

L1, kayıtlı rezervin anlık olmadığını ve sıfırın üretimi otomatik durdurmadığını
bildirdi. B2/A3/B4 başlık ve raw snapshot sözleşmesini buna göre önerdi; root
anlık projeksiyon/wire genişletme yerine açık kayıtlı değer gösterimini kabul
etti. A6 içerik gate'inin beş madeni kapsadığını doğruladı. B4 gerçek silis
kurulumunun başlangıç bütçesine uyduğunu gösterdi; root ekran akışını kabul etti.

## Görsel son düzeltme

Gerçek silis akışı kayıtlı rezervin 80.000→79.916,01 birim değişimini,
çekirdek/özel mesaj/bridge/ekran eşitliğini ve depo stoğunun ayrı 121 birim
olduğunu doğruladı. Root görüntüde üst kartın üç sütunlu `dl` kuralının yeni
tek kaynak listesini daralttığını gördü. B4 yalnız rezerv CSS'inde kapsama
özel tek sütun kuralını güçlendirdi; yalnız derleme ve aynı ekran yenilendi,
veri testi/tip kontrolü tekrarlanmadı. Son görüntü ve değer eşitliği başarılı.
