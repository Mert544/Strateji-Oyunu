/**
 * Harita yükleyici: önce gerçek Karadeniz haritası (packages/veri/haritalar/gercek-karadeniz.json + TopoJSON
 * sınır dosyası), yoksa GEÇİCİ katman (sentetik-50 bölgeleri Natural Earth admin-1 illerine eşlenmiş).
 * Hangisinin kullanılacağı derleme anında `virtual:harita-verisi` sanal modülüyle belirlenir (vite.config.ts).
 */
import type { HaritaDosyasi } from "@bolge/veri";
import { gercek, yedek } from "virtual:harita-verisi";
import { haritayiBirlestir } from "./harita-birlestir";
import type { DunyaHaritasi } from "./harita-birlestir";
import type { TopoVeri } from "./cografya";

export type { DunyaHaritasi, BolgeGeo } from "./harita-birlestir";

/** Sanal modüldeki veriyi (gerçek varsa o, yoksa geçici) DunyaHaritasi'na çevirir. */
export function haritaYukle(): DunyaHaritasi {
  if (gercek) return haritayiBirlestir(gercek.harita as HaritaDosyasi, gercek.sinir as unknown as TopoVeri, false);
  if (!yedek) throw new Error("harita verisi yok");
  return haritayiBirlestir(yedek.harita as unknown as HaritaDosyasi, yedek.sinir as unknown as TopoVeri, true);
}
