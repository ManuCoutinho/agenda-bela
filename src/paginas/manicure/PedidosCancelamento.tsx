import Botao from '../../componentes/Botao';
import Icone from '../../componentes/Icone';
import { ESTILO_BOTAO } from '../../componentes/estilos';
import { rotuloInicio } from '../../dominio/agenda';
import {
  textoCancelamentoAprovado,
  textoCancelamentoRecusado,
  type Solicitacao,
} from '../../dominio/pedidos';
import { linkWhatsApp } from '../../dominio/whatsapp';
import { useAgendamento } from '../../hooks/useAgenda';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useSolicitacoes } from '../../hooks/useSolicitacoes';
import { marcarSolicitacaoAvisada, responderCancelamento } from '../../servicos/solicitacoes';

/** I14: cancelamentos pedidos pelas clientes em "Meus horários", no topo da Hoje. */
export default function PedidosCancelamento() {
  const solicitacoes = useSolicitacoes();
  if (solicitacoes.length === 0) return null;
  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length;
  return (
    <section aria-labelledby="titulo-cancelamentos" className="mb-6">
      <h2 id="titulo-cancelamentos" className="mb-3 text-secao font-medium">
        Pedidos de cancelamento{pendentes > 0 ? ` (${pendentes})` : ''}
      </h2>
      <ul className="flex flex-col gap-3">
        {solicitacoes.map((s) => (
          <Cartao key={s.id} solicitacao={s} />
        ))}
      </ul>
    </section>
  );
}

function Cartao({ solicitacao: s }: { solicitacao: Solicitacao }) {
  const { dados: atendimento, carregando } = useAgendamento(s.horario);
  const { config } = useConfiguracoes();
  const nome = atendimento?.clienteNome ?? 'A cliente';
  const quando = atendimento ? rotuloInicio(atendimento.inicio) : '';
  const whatsapp = atendimento?.clienteWhatsapp ?? '';

  if (s.status !== 'pendente') {
    return (
      <li className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4">
        <p>
          {nome}: cancelamento {s.status === 'aprovada' ? 'aprovado, horário liberado' : 'recusado'}
          . Avise a cliente:
        </p>
        {whatsapp && s.aviso && (
          <a
            href={linkWhatsApp(whatsapp, s.aviso)}
            target="_blank"
            rel="noreferrer"
            onClick={() => marcarSolicitacaoAvisada(s.id)}
            className={ESTILO_BOTAO.principal}
          >
            <Icone nome="conversa" />
            Enviar aviso no WhatsApp
          </a>
        )}
        <Botao variante="texto" onClick={() => marcarSolicitacaoAvisada(s.id)}>
          Já avisei
        </Botao>
      </li>
    );
  }

  const responder = (aprovar: boolean) => {
    if (!atendimento) return;
    const link = `${window.location.origin}/agendar/${config.slug}`;
    const aviso = aprovar
      ? textoCancelamentoAprovado({ nome, quando, link })
      : textoCancelamentoRecusado({ nome, quando });
    responderCancelamento(s, atendimento, aprovar, aviso);
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-borda border-l-4 border-l-pendente bg-superficie p-4">
      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando atendimento…
        </p>
      ) : !atendimento || atendimento.status !== 'marcado' ? (
        <>
          <p>Esse atendimento já foi cancelado ou mudou.</p>
          <Botao variante="secundario" onClick={() => responderCancelamento(s, null, false, '')}>
            Tirar da lista
          </Botao>
        </>
      ) : (
        <>
          <div>
            <p className="font-medium">{nome} quer cancelar</p>
            <p className="first-letter:uppercase">
              {quando} ({atendimento.servicoNome})
            </p>
            {s.motivo && <p className="text-texto-suave">Motivo: {s.motivo}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <Botao onClick={() => responder(true)}>Aprovar cancelamento</Botao>
            <Botao variante="secundario" onClick={() => responder(false)}>
              Recusar
            </Botao>
          </div>
        </>
      )}
    </li>
  );
}
