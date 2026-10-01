/**
 * three.js köprüsü: yürüyüş yığınının kullandığı three sınıfları.
 *
 * Tek dosya HTML'de (mode "tek") three yalnız kabukta paketlidir; ayrı `yuru.js` dosyası three'yi yeniden
 * paketlemez. Kabuk bu nesneyi `globalThis.__bolgeThree` olarak koyar, `yuru.js` derlemesi (scripts/derle.ts)
 * ise `import ... from "three"` ifadelerini bu nesneden okuyan sanal bir modüle çevirir. Listedeki sınıfların
 * neredeyse hepsi küre çiziminde zaten kullanıldığından kabuğa eklenen bayt ihmal edilebilir.
 * Yürüyüş koduna yeni bir three içe aktarımı eklenirse buraya da eklenmelidir; eksikse yuru.js derlemesi
 * "X is not exported" hatasıyla durur.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  FloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from "three";

export const THREE_KOPRU = {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  FloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
};

export const KOPRU_ADI = "__bolgeThree";
