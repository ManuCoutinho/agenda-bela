// RF11 (opção B): roda no GitHub Actions às 18h de São Paulo. Se houver
// atendimento amanhã, manda uma notificação ao celular da manicure; o toque
// abre /lembretes. Sem servidor próprio: o Actions faz o papel do agendador.
//
// Precisa da variável FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço com
// leitura do Firestore e envio do Cloud Messaging).
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const FUSO = 'America/Sao_Paulo';
const SITE = process.env.SITE_URL ?? 'https://agenda-bela-bb595.web.app';

/** Dia (AAAA-MM-DD) de um instante em São Paulo. */
const diaEmSP = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, dateStyle: 'short' }).format(d);

/** Meia-noite de São Paulo do dia AAAA-MM-DD (o Brasil não tem horário de verão desde 2019). */
const meiaNoiteEmSP = (dia) => new Date(`${dia}T00:00:00-03:00`);

export function intervaloDeAmanha(agora = new Date()) {
  const hoje = meiaNoiteEmSP(diaEmSP(agora));
  const amanha = new Date(hoje.getTime() + 86_400_000);
  const depois = new Date(amanha.getTime() + 86_400_000);
  return { de: amanha, ate: depois };
}

export const textoNotificacao = (n) =>
  n === 1
    ? 'Amanhã você tem 1 atendimento. Toque para enviar o lembrete.'
    : `Amanhã você tem ${n} atendimentos. Toque para enviar os lembretes.`;

async function principal() {
  const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!conta) {
    console.error('Falta o segredo FIREBASE_SERVICE_ACCOUNT no GitHub (Settings → Secrets).');
    process.exit(1);
  }
  initializeApp({ credential: cert(JSON.parse(conta)) });
  const db = getFirestore();

  const { de, ate } = intervaloDeAmanha();
  const snap = await db
    .collection('agendamentos')
    .where('inicio', '>=', Timestamp.fromDate(de))
    .where('inicio', '<', Timestamp.fromDate(ate))
    .get();
  const n = snap.docs.filter((d) => d.get('status') !== 'cancelado').length;
  process.stdout.write(`Atendimentos amanhã: ${n}\n`);
  if (n === 0) return;

  const ref = db.doc('config/notificacoes');
  const tokens = (await ref.get()).get('tokens') ?? [];
  if (tokens.length === 0) {
    process.stdout.write('Nenhum celular ativou os avisos (Mais → Ativar avisos de lembrete).\n');
    return;
  }

  const resposta = await getMessaging().sendEachForMulticast({
    tokens,
    webpush: {
      notification: {
        title: 'Lembretes de amanhã',
        body: textoNotificacao(n),
        icon: '/icon-192.png',
        tag: 'lembretes',
      },
      fcmOptions: { link: `${SITE}/lembretes` },
      data: { link: '/lembretes' },
    },
  });

  // celular que desinstalou o app ou trocou de navegador: tira o token da lista
  const invalidos = resposta.responses
    .map((r, i) => (r.success ? null : { erro: r.error?.code, token: tokens[i] }))
    .filter(
      (r) =>
        r &&
        ['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(
          r.erro,
        ),
    )
    .map((r) => r.token);
  if (invalidos.length) await ref.update({ tokens: FieldValue.arrayRemove(...invalidos) });
  process.stdout.write(
    `Enviadas: ${resposta.successCount}; falhas: ${resposta.failureCount}; removidos: ${invalidos.length}\n`,
  );
  if (resposta.successCount === 0) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  principal().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
