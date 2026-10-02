# L1 sonrası — Gerçek rota görünürlüğü

2 Ekim 2026. A6 salt kaynak incelemesi; B2 ile veri sözleşmesi tartışıldı ve
aşağıdaki ayrımlarda uzlaşıldı. L1 protokol sahibine aynı sözleşme iletildi.
İlk inceleme uygulama önerisidir; o görevde protokol/çekirdek/UI değiştirilmedi
ve test/build/ağ çalıştırılmadı. Sonraki L1.2 uygulama ve L4 kesin sözleşme
notları aşağıdadır; güncel kabul kanıtı devam kaydında tutulur.

## Mevcut durum ve saklama sınırı

| Veri | Gerçek kaynak ve anlam |
|---|---|
| Güncel rota | `cekirdek/src/tipler.ts:647` Akis: sahip, mal indeksi, kaynak/hedef düğüm indeksleri, sıralı yol kenar indeksleri, oranSaat, sureMs. `d.lojistik.akislar` son çözümün parça-sabit **sevk oranıdır**; varış/teslim edilmiş miktar değildir. |
| Çözüm zamanı | `LojistikDurumu.sonCozum`, kirli, cozumPlanli; `motor.ts:442` zamanını yazar. Güncel kare zamanı ile çözüm zamanı ayrıdır; okuma çözüm çalıştırmamalı. |
| Retention | `lojistik/cozum.ts:327` eski akış listesini yeni listeyle değiştirir. Rota geçmişi, başlangıç zamanı, sevkiyat partisi ve toplam teslim sayacı yok. Snapshot güncel akış+stok+kuyruğu korur (`serilestir.ts:424`); kayıt çözüm geçmişi değildir. |
| Gecikme | `lojistik/akis.ts:559` eski/yeni rota farkını t+sureMs için oran_delta planlar. Olay yalnız bolge/mal/delta taşır; kaynak/yol/sevkiyat kimliği yok. Silinen/değişen rota geçmişinin gecikmeli etkisi kuyrukta kalabilir. |
| Ulaşmış oran | `Stok.gelenOran`, taşıma gecikmesi işlendikten sonraki **mal/düğüm toplam ağdan gelen oranıdır**. `motor.ts:395` stokGelenEkle ile uygular. Kaynak/rota başına ayrılmaz; NPC ithalatı yerelOran'a girer, bunun toplamı değildir. |
| Şimdiki stok | `stok.ts:57` anlikMiktar yerelOran+gelenOran ile stok miktarını hesaplar. `protokol/kare.ts:73` StokFormulu birleşik oran taşır; bundan saf gelen oranı veya rota çıkarılamaz. |
| Kapasite | `d.kenarlar[e].kapasiteSaat`, sureMs, tur, a/b gerçek kenar durumudur. Kenar iki yön+tüm mal+tüm oyuncular arasında ortak. `cozum.ts:365` kullanilanSaat/askeriKullanilanSaat toplamını son çözümden yazar. |
| İl içi | Mülk düğümleri merkezlere örtük bağlıdır; il içi havuz kaydı yol=[]/sureMs=0 olabilir. Boş yol veri hatası veya kayıp rota sayılmaz. İlçe adresinden ayrı yol çizilmez. |
| Eksik sevk | `d.lojistik.kapsam[düğüm][mal]` karşılanma/neden/en yakın kaynak süresini taşır. Bu çözücü türevidir; **MCF'nin seçtiği rota veya gerçek kenar darboğazı değildir**. Başlangıç diliminde yeni rota icat etmek için kullanılmaz. |

## Doğru oyuncu dili

- “Son çözümde sevk: 8 birim/sa · Yol süresi: 2 sa” Akis'ten gösterilebilir.
- “Bu işletmeye ulaşmış toplam: 3 birim/sa” Stok.gelenOran'dan gösterilebilir.
- “2 saate teslim”, varış saati, yolda miktar veya yüzde ilerleme gösterilemez:
  sonCozum+sureMs rota başlangıcı değildir; aynı rota önceki çözümlerde var olabilir.
- Kalan kapasite, gerçek global doluluk veya “bu kenar seni durdurdu” oyuncunun
  kullanımından çıkarılamaz. “Kendi kullanımın / toplam kenar kapasitesi” denir.
- Fiziksel rota süresi gerçek kenarlardandır; çizgi il merkezleri arasındaki
  oyun bağlantısıdır. Parsel/sokak/taşıt güzergâhı gibi sunulmaz.

## L1.2 uygulanacak minimum özel kare önerisi

Root kapsamı yalnız iç sevk planı ve ulaşmış toplam ağ oranına daralttı.
Kenar/yol metadata, kapasite veya darboğaz görünürlüğü sonraki dilimdedir.

Kaynak **kendi bölgesinin** `ozel` nesnesine isteğe bağlı alan. Root'un protokol
sahibine verdiği kesin shape aşağıdadır; mal/düğüm kimlikleri gerçek state'den gelir:

```ts
lojistik?: {
  sonCozum: number;
  akislar: {
    mal: string; kaynak: string; hedef: string;
    oranMiliSaat: number; sureMs: number;
  }[];
};
gelenOran?: [mal: string, miliSaat: number][]; // depolanabilir malların pozitif ağdan gelen hızları
```

- Filtre: a.sahip=doğrulanmış oyuncu; kaynak=parent; kaynak ve hedef düğümün
  sahipleri de aynı oyuncu. İki uç kontrolü olmadan yanlış sahipli state telde açılmaz.
- gelenOran aynı sahiplik kapısından çıkar; destekli karesinde pozitif akış yoksa
  [] gönderilir. SonCozum eski planın zamanını gösterir; kirli alanı ilk shape'de yok.
- Aynı source/target/mal için birden fazla yol varsa oranları toplayıp tek süre
  uydurma; ayrı satırlar korunur. Eşit görünen satırlar keyfi silinmez.
- Kenar/yol alanı bu teslimde gönderilmez; hedef gerçek düğüm kimliğidir.
  Transit merkezler için yeni abonelik veya bütün dünya özel karesi istenmez.
- Auth kimliği null/yabancı bölge: alan yok. Destekte alan var/boş liste=akış yok;
  eski sunucuda alan yok=bilinmiyor. Boş veri sessizce varsayılan rotaya dönüşmez.
- B2 tüm sahipli kaynakları birleştirirken herhangi birinde alan eksikse toplam
  bilinmiyor kalır; farklı sonCozum değerleri aynı güncel plan gibi birleştirilmez.
- Normal bölge tam değişim deltası alanları ekler/siler; ayrı geçmiş veya kuyruk
  protokolü açılmaz. İç düğüm/kenar indeksleri kimlik etiketi diye gösterilmez.
- Aktarım kanonik sıralı, salt okuma; PRNG/tik/kasa/stok/rota üzerinde yazım yok.
  Kare başına akışlar bir kez gruplanır; bölge başına tüm dünya tekrar taranmaz.

## Kesin uygulama sırası

1. Root/L1 protokol sahibi alan adlarını kapatır; çekirdek durumu göçü gerekmez.
   Mevcut güncel state read-model helper → optional schema → delta uyumu.
2. B2 WS bağdaştırıcısı alan yok/boş ayrımını, kimlikleri ve sıralamayı korur.
   Mevcut kendi bölge union'u yeterli; server varsayılan istek sınırı 256'yı
   transit ekleyerek büyütme. Sunucu gerçek sahiplik denetiminin sahibidir.
3. Tedarik/üretim mal detayında gelen/giden özet; sevk satırında gerçek
   kaynak/hedef, sevk oranı ve süre. Edge/yol/kapasite ayrı sonraki dilim. İlk dilimde
   rota seçme komutu, harita animasyonu veya nakliye gideri düğmesi eklenmez.
4. Operasyon tek hedef senaryo: kendi iki uzak düğümü + yabancı oyuncu;
   sevk başlar, varış öncesi/sonrası farklı toplamlar; rota azalır/kalkar ve
   gecikmeli gelen oran sürer. UI planı teslim sanmaz, silinen satır deltada kalkar.
   İl içi havuz 0 sa gösterilir; farklı süreli aynı source/target/mal ayrı kalır.
   Public/yabancı kare rota içermez; okuma önce/sonra dünya özeti aynı kalır;
   eski kayıttan yükleme aynı görünümü verir. Bu görevde kontroller çalıştırılmadı.

## Varsayım ve kalan karar

Bu plan mevcut otomatik sürekli akış modelinin korunacağını varsayar.
Rota başına kesin ETA/teslim geçmişi istenirse olaylarda rota kimliği + kalıcı
başlangıç/varış defteri gerekir; bu ayrı durum/göç dilimidir, görünürlük işi değildir.
Global ortak yol yoğunluğu bilgi olarak istenirse ayrıca genel veri kararı gerekir;
own-only ilk dilim bunu yayımlamaz. İlk incelemeden sonra L3 iç taşıma
hizmet bedeli uygulanmıştır; bu fiyat kuralı ile L4 yol görünürlüğü ayrıdır.
Gerçek kenar bilgisi ve kendi tahsisinin sonraki sözleşmesi aşağıdadır;
fiilî teslim veya global kalan kapasite diye sunulmaz.

## Uygulama notu

Gider checkpoint'i `189722c` sonrasında bu dar sözleşme mevcut ekip tarafından
özel kareye, WS bağdaştırıcısına ve Tedarik içindeki “İç sevkiyat” açılır
bölümüne uygulandı. Açık/kapalı durum ile form odağı güncellemelerde korunur.
Kontrol ve teslim kanıtı `codex-devam-durumu.md` kaydındadır; yukarıdaki
ilk inceleme sırasında test çalıştırılmadığı bilgisi tarihsel kalır.

## L4 kesin güncel sözleşme — yol ve kendi kapasite kullanımı

[Root sözleşmesi](codex-l4-yol-sozlesmesi.md) uygulanacak alanları kapattı:
flow `yol?:number[]`; kaynak özel `lojistik` alanında birlikte optional
`kenarlar` ve `guncellemeBekliyor`. Kenar satırı
`{indeks,a,b,tur,sureMs,kapasiteMiliSaat,kendiYukMiliSaat}`; sadece o kaynağın
doğrulanmış yol kenarları, artan indeksle tekil gönderilir. `a/b` gerçek genel
harita merkez kimlikleridir; indeks isim değildir. Kaynak/iki uç sahipliği,
mülk merkezleri ve gerçek yol bağlantısı doğrulanır; geçersiz yol bilinmiyor
kalır. Dünya/transit aboneliği genişletilmez.

Kendi yük, sahibin **tüm doğrulanmış final akışlarının** kenar başına
pozitif `oranSaat` toplamıdır: tüm kaynaklar, mallar ve iki yön dahil.
Seçili kaynak toplamı veya yönler arası net değildir; ortak kenar sözlük
kopyaları bridge'de yeniden toplanmaz. Global `kullanilanSaat`, kalan kapasite,
yabancı yük veya final akışta bulunmayan askerî/sivil ayrımı aktarılmaz.

Kapasite canlı kenar değeridir, yük `sonCozum` tahsisidir. Wire'da bekleme
alanının adı **`guncellemeBekliyor`**, kaynağı `d.lojistik.kirli`dir; sırf
no-op çözüm kuyrukta diye true olmaz. B2'nin delta itirazıyla source-local
zaman alanı kaldırıldı: bridge **`kapasiteZamani=kare.t`** üretir. Yeni frozen
kapasite durumu yoktur; eski plan güncel kapasiteyi aşarsa sayılar kesilmez.
Farklı çözüm/kapasite anı, çelişen aynı indeks veya eksik yeni alan birleşik
yolu bilinmiyor yapar; mevcut sevk özeti kaybolmaz. Okuma çözüm tetiklemez.

Tedarik → İç sevkiyat → **Yol ve kapasite** isteğe bağlı ayrıntısı gerçek
yol sırasıyla merkez `A ↔ B`, tür/süre, "Son planda kendi yükün" ve
"Güncel toplam kapasite" gösterir; bekleyen çözüm kısa metinle belirtilir.
Boş yol gerçek il içi havuzdur; alan yoksa bilgi alınmadıdır. İki sayıdan
boş kapasite/global doluluk veya belirli kenarın kesin darboğaz olduğu
çıkarılmaz; `kapsam.neden` yalnız bölge/mal açıklamasıdır. ETA, yolda stok,
haritaya uydurma çizgi, rota seçimi/yükseltme düğmesi eklenmez.
Mevcut tedarik/stok/üretim konumu kararını bilgilendirir; **L3 bedeli,
kasa, stok, parametre ve kalıcı durum kuralları değişmez**. Bu belge
test/build yapıldığı iddiası değildir; uygulama/kabul devam kaydındadır.
