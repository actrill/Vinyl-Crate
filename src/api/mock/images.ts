import type { MockRecord } from './data';

// Draws stand-in artwork for the demo collection: simple mid-century-style
// geometric covers, a text-heavy back cover, and centre labels.

const PALETTES: Array<[string, string, string]> = [
  ['#1d3557', '#e63946', '#f1faee'], ['#264653', '#e9c46a', '#f4f1de'], ['#3d2b1f', '#d4a373', '#fefae0'],
  ['#0b3954', '#bfd7ea', '#ff5a5f'], ['#2b2d42', '#ef8354', '#edf2f4'], ['#14213d', '#fca311', '#e5e5e5'],
  ['#5f0f40', '#fb8b24', '#f7ede2'], ['#283618', '#dda15e', '#fefae0'], ['#1b4332', '#95d5b2', '#f8f9fa'],
  ['#6a040f', '#ffba08', '#f8f1e5'],
];

function rng(seed: number) {
  let s = seed % 2147483647;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = t;
  }
  ctx.fillText(line, x, y);
  return y;
}

export async function drawMockImage(r: MockRecord, kind: 'front' | 'back' | 'labelA' | 'labelB'): Promise<Blob> {
  await Promise.all([document.fonts.load('600 64px Jost'), document.fonts.load('400 20px "Source Serif 4"')]).catch(() => undefined);
  const [bg, accent, light] = PALETTES[r.id % PALETTES.length]!;
  const rand = rng(r.id);
  const artist = r.artists.map(([n, j]) => `${n}${j ? ` ${j} ` : ''}`).join('').trim();
  const [c, ctx] = makeCanvas(1000);

  if (kind === 'front') {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1000, 1000);
    const style = r.id % 3;
    ctx.fillStyle = accent;
    if (style === 0) {
      for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.85 - i * 0.12; ctx.beginPath(); ctx.arc(250 + rand() * 500, 250 + rand() * 350, 90 + rand() * 180, 0, Math.PI * 2); ctx.fill(); }
    } else if (style === 1) {
      for (let i = 0; i < 9; i++) { ctx.globalAlpha = 0.4 + rand() * 0.6; ctx.fillRect(80 + i * 95, 120 + rand() * 200, 55, 300 + rand() * 260); }
    } else {
      ctx.globalAlpha = 0.9; ctx.fillRect(0, 0, 1000, 420); ctx.fillStyle = light; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(720, 420, 200, Math.PI, 0); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = light;
    ctx.font = '600 92px Jost, sans-serif';
    const y = wrap(ctx, r.title, 70, 740, 860, 96);
    ctx.font = '400 50px Jost, sans-serif';
    ctx.fillText(artist, 70, Math.min(950, y + 80));
  } else if (kind === 'back') {
    ctx.fillStyle = '#efe9db'; ctx.fillRect(0, 0, 1000, 1000);
    ctx.fillStyle = '#1e1c19';
    ctx.font = '600 52px Jost, sans-serif'; ctx.fillText(r.title, 60, 110);
    ctx.font = '400 30px Jost, sans-serif'; ctx.fillText(artist, 60, 160);
    ctx.fillStyle = '#5b554b';
    for (let col = 0; col < 3; col++) {
      for (let line = 0; line < 30; line++) {
        const w = 230 + (rand() - 0.5) * 40;
        ctx.fillRect(60 + col * 300, 220 + line * 22, line % 9 === 8 ? w * 0.5 : w, 7);
      }
    }
    ctx.font = '400 26px "Source Serif 4", serif'; ctx.fillStyle = '#1e1c19';
    ctx.fillText(`${r.label} ${r.catno}`, 60, 940);
  } else {
    ctx.fillStyle = '#0b0b0c'; ctx.fillRect(0, 0, 1000, 1000);
    ctx.fillStyle = kind === 'labelA' ? accent : light;
    ctx.beginPath(); ctx.arc(500, 500, 480, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = kind === 'labelA' ? light : bg;
    ctx.textAlign = 'center';
    ctx.font = '600 64px Jost, sans-serif'; ctx.fillText(r.label, 500, 240);
    ctx.font = '400 40px Jost, sans-serif'; ctx.fillText(r.catno, 500, 310);
    ctx.font = '600 50px Jost, sans-serif'; wrap(ctx, r.title, 500, 680, 640, 56);
    ctx.font = '400 38px Jost, sans-serif'; ctx.fillText(kind === 'labelA' ? 'Side 1' : 'Side 2', 500, 840);
    ctx.fillStyle = '#0b0b0c'; ctx.beginPath(); ctx.arc(500, 500, 22, 0, Math.PI * 2); ctx.fill();
  }
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.88));
}
