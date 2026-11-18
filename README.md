# Agenda Bela

PWA de agenda para uma manicure (Espaço Juju). Ela entra com a conta Google e cuida de atendimentos, clientes, serviços, bloqueios e pedidos; as clientes pedem horário por uma página pública, sem login, em `/agendar/<slug>`.

Não há servidor próprio: tudo roda no Firebase (Auth, Firestore e Hosting) no plano gratuito Spark, sem Cloud Functions.

Produção: https://agenda-bela-bb595.web.app

## O que o app faz

**Área da manicure** (login Google, só a conta dona lê e grava):

- **Hoje:** atendimentos do dia, pedidos da página pública para aprovar ou recusar (com mensagem pronta no WhatsApp, troca de horário quando a cliente já tem um marcado e aprovação com sinal pelo Pix) e aviso dos lembretes de amanhã.
- **Agenda:** calendário do mês com pontos nos dias ocupados e a lista do dia; marcar, editar e cancelar atendimento.
- **Clientes:** cadastro com autorização LGPD, busca e importação dos contatos do celular (Contact Picker no Chrome do Android ou arquivo .vcf).
- **Mais:** serviços, configurações (expediente, intervalo, antecedência, link público, chave Pix), bloqueios pontuais e recorrentes (com aviso de conflito e pausa da página pública), painel do mês (realizado/falta), lembretes e instalação do app.
- Funciona offline com o cache do Firestore; notificação às 18h quando há atendimento no dia seguinte.

**Página pública** (`/agendar/<slug>`): a cliente escolhe serviço, dia e horário livre e envia o pedido. O horário fica reservado por travas até a manicure responder (expira em 24 h).

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
| `UID_MANICURE`            | UID da conta dona; entra nas regras do Firestore quando elas são geradas. |
| `VITE_USAR_EMULADOR=true` | Aponta o app para o emulador local em vez do Firebase real.               |

## Comandos

| Comando             | O que faz                                              |
| ------------------- | ------------------------------------------------------ |
| `pnpm dev`          | Servidor de desenvolvimento.                           |
| `pnpm lint`         | ESLint (inclui a trava contra cores fora do tema).     |
| `pnpm test`         | Testes de domínio e telas (Vitest, jsdom).             |
| `pnpm test:regras`  | Testes do `firestore.rules` no emulador.               |
| `pnpm build`        | Checagem de tipos e build de produção em `dist/`.      |
| `pnpm regras:gerar` | Gera `.firebase/firestore.rules` com o `UID_MANICURE`. |

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

| Caminho                                                    | Quem acessa                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `config/publico`                                           | Leitura pública: nome, link, expediente, serviços, pausa.   |
| `config/pagamento`, `config/notificacoes`, `config/acesso` | Só a dona.                                                  |
| `clientes`, `agendamentos`, `bloqueios`                    | Só a dona.                                                  |
| `pedidos`                                                  | A cliente cria (campos validados); só a dona lê e responde. |
| `travas` (`AAAA-MM-DD_HHmm`)                               | Impedem dois pedidos no mesmo horário.                      |

O UID da dona não fica no Git: `firestore.rules` tem o marcador `__UID_DA_MANICURE__`, trocado por `scripts/gerar-regras.mjs` antes do deploy. Trocar a dona é mudar `UID_MANICURE` e publicar as regras.

## Deploy

- **Hosting:** pelo GitHub Actions (`.github/workflows/ci.yml`). Em todo PR o job `verificar` roda lint, testes, testes de regras e build, e publica uma prévia; o merge na `main` publica em produção.
- **Regras do Firestore:** manual, nunca pelo CI: `firebase deploy --only firestore`.
- **Lembretes:** `.github/workflows/lembretes.yml` roda às 21:00 UTC (18h em São Paulo) e envia push pelo Cloud Messaging se houver atendimento no dia seguinte. Se o repositório passar 60 dias sem commits, o GitHub pausa o agendamento e é preciso reativá-lo em Actions.

## Contribuição

`main` protegida: uma branch por história, Conventional Commits citando o requisito (`feat(RF02): …`) e PR com o check `verificar` verde. Convenções de código, visual (Material 3) e acessibilidade em [`CLAUDE.md`](CLAUDE.md).
