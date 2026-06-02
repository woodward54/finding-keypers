import * as THREE from "three";

/* Deterministic PRNG — matches the gallery's <DecoPortrait>. */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const palettes = [
  ["#1a140c", "#7a5a2e", "#e9c66b"],
  ["#0e0e0e", "#8a6a32", "#f2d27a"],
  ["#171008", "#9c7838", "#ffe08a"],
  ["#120f0a", "#6e5226", "#d9b765"],
  ["#0d0b07", "#a07c3c", "#ffd97a"],
];

/**
 * Canvas version of the gallery's deco portrait, so placeholder keypers (which
 * have no uploaded image) still get a real texture in the 3D viewer.
 */
export function makeDecoPortraitTexture(seed: number) {
  const SCALE = 2;
  const W = 200;
  const H = 260;
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  const rng = seeded(seed + 7);
  const [bg, bronze, gold] = palettes[seed % palettes.length];
  const rays = 16 + Math.floor(rng() * 10) * 2;
  const headR = 20 + rng() * 8;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Radial glow
  const glow = ctx.createRadialGradient(100, 96, 10, 100, 96, 150);
  glow.addColorStop(0, gold);
  glow.addColorStop(1, bg);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Sunburst rays
  ctx.save();
  ctx.translate(100, 96);
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const len = 120 + (i % 2 === 0 ? 18 : 0);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.strokeStyle = i % 2 === 0 ? gold : bronze;
    ctx.lineWidth = i % 2 === 0 ? 1.4 : 0.7;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Metal gradient for the figure
  const metal = ctx.createLinearGradient(0, 0, W, H);
  metal.addColorStop(0, bronze);
  metal.addColorStop(0.5, gold);
  metal.addColorStop(1, bronze);

  // Head + shoulders
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.arc(100, 92, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(100 - headR - 26, 230);
  ctx.bezierCurveTo(100 - headR - 18, 165, 100 - 10, 118 + headR, 100, 118 + headR);
  ctx.bezierCurveTo(100 + 10, 118 + headR, 100 + headR + 18, 165, 100 + headR + 26, 230);
  ctx.closePath();
  ctx.fill();

  // Collar chevrons
  ctx.strokeStyle = bg;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.8;
  ctx.save();
  ctx.translate(100, 196);
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(22, 0);
  ctx.moveTo(-22, 12);
  ctx.lineTo(0, 26);
  ctx.lineTo(22, 12);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;

  // Stepped deco frame
  ctx.strokeStyle = metal;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 184, 244);
  ctx.beginPath();
  ctx.moveTo(8, 28);
  ctx.lineTo(28, 28);
  ctx.lineTo(28, 8);
  ctx.moveTo(192, 28);
  ctx.lineTo(172, 28);
  ctx.lineTo(172, 8);
  ctx.moveTo(8, 232);
  ctx.lineTo(28, 232);
  ctx.lineTo(28, 252);
  ctx.moveTo(192, 232);
  ctx.lineTo(172, 232);
  ctx.lineTo(172, 252);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

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
