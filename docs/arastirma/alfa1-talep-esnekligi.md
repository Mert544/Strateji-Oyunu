# Alfa-1 notu: yerel talep esnekliği ve "üst kademe baskın" açığı

> **Durum.** A3 notu (Alfa-1 adayı; **Alfa-0'da hiçbir parametre ya da kod değişmez**). Baş lider kararı (kademe seçeneği A): "bilinen tasarım açığı, Alfa-1 esneklik notu". Kaynaklar: A2 `p4-p5-ekonomi.md` §1.9 (kademe tablosu, "Fiyat savaşı kendini cezalandırır"; `takim/kod/p6-tam`), Alfa-0 ekonomi izleme E11 (perakende primi, ZP3/A0-12; `alfa0-ekonomi-izleme.md`, c36bb43), A3 şartnamesi §6.4 (çekim), §6.5 (Q), §6.8b (net), §12.3 ZP3 (`takim/a3/p4-p5-sartname` 6beb93a). Sayılar **kâğıt modeldir** (aşağıda: A2 tablosunu birebir üretir); canlı doğrulama değildir **(doğrulanmadı: bot ve insan ölçümü)**.

## 1. Sorun

Çekimde ilçe toplam talebi `Q` **fiyata duyarsızdır**; dükkân fiyatı yalnız (a) dükkânlar ve esnaf arasındaki **bölüşümü** (ağırlık `(1/p)²`) ve (b) birim kârı (`p − 0,891 R`, fırsat maliyeti NPC ihracatı) değiştirir. Sonuç (A2 §1.9): fiyat arttıkça net her senaryoda artar; rasyonel oyuncu **1,15 R kademesine yığılır**; ZP3 primi 1,178'den (herkes 1,05) 1,291'e (herkes 1,15) çıkar. Alarm eşiği 1,30; kademe tavanı 1,15 olduğundan alarm **çalışamaz** (E11 notu: pratik alarm "1,15 payı ≥ %60 ve prim ≥ 1,25").

## 2. Kâğıt model ve doğrulaması

Tek ilçe, tek mal (ekmek, R = 60 ₺, esnaf fiyatı 1,12 R, esnaf taban payı %25), ağırlık `(1/p)^u × (1 + 0,25 c)` (çeşit c = 0,5), esnaf ağırlığı `(1/1,12)^u`, kasa 90 birim/sa, gider 132 ₺/sa, net = satış × R × (kademe − 0,891) − gider. **Doğrulama (A2 tablosuyla):** `u = 2`: şehir 1 dükkân [−353, 187, 727, 1.267] ₺/sa, kasaba 1 dükkân [−327, 127, 511, 831], şehir 5 dükkân (4 rakip 1,05) [−315, 92, 383, 592]: **hepsi A2 satırlarıyla aynı** (kademeler 0,85 / 0,95 / 1,05 / 1,15). Model A2'nin motorunu yeniden üretir; aşağıdaki karşılaştırmalar bu motor üzerindedir.

## 3. Kaldıraçlar ve ne yapabildikleri

**(a) Pay esnekliği: ağırlık üssü `u` (bugün 2).** 4 rakip 1,05'teyken tek dükkânın kademe başına neti (şehir, Q = 360):

| `u` | 0,85 | 0,95 | 1,05 | 1,15 | En iyi tepki |
|---|---|---|---|---|---|
| 2 (bugün) | −315 | 92 | 383 | **592** | 1,15 |
| 4 | −353 | 128 | 383 | 489 | 1,15 |
| 6 | −353 | 167 | 383 | 399 | 1,15 (1,05'le başabaş) |
| 8 | −353 | 187 | 383 | 320 | **1,05** |

**Simetrik (hepsi aynı kademe) Nash:** `u ≤ 6` her `k`'da 1,15; **`u = 8` yalnız `k = 5`'te 1,05** (şehir, kasaba, kırsal). `k = 1, 2` (tek/iki dükkân) için `u = 8`'de bile 1,15 **kalır**.

**(b) Hane toplam talep esnekliği η: `Q_eff = Q × (P0 / P)^η`** (`P` = ilçe fiyat endeksi: dükkân ve esnaf fiyatlarının ağırlıklı ortalaması, `P0 = 1,0 R`). Simetrik 5 dükkân, net/dükkân [0,85 / 0,95 / 1,05 / 1,15]: η = 0 [−265, 59, 383, 707]; η = 1 [−284, 65, 354, 601]; η = 2 [−305, 71, 327, 508]; η = 3 [−330, 78, 301, 427]. **Üst kademe η = 3'te bile 1,05'i geçer.** Neden: 1,05 → 1,15'te birim kâr `0,159 → 0,259 R` (**+%63**); sabit-esneklik talepte 1,15'in kaybetmesi için `(1,15/1,05)^η > 1,63`, yani **η > 5,4** gerekir (gıda ve zorunlu mallar için gerçekçi değil).

**(c) Az rakipli rejim (`k ≤ 2`): yerel tekel/ikili.** İki alt durum: (i) **kasa bağlayıcı** (şehir, kasa 90 < Q 360): dükkân zaten kasa sınırında satar, talep tarafındaki **hiçbir** kaldıraç (a ya da b) satışı kasanın altına çekemez (tek dükkânda 1,15'te bile havuz payı 270 > 90): yüksek fiyat saf marjdır. (ii) **Kasa bağlayıcı olmasa da** (kasa 400): `k = 1, 2` için en iyi tepki **`u = 6`'da bile 1,15** (şehir, tek dükkân net 2.010 → 2.608; ikili 1.156 → 1.707), çünkü sabit esnaf (1,12 R) tek rakiptir ve birim kâr artışı pay kaybını aşar. Yani tekel primi **kasa ölçeğinden bağımsız**dır; yalnız rakip sayısı (`k ≥ 5`, `u = 8`) onu çözer.

## 4. Sonuç ve öneri

1. **"Üst kademe baskın" yapısaldır**, tek bir esneklik parametresiyle kapanmaz: iki rejim var. **Çok rakipli** (`k ≥ 5`) ilçelerde `u` yükseltmek (8; 6'da baş başa) dengeyi 1,05'e çeker. **Az rakipli** (`k ≤ 2`) ilçelerde yüksek kademe tekel primidir; ne `u`, ne η, ne de kasa ölçeği bunu değiştirir (§3c).
2. **Önerilen Alfa-1 paketi (ölçüm koşullu):** (i) `fiyatUssu` parametresi `u = 2 → 6` ya da `8` (yalnız `perakende.talep`; bölge kipi etkilenmez; 6: baş başa, 8: 1,05 kesin); (ii) η **eklenmez** (kazanç küçük, karmaşıklık ve Ek B vektör yenilemesi büyük; η yalnız hane bütçesi invariantı istenirse); (iii) tekel primi **kabul edilir**: bandı 1,15 R'de tutan A2 kararı (ZP3 1,291 < alarm) geçerli kalır, **tavan sürekli ilçe kasa/talep oranına bağlanmaz**. Başarı ölçütü: E11'de 1,15 payı ≤ %60 (çok rakipli ilçelerde ≤ %40) ve prim ≤ 1,25.
3. **Tetik (karar baş liderde):** Alfa-0 canlı/bot ölçümünde E11 pratik alarmı (1,15 payı ≥ %60 ve prim ≥ 1,25) iki ardışık pencerede sürerse ve çok rakipli ilçelerde payın ≥ %60 olduğu görülürse `u`'ya geçilir; yalnız az rakipli (`k ≤ 2`) ilçelerde görülürse **hiçbir değişiklik yapılmaz** (tekel primi, tasarımın sonucu). Not: `u = 6`, `k = 5` için 1,15 ile 1,05 başabaştır (399 ↔ 383): çok rakipli ilçeyi **kesin** 1,05'e çekmek `u = 8` ister; öneri `u = 6` yerine `u = 8` olarak da okunabilir (karar ölçümde).
4. **Alternatif (kod gerektirmeyen):** üst kademeyi 1,15 → 1,10 R'ye çekmek tekel primini kısar (birim kâr `0,209 R`, +%31) ama çok rakipli ilçelerde baskınlığı çözmez ve oyuncu fiyat alanını daraltır; A2 "1,10 ara kademe" hesaplamadı. **Önerilmez** (kademe sayısı/sırası GZ-3, kalıcı).

## 5. Uygulama (karar çıkarsa; K3/K4, G7 sonrası)

- **Veri:** `param.mulk.perakende.talep.fiyatUssu?: number` (çift tam sayı ≥ 2; yoksa 2: bit-exact bugünkü davranış). V9'a eklenir: `fiyatUssu ∈ {2, 4, 6, 8}`; sınır dışı ret.
- **Çekirdek (tek yer):** `perakende/yerelPazar.ts` ağırlık işlevi: `agirlik(p, c) = ters(p)^u × (PPM + carpBol(250 000, c, PPM)) / PPM^(u−1)`; `ters(p) = floor(1e12 / p)`; `u` ≤ 8 olduğundan üs tekrarlı `carpBol(a, ters, PPM)` ile (kayan nokta yok; her adımda ppm); `esnafAgirlik` aynı üsle. `u` yoksa mevcut `kare(ters(p))` yolu. **Ek B vektörleri (V1-V5) yeniden üretilir** (referans betik `u` parametreli; `u = 2` vektörleri değişmez).
- **Durum/protokol/serileştirme:** yok (parametre). `kuralSurumu` veri commit'inde artar; mülk altınları (dükkânlı mülk senaryoları) raporlu güncellenir; bölge kipi altınları BİREBİR (perakende yalnız mülk kipinde).
- **Testler:** Ek B V1-V5 `u = 2` aynı; `u = 6` için bağımsız BigInt referans toplayıcı; kademe tablosu (§2) `u = 2` satırlarıyla birebir (kanıt: modelin motoru) ve `u = 6` en iyi tepkisi (4 rakip 1,05'te 1,15 neti ≈ 1,05 neti); `Σ s ≤ Q − floor(Q × tabanPay)` değişmezi; sıra bağımsızlığı; negatif kontrol: `fiyatUssu` yokken özet bugünkü ile aynı.
- **Ölçüm:** E11 (prim ve 1,15 payı, ilçe kırılımı: dükkân sayısı ve kasa doluluğu ile; kasa bağlayıcı ayrımı için `kasaDolulukPpm` = PPM olan dükkânların payı).

## 6. Geri dönüşü zor ve açık sorular

- **GZ adayı:** ağırlık üssü kalıcı mı? (`u` değiştirmek bot/ölçüm temel çizgilerini ve oyuncu alışkanlığını kaydırır; kural dönemi.)
- **Açık 1:** esnaf fiyatı (1,12 R) sabit kalmalı mı (esnafın kademe tepkisi Alfa-1 işidir ve tekel rejimini de etkiler)? Bu notta sabit.
- **Açık 2:** "yerel tekel primi" oyuncu algısı (az rakipli ilçede yüksek fiyatın neredeyse cezasız olması) kabul mü? Kasa ölçeğini büyütmek **çözmez** (§3c: kasa 400'de bile 1,15 en iyi tepki) ve geri ödemeyi/ZP8'i etkiler (E3, E5 üçgeni, izleme §8.1): bu ayrı bir ölçek kararıdır, esneklik çözümü değildir. Gerçek çare **rakip yoğunluğu** (ilçe başına oyuncu/dükkân sayısı artar ya da NPC esnaf tepkisi, Açık 1) ya da kademe sayısı/üst sınır kararıdır (GZ-3).
- **Açık 3:** η yalnız hane bütçesi invariantı (§12.3) için istenirse `η ∈ {1, 2}` tamsayı ve `P0 = 1,0 R` ile eklenir; fiyat endeksi `P` için ek bir ağırlık geçişi gerekir (maliyet küçük).

## Ek: model betiği

Doğrulama modeli 15 satırlık bir Python betiğidir (A2'nin tablosunu üretir): `ağırlık = (1/p)^u × 1,125`, `esnafAğırlık = (1/1,12)^u`, `esnafPayı = max(0,25; wE/(Σw + wE))`, `satış_i = min(Q (1 − esnafPayı) w_i / Σw, kasa)`, `net_i = satış_i × R × (p_i − 0,891) − gider`. Betik `SP/` altında tutulur; depoya girmez.
