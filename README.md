
## Portal público ForgeLab Studio

Esta entrega também inclui um portal público independente em `public/`:
- `/` — página de apresentação com descrição dos módulos Career Intelligence, GitHub Intelligence e Hackmind, fluxo de uso, princípios de transparência, condições de acesso e garantia de 7 dias solicitada pelo proprietário.
- `/login` — tela de entrada de usuários (a autenticação de contas ainda precisa ser conectada ao backend de usuários/licenças).
- `/admin` — rota administrativa protegida; não existe link para ela na apresentação pública. Sem credenciais e segredo configurados, o acesso é negado.
- `/admin/login` — tela de autenticação administrativa, acessível diretamente pelo caminho administrativo.

### Configuração do administrador no Vercel
Cadastre em **Settings → Environment Variables**:

```env
ADMIN_EMAIL=seu-email-administrativo
ADMIN_PASSWORD=uma-senha-forte-e-unica
ADMIN_SESSION_SECRET=um-segredo-aleatorio-com-pelo-menos-32-caracteres
```

Use valores próprios, não os exemplos. Depois de salvar as variáveis, faça um novo deploy. O painel é uma base autenticada; gestão de clientes, pagamentos, planos, pedidos e relatórios ainda precisa ser ligada ao banco e aos serviços comerciais reais.

O `vercel.json` da raiz configura a apresentação como saída estática e encaminha as rotas administrativas para a função `api/admin.js`. Veja `docs/PORTAL-PUBLICO-E-ADMIN.md`.
