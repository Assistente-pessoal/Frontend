# Synapse — Integração de login/cadastro (Etapa 2)

## O que foi alterado

- `src/components/auth-screen.tsx`: interface de login/cadastro, integrada aos temas do Synapse, responsiva e com mensagens de validação.
- `src/context/auth-session.tsx`: estado global de autenticação, recuperação de sessão, logout e proteção da área privada.
- `src/services/auth-api.ts`: contrato real da Agenda API autenticada.
- `src/services/auth-token.ts` e `auth-token.web.ts`: armazenamento seguro de token no Android/iOS; token somente em memória no navegador.
- `src/app/_layout.tsx`: tela de login quando não autenticado; área do Synapse somente com sessão validada.
- `src/services/vox-api.ts`: envio automático de `Authorization: Bearer ...` em `POST /api/vox/transcriptions`; HTTP 401 encerra a sessão local.
- `src/app/settings.tsx`: nome/e-mail do usuário e botão para sair, com confirmação no Android.
- `src/services/vox-notifications*`: limpa notificações agendadas e exibidas ao sair para proteger dados de outras contas no mesmo aparelho.
- `package.json`, `package-lock.json`, `app.json`: adiciona `expo-secure-store` compatível com SDK 57.

## Pré-requisitos

1. Publicar/executar o **backend da Etapa 2**, com as rotas POST `/users`, POST `/auth/login`, GET `/auth/me`, POST `/auth/logout` e POST `/api/vox/transcriptions` protegido. A versão anterior do backend com `permitAll()` e sem `/auth/login` não serve para este frontend.
2. Configurar o MongoDB no backend. O microserviço de interpretação continua igual.
3. Certificar-se de que o endereço apontado em `EXPO_PUBLIC_API_URL` refere-se ao backend atualizado. O valor padrão configurado no frontend ainda é `https://vox-backend-latest.onrender.com`; atualize essa hospedagem ou substitua a URL antes dos testes.

## Instalação e teste

```bash
npm install
npx expo install --check
npx tsc --noEmit
npx expo start -c
```

**O novo módulo é nativo**: gere novo APK/development build para validar no Android. Um APK antigo não recebe automaticamente `expo-secure-store`.

```bash
npx eas build --platform android --profile preview
```

Mantenha o `owner`, `slug` e `extra.eas.projectId` em `app.json` e as credenciais de assinatura existentes. Não coloque credenciais no repositório nem em `EXPO_PUBLIC_*`.

> Observação: o ambiente que gerou este pacote não conseguiu acessar o registro npm. Por isso não foi possível executar `npm install`, `tsc --noEmit` com as dependências reais, nem construir/testar o APK. A sintaxe dos arquivos TypeScript/TSX foi validada. O lockfile contém a versão fixada de `expo-secure-store`, mas a primeira instalação com internet poderá normalizar seus metadados.

## Endpoints consumidos

| Operação | Método e rota | JSON ou cabeçalho |
| --- | --- | --- |
| Cadastro | POST `/users` | `{ "name": "Pessoa", "email": "pessoa@exemplo.com", "password": "senha-com-10-ou-mais" }` |
| Login | POST `/auth/login` | `{ "email": "...", "password": "..." }` |
| Validar sessão | GET `/auth/me` | `Authorization: Bearer <token>` |
| Salvar lembrete VOX | POST `/api/vox/transcriptions` | `Authorization: Bearer <token>`, `{ "text": "..." }` |
| Logout | POST `/auth/logout` | `Authorization: Bearer <token>` |
| Health | GET `/api/vox/health` | Público, sem token |

O frontend não envia `ownerId`, não grava senha e não persiste resposta de perfil nem dados de lembretes localmente. O servidor usa a sessão para identificar o proprietário.

## Comportamento esperado

1. Primeira abertura: login e cadastro antes das abas do Synapse.
2. Criar conta: cadastro seguido de login automático.
3. Com login válido, Início, Lembretes, Como usar e Configurações permanecem com o layout anterior.
4. Navegar entre Início e Lembretes mantém o compositor, como na versão estável.
5. Reiniciar o APK: o token é recuperado via `expo-secure-store` e verificado com `/auth/me` antes de exibir informações privadas.
6. HTTP 401 na criação de um lembrete: remove sessão e volta ao login.
7. Logout: limpa a sessão local, pede revogação no backend e cancela **todas as notificações locais do Synapse neste aparelho**. Elas ainda não são reagendadas automaticamente após um novo login; isso depende da futura sincronização/histórico da Etapa 3/6.
8. No navegador, o token é deliberadamente mantido somente em memória (a sessão é perdida ao recarregar); não há armazenamento seguro equivalente ao Android nesse frontend.

## Checklist de validação em dispositivo

- [ ] Backend atualizado e MongoDB em funcionamento.
- [ ] Criar conta válida; recusar e-mail duplicado e senha inválida.
- [ ] Entrar com senha certa e errada; validar mensagens.
- [ ] Salvar lembrete digitado e ditado com Authorization.
- [ ] Fechar/reabrir aplicativo e confirmar restauração da sessão.
- [ ] Encerrar sessão em Configurações, confirmar retorno ao login e limpeza dos alertas locais.
- [ ] Tentar reutilizar token de logout: o backend deve responder 401.
- [ ] Testar login com contas A e B: nenhuma deve obter dados da outra no backend.
- [ ] Verificar modo OLED, cores de destaque, fontes, TalkBack, teclado aberto e dispositivos pequenos.
- [ ] Validar funcionamento do microfone/notificações em APK atualizado.

## Limitações intencionais

- A página Lembretes segue mostrando somente o último item da sessão. Listagem e sincronização completas pertencem à próxima etapa.
- Recuperação de senha, rate limiting do servidor e migração segura dos lembretes legados ainda não fazem parte desta mudança.
- Não foi feito teste end-to-end contra produção nem validação em hardware; execute os testes antes de lançar para usuários.
