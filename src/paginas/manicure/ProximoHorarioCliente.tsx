import { Link } from 'react-router';
import AvisarCliente from '../../componentes/AvisarCliente';
import { ESTILO_LINK } from '../../componentes/estilos';
import { proximoHorario } from '../../dominio/proximoHorario';
import { eventoDoHorario, linkGoogleAgenda } from '../../dominio/salvarNaAgenda';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useLinkCurto } from '../../hooks/useLinkCurto';
import { usePagamento } from '../../hooks/usePagamento';
import { useAgendamentosDasClientes } from '../../hooks/usePedidos';
import { marcarConfirmacaoEnviada, registrarSinalPedido } from '../../servicos/agenda';

/** I10: na tela da cliente, o próximo horário dela com confirmação e sinal. */
export default function ProximoHorarioCliente({ whatsapp }: { whatsapp: string }) {
  const agendamentos = useAgendamentosDasClientes([whatsapp]);
  const { config } = useConfiguracoes();
  const { pagamento } = usePagamento();
  const proximo = proximoHorario(agendamentos, whatsapp, new Date());
  const linkAgenda = useLinkCurto(
    proximo
      ? linkGoogleAgenda(
          eventoDoHorario({
            id: proximo.id,
            espaco: config.nome,
            servico: proximo.servicoNome,
            inicio: proximo.inicio,
            duracaoMin: proximo.duracaoMin,
          }),
        )
      : '',
  );
  if (!proximo) return null;
  return (
    <section
      aria-labelledby="proximo-horario"
      className="mb-6 flex flex-col gap-3 rounded-xl bg-marca-suave p-4"
    >
      <h2 id="proximo-horario" className="text-secao font-medium text-marca-escura">
        Próximo horário
      </h2>
      <AvisarCliente
        agendamento={proximo}
        endereco={config.endereco}
        linkAgenda={linkAgenda}
        pagamento={pagamento}
        aoEnviarConfirmacao={() => marcarConfirmacaoEnviada(proximo)}
        aoPedirSinal={(centavos) => registrarSinalPedido(proximo.id, centavos)}
        comResumo
      />
      <Link to={`/atendimentos/${proximo.id}`} className={`min-h-12 ${ESTILO_LINK}`}>
        Abrir o atendimento
      </Link>
    </section>
  );
}
