// Gera os ícones do app (PNG) sem dependências: fundo na cor da marca e uma
// agenda creme no centro, dentro da zona segura de ícone "maskable" (80%).
// Trocar pelo logo do Espaço Juju quando ele chegar (P14).
//
//   node scripts/gerar-icones.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const MARCA = [0xa8, 0x44, 0x5e];
const MARCA_ESCURA = [0x7d, 0x2e, 0x44];
const CREME = [0xfe, 0xf9, 0xf6];
const DECORATIVA = [0xc9, 0x63, 0x7b];

/** Retângulo de cantos arredondados, em coordenadas de 0 a 1. */
const retangulo = (x0, y0, x1, y1, r) => (x, y) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const circulo = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// camadas de baixo para cima; a última que contém o ponto define a cor
const CAMADAS = [
  [() => true, MARCA],
  [retangulo(0.24, 0.27, 0.76, 0.75, 0.06), CREME], // folha da agenda
  [retangulo(0.24, 0.27, 0.76, 0.39, 0.06), MARCA_ESCURA], // cabeçalho
  [retangulo(0.24, 0.33, 0.76, 0.39, 0), MARCA_ESCURA],
  [retangulo(0.34, 0.22, 0.39, 0.32, 0.025), CREME], // argolas
  [retangulo(0.61, 0.22, 0.66, 0.32, 0.025), CREME],
  ...[0.36, 0.5, 0.64].flatMap((x) => [0.5, 0.63].map((y) => [circulo(x, y, 0.045), DECORATIVA])),
  [circulo(0.64, 0.63, 0.065), MARCA], // o dia marcado
];

function cor(x, y) {
  let c = CAMADAS[0][1];
  for (const [contem, cc] of CAMADAS) if (contem(x, y)) c = cc;
  return c;
}

function png(tamanho) {
  const AMOSTRAS = 4; // 4 × 4 por pixel: bordas suaves
  const linhas = Buffer.alloc(tamanho * (tamanho * 3 + 1));
  for (let py = 0; py < tamanho; py++) {
    const base = py * (tamanho * 3 + 1);
    linhas[base] = 0; // filtro "none"
    for (let px = 0; px < tamanho; px++) {
      const soma = [0, 0, 0];
      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const c = cor(
            (px + (sx + 0.5) / AMOSTRAS) / tamanho,
            (py + (sy + 0.5) / AMOSTRAS) / tamanho,
          );
          soma[0] += c[0];
          soma[1] += c[1];
          soma[2] += c[2];
        }
      }
      for (let i = 0; i < 3; i++) {
        linhas[base + 1 + px * 3 + i] = Math.round(soma[i] / (AMOSTRAS * AMOSTRAS));
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
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
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

for (const [nome, tamanho] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(`public/${nome}`, png(tamanho));
  process.stdout.write(`public/${nome}\n`);
}
