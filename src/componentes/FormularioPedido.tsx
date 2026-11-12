import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { esquemaPedido, type CamposPedido, type DadosPedido } from '../dominio/pedidos';
import Botao from './Botao';
import Campo from './Campo';
import { ESTILO_CAMPO } from './estilos';

type Props = {
  aoEnviar: (dados: DadosPedido) => Promise<void>;
  /** Mensagem de falha do envio, mostrada logo acima do botão. */
  erro?: string;
};

const VAZIO: CamposPedido = { nome: '', whatsapp: '', consentimento: false };

/** Dados da cliente na página pública (RF08). */
export default function FormularioPedido({ aoEnviar, erro }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CamposPedido, unknown, DadosPedido>({
    resolver: zodResolver(esquemaPedido),
    defaultValues: VAZIO,
  });

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

      <div className="flex flex-col gap-1">
        <label htmlFor="consentimento" className="flex min-h-12 items-start gap-3">
          <input
            id="consentimento"
            type="checkbox"
            {...register('consentimento')}
            aria-invalid={errors.consentimento ? true : undefined}
            aria-describedby={errors.consentimento ? 'consentimento-erro' : undefined}
            className="mt-0.5 size-6 shrink-0 accent-marca"
          />
          <span>
            Autorizo guardar meu nome e WhatsApp para este agendamento e para os lembretes dele.
          </span>
        </label>
        {errors.consentimento && (
          <p id="consentimento-erro" className="text-erro">
            {errors.consentimento.message}
          </p>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-erro">
          {erro}
        </p>
      )}

      <Botao type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando…' : 'Pedir horário'}
      </Botao>
    </form>
  );
}
