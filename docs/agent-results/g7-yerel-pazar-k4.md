# g7-yerel-pazar (K4): yerel pazar algoritması, saf modül

Dal: `takim/k4/g7-yerel-pazar`. Taban: `entegrasyon` 7553b55. Kaynak: şartname `takim/a3/p4-p5-sartname` 4e0844a, §6.4-6.6, §6.5, §7.5b (etkin kademe), Ek B.

## Ne yapıldı
Yalnız iki yeni dosya (çekirdeğin hiçbir mevcut dosyasına dokunulmadı; ekonomiye/çözüme bağlama YOK, G6 sonrası ayrıca kararlaştırılacak):
- `packages/cekirdek/src/perakende/yerelPazar.ts`: saf modül, dünyaya/içeriğe bağlı değil; tamsayı ve PPM (`carpBol`), kayan nokta ve rastgelelik yok.
  - `ilcePaylastir` / `yerelPazarHesapla`: §6.4 Adım 2-6 (çeşit, ağırlık `ters`/`kare`/`cesitC`/ölçek çarpanı, ilçe x mal su-doldurma en çok 32 tur, son kırpma geçişi, Adım 5 havuz üst sınırı, satırlar, `dugumIstek`, `dugumGider`).
  - `yuvaAgirligi`, `esnafAgirligi`, `fiyatKaresi`, `cesitOrani`: ağırlık yardımcıları (okuma API'si de kullanır).
  - `etkinKademe` (§7.5b): kampanya etkinken kampanya kademesi, bitince varsayılan; durum değişmez.
  - Talep Q (§6.5): `ilceSinifiBaskin`, `talepTabani`, `bayramCarpani`, `yerelTalep`.
  - Gelir (Adım 7): `yerelSatisGeliri` (gercek, brut, gelir; karşılanma tanımsızsa gercek = istek).
- `packages/cekirdek/test/yerel-pazar.test.ts`: 16 test.

## Sıralama kuralları (modül başlığında açık yazılı)
İlçeler: kimlik dize sırası; ilçe içinde dükkânlar (oyuncu dize sırası, `ekYapi` sayısal) ve aynı çift iki kez gelirse hata; yuvalar dizideki sıra; mallar dize sırası; kalan birimler (dükkân sırası, yuva indeksi) ile dağıtılır; çıktı satırları (dugum, mal, ekYapi, yuva). Girdi dizileri modül içinde sıralanır: sonuç girdi sırasından bağımsızdır (testli).

## Testler (şartname tablo örnekleri, fazlası değil)
- Ek B V1, V2, V3, V4 birebir: `w_A` 1 125 000, `w_B` 964 504, `w_esnaf` 797 193, `s_A` 116 916, `s_B` 100 236 (V1); `w` 1 133 783, `s` 90 000 (V2); 50 000 / 90 000 (V3); A ekmek 22 715 + gida 67 284, B ekmek 90 000 (V4). Hepsi ilk koşuda şartnamedeki sayılarla çıktı.
- Değişmezler: sıra bağımsızlığı, `Σ s <= Q - floor(Q x tabanPay)`, `top_j <= kasa_j`, satır sırası, stoksuz/boş yuva çekime girmez, yinelenen dükkân reddi, düğüm gideri toplamı, büyük sayı (Q 1e9 x w 1,1e6; BigInt yolu).
- §6.5: ilçe sınıfı (baskın, eşitlikte büyük, uygun yoksa tüm hücreler), taban, bayram sınırları (`[B-Do, B-1]`, `[B, B+Ds-1]`), `yerelTalep` (takvim x bayram; tarım kapalıyken takvimsiz), §7.5b etkin kademe, Adım 7 gelir.
- NEGATİF KONTROL: (1) V3 vektörü tek geçişli kırpmayı ayırt etmez (B'nin payı zaten kasaya sığar); bu yüzden ayrı bir test: A kasası 50 000, B kasası 500 000 iken tek geçişli kırpma B'ye 110 983 verirdi, su-doldurma 146 789 verir. (2) Kasıtlı bozmalar: tur sayısı 1 (su-doldurma yok) negatif kontrol testini, kalan birimin ters sırada dağıtımı V1'i, bayram sonrası penceresinin bir gün kısalması bayram sınır testini kırdı. (3) Esnaf taban payı kaldırılınca hiçbir test kırılmadı: Adım 5 üst sınırı onu zaten kapsıyor (denk mutant; tabanın sayıyı değiştirdiği tek yer ara hesaplardır).

## Doğrulama
vitest (tek işçi, hedefli) `yerel-pazar.test.ts` 16/16; eslint (modül + test) 0 hata; `tsc` modül ve test için hata vermedi (worktree'nin `node_modules` dizinleri başka bir K4 worktree'sine sembolik bağ olduğundan paket genelinde tsc anlamlı değil, kapıda koşar). Ölçüm koşulmadı.

## Kararlar ve gözlemler (Kod lideri / A3 için)
1. **Referansla birebir tek uyuşmazlık noktası:** şartname betiğinde bir turda `Qr <= 0` olan mal için donmamış yuvaların `s` değeri ÖNCEKİ turdan kalır (güncellenmez); metin "bu mal bu turda atlanır" der. Modül aynen böyle (birebir). Bu yalnız `Q` çok küçükken (mili-birim düzeyinde) ve donmuş dükkânlar talebin tamamını almışken oluşur; Adım 5 üst sınırı toplamı yine sınırlar. İstenirse eski değeri sıfırlamak tek satırdır, ama vektörlerde etkisi yoktur.
2. **Satırlara yalnız `istek > 0` olan yuvalar yazılır** (§6.4 Adım 6 bunu belirtmez; `h.dukkan` toplamı değişmez). Okuma API'si (§6.8) `mevcut`/`esnafPay`/`q` için ayrı hesap isteyecektir.
3. **`mevcut` (Adım 1) ve ilçeye gruplama (Adım 0) çağıranın işidir** (dünyaya bakar): modül `YerelYuva.mevcut` ve `YerelIlce` ister. Bağlama sırasında `fiyatPpm` = `fiyatKademeleriPpm[etkinKademe(...)]` olarak verilmelidir.
4. `ilceSinifiBaskin`: hücre yoksa (uygun ve tüm sayımlar 0) "kirsal" döner (şartname bu köşeyi yazmamıştır).
5. `yerelTalep` içinde `takvimAyi` çağrılmaz (dünya gerektirir): çağıran `ay` (0-11 ya da tarım kapalıysa null) verir.

## Geri dönüşü zor karar
Yok (yeni dosyalar; hiçbir yerden çağrılmıyor, kuralSurumu ve altınlar etkilenmez).

## Açık soru
Yok.

## Güncelleme (A3 8d6a615: §6.4 SIFIRLA, §6.5 ilçe nüfusu; Kod lideri onaylı)
- `turPayi(Qr, ws, wE, tabanPayPpm)` ayrı saf işlev (şartname Ek B): `Qr <= 0` ise HERKES 0 (eski tur payı taşınmaz); aksi halde esnaf taban paylı havuz, kalan birimler sıralı +1. Ana döngü artık bunu çağırır (`Qr <= 0` dalında eski turun `s` değeri taşınmaz: önceki "birebir betik" davranışı bu güncellemeyle sıfırlama kuralına geçti). `ilcePaylastir`'a isteğe bağlı `izle` geri çağrısı (test/ölçüm): her (tur, mal) için `Qr`.
- Testler: V5 (`Qr` 0 ve -7 -> `[0, 0]`; 300 000 -> `[116 916, 100 236]`), `turPayi` üst sınır, "her turda `Qr >= 1`" (3 000 rastgele küçük-Q girdisi, A3 taramasının küçük kopyası), V1-V4 AYNEN geçiyor.
- §6.5: `ilceSinifiBaskin` KALDIRILDI (hücre sınıfı hesaplanmaz); yerine `ilceNufusEsdegeri({ nufus?, sinif }, ilceSinifiNufus) = nufus ?? ilceSinifiNufus[sinif]` (saf; iki yol testli). `talepTabani` üçüncü argümanı nüfus eşdeğeridir (`yerelOlcek` 40 verideki parametredir; kodda sabit yok).
- Negatif kontrol: `Qr <= 0` korumasını kaldırma V5'i, `nufus` yolunu kaldırma nüfus testini kırdı. vitest hedefli 19/19, eslint temiz.
