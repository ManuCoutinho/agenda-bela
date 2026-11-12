import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import { ESTILO_BOTAO, ESTILO_LISTA } from '../../componentes/estilos';
import { formatarWhatsApp } from '../../dominio/clientes';
import {
  dddDe,
  MOTIVO,
  paraNovasClientes,
  prepararImportacao,
  type Candidata,
  type ContatoImportado,
} from '../../dominio/importacao';
import { useClientes } from '../../hooks/useClientes';
import { useConfiguracoes } from '../../hooks/useConfiguracoes';
import { importarClientes } from '../../servicos/clientes';
import { escolherContatos, temSeletorDeContatos } from '../../servicos/contatos';

/**
 * `/clientes/importar` (RF02): traz clientes dos contatos do celular (seletor do
 * Chrome no Android). Sem o seletor, a saída é cadastrar à mão.
 */
export default function ImportarClientes() {
  const navegar = useNavigate();
  const { clientes, carregando, erro } = useClientes();
  const { config } = useConfiguracoes();
  const [candidatas, setCandidatas] = useState<Candidata[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [autorizou, setAutorizou] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean }>();
  const [erroAutorizacao, setErroAutorizacao] = useState(false);

  function receber(contatos: ContatoImportado[]) {
    if (contatos.length === 0) {
      setMensagem({ texto: 'Nenhum contato foi escolhido.', erro: false });
      return;
    }
    setMensagem(undefined);
    const lista = prepararImportacao(contatos, clientes, dddDe(config.whatsapp));
    setCandidatas(lista);
    setMarcadas(new Set(lista.filter((c) => c.situacao === 'nova').map((c) => c.chave)));
  }

  async function doCelular() {
    try {
      receber(await escolherContatos());
    } catch (e) {
      console.error(e);
      setMensagem({
        texto: 'Não foi possível abrir os contatos. Tente de novo ou cadastre a cliente à mão.',
        erro: true,
      });
    }
  }

  function alternar(chave: number) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (!nova.delete(chave)) nova.add(chave);
      return nova;
    });
  }

  function importar() {
    if (!autorizou) {
      setErroAutorizacao(true);
      return;
    }
    const escolhidas = (candidatas ?? []).filter((c) => marcadas.has(c.chave));
    const novas = paraNovasClientes(escolhidas);
    importarClientes(novas);
    const texto =
      novas.length === 1 ? '1 cliente importada.' : `${novas.length} clientes importadas.`;
    navegar('/clientes', { state: { aviso: texto } });
  }

  const quantas = marcadas.size;

  return (
    <>
      <BarraSuperior titulo="Importar clientes" voltarPara="/clientes" />

      {carregando ? (
        <p role="status" className="text-texto-suave">
          Carregando clientes…
        </p>
      ) : erro ? (
        <p role="alert" className="text-erro">
          Não foi possível carregar as clientes. Confira a internet e tente de novo.
        </p>
      ) : candidatas === null ? (
        <div className="flex flex-col gap-4">
          {temSeletorDeContatos() ? (
            <>
              <p>
                Escolha as clientes nos contatos do seu celular. Só sai do celular quem você
                escolher.
              </p>
              <Botao onClick={doCelular}>Escolher dos contatos</Botao>
            </>
          ) : (
            <p>
              Este navegador não abre os contatos do celular. Para importar, use o Chrome no
              Android; ou cadastre a cliente à mão.
            </p>
          )}
          <Link to="/clientes/nova" className={ESTILO_BOTAO.secundario}>
            Cadastrar à mão
          </Link>
          {mensagem && (
            <p
              role={mensagem.erro ? 'alert' : 'status'}
              className={mensagem.erro ? 'text-erro' : 'text-texto-suave'}
            >
              {mensagem.texto}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p aria-live="polite">
            {quantas === 0
              ? 'Nenhuma cliente marcada.'
              : `${quantas} ${quantas === 1 ? 'cliente marcada' : 'clientes marcadas'} para importar.`}
          </p>

          <ul className={ESTILO_LISTA}>
            {candidatas.map((c) => {
              const id = `importar-${c.chave}`;
              const nova = c.situacao === 'nova';
              return (
                <li key={c.chave}>
                  <label
                    htmlFor={id}
                    className={`grid min-h-18 grid-cols-[auto_1fr] content-center gap-x-4 px-4 py-2 ${nova ? 'cursor-pointer active:bg-marca-suave' : ''}`}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={marcadas.has(c.chave)}
                      disabled={!nova}
                      onChange={() => alternar(c.chave)}
                      className="row-span-2 size-6 self-center accent-marca"
                    />
                    <span className="truncate font-medium">{c.nome || 'Sem nome'}</span>
                    <span className="text-texto-suave">
                      {c.whatsapp ? formatarWhatsApp(c.whatsapp) : 'Sem número'}
                      {!nova && ` · ${MOTIVO[c.situacao]}`}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <label htmlFor="autorizou" className="flex min-h-12 items-start gap-3">
            <input
              id="autorizou"
              type="checkbox"
              checked={autorizou}
              onChange={(e) => {
                setAutorizou(e.target.checked);
                setErroAutorizacao(false);
              }}
              aria-invalid={erroAutorizacao || undefined}
              aria-describedby={erroAutorizacao ? 'autorizou-erro' : undefined}
              className="mt-0.5 size-6 shrink-0 accent-marca"
            />
            <span>
              Estas clientes autorizaram guardar o nome e o WhatsApp delas para marcar horários.
            </span>
          </label>
          {erroAutorizacao && (
            <p id="autorizou-erro" className="text-erro">
              Marque a autorização das clientes para importar.
            </p>
          )}

          <Botao onClick={importar} disabled={quantas === 0}>
            {quantas === 1 ? 'Importar 1 cliente' : `Importar ${quantas} clientes`}
          </Botao>
          <Botao variante="secundario" onClick={() => setCandidatas(null)}>
            Escolher outros contatos
          </Botao>
        </div>
      )}
    </>
  );
}
