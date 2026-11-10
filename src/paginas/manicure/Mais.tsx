import { Link } from 'react-router';
import Aviso from '../../componentes/Aviso';
import Botao from '../../componentes/Botao';
import { ESTILO_LINK } from '../../componentes/estilos';
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
      <h1 className="text-2xl font-semibold">Mais</h1>
      <Aviso texto={aviso} />
      <ul className="mt-4 divide-y divide-borda rounded-lg border border-borda bg-superficie">
        {OPCOES.map((o) => (
          <li key={o.para}>
            <Link to={o.para} className={`flex min-h-11 flex-col p-3 ${ESTILO_LINK} no-underline`}>
              <span className="font-medium">{o.rotulo}</span>
              <span className="text-texto-suave">{o.descricao}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-texto-suave">Conectada como {usuario?.email}</p>
      <Botao variante="secundario" className="mt-4 w-full" onClick={() => sair()}>
        Sair
      </Botao>
    </>
  );
}
