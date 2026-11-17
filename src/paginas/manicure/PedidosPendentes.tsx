import { useState } from 'react';
import Botao from '../../componentes/Botao';
import Icone from '../../componentes/Icone';
import { ESTILO_BOTAO } from '../../componentes/estilos';
import { dataDoDia, horaDe, HorarioOcupado, rotuloDia, rotuloHora } from '../../dominio/agenda';
import { formatarWhatsApp } from '../../dominio/clientes';
import {
  inicioDoOutro,
  outrosHorariosDaCliente,
  pedidoExpirado,
  textoConfirmacao,
  textoRecusa,
  textoTroca,
  type OutroHorario,
  type Pedido,
} from '../../dominio/pedidos';
import { textoConfirmacaoComSinal, valorSinal } from '../../dominio/pagamento';
import { formatarDuracao, type Servico } from '../../dominio/servicos';
import { linkWhatsApp } from '../../dominio/whatsapp';
import { useClientes } from '../../hooks/useClientes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { usePagamento } from '../../hooks/usePagamento';
import { useAgendamentosDasClientes, usePedidosPendentes } from '../../hooks/usePedidos';
import { useServicos } from '../../hooks/useServicos';
import { aprovarPedido, descartarPedido, recusarPedido } from '../../servicos/pedidos';

const quandoEm = (inicio: Date) =>
  `${rotuloDia(dataDoDia(inicio))}, às ${rotuloHora(horaDe(inicio))}`;
const quando = (p: Pedido) => quandoEm(p.inicio);

type Resposta = { pedido: Pedido; tipo: 'aprovado' | 'trocado' | 'recusado'; link: string };

const STATUS_RESPOSTA: Record<Resposta['tipo'], string> = {
  aprovado: 'aprovado e marcado na agenda',
  trocado: 'horário trocado na agenda',
  recusado: 'recusado e horário liberado',
};

/** RF10: pedidos da página pública esperando resposta, no topo da tela Hoje. */
export default function PedidosPendentes() {
  const { pedidos } = usePedidosPendentes();
  const { servicos } = useServicos();
  const { clientes } = useClientes();
  const { config } = useConfiguracoes();
  const { pagamento } = usePagamento();
  const agendamentosDasClientes = useAgendamentosDasClientes(pedidos.map((p) => p.whatsapp));
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [ocupado, setOcupado] = useState<string>();
  const [recusando, setRecusando] = useState<string>();
  const [erros, setErros] = useState<Record<string, string>>({});

  if (pedidos.length === 0 && respostas.length === 0) return null;

  const servicoDe = (
    p: Pedido,
  ): Pick<Servico, 'id' | 'nome' | 'duracaoMin'> & { precoCentavos?: number } =>
    servicos.find((s) => s.id === p.servicoId) ?? {
      id: p.servicoId,
      nome: 'Serviço',
      duracaoMin: p.travas.length * 30,
    };
  const responder = (r: Resposta) => setRespostas((atual) => [r, ...atual]);
  const definirErro = (id: string, texto?: string) =>
    setErros((atual) =>
      Object.fromEntries([
        ...Object.entries(atual).filter(([chave]) => chave !== id),
        ...(texto ? [[id, texto]] : []),
      ]),
    );

  async function aprovar(
    p: Pedido,
    { substitui, comSinal = false }: { substitui?: OutroHorario; comSinal?: boolean } = {},
  ) {
    const servico = servicoDe(p);
    const sinalCentavos =
      comSinal && servico.precoCentavos
        ? valorSinal(servico.precoCentavos, pagamento.sinalPercentual)
        : undefined;
    setOcupado(p.id);
    definirErro(p.id);
    try {
      const cliente = clientes.find((c) => c.whatsapp === p.whatsapp);
      await aprovarPedido(p, servico, { clienteId: cliente?.id, substitui, sinalCentavos });
      const mensagem = {
        nome: p.nome,
        servico: servico.nome,
        quando: quando(p),
        endereco: config.endereco,
      };
      const texto = substitui
        ? textoTroca({ ...mensagem, antes: quandoEm(inicioDoOutro(substitui)) })
        : sinalCentavos
          ? textoConfirmacaoComSinal({
              ...mensagem,
              sinalCentavos,
              percentual: pagamento.sinalPercentual,
              chavePix: pagamento.chavePix,
            })
          : textoConfirmacao(mensagem);
      responder({
        pedido: p,
        tipo: substitui ? 'trocado' : 'aprovado',
        link: linkWhatsApp(p.whatsapp, texto),
      });
    } catch (e) {
      if (e instanceof HorarioOcupado) {
        definirErro(
          p.id,
          'Esse horário já foi ocupado. Recuse o pedido para mandar o link e a cliente escolher outro.',
        );
      } else {
        console.error(e);
        definirErro(p.id, 'Não foi possível aprovar. Confira a internet e tente de novo.');
      }
    } finally {
      setOcupado(undefined);
    }
  }

  function recusar(p: Pedido) {
    recusarPedido(p);
    setRecusando(undefined);
    const link = `${window.location.origin}/agendar/${config.slug}`;
    const texto = textoRecusa({ nome: p.nome, quando: quando(p), link });
    responder({ pedido: p, tipo: 'recusado', link: linkWhatsApp(p.whatsapp, texto) });
  }

  const agora = new Date();
  const respondidos = new Set(respostas.map((r) => r.pedido.id));

  return (
    <section aria-labelledby="titulo-pedidos" className="mb-6">
      <h2 id="titulo-pedidos" className="mb-3 text-secao font-medium">
        Pedidos para responder
        {pedidos.length > 0 && ` (${pedidos.length})`}
      </h2>
      <ul className="flex flex-col gap-3">
        {respostas.map((r) => (
          <li
            key={`r-${r.pedido.id}`}
            className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4"
          >
            <p role="status">{`${r.pedido.nome}: ${STATUS_RESPOSTA[r.tipo]}. Avise a cliente:`}</p>
            <a href={r.link} target="_blank" rel="noreferrer" className={ESTILO_BOTAO.principal}>
              <Icone nome="conversa" />
              {r.tipo === 'recusado'
                ? 'Enviar aviso no WhatsApp'
                : 'Enviar confirmação no WhatsApp'}
            </a>
            <Botao
              variante="texto"
              onClick={() => setRespostas((atual) => atual.filter((x) => x !== r))}
            >
              Fechar
            </Botao>
          </li>
        ))}
        {pedidos
          .filter((p) => !respondidos.has(p.id))
          .map((p) => {
            const servico = servicoDe(p);
            const expirado = pedidoExpirado(p, agora);
            const outros = outrosHorariosDaCliente(p, {
              agendamentos: agendamentosDasClientes,
              pendentes: pedidos,
              agora,
            });
            const trocar = outros[0];
            return (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-borda border-l-4 border-l-pendente bg-superficie p-4"
              >
                <div>
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-texto-suave">
                    {servico.nome} ({formatarDuracao(servico.duracaoMin)})
                  </p>
                  <p className="first-letter:uppercase">{quando(p)}</p>
                  <p className="text-texto-suave">WhatsApp {formatarWhatsApp(p.whatsapp)}</p>
                  {expirado && (
                    <p className="mt-1 text-texto-suave">
                      Passou de 24 horas sem resposta: o horário voltou a ficar livre na página.
                    </p>
                  )}
                </div>
                {trocar && (
                  <div className="rounded-lg bg-marca-suave p-3">
                    <p className="font-medium">{p.nome} já tem horário:</p>
                    <ul>
                      {outros.map((o) =>
                        o.tipo === 'agendamento' ? (
                          <li key={o.agendamento.id} className="first-letter:uppercase">
                            {quandoEm(o.agendamento.inicio)} ({o.agendamento.servicoNome})
                          </li>
                        ) : (
                          <li key={o.pedido.id} className="first-letter:uppercase">
                            {quandoEm(o.pedido.inicio)} (pedido sem resposta)
                          </li>
                        ),
                      )}
                    </ul>
                    <p className="mt-1">
                      Se ela quer trocar, toque em “Trocar horário”: fica um só atendimento e o
                      horário de {quandoEm(inicioDoOutro(trocar))} fica livre.
                    </p>
                  </div>
                )}
                {erros[p.id] && (
                  <p role="alert" className="text-erro">
                    {erros[p.id]}
                  </p>
                )}
                {recusando === p.id ? (
                  <div className="flex flex-col gap-3">
                    <p>Recusar o pedido de {p.nome}? O horário fica livre de novo.</p>
                    <Botao onClick={() => recusar(p)}>Sim, recusar</Botao>
                    <Botao variante="secundario" onClick={() => setRecusando(undefined)}>
                      Não recusar
                    </Botao>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {trocar ? (
                      <>
                        <Botao
                          onClick={() => aprovar(p, { substitui: trocar })}
                          disabled={ocupado === p.id}
                        >
                          {ocupado === p.id ? 'Aprovando…' : 'Trocar horário'}
                        </Botao>
                        <Botao
                          variante="secundario"
                          onClick={() => aprovar(p)}
                          disabled={ocupado === p.id}
                        >
                          Marcar mais um
                        </Botao>
                      </>
                    ) : (
                      <>
                        <Botao onClick={() => aprovar(p)} disabled={ocupado === p.id}>
                          {ocupado === p.id
                            ? 'Aprovando…'
                            : expirado
                              ? 'Aprovar mesmo assim'
                              : 'Aprovar'}
                        </Botao>
                        {Boolean(servico.precoCentavos) && (
                          <Botao
                            variante="secundario"
                            onClick={() => aprovar(p, { comSinal: true })}
                            disabled={ocupado === p.id || !pagamento.chavePix}
                            aria-describedby={pagamento.chavePix ? undefined : `sem-pix-${p.id}`}
                          >
                            Aprovar com sinal
                          </Botao>
                        )}
                      </>
                    )}
                    <Botao variante="secundario" onClick={() => setRecusando(p.id)}>
                      Recusar
                    </Botao>
                    {expirado && (
                      <Botao variante="texto" onClick={() => descartarPedido(p)}>
                        Descartar
                      </Botao>
                    )}
                    {!trocar && Boolean(servico.precoCentavos) && !pagamento.chavePix && (
                      <p id={`sem-pix-${p.id}`} className="w-full text-texto-suave">
                        Para aprovar com sinal, cadastre a chave Pix em Mais › Configurações.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
      </ul>
    </section>
  );
}
