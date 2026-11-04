# Synapse

<img src="assets/images/synapse-mark.png" alt="Marca Synapse" width="88" />

Lembretes por texto e voz, com uma interface Android e web desenvolvida em React Native e Expo.
O Synapse permite revisar uma mensagem em linguagem natural, enviá-la à Agenda API e
agendar uma notificação local quando a interpretação contém uma data e um horário futuros.

## Recursos

- Cadastro, login e sessões autenticadas por tokens opacos Bearer.
- Composição por texto ou reconhecimento de voz em português brasileiro.
- Rascunho preservado durante a navegação da sessão, com limpeza ao sair da conta.
- Confirmação do último lembrete salvo e diagnóstico da conexão com a API.
- Notificações locais no aplicativo nativo, conforme permissões do dispositivo.
- Tema do sistema, claro e escuro OLED; cinco cores de destaque, com neutro como padrão.
- Preferências de fonte, contraste e animações, com persistência local.
- Layout adaptável, menu lateral e navegação com Expo Router.

## Arquitetura

| Componente | Responsabilidade | Repositório |
|---|---|---|
| Frontend | Interface, sessão, voz e notificações locais | [Frontend](https://github.com/Assistente-pessoal/Frontend) |
| Agenda API | Autenticação, autorização e persistência MongoDB | [backend-agenda](https://github.com/Assistente-pessoal/backend-agenda) |
| Interpretador | Extração de título, data, horário, domínio e prioridade | [microservice](https://github.com/Assistente-pessoal/microservice) |

O frontend envia **texto**, sem áudio bruto, para a API. A API identifica o usuário,
consulta o interpretador e persiste o resultado. O interpretador atual usa regras
determinísticas e expressões regulares; não utiliza um modelo generativo.

Tecnologias principais: **Expo SDK 57**, **React Native 0.86.3**, **React 19.2.3**,
**TypeScript 6** e **Expo Router**.

## Executar no navegador

Requisitos: Node.js **22.18 ou superior**, npm e acesso a uma Agenda API com autenticação.
O projeto utiliza npm e mantém as versões resolvidas em `package-lock.json`.

```bash
npm ci
```

Crie `.env.local` na raiz do frontend para usar o backend executado no mesmo computador:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8080
```

Informe somente a raiz da API, sem `/auth`, `/login` ou `/api` ao final.
O arquivo `.env.local` é ignorado pelo Git. Variáveis `EXPO_PUBLIC_*` fazem parte do
aplicativo distribuído: não coloque senhas, tokens ou outros segredos nelas.

Inicie o Expo e abra o endereço informado no terminal:

```bash
npm run web -- --port 8082 --clear
```

No PowerShell, os mesmos comandos funcionam com `npm.cmd` caso a política de execução
bloqueie `npm.ps1`. Como alternativa ao arquivo, configure o destino no terminal que
inicia o Expo:

```powershell
$env:EXPO_PUBLIC_API_URL="http://localhost:8080"
npm.cmd run web -- --port 8082 --clear
```

Essa variável vale apenas para aquele terminal e seus processos. Reinicie o Expo com
`--clear` sempre que alterar o destino da API.

### Backend local

Na pasta do backend autenticado, use **JDK 25** e MongoDB. O perfil `local` permite
as origens web `localhost` e `127.0.0.1` nas portas 8081 e 8082:

```powershell
docker compose up -d mongo
Remove-Item Env:AUTH_CORS_ALLOWED_ORIGINS -ErrorAction SilentlyContinue
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

No Linux/macOS:

```bash
docker compose up -d mongo
env -u AUTH_CORS_ALLOWED_ORIGINS bash gradlew bootRun --args='--spring.profiles.active=local'
```

Cadastro, login, logout e lembretes manuais do backend funcionam sem o interpretador.
Para salvar lembretes pelo compositor Synapse, inicie também o microserviço conforme
seu README e configure `VOX_AI_SERVICE_URL` no backend. O padrão local é
`http://localhost:8000`.

### Destino da API

| Ambiente | Endereço de referência |
|---|---|
| Navegador no computador do backend | `http://localhost:8080` |
| Emulador Android padrão | `http://10.0.2.2:8080` |
| Dispositivo físico | API HTTPS alcançável pela rede do dispositivo |
| Destino publicado padrão | `https://vox-backend-latest.onrender.com` |

Sem `EXPO_PUBLIC_API_URL`, o aplicativo utiliza o destino publicado. Os perfis EAS
também definem esse endereço explicitamente. Um backend local ativo não modifica a
instância publicada; ambos precisam disponibilizar os contratos usados pelo aplicativo.

No Android, `localhost` representa o próprio dispositivo. Builds nativos usam HTTPS
por padrão; testar uma API local em HTTP pode exigir configuração nativa de
desenvolvimento ou um túnel HTTPS.

## Sessão e comunicação

| Método | Rota | Uso |
|---|---|---|
| `POST` | `/users` | Cadastro |
| `POST` | `/auth/login` | Login e emissão da sessão |
| `GET` | `/auth/me` | Validação da sessão |
| `POST` | `/auth/logout` | Revogação da sessão |
| `GET` | `/api/vox/health` | Disponibilidade HTTP da API |
| `POST` | `/api/vox/transcriptions` | Criação por texto interpretado |

Chamadas privadas enviam `Authorization: Bearer <token>`. O servidor determina o
proprietário dos registros. O token fica no **SecureStore** nas plataformas nativas
e somente **em memória** na web; recarregar a página pode exigir novo login.
Senhas e tokens não devem ser registrados em logs ou arquivos `.env`.

O health confirma que a rota HTTP responde; não garante que MongoDB e interpretador
estejam disponíveis. A tela **Lembretes** mostra o endereço ativo e permite repetir
a verificação da conexão.

## Voz e notificações nativas

O reconhecimento utiliza `expo-speech-recognition`, com idioma `pt-BR`, permissão
de microfone e o serviço disponível no dispositivo. A digitação permanece disponível
quando não há um mecanismo de voz compatível.

Voz e notificações nativas precisam de um aplicativo compilado com seus módulos.
O Expo Go não é suficiente para validar esse fluxo. Para desenvolvimento Android
local, instale Android Studio/SDK e execute:

```bash
npx expo run:android
```

O Expo gera os projetos nativos quando necessário; mantenha configurações e plugins
em `app.json`, sem editar manualmente diretórios gerados. Para testar em aparelho,
use uma API alcançável por ele.

## Qualidade e manutenção

```bash
npm run check
```

| Comando | Verificação |
|---|---|
| `npm run typecheck` | Tipos TypeScript, sem emissão de arquivos |
| `npm run lint` | Regras de código e hooks React |
| `npm test` | Testes automatizados de regressão |
| `npm run check` | Typecheck, lint e testes |
| `npx expo-doctor` | Compatibilidade de dependências e configuração Expo |
| `npx expo export --platform web` | Geração do bundle e das rotas web |

Estrutura do código:

```text
src/
├── app/          # Rotas e layout do Expo Router
├── components/   # Interface, navegação e compositor
├── constants/    # Temas, paletas e opções visuais
├── context/      # Autenticação, preferências e sessão de lembretes
├── hooks/        # Comportamentos reutilizáveis
├── services/     # HTTP, sessão e notificações por plataforma
└── utils/        # Utilitários e persistência de preferências
tests/            # Regressões automatizadas
```

Ao manter o projeto:

- Preserve as diferenças de plataforma em arquivos `.web.ts`/`.web.tsx`.
- Mantenha chamadas HTTP e regras de sessão nos serviços, fora dos componentes visuais.
- Adicione regressões ao corrigir falhas de rede, sessão e operações assíncronas.
- Instale dependências Expo com `npx expo install <pacote>` para respeitar o SDK.
- Execute as verificações e revise o destino da API antes de gerar um APK.

## Gerar APK com EAS

O perfil `preview` de `eas.json` gera um APK com distribuição interna. A conta e o
projeto EAS precisam estar acessíveis ao usuário responsável pelo build:

```bash
npx eas-cli@latest whoami
npx eas-cli@latest project:info
npx eas-cli@latest build --platform android --profile preview
```

Identidade configurada:

| Campo | Valor |
|---|---|
| Projeto Expo | `@ssasuru/synapse-build` |
| Project ID | `fe42f9f9-11d9-406f-b0a8-84da4231e4f1` |
| Package Android | `com.voxsmartschedule.voxagenda` |

Preserve o Project ID e as credenciais de assinatura para permitir futuras
atualizações. Mudanças em módulos, plugins, ícones ou configuração nativa exigem
uma nova compilação.

O workflow `.github/workflows/build-android.yml` oferece geração de APK por push
na `main` ou execução manual. A autenticação EAS utiliza o secret `EXPO_TOKEN` do
GitHub; o APK é disponibilizado como artifact por 14 dias.

O workflow `.github/workflows/validate.yml` executa typecheck, lint, testes e exportação
web nos pushes de `main`/`feature/autenticacao` e em pull requests. O workflow de APK
também exige `npm run check` antes de iniciar o build EAS.

## Escopo atual

A tela **Lembretes** apresenta o último resultado desta sessão; um histórico unificado,
edição/exclusão e sincronização completa de notificações dependem de evolução integrada
com o backend. A interpretação cobre as regras disponíveis no microserviço.

Antes de distribuir uma versão, valide em APK real: login, logout, permissões, voz,
notificações, teclado, gestos, rotação e acessibilidade. A compatibilidade desejada
com Android 7.0 ou superior precisa ser confirmada no manifesto final e em dispositivos
ou emuladores representativos; uma exportação web não comprova essa compatibilidade.
