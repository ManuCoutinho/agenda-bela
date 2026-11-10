import { useId, useState } from 'react';
import { Link } from 'react-router';
import Aviso from '../../componentes/Aviso';
import BarraSuperior from '../../componentes/BarraSuperior';
import Campo from '../../componentes/Campo';
import Fab from '../../componentes/Fab';
import Icone from '../../componentes/Icone';
import LinkBotao from '../../componentes/LinkBotao';
import {
  ESTILO_BOTAO_ICONE,
  ESTILO_CAMPO,
  ESTILO_ITEM_LISTA,
  ESTILO_LISTA,
} from '../../componentes/estilos';
import { buscarClientes, formatarWhatsApp } from '../../dominio/clientes';
import { linkWhatsApp } from '../../dominio/whatsapp';
import { useAviso } from '../../hooks/useAviso';
import { useClientes } from '../../hooks/useClientes';

export default function Clientes() {
  const { clientes, carregando, erro } = useClientes();
  const [termo, setTermo] = useState('');
  const aviso = useAviso();
  const idBusca = useId();
  const encontradas = buscarClientes(clientes, termo);

  return (
    <>
      <BarraSuperior titulo="Clientes" />
      <LinkBotao to="/clientes/importar" variante="secundario" className="mb-4 w-full">
        Importar dos contatos
      </LinkBotao>

      {carregando && (
        <p role="status" className="text-texto-suave">
          Carregando clientes…
        </p>
      )}
      {erro && (
        <p role="alert" className="text-erro">
          Não foi possível carregar as clientes. Confira a internet e tente de novo.
        </p>
      )}

      {!carregando && !erro && clientes.length === 0 && (
        <p className="text-texto-suave">
          Nenhuma cliente cadastrada ainda. Importe dos contatos ou toque em “Nova cliente”.
        </p>
      )}

      {clientes.length > 0 && (
        <>
          <Campo id={idBusca} rotulo="Buscar por nome ou WhatsApp">
            {(a) => (
              <input
                {...a}
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                className={ESTILO_CAMPO}
              />
            )}
          </Campo>

          <p aria-live="polite" className="mt-4 mb-2 text-texto-suave">
            {encontradas.length === 0
              ? `Nenhuma cliente encontrada para “${termo.trim()}”.`
              : `${encontradas.length} ${encontradas.length === 1 ? 'cliente' : 'clientes'}`}
          </p>

          <ul className={ESTILO_LISTA}>
            {encontradas.map((c) => (
              <li key={c.id} className="flex items-center pr-2">
                <Link to={`/clientes/${c.id}`} className={`${ESTILO_ITEM_LISTA} min-h-18 flex-1`}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{c.nome}</span>
                    <span className="text-texto-suave">{formatarWhatsApp(c.whatsapp)}</span>
                  </span>
                </Link>
                <a
                  href={linkWhatsApp(c.whatsapp, `Oi, ${c.nome}!`)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Conversar com ${c.nome} no WhatsApp (abre outro app)`}
                  className={`${ESTILO_BOTAO_ICONE} text-marca`}
                >
                  <Icone nome="conversa" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <Fab to="/clientes/nova" rotulo="Nova cliente" />
      <Aviso texto={aviso} />
    </>
  );
}
