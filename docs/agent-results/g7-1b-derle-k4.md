# g7-1b-derle (K4): perakende derlemesi

Dal: `takim/k4/g7-1b-derle`. Taban: `takim/k4/g7-1a-veri-sema` 13a67e8 + `takim/k4/g7-yerel-pazar` commit'leri (22cf8aa, 5444736; `ilceNufusEsdegeri` ve `talepTabani` oradan içe aktarılır, bu yüzden dal ikisinin üstüne yığılıdır; kapıda önce yerel-pazar girmeli, sonra bu).

## Yeni dosyalar (hiçbir mevcut dosyaya dokunulmadı: `tipler.ts` ve `derle.ts` K3'ün)
- `packages/cekirdek/src/perakende/derle.ts`: `perakendeDerle(veri: CekirdekVeriPaketi, ic: Pick<DerlenmisIcerik, "malIndeks" | "mallar">): DerlenmisPerakende | undefined`; `DerlenmisPerakende` tipi de bu dosyada (şartname §4.6 alanları + `kampanyaAcik`).
- `packages/cekirdek/test/perakende-derle.test.ts` (8 test).
- `docs/agent-results/g7-1b-derle-k4.md`.

## Derlenen
- `turler`: kimliğe göre sıralı eklenen dükkân türleri; mal kimlikleri mal indeksine çevrilmiş (artan), `malKumesi`, `tamCesit`, `olcekAraligi`.
- `talepTaban`: ilçe kimliği -> mal indeksi dizisi (uzunluk = mal sayısı), `talepTabani(talep1000Saat, yerelOlcek, ilceNufusEsdegeri(ilçe))`; satırı olmayan mal 0. `ilceNufus`: ilçe -> nüfus eşdeğeri (`nufus ?? ilceSinifiNufus[sinif]`; ızgara girdisinde `sinif` yoksa çekirdeğin durum baytı eşlemesinden türetilir: ilçedeki en yüksek arsa sınıfı, `@bolge/veri ilceSinifiTuret` ile aynı tanım; hücre sınıfı talebe girmez).
- `malGrubu` (grup indeksi kimliğe göre sıralı; grupsuz -1), `grupTakvim` (12 aylık), `grupBayram` (yoksa null), `bayramGunleri`, `dukkanEkYapi` (= ek yapı kimliklerinin sıralı sırasındaki `dukkan` indeksi = `mulkDerle`'nin `ekYapiIndeks`'i; testle çapraz doğrulanır), `kampanyaAcik` (kademe tanımlı ve iki sınır > 0).
- Kapalı durumlar `undefined`: `param.mulk` yok, `perakende` bloğu yok, parsel dünyası yok (mülk kipi kapalı; bölge kipi).
- Hatalar (`Error`, "icerikDerle: ..."): bilinmeyen mal (raf, grup, talep), mal iki grupta, tekrarlanan tür ya da ilçe, boş `acikOlcekler`, `ekYapilar.dukkan` yok; parsel ve parselIzgara birlikte.

## Doğrulama
- vitest hedefli (tek işçi): `perakende-derle` 8/8 (blok yok, mülk kipi kapalı, tablolar, nufus'lu ve nufus'suz ilçe, ızgara girdisi, hatalar, belirlenimcilik), `yerel-pazar` değişmedi; eslint temiz; tsc (yalnız bu dosyalar kapsamı) temiz.
- **T3 G7 yaması (bdb055aa7975)** çalışma ağacına uygulanıp denendi, sonra geri alındı (commit'e girmedi): mini-6 mülk paketiyle `perakendeDerle` derlendi: 4 dükkân türü (bakkal, firin, sarkuteri, sekerci), 12 ilçe, `dukkanEkYapi` = çekirdeğin ek yapı indeksi (2), 4 bayram günü, ilçe nüfusu yedek sınıf sabitlerinden (fikstürde `nufus` yok), kampanya kapalı (T3 yaması kampanya sınırlarını tanımlamıyor); bölge kipi paketi `undefined`.
- **İstemci boyutu:** hiçbir yerden içe aktarılmadığı için istemci paketi (dunya.html, işçi paketi) ETKİLENMEZ; bağlama (K3) yapılınca `perakende/derle.ts` ve `perakende/yerelPazar.ts` çekirdek işçisine girer ve boyut o zaman ölçülmelidir (tahmin +1-2 KB gzip). Not: bu modül `mulk/hucreDizini.ts durumArsaSinifi`'ni içe aktarır (zaten çekirdekte).

## Geri dönüşü zor karar / açık soru
Yok. Bağlama satırı (`DerlenmisMulk.perakende`), komut tipleri ve K2 zod satırları K3'ün G7-1b'sidir.
