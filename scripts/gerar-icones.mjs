// Monograma do cartão do Espaço Juju, sem dependências. Tudo cabe no círculo de
// 80% do centro, a zona segura do ícone "maskable".
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TAMANHO = 512;
const FUNDO = '#fef9f6';
const ROSA = '#c9637b';

const LETRA_E =
  'M130,150 H252 V198 H244 Q240,176 222,176 H186 V238 H214 Q226,238 228,224 H236 V268 H228 Q226,254 214,254 H186 V324 H226 Q246,324 250,298 H258 V350 H130 V340 Q150,340 150,328 V172 Q150,160 130,160 Z';
const LETRA_J =
  'M282,150 H382 V160 Q352,160 352,178 V330 Q352,404 284,404 Q256,404 254,384 Q262,392 280,390 Q318,386 318,330 V178 Q318,160 282,160 Z';
const FOLHA = 'M0,0 Q16,-11 34,0 Q16,11 0,0 Z';
const FOLHAS = [
  [118, 182, -150],
  [126, 168, -40],
  [146, 142, -160],
  [156, 126, -50],
  [180, 106, -165],
  [192, 96, -60],
  [214, 86, -170],
  [226, 80, -30],
];
const CAULE = { de: [104, 214], controle: [136, 124], ate: [236, 76], largura: 5 };
const ANEL = { centro: 256, raio: 172, largura: 9, vaoDe: 198, vaoAte: 252 };
const BOLINHA_J = { x: 266, y: 378, r: 17 };
const PONTOS = [
  [360, 366, 4],
  [372, 361, 4],
  [384, 356, 4],
];

function achatar(d, girar = 0, mover = [0, 0]) {
  const tokens = d.match(/[MHVLQZ]|-?\d+(?:\.\d+)?/g);
  const subcaminhos = [];
  let atual = [];
  let x = 0;
  let y = 0;
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      if (atual.length) subcaminhos.push(atual);
      x = num();
      y = num();
      atual = [[x, y]];
    } else if (cmd === 'H') atual.push([(x = num()), y]);
    else if (cmd === 'V') atual.push([x, (y = num())]);
    else if (cmd === 'L') atual.push([(x = num()), (y = num())]);
    else if (cmd === 'Q') {
      const [cx, cy, nx, ny] = [num(), num(), num(), num()];
      for (let t = 1; t <= 16; t++) {
        const s = t / 16;
        atual.push([
          (1 - s) ** 2 * x + 2 * (1 - s) * s * cx + s * s * nx,
          (1 - s) ** 2 * y + 2 * (1 - s) * s * cy + s * s * ny,
        ]);
      }
      x = nx;
      y = ny;
    }
  }
  if (atual.length) subcaminhos.push(atual);
  const a = (girar * Math.PI) / 180;
  return subcaminhos.map((pts) =>
    pts.map(([px, py]) => [
      px * Math.cos(a) - py * Math.sin(a) + mover[0],
      px * Math.sin(a) + py * Math.cos(a) + mover[1],
    ]),
  );
}

function dentro(poligonos, x, y) {
  let par = false;
  for (const p of poligonos) {
    for (let k = 0, j = p.length - 1; k < p.length; j = k++) {
      const [xi, yi] = p[k];
      const [xj, yj] = p[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) par = !par;
    }
  }
  return par;
}

function distanciaAoSegmento(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

const pontosDoCaule = achatar(
  `M${CAULE.de} Q${CAULE.controle} ${CAULE.ate}`.replaceAll(',', ' '),
)[0];

const FORMAS = [
  (x, y) => dentro(achatar(LETRA_E), x, y),
  (x, y) => dentro(achatar(LETRA_J), x, y),
  (x, y) => Math.hypot(x - BOLINHA_J.x, y - BOLINHA_J.y) <= BOLINHA_J.r,
  ...PONTOS.map(
    ([px, py, r]) =>
      (x, y) =>
        Math.hypot(x - px, y - py) <= r,
  ),
  ...FOLHAS.map(([fx, fy, a]) => {
    const poligono = achatar(FOLHA, a, [fx, fy]);
    return (x, y) => dentro(poligono, x, y);
  }),
  (x, y) =>
    pontosDoCaule.some(
      (p, k) => k > 0 && distanciaAoSegmento(x, y, pontosDoCaule[k - 1], p) <= CAULE.largura / 2,
    ),
  (x, y) => {
    const dx = x - ANEL.centro;
    const dy = y - ANEL.centro;
    if (Math.abs(Math.hypot(dx, dy) - ANEL.raio) > ANEL.largura / 2) return false;
    const angulo = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    return angulo < ANEL.vaoDe || angulo > ANEL.vaoAte;
  },
];

function svg() {
  const ponto = (graus) => {
    const a = (graus * Math.PI) / 180;
    return `${(ANEL.centro + ANEL.raio * Math.cos(a)).toFixed(1)},${(ANEL.centro + ANEL.raio * Math.sin(a)).toFixed(1)}`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TAMANHO} ${TAMANHO}">
  <title>Espaço Juju</title>
  <rect width="${TAMANHO}" height="${TAMANHO}" fill="${FUNDO}"/>
  <g fill="${ROSA}">
    <path d="${LETRA_E}"/>
    <path d="${LETRA_J}"/>
    <circle cx="${BOLINHA_J.x}" cy="${BOLINHA_J.y}" r="${BOLINHA_J.r}"/>
${PONTOS.map(([x, y, r]) => `    <circle cx="${x}" cy="${y}" r="${r}"/>`).join('\n')}
${FOLHAS.map(([x, y, a]) => `    <path d="${FOLHA}" transform="translate(${x} ${y}) rotate(${a})"/>`).join('\n')}
  </g>
  <g fill="none" stroke="${ROSA}">
    <path d="M${CAULE.de} Q${CAULE.controle} ${CAULE.ate}" stroke-width="${CAULE.largura}" stroke-linecap="round"/>
    <path d="M${ponto(ANEL.vaoAte)} A${ANEL.raio},${ANEL.raio} 0 1 1 ${ponto(ANEL.vaoDe)}" stroke-width="${ANEL.largura}"/>
  </g>
</svg>
`;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const COR_FUNDO = rgb(FUNDO);
const COR_ROSA = rgb(ROSA);

function png(lado) {
  const AMOSTRAS = 4;
  const escala = TAMANHO / lado;
  const linhas = Buffer.alloc(lado * (lado * 3 + 1));
  for (let py = 0; py < lado; py++) {
    const base = py * (lado * 3 + 1);
    for (let px = 0; px < lado; px++) {
      let cobertos = 0;
      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const x = (px + (sx + 0.5) / AMOSTRAS) * escala;
          const y = (py + (sy + 0.5) / AMOSTRAS) * escala;
          if (FORMAS.some((contem) => contem(x, y))) cobertos++;
        }
      }
      const f = cobertos / (AMOSTRAS * AMOSTRAS);
      for (let c = 0; c < 3; c++) {
        linhas[base + 1 + px * 3 + c] = Math.round(COR_FUNDO[c] * (1 - f) + COR_ROSA[c] * f);
      }
    }
  }
  const pedaco = (tipo, dados) => {
    const t = Buffer.from(tipo, 'ascii');
    const tam = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
    return Buffer.concat([tam, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco('IHDR', ihdr),
    pedaco('IDAT', deflateSync(linhas, { level: 9 })),
    pedaco('IEND', Buffer.alloc(0)),
  ]);
}

const TABELA = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

writeFileSync('public/logo.svg', svg());
process.stdout.write('public/logo.svg\n');
for (const [nome, lado] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(`public/${nome}`, png(lado));
  process.stdout.write(`public/${nome}\n`);
}
