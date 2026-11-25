import { rotuloInicio, rotuloMomento, type Agendamento } from '../dominio/agenda';
import { textoPedidoSinal, valorSinal, type Pagamento } from '../dominio/pagamento';
import { textoConfirmacao } from '../dominio/pedidos';
import { formatarPreco } from '../dominio/servicos';
import { linkWhatsApp } from '../dominio/whatsapp';
import Icone from './Icone';
import { ESTILO_BOTAO } from './estilos';

type Props = {
  agendamento: Agendamento;
  endereco: string;
  /** Link para a cliente salvar o horário na agenda dela. */
  linkAgenda: string;
  pagamento: Pagamento;
  aoEnviarConfirmacao: () => void;
  aoPedirSinal: (sinalCentavos: number) => void;
  /** Mostra também dia e serviço (na tela da cliente). */
  comResumo?: boolean;
};

/**
 * I10: confirmação e pedido de sinal pelo WhatsApp, a partir do atendimento
 * (ou da cliente que tem horário marcado).
 */
export default function AvisarCliente({
  agendamento: a,
  endereco,
  linkAgenda,
  pagamento,
  aoEnviarConfirmacao,
  aoPedirSinal,
  comResumo = false,
}: Props) {
  const quando = rotuloInicio(a.inicio);
  const confirmacao = textoConfirmacao({
    nome: a.clienteNome,
    servico: a.servicoNome,
    quando,
    endereco,
    linkAgenda,
  });
  const sinal = a.precoCentavos ? valorSinal(a.precoCentavos, pagamento.sinalPercentual) : 0;
  const idSemPix = `sem-pix-${a.id}`;

  return (
    <div className="flex flex-col gap-3">
      {comResumo && (
        <p className="first-letter:uppercase">
          <span className="font-medium">{quando}</span> ({a.servicoNome})
        </p>
      )}
      <a
        href={linkWhatsApp(a.clienteWhatsapp, confirmacao)}
        target="_blank"
        rel="noreferrer"
        onClick={aoEnviarConfirmacao}
        className={ESTILO_BOTAO.principal}
      >
        <Icone nome="conversa" />
        Enviar confirmação no WhatsApp
      </a>
      {a.confirmacaoEnviadaEm && (
        <p className="text-texto-suave">
          Confirmação enviada em {rotuloMomento(a.confirmacaoEnviadaEm)}.
        </p>
      )}
      {sinal > 0 &&
        (pagamento.chavePix ? (
          <a
            href={linkWhatsApp(
              a.clienteWhatsapp,
              textoPedidoSinal({
                nome: a.clienteNome,
                servico: a.servicoNome,
                quando,
                sinalCentavos: sinal,
                percentual: pagamento.sinalPercentual,
                chavePix: pagamento.chavePix,
              }),
            )}
            target="_blank"
            rel="noreferrer"
            onClick={() => aoPedirSinal(sinal)}
            className={ESTILO_BOTAO.secundario}
          >
            <Icone nome="conversa" />
            Pedir sinal de {formatarPreco(sinal)} no WhatsApp
          </a>
        ) : (
          <p id={idSemPix} className="text-texto-suave">
            Para pedir sinal, cadastre a chave Pix em Mais › Configurações.
          </p>
        ))}
      {a.sinalPedidoEm && (
        <p className="text-texto-suave">
          Sinal de {formatarPreco(a.sinalCentavos ?? sinal)} pedido em{' '}
          {rotuloMomento(a.sinalPedidoEm)}.
        </p>
      )}
    </div>
  );
}
