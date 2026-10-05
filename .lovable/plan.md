# Duas alterações: 5 integrantes e remoção da planilha de boletins

## 1. Até 5 integrantes no trabalho ABNT
- Formulário do trabalho ABNT passa a ter 5 campos de integrante (hoje são 4), iguais aos atuais.
- Rótulo "Integrantes (até 4)" vira "Integrantes (até 5)".
- A capa e a folha de rosto do .docx já listam todos os nomes preenchidos, então o 5º aparece automaticamente; trabalhos com 1–4 nomes continuam iguais.
- Não há limite de 4 no servidor nem no banco de dados (os trabalhos não são salvos lá) — nada a mudar nessas partes.

## 2. Remover a seção de boletins (planilha de notas)
- A página inicial hoje é o gerador de planilha de notas/boletim. Ela será removida.
- O endereço inicial passa a mostrar o gerador de trabalho ABNT (redirecionando para a página do trabalho), para o site não ficar com página vazia.
- Item "planilha" sai do menu; o logo "Notamín · v.1" passa a levar ao trabalho ABNT.
- Descrições do site (aba/compartilhamento) que falam de "planilha de notas" passam a descrever o gerador de trabalho ABNT.
- A biblioteca de Excel, usada só pela planilha, é removida.

Nada mais muda: layout, estilo, cota gratuita, página de upgrade e dados ficam como estão.

## Detalhes técnicos
- `src/routes/abnt.tsx`: estado inicial com 5 strings; label "(até 5)".
- `src/routes/index.tsx`: substituir por rota com `beforeLoad` → `redirect({ to: "/abnt" })`.
- `src/components/SiteNav.tsx`: remover link "planilha"; logo aponta para `/abnt`.
- `src/routes/__root.tsx`: atualizar description/og/twitter.
- `bun remove xlsx`.
