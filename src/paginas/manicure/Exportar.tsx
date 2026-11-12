import { useState } from 'react';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import { dataDoDia } from '../../dominio/agenda';
import { csvAtendimentos, csvClientes } from '../../dominio/exportacao';
import { useClientes } from '../../hooks/useClientes';
import { buscarTodosAgendamentos } from '../../servicos/agenda';
import { baixarArquivo } from '../../servicos/arquivos';

/** RNF02: cópia dos dados em planilha (Excel, Google Planilhas). */
export default function Exportar() {
  const { clientes, carregando } = useClientes();
  const [baixando, setBaixando] = useState(false);
  const [aviso, setAviso] = useState<string>();
  const [erro, setErro] = useState<string>();
  const hoje = dataDoDia(new Date());

  function baixarClientes() {
    baixarArquivo(`clientes-${hoje}.csv`, csvClientes(clientes));
    setAviso(`Arquivo com ${clientes.length} clientes baixado.`);
  }

  async function baixarAtendimentos() {
    setBaixando(true);
    setErro(undefined);
    try {
      const todos = await buscarTodosAgendamentos();
      baixarArquivo(`atendimentos-${hoje}.csv`, csvAtendimentos(todos));
      setAviso(`Arquivo com ${todos.length} atendimentos baixado.`);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível buscar os atendimentos. Confira a internet e tente de novo.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <>
      <BarraSuperior titulo="Exportar para planilha" voltarPara="/mais" />
      <p className="mb-6 text-texto-suave">
        Baixa um arquivo .csv que abre no Excel ou no Google Planilhas. Bom para guardar uma cópia
        ou fazer contas.
      </p>
      <div className="flex flex-col gap-3">
        <Botao onClick={baixarClientes} disabled={carregando}>
          Baixar clientes
        </Botao>
        <Botao variante="secundario" onClick={baixarAtendimentos} disabled={baixando}>
          {baixando ? 'Buscando atendimentos…' : 'Baixar atendimentos'}
        </Botao>
      </div>
      {aviso && (
        <p role="status" className="mt-4">
          {aviso} Ele fica na pasta Downloads.
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-4 text-erro">
          {erro}
        </p>
      )}
    </>
  );
}
