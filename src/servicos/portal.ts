import { doc, onSnapshot, setDoc, Timestamp, type DocumentData } from 'firebase/firestore';
import type { HorarioPortal, Portal } from '../dominio/portal';
import { db, gravarEmSegundoPlano } from './firebase';

/**
 * `portal/{chave}`: "Meus horários" da cliente (I13). Os horários ficam num
 * mapa por id do atendimento, que as regras consultam na remarcação (I14).
 */
const portal = (chave: string) => doc(db, 'portal', chave);

const paraData = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

const paraPortal = (d: DocumentData): Portal => ({
  whatsapp: String(d.whatsapp ?? ''),
  nome: String(d.nome ?? ''),
  horarios: Object.entries((d.horarios ?? {}) as Record<string, DocumentData>)
    .map(([id, h]): HorarioPortal => ({
      id,
      inicio: paraData(h.inicio) ?? new Date(0),
      servico: String(h.servico ?? ''),
      servicoId: String(h.servicoId ?? ''),
      duracaoMin: Number(h.duracaoMin ?? 60),
      travas: Array.isArray(h.travas) ? h.travas.map(String) : [],
      ...(typeof h.serieId === 'string' ? { serieId: h.serieId } : {}),
    }))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime()),
  copiados: Array.isArray(d.copiados) ? d.copiados.map(String) : [],
});

/** Página pública: lê só o documento da chave deste aparelho (1 leitura). */
export function observarPortal(
  chave: string,
  aoMudar: (portal: Portal | null) => void,
  aoFalhar: (erro: Error) => void,
) {
  return onSnapshot(
    portal(chave),
    (snap) => aoMudar(snap.exists() ? paraPortal(snap.data()) : null),
    aoFalhar,
  );
}

/** App da dona: regrava a cópia (substitui os horários). Funciona offline. */
export function salvarPortal(chave: string, dados: Portal) {
  const horarios = Object.fromEntries(
    dados.horarios.map((h) => [
      h.id,
      {
        inicio: Timestamp.fromDate(h.inicio),
        servico: h.servico,
        servicoId: h.servicoId,
        duracaoMin: h.duracaoMin,
        travas: h.travas,
        ...(h.serieId ? { serieId: h.serieId } : {}),
      },
    ]),
  );
  gravarEmSegundoPlano(
    setDoc(portal(chave), {
      whatsapp: dados.whatsapp,
      nome: dados.nome,
      horarios,
      copiados: dados.copiados ?? [],
    }),
  );
}
