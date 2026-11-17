import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { esquemaPagamento, type CamposPagamento, type Pagamento } from '../dominio/pagamento';
import Botao from './Botao';
import Campo from './Campo';
import { ESTILO_CAMPO } from './estilos';

type Props = { inicial: CamposPagamento; aoEnviar: (dados: Pagamento) => void };

/** Chave Pix e percentual do sinal, usados em "Aprovar com sinal". */
export default function FormularioPagamento({ inicial, aoEnviar }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CamposPagamento, unknown, Pagamento>({
    resolver: zodResolver(esquemaPagamento),
    defaultValues: inicial,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(aoEnviar)}
      aria-labelledby="titulo-pagamento"
      className="mb-6 flex flex-col gap-5 rounded-xl border border-borda bg-superficie p-4"
    >
      <h2 id="titulo-pagamento" className="text-secao font-medium">
        Sinal pelo Pix
      </h2>
      <p className="text-texto-suave">
        Ao aprovar um pedido, você pode pedir um sinal: a mensagem leva o valor e a sua chave.
      </p>
      <Campo id="chavePix" rotulo="Chave Pix" erro={errors.chavePix?.message}>
        {(a) => <input {...a} {...register('chavePix')} type="text" className={ESTILO_CAMPO} />}
      </Campo>
      <Campo
        id="sinalPercentual"
        rotulo="Sinal (% do valor do serviço)"
        erro={errors.sinalPercentual?.message}
      >
        {(a) => (
          <input
            {...a}
            {...register('sinalPercentual')}
            type="text"
            inputMode="numeric"
            className={ESTILO_CAMPO}
          />
        )}
      </Campo>
      <Botao type="submit">Salvar sinal</Botao>
    </form>
  );
}
