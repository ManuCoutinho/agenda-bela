import { Link } from 'react-router';
import { dataDoDia, horaDe, rotuloDia, rotuloHora } from '../dominio/agenda';
import type { Conflito } from '../dominio/conflitos';
import { linkWhatsApp, textoRemarcacao } from '../dominio/whatsapp';
import Botao from './Botao';
import Icone from './Icone';
import { ESTILO_BOTAO } from './estilos';

type Props = {
  conflitos: readonly Conflito[];
  /** Nome do serviço pelo id (o pedido só guarda o id). */
  nomeServico: (id: string) => string;
  recorrente: boolean;
  /** Um dia: bloqueia só o que está livre. Toda semana: salva assim mesmo. */
  aoSeguir: () => void;
  aoVoltar: () => void;
  seguindo: boolean;
};

const quando = (d: Date) => `${rotuloDia(dataDoDia(d))}, às ${rotuloHora(horaDe(d))}`;

/** RF12: quem está no caminho do bloqueio, com remarcar e avisar no WhatsApp. */
export default function ConflitosBloqueio({
  conflitos,
  nomeServico,
  recorrente,
  aoSeguir,
  aoVoltar,
  seguindo,
}: Props) {
  const n = conflitos.length;
  return (
    <section aria-labelledby="titulo-conflitos" className="flex flex-col gap-4">
      <h2 id="titulo-conflitos" role="alert" className="text-secao font-medium">
        {n === 1 ? 'Há 1 cliente nesse horário' : `Há ${n} clientes nesse horário`}
      </h2>
      <p className="text-texto-suave">
        Remarque ou avise cada uma pelo WhatsApp.{' '}
        {recorrente
          ? 'O bloqueio fixo pode ser salvo assim mesmo: os atendimentos continuam na agenda até você remarcar.'
          : 'Você também pode bloquear só os horários que estão livres.'}
      </p>
      <ul className="flex flex-col gap-3">
        {conflitos.map((c) => (
          <li
            key={`${c.tipo}-${c.id}`}
            className="flex flex-col gap-3 rounded-xl border border-borda border-l-4 border-l-pendente bg-superficie p-4"
          >
            <div>
              <p className="font-medium">{c.nome}</p>
              <p className="text-texto-suave">
                {c.tipo === 'pedido' ? 'Pedido pela página' : nomeServico(c.servicoId)}
              </p>
              <p className="first-letter:uppercase">{quando(c.inicio)}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {c.tipo === 'atendimento' ? (
                <Link to={`/atendimentos/${c.id}`} className={ESTILO_BOTAO.secundario}>
                  Remarcar <span className="sr-only">{c.nome}</span>
                </Link>
              ) : (
                <Link to="/" className={ESTILO_BOTAO.secundario}>
                  Responder pedido <span className="sr-only">de {c.nome}</span>
                </Link>
              )}
              <a
                href={linkWhatsApp(
                  c.whatsapp,
                  textoRemarcacao({ nome: c.nome, quando: quando(c.inicio) }),
                )}
                target="_blank"
                rel="noreferrer"
                className={ESTILO_BOTAO.texto}
              >
                <Icone nome="conversa" />
                Avisar <span className="sr-only">{c.nome}</span> no WhatsApp
              </a>
            </div>
          </li>
        ))}
      </ul>
      <Botao onClick={aoSeguir} disabled={seguindo}>
        {seguindo
          ? 'Salvando…'
          : recorrente
            ? 'Salvar bloqueio fixo assim mesmo'
            : 'Bloquear só os horários livres'}
      </Botao>
      <Botao variante="secundario" onClick={aoVoltar}>
        Voltar e mudar o horário
      </Botao>
    </section>
  );
}
