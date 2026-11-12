// número no formato internacional: 55 + DDD + número, só dígitos
export const linkWhatsApp = (numero: string, texto: string) =>
  `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;

export const textoLembrete = (a: {
  nome: string;
  servico: string;
  data: string;
  hora: string;
  endereco: string;
}) =>
  `Oi, ${a.nome}! Passando para lembrar do seu horário de ${a.servico} amanhã (${a.data}) às ${a.hora}. ` +
  (a.endereco ? `Endereço: ${a.endereco}. ` : '') +
  'Pode confirmar?';

/** RF12: a manicure bloqueou um horário que já tinha cliente. */
export const textoRemarcacao = (a: { nome: string; quando: string }) =>
  `Oi, ${a.nome}! Precisei mudar minha agenda e não vou conseguir te atender ${a.quando}. ` +
  'Me diz qual outro dia e horário fica bom para você que eu remarco. Desculpa o transtorno!';
