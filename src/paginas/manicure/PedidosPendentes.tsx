import { useState } from 'react';
import Botao from '../../componentes/Botao';
import Icone from '../../componentes/Icone';
import { ESTILO_BOTAO } from '../../componentes/estilos';
import { dataDoDia, horaDe, HorarioOcupado, rotuloDia, rotuloHora } from '../../dominio/agenda';
import { formatarWhatsApp } from '../../dominio/clientes';
import { pedidoExpirado, textoConfirmacao, textoRecusa, type Pedido } from '../../dominio/pedidos';
import { formatarDuracao, type Servico } from '../../dominio/servicos';
import { linkWhatsApp } from '../../dominio/whatsapp';
import { useClientes } from '../../hooks/useClientes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { usePedidosPendentes } from '../../hooks/usePedidos';
import { useServicos } from '../../hooks/useServicos';
import { aprovarPedido, descartarPedido, recusarPedido } from '../../servicos/pedidos';

const quando = (p: Pedido) =>
  `${rotuloDia(dataDoDia(p.inicio))}, às ${rotuloHora(horaDe(p.inicio))}`;

type Resposta = { pedido: Pedido; tipo: 'aprovado' | 'recusado'; link: string };

/** RF10: pedidos da página pública esperando resposta, no topo da tela Hoje. */
export default function PedidosPendentes() {
  const { pedidos } = usePedidosPendentes();
  const { servicos } = useServicos();
  const { clientes } = useClientes();
  const { config } = useConfiguracoes();
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [ocupado, setOcupado] = useState<string>();
  const [recusando, setRecusando] = useState<string>();
  const [erros, setErros] = useState<Record<string, string>>({});

  if (pedidos.length === 0 && respostas.length === 0) return null;

  const servicoDe = (p: Pedido): Pick<Servico, 'id' | 'nome' | 'duracaoMin'> =>
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

  async function aprovar(p: Pedido) {
    const servico = servicoDe(p);
    setOcupado(p.id);
    definirErro(p.id);
    try {
      const cliente = clientes.find((c) => c.whatsapp === p.whatsapp);
      await aprovarPedido(p, servico, cliente?.id);
      const texto = textoConfirmacao({
        nome: p.nome,
        servico: servico.nome,
        quando: quando(p),
        endereco: config.endereco,
      });
      responder({ pedido: p, tipo: 'aprovado', link: linkWhatsApp(p.whatsapp, texto) });
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
            <p role="status">
              {r.tipo === 'aprovado'
                ? `${r.pedido.nome}: aprovado e marcado na agenda. Avise a cliente:`
                : `${r.pedido.nome}: recusado e horário liberado. Avise a cliente:`}
            </p>
            <a href={r.link} target="_blank" rel="noreferrer" className={ESTILO_BOTAO.principal}>
              <Icone nome="conversa" />
              {r.tipo === 'aprovado'
                ? 'Enviar confirmação no WhatsApp'
                : 'Enviar aviso no WhatsApp'}
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
                    <Botao onClick={() => aprovar(p)} disabled={ocupado === p.id}>
                      {ocupado === p.id
                        ? 'Aprovando…'
                        : expirado
                          ? 'Aprovar mesmo assim'
                          : 'Aprovar'}
                    </Botao>
                    <Botao variante="secundario" onClick={() => setRecusando(p.id)}>
                      Recusar
                    </Botao>
                    {expirado && (
                      <Botao variante="texto" onClick={() => descartarPedido(p)}>
                        Descartar
                      </Botao>
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
