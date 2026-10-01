# Entegrasyon kapısı betiği (O1, Sprint A0-02 "Sürekli" görevi)

Dal: `takim/o1/kapi-betigi`. Taban: `entegrasyon` (teslim anında `git log -1` raporda).

## Ne teslim edildi

| Dosya | İş |
|---|---|
| `scripts/kapi.sh` | Tek komut girişi (Git Bash ve Linux). `tsx` varsa onu, yoksa Node'un yerleşik tür soyma desteğini (22.18+) kullanır. |
| `scripts/kapi.ts` | Asıl iş: kilit, yeniden tabanlama, adımlar, JSON, ileri sarma, temizlik. Yalnız `node:` modülleri; kabuk bağımlılığı yok. |
| `scripts/kapi-istisna.json` | Büyük dosya istisnaları ve geçici "kararsız Playwright" kuralı (şimdilik `yuru-etkilesim`, `yuru/` dosyalarına dokunmayan paketlerde). Yalnız baş lider onayıyla (operasyon lideri aracılığıyla) eklenir ve kaldırılır; kapıyı koşturan ağaçtan okunur, denenen dalın kendi kopyası sayılmaz. |
| `scripts/kapi-dondurulmus.json` | K-2 dondurulmuş altın listesi (fikstürler ve regresyon testleri; şartname §13.1) ve `ilk_giris_serbest` (ilk girişi serbest dondurulmuş dosyalar). Aynı sahiplik kuralı. |
| `scripts/kapi-istemci-yasak.json` | İstemci sızıntı denetiminin yasak dizge listesi (`yasakliKelimeler`, `yasakliIcerik`, `macrocenter`); aynı kurallarla okunur. |
| `tsconfig.json` | `include` listesine `scripts/*.ts` eklendi (betik `pnpm tipkontrol` kapsamına girdi). |

## Kullanım

```
scripts/kapi.sh <dal> [<dal2> ...] [--ad=<paket>] [--istemci] [--kuru] [--sakla] [--sadece=<betik,...>] [--kademe=1|2] [--tekrar]
scripts/kapi.sh --on-denetim <dal> [<dal2> ...]
scripts/kapi.sh --ileri-sar <paket-adı | dal [<dal2> ...]>
```

- Birden çok dal paket olur: verilen sırayla üst üste yeniden tabanlanır, tam kapı bir kez koşar, geçerse tek `--ff-only` ile ileri sarılır.
- `--istemci`: yol örüntüsü tetiklemese de dunya ve istemci Playwright betiklerini koşturur (kapı dışı ekran/ölçüm betikleri yine koşmaz).
- `--kuru`: her şeyi koşar, geçse bile `entegrasyon`'u ileri sarmaz (sınama).
- `--sakla`: geçici worktree'yi silmez (hata ayıklama).
- `--kademe=1|2` (sahip kararı, kademeli kapı; varsayılan 1): **1** = tsc + lint + `vitest related <paketin değişen dosyaları>` (çekirdek değiştiyse `packages/cekirdek` testleri de) + dunya (yol tetiklerse) + `f4-uctan-uca` (yalnız `packages/istemci/` değiştiyse). **2** = tam vitest + dunya + `f4-uctan-uca` + `yuru-etkilesim` (yalnız rapor); her 3. pakette, kural sürümü ya da protokol şeması değişince, sabahın son paketinde kullanılır. JSON'da `kademe`. Kademe 1'de belge dosyaları `vitest related` ile eşleşmez (docs'u fs ile okuyan testler yalnız kademe 2'de koşar).
- `--tekrar`: tekrar koşusu işareti (özet satırına `tekrar=evet`, JSON'a `tekrar: true`); ilk resmi sonuç korunur. Sonuç JSON'ları hiçbir zaman üzerine yazılmaz (`wx`; aynı ad varsa `-2`, `-3` eklenir).
- `--on-denetim`: yalnız ön denetimler (atıf, büyük dosya, dondurulmuş altın, yığılma; dal dal). 1-2 sn sürer; kilit almaz, worktree açmaz, hiçbir şeye dokunmaz. JSON'da dal başına `dal_dosyalari` (dalın merge-base'e göre getirdiği dosyalar). Kuyruğa girmeden dalları yoklamak içindir.
- `--ad=<paket>`: paketin adı; sonuç dosyası, günlük dizini ve PG bekleyen uç (`refs/kapi/<paket>`) bu adla anılır. Sonra `--ileri-sar <paket>`.
- `--sadece=a,b`: kırık arama. Kurulum + dunya + yalnız verilen Playwright betikleri (ör. `f4-uctan-uca,yuru-etkilesim`); tipkontrol, lint, vitest ve ön denetimler koşmaz. Geçse bile ileri sarmaz: uç `refs/kapi/<ad>` altında "GEÇTİ (kısmi)" ile tutulur, ileri sarma açık onayla `--ileri-sar` ile yapılır. Dal yerine tam commit verilirse (daha önce sınanmış uç) aynı uç yeniden sınanır.
- `--ileri-sar`: "GEÇTİ (PG bekliyor)" ile bırakılan ucu (`refs/kapi/<dal>`; pakette dal adları `_` ile birleşir) ileri sarar. Uç hâlâ güncel `entegrasyon` üzerinde değilse reddeder.
- Çıkış kodu: 0 geçti, 1 kırık, 2 kullanım ya da ortam hatası, 3 düzeltme gerekli (atıf ya da büyük dosya).
- Ortam değişkenleri: `KAPI_SP` (sonuç ve kilit kökü; varsayılan `entegrasyon` worktree'sinin üst dizini), `KAPI_ENTEGRASYON_DIZIN`, `KAPI_KARO`, `KAPI_BEKLE_SN` (kilit bekleme, 7200), `KAPI_SURE_SINIRI_DK` (45), `KAPI_OTURUM_SATIRI`.

## Adımlar (sırayla; biri kırılırsa sonrakiler koşmaz)

1. **Kilit** `SP/takim/kapi.kilit` (dosya + süreç canlılığı; `flock` değil, Windows'ta da çalışsın diye). Dolu ise "kapı meşgul" yazıp sırasını bekler; sahibi ölmüşse bayat kilidi temizler. Süre sınırı kilit beklemesini saymaz.
2. **Ön denetimler, dal dal** (ağır adımlardan önce):
   - Atıf: her commit mesajında tam `Claude-Session: https://claude.ai/code/session_01YQaN9Xy6JqWQSadMfNhyVn` satırı ve `Co-Authored-By: Claude <model> <noreply@anthropic.com>` satırı. Model adı denetlenmez. Eksik dal `DUZELTME GEREKLI` (`kirik=atif`) olur.
   - Depo politikası: eklenen ya da değişen tek dosya 1 MB'ı aşıyorsa ya da `*.pmtiles` ise `DUZELTME GEREKLI` (`kirik=buyuk-dosya`). İstisna `scripts/kapi-istisna.json` (şimdilik `takim/o3/g3-izgara`, "baş lider"); uygulanırsa JSON'a "istisna: baş lider" yazılır.
   - Dondurulmuş altın (K-2): `scripts/kapi-dondurulmus.json` listesindeki dosyalar bir dalın hiçbir commit'inde değişemez (`git diff --name-status <merge-base> <dal ucu> -- <liste>`); ihlalli dal paketten çıkar (`kirik=dondurulmus-altin`, `sorumlu=<dal>`, dosyalar JSON'da). `ilk_giris_serbest` yollarının eklenmesi serbesttir (ekleyen paket kırmaz), sonraki her değişiklik ihlaldir. İstisna yalnız baş lider onayıyla `istisna` listesine girer. **Negatif kontrol her koşuda**: listeden bir dosyada 1 bayt değişmiş geçici bir ağaç (geçici git indeksi; çalışma ağacına ve dallara dokunmaz) kurulur ve aynı denetimin kırmızı verdiği gösterilir (`negatif_kontrol: {dosya, sonuc}`); kırmızı vermezse denetim geçersizdir ve kapı KIRIK olur.
   - Pakette eksik dal paketten çıkarılır, kalanlarla devam edilir. Hepsi çıkarsa `DUZELTME GEREKLI` (exit 3). Commit mesajını betik asla düzeltmez.
3. **Yeniden tabanlama**: `entegrasyon` ucunda ayrık HEAD'li geçici worktree (`SP/wt-kapi-<zaman>`); her dal için `git rebase --onto <o ana kadarki uç> <dalın tabanı>`. Dalın kendi ref'ine dokunulmaz. Çakışan dal paketten çıkarılır (`kirik=rebase`, çakışan dosyalar JSON'da); hepsi çakışırsa KIRIK. Pakette önce gelen bir dalın atası olan dal (yığılı dal; ör. T1-G1, K1-G1 üstünde) yalnız kendi commit'lerini alır ve onlar denetlenir; alt dal çıkarsa üstündeki de çıkar.
4. `CI=true pnpm install --frozen-lockfile`
5. `pnpm -s tipkontrol`
6. `pnpm -s lint`
7. `npx vitest run` (kademe 2: tüm testler; kademe 1: `vitest related` ve gerekirse `packages/cekirdek`; `BOLGE_AGIR_TEST` ve `BOLGE_PG_URL` temizlenir). Kırık varsa kırılan dosyalar **bir kez** `npx vitest run <dosyalar>` ile yeniden koşulur. Geçerse sonuç "GEÇTİ" olur ve JSON'a `kararsiz: [{dosya, test, ilkHata, yuk1dk}]` yazılır, özet satırına `kararsiz=<dosya>` eklenir; yine kırılırsa KIRIK. Yeniden deneme yalnız vitest'te; tsc, lint, dunya, Playwright'ta yok. Atlanan test sayısı ve adları JSON'dadır (ortam koşullu testler; kırık sayılmaz, ama görünür).
8. **dunya** (`pnpm -s dunya`), hemen ardından **istemci sızıntı denetimi** ve `dunya.html` gzip ≤ 409.600 bayt. Sızıntı denetimi: derlenmiş istemci çıktısında (`istemci/*.{html,js,css}`, `packages/istemci/dist/assets`) `scripts/kapi-istemci-yasak.json` içindeki dizgelerden biri (büyük/küçük harfe duyarsız) geçerse `kirik=istemci-sizinti`, dosya ve dizge JSON'da. Gzip denetimi: yalnız yol tetiklerse ya da `--istemci` ile. Tetikleyen yollar: `packages/{istemci,protokol,cekirdek,veri,botlar}/` ve `pnpm-lock.yaml`. Tetiklemezse JSON'a "atlandı: yol tetiklemedi" yazılır ve taban boyutu yeni uca taşınır. Önceki boyut `taban-boyut.json`'dan (uç sha'sına göre) okunur ve JSON'a `gzip_taban_bayt` olarak yazılır.
9. **Playwright** ("ilerleyiş önce" kararıyla, P4'ten itibaren; operasyon lideri onaylı): yalnız istemci tarafı değiştiyse ve yalnız `f4-uctan-uca` kapıyı kırabilir. Tetikleyen yollar: `packages/istemci/src/{harita,komut,arayuz,isci}/`, `packages/protokol/`, `packages/sunucu/src/`, `packages/cekirdek/` (`--istemci` ile her zaman). `yuru-etkilesim` (tetik: `packages/istemci/src/yuru/`, `packages/istemci/src/harita/stil.ts`) yalnız rapor olarak koşar: kırığı paketi durdurmaz, hata satırları, fps ve 1 dk yük JSON'da `playwright_rapor` alanına yazılır. `harita-etkilesim`, `etkilesim` ve `sakin-ekran` kapıdan çıkarıldı (yol örüntüsüyle ve `--istemci` ile seçilmez; yalnız `--sadece=` ile elle istenebilir). Yürüyüş karosu ana ağaçtan kopyalanır (`packages/istemci/dist/harita-verisi/karolar/gebze-z15.pmtiles`; `yuru-etkilesim` seçildiyse ve karo yoksa KIRIK).

   | Betik | Durum | Ölçülen süre (yük 5 ile 20) |
   |---|---|---|
   | `f4-uctan-uca` | kapıda, kırabilir | 138-208 sn |
   | `yuru-etkilesim` | kapıda, yalnız rapor (kademe 1'de istemci değişince, kademe 2'de her zaman) | 100-180 sn |
   | `harita-etkilesim` | kapı dışı | 45-87 sn |
   | `etkilesim` | kapı dışı | 165-224 sn |
   | `sakin-ekran` | kapı dışı | 86 sn |

   Her zaman kapı dışı: `ekran`, `tasarim-ekran`, `olcum`, `yuru-fps-ab`, `yuru-karakter`, `yuru-sadelestir`.
10. **PG bekleyen dal**: değişen dosyalar `packages/sunucu/sql/`, `packages/sunucu/src/depo/`, `deploy/yedek.sh`, `deploy/geri-yukle.sh` içeriyorsa ya da `BOLGE_PG_URL` geçen bir test dosyası değiştiyse, pg'siz adımlar geçse bile `entegrasyon` ileri sarılmaz. Sonuç "GEÇTİ (PG bekliyor)", JSON'da `pgGerekli: true` ve `pg_nedeni`, uç `refs/kapi/<dal>` altında tutulur. O3 bu uçta pg testlerini koşar; olumluysa `scripts/kapi.sh --ileri-sar <dal>`.
11. **İleri sarma** (yalnız geçerse, `--kuru` ve PG bekleyen dalda değil): `SP/wt-entegrasyon` içinde `git merge --ff-only <uç>`. Önce `entegrasyon` kaydın aldığı tabanda mı, worktree temiz ve `entegrasyon` dalında mı denetlenir. `pnpm-lock.yaml` değiştiyse oradaki kurulum yenilenir. Push yok.
12. **Temizlik**: çıkışta (SIGINT/SIGTERM dahil) başlatılan süreç ağaçları öldürülür, geçici worktree silinir, kilit bırakılır. Adım başına süre aşımı vardır; toplam süre sınırı 45 dk (aşılırsa süreç ağacı öldürülür, `kirik=sure-siniri(<adım>)`).

## Çıktı

- stdout'a tek satır; ilerleme stderr'e. Örnek: `KAPI GECTI dal=<dal> taban=<sha7> uc=<sha7> sure=<sn>s gzip=<KB>KB test=<geçen>/<toplam> kirik=<adım|->` ve duruma göre `kararsiz=`, `eksik=`, `buyuk=`, `paket=<kalan>/<toplam>`, `cikarilan=<dal>(<neden>)`, `kuru=evet`. Sonuç sözcükleri: `GECTI`, `GECTI (PG bekliyor)`, `KIRIK`, `DUZELTME GEREKLI`.
- `SP/takim/kapi-sonuclari/<dal>-<zaman>.json` ve adım günlükleri `SP/takim/kapi-sonuclari/<dal>-<zaman>/`. `ozet.log` her koşunun satırını biriktirir. JSON alanları: `sonuc`, `sonuc_kodu`, `ozet`, `dal`, `dallar`, `taban_sha`, `uc_sha`, `ileri_sarma` (`once`/`sonra`), `kirik_adim`, `kirik_ileti`, `adimlar` (ad, komut, durum, kod, süre, günlük), `testler` (toplam, geçen, kırık, atlanan, atlanan_testler, kirik_testler), `kararsiz`, `kirik_sorumlu` (tipkontrol/lint/vitest/dondurulmuş altın kırığında dosyalar ve sorumlu dallar), `dondurulmus_altin`, `negatif_kontrol`, `playwright_rapor`, `istemci_sizinti`, `vitest_sure_sn`, `yuk_tanisi`, `gzip_bayt`, `gzip_taban_bayt`, `dunya`, `playwright`, `playwright_betikleri`, `paket` (dal başına `dal_sha`, `uc_sha`, `ust_dal`, `commit_sayisi`, `atif`, `buyuk_dosya`, `durum`, `cikarma_nedeni`), `atif`, `buyuk_dosya`, `pgGerekli`, `pg_nedeni`, `pg_ref`, `degisen_dosyalar`, `kalan_surecler`, `sure_siniri_*`.
- Yük tanısı: Playwright ya da vitest kırığında, zaman aşımında JSON'a o anki 1 dk yük ortalaması, kapı dışı `vitest`/`chrome --type=gpu`/`playwright` süreçleri ve hangi worktree'de koştukları yazılır (`yuk_tanisi`). Yalnız Linux; başka yerde boş.

## Sınama

Küçük bir sandbox deposunda (gerçek `pnpm install`, gerçek vitest; 2 test; dunya ve Playwright yerine taklit betikler) her yol sınandı. Komutlar sandbox'ta `scripts/kapi.sh ...` olarak koştu; "beklenen" sütunu betik yazılmadan önce belirlendi.

| # | Komut | Beklenen | Gerçek |
|---|---|---|---|
| 1 | `--yardim` | kullanım metni, exit 0 | aynı |
| 2 | `yok-boyle-dal` | exit 2 | exit 2 |
| 3 | `pa` (belge dalı) | GECTI, `entegrasyon` ilerler | GECTI, 25ffdab -> 64cc3b6 |
| 4 | `pbad` (atıfsız commit) | DUZELTME GEREKLI `kirik=atif`, exit 3, ilerleme yok | aynı, `eksik=cca5ffd` |
| 5 | `padres` (`foo@example.com` adresi) | DUZELTME GEREKLI `kirik=atif` | aynı |
| 6 | `pbig` (1,2 MB dosya) | DUZELTME GEREKLI `kirik=buyuk-dosya` | aynı, `buyuk=veri/big.bin` |
| 7 | `ppmt` (`.pmtiles`) | DUZELTME GEREKLI `kirik=buyuk-dosya` | aynı |
| 8 | `takim/o3/g3-izgara --kuru` (1,2 MB + `.pmtiles`) | istisna uygulanır, GECTI | GECTI, JSON'da "istisna: baş lider" |
| 9 | `pc1`, sonra `pc2` (aynı dosyada çakışma) | pc1 GECTI; pc2 KIRIK `kirik=rebase` | aynı, exit 1 |
| 10 | `pkirik` (hep kırık test) | KIRIK `kirik=vitest`, `test=1/2` | aynı; yeniden deneme de kırdı |
| 11 | `pkararsiz` (ilk koşuda kırık, sonra geçen) | GECTI `kararsiz=test/kararsiz.test.ts` | aynı |
| 12 | `pbuyuk` (dunya.html 488 KB) | KIRIK `kirik=boyut` | aynı, `gzip=488.5KB` |
| 13 | `pdoc --kuru` (yol tetiklemez) | dunya ve Playwright atlanır | GECTI; JSON "atlandı: yol tetiklemedi" |
| 14 | `pist --kuru` (`istemci/src/yuru/`) | dunya koşar, `yuru-etkilesim` seçilir | seçildi; sandbox'ta karo yok: `kirik=karo-kopya` |
| 15 | `pcek --kuru` (`packages/cekirdek/`) | dunya koşar, `f4-uctan-uca` seçilir | seçildi; sandbox'ta betik yok: `kirik=playwright-f4-uctan-uca` |
| 16 | `ppg` (`packages/sunucu/sql/`) | GECTI (PG bekliyor), ileri sarma yok, `refs/kapi/ppg` | aynı |
| 17 | `--ileri-sar ppg` | ILERI-SARILDI | aynı, `entegrasyon` ilerledi |
| 18 | `ppg2`, sonra `pb` ileri sarar, sonra `--ileri-sar ppg2` | ILERI-SAR-REDDEDILDI `uc-eski`, exit 1 | aynı |
| 19 | `pdoc pbad pc2 --kuru` (paket) | pbad atıftan, pc2 rebase'ten çıkar; pdoc ile devam | `paket=1/3 cikarilan=pbad(atif),pc2(rebase)`, GECTI |
| 20 | `pbad pbig --kuru` | hepsi çıkar: DUZELTME GEREKLI, exit 3 | aynı, `paket=0/2` |
| 21 | `sk1 sk2 --kuru` (sk2, sk1 üstünde) | paket 2/2; sk2 yalnız kendi commit'i | aynı; `sk2.commit_sayisi=1`, uçta toplam 2 commit |
| 22 | `KAPI_SURE_SINIRI_DK=0.03 ... pdoc` | KIRIK `kirik=sure-siniri(<adım>)` | `sure-siniri(kurulum)` |
| 23 | ölü pid'li `kapi.kilit` varken koşu | bayat kilit temizlenir, koşar | aynı |
| 24 | iki eşzamanlı koşu | ikincisi "kapı meşgul" der, sıra bekler, ikisi de geçer | aynı, kilit sonda yok |
| 26 | `--ad=p3 q1 q2` (q1 `sql/` değiştirir, q2 q1'in üstünde), sonra `--ileri-sar p3` | `GECTI (PG bekliyor)`, `refs/kapi/p3`; sonra ILERI-SARILDI | aynı, JSON `paket_adi: p3` |
| 27 | `sz2` (dunya.html içinde `MacroCenter`) | KIRIK `kirik=istemci-sizinti` | aynı, JSON `istemci_sizinti.bulunan` |
| 28 | `pok plint` (plint'in lint'i kırık, dosyası `packages/foo/a.ts`) | KIRIK `kirik=lint`, `sorumlu=plint` | aynı |
| 29 | `pok --sadece=yuru-etkilesim` (betik kırık) | geçici kural: `GECTI (kismi)`, `kararsiz=yuru-etkilesim` | aynı |
| 30 | `sz` + `istemci/src/kure/` yolu | `sakin-ekran` ve `etkilesim` seçilir | JSON `playwright_betikleri` ikisini gösterir |
| 31 | `fz1` (dondurulmuş `docs/ortak.md`'yi değiştirir) | KIRIK `kirik=dondurulmus-altin sorumlu=fz1`, exit 1 | aynı; JSON `negatif_kontrol: {docs/ortak.md, kirmizi}` |
| 32 | `fz2` (`ilk_giris_serbest` dosyasını ekler), sonra `fz3` (aynı dosyayı değiştirir) | fz2 GECTI; fz3 KIRIK | aynı |
| 33 | `fz1` + istisna kaydı | GECTI, JSON'da istisna | aynı |
| 34 | `fz1 pok` (paket, istisnasız) | fz1 çıkar, pok ile devam | `paket=1/2 cikarilan=fz1(dondurulmus-altin) sorumlu=fz1` |
| 35 | `--on-denetim` (gerçek depo, 5 P4 adayı) | 1-2 sn, kilit yok, hepsi temiz | `ON-DENETIM TAMAM paket=5/5`, T2'nin `dal_dosyalari` 10 dosya |
| 36 | `ih` (`istemci/src/harita/`), `--kuru` | yalnız `f4-uctan-uca` seçilir | aynı |
| 37 | `--sadece=yuru-etkilesim` ile bilinen/yeni hata | yalnız rapor: GECTI (kismi), `playwright_rapor` dolu | aynı |
| 25 | `p-a p-b` (paket, `--kuru` yok) ve PG'li paket `p-c1 p-pg` + `--ileri-sar p-c1 p-pg` | paket tek seferde ileri sarılır; PG'li paket `refs/kapi/p-c1_p-pg` altında bekler | aynı |

SIGTERM ile kesme gerçek bir koşuda da sınandı: P2'nin ilk başlatışı kesildi, geçici worktree ve kilit silindi, `entegrasyon` değişmedi.

## Gerçek koşular (kayıt)

- Öz-test (kuru, ilk sürümle): `KAPI GECTI dal=takim/o1/kapi-betigi taban=8064ded uc=4872120 sure=1541s gzip=372.5KB test=1800/1828 kirik=- kuru=evet`. Adım süreleri (yük 19 ile 22): kurulum 3,4 sn, tipkontrol 31, lint 27, vitest 713, dunya 9, Playwright 5 betik 86 + 224 + 87 + 186 + 173 sn.
- P1, belge paketi (elle paket; betik paket desteğinden önceydi): `KAPI GECTI dal=kapi-paket/p1 taban=8064ded uc=d8114dd sure=502s ... test=1800/1828`; `entegrasyon` 8064ded -> d8114dd. JSON: `SP/takim/kapi-sonuclari/kapi-paket_p1-20261001-190057.json`.

- P2 (6 dal, T1-G1 dahil): KIRIK, `f4-uctan-uca` ("Ahır kur" düğmesi disabled; T1-G1'in toast değişikliği) ve `yuru-etkilesim`. Aynı uçta `--sadece` tekrarı da kırıldı; T1'siz 5 dalla (`p2b`) f4 geçti. `yuru-etkilesim` tabanda (de9959c) da kırık çıktı: üç ayrı hata (mobil kamera 0,68 rad, 90 sn zaman aşımı, masaüstü hız denetimi), fps 5-13 (masaüstü, yürürken). P2b ileri sarıldı: `de9959c -> 7553b55` (8 commit). JSON: `p2b-20261001-194008.json`.

- P3 (12 dal, 24 commit, PG bekler): `KAPI GECTI (PG bekliyor) dal=p3 taban=7553b55 uc=5413811 sure=952s gzip=367.6KB test=2008/2049 kirik=-`; tsc 22 sn, lint 12 sn, vitest 515 sn, dunya 376.407 bayt (önce 381.427), sızıntı denetimi temiz, `harita-etkilesim`/`f4-uctan-uca`/`etkilesim` geçti. JSON: `p3-20261001-195338.json`; uç `refs/kapi/p3`.

- P4 (K2 tam kapı, 24/26 dal): `KAPI GECTI (PG bekliyor) ... uc=d13ba4a sure=903s gzip=372.2KB test=2201/2244`; entegrasyon 2819a43 -> d13ba4a. P5 (28/32 dal, kademe 2): KIRIK `playwright-f4-uctan-uca` (K1 yığınının kendi eklediği komut yolu sayımı; yurt-once ve üstündeki g9a paketten çıkarıldı); p5b (26 dal, kademe 1, `--tekrar`) koştu. Rebase'te çakışan dallar ve yığılıları (izgara-yukle/nufus, t1/ilk-saat/b6-b9) paketten çıktı.
- Yığılı dal hatası P5'in başında yakalandı ve düzeltildi: üstüne kurulduğu dal rebase çakışmasıyla çıkınca yığılı dal da çıkar (önceden yalnız ön denetim çıkarmasında geçerliydi). Git atası olmayan "mantıksal" zincirler (ör. o3/izgara-nufus, k2/izgara-yukle'ye mantıken bağlı ama ata değil) betikçe görülmez; tsc/vitest kırığında `sorumlu=` ile yakalanır.

## Geri dönüşü zor kararlar

- Kilit `flock` yerine dosya + süreç canlılığı: Windows'ta (Git Bash) `flock` yok. Bedeli: kapı koşusu bu betik dışında bir şeyle kilitlenemez; aynı makinede çalıştığı varsayılır (başka makineden paylaşılan SP desteklenmez).
- Dalın kendi ref'ine dokunulmaz; yeniden tabanlanmış uçlar `entegrasyon`'a ileri sarılınca dal sahiplerinin dalları artık `entegrasyon`'un atası olmaz (sha'lar farklı). Sahipler dallarını sonraki işleri için `entegrasyon` üzerine yeniden tabanlamalıdır.
- Playwright listesi daraltıldı (yalnız `f4-uctan-uca` kırabilir, `yuru-etkilesim` yalnız rapor); T2'nin yuru düzeltmesi girince `yuru-etkilesim` listede `yalnizRapor` bayrağını kaybetmeli (`scripts/kapi.ts`, PLAYWRIGHT).
- `dunya` ve Playwright yol örüntüsüne bağlandı (belge dallarında koşmaz); örüntü listesi `scripts/kapi.ts` başındadır ve operasyon liderinin onayıyla değişir.
- `tsconfig.json` `include`'una `scripts/*.ts` eklendi.

## Açık sorular ve bilinen sınırlar

- Windows: betik Git Bash'te çalışır; Playwright betiklerinde Chromium yolu (`/opt/pw-browsers`) sabit olduğu için Windows'ta Playwright adımı kırılır (betiklerin sorunu, kapının değil). Yük tanısı ve artık süreç denetimi Linux'a özgüdür.
- Kırılan pakette kırığı getiren dalı bulmak elle yapılır (dalları tek tek koşmak); otomatik ikili arama eklenmedi.
- Üst üste binen (aynı dosyaya dokunan) dallar pakette rebase çakışması verir ve çıkarılır; paket sırası çakışmanın kime yazılacağını belirler.
- Atıf denetimi `entegrasyon..<dal>` aralığına bakar; dal zaten `entegrasyon`'a girmiş commit'ler içeriyorsa (eski tabandan ayrılmış ama içeriği aynı) tekrar sayılmaz, çünkü `rev-list` onları dışlar.
