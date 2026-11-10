import { Link, type LinkProps } from 'react-router';
import { ESTILO_BOTAO, type VarianteBotao } from './estilos';

type Props = LinkProps & { variante?: VarianteBotao };

/** Link de navegação com aparência de botão (ex.: "Nova cliente"). */
export default function LinkBotao({ variante = 'principal', className = '', ...props }: Props) {
  return <Link className={`${ESTILO_BOTAO[variante]} ${className}`} {...props} />;
}
