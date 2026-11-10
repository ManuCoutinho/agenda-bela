import { Link } from 'react-router';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import Icone from '../../componentes/Icone';
import { ESTILO_ITEM_LISTA, ESTILO_LISTA } from '../../componentes/estilos';
import { useAuth } from '../../hooks/useAuth';
import { useAviso } from '../../hooks/useAviso';
import { sair } from '../../servicos/autenticacao';

const OPCOES = [
  { para: '/mais/servicos', rotulo: 'Serviços', descricao: 'Nome, duração e preço' },
  {
    para: '/mais/configuracoes',
    rotulo: 'Configurações',
    descricao: 'Horário de atendimento, link e regras do agendamento',
  },
];

export default function Mais() {
  const { usuario } = useAuth();
  const aviso = useAviso();
  return (
    <>
      <BarraSuperior titulo="Mais" />
      <ul className={ESTILO_LISTA}>
        {OPCOES.map((o) => (
          <li key={o.para}>
            <Link to={o.para} className={`${ESTILO_ITEM_LISTA} min-h-18`}>
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{o.rotulo}</span>
                <span className="text-texto-suave">{o.descricao}</span>
              </span>
              <Icone nome="proximo" className="text-texto-suave" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-texto-suave">Conectada como {usuario?.email}</p>
      <Botao variante="secundario" className="mt-4 w-full" onClick={() => sair()}>
        Sair
      </Botao>
      <Aviso texto={aviso} />
    </>
  );
}
