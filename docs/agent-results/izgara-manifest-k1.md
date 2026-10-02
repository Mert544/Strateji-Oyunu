# izgara-manifest (K1): arsa ızgarası ilçeleri manifestten

Dal: `takim/k1/izgara-p10` (taban 838d7fa, P9 sunucu-varsayılan üstünde); G3 manifesti ve ızgara dosyaları entegrasyondadır. İlk hazırlık commit'i (b11db4a → ab36220) çakışmasız taşındı.

## Yapılan
- O3'ün yaması (SP/takim/o3-g3-istemci-yama.diff): `harita/veri.ts` `IZGARALI_ILCELER` `odbl/izgara/manifest.json`'dan türer (el ile ilçe tablosu yok); `scripts/derle.ts` harita verisi dosyalarını manifestten alır. Dosya listesi saf bir yardımcıya çıkarıldı: `scripts/harita-verisi-listesi.ts` (`haritaVerisiDosyalari`).
- `ornek/gebze-*` yolları tarandı: manifest Gebze için `ornek/gebze-hucreler.bhi.gz` ve `ornek/gebze-seritler.pmtiles` yollarını taşır (bilinçli: örnek dosyalar Gebze'nin üretim ızgarasıdır). `scripts/f4-sunucu.ts` ve `test/harita-f4-arsa.test.ts` Gebze yolunu manifestten okur. `test/harita-hucre.test.ts` BHI1 biçim sınaması için örnek klasörünü ve `gebze-olcum.json` ile tutarlılığı doğrudan okur: bilinçli kaldı (biçim ve ölçüm dosyası sınaması, ilçe tablosu değil).
- `test/harita-izgara-manifest.test.ts` (9 test): manifestteki her ilçe (Gebze, Gemlik, Körfez) için `izgaraVarMi` true ve tabloda fazla ilçe yok; tablo yolları manifestle aynı; `derle` listesi her BHI1 ve şerit dosyasını, manifesti ve lisansı içerir ve kaynakta bulunur; her BHI1 geçerli, çerçeve ve uygun hücre sayısı manifestle aynı.

## Bekleyen
- K3'ün BHI1 okuyucusu `@bolge/veri`'ye girince `harita/hucre.ts` `bhiCoz` ortak okuyucuya geçer (bu dalda yapılmadı).
- `pnpm dunya` gzip önce/sonra ve Playwright (harita-etkilesim, f4-uctan-uca): kapı boşken; hazırlık sırasında koşulmadı.
- İstemciye Node modülü ya da ağır bağımlılık girmedi; manifest JSON'u (~3 KB) harita yığınına gömülür.

## P10 (Gemlik ve Körfez istemcide açık)
- Gemlik ve Körfez kartlarındaki "Arsa ızgarası yakında" rozeti: `izgaraVarMi` artık manifestten (ab36220) olduğu için üç ilçe de "hazır" ("Hazır arsalar var"); `durumRozeti` kuralı değişmedi (izgara var ve sunucuda yoksa dışında "hazır"). Yerleş skoruna izgara +0,5 üç ilçeye de uygulanır.
- `gorunum.ts` ızgarasız ilçe ipucu "(örnek: Gebze)" ekini kaybetti.
- Gerçek sunucu testi `test/harita-izgara-ws.test.ts` (4): sunucu dünyası CLI ile aynı kurulur (manifest → BHI1 → gerçek veri); üç ilçede de oyuncu katılır (yurtsuz), istemci planlayıcısı kamu bloklarıyla (Gemlik'te kıyı şeridi kamu arsası) geçerli yer bulur, atomik `yapi_yerlestir` (arsa alımı + Çiftlik) başarılı, önizlenen toplam gerçek hazine düşüşüne birebir eşit, sahiplik sunucuda. Tek dosya ≈ 7 sn.
- `scripts/f4-sunucu.ts`: `manifestIzgara` seçeneği (CLI kurulumunun aynısı). `scripts/f4-uctan-uca.ts`: DERYA adımı (Gemlik'e yerleş: kart "hazır", "Burada başla", varışta hazır arsa, arsa satın alma, sunucuda sahiplik, Yapı kur menüsü; 7 kontrol). Yerelde KOŞULMADI (Playwright penceresi yok); adımı kapı doğrular.
