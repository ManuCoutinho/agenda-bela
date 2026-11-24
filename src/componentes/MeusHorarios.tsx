import type { ReactNode } from 'react';
import { rotuloInicio } from '../dominio/agenda';
import type { HorarioPortal } from '../dominio/portal';

type Props = {
  horarios: readonly HorarioPortal[];
  carregando: boolean;
  /** Este aparelho ainda não marcou nada (não tem chave). */
  semChave: boolean;
  /** Link para falar com a manicure (remarcar o que foi marcado em outro celular). */
  falarNoWhatsApp?: string;
  /** Ações de cada horário (I14: remarcar e pedir cancelamento). */
  acoes?: (h: HorarioPortal) => ReactNode;
};

/** I13: horários futuros da cliente, na página pública. */
export default function MeusHorarios({
  horarios,
  carregando,
  semChave,
  falarNoWhatsApp,
  acoes,
}: Props) {
  return (
    <section
      aria-labelledby="meus-horarios"
      className="mb-6 rounded-xl border border-borda bg-superficie p-4"
    >
      <h2 id="meus-horarios" className="text-secao font-medium">
        Meus horários
      </h2>
      {carregando ? (
        <p role="status" className="mt-2 text-texto-suave">
          Procurando seus horários…
        </p>
      ) : horarios.length > 0 ? (
        <ul className="mt-2 flex flex-col divide-y divide-borda">
          {horarios.map((h) => (
            <li key={h.id} className="flex flex-col gap-2 py-3">
              <span>
                <span className="block font-medium first-letter:uppercase">
                  {rotuloInicio(h.inicio)}
                </span>
                <span className="block text-texto-suave">
                  {h.servico}
                  {h.serieId ? ' · horário fixo' : ''}
                </span>
              </span>
              {acoes?.(h)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-texto-suave">
          {semChave
            ? 'Os horários que você marcar por este celular aparecem aqui.'
            : 'Nenhum horário marcado por enquanto.'}
        </p>
      )}
      {falarNoWhatsApp && (
        <p className="mt-2 text-texto-suave">
          Marcou por outro celular?{' '}
          <a
            href={falarNoWhatsApp}
            target="_blank"
            rel="noreferrer"
            className="text-marca underline underline-offset-4"
          >
            Fale no WhatsApp
          </a>{' '}
          para remarcar ou cancelar.
        </p>
      )}
    </section>
  );
}
