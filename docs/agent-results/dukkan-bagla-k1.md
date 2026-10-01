# dukkan-bagla (K1): dükkân yüzeyleri gerçek veriye ve komutlara bağlandı

Dal `takim/k1/dukkan-bagla`, taban e7c47a5. Üstünde K2 köprüsü (cherry-pick 9940608, 54a9a43) ve K1 commit'leri.

## Kapı durumu
Bu pencerede yalnız tek dosya vitest (`--minWorkers=1 --maxWorkers=1`), istemci tsc ve eslint koştu; tam vitest, Playwright ve `pnpm dunya` yok (p6b4 koşuyordu). Çalışma ağacında yalnız f4 düzeltmesi için istisna koşusu yapıldı (ayrı iş: df0a728, 105/105).

## Commit'ler
1. 38df09a dükkân kaynağı: kare → köprü → `DukkanGorunumu`; içerikten param ve referans fiyat; kurma bedeli planlayıcısı (D0/D1/Dikkat gerçek koşulla); komut ret çevirileri (`hata-mulk.ts`, DUK/MRK → D1..D81 metinleri); `dukkanKaresi`, `dukkanKomutu` bağlantı uçları. `MulkPaneliSecenekleri.dukkan` verilmezse karedeki köprüden kurulur.
2. 7ef11f6 + dc0e8b8: yapı kurma akışında dükkân. `dukkan` yapısı seçilince kartta D2 tür seçimi (ilçe/il sayacı, tür uyumu, sınır nedeni), tür seçilince D3 maliyet satırları (pencere satırı, ilk yapı indirimi, hazine/inşaat sınırı/stok uyarıları); tür seçilmeden onay kapalı (`aria-disabled` + `D2.tur_gerekli`), Enter de aynı koşula tabi. `YerlestirIstegi.dukkanTuru` → `yapi_yerlestir` ve arsasız `tesis_insa_hucre` komutuna girer; türsüz hiçbir komut gitmez. Kurma mesajlarında para artık "yukarı" yuvarlı ("yakin" kalktı).
3. 669694b dükkân paneli (`dukkan-panel.ts`, saf denetleyici + `mulk-panel.ts` bağlayıcı): İşletmem Dükkânlarım satırında "Raf" (inşadakinde "Daha fazla") düğmesi → seçili dükkânın ayrıntısı: D8 özet, D5 raf (boş yuva → mal seçici → `dukkan_raf`; dolu yuva → D6 kademe → `dukkan_fiyat` (kampanya kademe 0); boşalt onayı → `dukkan_raf` mal=null), D7 marka formu (`marka_tanimla` sonra `dukkan_marka`; canlı sayaç/önizleme/hata yaması, ok tuşlarıyla simge/renk), D8.1 menü: kaldır `dukkan_yik`, inşaat iptali `insaat_iptal {insaat: -id}`. Ret metinleri Türkçe ve panelde `p.dk-hata[role=alert]`. Gönderim sürerken ikinci komut gitmez.

## Testler (tek dosya)
`harita-dukkan-kaynak` 18, `harita-dukkan-zincir` 4 (yeni), `harita-dukkan-panel` 16 (yeni), `harita-dukkan-html` 52, `mulk-panel` 8, `harita-f4-yapi` 17, `harita-yerlestir-cok-sinif-ws` 2, `harita-yurt-ws` 1; hepsi geçti. tsc ve eslint temiz.

## Boyut
Kaynak gzip farkı (minify öncesi, K2 köprüsü dahil) ≈ +21 KB; hepsi harita.js yığınında. `giris.js` ve `dunya.html` değişmedi (harita → giris yönünde içe aktarma var, tersi yok). Gerçek paket ölçümü kapı koşusunda.

## Açık notlar
- Bu dalın içerik paketinde `perakende` parametresi ve `dukkan` ek yapısı henüz yok (parametreler.json); yüzeyler içerik gelene kadar çıkmaz (köprü `kapali`). Gerçek sunucu testi (WsBaglanti `dukkanTuru`) içerik gelince eklenmeli; şimdilik zincir ve kaynak katmanı sahte bağdaştırıcıyla testli.
- "Pazar'dan al" (eksik pencere): bu ekranda Pazar yüzeyi yok; düğme eksik pencere metnini bildirim olarak söyler. Pazar emri akışı (`pencere-bekliyor`, `iptal_hatirlatma`) bağlanmadı.
- `D3.yatirim_*` (yatırım tahmini) veri kaynağı olmadığı için gizli.
- Dönüş ekranında ayrı dükkân satırı K2 `DonusKalemleri.dukkan` bekliyor.
- T1 CSS isteği: İşletmem içinde `.dk-panel` kapsayıcısı ve `.dk-satir .eylem` ("Raf" düğmesi), `.dk-marka-satir`, `.yk-baslik` (ayrıntı başlığı + menü düğmesi) için yerleşim; şimdilik mevcut `.eylem`/`.mulk-liste` stilleri.
- Gerçek DOM testi yok: kart ve panel DOM bağlayıcıları (`yerlesim.ts`, `mulk-panel.ts`) yalnız tsc ile; mantık saf modüllerde testli. f4/g9 uçtan uca betiğine dükkân akışı (Dükkân kur → tür → onay; raf; marka) kapı sonrası eklenmeli.
