import type { ReactNode } from 'react';

type AtributosCampo = {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
};

type Props = {
  id: string;
  rotulo: string;
  /** Completa o rótulo só para o leitor de tela, ex.: o dia em "Início". */
  rotuloOculto?: string;
  dica?: string;
  erro?: string;
  /** Recebe os atributos de acessibilidade para pôr no input/textarea. */
  children: (atributos: AtributosCampo) => ReactNode;
};

/** Rótulo, dica e erro ligados ao campo (aria-describedby / aria-invalid). */
export default function Campo({ id, rotulo, rotuloOculto, dica, erro, children }: Props) {
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erro ? `${id}-erro` : undefined;
  const descritoPor = [idDica, idErro].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {rotulo}
        {rotuloOculto && <span className="sr-only"> {rotuloOculto}</span>}
      </label>
      {dica && (
        <p id={idDica} className="text-texto-suave">
          {dica}
        </p>
      )}
      {children({ id, 'aria-invalid': erro ? true : undefined, 'aria-describedby': descritoPor })}
      {erro && (
        <p id={idErro} className="text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
