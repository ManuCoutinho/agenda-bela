import { useState } from 'react';
import Botao from '../../componentes/Botao';
import { ativarAvisos, estadoAvisos, type EstadoAvisos } from '../../servicos/notificacoes';

const TEXTOS: Record<Exclude<EstadoAvisos, 'indisponivel'>, string> = {
  desligado:
    'Receba às 18h um aviso quando houver atendimento no dia seguinte, mesmo com o app fechado.',
  ativado: 'Avisos ligados neste celular: às 18h, se houver atendimento amanhã, chega um aviso.',
  bloqueado:
    'As notificações estão bloqueadas. No Chrome, toque no cadeado ao lado do endereço → Permissões → Notificações → Permitir.',
};

/** RF11 (opção B): botão em Mais para ligar a notificação das 18h. */
export default function AvisosLembrete() {
  const [estado, setEstado] = useState<EstadoAvisos>(estadoAvisos);
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState<string>();

  if (estado === 'indisponivel') return null;

  async function ativar() {
    setAtivando(true);
    setErro(undefined);
    try {
      setEstado(await ativarAvisos());
    } catch (e) {
      console.error(e);
      setErro('Não foi possível ligar os avisos. Confira a internet e tente de novo.');
    } finally {
      setAtivando(false);
    }
  }

  return (
    <section aria-labelledby="titulo-avisos" className="mt-6 flex flex-col gap-3">
      <h2 id="titulo-avisos" className="text-secao font-medium">
        Avisos de lembrete
      </h2>
      <p role="status" className="text-texto-suave">
        {TEXTOS[estado]}
      </p>
      {erro && (
        <p role="alert" className="text-erro">
          {erro}
        </p>
      )}
      {estado === 'desligado' && (
        <Botao onClick={ativar} disabled={ativando}>
          {ativando ? 'Ligando…' : 'Ativar avisos de lembrete'}
        </Botao>
      )}
      {estado === 'ativado' && (
        <Botao variante="texto" onClick={ativar} disabled={ativando}>
          {ativando ? 'Ligando…' : 'Não chegou? Ligar de novo'}
        </Botao>
      )}
    </section>
  );
}
