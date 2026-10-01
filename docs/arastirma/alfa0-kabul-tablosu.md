# Alfa-0 kabul tablosu (A2; G10 girdisi)

> **Durum.** Yalnız belge; taban f8d72b4, dal `takim/a2/alfa0-kabul`. Ölçüt metni ve eşikleri `oyun-tasarim-belgesi-v1.md` §6.5 (A0-1…A0-8 `:1080`, A0-9…A0-18 `:1086-1095`); **burada yeniden tanımlanmaz**. Ekonomi ölçütlerinin ayrıntısı **izleme listesindedir** (`alfa0-ekonomi-izleme.md`, b48af88; E1–E11), insan testi ölçütleri **A1 pilot paketindedir** (`insan-testi-pilot-paketi.md`, 080f670 §3; Y1, Y2, Y10, A0-11 süre tanımı `ilkSatisT − katılım`, A0-13, A0-14). Durum: **yeşil / sarı / kırmızı / ölçülmedi**; "kâğıt" = A2 kâğıt modeli (koşu değil). Kod kapısı kanıtı `SP/takim/kapi-sonuclari/` (ozet.log, `pg-f8d72b4-ozet.json`). A2'nin sahip olmadığı satırlarda kanıt yoksa **ölçülmedi** yazıldı (tahmin yok).

## 1. A0 ölçütleri

| Ölçüt | Nasıl doğrulanır | Eşik | Sahip | Bugünkü durum ve kanıt |
|---|---|---|---|---|
| A0-1 F0–F4 kabul | docs/11 §6.1 kapısı | hepsi geçti | O1 / Kod lideri | **ölçülmedi** (A2 kanıtı yok) |
| A0-2 regresyon kalkanı | vitest (bölge altınları, `durumOzeti` birebir), `pnpm kontrol` | yeşil | O1 kapısı | **yeşil**: p6a3 f8d72b4 test 2529/2574, kırık yok; PG GEÇTİ 74/75, şema 6/6 (ozet.log 22:24, `pg-f8d72b4-ozet.json`) |
| A0-3 geri yükleme tatbikatı | yedekten yükle, kuyruğu oynat, özet eşit | eşit | O3 | **ölçülmedi** |
| A0-4 100 bot yük testi | O2 bot koşusu (tik gecikmesi, çözüm süresi) | raporlu | O2 | **sarı**: yalnız 20 oyunculu yurt-halka ölçümü (O2); 100 bot koşusu yok |
| A0-5 kural dönemi dağıtım provası | dağıtım provası | geçti | O3 | **ölçülmedi** |
| A0-6 uçtan uca Playwright | `f4-uctan-uca` (masaüstü ve mobil) | geçer | O1 kapısı, T2 | **sarı**: kapıda geçiyor (p6a3, kırık yok); mobil görüntü seti T2'de bekliyor |
| A0-7 atıf ekranı, ODbL | istemci denetimi | var | T1 / K1 | **ölçülmedi** |
| A0-8 bot ölçümü (H5–H8) | O2 `--kip parsel` + G6–G8 bot kuralları | H5–H8 raporu | O2 | **sarı**: Y7 bakım C ile %100 (bakim-c 77efe55); G6–G8 bot kuralları yazıldı (77d700f), K-1 koşusu yok |
| A0-9 kamu arsası | özellik testi, yeniden oynatma | reddeder | K3 / K4 | **ölçülmedi** |
| A0-10 para güvenliği | test + para arzı panosu | ödül ≤ 8.000 ₺, kamu/sipariş ≤ ×1,10 | K2 (pano), A2 (kâğıt) | **yeşil (kâğıt)**: ödül 6.790 ₺ (`SP/takim/a2/defter-odul-teyit.md`), kamu tavanı 1,035 R (G4 §1.10); korunum testi kapıda geçiyor; pano satırları K2-1/K2-6 (izleme §8.2) bekliyor |
| A0-11 zincirler, ilk dükkân ≤ 36 sa, geri ödeme ≤ 48 sa | bot koşusu + insan testi: ilk dükkân `ilkSatisT − katılım` (A1 pilot, 080f670 §3, lider onaylı); geri ödeme E5 (izleme) ve K-1 | medyan ≤ 36 sa / ≤ 48 sa | O2 (bot), A1 pilotu (insan, n ≥ 3), K2-8 (metrik) | **yeşil (kâğıt)**: ilk dükkân 0,6–1,0 sa (insan ≈ 1,2 sa, bot ≈ 14 sa), geri ödeme medyanı 22–37 sa (`alfa0-zincir-karlilik.md` §4, 97caf70); **tutmayan:** nüfusu < 20 bin ilçe (86 sa), kasabada ≥ 3 dükkân (111 sa). Bot koşusu ve pilot **ölçülmedi**. **Açık:** GDD satırı "süt, fındık" der; baş lider kararıyla ikisi Alfa-0 sonrası (kapsam ekmek + cam → pencere); çıkmaz mal: `findik` P1'de uyarı (G4 §1.11) |
| A0-12 perakende dengesi | defter + E11 (prim, 1,15 payı), K2-9 | prim 1,05–1,20, > 1,30 alarm; fiyat savaşı < 0,85 R ≤ %5 | K2 (E11), O2 | **sarı (büyük olasılıkla)**: bot dağılımıyla prim ≈ 1,18, ama oyuncu 1,15'e yığılırsa 1,25–1,29 (E11, b48af88; `SP/takim/a2/fiyat-kademesi-rehberi.md`). Fiyat savaşı: kampanya kapalı, < 0,85 R yok (yeşil, yapısal). **Bilinen tasarım açığı, Alfa-1 esneklik notu** (parametre ayarı yok) |
| A0-13 dönüş | insan testi (ekran kaydı), günlük | ortanca ≈ 12 sn, atlama ≤ %50, tıklama ≥ %30, yapılamaz ≤ %2 | A1 pilotu (§3), T1 | **ölçülmedi**; öneri tıklama B7 olmadan ölçülmez (pilot paketi) |
| A0-14 Defter | insan testi: ilk satış ≥ %70 (= Y2), kart atlama ≤ %30 | ≥ %70 / ≤ %30 | A1 pilotu | **ölçülmedi** (pilot bekliyor); kâğıt: ilk satış (tahıl) 12 dk, A1 beklentisi ≈ 25–30 dk (79946c5) |
| A0-15 zaman | test: kapalıyken yetişme, `yetisiyor` kodu | özet eşit | K2 / O1 | **ölçülmedi** |
| A0-16 yapay zekâ | test + gölge rapor | şablon %100, gölge ≥ %98 | K2 / ajan sahibi | **ölçülmedi** |
| A0-17 kilitsizlik | derleme testi (veri doğrulayıcı) | sıra/seviye şartı yok | K3 / A3 | **ölçülmedi** (test); A2 verisinde (G4 §1.13) sıra/seviye alanı yok |
| A0-18 askeri bayrak kapısı | AH1, AH2, AH4, parsel H5 | AH1 0,8–1,4/hafta, AH2 ≤ %8, AH4 ≤ %1 | A3 / O2 | **sarı**: AH1 0,88 baskın/hafta ve AH4 ganimet %0,02–0,07 (kâğıt, `eskiya-kalibrasyon.md` 79ea178); AH2 ve H5 **ölçülmedi**; geçmezse kapalı yayınlanır |

## 2. A2'nin bu geceki bulguları ve eşikleri (G10'a bağlanır; tanım izleme listesinde)

| Bulgu / eşik | Nasıl doğrulanır | Eşik | Sahip | Durum ve kanıt |
|---|---|---|---|---|
| **R, r** (para dengesi; E1, E2) | O2 oynatma / K2-1; r için sunucu hazine farkı (K2-7) | R 0,30–0,60; R < 0,30 ve r < %10 ⇒ önce lavabo kalemleri, `yerelOlcek` en son | O2, K2 | **sarı (kâğıt)**: R 0,24–0,26 (r = 0), r ≥ %10 ile 0,32–0,33; K-1 koşusu **ölçülmedi** (`yerel-talep-kalibrasyon.md` 3fda5f4) |
| **ZP8** (E3) | K2-1 (`yerelNpc` / (+ `ihracatNpc`)) | ≤ %50 (alarm, iki ardışık hafta) | K2 | **sarı (kâğıt)**: %44 (eşit yerleşim) / %52 (nüfusla orantılı); tek kaldıraç `yerelOlcek` 40 → 35 |
| **M tetik tanımı** (E6) | O2 oynatma; **yalnız seçici botlar** (bot kuralları 3479b55) | M < %30 ⇒ G2 değerlendirilir | O2 | **ölçülmedi**; beklenen ≈ %75 (seçici), karma ≈ %54 (bilgi); canlı M insan karışımıdır, tetik değil doğrulama |
| **G4 tetik eşikleri** (E1–E3, E6–E9, E11) | izleme listesi §0 tablosu (yeşil/sarı/kırmızı, kırmızıda parametre sırası) | listede | A2 (tanım), O2 / K2 (ölçüm) | **tanımlandı** (b48af88); canlı okuma K2-1…K2-9 bekliyor (`/metrik` bugün ekonomi alanı sunmuyor) |
| **Bakım C** (E9) | O2 oynatma; bakımlı/bakımsız oranı, NPC dilimi altında | oran ≥ 1,1; < 1,1 ⇒ baş lider kararı (C sabit) | O2, baş lider | **sarı (kâğıt)**: pazar sınırında ödemiyor (ekmek 0,93, süt 1,06, fındık 1,08, pencere 1,35; `alfa0-zincir-karlilik.md` §5); ilk canlı hafta ölçülür |
| **Seyrek oyuncu** | kâğıt (üç tip, 7/14/30 gün) + canlı oturum aralığı | uçurum yok: servet gün 14 ≥ %80, net/sa farkı bir oturumda kapanır | A2, A1 pilotu | **yeşil (kâğıt)**: haftada bir giren gün 7 servetin %63'ü, gün 14 %81, gün 30 %92; uçurum yok, parametre önerisi yok (`alfa0-oyuncu-tipleri.md`, a5e7392) |
| **Cam → pencere zinciri** | kâğıt, G8 değerleri (30 / 12) | geri ödeme ≤ 48 sa | T3 (G8 yaması), O2 | **yeşil (kâğıt)**: 37,9 → 26,1 sa; V15 üst sınırı 1,70 / 1,60 (G4 §1.13, b00b672); koşu **ölçülmedi** |
| **Ekonomi izleme yolu** (K2-1…K2-9, O2-1…O2-3) | K2 `/metrik` gauge'ları, O2 günlük oynatma | — | K2, O2 | **kırmızı (eksik)**: ekonomi metriği yok; olmadan E1–E11 canlıda okunamaz (izleme §8.2) |

## 3. Kapı için özet

- **Kâğıtta tutan:** A0-10, A0-11 (ilk dükkân, geri ödeme medyanı), seyrek oyuncu, cam → pencere geri ödemesi, A0-18 (AH1, AH4).
- **Sarı:** A0-12 (prim; tasarım açığı notuyla kabul), R ve ZP8 (bant altı / sınırda), bakım C (oran), A0-4, A0-6, A0-8.
- **Kırmızı (eksik ölçüm):** ekonomi metriği yolu (K2-1…K2-9); canlı Alfa-0'da R, r, ZP8, ZP3, M, bakım oranı bunsuz okunamaz.
- **Ölçülmedi (A2 dışı sahipler):** A0-1, 3, 5, 7, 9, 15, 16, 17; A0-13 ve A0-14 pilot bekliyor.
- **Karar bekleyen:** A0-11 satırının "süt, fındık" ifadesi (kapsam Alfa-0 sonrası); A0-12 için Alfa-1 esneklik notu (A3); bakım C oran < 1,1 çıkarsa baş lider kararı.
