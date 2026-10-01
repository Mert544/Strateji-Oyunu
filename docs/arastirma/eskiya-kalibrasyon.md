# Eşkıya (askeri 0a/0b) sayılarının kâğıt-model kalibrasyonu (A2)

> **Durum.** 1 Ekim 2026. Öneridir; karar baş liderindir. Kaynak: A3 `takim/a3/askeri-0a` 281a332 `askeri-0a-sartname.md` §4.1–§4.2 (öneri değerleri) ve `askeri-katman-v1.md` §3.2–§3.6, Ek A, Ek C. Kâğıt model (`docs/arastirma/eskiya-kalibrasyon-hesap.mjs`, çıktı `eskiya-kalibrasyon-hesap-cikti.md`; çekirdek ve bot koşulmadı). Ekonomi sabitleri A2'nin ekmek zinciri oyuncusundan (günlük net 117.053 ₺, brüt 140.000 ₺; `yerel-talep-kalibrasyon.md` §7, `yerelOlcek` 40); oyuncu dağılımı T3 nüfus tablosundan (ADNKS 2025, ikincil derleme, doğrulanmadı). Kilitli: L2 (PvP yağmada %60 saldırana, %40 yok; mülkte ikmal ×0,25) bu belgede PvP'yi kapsamaz (Alfa-1).

## 1. Cevaplar ve öneri

| Parametre | 0a önerisi | **A2 önerisi** | Gerekçe |
|---|---|---|---|
| `servetEsigiMili` | 250.000 ₺ | **250.000 ₺** (aynı) | Tek yeni oyuncu ilçesi (servet ≈ 72 bin ₺) baskın görmez; 3–4 oyuncu kalkan sonunda eşiği geçer; tek oyuncu servet ≥ 250 bin olunca (r = %25'te ≈ gün 8) baskın alır |
| `servetAdimiMili` | 250.000 ₺ | **500.000 ₺** | Boy temposu: tipik ilçede (3–4,4 oyuncu, r = %25) boy gün 8: 1–2, gün 14: 2–3, gün 21: 3–5, gün 30: 5–8. 250 bin'de gün 8'de boy 3–4 ve boy 8'e gün 15–22'de varılır (savunmasız yeni oyuncuya fazla erken) |
| `enCokBoy` | 8 | **8** (aynı) | Tam savunma maliyeti boy 8'de oyuncu başı (n = 4) haftalık net gelirin %2,7'si; sınır mantıklı |
| `boyGucu` | 100 | **100** (aynı) | Piyade Tümeni gücü 100 (`icerik.json`); Nöbet Evi 100 ve Karakol 100/50 ile birimdeş; değiştirmek hepsini kaydırır |
| `gunlukOlasilikPpm` + `beklemeGun` | 333.333 + 4 | **250.000 + 5** | Etkin ilçe aralığı 6 → 8 gün; ilçe başına haftada 1,14 → 0,88 baskın; 7 günde 2 baskın %26 → %9; en çok 2 (bekleme ≥ 4 olduğu sürece) |
| `yagmaOraniPpm` ve `yapiDevreDisiPpm` | 100.000 / 100.000 | **250.000 / 250.000** | Savunmasız kayıp günlük netin %13'ü (0a) → %32'si (n = 4); 0a'da boy ≥ 6 savunması kendini ödemez (aşağıda) |
| `ganimet` | muhimmat 3.000, yakıt 2.000 / boy | **aynı** | Defans başına günlük netin %0,56'sı, hazinenin %0,02–0,07'si: musluk olarak ihmal edilebilir (AH4 ≤ %1 güvende) |

**Sorulan sayılar.**
- **Haftalık baskın:** öneride (p = 1/4, bekleme 5) ilçe başına **0,88**; 7 günlük kayan pencerede oyuncu **en çok 2** baskın görür (tek ilçede; %9), tipik 1 (%71), 0 (%20). Birden çok ilçede yapısı olan oyuncu için ilçe sayısıyla çarpılır.
- **Savunmasız kayıp (n = 4):** 38.013 ₺ = **günlük netin %32'si** (üçte biri; stok 3 gün olursa %47; tek oyunculu ilçede %55). 0a değerleriyle %13.
- **Ganimet ve yağma kaybı / hazine:** kayıp gün 8'de hazinenin %4,0'ı, gün 14'te %2,1, gün 30'da %1,1 (hazine para olarak yağmalanmaz, karşılaştırma içindir); ganimet (boy 4) %0,02–0,07. Kayıp / ganimet ≈ 60×.
- **Bedelin geri dönüşü** (A2 değerleri; ilçe n = 4, λ = 0,88): **Nöbet Evi** kamu yapısıdır (bedel 0). **2 Karakol** (15.680 ₺ + 2.352 ₺/hafta) boy 1–2'de **0,1–0,2 haftada** kendini öder; boy ≥ 3'te yetmez (Karakol 1.–2. = 150 güç, boy 3 için 340 gerekir). **Ordugâh** (35.000 ₺) ve tümenlerle tam savunma boy 3–8'de **0,6–3,5 haftada** öder. 0a değerleriyle boy ≥ 6'da tam savunma **hiç ödemez** (haftalık işletme beklenen kayıptan büyük).

## 2. Model

- **Servet:** oyuncu serveti = 72.000 ₺ (P4 yapıları taban değeri + 7 hücre) + r × günlük net × gün (yeniden yatırım yapıya taban değeriyle girer); ilçe serveti = oyuncu sayısı × servet (kalkan 7 gün; kalkanlı sayılmaz). Boy = min(`enCokBoy`, ⌊S ÷ adım⌋), S < eşik ⇒ 0.
- **Baskın süreci:** ilçe başına günlük planlama (S ≥ eşik, son planlamadan ≥ `beklemeGun`), olasılık p, baskın planlamadan 2 gün sonra. 3 tohum, 35 gün, 45 ilçe, 200 oyuncu (ilçe başına oyuncu T3 nüfusuyla orantılı: medyan 3, ortalama 4,4, en çok 27).
- **Çözüm:** Gs·Us ≥ Gb·Ub, Us ve Ub bağımsız U[0,9; 1,1]: kazanma %50 (Gs = Gb), %86 (1,1), **%100 (≥ 1,22)**. Savunma gücü: Nöbet Evi 100 + Karakol 100 + 50 + tümen × 100.
- **Kayıp:** stok yağması = yağma oranı × ilçe payı (1/n) × stok (1 günlük brüt) + devre dışı yapı = oran × günlük net × 1 gün; birlik kaybı (%15) ordusuz oyuncuda 0.
- **Maliyetler** (AK Ek A): Ordugâh 35.000 ₺ (+ birlik kapasitesi 12), Karakol 7.840 ₺ (+168 ₺/gün ikmal), Kule 4.100 ₺, Piyade tümeni 8.700 ₺ (+1.752 ₺/gün, ikmal ×0,25 dahil).

## 3. Bulgular

1. **Savunma bir sigortadır, kârlı yatırım değildir; 0a kayıp değerleri sigortayı fazla ucuz tutar.** Kayıp günlük netin %13'ü iken boy ≥ 6'da tam savunma haftalık işletmesi beklenen haftalık kaybı aşar: büyük baskınlara kimse savunma kurmaz, "boy 6–8" fiilen savunmasız yağmadır. Kayıp %32'ye çıkınca boy 8'e kadar savunma 3,5 haftada öder ve karar gerçek bir seçim olur.
2. **Karakol boy ≤ 2'de çözümdür, boy ≥ 3'te yetmez** (150 güç). Bu süreklilik kırığıdır: boy 3'ten itibaren Ordugâh + tümen gerekir (59.380 ₺ tek seferlik, haftalık 14.616 ₺). `servetAdimiMili` 500 bin ile boy 3'e tipik ilçede ≈ gün 21'de varılır, yani oyuncunun Ordugâh kurma zamanı vardır.
3. **Savunma kamu malıdır:** Karakol ve Nöbet Evi ilçedeki herkesi korur; tümen sahibine yazılır ama `Gs` ilçede toplanır. Tek bir oyuncunun tüm maliyeti üstlenip herkesin kayıp önlemesi **bedava binici** sorunudur; 2 Karakol (15.680 ₺) ucuz olduğu için bu boy ≤ 2'de çözülür, boy ≥ 3'te oyuncular arasında koordinasyon gerekir (A3 §6 Ordugâh paylaşımı yok).
4. **Oyuncu başına yük n'den bağımsızdır:** boy ∝ n × servet_i, savunma gücü gereği ∝ n; yani yoğun ilçe (n = 10) boy 8'e gün 13'te varır ama kişi başı haftalık maliyet n = 4'le aynıdır (net gelirin %2,7'si). Tek oyunculu ilçe boy ≤ 2'de kalır.
5. **Bekleme sayacı tanımı ortalama aralığı 6 ile 8 gün arasında oynatır:** AK "4 gün bekleme + ortalama 3 gün = 7"; sayaç planlamadan sayılırsa (burada) 6 gün (p = 1/3, bekleme 4), baskın anından sayılırsa 8 gün. A3 §4.1 tanımı netleştirmeli.

## 4. Sınırlar (doğrulanmadı)

Stok değeri (1 günlük brüt) ve oyuncu davranışı (savunmayı ne zaman kurduğu) varsayımdır; asıl belirsizlik stoktur (3 günlük stokta kayıp %47). Oyuncular yapı yerine hücre yatırımı yaparsa servet farklı büyür. Çekirdek ve bot koşulmadı; 3 tohum × 7 gün doğrulaması 0b botları gelince yapılır (bir ölçüm: yağma kaybı / günlük net ve baskın başına oyuncu sayısı).

## 5. Geri dönüşü zor kararlar

| # | Karar | Neden zor | Öneri |
|---|---|---|---|
| E-1 | `askeri.eskiya.*` parametre adları ve `ganimet` tablosu biçimi | 0a ad kilidi (A3 L3); sonradan ad değişimi serileştirmeyi ve doğrulayıcıyı kırar | Adlar kilitli kalsın; **değerler** (eşik, adım, olasılık, yağma) veri değişikliğidir, kolay geri dönüşlü |
| E-2 | Bekleme sayacının tanımı (planlamadan mı, baskından mı) | Çekirdek davranışı; ortalama aralığı 6 ↔ 8 gün oynatır | A3 yazsın; öneri: son **baskın günü**ndan sayılsın, `beklemeGun` buna göre (ortalama aralığı doğrudan okunur) |
| E-3 | Savunma gücü kaynağının (Karakol/Nöbet Evi) kamu malı olması ve paylaşım kuralının olmaması | Oyuncular arası koordinasyon yoksa bedava binici; sonra paylaşım eklemek canlı dünyada davranışı değiştirir | 0b'de ölçülsün (AH1); gerekirse Karakol maliyetinin ilçe kasasına bağlanması Alfa-1'e |
| E-4 | Yağma ve yapı devre dışı oranlarının kayıp ölçeği (günlük netin ~üçte biri) | Oyuncu algısı ve sigorta ekonomisi; hazine eğrisini etkiler (%1–4) | Parametre; ilk bot ölçümünde (n = 4, stok 1–3 gün) doğrulanıp ayarlansın |
| E-5 | Servet birimi (taban değer, stok hariç) ve boy formülü | AK kararı; ilçe servetinin tanımı oyuncu davranışını (servet dağıtma) belirler | Değişmesin; `servetAdimiMili` parametre |
