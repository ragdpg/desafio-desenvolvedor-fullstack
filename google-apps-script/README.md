# Lista de confirmações no Google Sheets

O script adiciona cada convidado em uma linha da planilha e envia um e-mail para `ragdpg@gmail.com` a cada nova resposta.

## Ativação

1. Crie uma planilha vazia no Google Sheets.
2. Na planilha, abra **Extensões → Apps Script**.
3. Substitua o conteúdo de `Code.gs` pelo conteúdo deste diretório.
4. Clique em **Implantar → Nova implantação**.
5. Em **Tipo**, escolha **App da Web**.
6. Configure:
   - **Executar como:** Eu;
   - **Quem pode acessar:** Qualquer pessoa.
7. Autorize o envio de e-mails e copie a URL terminada em `/exec`.
8. No arquivo `script.js` do convite, cole essa URL em `CONFIG.appsScriptUrl`.

Na primeira confirmação, a aba **Confirmações** será criada automaticamente com a lista acumulada.
