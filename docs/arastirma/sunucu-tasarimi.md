# Sunucu Tasarımı — Tek Yazar, Günlük ve Protokol (S4 / F1)

> **Özet.** `packages/protokol` istemci ile sunucu arasındaki mesaj sözleşmesini (tipler + zod şemaları) ve ilgi alanı karesini, `packages/sunucu` paylaşılan dünyanın tek yazar sunucusunu içerir. Komut yolu **yazma-önce-günlüktür**: sunucu `t`'yi basar, komut kuyruğa girer, 50–100 ms'lik turlarda günlüğe toplu yazılır (fsync/commit), **ancak sonra** uygulanır ve yayınlanır. Bu yüzden **başarısız komutlar da günlüğe girer**; çekirdek sözleşmesi gereği yeniden oynatmada aynı sonucu verirler. Kurtarma son anlık görüntü + günlük kuyruğudur; karşılaştırma her zaman **aynı t'de `calistirKadar(t)`** ile yapılır. Kararların bağlamı: [11 §10](../11-urun-donusu.md#10-teknik-mimari-özeti), [paylaşılan dünya mimarisi](paylasilan-dunya-mimarisi.md), [06 §14](../06-simulasyon-spesifikasyonu.md).

**Durum.** 1 Ekim 2026, Sprint 1 S4. Kod: `packages/protokol/src`, `packages/sunucu/src`, şema `packages/sunucu/sql/001-baslangic.sql`. Ayrıntılı çalıştırma notu: `packages/sunucu/README.md`.

---

## 1. Paketler

| Dosya | İçerik |
|---|---|
| `protokol/src/mesajlar.ts` | Mesaj tipleri, zod şemaları (iki yön), `PROTOKOL_SURUMU`, kapanış kodları, `istemciMesajiCoz` / `sunucuMesajiCoz` |
| `protokol/src/komut-sema.ts` | Çekirdek `Komut` birliğinin zod şeması; çıkarsanan tipin `Komut` ile **birebir** eşitliği derleme zamanında denetlenir |
| `protokol/src/kare.ts` | Saf ilgi alanı süzgeci (`ilgiAlaniKur`, `ilceIlgisiKur`, `ilgiKaresiCikar`), stok formülü (`stokAraDeger`), delta (`kareFarki`, `deltaUygula`) |
| `sunucu/src/yazar.ts` | `DunyaYazari`: damga, idempotans, grup commit, ilerletme, görüntü, kurtarma, sunucu botları |
| `sunucu/src/sunucu.ts` | `ws` ağ geçidi: el sıkışma, kimlik, abonelik, hız sınırı, kare/delta yayını |
| `sunucu/src/depo/*` | `GunlukDeposu` / `GoruntuDeposu` arayüzleri; bellek, dosya (JSONL + görüntü dosyası, fsync), Postgres |
| `sunucu/src/kimlik.ts` | Takılabilir `KimlikDogrulayici` + HMAC'li geliştirme token'ı |
| `sunucu/src/saat.ts`, `hiz-siniri.ts`, `istemci.ts`, `cli.ts` | Duvar/elle saat, token-kova, Node test/yük istemcisi, komut satırı |

## 2. Mesajlar

| Yön | Mesaj | Not |
|---|---|---|
| İ→S | `merhaba {protokolSurumu, token, istemciKimligi, kuralSurumu?}` | İlk mesaj olmalı (5 sn). Oyuncu **token'dan** çözülür |
| S→İ | `hosgeldin {protokolSurumu, kuralSurumu, oyuncu, yonetici, simZamani, seq, hiz, dizin}` | İşçi protokolündeki `hazir`'ın yerine |
| İ→S | `abone {bolgeler?, iller?, ilceler?}` | İlgi alanını değiştirir; tam kare gelir |
| S→İ | `kare {rev, seq, ilgi, ilceIlgisi?, kare}` / `delta {rev, onceki, seq, delta}` | Delta yalnız değişiklik varsa |
| İ→S | `komut {anahtar, komut, istemciZamani?}` | `t`/`oyuncu` alanları atılır; `istemciZamani` yalnız tanı |
| S→İ | `komutSonucu {anahtar, seq, t, komut, sonuc, tekrar}` | `tekrar`: idempotans tekrarı, yeniden uygulanmadı |
| İ→S / S→İ | `zamanIste {istemciGonderim}` → `zaman {istemciGonderim, sunucuDuvar, simZamani, hiz}` | NTP benzeri eşitleme |
| İ→S / S→İ | `ozetIste {istek?}` → `ozet {t, seq, durumOzeti}` | 5 jeton; tanı ve testler |
| İ→S | `zamanIlerlet {t}` | Yalnız yönetici + elle saat (test/geliştirme) |
| S→İ | `hata {kod, mesaj, anahtar?, istek?}` | Kodlar: `gecersiz_mesaj`, `protokol_surumu`, `kimlik`, `kural_surumu`, `sira`, `yetki`, `hiz_siniri`, `gecersiz_ilgi`, `kapaniyor`, `ic_hata` |

Kapanış kodları: 4001 protokol sürümü, 4002 kural sürümü, 4003 kimlik/sıra, 4008 el sıkışma zaman aşımı, 4009 sunucu kapanıyor. Mesaj tavanı 64 KiB.

## 3. Kare (ilgi alanı)

- İlgi alanı = abone olunan bölgeler ∪ oyuncunun sahip olduğu bölgeler (mülk kipinde işletme düğümleri dahil). Mülk kipinde ayrıca abone olunan ilçeler ∪ oyuncunun hücresi olan ilçeler; `iller` ilin bütün ilçelerini ve il merkezi bölgesini getirir.
- **Genel** (herkese): sahip, nüfus, tesis siluetleri `[tür, aktif]`, savunma duruşu, fiyatlar; mülk kipinde ilçe durumu ve hücre sahipliği `[kimlik, sahip, sınıf, tesis, inşaat]`. **Özel** (yalnız sahibine): stoklar, üretim, tesis ayrıntısı, ticaret emirleri, ordu, rezerv; oyuncu karesi (hazine, vergi, teknoloji, inşaatlar, arazi kaydı).
- Stok ve hazine `(miktar, oran, t0, artik, kapasite)` formülüyle gider; `stokAraDeger` çekirdeğin `anlikMiktar`'ını çağırır, yani istemcideki sayı sunucudakiyle bit bit aynıdır. Yalnız `t` değişirse delta boştur ve gönderilmez.
- Yayın: komut uygulanan her turda hemen, aksi halde en sık `yayinAraligiMs`'de (varsayılan 1 sn). Gönderim tamponu 4 MiB'ı aşan yavaş istemci deltayı atlar, sonra tam kare alır.

## 4. Komut yolu

1. **Damga.** `t = max(saat.simdi(), son damga, dünya zamanı)`; istemci zamanı yok sayılır. Damga varış anında basılır, varış sırası = `seq` sırası, `t` azalmaz.
2. **İdempotans.** Kapsam `(oyuncu, istemciKimligi, anahtar)`. Görülmüş anahtar kuyruğa girmez: bekliyorsa uygulanınca, bittiyse hemen ilk sonuç `tekrar: true` ile döner. Tablo en çok 20 000 girdi tutar (eski bitmişler atılır) ve anlık görüntüye kopyalanır; kurtarmada görüntü + kuyruktan yeniden kurulur.
3. **Hız sınırı.** Oyuncu başına (bağlantı başına değil) token-kova; varsayılan 20 jeton, saniyede 5. Tekrarlar jeton harcamaz. Reddedilen komut günlüğe girmez; istemci aynı anahtarla yeniden dener. Tur başına küresel tavan 2000 komut, fazlası sonraki tura kalır.
4. **Grup commit (varsayılan 75 ms).** Kuyruk `seq` alır → `GunlukDeposu.ekle` (dosyada tek `write` + `fdatasync`, Postgres'te tek işlem) → **sonra** sırayla `sim.uygula` → yanıtlar → yayın. Günlük yazılamazsa hiçbir komut uygulanmamıştır: yazar durur (fail-stop), süreç çıkar; bellek ve günlük tutarlı kalır.
5. **İlerletme ve yerleştirme.** Tur sonunda `calistirKadar(min(saat, ilk bekleyen t, zaman + 6 sa))`; **eşit t'de de çağrılır**. Son komutun aynı `t`'ye planladığı `cozum` olayı ancak böyle işlenir. Özet ve görüntü de önce `calistirKadar(zaman)` ile "yerleştirilir". Bu değeri korur: o `t`'de gelecek her komut `uygula` içinde zaten önce bunu yapar. Bu kural olmadan kurtarılan dünya ile günlüğün `calistirKadar(T)` ile oynatılması farklı özet verir (kill -9 testinde yakalandı).

## 5. Başarısız komutlar günlükte (seçim ve gerekçe)

**Seçim: hepsi günlüğe girer.** Yazma-önce-günlük düzeninde sonuç uygulamadan önce bilinmez. Yalnız başarılıları tutmak için ya önce uygulayıp sonra yazmak gerekir, ya da günlüğü iki geçişte yazmak (niyet + sonuç). İlki, günlük yazılamadığında belleği günlükten ileride bırakır; ikincisi yazmayı ikiye katlar.

- **Doğruluk.** [06 §14](../06-simulasyon-spesifikasyonu.md) sözleşmesine göre başarısız komut durumu değiştirmez, yalnız zamanı ilerletir. Determinizmle birlikte yeniden oynatmada aynı sonucu ve aynı hata metnini verir. `basarisiz-gunluk.test.ts` aynı `t`'de üç yolu karşılaştırır: canlı yazar, tüm günlük (her kaydın sonucu canlıdakiyle aynı) ve yalnız başarılılar (`yenidenOynat`). Üçü de aynı özeti verir. S2 bulgusuyla tutarlıdır.
- **Denetim izi.** Reddedilen girişimler (yabancı bölgeye inşa, aralık dışı değer, tekrarlanan deneme) kötüye kullanım tespiti için değerlidir ([mimari §3](paylasilan-dunya-mimarisi.md#3-hesaplar-kimlik-doğrulama-kötüye-kullanım)).
- **Maliyet.** Günlük büyür; hız sınırı ve zod biçim denetimi bunu sınırlar. Biçimsiz mesaj, hız sınırına takılan komut ve yetkisiz `oyuncu_katil` günlüğe hiç girmez.
- **Kurtarma.** Çekirdeğin `anlikGoruntudenYukle(veri, görüntü, kuyruk)` kuyruğu başarısız komutta fırlatır. Yazar bu yüzden `anlikGoruntudenYukle(veri, görüntü)` + kayıtları tek tek `uygula` kullanır.

## 6. Kalıcılık

- Arayüz: `GunlukDeposu { ekle(toplu), oku(seqSonrasi), kapat }`, `GoruntuDeposu { kaydet, sonuncu, kapat }`. İmleç `t` değil `seq`'tir: aynı `t`'de birden çok komut olabilir.
- **Dosya.** `gunluk.jsonl` satır başına bir kayıt tutar. Açılışta yarım kalmış son satır kesilir; ortadaki bozulma ya da seq boşluğu açılışı durdurur. Görüntü `goruntu/<seq>-<simZamani>.goruntu` dosyasıdır: üst veri satırı + çekirdek zarfı. Önce geçici dosyaya yazılır; sonra fsync, `rename`, dizin fsync. Son üç görüntü tutulur. Tek yazar kilidi `yazar.kilit` (pid) dosyasıdır; ölü sürecin kilidi devralınır.
- **Postgres.** `log(dunya, seq, t, hesap, istemci, anahtar, komut jsonb, kural_sur, sema_sur)` ve `snapshots(dunya, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek jsonb, sikistirma, blob)` tabloları kullanılır. Görüntü gzip'lenir; zstd Node'da kararlı olunca kullanılabilir. Tek yazar için `pg_try_advisory_lock` alınır; `seq` birincil anahtarı ikinci bir yazarı da engeller. Testler Postgres olmadan koşar; `BOLGE_PG_URL` verilince gerçek test de koşar. Yerel Postgres 16'da yeşil. Bu test jsonb'nin `\u0000` taşıyamadığını yakaladı: idempotans kapsamı artık ayrı alanlarda.
- **Görüntü politikası.** İlk açılışta (tohum ve başlangıç kalıcı olsun), her 6 sim-saatte, her 10 000 komutta ve kapanışta görüntü alınır. Görüntü hatası döngüyü durdurmaz (uyarı verir); kurtarma daha eski görüntü + daha uzun kuyrukla yapılır.
- **Kurtarma.** Son görüntü alınır: kural sürümü ve şema sürümü denetlenir, `anlikGoruntudenYukle` zarf özetini doğrular, üst verideki özet ayrıca karşılaştırılır. Ardından `seq > görüntü.seq` kayıtları sürekliliği ve kural sürümü denetlenerek oynatılır, sonra yerleştirme yapılır. Saat kurtarılan zamandan başlar.

## 7. Kimlik

`KimlikDogrulayici.dogrula(token) → {oyuncu, yonetici} | null`. Geliştirme token'ı `gel1.<oyuncu>.<HMAC-SHA256>` biçimindedir ve sabit zamanlı karşılaştırılır. `sistem` yöneticidir; yöneticinin komutları `sistem` oyuncusu olarak damgalanır. Better Auth oturum doğrulayıcısı aynı arayüzü uygulayacak.

## 8. Testler (toplam ~12 sn)

- **kill -9.** `kurtarma-sureci.test.ts` alt süreçte dosya depolu sunucu başlatır. Bot ve oyuncuyla 30 sim-saat ilerlenir, sonra SIGKILL. Kurtarılan sunucu aynı `T`'de aynı özeti verir. Onaylanmış ve yolda komutlar varken SIGKILL → günlüğün bağımsız baştan oynatılması ile aynı özet; onaylanan her komut günlükte. SIGTERM → kapanış görüntüsü. Kuyruksuz açılış.
- **İdempotans ve hız sınırı:** `idempotans-hiz.test.ts`. **İki istemci:** `iki-istemci.test.ts` (bölge kipi) ve `mulk-iki-istemci.test.ts` (`parsel_al` ile mülk kipi). **Başarısızlar:** `basarisiz-gunluk.test.ts`. **Depolar:** `depolar.test.ts`. **Protokol:** `protokol/test/protokol.test.ts`.

## 9. Açık konular

1. **Çekirdek hatası: akış yolu paylaşımı.** `lojistik/akis.ts` MCF önbellek kaydının `yol` dizisini akışa doğrudan koyar (`yol: y.yol`). Önbellek isabetinde iki akış, ve modül önbelleği, aynı diziyi paylaşır; `dunyaSerilestir` paylaşılan referansı reddeder. `basarisiz-gunluk.test.ts` senaryosunda (mini harita, 2 oyuncu + tüccar botu) ilk periyodik görüntüde yeniden üretilir. Sunucu görüntüden önce değer koruyan bir kopya yapar (`DunyaYazari.paylasimiKir`, GEÇİCİ). Kalıcı düzeltme çekirdekte `yol: [...y.yol]`'dur; özetleri değiştirmez.
2. ~~Sunucu kapalıyken dünya durur.~~ **Karar verildi ve uygulandı (1 Ekim, sahip; docs/12 §7):** dünya kapalıyken de akar. Sim zamanı = duvar saati − dünya epoch'u (varsayılan 1 Ekim 2026 00:00 TRT, anlık görüntü üst verisinde saklı); açılışta kaçan süre 1 sim-saatlik adımlarla yetiştirilir, yetişirken komutlar `yetisiyor` koduyla reddedilir (packages/sunucu/README.md). Açık iş: kesinti adaleti (uzun kesintide olumsuz olay ön duyurusunun ötelenmesi) çekirdekte.
3. **İl → bölge eşlemesi (bölge kipi)** S5'ten gelecek: `ilgiCozucu` kancası hazır. Mülk kipinde iller ve ilçeler dünyadan çözülür.
4. **Sunucu botları** bölge kipi arketipleridir; mülk kipini henüz oynamazlar (CLI `--botlar` ile `--parsel`'i birlikte kabul etmez). Botların parsel kipine taşınması E20-G10'dadır.
5. **Ölçek.** Dosya günlüğü açılışta bütünüyle okunur ve sıkıştırma yoktur. Kare her bağlantı için ayrı çıkarılır (aynı ilgi + oyuncu için önbellek yapılmadı). İkisi de alfa ölçeğinde yeterlidir (tahmin, ölçülmedi).
6. **Kural dönemi komutu** (`kural_surumu_gec`) yoktur. Kural sürümü değişince açılış reddedilir (dönem sınırında göç gerekir).
