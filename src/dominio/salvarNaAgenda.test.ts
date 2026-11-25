import { describe, expect, it } from 'vitest';
import { inicioEm } from './agenda';
import { arquivoIcs, linkGoogleAgenda, tituloEvento, type EventoAgenda } from './salvarNaAgenda';

const EVENTO: EventoAgenda = {
  id: 'p1',
  titulo: tituloEvento('Espaço Juju'),
  inicio: inicioEm('2026-12-01', '0900'),
  fim: inicioEm('2026-12-01', '1000'),
  detalhes: 'Mão, R$ 35,00',
};

describe('salvar na agenda (I09)', () => {
  it('link do Google Agenda com o horário em UTC (09:00 em SP = 12:00 UTC)', () => {
    const url = new URL(linkGoogleAgenda(EVENTO));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('text')).toBe('Embelezar unhas – Espaço Juju');
    expect(url.searchParams.get('dates')).toBe('20261201T120000Z/20261201T130000Z');
    expect(url.searchParams.get('details')).toBe('Mão, R$ 35,00');
  });

  it('.ics com lembrete um dia antes e texto escapado', () => {
    const ics = arquivoIcs([EVENTO], new Date('2026-11-24T15:00:00Z'));
    expect(ics).toContain('DTSTART:20261201T120000Z\r\n');
    expect(ics).toContain('DTEND:20261201T130000Z\r\n');
    expect(ics).toContain('SUMMARY:Embelezar unhas – Espaço Juju\r\n');
    expect(ics).toContain('DESCRIPTION:Mão\\, R$ 35\\,00\r\n');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('vários horários num arquivo só', () => {
    const ics = arquivoIcs([EVENTO, { ...EVENTO, id: 'p2' }], new Date());
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});
