# Synapse — Login e cadastro animados (frontend 30/10/2026)

## Alterações

- Tela de **Entrar** e **Criar conta**, integrada ao layout atual (`src/components/auth-screen.tsx`).
- Animações de apresentação, marca, troca de modo e botão, usando `Animated` nativo e a configuração **Configurações → Animações**. A preferência de reduzir movimento do Android também é respeitada.
- Validações de e-mail, nome, senha e confirmação; exibição de erros e estado de carregamento.
- Integração com o backend existente usando **Bearer token opaco**: `POST /users`, `POST /auth/login`, `GET /auth/me` e `POST /auth/logout`.
- No Android, o token é armazenado com `expo-secure-store`. No navegador, por segurança, fica **apenas em memória** (é preciso entrar novamente após recarregar).
- Rotas internas bloqueadas sem sessão; token enviado ao endpoint `POST /api/vox/transcriptions`; resposta `401` encerra a sessão local.
- Opção **Sair da conta** em Configurações. Ao sair, limpa o estado temporário e cancela notificações locais agendadas no Synapse.
- Preservados a navegação original, o menu lateral, os gestos existentes, as configurações, o microfone, o `.github/workflows/build-android.yml` e o projeto Expo **@ssasuru/synapse-build**.

## Requisitos

- Backend **atualizado com autenticação**, conectado ao MongoDB e com as rotas indicadas acima; o backend antigo não suporta login.
- Os tokens não são JWT: são **tokens Bearer opacos** validados no servidor.
- Instalar `expo-secure-store` exige compilar um **novo APK** (não funciona plenamente só com uma build antiga instalada).

## Instalar e validar no Windows / PowerShell

Dentro da pasta `Frontend`:

```powershell
npm.cmd ci
npx.cmd tsc --noEmit
npx.cmd expo-doctor
```

### Web local

Crie um `.env` (não incluído no ZIP):

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8080
```

No terminal do **backend**, permita a origem do frontend, antes do `bootRun`:

```powershell
$env:AUTH_CORS_ALLOWED_ORIGINS="http://localhost:8082"
.\gradlew.bat bootRun
```

Execute no **frontend**:

```powershell
npx.cmd expo start --web --port 8082 -c
```

Acesse `http://localhost:8082` para testar cadastro, login e logout. A autenticação falhará se o backend não estiver acessível em `http://localhost:8080`.

### Android / EAS

O `eas.json` foi mantido como recebido e utiliza:

```text
EXPO_PUBLIC_API_URL=https://vox-backend-latest.onrender.com
```

Antes da build, publique **no endereço acima** um backend com as rotas de autenticação. Modificar apenas o `.env` local não altera a URL embutida no APK de EAS.

Para gerar APK manualmente:

```powershell
npx.cmd eas-cli@latest build --platform android --profile preview
```

O workflow existente na `.github/workflows/build-android.yml` continua configurado para acionar o EAS após pushes na `main`, quando o `EXPO_TOKEN` estiver disponível no GitHub.

## Casos de teste recomendados

1. Primeiro acesso: nenhuma tela de lembrete deve aparecer antes do login.
2. Criar conta com nome, e-mail e senha com pelo menos 10 caracteres; confirmar senha.
3. Login válido e inválido, com mensagens de erro adequadas.
4. Reiniciar APK Android: restaurar sessão válida pelo `/auth/me`.
5. Abrir Configurações, desativar animações, sair e entrar novamente; a tela de login deve respeitar a preferência.
6. Ativar “Remover animações” no Android, repetir o teste.
7. Fazer logout, entrar com outra conta e confirmar que nenhuma mensagem temporária ou notificação da conta anterior permanece.
8. Confirmar que a criação de lembretes usa `Authorization: Bearer ...` e que resposta 401 leva ao login.
9. Testar teclado, modo escuro OLED e gestos do menu no Android físico.

## Observações de segurança e compatibilidade

- `EXPO_PUBLIC_API_URL` é público: não coloque senhas ou tokens dentro do `.env`.
- O `.env` está no `.gitignore` e não foi incluído no ZIP.
- Utilize HTTPS em produção. `localhost` no celular não é o computador.
- O armazenamento seguro é específico do dispositivo. Esta implementação não usa refresh token; ao expirar a sessão, é preciso entrar novamente.
- As notificações são locais; seu cancelamento não apaga os lembretes já salvos no MongoDB.
- **Atenção:** a validação do código nesta entrega não equivale a um teste em APK instalado; execute os testes acima.
