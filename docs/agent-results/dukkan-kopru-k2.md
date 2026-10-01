# Istemci dukkan koprusu (K2) - takim/k2/dukkan-kopru

Taban `6e4b227` (K1 dukkan-duzelt), YALNIZ yeni dosyalar: `packages/istemci/src/harita/dukkan-kopru.ts` ve `packages/istemci/test/harita-dukkan-kopru.test.ts`. K1 dosyalarina dokunulmadi; kimse import etmiyor (harita.js etkisi 0, grep ile dogrulandi).

## Icerik
1. `dukkanGorunumuKur({ kare, param, referans, kurmaKarsilaniyor, bilinmeyenTur? })` -> `{ gorunum: DukkanGorunumu, yaklasik, dukkanNetMili, talep } | null`. Kaynaklar: `ozel.dukkanlar` (SahipDukkan/DukkanRaf), `genel.dukkanlar` (tur, olcek, marka tabelasi), `oyuncu.markalar`, `oyuncu.ilkSatisT`, `oyuncu.insaatlar` (ekYapi "dukkan" -> durum insaat), `ilceler[].talep`. Bos yuvada `fiyatT` korunur; `beklemeSaat` = `fiyatT + fiyatDegisimEnAzSaat` penceresinden kalan saat YUKARI (fiyatT 0 = serbest; cekirdek `hizSiniri` ile ayni). Kare/oyuncu yoksa null; `param.perakende` yoksa `kapali: true`.
2. §6.8b: `ihrNetPpm`/`ithNetPpm` (0,891 sabit degil, `param.pazar`: `islemKomisyonuPpm` opsiyonel, yoksa 0), `yuvaMili` (satis, gelir, NPC alternatifi, net), `dukkanNetMili`, `yatirimMili`, `odemeSaat` (yukari; net <= 0 -> null "geri odemez"), `asagiTL`. Net asagi, sure yukari.
3. G7 komut kuruculari: `rafKomutu`, `fiyatKomutu`, `markaKomutu`, `dukkanKurKomutu` (yapi_yerlestir, `siniflar`/`olcek` opsiyonel), `dukkanKurArsasizKomutu` (tesis_insa_hucre). Tamsayi olmayan girdi RangeError; cikti `Extract<Komut, ...>` ve testte `KomutSemasi` ile alan kaybi olmadan gecer.

## K1 icin notlar (uyusmazliklar ve kararlar)
- **727 ₺/sa yuvarlama:** A2 ornegi 726,6 ₺/sa (90 x 60 x 1,05 - 90 x 60 x 0,891 - 132); A2 tablosu EN YAKIN'a yuvarlayip 727 yazar. Kod mili tutar verir (726 600); `Math.round` 727, `asagiTL` 726. Ekranda "aşağı" kurali istenirse 726 gorunur. Negatif kampanya ornegi -353,4 (A2 "-353"), `asagiTL` -354.
- **Surmekte olan dukkan:** karede tur ve ilce YOK; `tur` = `bilinmeyenTur` (varsayilan "bakkal"), `id` = -insaat kimligi (ek yapi kimligiyle cakismaz; komutta kullanilmaz). Biten dukkanin `ilce` alani da kareden turetilemiyor (ek yapi -> ilce eslesmesi yok): `DukkanKaydi.ilce` bos birakildi.
- `gelirMiliSa` = Σ yuva geliri (nakit; `net = gelir - gider` K1 html'inin kullandigi tanim), `netMiliSaat` (yuva) ve `dukkanNetMili[id]` firsat maliyetli (§6.8b). `yaklasik` true ise referans fiyat taban fiyattan (ya da bilinmiyor): sayilar "yaklasik" etiketlenmeli.
- `referans(mal)` K1'in: `{ mili, yaklasik }` (kare `fiyat[malIndeksi]`, yoksa tabanFiyat + yaklasik). `kurmaKarsilaniyor` K1 planlayicisindan gecer.
- `talep` DukkanGorunumu'na sigmadigi icin ayri alan (`{ ilce, mal, qMiliSaat }[]`).

## Dogrulama
- `tsc` (gecici tsconfig, yalniz iki yeni dosya + .d.ts) temiz.
- vitest tek dosya, tek isci: `harita-dukkan-kopru.test.ts` 17/17 (gercek `ilgiKaresiCikar` karesi, A2 ornegi birebir: 726,6/727, 8.945 ₺ -> 13 sa, kademe 0,85 negatif; komutlar sema + cekirdek kabulu).
- harita.js / dunya.html gzip: 0 (hicbir modul bu dosyayi import etmiyor; olcum yapilmadi, kapi kosarken build yok).
