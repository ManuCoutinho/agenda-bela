# Agenda Bela

PWA de agenda para uma manicure: área dela (login Google) e página pública `/agendar/:slug` onde clientes pedem horário. Sem servidor próprio: Firebase (Auth, Firestore, Hosting) no plano Spark, sem Cloud Functions.

- Plano, status e próximos passos: `docs/plano-execucao.md` (fora do Git). Fluxo kanban: leia a seção "Quadro (kanban)" antes de começar e siga a ordem de "A fazer".
- Requisitos (RF/RNF/RN/HU), modelo de dados e decisões: _Guia técnico – Agenda Bela_ (documento externo; o plano resume).

## Comandos

Gerenciador: **pnpm** (não usar npm/yarn para dependências do projeto).

```bash
pnpm dev            # http://localhost:5173
pnpm lint
pnpm test           # domínio e telas (Vitest, jsdom)
pnpm test:regras    # firestore.rules no emulador (precisa de Java 21 e firebase CLI)
pnpm build
firebase deploy --only firestore   # regras: deploy manual, nunca pelo CI
```

## Ambiente (WSL)

- Node via nvm; o Firebase CLI está instalado no Node 22.14.0. Em shells não interativos, rode `source ~/.nvm/nvm.sh && nvm use 22.14.0` antes de `pnpm`/`firebase`.
- Firebase CLI logado em `espacojuju.unhas@gmail.com`; projeto `agenda-bela-bb595` (`.firebaserc`).
- `.env.local` (fora do Git) já tem a configuração `VITE_FIREBASE_*`. `VITE_USAR_EMULADOR=true` aponta o app para o emulador.

## Git

- Commits assinados só pela usuária (identidade do `git config`): sem `Co-Authored-By` nem outra menção ao Claude em commits e PRs.
- Não usar `gh`. Git só pela CLI padrão; PR e merge pelo site do GitHub.
- Push por SSH (o  tem pushurl ); o Claude envia a branch e entrega título/descrição do PR para a usuária abrir no site.
- `main` protegida: branch por história (`feat/rf02-clientes`), Conventional Commits citando o requisito (`feat(RF02): …`), PR com o check `verificar`.
- CI (`.github/workflows/ci.yml`): `verificar` (lint → test → test:regras → build) → `previa` em PR / `producao` na `main`.

## Arquitetura

Dependências só apontam para baixo:

1. `src/paginas/` – telas e rotas; não acessam o Firebase.
2. `src/componentes/` – visuais, recebem props, não buscam dados.
3. `src/hooks/` – ligam telas aos dados (`useAuth`, …).
4. `src/servicos/` – único lugar que importa `firebase/*`.
5. `src/dominio/` – regras puras, sem React nem Firebase.

Testes ao lado do arquivo (`.test.ts(x)`); testes de regras em `testes/regras/`.

## Convenções

- Domínio em inglês (`Agendamento`, `travas`, `horariosLivres`); convenções do ecossistema em inglês (`use…`, `on…`).
- Datas: fuso `America/Sao_Paulo`, `date-fns` + `@date-fns/tz` com `ptBR`; IDs de trava `AAAA-MM-DD_HHmm`.
- Calendário: FullCalendar 6.1 (MIT) só em `src/componentes/Calendario.tsx`; roda em UTC com a hora de parede de São Paulo (conversões em `src/dominio/calendario.ts`). A aba Agenda é carregada sob demanda (`lazy`).
- Mensagens à usuária dizem o que fazer, sem códigos técnicos. Sem `console.log`.
- Acessibilidade: alvos ≥ 48 px (`min-h-12`, padrão do Android), texto ≥ 16 px (mesmo onde o Material usa 12–14), rótulo em todo campo, contraste 4,5:1.
- Visual de app Android (Material 3), 1 dp = 1 px CSS: tela = `BarraSuperior` (64 dp, seta de voltar) + conteúdo com 16 dp nas laterais + `Fab` para a ação principal + `BarraInferior` (80 dp); confirmações pelo snackbar `Aviso`. Use as classes de `src/componentes/estilos.ts` (`ESTILO_BOTAO`, `ESTILO_CAMPO` 56 dp, `ESTILO_LISTA`/`ESTILO_ITEM_LISTA`) e os ícones de `Icone.tsx`; espaçamento em múltiplos de 4/8 dp; tipografia `text-titulo`/`text-secao`; fonte do sistema (Roboto).
- Cores só pelos tokens do `@theme` em `src/index.css` (paleta do Espaço Juju): `marca`, `marca-escura`, `marca-suave`, `marca-decorativa` (só enfeite, nunca texto), `fundo`, `superficie`, `container` (barra de navegação), `texto`, `texto-suave`, `borda`, `borda-campo`, `erro` e os estados `marcado`, `livre`, `bloqueado`, `pendente`. O ESLint recusa a paleta padrão do Tailwind (`text-gray-700`, `bg-white`, `[#hex]`). Combinação nova de cores entra em `PARES` de `src/tema.test.ts`, que confere o contraste AA.
- Toda mudança em `firestore.rules` vem com teste em `testes/regras/`.
- Versões fixadas: TypeScript ~6.0 e ESLint 9 (typescript-eslint e jsx-a11y ainda não suportam TS 7 / ESLint 10).
- Vitest: em `beforeEach`, use chaves – uma função retornada vira rotina de limpeza.
