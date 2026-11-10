import { useId, useState } from 'react';
import { Link } from 'react-router';
import Aviso from '../../componentes/Aviso';
import Campo from '../../componentes/Campo';
import LinkBotao from '../../componentes/LinkBotao';
import { ESTILO_CAMPO, ESTILO_LINK } from '../../componentes/estilos';
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <LinkBotao to="/clientes/nova">Nova cliente</LinkBotao>
      </div>

      <Aviso texto={aviso} />

      {carregando && (
        <p role="status" className="mt-6 text-texto-suave">
          Carregando clientes…
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-6 text-erro">
          Não foi possível carregar as clientes. Confira a internet e tente de novo.
        </p>
      )}

      {!carregando && !erro && clientes.length === 0 && (
        <p className="mt-6 text-texto-suave">
          Nenhuma cliente cadastrada ainda. Toque em “Nova cliente” para começar.
        </p>
      )}

      {clientes.length > 0 && (
        <>
          <div className="mt-6">
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
          </div>

          <p aria-live="polite" className="mt-3 text-texto-suave">
            {encontradas.length === 0
              ? `Nenhuma cliente encontrada para “${termo.trim()}”.`
              : `${encontradas.length} ${encontradas.length === 1 ? 'cliente' : 'clientes'}`}
          </p>

          <ul className="mt-2 divide-y divide-borda rounded-lg border border-borda bg-superficie">
            {encontradas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 p-3">
                <Link
                  to={`/clientes/${c.id}`}
                  className={`flex min-h-11 flex-col justify-center ${ESTILO_LINK} no-underline`}
                >
                  <span className="font-medium">{c.nome}</span>
                  <span className="text-texto-suave">{formatarWhatsApp(c.whatsapp)}</span>
                </Link>
                <a
                  href={linkWhatsApp(c.whatsapp, `Oi, ${c.nome}!`)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Conversar com ${c.nome} no WhatsApp (abre outro app)`}
                  className={`inline-flex min-h-11 items-center ${ESTILO_LINK}`}
                >
                  WhatsApp
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
