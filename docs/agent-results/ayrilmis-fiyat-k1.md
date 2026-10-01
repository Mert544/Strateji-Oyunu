# ayrilmis-fiyat (K1): ayrılmış hücre fiyatı önizlemeyi çekirdekle aynı yapar

Dal: `takim/k1/ayrilmis-fiyat`, taban `takim/k1/g2-olcek` (5cb9ab4). Çekirdek doğru çalışıyor; hata istemcideydi.

## Sorun
Çekirdek (`hucreFiyatiMili`): ayrılmış hücre TABAN fiyattan satılır ve ilçe eğrisini ilerletmez; normal hücrenin eğrisi `satilmisHucre − ayrilmisSatilmis + k` ile gider. İstemci her hücreyi normal sayıyor, `satilmis`'in tamamını eğriye veriyordu: ayrılmış hücre içeren hazır arsa, yapı yerleştirme ve (G2) ölçek büyütme önizlemesi gerçek bedelden ayrışıyordu, ayrılmış hücre hiç ayırt edilmiyordu.

## Karede ne var (K2 kararı: `takim/k2/kare-ayrilmis`)
- `IlceKaresi.ayrilmisAdet` (sayı) her zaman; `IlceKaresi.ayrilmis: string[]` (satılmışlar dahil tüm ayrılmış hücreler) yalnız `abone {ayrilmis:true}` ile, değişmez, bir kez.
- `IlceKaresi.ayrilmisSatilmis?: number` (para ile satılmış ayrılmış sayısı; 0 ise yazılmaz) K2'nin dalında. İstemci varsa onu, yoksa liste varken satılmış ∩ ayrılmış tahminini kullanır.
- Liste YALNIZ oyuncunun ayrılmış hakkı sürerken istenir (`kare.oyuncu.mulk.ayrilmisBitis` gelecekte; kare gelince abonelik bir kez yenilenir). Hak bitince liste istenmez: ayrılmış hücre yalnız katılım ilçesinde ve ilk günlerde satılır, başka durumda fiyat zaten normal eğridir.

## Değişenler
| Dosya | Değişiklik |
|---|---|
| `harita/fiyat.ts` | `hucreFiyatiMili(sinif, ilce, k, ayrilmis)` ve `parselToplamFiyatiMili(sinif, ilce, normal, ayrilmis)` (çekirdek aynası; `ayrilmisSatilmis` sayacı); `ayrilmisHakki` (yeni oyuncu ve katılım ilçesi kuralı, çekirdek `alimPlani` koşulları); `alimTuru` (normal / ayrılmış / bu oyuncuya kapalı + Türkçe neden). `parselFiyatiMili` aynen (ayrılmışsız davranış değişmez). |
| `harita/arsa.ts` | saf `arsaFiyati` (gorunum'dan çıkarıldı): sınıf başına adım, her adım `satilmis` ve `ayrilmisSatilmis` sayaçlarını ilerletir; hakkı olmayana ayrılmış hücre içeren arsa kapalı. |
| `harita/yapi.ts` | `yerlesimPlani`: ayrılmış hücre taban fiyat; hakkı yoksa hücre geçersiz (çekirdekle aynı ret); `ParselAdimi.ayrilmis`. |
| `harita/olcek.ts`, `olcek-kipi.ts` | G2 ek hücre planı: aynı fiyat ve aynı hak kuralı. |
| `harita/baglanti.ts`, `baglanti-ws.ts` | `IlceSahipligi.ayrilmis` ve `.ayrilmisSatilmis`; `MulkOzeti.ayrilmisBitis` ve `.katilimIlcesi`; ws: `abone {ayrilmis:true}` (hak sürerken), listeyi küme olarak önbellekler, `parselAl` tahmini ayrılmış bilgili. |
| `harita/gorunum.ts`, `yerlesim.ts` | hak hesabı; hazır arsa, hücre fiyatı ve kipler ayrılmış bilgili; veri adları: arsa/hücre GeoJSON özelliklerine `ayrilmis: 1` (ayrılmış olmayanda alan hiç yazılmaz), yeni `ayrilmis` kaynağı (görünür kutudaki SATILMAMIŞ ayrılmış hücreler; katman yok, boya `stil.ts`'te T1/T2), hücre ipucu ve arsa ipucu verisine `ayrilmis: boolean`, hücre kartında "Ayrılmış: taban fiyat, katılımının ilk 14 günü" alanı (hak bitince hiç gösterilmez), ipucu metni "… · ayrılmış hücre: taban fiyat". |

Boya ifadesi yazılmadı; `stil.ts`, `.css` değişmedi.

## Testler
- `test/harita-ayrilmis.test.ts` (18): çekirdek `hucreFiyatiMili`/`parselToplamFiyatiMili` ile birebir (üç sınıf, dört ilçe durumu, k=0..3, normal ve ayrılmış); eğriyi ilerletmeme; ayrılmışsız hücrede eski formül; hak koşulları; hazır arsa (tek ve iki sınıf, hak yoksa kapalı, sınırlar ve hazine eskisi gibi); yapı yerleşimi; ölçek büyütme.
- `test/harita-ayrilmis-ws.test.ts` (2, GERÇEK sunucu, katılım ilçesinde iki yeni oyuncu; veli ayrılmış hücreleri para ile alıp sayacı artırır): (a) hazır arsa (1 ayrılmış + 2 normal), (b) yapı yerleştirme (çiftlik: biri ayrılmış, biri normal; atomik `yapi_yerlestir`), (c) ölçek büyütme (tek aday ayrılmış hücre): her birinde önizlenen bedel gerçek hazine düşüşüne BİREBİR eşit, arsa kısmı ayrıca çekirdeğin `parselToplamFiyatiMili`'siyle aynı, sunucudaki `ayrilmisSatilmis` beklenen değer (2 → 3 → 4 → 5). İkinci test: hakkı bitmiş oyuncuda ayrılmış hücre planda kapalı ve sunucu aynı nedenle reddeder.
- K2'nin `takim/k2/kare-ayrilmis` dalıyla geçici birleştirilip koşuldu (kesin sayaç): yeşil; dalsız (tahmin) de yeşil.
- Tüm istemci: 34 dosya, 378 test geçti (atlanan yok); tsc ve eslint temiz.

## Bilinmeyen koşullar ve bulgular
1. **Hesap başına tavan (12 ayrılmış) ve günlük ilçe tavanı** önizlemede yok: istemci hesabın kendi `ayrilmisHucre` sayacını ve ilçenin günlük sayacını bilmez. Sunucu reddeder ve ret zaten Türkçe çevriliyor (`hata-mulk.ts`).
2. **Tahmin sınırı (K2 alanı yokken):** satılmış ∩ ayrılmış, yurdun bedelsiz verdiği ayrılmış hücreyi (yalnız ayrılmışsız bağlı küme kurulamazsa) de sayar; kesin sayaç karedeki `ayrilmisSatilmis`'tir.
3. **İlk-yapı indirimi yapı önizlemesinde yok (ayrı bulgu):** çekirdek ilk 5 yapıda para ve malzemeden %30 düşer; `yerlesimPlani` indirimsiz bedeli gösterir (ör. çiftlik 6.000 ₺, gerçek 4.200 ₺). Mevcut e2e metinleri bu değeri bekliyor, bu yüzden dokunulmadı; testte indirim kapatıldı. İstenirse `indirimliYapiKalan` ile ayrı iş.
4. Hücre aracıyla (`satinAlmaOzeti`, Shift/çoklu seçim) toplam her hücre için aynı eğri noktasını kullanıyor (artımlı değil) ve ayrılmışı bilmiyor; ileri düzey araç, bu işte yok.
5. Hak yokken liste istenmediğinden başka ilçelerde ayrılmış hücreler "kapalı" işaretlenemez; sunucu ret mesajı yeterli.
6. Vitest "kapı koşarken" kuralı gereği Playwright ve `pnpm dunya` koşulmadı; kapıda koşulur. Yeni kod harita yığınındadır.

## Geri dönüşü zor karar
Yok (yalnız ekleme; protokolde istemci tarafı değişiklik yok, `abone.ayrilmis` zaten şemada).
