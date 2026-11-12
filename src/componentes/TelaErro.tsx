import type { ReactNode } from 'react';
import Icone, { type NomeIcone } from './Icone';

type Props = {
  icone: NomeIcone;
  /** Ex.: "Erro 403"; fica acima do título, em texto discreto. */
  codigo: string;
  titulo: string;
  children: ReactNode;
  /** Botões ou links do que fazer. */
  acoes: ReactNode;
};

/** Tela cheia de erro (sem as barras do app): ícone, título, explicação e o que fazer. */
export default function TelaErro({ icone, codigo, titulo, children, acoes }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8 text-center">
      <span className="mx-auto inline-flex size-24 items-center justify-center rounded-full bg-marca-suave text-marca">
        <Icone nome={icone} className="size-12" />
      </span>
      <div className="flex flex-col gap-2">
        <p className="text-texto-suave">{codigo}</p>
        <h1 className="text-titulo font-normal">{titulo}</h1>
        <div className="flex flex-col gap-2 text-texto-suave">{children}</div>
      </div>
      <div className="flex flex-col gap-3">{acoes}</div>
    </main>
  );
}
