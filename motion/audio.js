// Procedural soundtrack for the teaser: sub drone, pad, risers, impacts on the
// cuts, tunnel whoosh, typing ticks, wipe shimmer, flare sweep. Pure Node, no deps.
// Cue times mirror CUT in scene.html.

const fs = require('fs');
const SR = 48000, DUR = 20, N = SR * DUR;
const CUTS = [4.2, 9.0, 14.0, 17.5];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lin = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const ss = (a, b, x) => { const u = lin(a, b, x); return u * u * (3 - 2 * u); };
function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }
function lp() { let y = 0; return (x, fc) => { const a = 1 - Math.exp(-2 * Math.PI * fc / SR); y += a * (x - y); return y; }; }

function write(file) {
  const L = new Float32Array(N), R = new Float32Array(N);
  const add = (i, l, r = l) => { L[i] += l; R[i] += r; };

  // 1. sub drone + fifth
  for (let i = 0; i < N; i++) {
    const t = i / SR, env = ss(0, 2.5, t) * (1 - ss(18.8, 19.9, t));
    const v = 0.20 * Math.sin(2 * Math.PI * 55 * t) + 0.07 * Math.sin(2 * Math.PI * 110 * t + 0.4 * Math.sin(2 * Math.PI * 0.2 * t)) + 0.05 * Math.sin(2 * Math.PI * 82.41 * t);
    const w = 0.12 * Math.sin(2 * Math.PI * 0.13 * t);
    add(i, v * env * (1 + w), v * env * (1 - w));
  }
  // 2. pad (detuned chord through a low-pass)
  { const f = [[220, 1], [329.63, 0.8], [440, 0.6], [554.37, 0.45]], lpL = lp(), lpR = lp();
    for (let i = 0; i < N; i++) { const t = i / SR, env = ss(1, 6, t) * (1 - ss(18.5, 19.6, t)) * 0.035; let a = 0, b = 0;
      for (const [fr, g] of f) { a += g * Math.sin(2 * Math.PI * fr * (1 + 0.0015 * Math.sin(2 * Math.PI * 0.11 * t)) * t); b += g * Math.sin(2 * Math.PI * fr * (1 - 0.0015 * Math.sin(2 * Math.PI * 0.09 * t)) * t); }
      add(i, lpL(a, 700) * env, lpR(b, 700) * env); } }
  // 3. risers into the crash zoom (1.2–4.2) and the lockup (15.6–17.5)
  for (const [a, b, g] of [[1.2, 4.2, 0.38], [15.6, 17.5, 0.26]]) {
    const nz = lcg(7 + a * 10), f1 = lp(), f2 = lp();
    for (let i = Math.floor(a * SR); i < Math.floor(b * SR); i++) { const t = i / SR, u = lin(a, b, t), fc = 150 * Math.pow(60, u), x = nz();
      const y = f1(x, fc) - f2(x, fc * 0.25); add(i, y * g * u * u * (0.9 + 0.1 * Math.sin(2 * Math.PI * (4 + 20 * u) * t))); }
  }
  // 4. impacts on the cuts
  for (const c of CUTS) {
    const nz = lcg(c * 100), n2 = lcg(c * 100 + 1), bl = lp(), tlL = lp(), tlR = lp(); let ph = 0;
    const end = Math.min(N, Math.floor((c + 3) * SR));
    for (let i = Math.floor(c * SR); i < end; i++) { const tau = i / SR - c, f = 38 + 75 * Math.exp(-12 * tau); ph += 2 * Math.PI * f / SR;
      const sub = 0.85 * Math.exp(-2.8 * tau) * Math.sin(ph), burst = 0.6 * Math.exp(-20 * tau) * bl(nz(), 3200);
      const tail = 0.16 * Math.exp(-1.6 * tau); add(i, sub + burst + tail * tlL(nz(), 420), sub + burst + tail * tlR(n2(), 420)); }
  }
  // 5. tunnel whoosh (4.2–9.0), louder when the camera is fast
  { const nz = lcg(55), f1 = lp(), f2 = lp();
    const speed = tl => tl < 1.4 ? 2.4 + (0.55 - 2.4) * (1 - Math.pow(1 - tl / 1.4, 3)) : tl < 3.4 ? 0.55 : 0.55 + (3.4 - 0.55) * Math.pow(2, 10 * ((tl - 3.4) / 1.4 - 1));
    for (let i = Math.floor(4.2 * SR); i < Math.floor(9.0 * SR); i++) { const t = i / SR, tl = t - 4.2, sp = speed(tl), x = nz();
      const y = f1(x, 700 + 900 * sp) - f2(x, 180 + 120 * sp), g = 0.1 * clamp(sp / 3, 0.25, 1), pan = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.4 * t);
      add(i, y * g * (1 - 0.6 * pan), y * g * (0.4 + 0.6 * pan)); } }
  // 6. typing ticks (scene 3 typing runs 9.25–11.35)
  { const nz = lcg(9), hp = lp(); let k = 0;
    for (let tt = 9.3; tt < 11.35; tt += 0.075 + 0.03 * Math.abs(Math.sin(k++ * 3.7))) {
      for (let i = Math.floor(tt * SR); i < Math.floor((tt + 0.02) * SR); i++) { const tau = i / SR - tt, x = nz(); add(i, 0.16 * Math.exp(-tau * 450) * (x - hp(x, 2500))); } } }
  // 7. conversion wipe shimmer (11.8–13.2)
  { const nz = lcg(21), f1 = lp(), f2 = lp();
    for (let i = Math.floor(11.8 * SR); i < Math.floor(13.2 * SR); i++) { const t = i / SR, u = lin(11.8, 13.2, t), c = 700 * Math.pow(9, u), x = nz();
      const y = f1(x, c * 1.3) - f2(x, c * 0.8), g = 0.14 * Math.sin(Math.PI * u); add(i, y * g * (1 - u), y * g * u); } }
  // 8. flare sweep "shing" (17.8–19.2)
  { let ph = 0; const nz = lcg(33), f1 = lp(), f2 = lp();
    for (let i = Math.floor(17.8 * SR); i < Math.floor(19.2 * SR); i++) { const t = i / SR, u = lin(17.8, 19.2, t), fr = 1400 * Math.pow(3.5, u); ph += 2 * Math.PI * fr / SR;
      const g = 0.05 * Math.sin(Math.PI * u), x = nz(), sh = f1(x, 9000) - f2(x, 5000);
      add(i, (Math.sin(ph) * g + sh * 0.08 * Math.sin(Math.PI * u)) * (1 - u), (Math.sin(ph) * g + sh * 0.08 * Math.sin(Math.PI * u)) * u); } }

  // master: fade, soft clip, 16-bit PCM
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { const t = i / SR, m = ss(0, 0.3, t) * (1 - ss(19.3, 19.95, t));
    const l = Math.tanh(1.25 * L[i]) * 0.9 * m, r = Math.tanh(1.25 * R[i]) * 0.9 * m;
    buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(r * 32767), 46 + i * 4); }
  fs.writeFileSync(file, buf);
  return file;
}
module.exports = { write };
if (require.main === module) console.log('wrote', write(process.argv[2] || 'audio.wav'));
