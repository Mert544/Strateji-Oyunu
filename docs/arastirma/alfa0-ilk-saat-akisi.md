# Alfa-0 ilk saat akışı: çiftlik → tahıl → dükkân → raf → ilk satış (A1; ahır ve ekmek zinciri ilk saat dışı)

> **Karar (baş lider, T-7):** ilk saat sırası **çiftlik → Pazar'da sat → dükkân**; Defter'in "Ham malı işle" adımı **dükkândan sonraya** alındı. Aşağıdaki ahır (adım 3) ve ekmek zinciri bu yüzden ilk saatin **dışındadır**; ilk satıştan sonra Defter'in sıradaki adımı dükkân kartıdır.
>
> **Kaynak ve sınır.** Kod: ana dal `5c8e704` (kaynak okuması). Ekran: `SP/takim/ekran/dukkan/` (masaüstü, uç 2103af0) ve `dukkan-p11/` (telefon, 5c8e704). **Hiçbir şey çalıştırılmadı.** Tıklama sayıları kaynak okumasından ve karelerden çıkarıldı; yalnız "çiftlik tek tıkla" betikle doğrulanmıştır (`f4-uctan-uca.ts`). Süreler **hedeftir**: erken oyunda inşa süresi %10'dur (çiftlik 12 dk, ahır ve dükkân 24 dk, gıda fabrikası 36 dk; aynı anda en çok 2 inşaat). Oyuncu karar süresi hariçtir.

## 1. Adımlar

| # | Adım | Bugünkü ekran metni (tırnak içi ekrandan) | Tıklama | Bekleme | Takılma ("şimdi ne yapacağım?") |
|---|---|---|---|---|---|
| 1 | **Çiftlik** | Yerleş "Nerede başlamak istersin?" → "Burada başla" → "Yurdun hazır", "Yurdun 6 hücre ve ücretsiz. İlk yapın buraya sığar.", düğmeler "Yurdunda kur · ücretsiz" / "Arsa satın al" → "Çiftlik kuruluyor: yapı 4.200 ₺." + şerit "Çiftlik kuruluyor · geri alma: 4:56 [Geri al]"; harita etiketi "Çiftlik · Temel · 12 dk" | **2** (Burada başla, Yurdunda kur; ilçe önerisi hazır gelir) | **12 dk** | Düşük. Bitince çiftlik "Çalışıyor · verim %100" olur, bildirim yok **(doğrulanmadı)**. Aynı anda D0 kartı çıkar (adım 5 ile bağlantılı, T-2) |
| 2 | **Tahılı Pazar'da sat** | Defter kartı: "Sıradaki adım: Çiftliğinin tahılını sat." (eylem yok, yalnız "Atla"). Satış yeri: Komutlar › Ticaret › "Ticaret emri"; alanlar Mal / Yön ("İhracat (sat)") / Oran (birim/sa); düğme "Emri ver"; uygun değilse "Yalnızca liman bölgelerinde" | **≈6–8** (komut panelini aç, bölgeyi seç, Ticaret, mal, yön, oran yaz, Emri ver) **(doğrulanmadı)** | tahıl çiftlik bitince akar (≈3,3 birim/dk); ilk satış emirden hemen sonra; Defter damgası ve ₺500 saat sınırında (≤60 dk) | **Yüksek, T-1:** mülk panelinde (İşletmem, Mal) satış düğmesi **yok**; Mal sekmesi salt okunur ("Satış: işletme emirlerinin gerçekleşen saatlik miktarı"). Yol eski komut panelinde; Gebze düğümünün orada seçilebildiği ve "liman" sayıldığı **(doğrulanmadı)**. Defter kartı yolu göstermiyor. "Oran" tek seferlik değil sürekli emirdir, açıklaması uzun |
| 3 | **Ahır** (ilk saat dışı, isteğe bağlı) | "Yapı kur" → Ahır → yöntem seçici "Ahır ne yapsın?", "Seçimi sonradan değiştirebilirsin; ücret yok."; satırlar "Ahır besi · saatte 120 tahıl → 70 gıda · 12 gübre", "Kepek gübresi · saatte 100 kepek · 5 elektrik → 18 gübre", "Süt, kepekli · saatte 50 tahıl · 60 kepek · 5 elektrik → 82 süt · 4 gübre"; "Bir yöntem seç." (Kur kapalı) → yer sabitle → Kur | **≈5** (Yapı kur, Ahır, yöntem, hücre, Kur) | **24 dk** | **T-3:** seçicide hiçbir yöntem önceden seçili değil ve **stok gösterilmiyor**: kepek yokken "Kepek gübresi" ve "Süt, kepekli" seçilebilir görünür; oyuncu ahırın **neden** gerektiğini bilmez (Defter yönlendirmiyor; ahır gıdası dükkân rafının sürekliliği için) |
| 4 | **Dükkân** | D0 kartı: "İlk dükkânın için malzemen hazır / Başlangıç malzemen ilk dükkânı kurmaya yetiyor… / Başlangıç gıdanı rafın için sakla. / Sıradaki adım: Çiftliğinin tahılını sat." [Dükkân kur] → "Hangi dükkânı kuruyorsun?" tür kartları (Bakkal seçili gelir) → hücre → maliyet "Dükkân 4.200 ₺ · Çelik 14 · Makine parçası 6 · Pencere: 3 pencere gerekiyor; depondaki pencere yetiyor · Süre 4 sa" → [Dükkânı kur] → "Dükkân kuruluyor: yapı 4.200 ₺." | **3–4** (Dükkân kur, hücre, Dükkânı kur; tür isteğe bağlı) | **24 dk** (kartta "Süre 4 sa" yazar) | **T-4:** kart "4 sa" der, harita 24 dk der; etiket "Yapı · Temel · 24 dk" (ad düşüyor, L1). İnşa boyunca oyuncuya söyleyen satır yok: ikinci inşaat sınırı (2) ahırla dolu olabilir |
| 5 | **Raf** | Dikkat: "Dükkânın hazır." [Rafa git] → "Rafın boş: bir yuvaya mal koyunca satış başlar." → yuva "boş: mal ekle" → "Bu yuvaya hangi malı koyalım?" → "Gıda · stokta 199 · 97 ₺" | **3** (Rafa git, yuva, Gıda) | anlık | **T-5:** kartta "Gelir ≈ 0 ₺/sa · Gider 132 ₺/sa · Net ≈ −132 ₺/sa" boş rafta görünür (kod ozetHtml); iki kez uyarı (L2). Seçicide 97 ₺, rafta 102 ₺ |
| 6 | **İlk satış** | "Dükkânında ilk satış oldu; hayırlı olsun." (bildirim); raf "Gıda · Normal · 102 ₺", "Tahmini satış ≈ 90 birim/sa"; Defter ilk_dukkan "İlk satışını dükkânından yaptın." | **0** | rafa mal komutundan sonraki çözümde (saatlik tık beklenmez, kaynak okuması) | **T-6:** Defter kartı hâlâ "Çiftliğinin tahılını sat." der (dükkân satışı bunu tamamlamaz, T3 de işaretledi); Defter damgası ve ₺500/10 çelik ≤60 dk geç gelir |

**Toplam (ahırsız sıra: çiftlik → tahıl → dükkân → raf):** ≈15–18 tıklama, ≈44–47. dakikada ilk dükkân satışı (varsayım: çiftlik dk 3'te, tahıl emri dk 16, dükkân dk 18–20'de başlar ve dk 42–44'te biter, raf dk 45–46). Ahır eklenirse +≈5 tıklama ve ikinci inşaat yuvası; dükkânla eşzamanlı sığar (sınır 2). İlk (tahıl) satış ≈ dk 16–20. D0 kartı çiftlik başlar başlamaz çıktığı için oyuncu dükkânı **dk 4–5'te** başlatırsa (çiftlik + dükkân eşzamanlı) ilk dükkân satışı **≈ dk 30'a** iner; ahır o zaman çiftlik bitince (dk 15) başlar. Sıra oyuncuya bağlıdır.

## 2. Değirmen ve fırın seçimi ilk saate giriyor mu?

**Hayır; karar verildi (T-7, baş lider).** Defter'in tahıl satışından sonraki adımı artık dükkân kartıdır ("Kendi tezgâhın: bir dükkân kur…"); "Ham malı işle (ör. tahılı gıdaya çevir)" ve ilk ekmek adımları dükkândan sonra gelir. Gıda fabrikası (36 dk) ve ikinci fabrika için iki inşaat yuvası gerektiğinden değirmen ve fırın seçimi ilk saate sığmıyordu zaten (ilk ekmek ≈ dk 80–100). Yöntem seçici ilk saatte yalnız oyuncu kendiliğinden ahır ya da gıda fabrikası kurarsa görünür. Uygulama: Defter sırası `DEFTER_ODUL_SIRASI` ve sunucu `siradaki` listesinde `ilk_dukkan`, `ilk_isleme`den önceye alınır (K2); metinler değişmez.

## 3. Takılma noktaları (öncelik sırasıyla)

| Kod | Nerede | Sorun | Sahip | Basit düzeltme |
|---|---|---|---|---|
| **T-1** | Adım 2 | Tahılı satma yolu mülk panelinde yok; eski komut paneli, liman şartı, ≈6–8 tık | K1 | Mal sekmesinde her mal satırına "Sat" (ihracat emri formunu açar) ya da Defter kartına "Pazar'a git" eylemi |
| **T-2** | Adım 1→4 | D0 kartı ilk yapı inşası başlar başlamaz çıkar; "Sıradaki adım: Çiftliğinin tahılını sat." altında, ama çiftlik daha tahıl vermiyor | K1/T1 | Satır çiftlik bitene kadar "Çiftliğin hazır olunca tahılını sat." |
| **T-3** | Adım 3 | Yöntem seçici stok göstermiyor; ahırın rolü açıklanmıyor | K2/T3 | Girdisi depoda olmayan yöntemde soluk "stoğun yok" notu; ahır açıklamasına "dükkân rafına gıda" ipucu |
| **T-4** | Adım 4 | Kart "Süre 4 sa", gerçek 24 dk (ilk gün); etiket "Yapı" | K1/T3 | T3 önerisi: "Süre · 24 dk (ilk gün; normalde 4 sa)"; etiket tür adı |
| **T-5** | Adım 5 | Boş rafta net −132 ve çift uyarı | K1 | Boş rafta üç satır gizli, tek uyarı (T3/T1 bulguları) |
| **T-6** | Adım 6 | Defter "tahılını sat" kalıyor; ilk_dukkan damgası ≤60 dk geç | T3/K2 | "Çiftliğinin tahılını Pazar'da sat." (T3 önerisi); gecikmeyi söyleyen bir şey yok (yeni kural önermiyorum) |
| **T-7** | Adım 2→3 | Defter sırası ilk saatte gıda fabrikasına yöneltirdi | baş lider | **Kapandı: karar "dükkândan sonra"** (Bölüm 2); uygulama K2 (Defter sırası) |

## 4. Oyuncu yolculuğuyla çelişenler (ayrı satırlar)

1. **Yolculuk (3588bd0, cd665f5'e göre) bayat:** `5c8e704`'te yapı market türü, cam fırını ve çelik doğrama (parça fabrikası), `ilk_ekmek` ve `ilk_pencere` ödülleri veride **var**; yolculukta "geliyor" yazıyor. P10'a göre tazelenecek.
2. **Zaman:** yolculuk dükkân kararını "≈25–50 dk" yazar; D0 kartı çiftlik başlar başlamaz çıktığı için dükkân **dk 4–5'te** de başlayabilir (ilk dükkân satışı ≈ dk 30).
3. **Yolculuk "kapatsan da biter" / "Çıkabilirsin" metinleri:** karelerde de görünmüyor (kodda yok, önceki satırla tutarlı).
4. **D3 "Süre 4 sa":** yolculuk "inşa ≈24 dk" der; kart ilk gün indirimini söylemiyor (T-4).
5. **Dükkân kareleri yolculukla çelişen başka bir şey göstermiyor:** bedel (4.200 ₺, çelik 14, parça 6, pencere 3), ilk 5 yapıda %30, kit 3 pencere, kampanya yok, 4 yuva ve raf akışı yolculukla uyumlu.

## 5. Doğrulanmayanlar

Tıklama sayıları (adım 2 ve 3), tahıl emrinin Gebze düğümünde komut panelinden verilebildiği ve "liman" şartının sağlandığı, çiftlik bitişinde bildirim olup olmadığı, ahır maliyeti (8.000 ₺ → indirimli 5.600 ₺ **hesap**), ilk dükkân satışının mal koyma komutundan hemen sonra oluştuğu (kaynak okuması), `dukkan-p11` karelerinin masaüstü karşılığı. Hepsi gözle ve insan testinde doğrulanacak.
