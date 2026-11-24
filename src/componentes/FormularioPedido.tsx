import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { rotuloDia } from '../dominio/agenda';
import { esquemaPedido, type CamposPedido, type DadosPedido } from '../dominio/pedidos';
import { REPETICOES, type Repeticao } from '../dominio/series';
import Botao from './Botao';
import Campo from './Campo';
import { ESTILO_CAMPO } from './estilos';

type Props = {
  aoEnviar: (dados: DadosPedido) => Promise<void>;
  /** Mensagem de falha do envio, mostrada logo acima do botão. */
  erro?: string;
  /** I11: datas (AAAA-MM-DD) que o horário fixo reservaria, para a cliente conferir. */
  datasDaRepeticao: (dias: Repeticao) => string[];
  /** I13: nome e WhatsApp que o aparelho já conhece. */
  inicial?: { nome: string; whatsapp: string };
};

const VAZIO: CamposPedido = { nome: '', whatsapp: '', repetir: '0' };

/** Dados da cliente na página pública (RF08) e, se quiser, o horário fixo (I11). */
export default function FormularioPedido({ aoEnviar, erro, datasDaRepeticao, inicial }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CamposPedido, unknown, DadosPedido>({
    resolver: zodResolver(esquemaPedido),
    defaultValues: { ...VAZIO, ...inicial },
  });
  const repetir = Number(useWatch({ control, name: 'repetir' })) as Repeticao;
  const datas = repetir ? datasDaRepeticao(repetir) : [];

  return (
    <form noValidate onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-5">
      <Campo id="nome" rotulo="Seu nome" erro={errors.nome?.message}>
        {(a) => (
          <input
            {...a}
            {...register('nome')}
            type="text"
            autoComplete="name"
            className={ESTILO_CAMPO}
          />
        )}
      </Campo>

      <Campo
        id="whatsapp"
        rotulo="Seu WhatsApp com DDD"
        dica="Ex.: (41) 98860-6636. A confirmação chega por ele."
        erro={errors.whatsapp?.message}
      >
        {(a) => (
          <input
            {...a}
            {...register('whatsapp')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={ESTILO_CAMPO}
          />
        )}
      </Campo>

      <Campo
        id="repetir"
        rotulo="Repetir este horário"
        dica="Para quem vem sempre no mesmo dia e hora."
        erro={errors.repetir?.message}
      >
        {(a) => (
          <select {...a} {...register('repetir')} className={ESTILO_CAMPO}>
            {REPETICOES.map((r) => (
              <option key={r.dias} value={String(r.dias)}>
                {r.rotulo}
              </option>
            ))}
          </select>
        )}
      </Campo>

      {repetir > 0 && (
        <div aria-live="polite" className="rounded-xl border border-borda bg-superficie p-4">
          {datas.length > 1 ? (
            <>
              <p className="font-medium">Vamos reservar {datas.length} datas:</p>
              <ul className="mt-2 list-disc pl-6">
                {datas.map((d) => (
                  <li key={d} className="first-letter:uppercase">
                    {rotuloDia(d)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-texto-suave">
                Se alguma já estiver ocupada, só ela fica de fora. Os meses seguintes são reservados
                quando a agenda abrir.
              </p>
            </>
          ) : (
            <p className="text-texto-suave">
              Por enquanto só esta data está aberta. As próximas são reservadas quando a agenda
              abrir.
            </p>
          )}
        </div>
      )}

      <p className="text-texto-suave">
        Ao marcar o horário, seu nome e WhatsApp ficam guardados só para este agendamento e os
        lembretes dele.
      </p>

      {erro && (
        <p role="alert" className="text-erro">
          {erro}
        </p>
      )}

      <Botao type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Marcando…' : 'Marcar horário'}
      </Botao>
    </form>
  );
}
