/**
 * Ad kuralı vaka tablosu (§7.7): görünen ad ucu (sunucu) ve marka adı (çekirdek `markaAdiHatasi`, G7) AYNI sonucu vermelidir. Şimdilik `adKanonik` ile sınanır
 * (`gorunen-ad.test.ts`); K3 G7'de çekirdeğe `markaAdiHatasi`/marka komutunu yazınca aynı tablo iki işlevin eşitliğini sınamak için kullanılır.
 * `kanonik`: beklenen sonuç (küçük harfli ad); `hata`: ret iletisinin içermesi gereken parça (çekirdek iletileri "marka adi ..." biçimindedir).
 */
export interface AdVakasi {
  ad: string;
  kanonik?: string;
  hata?: RegExp;
}

export const AD_VAKALARI: readonly AdVakasi[] = [
  // Kabul + küçük harfe çevirme (Türkçe sabit tablo: İ -> i, I -> ı)
  { ad: "ali", kanonik: "ali" },
  { ad: "İSTANBUL Fırını", kanonik: "istanbul fırını" },
  { ad: "IŞIK", kanonik: "ışık" },
  { ad: "ISIK", kanonik: "ısık" },
  { ad: "Çalışkan Değirmenci 42", kanonik: "çalışkan değirmenci 42" },
  { ad: "ÖĞRETMEN ŞÜKRÜ", kanonik: "öğretmen şükrü" },
  { ad: "a.b'c&d-e", kanonik: "a.b'c&d-e" },
  { ad: "ab", kanonik: "ab" }, // en kısa
  { ad: "a".repeat(24), kanonik: "a".repeat(24) }, // en uzun
  { ad: "x1", kanonik: "x1" },
  // Ret: uzunluk
  { ad: "a", hata: /2 ile 24 karakter/ },
  { ad: "", hata: /2 ile 24 karakter/ },
  { ad: "a".repeat(25), hata: /2 ile 24 karakter/ },
  // Ret: karakter kümesi (emoji, akıllı tırnak, kontrol, çift tırnak, alt çizgi, @)
  { ad: "ali😀", hata: /gecersiz karakter/ },
  { ad: "ali’ nin", hata: /gecersiz karakter/ }, // U+2019: istemci çevirir, sunucu reddeder
  { ad: "“ali”", hata: /gecersiz karakter/ },
  { ad: "ali_veli", hata: /gecersiz karakter/ },
  { ad: "ali@ornek.org", hata: /gecersiz karakter/ },
  { ad: "ali\u0000", hata: /gecersiz karakter/ },
  { ad: "é́cole", hata: /gecersiz karakter/ },
  // Ret: boşluk kuralları (düzeltme YOK: kırpılmaz)
  { ad: " ali", hata: /bastan ya da sondan bosluk/ },
  { ad: "ali ", hata: /bastan ya da sondan bosluk/ },
  { ad: "ali  veli", hata: /art arda bosluk/ },
  // Ret: en az bir harf
  { ad: "1234", hata: /en az bir harf/ },
  { ad: "-.-", hata: /en az bir harf/ },
];
