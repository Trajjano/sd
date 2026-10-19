# Publicar o SEM DEFESA na internet

São duas peças:

- **Supabase** (grátis): o banco que guarda as salas e os votos do modo online.
- **Vercel** (grátis): hospeda o site do jogo com HTTPS, o que também libera "instalar como app" e o modo offline.

Tempo estimado: 15 a 20 minutos. O modo "um celular só" funciona mesmo sem o Supabase.

---

## 1. Criar o banco no Supabase

1. Entre em <https://supabase.com>, crie uma conta e clique em **New project**.
2. Dê um nome (ex.: `sem-defesa`), crie uma senha para o banco (guarde, mas o jogo não usa) e escolha a região **South America (São Paulo)**. Clique em **Create new project** e espere ficar pronto.
3. No menu da esquerda, abra **SQL Editor** → **New query**.
4. Abra o arquivo `supabase/schema.sql` do projeto, copie **tudo**, cole no editor e clique em **Run**. Deve aparecer "Success. No rows returned".
   - Pode rodar de novo quando atualizar o jogo: o script recria as funções sem apagar nada.
5. Pegue os dois dados de conexão: clique no botão **Connect** no topo do painel (ou **Project Settings → API Keys**) e copie:
   - a **Project URL** (algo como `https://abcdefgh.supabase.co`);
   - a **Publishable key** (começa com `sb_publishable_`). Em projetos antigos, use a chave **anon**.

> Essas duas informações são públicas por natureza (vão dentro do site). Quem protege os votos são as regras do banco que o `schema.sql` criou: o navegador não consegue ler a tabela de votos nem alterar nada sem passar pelas funções do jogo.
> **Nunca** use a chave `secret` / `service_role` no site.

## 2. Testar no seu computador (opcional, recomendado)

1. Na pasta do projeto, copie `.env.example` para `.env.local` e preencha:
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
2. Rode `npm install` (só na primeira vez) e `npm run dev`.
3. No terminal aparece um endereço **Network** (ex.: `http://192.168.0.10:5173`). Abra esse endereço em 2 ou 3 celulares conectados no mesmo Wi-Fi, crie uma sala em um e entre pelo código nos outros.

Sem Supabase ainda? `npm run servidor:local` liga um servidor de teste no seu PC (os dados somem ao fechar). Depois rode o app com `VITE_SUPABASE_URL=http://SEU-IP:54321 VITE_SUPABASE_PUBLISHABLE_KEY=local npm run dev`.

## 3. Publicar na Vercel

Escolha **um** dos caminhos.

### Caminho A — pelo terminal (sem GitHub)

```bash
npm install -g vercel     # instala a ferramenta da Vercel
vercel login              # entra na sua conta (abre o navegador)
vercel                    # dentro da pasta do projeto; aceite as respostas padrão
```

Depois, cadastre as duas variáveis (cole o valor quando ele pedir):

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
vercel --prod             # publica a versão final já com as variáveis
```

### Caminho B — pelo GitHub

1. Suba a pasta do projeto para um repositório no GitHub (o `.gitignore` já deixa de fora `node_modules` e o `.env.local`).
2. Em <https://vercel.com> → **Add New… → Project** → importe o repositório.
3. A Vercel reconhece o Vite sozinha. Antes de clicar em **Deploy**, abra **Environment Variables** e adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Clique em **Deploy**. A cada `git push` na branch principal, o site atualiza sozinho.

> As variáveis entram no site na hora do build. Se você adicionar ou mudar uma variável depois, publique de novo (`vercel --prod` ou **Redeploy** no painel).

No fim, você recebe um endereço como `https://sem-defesa.vercel.app`. Dá pra trocar por um domínio próprio em **Settings → Domains**.

## 4. Conferir se está tudo certo

1. Abra o endereço no celular → **Começar partida** → **Cada um no seu celular** → crie uma sala.
2. Em outro celular, aponte a câmera para o QR code (ou use **Entrar numa sala** com o código).
3. Com 3 pessoas na sala, quem criou toca em **Começar**.
4. O indicador "online" no topo mostra uma bolinha **verde** quando o tempo real está ligado. Se ficar **amarela**, o jogo funciona do mesmo jeito, só atualiza a cada 2 segundos. Para deixar verde, confira no Supabase em **Database → Publications → supabase_realtime** se a tabela `rooms` está marcada.
5. No Chrome do Android aparece "Instalar app"; no iPhone, use **Compartilhar → Adicionar à Tela de Início**.

## Bom saber

- Salas sem atividade por 24 horas são apagadas automaticamente.
- No plano grátis, o Supabase pode pausar o projeto depois de um tempo sem uso. Se o modo online parar de funcionar, entre no painel e clique em **Restore/Resume**.
- Para mudar perguntas, edite `src/data/questions/` e publique de novo. Para mudar regras do servidor, edite `supabase/schema.sql` e rode-o de novo no SQL Editor.
