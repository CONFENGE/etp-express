# ETP Express - Frontend

Interface web moderna para o sistema de elaboração de Estudos Técnicos Preliminares assistido por IA.

## Tecnologias

- **React 18** - Biblioteca UI
- **TypeScript** - Type safety
- **Vite** - Build tool e dev server
- **React Router** - Roteamento
- **Zustand** - State management
- **React Hook Form** - Formulários
- **Zod** - Validação de schemas
- **Tailwind CSS** - Estilização
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones

## Estrutura

```
src/
├── components/         # Componentes React
│   ├── ui/            # Componentes base (shadcn/ui)
│   ├── layout/        # Layout components
│   ├── etp/           # Componentes específicos de ETP
│   ├── common/        # Componentes compartilhados
│   └── search/        # Componentes de busca
├── pages/             # Páginas/rotas
├── store/             # Zustand stores
├── hooks/             # React hooks customizados
├── lib/               # Utilitários e configurações
├── types/             # TypeScript types
└── main.tsx           # Entry point
```

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

O frontend estará disponível em http://localhost:5173

## Build

```bash
npm run build
```

## Features

### Autenticação
- Login/Registro com JWT
- Protected routes
- Auto-logout em caso de token expirado

### Dashboard
- Visão geral dos ETPs
- Estatísticas (total, em progresso, concluídos)
- ETPs recentes

### Editor de ETP
- 13 seções (I-XIII)
- Indicadores de seções obrigatórias
- Progress bar de completude
- Tabs para navegação entre seções
- Auto-save
- Geração de conteúdo com IA
- Busca de contratações similares

### UX/UI
- Design responsivo (mobile-first)
- Tema claro/escuro
- Microinterações suaves
- Loading states elegantes
- Toast notifications
- Error boundaries

### Acessibilidade
- WCAG 2.1 AA compliant
- ARIA labels
- Navegação por teclado
- Focus visible
- Contraste adequado

### Safety Features
- Warning banner persistente em todas as páginas
- Avisos em sugestões de IA
- Tooltips explicativos
- Validação em tempo real
- Confirmações antes de ações destrutivas

## Arquitetura

### State Management

- **authStore**: Autenticação e usuário
- **etpStore**: ETPs e operações
- **uiStore**: Estado da UI (toasts, modals, loading)

### Roteamento

- `/login` - Login
- `/register` - Registro
- `/dashboard` - Dashboard principal
- `/etps` - Lista de ETPs
- `/etps/:id` - Editor de ETP

### API Integration

Todas as requisições passam por `src/lib/api.ts` que:
- Adiciona JWT token automaticamente
- Trata erros globalmente
- Redireciona para login se 401

## Variáveis de Ambiente

Criar arquivo `.env` baseado em `.env.example`:

```
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=ETP Express
```

## Componentes Principais

### WarningBanner
Banner amarelo sticky no topo de TODAS as páginas com aviso sobre verificação de conteúdo gerado por IA.

### ETPEditor
Editor principal com tabs para as 13 seções, painel de IA lateral, e ferramentas de exportação.

### AIGenerationPanel
Painel lateral que exibe sugestões da IA, com avisos de revisão crítica.

### SectionForm
Formulário dinâmico baseado nos templates de cada seção.

## Padrões de Código

- Functional components com hooks
- TypeScript strict mode
- Props validation com TypeScript
- Componentes composáveis e reutilizáveis
- Separation of concerns
- Custom hooks para lógica compartilhada

## Lint

```bash
npm run lint
```

## Performance

- Code splitting por rota
- Lazy loading de componentes
- Memoization onde necessário
- Debounce em buscas
- Optimistic updates
