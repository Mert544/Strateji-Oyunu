# g7-protokol (K2) — 1. teslim: marka komut yolu

Dal `takim/k2/g7-protokol`. TABAN: K3 `takim/k3/g7-1b-komut` c08030f + entegrasyon d13ba4a'nin (gorunen-ad/ad-suzgec) gecici merge'i (`7e6c968`; merge commit rebase'te duser, bu commit'in kendisi temizdir).

- `sunucu.ts komutAl`: `marka_sifirla` yalniz yonetici (oyuncu: `yetki`, gunluge girmez); `marka_tanimla.ad` gunluge yazilmadan once `adKanonik` + yasakli ad suzgeci: gunluge KANONIK ad girer, ret `ad_gecersiz` / `ad_yasakli` (kodlar /giris/ad ile ayni), reddedilen komut gunluge girmez. `SunucuSecenekleri.adSuzgeci?`.
- `cli.ts`: yasakli ad listesi kimlik kipinden bagimsiz yuklenir (gorunen ad ile ayni suzgec instance'i sunucuya da verilir).
- `protokol`: `HataKodu` += `ad_gecersiz`, `ad_yasakli` (hata mesaji enum'u; eski istemci semasi bu iki kodu tanimaz: istemciler birlikte guncellenmeli, K1'e bildirim). Komut zod satirlari K3'un (3617f8e) satirlaridir, degismedi.
- Testler: `test/marka-komut-yolu.test.ts` (6) ve protokol hata kodu testi; sonuc: protokol 4 dosya + sunucu marka/giris-cli/metrik/gorunen-ad gecti, tsc/eslint temiz.
- 2. commit (G7-3 durum tipleri gelince): ilk_dukkan dedektoru, kare alanlari (raf gorunumu, IlceKaresi.talep?, kampanya, yikim, fiyatT), "sen yokken" satis kalemi, komut-sema K2 satirlari.
