# PUEDES?

PUEDES? é um jogo web multiplayer de palavras e dedução social em tempo real. Acesso instantâneo pelo navegador, sem necessidade de cadastro, com salas públicas e privadas, modo estritamente sequencial, chat ao vivo e ranking em tempo real.

---

## Recursos e Funcionalidades

- **Modo 100% Sequencial:** Cada jogador dá sua dica na sua vez, com ordem sorteada aleatoriamente a cada rodada.
- **Distribuição Criptográfica Segura:** Sorteio de impostores via `crypto.randomInt` alternando entre jogadores (evita repetições consecutivas).
- **Zero-Knowledge Security:** O servidor nunca expõe a identidade do impostor, a palavra rival ou o par de palavras aos clientes antes do encerramento da rodada.
- **Salas Públicas e Privadas:** Lista de salas públicas na tela inicial com atualização em tempo real ou salas privadas com entrada via link direto.
- **Controle Estrito de Impostores:** Impostores são rigorosamente mantidos em minoria (máximo 1 impostor para 3 ou 4 jogadores; até 2 para 5 ou 6; até 3 para 7+).
- **Filtro de Conteúdo e Moderação:** Censura em tempo real para termos ofensivos, discriminatórios ou +18 em nicknames, dicas e no chat.
- **Design Minimalista e Geométrico:** Interface sem gradientes ou efeitos exagerados, com paleta sólida (`#09090B`, `#121215`, acento `#EC4899`), bordas nítidas de 1px e zero emojis na interface (permitidos apenas nos avatares).
- **Pronto para Monetização:** 3 blocos de anúncio por página integrados com o Google AdSense (`ca-pub-7012680480559206`) com Cumulative Layout Shift (CLS) zero.

---

## Arquitetura do Projeto

```
puedes/
├── client/              # Frontend React + TypeScript + Vite + TailwindCSS
│   ├── public/          # Assets estáticos (puedes.png)
│   ├── src/             # Componentes, telas e hooks
│   ├── index.html       # Entrypoint HTML com Google AdSense e favicon
│   └── vite.config.ts   # Configuração do Vite e proxy Socket.IO
├── server/              # Backend Node.js + Express + Socket.IO
│   ├── data/            # Banco de palavras em JSON categorizadas
│   ├── utils/           # Módulos utilitários (censor.js)
│   └── index.js         # Servidor de jogo e WebSocket com rate limiting
└── package.json         # Gerenciamento unificado de scripts
```

---

## Como Executar Localmente

### Pré-requisitos
- Node.js versão 18 ou superior.

### 1. Instalar Dependências
```bash
npm run install:all
```
*Este comando instala automaticamente as dependências da raiz, do servidor e do cliente.*

### 2. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

### 3. Executar em Modo de Produção
```bash
npm run build
npm start
```
- Acesse `http://localhost:3001` (o Express serve o frontend compilado e o WebSocket na mesma porta).

---

## Como Publicar no GitHub

1. Inicialize o repositório Git na raiz do projeto (caso ainda não esteja inicializado):
```bash
git init
git add .
git commit -m "feat: lancamento inicial do PUEDES?"
```

2. Crie um repositório no seu GitHub (ex.: `puedes`).

3. Conecte e envie para o GitHub:
```bash
git remote add origin https://github.com/SEU-USUARIO/puedes.git
git branch -M main
git push -u origin main
```

---

## Como Publicar na Internet (Hospedagem Gratuita / Cloud)

O projeto foi arquitetado em modo **serviço único** (`single-server`): em produção, o servidor Node.js Express entrega os arquivos compilados do React e gerencia os WebSockets na mesma porta. Isso permite hospedar o jogo inteiro com **1 clique** em qualquer plataforma.

### Opção Recomendada: Render (render.com)
1. Crie uma conta gratuita no [Render](https://render.com).
2. Clique em **New +** e selecione **Web Service**.
3. Conecte seu repositório do GitHub (`puedes`).
4. Configure os campos:
   - **Name:** `puedes` (ou o nome que preferir)
   - **Environment:** `Node`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Clique em **Create Web Service**.
6. Pronto! Em instantes seu jogo estará online com HTTPS gratuito e WebSocket ativo.

### Outras Opções Compatíveis
- **Railway (railway.app):** Detecta automaticamente o Node.js e executa `npm run build` e `npm start`.
- **Fly.io:** Suporta WebSockets em tempo real de baixa latência.
- **VPS (Ubuntu / DigitalOcean / Hetzner):** Clone o repositório, execute `npm run install:all`, `npm run build` e rode com PM2 (`pm2 start server/index.js --name puedes`).

---

## Configuração do Google AdSense

O código já possui a tag do seu publisher ID: `ca-pub-7012680480559206`.

> **Importante sobre os anúncios:**
> O Google AdSense **não exibe anúncios em `localhost` nem em IPs locais**. Os anúncios só serão renderizados após o site ser publicado na internet com um domínio registrado e aprovado no painel do Google AdSense (**Sites** > **Adicionar site**). Enquanto isso, o layout exibe blocos discretos com dimensões reservadas para garantir estabilidade visual.

---

## Licença

Projeto desenvolvido para diversão entre amigos e grupos. Todos os direitos reservados.
