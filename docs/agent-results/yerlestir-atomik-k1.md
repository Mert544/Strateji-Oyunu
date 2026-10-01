# Yapı yerleştirme: her durumda tek atomik komut (K1)

Dal: `takim/k1/yurt-once` (K4 `yerlestir-cok-sinif` 7b13b86 ve 959f910 cherry-pick, üstüne bu commit). Baş lider şartı: arsa + yapı iki sınıfa düşse de tek atomik işlem; yarım alım kabul edilmez.

## Yarım alım yolu doğrulaması (önce)

Eski `zincir.ts`: `plan.parseller.length > 1` (hücreler iki arsa sınıfında; `yapi_yerlestir` tek `sinif` alır) ya da atomik komut yokken `parsel_al` adımları alınıyor, ardından `tesis_insa_hucre` reddedilirse arsa oyuncuda kalıyordu ("Arsa alındı ... ama yapı kurulamadı"). P5 f4 bulgusu bunun belirtisiydi.

## Değişiklik

- `zincir.ts` `yerlesimiUygula`: bağdaştırıcı `atomikYerlestirme()` diyorsa HER durumda tek `yapi_yerlestir`; birden çok sınıfta `siniflar` (`hucreler` ile hizalı; sahip olunan hücre için komutun `sinif` değeri, çekirdek sınıfını denetlemez). Yapı reddedilirse `alinan: []`, "... kurulamadı: ... Hiçbir şey değişmedi." Atomik komut yoksa arsa alan yerleşim YAPILMAZ (hiç komut gitmez, `neden: "desteklenmiyor"`); arsasız yerleşim (yurt) `tesis_insa_hucre` ile kurulur (alım yok, yarım durum yok). `parselZinciri` yalnız hazır arsa satın almada kalır (yapı içermez).
- `yapi.ts` önizleme fiyatı çekirdek `alimPlani` ile BİREBİR: hücreler kimliğe (dizge) göre sıralı, her biri KENDİ sınıfında, artımlı eğri sırası yalnız ayrılmamış hücrelerde ilerler (ayrılmış taban fiyat). Eski önizleme sınıf sırasıyla (kırsal önce) fiyatlıyordu; iki sınıfta toplam farklı çıkabilirdi. Tek sınıfta toplam aynı. `ParselAdimi` artık yalnız gösterim gruplaması.
- `baglanti.ts` `YerlestirIstegi.siniflar?`; `baglanti-ws.ts` komuta `siniflar` ekler; `atomikYerlestirme()` şemanın `siniflar` alanını TANIDIĞINI da denetler (zod bilinmeyen alanı sessizce atar; eski sunucu yanlış sınıfla alırdı). Sahte bağdaştırıcı hücre başına sınıf ve sıralı fiyatla çalışır.

## Testler (hedefli, tek dosya, 1 işçi; tsc ve eslint temiz)

- `harita-yerlestir-cok-sinif-ws.test.ts` (yeni, GERÇEK sunucu): `sn_m_sehir_merkez`'te kırsal + kasaba komşu hücreler (Ahır): tek atomik komut, önizleme toplamı çekirdek hazine düşüşüne birebir eşit, hücreler kendi sınıfında, tek inşaat; ayırt edici çift seçilir (eski sınıf sırası farklı toplam verirdi: test duyarlı); yapı reddedilirse hiçbir sınıftan arsa alınmaz.
- `harita-f4-ws`: gerçek sunucuda iki ret yolu (veli'nin hücreleri, yanlış yuva) ve başarı tek komutla; sunucuda hücre/inşaat sayıları; atomik komutu olmayan bağlantıda hiç `parsel_al` gitmez.
- `harita-zincir.test.ts` (7), `harita-f4-yapi` (17): iki sınıfta tek komut ve `siniflar` hizası, tek sınıfta `siniflar` yok, ret `alinan: []`, atomik yok → hiç komut.
- Geçenler: harita-yurt, yurt-ws, ayrilmis, ayrilmis-ws, olcek, olcek-ws, f4-yerles, f4-arsa, f4-yetisme, mulk-panel, tasarim.

f4-uctan-uca betiği DEĞİŞMEDİ (tek atomik `yapi_yerlestir` beklentisi doğru); kapıda koşacak. Kapı durumu: Playwright ve pnpm dunya koşulmadı.
