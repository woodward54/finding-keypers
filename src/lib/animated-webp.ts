// Browser-side animated WebP muxing.
//
// Browsers can encode a *still* WebP (`canvas.toBlob('image/webp')`) and can
// decode an *animated* one (`ImageDecoder`), but there is no native API to
// encode an animated WebP. So we encode each frame as its own still WebP and
// stitch the frames together into an animated WebP container by hand.
//
// The container is a RIFF file: `RIFF`<size>`WEBP` followed by chunks. For an
// animation that means a `VP8X` extended header, an `ANIM` chunk (loop count +
// background), and one `ANMF` chunk per frame whose payload is the frame's
// image bitstream lifted out of the still WebP.
// Spec: https://developers.google.com/speed/webp/docs/riff_container

export type WebpFrame = {
  /** A complete still WebP file, e.g. the result of `canvas.toBlob('image/webp')`. */
  data: Uint8Array
  width: number
  height: number
  /** How long this frame is shown, in milliseconds. */
  duration: number
}

// A tiny little-endian byte buffer. WebP/RIFF stores everything LE, with some
// fields packed into 24 bits.
class ByteWriter {
  private bytes: number[] = []
  u8(v: number) {
    this.bytes.push(v & 0xff)
  }
  u16(v: number) {
    this.u8(v)
    this.u8(v >> 8)
  }
  u24(v: number) {
    this.u8(v)
    this.u8(v >> 8)
    this.u8(v >> 16)
  }
  u32(v: number) {
    this.u8(v)
    this.u8(v >> 8)
    this.u8(v >> 16)
    this.u8(v >> 24)
  }
  fourcc(tag: string) {
    for (let i = 0; i < 4; i++) this.u8(tag.charCodeAt(i))
  }
  raw(arr: Uint8Array) {
    for (let i = 0; i < arr.length; i++) this.bytes.push(arr[i])
  }
  get length() {
    return this.bytes.length
  }
  toUint8() {
    return Uint8Array.from(this.bytes)
  }
}

// Wrap a payload as a RIFF chunk: FourCC, 32-bit LE size, payload, and a pad
// byte so each chunk starts on an even offset.
function chunk(tag: string, payload: Uint8Array): Uint8Array {
  const w = new ByteWriter()
  w.fourcc(tag)
  w.u32(payload.length)
  w.raw(payload)
  if (payload.length & 1) w.u8(0)
  return w.toUint8()
}

// Pull the image bitstream sub-chunks (`VP8 ` / `VP8L` / `ALPH`) out of a still
// WebP file, keeping their 8-byte headers and padding. That byte range is
// exactly what an `ANMF` frame wants as its payload.
function extractBitstream(file: Uint8Array): Uint8Array {
  const dv = new DataView(file.buffer, file.byteOffset, file.byteLength)
  // Skip the 12-byte container header: `RIFF`<size>`WEBP`.
  let offset = 12
  const parts: Uint8Array[] = []
  while (offset + 8 <= file.length) {
    const tag = String.fromCharCode(file[offset], file[offset + 1], file[offset + 2], file[offset + 3])
    const size = dv.getUint32(offset + 4, true)
    const padded = size + (size & 1)
    if (tag === 'VP8 ' || tag === 'VP8L' || tag === 'ALPH') {
      parts.push(file.subarray(offset, offset + 8 + padded))
    }
    offset += 8 + padded
  }
  if (parts.length === 0) {
    throw new Error('animated-webp: no image bitstream found in still WebP frame')
  }
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let p = 0
  for (const part of parts) {
    out.set(part, p)
    p += part.length
  }
  return out
}

/**
 * Mux an array of still WebP frames into a single animated WebP blob.
 *
 * @param frames Still WebP files plus per-frame size and duration.
 * @param opts.loop Loop count, 0 (default) loops forever.
 */
export function muxAnimatedWebp(frames: WebpFrame[], opts: { loop?: number } = {}): Blob {
  if (frames.length === 0) throw new Error('animated-webp: no frames to mux')

  const canvasW = Math.max(...frames.map((f) => f.width))
  const canvasH = Math.max(...frames.map((f) => f.height))

  // VP8X: extended header flagging an animation of this canvas size. Bit layout
  // of the flags byte (MSB first) is Rsv Rsv I L E X A R; the animation bit (A)
  // is 0x02.
  const vp8x = new ByteWriter()
  vp8x.u8(0x02)
  vp8x.u24(0) // reserved
  vp8x.u24(canvasW - 1)
  vp8x.u24(canvasH - 1)

  // ANIM: background colour (BGRA, left transparent) + loop count.
  const anim = new ByteWriter()
  anim.u32(0x00000000)
  anim.u16(opts.loop ?? 0)

  const body = new ByteWriter()
  body.raw(chunk('VP8X', vp8x.toUint8()))
  body.raw(chunk('ANIM', anim.toUint8()))

  for (const frame of frames) {
    const bitstream = extractBitstream(frame.data)
    const anmf = new ByteWriter()
    anmf.u24(0) // frame X offset (in 2px units)
    anmf.u24(0) // frame Y offset
    anmf.u24(frame.width - 1)
    anmf.u24(frame.height - 1)
    anmf.u24(Math.max(0, Math.round(frame.duration)))
    anmf.u8(0) // blend over previous canvas, do not dispose
    anmf.raw(bitstream)
    body.raw(chunk('ANMF', anmf.toUint8()))
  }

  // RIFF wrapper around `WEBP` + the chunk body.
  const riff = new ByteWriter()
  riff.fourcc('RIFF')
  riff.u32(4 + body.length)
  riff.fourcc('WEBP')
  riff.raw(body.toUint8())

  return new Blob([riff.toUint8()], { type: 'image/webp' })
}
