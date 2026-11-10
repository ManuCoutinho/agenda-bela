import type { ButtonHTMLAttributes } from 'react';
import { ESTILO_BOTAO, type VarianteBotao } from './estilos';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao };

export default function Botao({ variante = 'principal', className = '', ...props }: Props) {
  return <button type="button" className={`${ESTILO_BOTAO[variante]} ${className}`} {...props} />;
}
