/** I09: o horário marcado, para a cliente guardar na agenda do celular. */
export type EventoAgenda = {
  /** Identifica o horário (o mesmo id evita duplicar ao salvar de novo). */
  id: string;
  titulo: string;
  inicio: Date;
  fim: Date;
  detalhes: string;
};

/** 2026-12-01T12:00:00Z → '20261201T120000Z' */
const emUtc = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** Abre o Google Agenda com o evento pronto para salvar (Android). */
export function linkGoogleAgenda(e: EventoAgenda) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: `${emUtc(e.inicio)}/${emUtc(e.fim)}`,
    details: e.detalhes,
    ctz: 'America/Sao_Paulo',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const escapar = (texto: string) =>
  texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/**
 * Arquivo .ics (iPhone e outros apps de agenda), com lembrete um dia antes.
 * Aceita vários horários (horário fixo, I11).
 */
export function arquivoIcs(eventos: readonly EventoAgenda[], agora: Date) {
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Bela//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventos.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${e.id}@agenda-bela`,
      `DTSTAMP:${emUtc(agora)}`,
      `DTSTART:${emUtc(e.inicio)}`,
      `DTEND:${emUtc(e.fim)}`,
      `SUMMARY:${escapar(e.titulo)}`,
      `DESCRIPTION:${escapar(e.detalhes)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapar(e.titulo)}`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return `${linhas.join('\r\n')}\r\n`;
}

export const linkArquivoIcs = (ics: string) =>
  `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;

/** Título combinado com a manicure: "Embelezar unhas – Espaço Juju". */
export const tituloEvento = (espaco: string) =>
  espaco ? `Embelezar unhas – ${espaco}` : 'Embelezar unhas';

/** Evento do atendimento marcado, a partir do início e da duração. */
export const eventoDoHorario = (p: {
  id: string;
  espaco: string;
  servico: string;
  inicio: Date;
  duracaoMin: number;
}): EventoAgenda => ({
  id: p.id,
  titulo: tituloEvento(p.espaco),
  inicio: p.inicio,
  fim: new Date(p.inicio.getTime() + p.duracaoMin * 60_000),
  detalhes: p.servico,
});
