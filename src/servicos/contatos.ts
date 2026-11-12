import type { ContatoImportado } from '../dominio/importacao';

// Contact Picker API (Chrome no Android): abre o seletor de contatos do
// próprio celular; só volta o que a manicure escolher.
type ContatoDoSeletor = { name?: string[]; tel?: string[] };
type GerenteDeContatos = {
  select: (
    propriedades: ('name' | 'tel')[],
    opcoes: { multiple: boolean },
  ) => Promise<ContatoDoSeletor[]>;
};

const gerente = () => (navigator as Navigator & { contacts?: GerenteDeContatos }).contacts;

/** `true` no Chrome do Android; nos outros navegadores, só o cadastro à mão. */
export const temSeletorDeContatos = () => typeof window !== 'undefined' && !!gerente();

export async function escolherContatos(): Promise<ContatoImportado[]> {
  const seletor = gerente();
  if (!seletor) return [];
  const escolhidos = await seletor.select(['name', 'tel'], { multiple: true });
  return escolhidos.map((c) => ({ nome: c.name?.[0] ?? '', telefones: c.tel ?? [] }));
}
