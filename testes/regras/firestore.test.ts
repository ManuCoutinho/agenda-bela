import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/** As regras geradas por `scripts/gerar-regras.mjs --teste` (o `pnpm test:regras` gera antes). */
const REGRAS = readFileSync('.firebase/firestore.rules', 'utf8');
const MANICURE = 'manicure-de-teste';
const HORA = 3_600_000;

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-agenda-bela',
    firestore: { rules: REGRAS },
  });
});

beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

const visitante = () => env.unauthenticatedContext().firestore();
const manicure = () => env.authenticatedContext(MANICURE).firestore();
const daqui = (horas: number) => Timestamp.fromMillis(Date.now() + horas * HORA);

const trava = (data: string, hora: string, expiraEm: Timestamp | null = daqui(23)) => ({
  data,
  hora,
  expiraEm,
});

const pedido = (travas: string[], extra: Record<string, unknown> = {}) => ({
  nome: 'Ana',
  whatsapp: '5511987654321',
  servicoId: 'alongamento',
  inicio: daqui(48),
  consentimento: true,
  status: 'pendente',
  criadoEm: serverTimestamp(),
  travas,
  ...extra,
});

/** Simula `reservar`: travas e pedido no mesmo lote. */
function reservar(ids: string[], dadosPedido = pedido(ids)) {
  const db = visitante();
  const lote = db.batch();
  for (const id of ids) {
    const [data, hora] = id.split('_');
    lote.set(db.doc(`travas/${id}`), trava(data, hora));
  }
  lote.set(db.collection('pedidos').doc(), dadosPedido);
  return lote.commit();
}

describe('dados privados (RNF07)', () => {
  it('visitante não lê clientes, agendamentos, bloqueios nem pedidos', async () => {
    const db = visitante();
    await assertFails(db.doc('clientes/c1').get());
    await assertFails(db.doc('agendamentos/a1').get());
    await assertFails(db.doc('bloqueios/b1').get());
    await assertFails(db.doc('pedidos/p1').get());
  });

  it('nenhum UID real fica no Git: o modelo só tem o marcador', () => {
    const modelo = readFileSync('firestore.rules', 'utf8');
    expect(modelo).toContain("return '__UID_DA_MANICURE__';");
    expect(REGRAS).toContain(`return '${MANICURE}';`);
  });

  it('só a manicure lê e grava os celulares que recebem avisos (config/notificacoes)', async () => {
    const ref = (db: ReturnType<typeof visitante>) => db.doc('config/notificacoes');
    await assertSucceeds(ref(manicure()).set({ tokens: ['t1'] }));
    await assertFails(ref(visitante()).get());
    await assertFails(ref(env.authenticatedContext('outra').firestore()).set({ tokens: ['x'] }));
  });

  it('outra conta Google também não lê clientes', async () => {
    await assertFails(env.authenticatedContext('outra').firestore().doc('clientes/c1').get());
  });

  it('manicure lê e grava clientes', async () => {
    await assertSucceeds(manicure().doc('clientes/c1').set({ nome: 'Ana' }));
    await assertSucceeds(manicure().doc('clientes/c1').get());
  });

  it('config/acesso (conferência de login): só a manicure lê', async () => {
    await assertSucceeds(manicure().doc('config/acesso').get());
    await assertFails(env.authenticatedContext('outra').firestore().doc('config/acesso').get());
  });

  it('visitante lê só config/publico', async () => {
    await assertSucceeds(visitante().doc('config/publico').get());
    await assertFails(visitante().doc('config/privado').get());
    await assertFails(visitante().doc('config/publico').set({ nome: 'x' }));
  });
});

describe('travas (RNF08)', () => {
  it('visitante cria trava válida', async () => {
    await assertSucceeds(
      visitante().doc('travas/2026-12-01_0900').set(trava('2026-12-01', '0900')),
    );
  });

  it('não cria trava com ID diferente de data_hora', async () => {
    await assertFails(visitante().doc('travas/2026-12-01_1000').set(trava('2026-12-01', '0900')));
  });

  it('não cria trava que dura mais de 24 h', async () => {
    await assertFails(
      visitante()
        .doc('travas/2026-12-01_0900')
        .set(trava('2026-12-01', '0900', daqui(25))),
    );
  });

  it('não sobrescreve trava ativa de outra cliente', async () => {
    await reservar(['2026-12-01_0900']);
    await assertFails(visitante().doc('travas/2026-12-01_0900').set(trava('2026-12-01', '0900')));
  });

  it('não sobrescreve trava confirmada (expiraEm nulo)', async () => {
    await manicure()
      .doc('travas/2026-12-01_0900')
      .set(trava('2026-12-01', '0900', null));
    await assertFails(visitante().doc('travas/2026-12-01_0900').set(trava('2026-12-01', '0900')));
  });

  it('assume trava expirada (RN02)', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .doc('travas/2026-12-01_0900')
        .set(trava('2026-12-01', '0900', daqui(-1))),
    );
    await assertSucceeds(
      visitante().doc('travas/2026-12-01_0900').set(trava('2026-12-01', '0900')),
    );
  });

  it('visitante não apaga trava', async () => {
    await reservar(['2026-12-01_0900']);
    await assertFails(visitante().doc('travas/2026-12-01_0900').delete());
  });
});

describe('pedidos (HU03)', () => {
  it('grava pedido e travas no mesmo lote', async () => {
    await assertSucceeds(reservar(['2026-12-01_0900', '2026-12-01_0930']));
  });

  it('segunda cliente no mesmo horário é recusada e nada é gravado', async () => {
    await reservar(['2026-12-01_0900', '2026-12-01_0930']);
    await assertFails(reservar(['2026-12-01_0930', '2026-12-01_1000']));
    const sobra = await manicure().doc('travas/2026-12-01_1000').get();
    if (sobra.exists) throw new Error('o lote recusado não deveria gravar a trava das 10h');
  });

  it('não aceita pedido sem as travas no mesmo lote', async () => {
    await assertFails(
      visitante()
        .collection('pedidos')
        .doc()
        .set(pedido(['2026-12-01_0900'])),
    );
  });

  it('não aceita pedido sem consentimento', async () => {
    const ids = ['2026-12-01_0900'];
    await assertFails(reservar(ids, pedido(ids, { consentimento: false })));
  });

  it('não aceita WhatsApp fora do formato 55 + DDD + número', async () => {
    const ids = ['2026-12-01_0900'];
    await assertFails(reservar(ids, pedido(ids, { whatsapp: '(11) 98765-4321' })));
  });

  it('não aceita campos extras', async () => {
    const ids = ['2026-12-01_0900'];
    await assertFails(reservar(ids, pedido(ids, { observacao: 'x' })));
  });

  it('não aceita início no passado nem além da janela (RN03)', async () => {
    const ids = ['2026-12-01_0900'];
    await assertFails(reservar(ids, pedido(ids, { inicio: daqui(-1) })));
    await assertFails(reservar(ids, pedido(ids, { inicio: daqui(93 * 24) })));
    await assertSucceeds(reservar(ids, pedido(ids, { inicio: daqui(90 * 24) })));
  });

  it('aceita até 12 blocos (5 h + 1 h de intervalo), não 13', async () => {
    const blocos = (n: number, dia: string) =>
      Array.from({ length: n }, (_, i) => {
        const m = 8 * 60 + i * 30;
        return `${dia}_${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}`;
      });
    await assertSucceeds(reservar(blocos(12, '2026-12-01')));
    await assertFails(reservar(blocos(13, '2026-12-02')));
  });

  it('RF14: página pausada não aceita pedido; reaberta, aceita', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .doc('config/publico')
        .set({ pausa: { ativa: true, aviso: '' } }),
    );
    await assertFails(reservar(['2026-12-01_0900']));
    await env.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .doc('config/publico')
        .set({ pausa: { ativa: false, aviso: '' } }),
    );
    await assertSucceeds(reservar(['2026-12-01_0900']));
  });

  it('visitante não lê pedidos; manicure lê', async () => {
    await reservar(['2026-12-01_0900']);
    await assertFails(visitante().collection('pedidos').get());
    await assertSucceeds(manicure().collection('pedidos').get());
  });
});
