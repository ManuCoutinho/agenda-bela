import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  esquemaAtendimento,
  diaDaSemana,
  horariosParaMarcar,
  NOVA_CLIENTE,
  rotuloHora,
  type CamposAtendimento,
  type DadosAtendimento,
} from '../dominio/agenda';
import type { Cliente } from '../dominio/clientes';
import { expedienteDoDia, type FaixaExpediente } from '../dominio/configuracoes';
import { formatarDuracao, type Servico } from '../dominio/servicos';
import Botao from './Botao';
import Campo from './Campo';
import Icone from './Icone';
import { ESTILO_CAMPO } from './estilos';

type Props = {
  clientes: readonly Cliente[];
  servicos: readonly Servico[];
  inicial: CamposAtendimento;
  /** Horas (HHmm) ocupadas no dia escolhido, sem as do próprio atendimento. */
  ocupados: ReadonlySet<string>;
  intervaloMin: number;
  /** Expediente da semana; horários fora dele aparecem sinalizados. */
  expediente: readonly FaixaExpediente[];
  aoMudarData: (data: string) => void;
  /** Abre os contatos do celular; ausente onde o navegador não deixa. */
  aoEscolherContato?: () => Promise<{ nome: string; whatsapp: string } | null>;
  aoEnviar: (dados: DadosAtendimento) => Promise<void>;
  aoCancelar: () => void;
  erroEnvio?: string;
};

export default function FormularioAtendimento(props: Props) {
  const { clientes, servicos, inicial, ocupados, intervaloMin, expediente } = props;
  const { aoMudarData, aoEscolherContato, aoEnviar, aoCancelar, erroEnvio } = props;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CamposAtendimento, unknown, DadosAtendimento>({
    resolver: zodResolver(esquemaAtendimento),
    defaultValues: inicial,
  });

  const [data, servicoId, clienteId] = useWatch({
    control,
    name: ['data', 'servicoId', 'clienteId'],
  });
  const [erroContato, setErroContato] = useState<string>();

  async function escolherContato() {
    if (!aoEscolherContato) return;
    setErroContato(undefined);
    try {
      const contato = await aoEscolherContato();
      if (!contato) return;
      setValue('novaNome', contato.nome, { shouldValidate: true });
      setValue('novaWhatsapp', contato.whatsapp, { shouldValidate: !!contato.whatsapp });
      if (!contato.whatsapp) setErroContato('Esse contato não tem celular. Escreva o WhatsApp.');
    } catch {
      setErroContato('Não foi possível abrir os contatos. Escreva o nome e o WhatsApp.');
    }
  }
  useEffect(() => aoMudarData(data), [data, aoMudarData]);

  const duracao = servicos.find((s) => s.id === servicoId)?.duracaoMin ?? 30;
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data);
  const doDia = dataValida ? expedienteDoDia(expediente, diaDaSemana(data)) : [];
  const horarios = horariosParaMarcar(ocupados, duracao, intervaloMin, doDia);

  return (
    <form noValidate onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-5">
      <Campo id="cliente" rotulo="Cliente" erro={errors.clienteId?.message}>
        {(a) => (
          <select {...a} {...register('clienteId')} className={ESTILO_CAMPO}>
            <option value="">Escolha a cliente</option>
            <option value={NOVA_CLIENTE}>+ Nova cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        )}
      </Campo>

      {clienteId === NOVA_CLIENTE && (
        <fieldset className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-4">
          <legend className="px-1 font-medium">Nova cliente</legend>
          {aoEscolherContato && (
            <Botao variante="secundario" onClick={escolherContato}>
              <Icone nome="clientes" />
              Escolher dos contatos
            </Botao>
          )}
          {erroContato && (
            <p role="alert" className="text-erro">
              {erroContato}
            </p>
          )}
          <Campo id="nova-nome" rotulo="Nome" erro={errors.novaNome?.message}>
            {(a) => (
              <input
                {...a}
                {...register('novaNome')}
                type="text"
                autoComplete="off"
                className={ESTILO_CAMPO}
              />
            )}
          </Campo>
          <Campo id="nova-whatsapp" rotulo="WhatsApp com DDD" erro={errors.novaWhatsapp?.message}>
            {(a) => (
              <input
                {...a}
                {...register('novaWhatsapp')}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                className={ESTILO_CAMPO}
              />
            )}
          </Campo>
          <div className="flex flex-col gap-1">
            <label htmlFor="nova-consentimento" className="flex min-h-12 items-start gap-3">
              <input
                id="nova-consentimento"
                type="checkbox"
                {...register('novaConsentimento')}
                aria-invalid={errors.novaConsentimento ? true : undefined}
                aria-describedby={errors.novaConsentimento ? 'nova-consentimento-erro' : undefined}
                className="mt-0.5 size-6 shrink-0 accent-marca"
              />
              <span>
                A cliente autorizou guardar o nome e o WhatsApp dela para os agendamentos.
              </span>
            </label>
            {errors.novaConsentimento && (
              <p id="nova-consentimento-erro" className="text-erro">
                {errors.novaConsentimento.message}
              </p>
            )}
          </div>
        </fieldset>
      )}

      <Campo id="servico" rotulo="Serviço" erro={errors.servicoId?.message}>
        {(a) => (
          <select {...a} {...register('servicoId')} className={ESTILO_CAMPO}>
            <option value="">Escolha o serviço</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} ({formatarDuracao(s.duracaoMin)})
              </option>
            ))}
          </select>
        )}
      </Campo>

      <Campo id="data" rotulo="Dia" erro={errors.data?.message}>
        {(a) => <input {...a} {...register('data')} type="date" className={ESTILO_CAMPO} />}
      </Campo>

      <Campo
        id="hora"
        rotulo="Horário de início"
        dica="Horários ocupados aparecem desativados. Fora do expediente dá para marcar encaixe."
        erro={errors.hora?.message}
      >
        {(a) => (
          <select {...a} {...register('hora')} className={ESTILO_CAMPO}>
            <option value="">Escolha o horário</option>
            {horarios.map((h) => (
              <option key={h.hora} value={h.hora} disabled={!h.livre}>
                {rotuloHora(h.hora)}
                {!h.livre ? ' (ocupado)' : h.noExpediente ? '' : ' (fora do expediente)'}
              </option>
            ))}
          </select>
        )}
      </Campo>

      <Campo id="observacao" rotulo="Observação (opcional)" erro={errors.observacao?.message}>
        {(a) => <textarea {...a} {...register('observacao')} rows={2} className={ESTILO_CAMPO} />}
      </Campo>

      {erroEnvio && (
        <p role="alert" className="text-erro">
          {erroEnvio}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Botao type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Salvar atendimento'}
        </Botao>
        <Botao variante="secundario" onClick={aoCancelar}>
          Voltar sem salvar
        </Botao>
      </div>
    </form>
  );
}
