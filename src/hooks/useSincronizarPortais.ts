import { useEffect } from 'react';
import { dataDoDia } from '../dominio/agenda';
import { horariosDoPortal, pedidosCopiados } from '../dominio/portal';
import { salvarPortal } from '../servicos/portal';
import { useAgendamentos } from './useAgenda';
import { useClientes } from './useClientes';

/** Última cópia gravada por chave nesta sessão: só regrava o que mudou. */
const gravados = new Map<string, string>();

/** Até onde a agenda pode estar aberta (12 meses) mais folga. */
const DIAS_A_FRENTE = 400;

/**
 * I13: com o app da dona aberto, mantém "Meus horários" de cada cliente que
 * marcou pela página (uma cópia por aparelho dela) igual à agenda.
 */
export function useSincronizarPortais() {
  const clientes = useClientes();
  const futuros = useAgendamentos(dataDoDia(new Date()), DIAS_A_FRENTE);
  const pronto = !clientes.carregando && !futuros.carregando && !futuros.erro && !clientes.erro;

  useEffect(() => {
    if (!pronto) return;
    const agora = new Date();
    for (const c of clientes.clientes) {
      if (!c.chaves?.length) continue;
      const portal = {
        whatsapp: c.whatsapp,
        nome: c.nome,
        horarios: horariosDoPortal(futuros.dados, c.whatsapp, agora),
        copiados: pedidosCopiados(futuros.dados, c.whatsapp),
      };
      const assinatura = JSON.stringify(portal);
      for (const chave of c.chaves) {
        if (gravados.get(chave) === assinatura) continue;
        gravados.set(chave, assinatura);
        salvarPortal(chave, portal);
      }
    }
  }, [pronto, clientes.clientes, futuros.dados]);
}
