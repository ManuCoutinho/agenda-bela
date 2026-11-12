import { useState } from 'react';
import { Link } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import Campo from '../../componentes/Campo';
import { ESTILO_CAMPO, ESTILO_LINK } from '../../componentes/estilos';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { usePausa } from '../../hooks/usePausa';
import { salvarPausa } from '../../servicos/configPublica';

/** RF14: link da página pública e pausa (férias, agenda cheia). */
export default function PaginaAgendamento() {
  const { config, carregando } = useConfiguracoes();
  const { pausa } = usePausa();
  const [aviso, setAviso] = useState('');
  const [copiado, setCopiado] = useState<string>();
  const link = config.slug ? `${window.location.origin}/agendar/${config.slug}` : '';

  async function compartilhar() {
    try {
      if (navigator.share) {
        await navigator.share({ title: config.nome || 'Agendar horário', url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopiado('Link copiado. Cole no WhatsApp ou no Instagram.');
    } catch {
      // ela fechou o compartilhamento: nada a fazer
    }
  }

  return (
    <>
      <BarraSuperior titulo="Página de agendamento" voltarPara="/mais" />
      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando…
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="titulo-link" className="flex flex-col gap-3">
            <h2 id="titulo-link" className="text-secao font-medium">
              Link para as clientes
            </h2>
            {link ? (
              <>
                <p className="break-all">
                  <a href={link} target="_blank" rel="noreferrer" className={ESTILO_LINK}>
                    {link}
                  </a>
                </p>
                <Botao variante="secundario" onClick={compartilhar}>
                  Compartilhar link
                </Botao>
                {copiado && <p role="status">{copiado}</p>}
              </>
            ) : (
              <p>
                Escolha o link em{' '}
                <Link to="/mais/configuracoes" className={ESTILO_LINK}>
                  Configurações
                </Link>{' '}
                para as clientes poderem agendar.
              </p>
            )}
          </section>

          <section aria-labelledby="titulo-pausa" className="flex flex-col gap-3">
            <h2 id="titulo-pausa" className="text-secao font-medium">
              {pausa.ativa ? 'Agendamentos pausados' : 'Agendamentos abertos'}
            </h2>
            {pausa.ativa ? (
              <>
                <p role="status">
                  As clientes veem o aviso e não conseguem pedir horário.
                  {pausa.aviso && ` Aviso: “${pausa.aviso}”`}
                </p>
                <Botao onClick={() => salvarPausa({ ativa: false, aviso: '' })}>
                  Reabrir agendamentos
                </Botao>
              </>
            ) : (
              <>
                <p className="text-texto-suave">
                  Vai sair de férias ou a agenda lotou? Pause a página: os atendimentos e pedidos
                  que já existem continuam.
                </p>
                <Campo
                  id="aviso-pausa"
                  rotulo="Aviso para as clientes (opcional)"
                  dica="Ex.: Volto a atender dia 10 de janeiro."
                >
                  {(a) => (
                    <textarea
                      {...a}
                      rows={2}
                      maxLength={200}
                      value={aviso}
                      onChange={(e) => setAviso(e.target.value)}
                      className={ESTILO_CAMPO}
                    />
                  )}
                </Campo>
                <Botao
                  variante="secundario"
                  onClick={() => salvarPausa({ ativa: true, aviso: aviso.trim() })}
                >
                  Pausar agendamentos
                </Botao>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
