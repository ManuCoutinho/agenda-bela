import ptBr from '@fullcalendar/core/locales/pt-br';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useEffect, useRef } from 'react';
import {
  lerToque,
  type EventoCalendario,
  type TipoEvento,
  type Visao,
} from '../dominio/calendario';

type Props = {
  visao: Visao;
  /** Dia escolhido (AAAA-MM-DD): o calendário vai até ele e o destaca. */
  dia: string;
  eventos: readonly EventoCalendario[];
  /** Agora em São Paulo, na hora de parede (ver `paraHoraDeParede`). */
  agora: string;
  aoTocarDia: (data: string) => void;
  aoTocarHorario: (data: string, hora: string) => void;
  aoTocarEvento: (id: string, tipo: TipoEvento) => void;
};

const VIEW: Record<Visao, string> = { semana: 'timeGridWeek', mes: 'dayGridMonth' };
const diaDe = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Calendário da manicure (FullCalendar, MIT). Roda em UTC com a hora de parede
 * de São Paulo; a barra de navegação fica na tela, não aqui.
 */
export default function Calendario({
  visao,
  dia,
  eventos,
  agora,
  aoTocarDia,
  aoTocarHorario,
  aoTocarEvento,
}: Props) {
  const ref = useRef<FullCalendar>(null);

  useEffect(() => {
    ref.current?.getApi().changeView(VIEW[visao], dia);
  }, [visao, dia]);

  const escolhido = (d: Date) => (diaDe(d) === dia ? ['dia-escolhido'] : []);

  return (
    <div className="calendario -mx-4">
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={ptBr}
        timeZone="UTC"
        now={agora}
        initialView={VIEW[visao]}
        initialDate={dia}
        firstDay={0}
        headerToolbar={false}
        height="auto"
        events={eventos.map((e) => ({
          id: e.id,
          title: e.titulo,
          start: e.inicio,
          end: e.fim,
          classNames: [`evento-${e.tipo}`],
          extendedProps: { tipo: e.tipo },
        }))}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        nowIndicator
        navLinks
        navLinkDayClick={(d) => aoTocarDia(diaDe(d))}
        dayCellClassNames={(a) => escolhido(a.date)}
        dayHeaderClassNames={(a) => escolhido(a.date)}
        dateClick={(info) => {
          const { data, hora } = lerToque(info.dateStr);
          if (hora) aoTocarHorario(data, hora);
          else aoTocarDia(data);
        }}
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          aoTocarEvento(info.event.id, info.event.extendedProps.tipo as TipoEvento);
        }}
        views={{
          dayGridMonth: {
            dayMaxEvents: 2,
            eventDisplay: 'list-item',
            fixedWeekCount: false,
          },
          timeGridWeek: {
            allDaySlot: false,
            slotMinTime: '06:00:00',
            slotMaxTime: '22:00:00',
            slotDuration: '00:30:00',
            slotLabelInterval: '01:00',
            slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
            dayHeaderFormat: { weekday: 'narrow', day: 'numeric' },
          },
        }}
      />
    </div>
  );
}
