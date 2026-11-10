import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  DURACOES_MIN,
  esquemaServico,
  formatarDuracao,
  type CamposServico,
  type DadosServico,
} from '../dominio/servicos';
import Botao from './Botao';
import Campo from './Campo';
import { ESTILO_CAMPO } from './estilos';

type Props = {
  inicial?: CamposServico;
  aoEnviar: (dados: DadosServico) => void;
  aoCancelar: () => void;
};

const VAZIO: CamposServico = { nome: '', duracaoMin: '60', preco: '', publico: true };

export default function FormularioServico({ inicial = VAZIO, aoEnviar, aoCancelar }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CamposServico, unknown, DadosServico>({
    resolver: zodResolver(esquemaServico),
    defaultValues: inicial,
  });

  return (
    <form noValidate onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-5">
      <Campo id="nome" rotulo="Nome do serviço" dica="Ex.: Pé e mão" erro={errors.nome?.message}>
        {(a) => <input {...a} {...register('nome')} type="text" className={ESTILO_CAMPO} />}
      </Campo>

      <Campo id="duracao" rotulo="Duração" erro={errors.duracaoMin?.message}>
        {(a) => (
          <select {...a} {...register('duracaoMin')} className={ESTILO_CAMPO}>
            {DURACOES_MIN.map((m) => (
              <option key={m} value={String(m)}>
                {formatarDuracao(m)}
              </option>
            ))}
          </select>
        )}
      </Campo>

      <Campo id="preco" rotulo="Preço (R$)" dica="Ex.: 45,00" erro={errors.preco?.message}>
        {(a) => (
          <input
            {...a}
            {...register('preco')}
            type="text"
            inputMode="decimal"
            className={ESTILO_CAMPO}
          />
        )}
      </Campo>

      <label htmlFor="publico" className="flex min-h-11 items-start gap-3">
        <input
          id="publico"
          type="checkbox"
          {...register('publico')}
          className="mt-0.5 size-6 shrink-0 accent-marca"
        />
        <span>Mostrar na página de agendamento das clientes</span>
      </label>

      <div className="flex flex-col gap-3">
        <Botao type="submit" disabled={isSubmitting}>
          Salvar serviço
        </Botao>
        <Botao variante="secundario" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
