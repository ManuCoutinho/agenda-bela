import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import { ESTILO_BOTAO, ESTILO_LISTA } from '../../componentes/estilos';
import { formatarWhatsApp } from '../../dominio/clientes';
import {
  dddDe,
  lerVcf,
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

/** `/clientes/importar` (RF02): traz clientes dos contatos do celular ou de um .vcf. */
export default function ImportarClientes() {
  const navegar = useNavigate();
  const { clientes, carregando, erro } = useClientes();
  const { config } = useConfiguracoes();
  const [candidatas, setCandidatas] = useState<Candidata[] | null>(null);
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [autorizou, setAutorizou] = useState(false);
  const [mensagem, setMensagem] = useState<string>();
  const [erroAutorizacao, setErroAutorizacao] = useState(false);

  function receber(contatos: ContatoImportado[]) {
    if (contatos.length === 0) {
      setMensagem('Nenhum contato foi escolhido. Tente de novo.');
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
      setMensagem('Não foi possível abrir os contatos. Tente pelo arquivo .vcf.');
    }
  }

  async function doArquivo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const contatos = lerVcf(await arquivo.text());
    if (contatos.length === 0) {
      setMensagem('Esse arquivo não tem contatos. Escolha o arquivo .vcf exportado do Contatos.');
      return;
    }
    receber(contatos);
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
          <p>Escolha as clientes nos contatos do seu celular. Nada é enviado sem você escolher.</p>
          {temSeletorDeContatos() && <Botao onClick={doCelular}>Escolher dos contatos</Botao>}
          <label className={`${ESTILO_BOTAO.secundario} cursor-pointer`}>
            Abrir arquivo .vcf
            <input
              type="file"
              accept=".vcf,text/vcard,text/x-vcard"
              onChange={doArquivo}
              className="sr-only"
            />
          </label>
          <p className="text-texto-suave">
            Para gerar o arquivo no Android: app Contatos → Corrigir e gerenciar → Exportar para
            arquivo.
          </p>
          {mensagem && (
            <p role="alert" className="text-erro">
              {mensagem}
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
