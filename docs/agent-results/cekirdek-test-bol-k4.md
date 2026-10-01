# cekirdek-test-bol (K4)

Dal: `takim/k4/cekirdek-test-bol`. Taban: `entegrasyon` de9959c.

## Ne yapıldı
`packages/cekirdek/test/serilestir-kurtarma.test.ts` (3 test) ve `serilestir-yeniden-oynatma.test.ts` (6 test) üçer dosyaya bölündü; kapıda paralel koşabilirler. Test içeriği, adları, sayısı ve beklenen değerler birebir aynıdır (atlama ya da kısaltma yok). Ortak hazırlık iki yardımcı modüle taşındı (`*-ortak.ts`, `.test.ts` eki yok; vitest bunları test saymaz).

| Eski dosya | Yeni dosya | İçerik |
|---|---|---|
| serilestir-kurtarma.test.ts | serilestir-kurtarma-nokta.test.ts | "20 rastgele nokta" (1 test) |
| | serilestir-kurtarma-kill9-sentetik.test.ts | kill -9, sentetik-50 (1 test) |
| | serilestir-kurtarma-kill9-gercek.test.ts | kill -9, gercek harita (1 test) |
| | serilestir-kurtarma-ortak.ts | `kayit`, `noktalar`, `killDokuzTesti` (gövde aynen) |
| serilestir-yeniden-oynatma.test.ts | serilestir-yeniden-oynatma-sentetik.test.ts | basarili komutlar, sentetik-50 (1 test) |
| | serilestir-yeniden-oynatma-gercek.test.ts | basarili komutlar, gercek harita (1 test) |
| | serilestir-yeniden-oynatma-yan-etki.test.ts | "basarisiz komut yan etkisizdir" betimlemesi, 4 test (gövde eski dosyayla satır satır aynı; diff boş) |
| | serilestir-yeniden-oynatma-ortak.ts | `basariliYenidenOynatmaTesti` (gövde aynen) |

Betimleme (describe) adları her dosyada eskisiyle aynıdır; bu yüzden tam test adları değişmedi.

## Doğrulama
- Önce/sonra tam test adı listesi (vitest JSON, `fullName`, sıralı): FARK BOŞ, 9 = 9 test, 9 geçti, 0 kırık, 0 atlanan.
- `eslint packages/cekirdek/test/serilestir-*.ts`: 0 hata. `tsc --noEmit -p .`: 0 hata.
- Süre (tek işçi, kapı koşarken yüklü makine; dosya başına duvar saati):
  - Önce: serilestir-kurtarma 76,5 sn; serilestir-yeniden-oynatma 68,5 sn. En uzun dosya 76,5 sn.
  - Sonra: nokta 38,0; kill9-sentetik 22,9; kill9-gercek 17,1; yeniden-oynatma-sentetik 14,8; -gercek 34,3; -yan-etki 28,1 sn. En uzun dosya 38,0 sn; toplam iş aynı (6 dosya paralel koşunca kapıdaki alt sınır en uzun dosyadır).
  - (Görev notundaki 207 / 164 sn kapıdaki ölçümdür; bu tablo yüklü makinede tek işçiyle alındı, oran geçerlidir.)

## Geri dönüşü zor karar
Yok. Eski iki dosya silindi (git geçmişinde duruyor).

## Açık soru
Yok.
