# Agenda Bela

PWA de agenda para uma manicure (Espaço Juju). Ela entra com a conta Google e cuida de atendimentos, clientes, serviços, bloqueios e pedidos; as clientes pedem horário por uma página pública, sem login, em `/agendar/<slug>`.

Não há servidor próprio: tudo roda no Firebase (Auth, Firestore e Hosting) no plano gratuito Spark, sem Cloud Functions.

Produção: https://agenda-bela-bb595.web.app

## O que o app faz

**Área da manicure** (login Google, só a conta dona lê e grava):

- **Hoje:** atendimentos do dia; fila de avisos no WhatsApp para os horários que as clientes marcaram, trocaram ou fixaram (a fila sobrevive a recarregar); pedidos de cancelamento para aprovar ou recusar; aviso dos lembretes de amanhã.
- **Agenda:** calendário do mês com pontos nos dias ocupados e a lista do dia; marcar, editar e cancelar atendimento; no atendimento, enviar a confirmação, pedir o sinal pelo Pix e encerrar um horário fixo.
- **Clientes:** cadastro com autorização LGPD, próximo horário de cada uma, busca e importação dos contatos do celular (Contact Picker no Chrome do Android ou arquivo .vcf).
- **Mais:** serviços, configurações (expediente, intervalo, antecedência, link público, Instagram, chave Pix), agenda aberta (quais meses as clientes podem marcar), bloqueios pontuais e recorrentes (com aviso de conflito e pausa da página pública), painel do mês (realizado/falta), lembretes e instalação do app.
- Funciona offline com o cache do Firestore; notificação às 18h quando há atendimento no dia seguinte.

**Página pública** (`/agendar/<slug>`): a cliente começa pelo WhatsApp, escolhe serviço, dia no calendário do mês (só meses abertos; dias sem horário apagados) e hora cheia. O horário fica confirmado na hora, sem esperar a manicure. Ela pode pedir horário fixo (toda semana, a cada 2 ou 4 semanas: as datas que estiverem ocupadas ficam de fora e aparecem na confirmação) e salvar na agenda do celular. No mesmo celular, "Meus horários" mostra os próximos atendimentos, com remarcar na hora e pedir cancelamento (só com 24 h ou mais de antecedência).

## Tecnologias

React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · vite-plugin-pwa · React Router 7 · React Hook Form + Zod · date-fns 4 com `@date-fns/tz` (fuso `America/Sao_Paulo`) · react-day-picker · Firebase 13 · Vitest + Testing Library · `@firebase/rules-unit-testing`.

## Como rodar

Pré-requisitos: Node 22 (`.nvmrc`), pnpm, e para os testes de regras o Java 21 e o Firebase CLI.

```bash
pnpm install
cp .env.example .env.local   # preencha com a configuração do app Web do Firebase
pnpm dev                     # http://localhost:5173
```

Variáveis do `.env.local`:

| Variável                  | Para quê                                                                  |
| ------------------------- | ------------------------------------------------------------------------- |
| `VITE_FIREBASE_*`         | Configuração do app Web (console do Firebase → Configurações do projeto). |
| `UID_OWNER`               | UID da conta dona; entra nas regras do Firestore quando elas são geradas. |
| `VITE_USAR_EMULADOR=true` | Aponta o app para o emulador local em vez do Firebase real.               |

## Comandos

| Comando             | O que faz                                           |
| ------------------- | --------------------------------------------------- |
| `pnpm dev`          | Servidor de desenvolvimento.                        |
| `pnpm lint`         | ESLint (inclui a trava contra cores fora do tema).  |
| `pnpm test`         | Testes de domínio e telas (Vitest, jsdom).          |
| `pnpm test:regras`  | Testes do `firestore.rules` no emulador.            |
| `pnpm build`        | Checagem de tipos e build de produção em `dist/`.   |
| `pnpm regras:gerar` | Gera `.firebase/firestore.rules` com o `UID_OWNER`. |

## Estrutura

```
src/
  paginas/      telas e rotas (manicure/ e publica/); não acessam o Firebase
  componentes/  componentes visuais, recebem props
  hooks/        ligam as telas aos dados (useAuth, useAgenda, usePedidos…)
  servicos/     único lugar que importa firebase/*
  dominio/      regras puras (horários livres, travas, conflitos, painel…)
testes/regras/  testes do firestore.rules no emulador
scripts/        geração das regras e dos ícones, envio dos lembretes
```

As dependências só apontam para baixo (páginas → componentes/hooks → serviços → domínio). Os testes ficam ao lado de cada arquivo.

## Dados (Firestore)

| Caminho                                                                        | Quem acessa                                                                                                     |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `config/publico`                                                               | Leitura pública: nome, link, expediente, serviços, pausa, Instagram, meses abertos (`mesesAbertos`, AAAAMM).    |
| `config/pagamento`, `config/notificacoes`, `config/acesso`, `config/migracoes` | Só a dona.                                                                                                      |
| `clientes`, `agendamentos`, `bloqueios`                                        | Só a dona.                                                                                                      |
| `pedidos`                                                                      | A cliente cria já `confirmado` (campos validados, só em mês aberto); o app da dona converte em atendimento.     |
| `travas` (`AAAA-MM-DD_HH00`, uma por hora)                                     | Impedem dois horários no mesmo lugar; criadas no mesmo lote do pedido.                                          |
| `series`                                                                       | Horário fixo pedido pela cliente; a dona lê, reserva ao abrir um mês e encerra.                                 |
| `portal/{chave}`                                                               | "Meus horários": cópia resumida gravada pela dona; a cliente lê só pela chave guardada no celular (sem listar). |
| `solicitacoes`                                                                 | Pedidos de cancelamento da cliente, com 24 h ou mais; a dona aprova ou recusa.                                  |

O UID da dona não fica no Git: `firestore.rules` tem o marcador `__UID_DA_MANICURE__`, trocado por `scripts/gerar-regras.mjs` antes do deploy. Trocar a dona é mudar `UID_OWNER` e publicar as regras.

## Deploy

- **Hosting:** pelo GitHub Actions (`.github/workflows/ci.yml`). Em todo PR o job `verificar` roda lint, testes, testes de regras e build, e publica uma prévia; o merge na `main` publica em produção.
- **Regras do Firestore:** manual, nunca pelo CI: `firebase deploy --only firestore`.
- **Lembretes:** `.github/workflows/lembretes.yml` roda às 21:00 UTC (18h em São Paulo) e envia push pelo Cloud Messaging se houver atendimento no dia seguinte. Se o repositório passar 60 dias sem commits, o GitHub pausa o agendamento e é preciso reativá-lo em Actions.

## Contribuição

`main` protegida: uma branch por história, Conventional Commits citando o requisito (`feat(RF02): …`) e PR com o check `verificar` verde. Convenções de código, visual (Material 3) e acessibilidade em [`CLAUDE.md`](CLAUDE.md).
