# kare-asinma (K2)

Dal `takim/k2/kare-asinma`, taban entegrasyon `d13ba4a`.

- `packages/protokol/src/kare.ts`: `OzelBolgeKaresi.tesisAsinma?: Array<[id: number, asinmaPpm: number]>` (tesisOlcek kalibi). Yalniz `asinmaPpm > 0` olan tesisler; hic yoksa (ya da sanayi kapaliysa, `asinmaPpm` tanimsiz) alan YAZILMAZ. Demete oge eklenmedi (tesisler hala 6 ogeli).
- `packages/protokol/src/mesajlar.ts`: `ozel.tesisAsinma` isteğe bagli `[tam, tam]` dizisi.
- `packages/protokol/test/kare-asinma.test.ts` (4 test): asinmasiz dunyada alan yok ve kare eski anahtar kumesiyle ayni; asinma > 0 listelenir, 0 listelenmez, yalniz sahibine (izleyici ve baska oyuncu gormez), delta ve onarilinca kaybolma, olcek ile birlikte; sema bicimi; DONDURULMUS eski bolge karesi semasi yeni kareyi kabul eder ve alani atar.
- Sonuc: protokol 40 test gecti (4 dosya), tsc ve eslint temiz. Istemci (K1): `ozel.tesisAsinma` satirlarini tesis kimligine gore eslemek yeterli; verim kaybi = asinma x `sanayi.bakim.asinmaVerimKaybiTavaniPpm` (verimPpm bunu icermez).
