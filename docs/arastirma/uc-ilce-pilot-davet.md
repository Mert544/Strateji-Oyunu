# "Üç ilçe" dilimi: pilot ve davet planı (K9 ve ilçe başına ölçüm)

> **Durum.** Yalnız belge; hiçbir şey koşulmadı. Dilim: `sonraki-dilim-onerisi.md` (K5, K9). Temel: A1 pilot paketi `insan-testi-pilot-paketi.md` (080f670; S1 60 dk, S1b, S2, G15, 5 kişi); A2 `alfa0-acilis-riskleri.md` (SP/takim/a2), `alfa0-zincir-karlilik.md` §4.2, `alfa0-ekonomi-izleme.md` E4/E5, `alfa0-metrik-okuma.md` (f78f1b4). Sayılar kâğıt modeldir (doğrulanmadı).

## 1. Gemlik ve Körfez pilot oturumu (A1 protokolünden farklar)

Aynen kalır: betik S1.1–S1.9, S1b, S2, G15; yönetici hiçbir ekranı adlandırmaz; ekmek, cam-pencere ve dükkân zorunlu değil; ölçütler hipotezdir (Geçti/Belirsiz/Kaldı/Ölçülmedi, k = ⌈oran × 5⌉); katılımcı tek kullanımlıktır. **Dağılım (5 kişi):** Gemlik 2, Körfez 2, Gebze 1 (üretim yapılandırmasında karşılaştırma; bugün Gebze'nin yurtlu akışı yalnız fikstürde koşar). Sunucu: üretim yapılandırması (gerçek harita + manifest, botsuz) ayrı test dünyasında `test_<ad>`; sürüm commit'i forma.

| Adım | Fark | Gözlem (forma eklenir) |
|---|---|---|
| Başlık (§2.1) | Yeni alan **ilçe** (`katilimIlcesi`) ve **katılım → "Yurdun hazır" kartı süresi** (sn) | Yurt araması gerçek ızgarada ilk kez koşar (K2): süre ve zaman aşımı |
| S1.2 İlçe seçimi | Yönetici ilçe önermez; pilot atamasını davet metni yapar (§2), ekran serbest. Beklenen: ilk üç kart Gebze, Gemlik, Körfez | YA1 (sınıf/kilit sandı mı); neden bu ilçe (imza, nüfus, doluluk, açılış önerisi); "Başka ilçe öner"de Kandıra/Hendek/İnegöl "ızgara yakında" (açılmaz) görüldü mü ve tıklandı mı |
| S1.3 Yurt | 6 bitişik ücretsiz hücre, gerçek ızgarada (Gemlik liman/kıyı, Körfez sanayi dokusu) | Yurdun konumu mantıklı mı (merkeze yakın, kıyı/yol/askeri engel çıkmadı); hücrelerin haritada doğru çizimi; YA2/YA3 |
| S1.4–S1.6 | Çiftlik `ova` etiketi şartı il bazlı olabilir (Gemlik Bursa, Körfez Kocaeli; doğrulanmadı) | "il etiketi yetersiz" benzeri ret; arsa sınıfı karışımına göre maliyet kartı sayıları; ilk tahıl satışı süresi |
| S1.8b Dükkân | İlçe nüfusu talebi belirler (Gemlik 124 400, Körfez 183 077; ekmek Q ≈ 299 / 439 birim/sa) | `ilkSatisT − kurulus`; D-5 "neden satmıyor" (kasa/stok); satış hızı ilçeler arası fark; kademe seçimi (YA11) |
| S1.7 / açılış | Gemlik önerisi "pazar", Körfez "sanayi" (`yerles.ts:54,56`) | Öneriye uydu mu, "bir sınıf değil" notu anlaşıldı mı |
| S2 | Aynı; "Sen yokken" dükkân satırı | A0-13 |

n = 5'te ilçe başına 2 kişi **ölçü değil gözlem** verir; K9'un kabulü: en az bir oturum Gemlik'te, bir oturum Körfez'de, ilk satış ≥ %70 (≤ 1 sa).

## 2. ~20 davetin üç ilçeye dağılımı (yalnız davet metni; Yerleş seçimi serbest)

| İlçe | Nüfus | Ekmek Q (birim/sa)¹ | En çok dükkân sahibi k (geri ödeme ≤ 48 sa)² | Öneri |
|---|---|---|---|---|
| Gemlik | 124 400 | 299 | 4 | **5** (+2 yedek) |
| Körfez | 183 077 | 439 | 6 | **6** |
| Gebze | 414 960 | 996 | 14 (A2 notu: ≥ 23 oyuncuda aşar) | **9** |

¹ `Q = 60 × nüfus × 40 / 1e6` (`alfa0-zincir-karlilik.md` §4.2). ² Aynı tablonun formülü: `s = min(90, 0,75 Q / k)`, `ek net = 9,54 s − 132`, şehir yatırımı 16 582 ₺ ⇒ `s ≥ 50`; k = 3 satırıyla doğruladım (şehir 120 bin: 29,9 sa). En kötü durum: herkes aynı ilçede aynı malı (ekmek) satar, oyuncu başına 1 dükkân; gerçekte mal ve kuran payı dağılır. Gebze için A2'nin ≥ 23 değeri benim 14'ümden büyük: varsayım farkı (doğrulanmadı; A2'ye soruldu); 9 kişi iki halde de altındadır.

**Gerekçe.** (1) **Her ilçede n ≥ 5** (ilçe ölçüsü için; §3): nüfus orantısı 3 / 5 / 12 olurdu ve Gemlik'i "ölçülmedi" bırakırdı. (2) Gemlik 5 eşiğin (4) bir üstündedir: yalnız 3 kişi kurup aynı malı satarsa geri ödeme 28,6 sa, 5'i de kurarsa 56 sa (kâğıt); bu pilotun **okunacak** yanıdır, hata değil. Körfez 6 eşiktedir (6'da 42 sa). (3) Gebze 9: A2 tek-ilçe bulgusu (≤ 8 oyuncuda dükkân kasa tavanında, ZP8 ≈ %60) 9'da hâlâ geçerli; ama dünya ZP8'i Gemlik/Körfez'in daha seyrek talebiyle (kasa dolmaz) aşağı çekilir, Gebze için "ZP8 > %50 beklenen" notu (A2 risk 2) aynen yürürlükte. (4) **Davet ≠ katılım:** üçüncü günde ilçede < 5 katılan varsa o ilçe "ölçülmedi" yazılır; yedek davet Gemlik'e (en dar eşik). **Davet metni:** ilçe adı + tek cümle ("Gemlik: liman, küçük ve sakin"; "Körfez: sanayi, orta"; "Gebze: büyük ve kalabalık"), "ekranda istediğini seçebilirsin; bu bir sınıf değil". **Gözlem (kabul değil):** hiçbir ilçe > %60 pay, tek ilçede ilçe eşiği (Gemlik 4–5, Körfez 6–8) aşılırsa E5 ilçe okuması "kalabalık" notuyla verilir.

## 3. İlçe başına ilk dükkân ve geri ödeme ölçümü

| Metrik | Tanım | Kaynak | Pencere | n kuralı |
|---|---|---|---|---|
| **E4a** kuruş süresi | `DukkanDurumu.kurulus − katılım`, oyuncu ilçesi `katilimIlcesi`; ilçe medyanı, yanında kuruluş oranı (katılımdan ≥ 48 sa geçenlerde kuran %) | **O2 oynatması** (`insan-cikarma.ts`: `katilmaIlce` var; O2-2: `dukkanT` yerine `kurulus` okunur) | ilk dalganın ilk 14 günü | ≥ 5 oyuncu (≥ 48 sa geçmiş) ve ≥ 3 kuran; aksi "ölçülmedi" |
| **E4b** ilk dükkân satışı | `ilkSatisT − katılım` (A0-11 süre tanımı); ara kırılım: `baslangic`, `kurulus`, `ilkSatisT` | **`MulkOyuncuDurumu.ilkSatisT`** (45ac5b0: `tipler.ts:935`; yazım `mulk/kasa.ts:164` `if (yerel > 0) mo.ilkSatisT ??= d.zaman` `paraAkisiYaz` içinde; serileştirme `serilestir.ts:621`; test `perakende-para.test.ts:129`). **Çözünürlük:** `paraAkisiYaz` her `lojistikCoz` sonunda çağrılır (`lojistik/cozum.ts:343-355`; `yerel` = o çözümde GERÇEKLEŞEN, `frD` ile kısılmış dükkân geliri oranı), yani `ilkSatisT` = gerçekleşen yerel gelir oranının ilk kez > 0 olduğu **çözümün anı (ms)**: saat ızgarası değil; komut, olay (inşaat bitişi, stok eşiği) ya da saatlik tıktan hangisi çözümü tetiklediyse o an. Birim birim değil oran ilkidir (oran > 0 olunca satış başlamıştır) | aynı | aynı; eşik medyan ≤ 36 sa (sarı 36–48) |
| **E5** geri ödeme | `(bedel + hücre + malzeme) / ek net`; `ek net = (p_kademe − 0,891 R) × q − giderMiliSaat`; `q` = yuva `satis` sayacı farkı / 7 gün (§7.1b, K2-8) | O2 oynatması (`satis.n`, `etkinKademe`, `giderMiliSaat`); `/metrik` **kullanılmaz**: oyuncu ve ilçe etiketi yok (`bolge_dukkan_kademe_satis` yalnız dünya toplamı; MO E4/E5 satırı) | dükkân yaşı ≥ 7 gün, 7 gün kayan; ilk okuma gün 8 | ≥ 3 dükkân (≥ 7 gün yaşlı); eşik medyan ≤ 48 sa (sarı 48–150) |

Ortak kurallar: renk (yeşil/sarı/kırmızı) yalnız n kuralı sağlanınca verilir, aksi "ölçülmedi"; ilçe medyanı kendi ilçesinin oyuncularındandır (dünya medyanı oyuncu birleşik, ilçe medyanlarının ortalaması değil); bot ve insan ayrı raporlanır; çıktı günlük, ilçe sütunlu (O2-3). K2-8/K2-9 gauge'ları dünya düzeyinde çapraz kontrol içindir (toplam satış ve kademe dağılımı), ilçe kararı O2 oynatmasından verilir.
