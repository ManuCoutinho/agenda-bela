import { useEffect, useState } from 'react';
import BarraSuperior from '../../componentes/BarraSuperior';
import Botao from '../../componentes/Botao';
import {
  aoMudarInstalacao,
  instalarAgora,
  jaInstalado,
  podeInstalarAgora,
} from '../../servicos/instalacao';

/** RNF02: instalar o app na tela inicial (Android e iPhone). */
export default function Instalar() {
  const [pode, setPode] = useState(podeInstalarAgora);
  const [aviso, setAviso] = useState<string>();
  useEffect(() => aoMudarInstalacao(() => setPode(podeInstalarAgora())), []);

  async function instalar() {
    const aceitou = await instalarAgora();
    setAviso(
      aceitou
        ? 'Pronto! O ícone da Agenda aparece na tela inicial.'
        : 'Tudo bem. Dá para instalar depois por aqui.',
    );
  }

  return (
    <>
      <BarraSuperior titulo="Instalar o app" voltarPara="/mais" />
      {jaInstalado() ? (
        <p role="status">O app já está instalado neste aparelho.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-texto-suave">
            Instalado, o app abre pelo ícone, em tela cheia, e funciona mesmo sem internet (as
            mudanças sincronizam depois).
          </p>
          {pode && <Botao onClick={instalar}>Instalar agora</Botao>}
          {aviso && <p role="status">{aviso}</p>}

          <section aria-labelledby="android">
            <h2 id="android" className="mb-2 text-secao font-medium">
              No Android (Chrome)
            </h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>Abra o app no Chrome.</li>
              <li>Toque nos três pontinhos (⋮) no canto de cima.</li>
              <li>Toque em “Instalar app” (ou “Adicionar à tela inicial”).</li>
              <li>Confirme em “Instalar”.</li>
            </ol>
          </section>

          <section aria-labelledby="iphone">
            <h2 id="iphone" className="mb-2 text-secao font-medium">
              No iPhone (Safari)
            </h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>Abra o app no Safari.</li>
              <li>Toque em Compartilhar (o quadrado com a seta para cima).</li>
              <li>Toque em “Adicionar à Tela de Início”.</li>
              <li>Toque em “Adicionar”.</li>
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
