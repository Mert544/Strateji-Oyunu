# 05 — İlk Ölçüm Raporu (v0 → v0.1)

> **Özet.** Aşama 2 çekirdek simülasyonu H1–H3 ve H5–H7 hipotezlerine karşı iki turda ölçüldü.
> v0 temel ölçümünden sonra PDF'deki eksik bir kural (erken oyun hızlandırması) eklendi, para lavaboları ve pazar ayarı yapıldı, bağımsız kod incelemesinin bulduğu hatalar düzeltildi ve ölçüm tanımları PDF'e daha sadık hâle getirildi.
> v0.1'de **H5 geçiyor**, **H2, H3 ve H6 belirsiz** (koşullar arasında çelişkili), **H1 ve H7 kalıyor** (H7 sınırda).
> **Kapı 2 henüz geçilmedi.** PDF'deki kurala göre Aşama 2 bir tur daha yinelenir. Önerilen v0.2 paketi [07](07-tasarim-onerileri.md)'dedir.

Ham raporlar: [olcum/v0-t1-3.md](olcum/v0-t1-3.md) · [olcum/v0.1-t1-3.md](olcum/v0.1-t1-3.md) (JSON'ları aynı klasörde).
Yeniden üretmek için: `pnpm olcum --tohum 1-3 --ad v0.1 --karsilastir docs/olcum/v0-t1-3.json` (≈ 27 dk).

## 1. Sonuç tablosu

| Hipotez | Vazgeçme ölçütü (PDF) | v0 | v0.1 | v0.1 koşul başına (tohum 1 / 2 / 3) |
|---|---|---|---|---|
| **H1** Bölgeler farklı | aynı önayar bölgelerin > %70'inde ilk üçte | ❌ %96 | ❌ **%75** | %75 / %75 / %75 |
| **H2** Tekrar düşük | 30. günde tekrar endeksi > %60 | ✅ %42,5* | ⚠️ **%56,7** | ✅ %40 / ✅ %40 / ❌ %90 |
| **H3** Askeri üretim ekonomiyi değiştirir | hiçbir fiyat/kapsam %10 değişmezse | ⚠️ %42,9 | ⚠️ **%46,9** | etki %47 / %40 / %54, gürültü tabanı %40 / %63 / %64 |
| **H5** Çevrimdışı kayıp sınırlı | 24 saatte bir bölgede > %25 kayıp | ✅ %25* | ✅ **%25,0** | %25 / %25 / %25 |
| **H6** Geç katılan yetişir | yerel ilk yarıya ulaşan < %50 | ❌ %33 | ⚠️ **%66,7** | ❌ %37,5 / ✅ %87,5 / ✅ %75 |
| **H7** Ayarla-unut ne çöker ne eşitlenir | 24/48/72. saat üretim oranı [%50, %85] dışında | ❌ | ❌ **sınırda** | 24 s: %83 / %96 / %74 · 48 s: %46 / %67 / %49 · 72 s: %60 / %57 / %60 |

\* v0'da H2 ve H5 ölçüm tanımları hatalıydı (bkz. §3). v0'daki "geçti" sonuçları bu yüzden güvenilir değildir.

Tohum notu: Simülasyon tohumu savaş dışında ekonomiyi değiştirmez. Tohumlar arasındaki fark, devlet sırası rotasyonundan (hangi devletin odak oyuncu olduğu) ve savaş rastgeleliğinden gelir. Bu yüzden "koşul başarı oranı" bir istatistiksel güven aralığı değildir.

## 2. v0 → v0.1'de ne değişti

**Oyun kuralları** ([06 §10](06-simulasyon-spesifikasyonu.md))
- **Erken oyun hızlandırması (PDF zaman kuralı 2):** katılımdan sonraki ilk 24 saatte inşa, araştırma, parti ve kenar geliştirme süreleri %10'a iner. 7. günde doğrusal olarak normale döner. Geç katılan oyuncu da bunu alır; bu aynı zamanda yetişme yardımıdır.
- **Para lavaboları:**
  - Aktif tesis başına işletme gideri 60 para/saat, birlik maaşı 8 para/saat. Lavabolar brüt gelirin yaklaşık %57'sini tüketiyor.
  - Hazine 0'a inerse tesisler ödeme gücü oranında yavaşlar.
- **Teknoloji yayılımı:** diğer oyuncuların bildiği teknoloji %50'ye kadar ucuz ve hızlıdır.
- **Stok ve pazar:**
  - Gıda %2/gün, tahıl %1/gün bozulur; depo kapasitesi 10 bin birimdir.
  - Ham madde pazar hacmi 2–3 kat artırıldı.

**Hata düzeltmeleri** (bağımsız kod incelemesi)
- **Bedava ithalat kapatıldı:** hazine sıfırken tik aralarında gelen bedava ithalat engellendi. İthalat artık hazineye sığacak şekilde ölçekleniyor.
- **Kayıp tavanı garanti altında:** aynı hedefe paralel savaşlarla %25 tavanı aşmak mümkündü (%41'e kadar). Artık üç kural var:
  - Hedefte bitmemiş savaş varken yeni ilan reddedilir.
  - Yağmadan sonra 24 saat bekleme şartı vardır.
  - Bir saldıran bölge aynı anda tek savaşta olabilir.
- **Küçük ordular:** artık en az 1 birim kaybeder.
- **Sahipsiz bölgeler "uykuda":** üretmez, tüketmez, rezervleri tükenmez. Geç katılan artık tükenmiş bölgeye başlamıyor.
- **Girdi doğrulama:** simülasyonu çökertebilen aşırı büyük sayılar ve bilinmeyen anlaşma türleri reddediliyor.

**Ölçüm düzeltmeleri**
- **H1:** rekabetli dünyada (diğer devletler botlarla oynar) ve net değer skoruyla ölçülüyor. Uyarlanan "dengeli" önayar sıralama dışı.
- **H2:** karar, PDF'deki gibi 30. güne (son 10 günlük pencere) göre veriliyor. "Hiçbir şey yapma" tekrarları ayrı bir "karar tükenmesi" metriği olarak raporlanıyor.
- **H5:** en kötü durum senaryosu uygulanıyor. Çevrimdışı oyuncuya iki devletten 48 saat saldırı dalgası gelir ve ölçüm her bölgede herhangi bir 24 saatlik kayan pencereye bakar. Eski tanım yalnızca tavanın birim testiydi.
- **H7:** kümülatif değil, PDF'deki gibi "o saatteki üretim" ölçülüyor (son 24 saat, günlük ritim).
- **Bot sırası:** her karar anında dönüyor (ilk hamle avantajı kaldırıldı).

## 3. Hipotez yorumları

**H1 — kaldı (%75, ilk turda %96).** Ölçüm artefaktları azaldıkça oran düştü, ama tek bir önayarın her yerde iyi olması sürüyor. [07](07-tasarim-onerileri.md)'deki teşhis:
- **Kalan artefaktlar:** tek bölgeli odakta ticaret yok, pasif referans yok, önayarlar birbirinin üst kümesi.
- **Gerçek tasarım sorunları:**
  - Ham madde pazarı 3. günde doyuyor.
  - İşleme zincirlerinde işçi başına katma değer ham çıkarımın çok altında (çelik 83 / parça 140, ham çıkarım 250–400 para/işçi).
  - Maden damarları o kadar büyük ki tükenme fiilen çalışmıyor.

Sonuç: bölgeleri şu an strateji değil rezerv ayırıyor. Bu, PDF'nin ana hedefi olan "her bölgede farklı en iyi strateji" için en önemli açık iştir.

**H2 — belirsiz (%56,7; koşullar %40 / %40 / %90).** Karar tükenmesi yok: 30 gün boyunca her gün pozitif değerli aksiyon var, tohum 2'de yalnızca 2 geçiş tükenme. Ama bir koşulda son 10 günde aynı "en iyi düzenleme" %90 tekrar ediyor. 20–25. gün riski gerçek. Damar tükenmesinin çalışması (07, Ö7) bu tekrarı kırması beklenen ana mekanizmadır.

**H3 — belirsiz.** Askeriyeye kayma fiyatları %40–54 değiştiriyor, yani vazgeçme ölçütü tetiklenmiyor. Ama aynı dünyada yalnızca bot tohumu değişince de fiyatlar %40–64 oynuyor (gürültü tabanı). Ekonomi kaotik. Etkiyi gürültüden ayırmak için daha çok koşul (≥ 10) ve eşli istatistik gerekiyor.

**H5 — geçti.** En kötü saldırı dalgasında bile hiçbir bölge 24 saatte %25'ten fazla kaybetmiyor. Kural artık yapısal olarak garanti: v0.1 düzeltmeleri ve 40 tohumlu özellik testi. İnceleme bulgusu önemliydi: v0'daki "geçti", paralel savaş açığını hiç denemiyordu.

**H6 — belirsiz (%66,7; ilk turda %33).** Erken oyun hızlandırması ve uykudaki sahipsiz bölgeler, geç katılanın yetişmesini belirgin artırdı. Bir koşulda (%37,5) hâlâ kalıyor; o koşulda geç katılanlar zayıf bölgelere düşüyor.

**H7 — kaldı, sınırda.**
- Oran 24 saatte %74–96, 48 saatte %46–67, 72 saatte %57–60. Üç noktadan biri her koşulda banda birkaç puanla giremiyor.
- 72 saat sonrası (bilgi amaçlı): 7. günde %24–115, 14. günde %29–45. Ayarla-unut oyuncu uzun vadede aktif oyuncunun yarısının altına düşüyor. Buna para lavaboları ve ticaret emirlerini güncellememesi yol açıyor.
- Sonuç:
  - Aktif oyun değerli; PDF'deki "eşitlenmesin" amacı sağlanıyor.
  - "Çökmesin" amacı sınırda. Ayarla-unut oyuncuya bir "temel gider muafiyeti" ya da hazır ticaret emri otomasyonu düşünülebilir.

## 4. Kapı kararı ve sonraki adım

**Kapı 2 geçilmedi:** H1 kalıyor, H7 sınırda kalıyor, H2, H3 ve H6 koşullar arasında çelişkili. PDF kuralı gereği Aşama 2 yinelenir. Önerilen v0.2 sırası ([07 §5](07-tasarim-onerileri.md)):
1. **H1 ölçüm düzeneği v0.2 (Ö1, oyun riski yok):** pasif referans ve eklenen değer, bölge + en yakın liman odağı, arka planda militarist, regret ve entropi raporu. *Şu an uygulanıyor.*
2. **İşleme zinciri ekonomisi (Ö2 + Ö3, yalnızca veri):** işçi başına katma değeri dengeleme, ölü uç olan `elektrik_ark` yöntemini düzeltme, işlenmiş mal pazarını derinleştirme.
3. **Koşullu (Ö4):** bölge verim çarpanları (ova tarım, dağ çıkarım, kent işleme).
4. **v0.3 adayı:** damar ölçeği ve tükenme (Ö7). 20–25. gün tekrarını (H2) kırması beklenen ana mekanizma bu.
5. **Ölçüm gücü:** H2, H3 ve H6 için 10 koşul; H3'te eşli gürültü tabanı zaten var.

**Kanıt sınırı (PDF):** simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz. H4 (lojistik okunurluğu) Aşama 3'te insan testiyle ölçülecek. Bunun ön izlemesi `pnpm izle` ile üretilen inceleme sayfasıdır.

## 5. Ek: H1 ölçüm düzeneği v0.2 (oyun kodu v0.1, tohum 1)

[07](07-tasarim-onerileri.md)'deki Ö1 uygulandı. Oyun kuralları değişmedi, yalnızca ölçüm düzeneği değişti:
- "Hiçbir şey yapmama" referansı eklendi; skor artık eklenen değer.
- Anlamlı fark eşiği var: pasif skorun %3'ü ya da 10 bin para.
- Odak, bölgeye en yakın liman eklenerek kuruluyor.
- Tüm önayarlar ortak ham çıkarım tabanıyla başlıyor.
- "ihracatçı" yalnızca ticaret teması; hiçbir önayar diğerinin üst kümesi değil.
- Arka planda bir militarist bot oynuyor.
- Skor 4–7. gün penceresine göre hesaplanıyor.

Ham rapor: [olcum/v0.2-duzenek-H1-t1.md](olcum/v0.2-duzenek-H1-t1.md).

| Gösterge | v0.1 düzeneği | v0.2 düzeneği |
|---|---|---|
| En yüksek (anlamlı) ilk-üç oranı | %87,5 (ihracatçı) | **%68,8 (ihracatçı) → geçti, sınırda** |
| Pencereye duyarlılık | — | %62,5–75 (7 günlük toplamla %75 → kaldı) |
| Normalize entropi (hedef ≥ 0,75) | 0,53 | 0,68 |
| Bölge türü başına farklı en iyi önayar | 2 | 5 |
| En iyi önayarın ortalama regret'i (hedef ≥ %10) | — | %20,9 |

Yorum:
- Artefaktların büyük kısmı temizlendi; "elektronik" önayarının tek seferlik stok dönüşümü hilesi de ortadan kalktı.
- Kalan baskınlık gerçek bir tasarım sinyali. Ham madde ihracatı, işlemeye göre fazla kolay değer üretiyor.
- İki sınırlama da hâlâ geçerli:
  - Depo tavanı 3. günde doluyor, bu yüzden 4–7. gün penceresi ihracat yeteneğini ödüllendiriyor.
  - Militarist bot 7 günden önce savaş başlatmıyor.

Karar sağlam değil; v0.2 oyun değişiklikleri (Ö2 + Ö3) sonrası en az 3 tohumla yeniden ölçülecek.
