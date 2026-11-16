import { useEffect, useState } from 'react';
import { encurtarLink } from '../servicos/encurtador';

/**
 * Link da página pública para divulgar: o curto quando o encurtador responde,
 * senão o completo. Vazio enquanto não há `slug` (configurações não salvas).
 */
export function useLinkAgendamento(slug: string) {
  const completo = slug ? `${window.location.origin}/agendar/${slug}` : '';
  const [curto, setCurto] = useState<{ de: string; link: string | null }>();

  useEffect(() => {
    if (!completo) return;
    let ativo = true;
    encurtarLink(completo).then((link) => {
      if (ativo) setCurto({ de: completo, link });
    });
    return () => {
      ativo = false;
    };
  }, [completo]);

  const pronto = curto?.de === completo;
  return {
    link: (pronto && curto.link) || completo,
    carregando: !!completo && !pronto,
  };
}
