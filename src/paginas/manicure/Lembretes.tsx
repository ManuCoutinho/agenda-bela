import BarraSuperior from '../../componentes/BarraSuperior';
import Icone from '../../componentes/Icone';
import { ESTILO_BOTAO } from '../../componentes/estilos';
import { horaDe, rotuloDia, rotuloHora, type Agendamento } from '../../dominio/agenda';
import { linkWhatsApp, textoLembrete } from '../../dominio/whatsapp';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { useLembretes } from '../../hooks/useLembretes';
import { marcarLembreteEnviado } from '../../servicos/agenda';

/** RF11: um toque por cliente abre o WhatsApp com o lembrete de amanhã pronto. */
export default function Lembretes() {
  const { amanha, atendimentos, pendentes, carregando, erro } = useLembretes();
  const { config } = useConfiguracoes();

  const link = (a: Agendamento) =>
    linkWhatsApp(
      a.clienteWhatsapp,
      textoLembrete({
        nome: a.clienteNome,
        servico: a.servicoNome,
        data: rotuloDia(amanha),
        hora: rotuloHora(horaDe(a.inicio)),
        endereco: config.endereco,
      }),
    );

  return (
    <>
      <BarraSuperior titulo="Lembretes de amanhã" voltarPara="/" />
      <p className="mb-4 text-texto-suave first-letter:uppercase">{rotuloDia(amanha)}</p>
      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando…
        </p>
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar a agenda de amanhã. Confira a internet e tente de novo.
        </p>
      ) : atendimentos.length === 0 ? (
        <p className="text-texto-suave">Nenhum atendimento marcado para amanhã.</p>
      ) : (
        <>
          <p className="mb-4">
            {pendentes === 0
              ? 'Todos os lembretes foram enviados.'
              : `Falta${pendentes > 1 ? 'm' : ''} ${pendentes} lembrete${pendentes > 1 ? 's' : ''}. Toque em "Enviar lembrete" e depois em enviar no WhatsApp.`}
          </p>
          <ul className="flex flex-col gap-3">
            {atendimentos.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 rounded-xl border border-borda bg-superficie p-4"
              >
                <div>
                  <p className="font-medium">
                    {rotuloHora(horaDe(a.inicio))} · {a.clienteNome}
                  </p>
                  <p className="text-texto-suave">{a.servicoNome}</p>
                  {a.lembreteEnviado && <p className="text-livre">Lembrete enviado</p>}
                </div>
                <a
                  href={link(a)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => marcarLembreteEnviado(a.id)}
                  className={a.lembreteEnviado ? ESTILO_BOTAO.secundario : ESTILO_BOTAO.principal}
                >
                  <Icone nome="conversa" />
                  {a.lembreteEnviado ? 'Enviar de novo' : 'Enviar lembrete'}{' '}
                  <span className="sr-only">para {a.clienteNome}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
