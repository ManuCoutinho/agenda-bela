import { useState } from 'react';
import Botao from '../componentes/Botao';
import TelaErro from '../componentes/TelaErro';
import { sair } from '../servicos/autenticacao';

/** Conta Google que não é a da dona da agenda (as regras recusam a leitura). */
export default function AcessoNegado({ email }: { email: string | null }) {
  const [saindo, setSaindo] = useState(false);

  function trocarDeConta() {
    setSaindo(true);
    void sair().finally(() => setSaindo(false));
  }

  return (
    <TelaErro
      icone="cadeado"
      codigo="Erro 403"
      titulo="Acesso não permitido"
      acoes={
        <Botao onClick={trocarDeConta} disabled={saindo}>
          {saindo ? 'Saindo…' : 'Entrar com outra conta'}
        </Botao>
      }
    >
      <p>
        {email ? (
          <>
            A conta <strong className="break-all font-medium text-texto">{email}</strong> não tem
            acesso a esta agenda.
          </>
        ) : (
          'Esta conta não tem acesso a esta agenda.'
        )}
      </p>
      <p>Entre com a conta Google da dona da agenda.</p>
      <p>Para marcar um horário, use o link de agendamento enviado pela manicure.</p>
    </TelaErro>
  );
}
