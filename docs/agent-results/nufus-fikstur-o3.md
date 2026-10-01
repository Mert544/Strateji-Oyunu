# nufus-fikstur: ilçe nüfusu girdisi ve fikstüre yazım (G7, O3)

Dal `takim/o3/nufus-fikstur`, taban `07684f6` (K4 `ilce-nufus-sema`: `ParselIlceTanimi.nufus?`, V9b). Kapı iki dalı birlikte alır.

## Ne yapıldı

- `packages/veri-hatti/yapilandirma/ilce-nufus.json`: T3'ün `nufus-ilce.json` verisi (45 ilçe, yıl 2025) + kaynak, lisans, doğrulama notu ve il toplamları. ODbL dizininin dışında.
- `packages/veri-hatti/src/osm/ilce-nufus.ts`: şema (zod, sınır `ILCE_NUFUS_ENCOK` `@bolge/veri`'den), `ilceNufusOku`, `ilceNufusu`, `fiksturaNufusYaz(fikstur)`: kimliği veride olan ilçelere `nufus` yazar (anahtar sırası sabit, `uygunHucre`'den sonra), girdiyi değiştirmez, kimliği olmayan ilçeye dokunmaz (mini-6 ve sentetik fikstürler bit bit aynı), fikstürde farklı değer varsa veri kazanır ve sayılır.
- `packages/veri-hatti/test/ilce-nufus.test.ts` (11 test): 45/45 hiyerarşi eşleşmesi, yalnız Kocaeli, Sakarya, Bursa; sınır ve tamsayı; ilçe toplamları il toplamlarıyla birebir; bozuk girdi reddi; kanonik dosya; fikstür yazımı (mini-6 değişmez, gerçek kimlikle yeniden adlandırılmış küçük fikstür `dogrulaParselFiksturu`'dan geçer, idempotent).
- `DATA_SOURCES.md` §10: nüfus satırı (liderin verdiği metin aynen) ve dosya yolu.

## Doğrulama

`vitest run packages/veri-hatti/test/ilce-nufus.test.ts` 11 test geçti; `tsc --noEmit` ve `eslint packages/veri-hatti` temiz; `veri-hatti/test/belge.test.ts` ve `veri/test/parsel-nufus.test.ts` geçti (aşağıdaki çıktı).

## Kapsam notu ve açık nokta

Depoda gerçek ilçe kimlikli (tr_*) bir parsel fikstürü DOSYASI yoktur: `mini-6` ve `sentetik-50` sentetiktir, Gebze fikstürü çalışma anında ızgaradan kurulur (`istemci/scripts/f4-sunucu.ts`; sunucu için G3b/izgara-yukle). Bu yüzden bu dalda fikstür dosyası değiştirilmedi (A2'nin ölçüm temel çizgisi bozulmasın); `nufus` yazımı fikstürü kuran her araç için işlevdir (`fiksturaNufusYaz`) ve veri JSON'u doğrudan okunabilir. Izgara manifestine nüfus (`ParselIzgaraIlce.nufus?`) K4'ün G7-1a dalını bekler; ayrı iş olarak verilecek.
