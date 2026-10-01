/** Sahte arazi tonu ve yüksekliği (saf): kıtalara hafif rölyef hissi için kararlı, gürültüsüz sinüs birleşimi. */

/** 0-1 arası ton (kara renginin iki ucu arasındaki karışım). */
export function araziTonu(boylam: number, enlem: number): number {
  const a = Math.sin(boylam * 0.21 + Math.sin(enlem * 0.33) * 1.7);
  const b = Math.sin(enlem * 0.47 - boylam * 0.13 + 1.3);
  const c = Math.sin((boylam + enlem) * 0.83 + 2.1);
  const v = 0.5 + 0.28 * a + 0.16 * b + 0.06 * c;
  return Math.min(1, Math.max(0, v));
}

/** Kutba yakınlık (0 = yok, 1 = tam buzul/kar): 62 derecenin üstünde yükselir. */
export function kutupOrani(enlem: number): number {
  const e = Math.abs(enlem);
  return Math.min(1, Math.max(0, (e - 62) / 18));
}

/** Kara yüzeyinin yarıçap eki (ufak kabartı): 0 - 0.0016 arası. */
export function araziYuksekligi(boylam: number, enlem: number): number {
  return 0.0016 * araziTonu(boylam * 1.7 + 11, enlem * 1.9 - 5);
}
