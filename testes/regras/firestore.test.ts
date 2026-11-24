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

  it('chave Pix (config/pagamento): só a manicure lê e grava', async () => {
    const pagamento = { chavePix: 'ana@pix.com', sinalPercentual: 50 };
    await assertSucceeds(manicure().doc('config/pagamento').set(pagamento));
    await assertSucceeds(manicure().doc('config/pagamento').get());
    await assertFails(visitante().doc('config/pagamento').get());
    await assertFails(visitante().doc('config/pagamento').set(pagamento));
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

  it('I02: aceita o maior pedido da página (5 h + 1 h de intervalo = 6 travas de 1 h)', async () => {
    const ids = ['09', '10', '11', '12', '13', '14'].map((h) => `2026-12-01_${h}00`);
    await assertSucceeds(reservar(ids));
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

  it('I06: só aceita pedido nos meses abertos, no horário de Brasília', async () => {
    const base = new Date(Date.now() + 30 * 24 * HORA);
    const ano = base.getUTCFullYear();
    const mes = base.getUTCMonth();
    // 01:00 UTC do dia 1 = 22:00 do último dia do mês anterior em São Paulo
    const virada = Timestamp.fromDate(new Date(Date.UTC(ano, mes + 1, 1, 1)));
    const mesEmSP = ano * 100 + mes + 1;
    const seguinte = mes === 11 ? (ano + 1) * 100 + 1 : mesEmSP + 1;
    const abrir = (mesesAbertos: number[]) =>
      env.withSecurityRulesDisabled((ctx) =>
        ctx.firestore().doc('config/publico').set({ mesesAbertos }),
      );
    const ids = ['2026-12-01_0900'];

    await abrir([seguinte]);
    await assertFails(reservar(ids, pedido(ids, { inicio: virada })));
    await abrir([mesEmSP]);
    await assertSucceeds(reservar(ids, pedido(ids, { inicio: virada })));
  });

  it('visitante não lê pedidos; manicure lê', async () => {
    await reservar(['2026-12-01_0900']);
    await assertFails(visitante().collection('pedidos').get());
    await assertSucceeds(manicure().collection('pedidos').get());
  });
});

describe('confirmação automática (I08)', () => {
  /** Simula `reservar` atual: pedido confirmado e travas definitivas dele, no mesmo lote. */
  function confirmar(ids: string[], extra: Record<string, unknown> = {}, travaExtra = {}) {
    const db = visitante();
    const ref = db.collection('pedidos').doc();
    const lote = db.batch();
    for (const id of ids) {
      const [data, hora] = id.split('_');
      lote.set(db.doc(`travas/${id}`), {
        data,
        hora,
        expiraEm: null,
        pedidoId: ref.id,
        ...travaExtra,
      });
    }
    lote.set(ref, pedido(ids, { status: 'confirmado', ...extra }));
    return { ref, commit: () => lote.commit() };
  }

  it('cliente confirma na hora: pedido confirmado e travas definitivas', async () => {
    const { commit } = confirmar(['2026-12-01_0900', '2026-12-01_1000']);
    await assertSucceeds(commit());
    const t = await manicure().doc('travas/2026-12-01_0900').get();
    expect(t.data()?.expiraEm).toBeNull();
  });

  it('segunda cliente no mesmo horário é recusada', async () => {
    await confirmar(['2026-12-01_0900']).commit();
    await assertFails(confirmar(['2026-12-01_0900']).commit());
    await assertFails(reservar(['2026-12-01_0900']));
  });

  it('trava definitiva sem o pedido no mesmo lote é recusada', async () => {
    await assertFails(
      visitante()
        .doc('travas/2026-12-01_0900')
        .set({ data: '2026-12-01', hora: '0900', expiraEm: null, pedidoId: 'p1' }),
    );
  });

  it('trava definitiva sem pedidoId é recusada', async () => {
    await assertFails(
      visitante()
        .doc('travas/2026-12-01_0900')
        .set({ data: '2026-12-01', hora: '0900', expiraEm: null }),
    );
  });

  it('pedido confirmado com trava de outro horário não serve', async () => {
    const db = visitante();
    const ref = db.collection('pedidos').doc();
    const lote = db.batch();
    lote.set(db.doc('travas/2026-12-01_0900'), {
      data: '2026-12-01',
      hora: '0900',
      expiraEm: null,
      pedidoId: ref.id,
    });
    lote.set(ref, pedido(['2026-12-01_1000'], { status: 'confirmado' }));
    await assertFails(lote.commit());
  });

  it('não prende de novo um horário cancelado usando um pedido antigo', async () => {
    const { ref, commit } = confirmar(['2026-12-01_0900']);
    await commit();
    await manicure().doc('travas/2026-12-01_0900').delete(); // manicure cancelou
    await assertFails(
      visitante()
        .doc('travas/2026-12-01_0900')
        .set({ data: '2026-12-01', hora: '0900', expiraEm: null, pedidoId: ref.id }),
    );
  });

  it('pedido confirmado também respeita mês aberto e pausa', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .doc('config/publico')
        .set({ pausa: { ativa: true, aviso: '' } }),
    );
    await assertFails(confirmar(['2026-12-01_0900']).commit());
  });
});

describe('horário fixo (I11)', () => {
  const serie = (extra: Record<string, unknown> = {}) => ({
    nome: 'Ana',
    whatsapp: '5511987654321',
    servicoId: 'alongamento',
    hora: '1000',
    frequenciaDias: 7,
    primeiraData: '2026-12-05',
    ativa: true,
    criadoEm: serverTimestamp(),
    ...extra,
  });

  /** Uma data da série: pedido confirmado + travas; a série vai junto na primeira. */
  function data(serieId: string, ids: string[], comSerie: Record<string, unknown> | null) {
    const db = visitante();
    const ref = db.doc(`pedidos/${serieId}_${ids[0]?.slice(0, 10)}`);
    const lote = db.batch();
    if (comSerie) lote.set(db.doc(`series/${serieId}`), comSerie);
    for (const id of ids) {
      const [d, hora] = id.split('_');
      lote.set(db.doc(`travas/${id}`), { data: d, hora, expiraEm: null, pedidoId: ref.id });
    }
    lote.set(ref, pedido(ids, { status: 'confirmado', serieId }));
    return lote.commit();
  }

  it('grava a série com a primeira data e as outras datas em lotes separados', async () => {
    await assertSucceeds(data('s1', ['2026-12-05_1000'], serie()));
    await assertSucceeds(data('s1', ['2026-12-12_1000'], null));
  });

  it('uma data ocupada falha sozinha; as outras seguem', async () => {
    await data('s1', ['2026-12-05_1000'], serie());
    await confirmarAvulso('2026-12-12_1000');
    await assertFails(data('s1', ['2026-12-12_1000'], null));
    await assertSucceeds(data('s1', ['2026-12-19_1000'], null));
  });

  it('pedido com série que não existe ou de outro WhatsApp é recusado', async () => {
    await assertFails(data('nao-existe', ['2026-12-05_1000'], null));
    await assertFails(data('s2', ['2026-12-05_1000'], serie({ whatsapp: '5511900000000' })));
  });

  it('série com campos inválidos é recusada', async () => {
    await assertFails(data('s3', ['2026-12-05_1000'], serie({ frequenciaDias: 3 })));
    await assertFails(data('s4', ['2026-12-05_1000'], serie({ ativa: false })));
    await assertFails(data('s5', ['2026-12-05_1000'], serie({ hora: '1030' })));
  });

  it('visitante não lê séries; manicure lê e encerra', async () => {
    await data('s1', ['2026-12-05_1000'], serie());
    await assertFails(visitante().doc('series/s1').get());
    await assertSucceeds(manicure().doc('series/s1').update({ ativa: false }));
  });

  async function confirmarAvulso(id: string) {
    const db = visitante();
    const ref = db.collection('pedidos').doc();
    const [d, hora] = id.split('_');
    const lote = db.batch();
    lote.set(db.doc(`travas/${id}`), { data: d, hora, expiraEm: null, pedidoId: ref.id });
    lote.set(ref, pedido([id], { status: 'confirmado' }));
    await lote.commit();
  }
});

describe('"Meus horários" (I13)', () => {
  const CHAVE = 'k7Q2abcdefghijklmnop';

  it('quem tem a chave lê o portal; ninguém lista; só a manicure grava', async () => {
    await manicure().doc(`portal/${CHAVE}`).set({ whatsapp: '5511987654321', horarios: {} });
    await assertSucceeds(visitante().doc(`portal/${CHAVE}`).get());
    await assertFails(visitante().collection('portal').get());
    await assertFails(visitante().doc(`portal/${CHAVE}`).set({ horarios: {} }));
    await assertFails(visitante().doc('portal/outra-chave-qualquer-aaa').set({ horarios: {} }));
  });

  it('pedido leva a chave do aparelho; chave fora do formato é recusada', async () => {
    const ids = ['2026-12-01_0900'];
    await assertSucceeds(reservar(ids, pedido(ids, { chave: CHAVE })));
    const outras = ['2026-12-02_0900'];
    await assertFails(reservar(outras, pedido(outras, { chave: 'curta' })));
    await assertFails(reservar(outras, pedido(outras, { chave: `${CHAVE}/../x` })));
  });
});

describe('remarcar e pedir cancelamento (I14)', () => {
  const CHAVE = 'k7Q2abcdefghijklmnop';
  const ANTIGO = ['2026-12-01_0900', '2026-12-01_1000'];

  /** Horário da cliente: travas definitivas e o portal dela (como o app da dona grava). */
  async function horarioDaCliente(horasAteLa = 72) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (const id of ANTIGO) {
        const [data, hora] = id.split('_');
        await db.doc(`travas/${id}`).set({ data, hora, expiraEm: null });
      }
      await db.doc(`portal/${CHAVE}`).set({
        whatsapp: '5511987654321',
        nome: 'Ana',
        horarios: { a1: { inicio: daqui(horasAteLa), servico: 'Mão', travas: ANTIGO } },
      });
    });
  }

  /** Remarcação: pedido novo que substitui a1 + travas novas + solta as antigas. */
  function remarcar(novas: string[], soltar = ANTIGO, extra: Record<string, unknown> = {}) {
    const db = visitante();
    const ref = db.collection('pedidos').doc();
    const lote = db.batch();
    for (const id of novas) {
      const [data, hora] = id.split('_');
      lote.set(db.doc(`travas/${id}`), { data, hora, expiraEm: null, pedidoId: ref.id });
    }
    for (const id of soltar) {
      const [data, hora] = id.split('_');
      lote.set(db.doc(`travas/${id}`), {
        data,
        hora,
        expiraEm: Timestamp.fromMillis(0),
        liberadaPor: CHAVE,
        horario: 'a1',
        pedidoNovo: ref.id,
      });
    }
    lote.set(
      ref,
      pedido(novas, {
        status: 'confirmado',
        chave: CHAVE,
        substitui: 'a1',
        substituiInicio: daqui(72),
        ...extra,
      }),
    );
    return lote.commit();
  }

  it('remarca na hora: o horário novo fica dela e o antigo volta a ficar livre', async () => {
    await horarioDaCliente();
    await assertSucceeds(remarcar(['2026-12-03_1400', '2026-12-03_1500']));
    await assertSucceeds(reservar(['2026-12-01_0900'])); // outra cliente pega o antigo
  });

  it('com menos de 24 h, não remarca', async () => {
    await horarioDaCliente(12);
    await assertFails(remarcar(['2026-12-03_1400']));
  });

  it('não solta trava sem marcar o horário novo (seria cancelar sem aprovação)', async () => {
    await horarioDaCliente();
    const db = visitante();
    await assertFails(
      db.doc('travas/2026-12-01_0900').set({
        data: '2026-12-01',
        hora: '0900',
        expiraEm: Timestamp.fromMillis(0),
        liberadaPor: CHAVE,
        horario: 'a1',
        pedidoNovo: 'qualquer',
      }),
    );
  });

  it('não solta trava que não é do horário dela', async () => {
    await horarioDaCliente();
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().doc('travas/2026-12-02_0900').set({
        data: '2026-12-02',
        hora: '0900',
        expiraEm: null,
      }),
    );
    await assertFails(remarcar(['2026-12-03_1400'], ['2026-12-02_0900']));
  });

  it('chave errada não remarca', async () => {
    await horarioDaCliente();
    await assertFails(remarcar(['2026-12-03_1400'], ANTIGO, { chave: 'outraChaveQualquer12345' }));
  });

  it('pede cancelamento do próprio horário, com 24 h ou mais', async () => {
    await horarioDaCliente();
    const pedirCancelamento = (horario: string, chave = CHAVE) =>
      visitante().collection('solicitacoes').add({
        tipo: 'cancelamento',
        chave,
        horario,
        motivo: 'Viagem',
        criadoEm: serverTimestamp(),
      });
    await assertSucceeds(pedirCancelamento('a1'));
    await assertFails(pedirCancelamento('a2'));
    await assertFails(pedirCancelamento('a1', 'outraChaveQualquer12345'));
    await assertFails(visitante().collection('solicitacoes').get());
  });

  it('com menos de 24 h, não pede cancelamento', async () => {
    await horarioDaCliente(12);
    await assertFails(
      visitante().collection('solicitacoes').add({
        tipo: 'cancelamento',
        chave: CHAVE,
        horario: 'a1',
        criadoEm: serverTimestamp(),
      }),
    );
  });
});
