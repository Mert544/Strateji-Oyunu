import { describe, expect, it } from "vitest";
import {
  azamiEgim, donder, enUzakMesafe, kameraBaslangic, kameraYerlesimi, mesafeKelepcele, pikselBasinaAci, sagVektoru, sigmaMesafesi,
  ucusBaslat, ucusIlerlet, yerelBaz, yuzeydeGez,
} from "../src/kamera/durum";
import { aci, llVek, nokta, uzunluk } from "../src/kure/matematik";

describe("kamera durumu", () => {
  it("yerel baz: doğu ve kuzey p'ye dik ve birbirine dik", () => {
    const p = llVek(30, 40);
    const { dogu, kuzey } = yerelBaz(p);
    expect(nokta(dogu, p)).toBeCloseTo(0, 12);
    expect(nokta(kuzey, p)).toBeCloseTo(0, 12);
    expect(nokta(dogu, kuzey)).toBeCloseTo(0, 12);
    expect(kuzey[1]).toBeGreaterThan(0);
  });

  it("uzaktayken eğim yok: kamera yüzey normalinde p*(1+dist) konumunda", () => {
    const d = kameraBaslangic(34, 41, 3);
    expect(azamiEgim(3)).toBe(0);
    const y = kameraYerlesimi(d);
    expect(uzunluk(y.konum)).toBeCloseTo(4, 9);
    expect(aci(y.konum, d.p)).toBeCloseTo(0, 9);
    expect(y.yakin).toBeLessThan(y.uzak);
  });

  it("yakınken eğim: kamera yüzeyden yükseklik dist*cos(eğim), yukarı vektörü bakışa dik", () => {
    const d = { ...kameraBaslangic(34, 41, 0.2), tiltFaktor: 1 };
    const y = kameraYerlesimi(d);
    const bakis = [d.p[0] - y.konum[0], d.p[1] - y.konum[1], d.p[2] - y.konum[2]] as [number, number, number];
    expect(nokta(bakis, y.yukari)).toBeCloseTo(0, 9);
    expect(uzunluk(bakis)).toBeCloseTo(0.2, 9);
    expect(uzunluk(y.konum)).toBeLessThan(1.2);
  });

  it("yüzeyde gezinme p'yi küre üzerinde tutar, yukarı yönü p'ye dik kalır, açı kadar ilerler", () => {
    let d = kameraBaslangic(0, 0, 1);
    d = yuzeydeGez(d, 0.3, 0);
    expect(uzunluk(d.p)).toBeCloseTo(1, 12);
    expect(nokta(d.p, d.f)).toBeCloseTo(0, 12);
    expect(aci(llVek(0, 0), d.p)).toBeCloseTo(0.3, 9);
    // sağa gitmek doğuya gitmektir
    expect(d.p[0]).toBeGreaterThan(0);
    // kutbun üstünden geçmek takılmaz
    let k = kameraBaslangic(10, 85, 0.5);
    for (let i = 0; i < 30; i++) k = yuzeydeGez(k, 0, 0.02);
    expect(uzunluk(k.p)).toBeCloseTo(1, 9);
    expect(nokta(k.p, k.f)).toBeCloseTo(0, 9);
  });

  it("döndürme yukarı yönünü açıya göre çevirir", () => {
    const d = kameraBaslangic(20, 30, 1);
    const r = donder(d, Math.PI / 2);
    expect(aci(d.f, r.f)).toBeCloseTo(Math.PI / 2, 9);
    expect(nokta(sagVektoru(d), r.f)).toBeCloseTo(-1, 9);
  });

  it("uzaklık sınırları: dar (dikey) ekranda küreyi sığdırmak için daha uzak", () => {
    expect(sigmaMesafesi(0.46)).toBeGreaterThan(sigmaMesafesi(1.6));
    expect(mesafeKelepcele(100, 1.6)).toBeCloseTo(enUzakMesafe(1.6), 9);
    expect(mesafeKelepcele(0.0001, 1.6)).toBeGreaterThan(0.01);
    expect(pikselBasinaAci(kameraBaslangic(0, 0, 0.1), 900)).toBeLessThan(pikselBasinaAci(kameraBaslangic(0, 0, 2), 900));
  });

  it("uçuş hedefe varır ve orta noktada geri çekilir", () => {
    const bas = kameraBaslangic(0, 0, 0.3);
    const hedef = { p: llVek(40, 20), dist: 0.1 };
    const u = ucusBaslat(bas, hedef);
    let d = bas;
    let enYuksek = 0;
    for (let i = 0; i < 400; i++) {
      const [yeni, bitti] = ucusIlerlet(u, 0.02);
      d = yeni;
      enYuksek = Math.max(enYuksek, d.dist);
      if (bitti) break;
    }
    expect(aci(d.p, hedef.p)).toBeLessThan(1e-9);
    expect(d.dist).toBeCloseTo(0.1, 6);
    expect(enYuksek).toBeGreaterThan(0.3);
    expect(nokta(d.p, d.f)).toBeCloseTo(0, 9);
  });
});
