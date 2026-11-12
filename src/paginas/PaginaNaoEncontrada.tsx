import { Link } from 'react-router';
import TelaErro from '../componentes/TelaErro';
import { ESTILO_BOTAO } from '../componentes/estilos';

/** Endereço que não existe no app. */
export default function PaginaNaoEncontrada() {
  return (
    <TelaErro
      icone="busca"
      codigo="Erro 404"
      titulo="Página não encontrada"
      acoes={
        <Link to="/" className={ESTILO_BOTAO.principal}>
          Ir para o início
        </Link>
      }
    >
      <p>Este endereço não existe ou mudou. Confira o link ou volte para o início.</p>
    </TelaErro>
  );
}
