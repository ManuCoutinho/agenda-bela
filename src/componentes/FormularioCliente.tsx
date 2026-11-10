import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { esquemaCliente, type CamposCliente, type DadosCliente } from '../dominio/clientes';
import Botao from './Botao';
import Campo from './Campo';
import { ESTILO_CAMPO } from './estilos';

type Props = {
  inicial?: CamposCliente;
  aoEnviar: (dados: DadosCliente) => void;
  aoCancelar: () => void;
};

const VAZIO: CamposCliente = { nome: '', whatsapp: '', observacao: '', consentimento: false };

export default function FormularioCliente({ inicial = VAZIO, aoEnviar, aoCancelar }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CamposCliente, unknown, DadosCliente>({
    resolver: zodResolver(esquemaCliente),
    defaultValues: inicial,
  });

  return (
    <form noValidate onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-5">
      <Campo id="nome" rotulo="Nome" erro={errors.nome?.message}>
        {(a) => (
          <input
            {...a}
            {...register('nome')}
            type="text"
            autoComplete="off"
            className={ESTILO_CAMPO}
          />
        )}
      </Campo>

      <Campo
        id="whatsapp"
        rotulo="WhatsApp com DDD"
        dica="Ex.: (41) 98860-6636"
        erro={errors.whatsapp?.message}
      >
        {(a) => (
          <input
            {...a}
            {...register('whatsapp')}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            className={ESTILO_CAMPO}
          />
        )}
      </Campo>

      <Campo
        id="observacao"
        rotulo="Observação (opcional)"
        dica="Ex.: alergia a acetona, prefere unha curta"
        erro={errors.observacao?.message}
      >
        {(a) => <textarea {...a} {...register('observacao')} rows={3} className={ESTILO_CAMPO} />}
      </Campo>

      <div className="flex flex-col gap-1">
        <label htmlFor="consentimento" className="flex min-h-11 items-start gap-3">
          <input
            id="consentimento"
            type="checkbox"
            {...register('consentimento')}
            aria-invalid={errors.consentimento ? true : undefined}
            aria-describedby={errors.consentimento ? 'consentimento-erro' : undefined}
            className="mt-0.5 size-6 shrink-0 accent-marca"
          />
          <span>A cliente autorizou guardar o nome e o WhatsApp dela para os agendamentos.</span>
        </label>
        {errors.consentimento && (
          <p id="consentimento-erro" className="text-erro">
            {errors.consentimento.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Botao type="submit" disabled={isSubmitting}>
          Salvar cliente
        </Botao>
        <Botao variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
