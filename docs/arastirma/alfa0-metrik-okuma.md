# Alfa-0 ekonomi metrikleri: K2 gauge'larıyla nasıl okunur (A2; O3 `alfa0-isletim` kılavuzuna ek)

> **Kapsam.** [Ekonomi izleme listesindeki](alfa0-ekonomi-izleme.md) (b48af88) E-numaralı metriklerin **canlı `/metrik`'ten** okunuşu. Eşikler ve "kırmızıda ilk ayar" **orada**; burada yinelenmez. Gauge adları K2 dallarında yazılı olanlardır: K2-1…K2-7 `takim/k2/ekonomi-metrik` 85fee4b, K2-9 `takim/k2/k2-9-kademe` (gauge'lar e2c5161, dal ucu 4d0f171). **Entegrasyona girene kadar `/metrik` ekonomi alanı sunmaz** (bugün yalnız sistem ve ödül sayaçları); girince adlar kesinleşir. Adı K2'de olmayan şey için **(ad K2'de kesinleşmedi)** yazıldı, uydurulmadı. Hesap: kâğıt, doğrulanmadı (K2 dalı koşulmadı).

## 0. Okuma kuralları

- **Birim:** para gauge'ları **mili-para** (÷ 1000 = ₺); satış gauge'ı mili-birim/saat. Oranlar birimsizdir.
- **Tür:** `bolge_para_*_mili`, `bolge_kasa_*_mili` ve `bolge_sermaye_hazine_farki_mili` **kümülatif gauge**'dır (sayaç değil): pencere için `delta(m[7d])` kullanın (`increase` değil). **İlk 7 gün** pencere dolmadan: `delta` yerine metriğin kendisi (dünya başlangıcından birikimli) kullanılır.
- **Etiketler:** yalnız `kalem`, `mal`, `tur`, `yontem`, `komut`, `kaynak` (`insan` | `bot`), `ceyrek`, `kademe`, `hedef`, `sinir`. **Oyuncu ve ilçe etiketi yoktur**; oyuncu ve ilçe kırılımı **O2'nin günlük oynatmasının** işidir (`insan-cikarma.ts` ekonomi çıktısı, O2-1…O2-3).
- **Kalemler kendiliğinden görünür:** `yerelNpc` (musluk) ve `sebeke` (lavabo, kasa girişi) P4 kodu girince ilk birikimde ortaya çıkar; sorgular regex ile yazıldığından kalem yokken de çalışır (0).
- **Tazelik:** sunucu ölçümü en çok 10 sn'de bir yeniler; kazıma aralığı 60 sn önerilir. `bolge_sim_zamani_ms / 8.64e7` = dünya yaşı (gün).
- **Yeniden başlama:** sermaye gauge'ları sunucuda tutulur ve kurtarma oynatmasıyla yeniden kurulur (doğrulanmadı); yeniden başlamadan sonraki ilk 10 dakikayı atlayın.
- **Bölge kipi / para defteri yok:** `bolge_para_*` ve `bolge_kasa_*` aileleri yazılmaz (satır yoksa sorgu boş döner, hata değildir).

## 1. Özet tablo

| E | Metrik | Kaynak gauge (K2) | Pencere | Eşik | Gauge yetmezse (O2 oynatma) |
|---|---|---|---|---|---|
| E1 | R (para dengesi) | `bolge_para_lavabo_mili{kalem}`, `bolge_para_musluk_mili{kalem}` (K2-1) | 7 gün kayan; ilk 7 gün birikimli | [E1](alfa0-ekonomi-izleme.md#e1-r) | ilçe ve oyuncu kırılımı |
| E2 | r (yeniden yatırım) | `bolge_sermaye_hazine_farki_mili{komut,kaynak}` (K2-7) + E1 paydası | 7 gün | [E2](alfa0-ekonomi-izleme.md#e2-r) | **oyuncu medyanı** (p10–p90): gauge dünya toplamı verir |
| E3 | ZP8 | `bolge_para_musluk_mili{kalem="yerelNpc"\|"ihracatNpc"}` (K2-1) | 7 gün; iki ardışık pencere | [E3](alfa0-ekonomi-izleme.md#e3-zp8) | ilçe kırılımı |
| E11 | ZP3 / A0-12 prim, 1,15 payı | `bolge_dukkan_kademe_satis{kademe}`, `bolge_dukkan_kademe_sayisi{kademe}` (K2-9) | anlık ve 24 sa ortalama | [E11](alfa0-ekonomi-izleme.md#e11-perakende-primi-zp3-a0-12-ve-kademe-dağılımı) | ilçe ve oyuncu kırılımı |
| E6 | M (değirmen payı) | `bolge_tesis_yontem{tur,yontem}` (K2-4) **yalnız tesis oranı** | anlık | [E6](alfa0-ekonomi-izleme.md#4-zincir-e6-m) | **asıl M tanımı:** oyuncu başına, ilk 7 gün, ≥ 24 sa, tetikte yalnız seçici bot |
| E9 | Bakım: aşınma | `bolge_tesis_asinma_ppm{tur,ceyrek}`, `bolge_tesis_asinma_adet{tur}` (K2-5) | anlık, dünya yaşına göre | [E9](alfa0-ekonomi-izleme.md#6-bakım-e9-aşınma-ve-c) | **bakımlı/bakımsız oranı** (gauge yok) |
| E7 | Kamu kasaları | `bolge_kasa_bakiye_mili`, `bolge_kasa_giris_mili{kalem}`, `bolge_kasa_cikis_mili{hedef}`, `bolge_kasa_sayisi` (K2-2) | 7 gün (a), 28 gün (b) | [E7](alfa0-ekonomi-izleme.md#e7-kamu-kasaları) | **ilçe başına kapasite karşılama** |
| E8 | Fiyat sınırı | `bolge_pazar_fiyat_taban_orani{mal}`, `bolge_pazar_sinirda_mal{sinir}` (K2-3) | 24 sa medyan, 48 sa kesintisiz | [E8](alfa0-ekonomi-izleme.md#e8-fiyat-sınırına-dayanan-mal-sayısı) | — |

## 2. Sorgular (PromQL; Grafana'ya doğrudan yapıştırılır)

**E1 R** (lavabo = `isletme` + `sebeke` + `araziVergisi` + `harcama` + `arsa`; ihracat = `ihracatNpc` + `yerelNpc`; ithalat = `ithalatNpc`; hibe ve ödül paydaya girmez):

```promql
# 7 gün kayan
sum(delta(bolge_para_lavabo_mili{kalem=~"isletme|sebeke|araziVergisi|harcama|arsa"}[7d]))
/ ( sum(delta(bolge_para_musluk_mili{kalem=~"ihracatNpc|yerelNpc"}[7d]))
  - sum(delta(bolge_para_lavabo_mili{kalem="ithalatNpc"}[7d])) )
# ilk 7 gün (birikimli): her delta(...[7d]) yerine yalnız metrik
# bilgi (R_kasa): payda aynı, paya  + sum(delta(bolge_kasa_giris_mili{kalem="sebeke"}[7d]))  ekleyin
```

**E2 r** (dünya toplamı; yatırım = sermaye komutlarında komut öncesi − sonrası hazine farkı, `parsel_al`, `yapi_yerlestir`, `tesis_insa_hucre`, `tesis_olcek_yukselt`, `kenar_gelistir`; `genel_onarim` ve `arama_sondaji` dahil değil):

```promql
sum(delta(bolge_sermaye_hazine_farki_mili[7d]))
/ ( sum(delta(bolge_para_musluk_mili{kalem=~"ihracatNpc|yerelNpc"}[7d]))
  - sum(delta(bolge_para_lavabo_mili{kalem=~"ithalatNpc|isletme|sebeke|araziVergisi"}[7d])) )
# yalnız insan oyuncu: pay  sum(delta(bolge_sermaye_hazine_farki_mili{kaynak="insan"}[7d]))
# yatırım dağılımı (çeyrek 25/50/75/100, kimliksiz, kümülatif): bolge_sermaye_insan_oyuncu_mili{ceyrek}
```

Eşik oyuncu **medyanı** içindir (E2); gauge dünya toplamı verir, bot ve insan paydada karışır. Oyuncu medyanı r için payda (oyuncu başına net kâr) gauge'da yok: **O2 oynatması**.

**E3 ZP8:**

```promql
sum(delta(bolge_para_musluk_mili{kalem="yerelNpc"}[7d]))
/ sum(delta(bolge_para_musluk_mili{kalem=~"yerelNpc|ihracatNpc"}[7d]))
# alarm: bu oran > 0.5 iki ardışık 7 günlük pencerede (kayıt kuralı adı O3'ün: zp8_7g > 0.5 and zp8_7g offset 7d > 0.5)
```

**E11 ZP3 / A0-12 prim ve 1,15 payı** (`kademe` = kademe indeksi: 0 = 0,85 kampanya, 1 = 0,95, 2 = 1,05, 3 = 1,15 R; çarpanlar `fiyatKademeleriPpm` verisidir, K2 yalnız indeks yazar; `satis` kasa kırpmalı **istek**tir, gerçek satış stoğa bağlı daha düşük olabilir):

```promql
# prim (hedef 1.05-1.20; kademe tavanıyla en çok 1.291)
( 0.85*sum(bolge_dukkan_kademe_satis{kademe="0"}) + 0.95*sum(bolge_dukkan_kademe_satis{kademe="1"})
+ 1.05*sum(bolge_dukkan_kademe_satis{kademe="2"}) + 1.15*sum(bolge_dukkan_kademe_satis{kademe="3"}) )
/ sum(bolge_dukkan_kademe_satis) / 0.891
# 1,15 payı (satış)        sum(bolge_dukkan_kademe_satis{kademe="3"}) / sum(bolge_dukkan_kademe_satis)
# 1,15 payı (dolu yuva)    sum(bolge_dukkan_kademe_sayisi{kademe="3"}) / sum(bolge_dukkan_kademe_sayisi)
# pratik alarm: 1,15 payı >= 0.6 ve prim >= 1.25 (24 sa:  avg_over_time((...)[24h:5m]))
```

**E6 M** (yalnız tesis oranı; **tetik M'si bu değildir**):

```promql
sum(bolge_tesis_yontem{tur="gida_fabrikasi",yontem="degirmen"})
/ sum(bolge_tesis_yontem{tur="gida_fabrikasi"})
```

Tetik tanımı (bot kuralları 3479b55): ilk 7 günde ≥ 24 sa `degirmen` tesisi olan oyuncu / ≥ 1 fabrika kuran oyuncu, **yalnız seçici botlar**: oyuncu başına zaman gerekir, gauge yok ⇒ **O2 oynatması**. `yontem_degistir` deneme payı (E6 neden ayrımı) komut türü etiketi olmadığı için `bolge_komut_toplam`'dan okunamaz: **O2 oynatması**.

**E9 aşınma** (aşınma ppm; çıktı kaybı = ppm × `asinmaVerimKaybiTavaniPpm` 250.000 / 1e12; k aşamalı zincir `1 − (1 − x)^k`):

```promql
# ekmek zinciri (k=3) çıktı kaybı, medyan; eşik gün 14 <= 0.12, gün 45 <= 0.32
1 - (1 - avg(bolge_tesis_asinma_ppm{tur=~"ciftlik|gida_fabrikasi",ceyrek="50"}) / 1e6 * 0.25) ^ 3
# dünya yaşı (gün): bolge_sim_zamani_ms / 8.64e7   (tüm oyuncular aynı gün katılırsa tesis yaşına yakın; sonradan katılanlar için yanıltır)
# ters kırmızı: gün 45'te  bolge_tesis_asinma_ppm{ceyrek="50"} < 50000
```

**Bakımlı/bakımsız oranı** (E9; baş lider kararı: oran < 1,1 ⇒ karar baş liderde): oyuncu başına bakım düzeyi gauge'da yok ⇒ **O2 oynatması** (`--bakim-ozet`, O2-1). Gauge yalnız aşınmayı gösterir.

**E7 kamu kasaları** (kasa sayısı tüm sahipleri sayar: mahalle, ilçe, il; ilçe başına karşılama için **O2 oynatması**):

```promql
# (a) dünya ortalaması kapasite karşılama: 0,5 x haftalık giriş / v0 çekirdek sipariş hacmi (23.381 ₺ = 23.381.000 mili / hafta)
0.5 * sum(delta(bolge_kasa_giris_mili[7d])) / sum(bolge_kasa_sayisi) / 23381000
# (b) birikim: bakiye / 28 günlük musluk (ilk 28 gün: paydada delta yerine bolge_para_musluk_mili)
sum(bolge_kasa_bakiye_mili) / sum(delta(bolge_para_musluk_mili[28d]))
# şebeke kasa payı (beklenen ~ 0,12): sum(bolge_kasa_giris_mili{kalem="sebeke"}) / (sum(bolge_kasa_giris_mili{kalem="sebeke"}) + sum(bolge_para_lavabo_mili{kalem="sebeke"}))
```

**E8 fiyat sınırı** (alt <= 0,26 x taban, üst >= 1,74 x taban):

```promql
# sınırdaki mal sayısı, 24 sa medyan (eşik: 0 yeşil, 1-2 sarı, >= 3 kırmızı)
quantile_over_time(0.5, sum(bolge_pazar_sinirda_mal)[24h:5m])
# 48 sa kesintisiz sınırda olan mallar (kırmızı)
max_over_time(bolge_pazar_fiyat_taban_orani[48h]) <= 0.26
min_over_time(bolge_pazar_fiyat_taban_orani[48h]) >= 1.74
```

**E10 ödül** (ek; mevcut sayaç): `increase(bolge_odul_reddedilen_toplam[1h]) > 0` kırmızı; ödül toplamı `bolge_odul_musluk_mili` (K2-6, oyuncu başına ≤ 8.000 ₺ için oyuncu sayısı gauge'ı yok: **O2 oynatması**).

## 3. Gauge ile okunamayanlar (tek listede)

| Metrik | Neden | Karşılık |
|---|---|---|
| E4 ilk dükkân süresi, E5 geri ödeme | oyuncu başına zaman ve dükkân başına satış miktarı yok (K2-8 bekliyor) | O2 oynatması (`DukkanDurumu.kurulus`, `ilkSatisT`) |
| E2 oyuncu medyanı r, E6 tetik M'si, E9 bakım oranı | oyuncu etiketi yok (gizlilik/kardinalite kararı) | O2 oynatması (ekonomi çıktısı, O2-1…O2-3) |
| E7(a) ilçe başına karşılama, E3/E11 ilçe kırılımı | ilçe etiketi yok | O2 oynatması (`Dunya.mulk.para.kasalar`, `yerelPazarGorunumu`) |

## 4. Kontrol listesi (O3 için)

1. `/metrik`'te `bolge_para_musluk_mili`, `bolge_kasa_bakiye_mili`, `bolge_pazar_fiyat_taban_orani`, `bolge_tesis_yontem`, `bolge_sermaye_hazine_farki_mili`, `bolge_dukkan_kademe_satis` satırları var mı (yoksa dünya mülk kipinde değil ya da sürüm eski).
2. R sorgusunun paydası > 0 (ihracat − ithalat); ilk saatlerde boş ya da sıfıra bölme olabilir: ilk 24 saatte R okunmaz.
3. n < 5 oyuncuda sarı/kırmızı verilmez (izleme listesi kuralı); N < 4 dünyada dilim büyüktür (E1, E3, E8 kâğıtla karşılaştırılmaz).
4. `bolge_para_*_mili` birikimli azalıyorsa (restart) ilgili pencereyi atlayın.
