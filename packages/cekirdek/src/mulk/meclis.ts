/** Meclis katılımı: tek siyasi ilçe kaydı ve gerçek başarılı komut günleri; seçim/yetki vermez. */
import { GUN } from "../tipler";
import type { DerlenmisIcerik, Dunya, Komut, KomutSonucu, MeclisGorunumu } from "../tipler";
import { MULKSUZ_PAKET } from "../mulksuz";

function arsasiVar(d: Readonly<Dunya>, oyuncu: string, ilce: string): boolean {
  return d.mulk?.hucreler.some((h) => h.sahip === oyuncu && h.ilce === ilce) === true;
}

/** Başarılı, sistem dışı oyuncu komutundan SONRA çağrılır; son parsel bırakma gün kazandırmaz. */
export function meclisGunKaydet(d: Dunya, oyuncu: string): void {
  if (MULKSUZ_PAKET) return;
  const m = d.mulk?.oyuncular.find((o) => o.id === oyuncu)?.meclis;
  if (m === undefined || !arsasiVar(d, oyuncu, m.ilce)) return;
  const bugun = Math.floor(d.zaman / GUN);
  // Yazım sadece gerçek başarılı komut günlerinde yapılır. Eski kayıt görüntü alırken budanmaz.
  m.etkinGunler = m.etkinGunler.filter((g) => g >= bugun - 6);
  if (m.etkinGunler[m.etkinGunler.length - 1] !== bugun) m.etkinGunler.push(bugun);
}

export function meclisKatil(d: Dunya, ic: DerlenmisIcerik, oyuncu: string, k: Extract<Komut, { tur: "meclis_katil" }>): KomutSonucu {
  const ret = (hata: string): KomutSonucu => ({ tamam: false, hata });
  if (MULKSUZ_PAKET || d.mulk === undefined || ic.mulk === undefined) return ret("Meclis katılımı yalnız mülk dünyasında kullanılabilir.");
  if (typeof k.ilce !== "string" || !ic.mulk.ilceler.has(k.ilce)) return ret("İlçe bulunamadı.");
  const mo = d.mulk.oyuncular.find((o) => o.id === oyuncu);
  if (mo === undefined) return ret("Oyuncunun mülk kaydı bulunamadı.");
  if (k.oncekiIlce !== null && typeof k.oncekiIlce !== "string") return ret("Önceki ilçe kaydı geçersiz.");
  if (k.oncekiIlce !== (mo.meclis?.ilce ?? null)) return ret("Meclis kaydınız değişmiş; güncel kaydı yenileyin.");
  if (mo.meclis?.ilce === k.ilce) return ret("Bu ilçe meclisine zaten kayıtlısınız.");
  if (!arsasiVar(d, oyuncu, k.ilce)) return ret("Katılmak için bu ilçede size ait en az bir arsa gerekiyor.");
  mo.meclis = { ilce: k.ilce, kayitZamani: d.zaman, etkinGunler: [Math.floor(d.zaman / GUN)] };
  return { tamam: true };
}

/** Sahip özel görünümü. Eskimiş günleri saf filtreler; üyelik veya kuyruk değişmez. */
export function meclisGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: string, ilce: string): MeclisGorunumu | undefined {
  if (MULKSUZ_PAKET || ic.mulk?.ilceler.has(ilce) !== true) return undefined;
  const mo = d.mulk?.oyuncular.find((o) => o.id === oyuncu);
  if (mo === undefined) return undefined;
  const m = mo.meclis;
  const bugun = Math.floor(d.zaman / GUN);
  const etkinGunSayisi = m?.etkinGunler.filter((g) => g >= bugun - 6 && g <= bugun).length ?? 0;
  const buIlcedeArsa = arsasiVar(d, oyuncu, ilce);
  const kayitliIlcedeArsa = m !== undefined && arsasiVar(d, oyuncu, m.ilce);
  const ayniIlce = m?.ilce === ilce;
  const v: MeclisGorunumu = { ilce, etkinGunSayisi, gerekliGun: 3, pencereGun: 7, kayitliIlcedeArsa, buIlcedeArsa,
    katilimKosulu: ayniIlce && kayitliIlcedeArsa && etkinGunSayisi >= 3, kayitUygun: !ayniIlce && buIlcedeArsa };
  if (m !== undefined) { v.kayitliIlce = m.ilce; v.kayitZamani = m.kayitZamani; }
  if (ayniIlce) v.engel = "Bu ilçe meclisine zaten kayıtlısınız.";
  else if (!buIlcedeArsa) v.engel = "Katılmak için bu ilçede size ait en az bir arsa gerekiyor.";
  return v;
}
