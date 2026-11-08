# Portal público e acesso administrativo

## Páginas públicas
- `/` — apresentação do ForgeLab Studio, com descrição dos módulos, fluxo de uso, princípios de transparência, condições de acesso e garantia solicitada de 7 dias.
- `/login` — entrada de usuários. A interface está pronta, mas a autenticação de usuários precisa ser conectada ao serviço de contas/licenças.

A navegação pública contém somente a marca, o link Entrar e o CTA para conhecer o produto. Não há link para administração.

## Área administrativa
- `/admin/login` — formulário de autenticação administrativa; não aparece na navegação pública.
- `/admin` — painel protegido por cookie HttpOnly assinado no servidor.

Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET` no ambiente do Vercel. `ADMIN_SESSION_SECRET` deve ter pelo menos 32 caracteres aleatórios. Não use valores de exemplo em produção. Sem as três variáveis, o painel permanece inacessível.

O painel é uma base protegida, não um sistema completo de gestão comercial. Gestão de usuários, pedidos, pagamentos, planos e logs ainda depende de backend e banco de dados reais.

## Garantia de 7 dias
A página informa a garantia solicitada pelo proprietário, condicionada às regras e ao canal de atendimento que devem ser publicados no checkout/termos de compra. Configure o processo real de reembolso antes de vender.

## Deploy
O `vercel.json` encaminha `/admin` e `/admin/login` para a função `api/admin.js`, serve `/login` como página de login e a apresentação na raiz. O restante do monorepo original foi preservado.
