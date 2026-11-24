import { useEffect, useState } from 'react';
import { rotuloInicio } from '../dominio/agenda';
import { textoConfirmacao, type Pedido } from '../dominio/pedidos';
import { eventoDoHorario, linkGoogleAgenda } from '../dominio/salvarNaAgenda';
import { encurtarLink } from '../servicos/encurtador';
import { aprovarPedido, observarPedidosConfirmados } from '../servicos/pedidos';
import { useClientes } from './useClientes';
import { useConfiguracoes } from './useConfiguracoes';
import { useServicos } from './useServicos';

/** Pedidos já tentados nesta sessão: não repete a cada atualização da tela. */
const tentados = new Set<string>();

/**
 * I08: enquanto o app da dona está aberto, cada horário que uma cliente
 * confirmou vira atendimento (e cliente, se nova) e entra na fila de avisos.
 */
export function useConversaoPedidos() {
  const [confirmados, setConfirmados] = useState<Pedido[]>([]);
  const servicos = useServicos();
  const configuracoes = useConfiguracoes();
  const clientes = useClientes();
  const pronto = !servicos.carregando && !configuracoes.carregando && !clientes.carregando;

  useEffect(() => observarPedidosConfirmados(setConfirmados, (erro) => console.error(erro)), []);

  useEffect(() => {
    if (!pronto) return;
    for (const p of confirmados) {
      if (tentados.has(p.id)) continue;
      tentados.add(p.id);
      const servico = servicos.servicos.find((s) => s.id === p.servicoId) ?? {
        id: p.servicoId,
        nome: 'Serviço',
        duracaoMin: p.travas.length * 60,
      };
      const clienteId = clientes.clientes.find((c) => c.whatsapp === p.whatsapp)?.id;
      const agenda = linkGoogleAgenda(
        eventoDoHorario({
          id: p.id,
          espaco: configuracoes.config.nome,
          servico: servico.nome,
          inicio: p.inicio,
          duracaoMin: servico.duracaoMin,
        }),
      );
      encurtarLink(agenda)
        .then((curto) => {
          const texto = textoConfirmacao({
            nome: p.nome,
            servico: servico.nome,
            quando: rotuloInicio(p.inicio),
            endereco: configuracoes.config.endereco,
            linkAgenda: curto ?? agenda,
          });
          return aprovarPedido(p, servico, {
            aviso: p.semAviso ? undefined : { tipo: 'confirmacao', texto },
            clienteId,
          });
        })
        .catch((erro: unknown) => console.error(erro));
    }
  }, [pronto, confirmados, servicos.servicos, configuracoes.config, clientes.clientes]);
}
