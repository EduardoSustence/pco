# Frontend — Pesquisa de Clima SUSTENCE

Protótipo funcional da Etapa 7, implementado com Next.js e TypeScript.

## Executar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Escopo atual

- Entrada por código anônimo com validação de formato.
- Tela de privacidade e tela separada de instruções.
- Questionário completo sincronizado com a Matriz Mestra da Etapa 5.
- 135 itens ativos: 63 PCO, 9 de diversidade, 29 SUSTENCE, 16 demográficos e 18 socioeconômicos.
- Suporte a Likert de cinco pontos, escala 0–10, listas de seleção e textos de até 2.000 caracteres.
- Tratamento de perguntas obrigatórias, opcionais, sensíveis e com opção `Não se aplica`.
- Revisão por seção e confirmação de envio.
- Tela de conclusão.
- Demonstração do dashboard administrativo agregado, incluindo eNPS.
- Layout responsivo e navegação por teclado.

Nesta fase, o modo demonstração valida o fluxo pelas rotas locais sem persistir respostas. A conexão real é ativada pelas variáveis de ambiente descritas abaixo.

## Integração de backend

As rotas de servidor já estão implementadas:

- `POST /api/survey/access`
- `GET /api/survey/questions`
- `PUT /api/survey/draft`
- `POST /api/survey/submit`

Sem configuração, elas funcionam em modo demonstração. Para conectar o Supabase, copie `.env.example` para `.env.local`, preencha os valores e defina `SURVEY_DEMO_MODE=false`. A chave do Supabase fica somente no servidor e não utiliza o prefixo `NEXT_PUBLIC_`.
