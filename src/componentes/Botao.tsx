import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'principal' | 'secundario' };

const ESTILOS = {
  principal: 'bg-marca text-white hover:bg-marca/90',
  secundario: 'border border-marca text-marca hover:bg-marca/5',
};

export default function Botao({ variante = 'principal', className = '', ...props }: Props) {
  return (
    <button
      type="button"
      className={`min-h-11 rounded-lg px-4 font-medium disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca ${ESTILOS[variante]} ${className}`}
      {...props}
    />
  );
}
