# izgara-manifest (K1): arsa ızgarası ilçeleri manifestten

Dal: `takim/k1/izgara-manifest`, şimdilik `takim/o3/g3-izgara` (125c988) üzerinde HAZIRLIK; G3, K3 `hucre-dizini` ve K2 `izgara-yukle` girince güncel `entegrasyon` üzerine yeniden tabanlanır.

## Yapılan
- O3'ün yaması (SP/takim/o3-g3-istemci-yama.diff): `harita/veri.ts` `IZGARALI_ILCELER` `odbl/izgara/manifest.json`'dan türer (el ile ilçe tablosu yok); `scripts/derle.ts` harita verisi dosyalarını manifestten alır. Dosya listesi saf bir yardımcıya çıkarıldı: `scripts/harita-verisi-listesi.ts` (`haritaVerisiDosyalari`).
- `ornek/gebze-*` yolları tarandı: manifest Gebze için `ornek/gebze-hucreler.bhi.gz` ve `ornek/gebze-seritler.pmtiles` yollarını taşır (bilinçli: örnek dosyalar Gebze'nin üretim ızgarasıdır). `scripts/f4-sunucu.ts` ve `test/harita-f4-arsa.test.ts` Gebze yolunu manifestten okur. `test/harita-hucre.test.ts` BHI1 biçim sınaması için örnek klasörünü ve `gebze-olcum.json` ile tutarlılığı doğrudan okur: bilinçli kaldı (biçim ve ölçüm dosyası sınaması, ilçe tablosu değil).
- `test/harita-izgara-manifest.test.ts` (9 test): manifestteki her ilçe (Gebze, Gemlik, Körfez) için `izgaraVarMi` true ve tabloda fazla ilçe yok; tablo yolları manifestle aynı; `derle` listesi her BHI1 ve şerit dosyasını, manifesti ve lisansı içerir ve kaynakta bulunur; her BHI1 geçerli, çerçeve ve uygun hücre sayısı manifestle aynı.

## Bekleyen
- K3'ün BHI1 okuyucusu `@bolge/veri`'ye girince `harita/hucre.ts` `bhiCoz` ortak okuyucuya geçer (bu dalda yapılmadı).
- `pnpm dunya` gzip önce/sonra ve Playwright (harita-etkilesim, f4-uctan-uca): kapı boşken; hazırlık sırasında koşulmadı.
- İstemciye Node modülü ya da ağır bağımlılık girmedi; manifest JSON'u (~3 KB) harita yığınına gömülür.
