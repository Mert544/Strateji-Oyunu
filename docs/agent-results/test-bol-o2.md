# Uzun olcum test dosyalarının bölünmesi: O2 teslim raporu

- Dal: `takim/o2/test-bol`; taban: `8064ded` (entegrasyon).
- Amaç: kapıdaki vitest'te `packages/olcum/test/harita-iklim.test.ts` (430 sn) ve `olcum.test.ts` (164 sn) tek işçide koştuğu için duvar saatinin darboğazıydı. İki dosya yedi dosyaya bölündü; kapı dosyaları paralel işçilere dağıtır.

## Değişen dosyalar (yalnız `packages/olcum/test/`)
| Dosya | İçerik | Test |
|---|---|---|
| `harita-iklim.test.ts` | CLI seçenekleri, iklim takvimi, harita seçimi (ucuz) + gerçek harita H1 ve sentetik harita | 13 |
| `harita-iklim-h3-takvim.test.ts` (yeni) | gerçek harita H3 + iklim seçeneği yansıması | 2 |
| `harita-iklim-determinizm.test.ts` (yeni) | gerçek harita H2, H5, H6, H7 ve determinizm | 5 |
| `harita-iklim-yardimci.ts` (yeni, test değil) | `kararli`, `semaDogru`, `baglamDogru` | |
| `olcum.test.ts` | ayrıştırıcılar, metrikler, H1/ortak yardımcılar + H1 bölge odağı, H5, H6, H7 | 25 |
| `olcum-h1.test.ts` (yeni) | H1 v0.2 | 1 |
| `olcum-h2-h3.test.ts` (yeni) | H2, H3 | 2 |
| `olcum-rapor.test.ts` (yeni) | rapor Markdown testleri | 2 |
| `olcum-yardimci.ts` (yeni, test değil) | `kararli`, `semaDogru`, `kisaSonuclar` | |

## Doğrulama
- **Test adı listesi farkı boş:** `vitest list` önce (2 dosya) ve sonra (7 dosya): 50 ad = 50 ad, sıralı `diff` boş. Test gövdeleri satır satır karşılaştırıldı: 50 testin hepsi aynı (tek fark `sonuclar.push(h)` satırlarının kalkması, aşağıya bakın). Hiçbir test atlanmadı, kısaltılmadı, koşula bağlanmadı; zaman aşımları ve beklenen değerler aynı.
- `tsc --noEmit -p tsconfig.json` ve `eslint` (yedi dosya + iki yardımcı) temiz.
- Yedi dosya koştu: 50/50 geçti. Dosya süreleri (yük ortalaması 13-14, `--minWorkers=1 --maxWorkers=2`): determinizm 119 sn, rapor 78, h3-takvim 61, h2-h3 47, olcum 42, h1 31, harita-iklim 27.
- Tam vitest duvar saati önce/sonra ölçümü AĞIR satırla ve kapı boşken yapılacak (kuyruk). Sonuç eklenecek.

## Geri dönüşü zor olmayan kararlar (rapora girmesi gereken)
1. `rapor Markdown üretir` ve `rapor: etiket ve önceki ölçümle karşılaştırma sütunları` testleri eskiden aynı describe'daki altı H testinin `sonuclar.push(h)` ile biriktirdiği sonuçlara bağlıydı. Dosyalar ayrılınca bu bağ kurulamaz; testler sonuçları yardımcıdaki `kisaSonuclar()` ile (`beforeAll`) kendisi üretir: aynı seçenekler, aynı sıra (H1 v0.2, H2, H3, H5, H6, H7), koşular deterministik. Rapor dosyası bu yüzden altı koşuyu bir kez daha yapar (~60 sn işlemci); toplam iş biraz artar, duvar saati düşer.
2. `determinizm` testi aynı dosyadaki H2, H5, H6, H7 sonuçlarını (`ayri`) ikinci koşuyla karşılaştırdığından o beş test aynı dosyada ve aynı sırada kaldı (en uzun dosya, ~90 sn sakin / ~120 sn yükte). Daha fazla bölmek için determinizm testinin kendi birinci koşularını yapması gerekir; bu test içeriğini değiştirir, yapılmadı.
3. Aynı `describe` başlıkları birkaç dosyada tekrarlanır (test adları değişmez).

## Açık sorular
Yok.
