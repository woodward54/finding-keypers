import * as THREE from "three";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function finish(c: HTMLCanvasElement, srgb = true) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * The grand arched window: a warm glowing pane behind an Art Deco muntin web,
 * framed by a thick bronze arch. Everything outside the arch is transparent so
 * a single plane reads as a real window opening.
 */
export function makeWindowTexture() {
  const W = 1024;
  const H = 1536;
  const { c, ctx } = canvas(W, H);
  const cx = W / 2;
  const margin = 70;
  const radius = cx - margin;
  const archY = margin + radius; // center of the semicircle top
  const bottom = H - margin;

  // Arched path
  const arch = new Path2D();
  arch.moveTo(margin, bottom);
  arch.lineTo(margin, archY);
  arch.arc(cx, archY, radius, Math.PI, 0, false);
  arch.lineTo(W - margin, bottom);
  arch.closePath();

  ctx.save();
  ctx.clip(arch);

  // Glowing pane
  const focus = archY + radius * 0.5;
  const g = ctx.createRadialGradient(cx, focus, 20, cx, focus, radius * 1.7);
  g.addColorStop(0, "#fff3cf");
  g.addColorStop(0.18, "#f6cf86");
  g.addColorStop(0.45, "#9c6f2e");
  g.addColorStop(0.75, "#3c2a14");
  g.addColorStop(1, "#150d06");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Muntin web — radiating lines from the focal point
  const gold = "rgba(20,13,6,0.85)";
  ctx.strokeStyle = gold;
  ctx.lineWidth = 7;
  const rays = 14;
  for (let i = 0; i < rays; i++) {
    const a = Math.PI + (i / (rays - 1)) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, archY);
    ctx.lineTo(cx + Math.cos(a) * radius * 1.4, archY + Math.sin(a) * radius * 1.4);
    ctx.stroke();
  }
  // Vertical mullions
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * (radius / 3.2);
    ctx.beginPath();
    ctx.moveTo(x, archY);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  // Concentric arcs (the geometric web)
  ctx.lineWidth = 6;
  for (let r = radius * 0.32; r < radius * 1.05; r += radius * 0.2) {
    ctx.beginPath();
    ctx.arc(cx, archY, r, Math.PI, 0, false);
    ctx.stroke();
  }
  // Horizontal transoms
  for (let y = archY + radius * 0.35; y < bottom; y += radius * 0.4) {
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(W - margin, y);
    ctx.stroke();
  }

  ctx.restore();

  // Thick bronze arch frame (stroke the clip path from inside outward)
  ctx.lineJoin = "round";
  const frame = ctx.createLinearGradient(0, 0, W, 0);
  frame.addColorStop(0, "#3a2912");
  frame.addColorStop(0.5, "#c79a4e");
  frame.addColorStop(1, "#3a2912");
  ctx.strokeStyle = frame;
  ctx.lineWidth = 46;
  ctx.stroke(arch);
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 8;
  ctx.stroke(arch);

  return finish(c, true);
}

/** Glossy black floor with a gold-inlaid Art Deco tile grid (tileable). */
export function makeFloorTexture() {
  const S = 1024;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = "#070707";
  ctx.fillRect(0, 0, S, S);

  const grid = 4;
  const step = S / grid;
  const gold = ctx.createLinearGradient(0, 0, S, S);
  gold.addColorStop(0, "#5a431d");
  gold.addColorStop(0.5, "#caa056");
  gold.addColorStop(1, "#5a431d");
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4;

  for (let i = 0; i <= grid; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, S);
    ctx.moveTo(0, i * step);
    ctx.lineTo(S, i * step);
    ctx.stroke();
  }
  // Deco diamond + square motif at each tile center
  ctx.lineWidth = 3;
  for (let x = 0; x < grid; x++) {
    for (let y = 0; y < grid; y++) {
      const px = x * step + step / 2;
      const py = y * step + step / 2;
      const r = step * 0.16;
      ctx.beginPath();
      ctx.moveTo(px, py - r);
      ctx.lineTo(px + r, py);
      ctx.lineTo(px, py + r);
      ctx.lineTo(px - r, py);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeRect(px - r * 1.7, py - r * 1.7, r * 3.4, r * 3.4);
    }
  }

  const tex = finish(c, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

/** Dark vertical Art Deco relief for the side / back walls. */
export function makeWallTexture() {
  const W = 512;
  const H = 1024;
  const { c, ctx } = canvas(W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#241910");
  bg.addColorStop(1, "#0c0805");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(150,112,52,0.5)";
  ctx.lineWidth = 6;
  for (let i = 1; i < 6; i++) {
    const x = (i / 6) * W;
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, H - 40);
    ctx.stroke();
  }
  // Stepped chevron capitals
  ctx.strokeStyle = "rgba(190,148,72,0.65)";
  ctx.lineWidth = 5;
  for (let s = 0; s < 4; s++) {
    const y = 60 + s * 18;
    ctx.beginPath();
    ctx.moveTo(40 + s * 14, y);
    ctx.lineTo(W / 2, y - 40);
    ctx.lineTo(W - 40 - s * 14, y);
    ctx.stroke();
  }

  const tex = finish(c, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** The emblem on the key's bow: a stylised Art Deco double peak in gold. */
export function makeEmblemTexture() {
  const S = 512;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);

  // Dark roundel
  ctx.fillStyle = "#0d0a06";
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 18;
  const ring = ctx.createLinearGradient(0, 0, S, S);
  ring.addColorStop(0, "#7a5a2e");
  ring.addColorStop(0.5, "#ffe2a0");
  ring.addColorStop(1, "#7a5a2e");
  ctx.strokeStyle = ring;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 28, 0, Math.PI * 2);
  ctx.stroke();

  // Double mountain peak
  ctx.strokeStyle = "#ffe2a0";
  ctx.lineWidth = 30;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(S * 0.26, S * 0.66);
  ctx.lineTo(S * 0.43, S * 0.4);
  ctx.lineTo(S * 0.54, S * 0.54);
  ctx.lineTo(S * 0.66, S * 0.36);
  ctx.lineTo(S * 0.78, S * 0.66);
  ctx.stroke();
  // Keystone dot
  ctx.fillStyle = "#ffe2a0";
  ctx.beginPath();
  ctx.arc(S / 2, S * 0.28, 16, 0, Math.PI * 2);
  ctx.fill();

  return finish(c, true);
}

/** Soft radial sprite for glowing particles. */
export function makeSparkTexture() {
  const S = 64;
  const { c, ctx } = canvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,236,180,1)");
  g.addColorStop(0.3, "rgba(255,200,110,0.7)");
  g.addColorStop(1, "rgba(255,180,80,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return finish(c, false);
}
