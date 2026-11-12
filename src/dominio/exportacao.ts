import { dataDoDia, horaDe, rotuloHora, type Agendamento } from './agenda';
import { formatarWhatsApp, type Cliente } from './clientes';

/**
 * CSV para o Excel/Planilhas em português: separador `;` (a vírgula é decimal),
 * BOM para os acentos e aspas em todo campo com `;`, aspas ou quebra de linha.
 */
export function paraCsv(linhas: readonly (readonly (string | number)[])[]): string {
  const campo = (v: string | number) => {
    const texto = String(v);
    // fórmula em planilha (=, +, -, @) vira texto: proteção contra injeção
    const seguro = /^[=+\-@]/.test(texto) && typeof v === 'string' ? `'${texto}` : texto;
    return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return '\uFEFF' + linhas.map((l) => l.map(campo).join(';')).join('\r\n') + '\r\n';
}

const reais = (centavos: number) => (centavos / 100).toFixed(2).replace('.', ',');

export const csvClientes = (clientes: readonly Cliente[]) =>
  paraCsv([
    ['Nome', 'WhatsApp', 'Observação'],
    ...[...clientes]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((c) => [c.nome, formatarWhatsApp(c.whatsapp), c.observacao]),
  ]);

const STATUS: Record<Agendamento['status'], string> = {
  marcado: 'Marcado',
  realizado: 'Realizado',
  falta: 'Faltou',
  cancelado: 'Cancelado',
};

export const csvAtendimentos = (agendamentos: readonly Agendamento[]) =>
  paraCsv([
    [
      'Data',
      'Hora',
      'Cliente',
      'WhatsApp',
      'Serviço',
      'Duração (min)',
      'Preço (R$)',
      'Situação',
      'Observação',
    ],
    ...[...agendamentos]
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
      .map((a) => [
        dataDoDia(a.inicio).split('-').reverse().join('/'),
        rotuloHora(horaDe(a.inicio)),
        a.clienteNome,
        a.clienteWhatsapp ? formatarWhatsApp(a.clienteWhatsapp) : '',
        a.servicoNome,
        a.duracaoMin,
        a.precoCentavos === undefined ? '' : reais(a.precoCentavos),
        STATUS[a.status],
        a.observacao,
      ]),
  ]);
