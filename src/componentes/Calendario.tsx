import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createContext, use, useEffect, useRef, type TouchEvent } from 'react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import { deDataLocal, paraDataLocal, primeiroDoMes, type MarcasDoDia } from '../dominio/calendario';

type Props = {
  /** Dia escolhido (AAAA-MM-DD); o calendário mostra o mês dele. */
  dia: string;
  hoje: string;
  marcas: ReadonlyMap<string, MarcasDoDia>;
  aoEscolherDia: (dia: string) => void;
  /** Deslizar para o lado: -1 mês anterior, 1 próximo. */
  aoTrocarMes: (passo: 1 | -1) => void;
  /** Só estes dias (AAAA-MM-DD) podem ser tocados; os outros ficam apagados. */
  habilitados?: ReadonlySet<string>;
  /** Mostra o mês sem destacar o `dia` (página pública, antes de escolher). */
  semSelecao?: boolean;
};

const ContextoMarcas = createContext<ReadonlyMap<string, MarcasDoDia>>(new Map());

const DESLIZE_MIN_PX = 50;

const plural = (n: number, palavra: string) => `${n} ${palavra}${n > 1 ? 's' : ''}`;

function rotuloDoDia(
  data: Date,
  marcas: MarcasDoDia | undefined,
  hoje: boolean,
  desativado: boolean,
) {
  const partes = [format(data, "EEEE, d 'de' MMMM", { locale: ptBR })];
  if (hoje) partes.push('hoje');
  if (desativado) partes.push('sem horário');
  if (marcas?.atendimentos) partes.push(plural(marcas.atendimentos, 'atendimento'));
  if (marcas?.bloqueios) partes.push(plural(marcas.bloqueios, 'bloqueio'));
  return partes.join(', ');
}

/** Número do dia com pontos embaixo: atendimento (rosa da marca) e bloqueio (cinza). */
function BotaoDia({ day, modifiers, className, ...props }: DayButtonProps) {
  const marcas = use(ContextoMarcas).get(deDataLocal(day.date));
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const numero = modifiers.disabled
    ? 'text-texto-suave line-through decoration-1'
    : modifiers.selected
      ? 'bg-marca font-semibold text-superficie'
      : modifiers.today
        ? 'font-semibold text-marca ring-2 ring-marca'
        : 'group-hover:bg-marca-suave';

  return (
    <button
      ref={ref}
      {...props}
      aria-label={rotuloDoDia(day.date, marcas, modifiers.today, modifiers.disabled)}
      className={`group flex h-14 w-full flex-col items-center justify-start gap-1 pt-1 text-texto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca ${className ?? ''}`}
    >
      <span
        className={`flex size-9 items-center justify-center rounded-full text-lg transition-colors ${numero}`}
      >
        {day.date.getDate()}
      </span>
      <span aria-hidden="true" className="flex h-1.5 gap-1">
        {!!marcas?.atendimentos && <span className="size-1.5 rounded-full bg-marca-decorativa" />}
        {!!marcas?.bloqueios && <span className="size-1.5 rounded-full bg-bloqueado" />}
      </span>
    </button>
  );
}

/**
 * Calendário do mês no estilo dos apps de celular, a partir do Calendar do
 * shadcn/ui (react-day-picker) com os tokens do tema. Mês e navegação ficam na
 * tela; aqui só a grade, que também troca de mês ao deslizar.
 */
export default function Calendario({
  dia,
  hoje,
  marcas,
  aoEscolherDia,
  aoTrocarMes,
  habilitados,
  semSelecao = false,
}: Props) {
  const toque = useRef<{ x: number; y: number } | null>(null);

  function aoComecar(e: TouchEvent) {
    const t = e.touches[0];
    toque.current = t ? { x: t.clientX, y: t.clientY } : null;
  }

  function aoTerminar(e: TouchEvent) {
    const t = e.changedTouches[0];
    const inicio = toque.current;
    toque.current = null;
    if (!t || !inicio) return;
    const dx = t.clientX - inicio.x;
    if (Math.abs(dx) > DESLIZE_MIN_PX && Math.abs(dx) > Math.abs(t.clientY - inicio.y)) {
      aoTrocarMes(dx < 0 ? 1 : -1);
    }
  }

  return (
    <ContextoMarcas value={marcas}>
      <div onTouchStart={aoComecar} onTouchEnd={aoTerminar} className="-mx-2 touch-pan-y">
        <DayPicker
          key={primeiroDoMes(dia)}
          mode="single"
          required
          locale={ptBR}
          month={paraDataLocal(dia)}
          today={paraDataLocal(hoje)}
          selected={semSelecao ? undefined : paraDataLocal(dia)}
          disabled={habilitados ? (d: Date) => !habilitados.has(deDataLocal(d)) : undefined}
          onSelect={(d) => aoEscolherDia(deDataLocal(d))}
          onMonthChange={(m) => aoTrocarMes(m > paraDataLocal(dia) ? 1 : -1)}
          hideNavigation
          showOutsideDays={false}
          formatters={{ formatWeekdayName: (d) => format(d, 'EEEEE', { locale: ptBR }) }}
          components={{ DayButton: BotaoDia }}
          classNames={{
            root: 'animate-entrar',
            month_caption: 'sr-only',
            month_grid: 'w-full border-collapse',
            weekdays: 'border-b border-borda',
            weekday: 'pb-2 text-base font-normal text-texto-suave',
            week: 'border-b border-borda last:border-b-0',
            day: 'p-0 text-center',
          }}
        />
      </div>
    </ContextoMarcas>
  );
}
