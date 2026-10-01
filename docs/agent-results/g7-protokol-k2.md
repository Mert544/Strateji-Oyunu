# g7-protokol (K2) — 1. teslim: marka komut yolu

Dal `takim/k2/g7-protokol`. TABAN: K3 `takim/k3/g7-1b-komut` c08030f + entegrasyon d13ba4a'nin (gorunen-ad/ad-suzgec) gecici merge'i (`7e6c968`; merge commit rebase'te duser, bu commit'in kendisi temizdir).

- `sunucu.ts komutAl`: `marka_sifirla` yalniz yonetici (oyuncu: `yetki`, gunluge girmez); `marka_tanimla.ad` gunluge yazilmadan once `adKanonik` + yasakli ad suzgeci: gunluge KANONIK ad girer, ret `ad_gecersiz` / `ad_yasakli` (kodlar /giris/ad ile ayni), reddedilen komut gunluge girmez. `SunucuSecenekleri.adSuzgeci?`.
- `cli.ts`: yasakli ad listesi kimlik kipinden bagimsiz yuklenir (gorunen ad ile ayni suzgec instance'i sunucuya da verilir).
- `protokol`: `HataKodu` += `ad_gecersiz`, `ad_yasakli` (hata mesaji enum'u; eski istemci semasi bu iki kodu tanimaz: istemciler birlikte guncellenmeli, K1'e bildirim). Komut zod satirlari K3'un (3617f8e) satirlaridir, degismedi.
- Testler: `test/marka-komut-yolu.test.ts` (6) ve protokol hata kodu testi; sonuc: protokol 4 dosya + sunucu marka/giris-cli/metrik/gorunen-ad gecti, tsc/eslint temiz.
- 2. commit (G7-3 durum tipleri gelince): ilk_dukkan dedektoru, kare alanlari (raf gorunumu, IlceKaresi.talep?, kampanya, yikim, fiyatT), "sen yokken" satis kalemi, komut-sema K2 satirlari.

# 2. teslim: kare alanlari, ilk_dukkan dedektoru, "sen yokken" satis

TABAN: ayni gecici merge'e (`7e6c968`) ek olarak K3 `takim/k3/g7-2-yerel-pazar` fd8e21e (G7-2 durum tipleri 43692cd + yerel pazar baglamasi) merge'i; rebase'te duser.

## Kare alanlari (hepsi ISTEGE BAGLI nesne alani; demetler buyumez; `PROTOKOL_SURUMU` ayni)
| Alan | Kime | Bicim |
|---|---|---|
| `genel.dukkanlar?` | herkese | `[id, tur, olcek, markaAd, simge, renk]` (tabela; markasizsa "" ve 0). Yikimda yapi listeden duser |
| `ozel.dukkanlar?` | sahibine | `[id, raf: [mal, fiyat, etkin, mevcut, istekMiliSaat, fiyatT][], kasaPpm, kampanya [bitis, kalanSaat, kalanGun], karsilanmaPpm]` — raf demeti `fiyatT` ile ILK tanimda tamam (sartname 10.2) |
| `oyuncu.markalar?` | kendisine | `[ad, simge, renk][]` (dizin = `DukkanDurumu.marka`) |
| `oyuncu.ilkSatisT?` | kendisine | `MulkOyuncuDurumu.ilkSatisT` (ilk dukkan satisi ani) |
| `ilce.talep?` | dukkani olan oyuncuya | `[mal, qMiliSaat][]` yalniz kendi raf mallari (G9 esnaf payi gosterimi; G7 kabulunu baglamaz) |
`KareKaynagi.baglam?` (Simulasyon saglar): `yerelPazarGorunumu` icin; yoksa ozel dukkan/talep yazilmaz. Dukkan yoksa tum yeni alanlar YAZILMAZ (kare eski kareyle bayt bayt ayni).
K1 ILK SATIS bildirimi icin kare alani: `oyuncu.ilkSatisT` (ilk gorunusu = ilk satis) ve devam eden satis icin `ozel.dukkanlar` raf `istekMiliSaat` (> 0) / `kasaPpm`; `ParaAkisi.yerel` karede YOKTUR (bildirim icin gerekmedi).
Testler: `protokol/test/kare-dukkan.test.ts` (9: dukkansiz kare ayni, tabela, sahip raf gorunumu, kampanya hakki, marka/ilkSatisT, talep, yikim ve delta, DONDURULMUS eski sema + demet uzunluklari, sema bicimi).
Not: `OzelBolgeKaresi.sebeke?` (G6, sartname 10.2) bu teslimde YOK (istenmedi); istenirse ayri kucuk commit.

## ilk_dukkan dedektoru (`sunucu/src/odul/dedektor.ts` DEGISTI: Operasyon'a bildirildi)
`ilk_dukkan` yer tutucudan cikti, `ODUL_IZGARA_KAVRAMLARI`'na girdi (zincir_kapandi'dan sonra); tetik ILK SATIS (GZ-14): tamamlanmis dukkan ek yapisi VE kumulatif dukkan geliri (`dukkanGeliri` sayaci + tembel `paraAkisi.yerel`) > 0. `dukkanGeliriTembel` disa acik. `ilk_sozlesme` yer tutucu kaldi. Dedektor hala yalniz `@bolge/cekirdek`'e bagli. Testler: `odul-dukkan.test.ts` (5; yapi bitisinde odul yok, ilk satista bir kez, yikim/yeniden kurulum tekrar vermez, Defter etkin), `odul.test.ts` (ilk_dukkan etkin).

## "Sen yokken" satis kalemi
`SonGorulen.dukkanGeliri?` (isteğe bagli; alan yoksa 0): `net.kalemler.satis` = ihracat farki + dukkan geliri farki; `satis + gider + diger = hazineFarki` korunur; `OzetIzleyici` gun siniri `satis_toplami` satisa dukkan gelirini katar (ticaret defteri olmayan dukkanli oyuncu da izlenir). Dukkansiz dunyada cikti eskisiyle ayni. Test: `donus-dukkan.test.ts` (4).

Sonuc: protokol 5 dosya + sunucu donus/odul/depolar/marka testleri 108 gecti; tsc/eslint temiz.
