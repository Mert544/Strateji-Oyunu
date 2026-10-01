# kare-yontem (K2)

Dal `takim/k2/kare-yontem`, taban G6-2a `acbbedb`.

## Degisen

- `packages/protokol/src/kare.ts`: `OyuncuKaresi.insaatYontem?: Array<[insaat: number, yontem: string]>`. Yalniz oyuncunun KENDI insaatlarindan, komutla `yontem` verilmis olanlar icin (`InsaatDurumu.yontem`); yontemsiz insaat ya da hic yontemli insaat yoksa alan yazilmaz. Mevcut `insaatlar` demeti BUYUMEDI (protokol kurali: yeni veri = istege bagli nesne alani).
- `packages/protokol/src/mesajlar.ts`: `oyuncuKaresiSemasi.insaatYontem` isteğe bagli `[tam, string]` dizisi.
- `packages/protokol/test/kare-yontem.test.ts` (5 test): sahibinde `[[insaatId, yontem]]`; yontemsiz komutta alan yok ve kare gerisi bire bir ayni; baska oyuncu ve izleyici gormez; insaat bitince satir kaybolur (`deltaUygula(a, kareFarki(a, b)) = b`, delta semasi gecerli); eski sema (alan cikarilmis) yeni kareyi ayristirir ve alani atar, yeni sema alansiz kareyi aynen kabul eder.

## Sonuc

- `vitest run packages/protokol` 30 test gecti (3 dosya); protokol icin tsc ve eslint temiz.
- Istemci (K1): `InsaatBilgisi.yontem` icin `kare.oyuncu?.insaatYontem` satirlarini insaat kimligine gore eslemek yeterli.
