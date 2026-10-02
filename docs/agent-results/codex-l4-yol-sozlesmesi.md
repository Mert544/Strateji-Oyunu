# L4 — İç sevkiyatın gerçek yolları ve kendi kapasite kullanımı

2 Ekim root kararı. L1/B2/A6 toplantısında ortak kenarın iki yöndeki
kullanımının pozitif toplanması ve güncel kapasite/son plan ayrımı kabul edildi.
Yeni ekonomik kural, rota seçimi, inşaat yetkisi veya kalıcı durum eklenmez.

## Kesin veri sözleşmesi

- Akıştaki optional `yol?: number[]` gerçek `Akis.yol` sırasıdır.
- Kaynak özel `lojistik` görünümüne optional
  `kenarlar?: LojistikKenarGorunumu[]`, `guncellemeBekliyor?: boolean`
  eklenir. Yeni sunucu ikisini birlikte üretir. Bridge görünümdeki
  `kapasiteZamani` değerini mevcut kare `t` anından alır; özel her kaynakta
  sürekli değişen saat gönderip delta optimizasyonunu bozmaz.
- Kenar satırı: `{indeks:number, a:string, b:string,
  tur:"kara"|"deniz"|"hava", sureMs:number,
  kapasiteMiliSaat:number, kendiYukMiliSaat:number}`.
  `a/b` gerçek genel harita merkezlerinin kimlikleridir. `indeks` yalnız
  yol ile sözlük eşleştirmesidir, oyuncuya isim olarak gösterilmez.
- Sözlük yalnız ilgili kaynağın aktardığı doğrulanmış rotalarda geçen
  kenarların artan indeks sıralı, tekil listesidir. Dünya/transit aboneliği
  genişletilmez. Genel kenar toplam kullanımı veya başka oyuncu akışı yoktur.
- Core helper bütün final akışları bir kez tarar. Sahip + iki gerçek uç
  sahipliği + mülk merkezleri doğrulanır. Kendi yük, tüm kaynak/mal/iki
  yöndeki doğrulanmış son plan akışlarının kenar başına `oranSaat` toplamıdır.
  Negatif netleştirme, seçili kaynaktan toplam çıkarma, askerî/sivil ayrımı yok.
  Yolun kenarları ve kaynak merkezinden hedef merkezine bağlantısı geçerli
  değilse eksik yük toplamı göstermemek için sahibin yeni yol görünümü
  tamamen bilinmiyor kalır; mevcut sevk özeti korunur. Görünümde mal
  filtresinden elenen gerçek akış da ortak kenar yüküne dahildir.
- Kapasite `d.kenarlar` içindeki mevcut fiziksel kapasitedir; yük son planın
  tahsisidir. Bekleme bilgisi `d.lojistik.kirli` değeridir; yalnız kuyrukta
  no-op çözüm bulunması bekleme sayılmaz. Okuma çözüm tetiklemez veya dünyayı değiştirmez.
  Eski plan güncel kapasiteyi aşarsa oranı normalleştirmek için sayılar kesilmez.
- Sıfır süreli gerçek il içi havuzda `yol:[]`, sözlük boş olabilir. Alan yok
  ise bilinmiyor; eski sunucu/eksik veri boş yol gibi gösterilmez.

## Aktarım ve arayüz

Ek karar: B2'nin her kaynakta `d.zaman` gönderiminin gereksiz delta üreteceği
itirazı root tarafından kabul edildi; kapasite zamanı mevcut kare zamanıdır.

Protokol explicit alan listesi ve optional şema kullanır. Mevcut source
özel görünümü ve tam bölge deltası korunur. Bridge aynı çözüm ve kapasite
anındaki kaynak sözlüklerini tekilleştirir; aynı indeks çelişkisi veya
eksik yeni alan varsa birleşik yol/kapasite bilgisi bilinmiyor kalır,
mevcut sevk özeti kaybolmaz. Kendi yük kopyaları yeniden toplanmaz.

Tedarik → İç sevkiyat satırında isteğe bağlı **Yol ve kapasite** ayrıntısı.
Yol sırasıyla kullanılan genel merkez bağlantıları `A ↔ B`, tür ve
bağlantı süresi; **Son planda kendi yükün** ve **Güncel toplam kapasite**
gösterilir. Kendi yük tüm mallar ve iki yön toplamı olarak açıklanır.
Güncel kapasite zamanı/plan beklemesi anlaşılır kısa metinle belirtilir.
Merkez adı mevcut isim verisinden bulunur, parsel veya sokak rotası denmez.
Yol boşsa il içi havuz, alan eksikse bilgi alınmadı gösterilir.
Kalan kapasite, global doluluk, kesin darboğaz, ETA veya yolda stok yoktur.
Yeni rota seçme/geliştirme düğmesi ve haritaya uydurma çizgi eklenmez.
Açılır ayrıntı, odak ve mevcut tedarik formu güncellemelerde korunur.

## Sahiplik ve kabul

- L1: yalnız packages/cekirdek; saf helper ve export. Yeni persist yok.
- B2: packages/protokol ve istemci baglanti.ts/baglanti-ws.ts.
- A3: tedarik-panel.ts/mulk-panel.ts isim ve ayrıntı entegrasyonu.
- B4: lojistik-gorunum.ts/.css ve tek gerçek sevkiyat ekran betiği.
- A6: docs/06 şartname + codex-l1-rota-arge.md güncel notu.
- B6: en fazla iki hedefli senaryo, bir kök/istemci tip ve final build dalgası.
- Root: sözleşme, entegrasyon, devam kaydı, GitHub teslimi.

Kabul: aynı kenarda iki akış/iki yön ve başka sahibin yükünden ayrım;
salt okuma/alan yokluğu/gerçek boş yol/schema-delta, farklı canlı kapasite
ve eski plan ayrımı. Sonra tek gerçek browser sevkiyat ayrıntısı/ekran.
Önceki ekonomik testleri tekrar etme, tam test veya mobil matris yok.
