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
  `Endereço: ${a.endereco}. Pode confirmar?`;
