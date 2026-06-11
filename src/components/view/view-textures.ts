import * as THREE from "three";

/* ------------------------------------------------------------------ *
 * Procedural PBR maps for the black Art Deco frame.
 * One tileable height field drives albedo / normal / roughness /
 * metalness so the frame reads as textured black metal with subtle
 * hammered relief and fine deco ridges that catch the warm lighting.
 * ------------------------------------------------------------------ */
export type FramePBR = {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
};

export function makeFramePBR(): FramePBR {
  const S = 256;

  // --- Tileable value-noise lattice ---
  const G = 16;
  const lattice = new Float32Array(G * G);
  let seed = 1234567;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < G * G; i++) lattice[i] = rng();
  const latt = (ix: number, iy: number) =>
    lattice[(((iy % G) + G) % G) * G + (((ix % G) + G) % G)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const vnoise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = smooth(fx);
    const uy = smooth(fy);
    const a = latt(ix, iy);
    const b = latt(ix + 1, iy);
    const c = latt(ix, iy + 1);
    const d = latt(ix + 1, iy + 1);
    return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
  };

  // --- Height field ---
  const H = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x / S) * G;
      const v = (y / S) * G;
      const n =
        vnoise(u, v) * 0.6 + vnoise(u * 2, v * 2) * 0.3 + vnoise(u * 4, v * 4) * 0.1;
      let hgt = 0.45 + (n - 0.5) * 0.5;
      // Fine deco ridges on a tiling grid
      const gx = Math.min(Math.abs((x % 64) - 32), 32) / 32;
      const gy = Math.min(Math.abs((y % 64) - 32), 32) / 32;
      hgt += Math.pow(1 - Math.min(gx, gy), 8) * 0.22;
      H[y * S + x] = Math.max(0, Math.min(1, hgt));
    }
  }
  const h = (x: number, y: number) =>
    H[(((y % S) + S) % S) * S + (((x % S) + S) % S)];

  const newCanvas = () => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    return { c, ctx: c.getContext("2d")!, img: c.getContext("2d")!.createImageData(S, S) };
  };

  const colorC = newCanvas();
  const normalC = newCanvas();
  const roughC = newCanvas();
  const metalC = newCanvas();

  const strength = 2.2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const hv = H[y * S + x];

      // Normal (Sobel on the height field)
      let nx = (h(x - 1, y) - h(x + 1, y)) * strength;
      let ny = (h(x, y - 1) - h(x, y + 1)) * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      normalC.img.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      normalC.img.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normalC.img.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normalC.img.data[i + 3] = 255;

      // Albedo — near-black lacquer, raised bits a touch warmer
      const lift = Math.max(0, hv - 0.45) * 2;
      colorC.img.data[i] = Math.round(7 + lift * 34);
      colorC.img.data[i + 1] = Math.round(6 + lift * 26);
      colorC.img.data[i + 2] = Math.round(5 + lift * 16);
      colorC.img.data[i + 3] = 255;

      // Roughness — polished on the ridges, duller in the recesses
      const rough = Math.max(0.16, Math.min(0.85, 0.72 - (hv - 0.45) * 1.3));
      const rv = Math.round(rough * 255);
      roughC.img.data[i] = roughC.img.data[i + 1] = roughC.img.data[i + 2] = rv;
      roughC.img.data[i + 3] = 255;

      // Metalness — raised metal, recesses less so
      const metal = Math.max(0.25, Math.min(0.95, 0.45 + (hv - 0.45) * 1.6));
      const mv = Math.round(metal * 255);
      metalC.img.data[i] = metalC.img.data[i + 1] = metalC.img.data[i + 2] = mv;
      metalC.img.data[i + 3] = 255;
    }
  }

  colorC.ctx.putImageData(colorC.img, 0, 0);
  normalC.ctx.putImageData(normalC.img, 0, 0);
  roughC.ctx.putImageData(roughC.img, 0, 0);
  metalC.ctx.putImageData(metalC.img, 0, 0);

  const finish = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    t.anisotropy = 8;
    return t;
  };

  return {
    map: finish(colorC.c, true),
    normalMap: finish(normalC.c, false),
    roughnessMap: finish(roughC.c, false),
    metalnessMap: finish(metalC.c, false),
  };
}
