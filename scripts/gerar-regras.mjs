// Gera as regras publicáveis a partir de `firestore.rules`, trocando o marcador
// pelo UID da manicure. O UID fica fora do Git: variável `UID_MANICURE` no
// ambiente ou no `.env.local`. Roda sozinho antes de `firebase deploy --only
// firestore` (predeploy no firebase.json).
//
//   node scripts/gerar-regras.mjs           UID de UID_MANICURE (deploy, emulador)
//   node scripts/gerar-regras.mjs --teste   UID fictício (testes de regras no CI)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const MARCADOR = '__UID_DA_MANICURE__';
export const UID_DE_TESTE = 'manicure-de-teste';
const MODELO = 'firestore.rules';
const DESTINO = '.firebase/firestore.rules';

function lerDoEnvLocal(nome) {
  if (!existsSync('.env.local')) return undefined;
  const linha = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${nome}=`));
  return linha
    ?.slice(linha.indexOf('=') + 1)
    .trim()
    .replace(/^["']|["']$/g, '');
}

const teste = process.argv.includes('--teste');
const uid = teste ? UID_DE_TESTE : (process.env.UID_MANICURE ?? lerDoEnvLocal('UID_MANICURE'));

if (!uid || !/^[A-Za-z0-9_-]{6,128}$/.test(uid)) {
  console.error(
    'Falta o UID da manicure. Copie em Firebase → Authentication → Usuários e coloque no ' +
      '.env.local uma linha UID_MANICURE=<uid>. Depois rode o comando de novo.',
  );
  process.exit(1);
}

const modelo = readFileSync(MODELO, 'utf8');
if (!modelo.includes(`'${MARCADOR}'`)) {
  console.error(`O ${MODELO} precisa ter '${MARCADOR}' no lugar do UID.`);
  process.exit(1);
}

mkdirSync('.firebase', { recursive: true });
writeFileSync(DESTINO, modelo.replaceAll(MARCADOR, uid));
process.stdout.write(`Regras geradas em ${DESTINO}${teste ? ' (UID de teste)' : ''}.\n`);
