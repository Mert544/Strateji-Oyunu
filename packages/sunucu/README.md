# @bolge/sunucu

Paylaşılan dünyanın tek yazar sunucusu (Node + `ws`). Mesaj sözleşmesi `@bolge/protokol`'dedir; tasarım gerekçeleri `docs/arastirma/sunucu-tasarimi.md`'dedir.

## Çalıştırma

```sh
# Geliştirme dünyası: mini harita, dosya deposu (varsayılan raporlar/dunya, git dışı), 1 sim-saat/sn, iki sunucu botu
pnpm sunucu -- --harita mini --hiz 3600 --botlar sanayici,tuccar

# Geliştirme token'ı ("sistem" = yönetici: oyuncu_katil, elle saatte zamanIlerlet)
pnpm -s sunucu -- --token sistem
pnpm -s sunucu -- --token ali

# Mülk kipi (mini-6 parsel fikstürü), elle saat (dünya yalnız zamanIlerlet ile ilerler)
pnpm sunucu -- --harita mini --parsel --elle-saat --depo bellek

# Postgres (şema sql/001-baslangic.sql açılışta kurulur)
BOLGE_PG_URL=postgres://localhost/bolge pnpm sunucu -- --depo pg --dunya ana
```

Bütün seçenekler: `pnpm -s sunucu -- --yardim`. İmza sırrını `BOLGE_GELISTIRME_SIRRI` ile verin (varsayılan yalnız yerel geliştirme içindir). Sunucu olayları stdout'a satır başına bir JSON olarak yazar (`hazir`, `uyari`, `kapandi`, `olumcul`). SIGINT/SIGTERM'de kuyruğu yazar, kapanış görüntüsünü alır ve çıkar. kill -9 sonrası yeniden başlatma son görüntü + günlük kuyruğuyla devam eder.

## Mutlak saat ve kapalıyken yetişme

Dünya sunucu kapalıyken de akar (sahip kararı, docs/12 §7). Varsayılan saat (`DuvarSaati`, `--hiz 1`) mutlaktır: `t = duvar saati − dunyaEpochMs`. Epoch dünyayla birlikte anlık görüntü üst verisinde saklanır; yeni dünyada varsayılan `2026-09-30T21:00Z` (1 Ekim 2026 00:00 TRT, kalıcı UTC+3; `--dunya-epoch` yalnız yeni dünyada, bir Türkiye gece yarısı olmalı). Epoch'suz eski dünya ilk mutlak açılışta "şimdi = dünyanın şimdiki zamanı" olarak bağlanır.

- **Yetişme:** açılışta son görüntü + kalan günlük uygulanır; dünya duvar saatinin gerisindeyse (`yetisiyor`) ana döngü 1 sim-saatlik adımlarla yetişir (uykusuz, her adımda olay döngüsüne nefes; görüntü 24 sim-saatte bir ve bitişte). İlerleme stdout'a `{"olay":"yetisme",...}` / `{"olay":"yetisti",...}` satırlarıyla (~1 sn'de bir) yazılır. Ölçü: sentetik harita + 2 bot, 30 gün ≈ 11 sn.
- **Komut sözleşmesi:** yetişirken dışarıdan gelen yeni komut kuyruklanmaz, `yetisiyor` hata koduyla reddedilir (günlüğe girmez; işlenmiş anahtar ilk sonucuyla yanıtlanır). Bağlantı `hosgeldin.yetisiyor` ve sonraki `durum` mesajlarıyla ilerlemeyi ve bitişi öğrenir; istemci bitince aynı anahtarla yeniden dener. Sunucu botları yetişirken de karar verir (dünyanın zamanıyla damgalanır).
- **Monoton koruma:** duvar saati geri giderse (NTP) sim zamanı geri gitmez; saat eski değeri aşana kadar bekler, bir kez `uyari` olayı yazılır. Yeniden başlatmada duvar dünyadan gerideyse hata yoktur (`kurtarma.saatGeriMs`).
- `--hiz` ≠ 1 ya da `--birikimli`: eski kapalıyken-duran saat (hızlandırılmış geliştirme dünyaları); `--elle-saat` ve testlerdeki `ElleSaat` değişmedi. `DuvarSaati`'na `duvar` işlevi enjekte edilebilir (testler sahte saatle koşar).
- Henüz yok (çekirdek işi): kesinti adaleti (kesinti > 15 dk ise rastgele olumsuz olayların ön duyuru→etki geçişini kesinti kadar öteleme; canli-dunya-simulasyonu.md §2.2). Sunucu botlarının iç durumu görüntüye girmez, yeniden başlatmada sıfırlanır.

## Mülk kipi, oyuncu katılımı ve kare eklemeleri (F4)

- **`--parsel-dosya YOL`:** mülk kipinde verilen parsel fikstürü JSON'u açılır. Dosya `@bolge/veri` `dogrulaParselFiksturu` doğrulayıcısından (harita ile) geçer; bozuksa `olumcul` olayında madde madde hata, `param.mulk` yoksa açık hata. `--parsel` ile birlikte verilmez.
- **`katil {anahtar, ilce?}` istemci mesajı** (yalnız mülk kipi): sunucu `oyuncu_katil {oyuncu: <doğrulanmış kimlik>, bolgeler: [], ilce}` komutunu "sistem" olarak damgalar; oyuncu kimliği mesajdan GELMEZ (başkası adına katılım olmaz). Yanıt `komutSonucu`; ikinci katılım çekirdeğin "oyuncu zaten katilmis" hatasını, aynı anahtar ilk sonucu (`tekrar`) döner. Hız sınırı ve yetişme reddi (`yetisiyor`) uygulanır; yönetici `katil` kullanmaz (`komut` + `oyuncu_katil` yolu aynen kalır). İdempotans kapsamı `katil:<oyuncu>`.
- **Periyodik `zaman` yayını:** kimliği doğrulanmış bağlantılara ~15 sn'de bir `{tur:"zaman", yayin:true, istemciGonderim:-1, simZamani, hiz}` (yalnız `t` değiştiğinde de istemci saati kaymasın; `zamanIste` yanıtında `yayin` yoktur). `SunucuSecenekleri.zamanYayinAraligiMs` (0 = kapalı) ve test için `duvarMs`.
- **Merhaba `kuralSurumu`:** istemci göndermezse bağlantı kabul edilir ve bağlayıcı değer `hosgeldin.kuralSurumu`'dur; gönderir ve uyuşmazsa `kural_surumu` hatası + kapanış.
- **Kare eklemeleri (hepsi isteğe bağlı alan, `@bolge/protokol` `kare.ts`):** hücrede tesis/ek yapı türü (`[..., tur?, degerMili?]`: tür herkese, değer yalnız sahibine); ilçede `ayrilmisAdet` (her zaman) ve `ayrilmis` listesi (yalnız `abone {ayrilmis:true}` isteyen bağlantıya; Gebze ölçeğinde ilçe başına ~1,5 MB / gzip ~200 KB, değişmezdir: deltada tekrarlanmaz); yalnız sahibine `oyuncu.erkenOyun` (formül; `erkenOyunCarpani(f, t)`), `oyuncu.mulk.indirimliYapiKalan`, `oyuncu.mulk.ayrilmisBitis`, `insaatlar` demetinde `baslangic` ve ek yapı kimliği.

## Testler

`pnpm vitest run packages/sunucu packages/protokol` (~15 sn; kill -9 testi alt süreç başlatır; `mutlak-saat.test.ts` sahte duvar saatiyle koşar). Gerçek Postgres testi yalnız `BOLGE_PG_URL` tanımlıysa koşar. `BOLGE_TEST_DIZIN_TUT=1` kill -9 testinin veri dizinini inceleme için bırakır.
