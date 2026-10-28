> **Autenticação (Etapa 2):** esta versão exige o backend atualizado com `/auth/login` e `/auth/me`. Veja [INTEGRACAO_AUTENTICACAO.md](./INTEGRACAO_AUTENTICACAO.md) antes de gerar o APK.

# Synapse — Frontend Expo

Aplicativo móvel e web para criação e organização de lembretes por texto ou voz.

## Requisitos

- Node.js e npm.
- Acesso à Agenda API publicada (o app usa `https://vox-backend-latest.onrender.com` automaticamente). Para desenvolvimento local, é necessário também iniciar o backend e suas dependências.
- Android Studio/SDK para gerar e executar o app Android.

## Configuração inicial

1. Instale as dependências com `npm install`.
2. A Agenda API publicada já é utilizada por padrão. Para apontar para um backend local, copie `.env.example` para `.env` e configure `EXPO_PUBLIC_API_URL`:
   - Emulador Android: `http://10.0.2.2:8080`.
   - Celular físico: `http://IP-DA-SUA-MÁQUINA:8080`. O computador e o celular precisam estar na mesma rede e a porta 8080 liberada no firewall.
3. Gere o projeto nativo e instale o build de desenvolvimento:

   ```bash
   npx expo prebuild
   npx expo run:android
   ```

   O Expo Go padrão não contém o módulo nativo de reconhecimento de voz. Não use apenas `npx expo start` para validar o reconhecimento de voz Android. No navegador, use `npx expo start --web`; notificações locais nativas são testadas no app Android/iOS, não no browser.

## Uso

1. Toque no botão de microfone e conceda acesso ao microfone.
2. Diga o lembrete em português.
3. Revise ou corrija a transcrição no campo editável.
4. Toque em **Salvar lembrete**. O app envia somente `{ "text": "..." }` para `POST /api/vox/transcriptions`.
5. Caso a interpretação retorne uma data e um horário futuros, o app tenta agendar uma notificação local. Se o usuário negar notificações, o lembrete continua salvo na API.

## Compatibilidade de reconhecimento de voz

No Android, o Synapse utiliza o serviço padrão do sistema e não exige reconhecimento offline. Em Android 12 ou anterior, o app Google (`com.google.android.googlequicksearchbox`) deve estar instalado e ativo. Em Android 13 ou superior, utilize Speech Recognition & Synthesis (`com.google.android.tts`). O app tenta priorizar o serviço padrão e usa uma alternativa compatível com a versão do Android quando necessário. O idioma Português (Brasil) também precisa estar disponível no serviço. Se o aparelho não oferecer um mecanismo compatível, o campo de texto continua disponível.

Ajustes de tamanho/família da fonte, tema claro/escuro e animações ficam em **Menu → Configurações** e são salvos no dispositivo.

## Configuração de rede para desenvolvimento

Os builds Android usam HTTPS por padrão. Para testar o backend local sem TLS em um dispositivo Android, use um túnel HTTPS ou configure uma solução nativa específica para desenvolvimento; em produção, use HTTPS.

## Conexão com a Agenda API

O aplicativo usa automaticamente o endereço publicado da Agenda API (`https://vox-backend-latest.onrender.com`) quando `EXPO_PUBLIC_API_URL` não está definido. A conexão é verificada ao iniciar o aplicativo, e seu resultado é exibido em **Lembretes**. Em serviços hospedados que entram em repouso, a primeira resposta pode demorar; a tolerância de requisições é de até 75 segundos.

Para apontar para um backend local, crie um arquivo `.env` na raiz e configure `EXPO_PUBLIC_API_URL` com o endereço correto para seu ambiente (por exemplo, `http://localhost:8080` no navegador do próprio computador ou `http://10.0.2.2:8080` no emulador Android). Reinicie o Expo com `npx expo start -c` após alterar o `.env`.


As preferências de acessibilidade e aparência ficam no menu hambúrguer em **Configurações**. O aplicativo permite ajustar o tamanho e a família da fonte, alternar entre tema claro/escuro e ativar ou desativar animações.

## Interface Android

A interface segue uma linguagem inspirada no Material 3 Expressive: superfícies tonais, formas arredondadas adaptáveis, áreas de toque amplas, feedback por ripple no Android e transições com movimento de mola. O menu lateral abre pelo botão no canto superior esquerdo ou por um gesto horizontal iniciado na borda esquerda da tela.

## Navegação e compatibilidade

- **Início:** espaço limpo para escrever ou ditar; o compositor permanece no rodapé.
- **Lembretes:** botão no canto superior direito ou item do menu hambúrguer; apresenta o último lembrete salvo nesta sessão, a situação da API e orientações. O frontend não inventa histórico de lembretes; uma lista persistente requer uma rota de consulta no backend.
- **Android 7.0 ou superior:** o Expo SDK 57 usa o mínimo Android API 24. O APK final e cada biblioteca nativa devem ser verificados para garantir o `minSdkVersion=24` no manifesto mesclado.
- A orientação é livre (retrato/paisagem), e cartões/menus respondem à largura e altura disponíveis, incluindo tablets e dobráveis.
- O reconhecimento de voz depende do mecanismo disponível no aparelho; a digitação permanece disponível em caso de incompatibilidade. Teste com Android 7, 10, 12, 13 e 16, verificando permissões, TalkBack, teclado e tamanho da fonte.
- Para confirmar o endereço ativo da API, abra **Lembretes**. Se houver um arquivo `.env` local antigo, remova ou corrija `EXPO_PUBLIC_API_URL` e reinicie com `npx expo start --clear`.

### Testes recomendados antes de publicar

1. `npm ci`, `npx tsc --noEmit`, `npm run lint` e `npx expo-doctor`.
2. Gerar APK de teste: `npx eas-cli@latest build --profile preview --platform android`.
3. Instalar o APK em aparelho Android 7 real (ou emulador API 24); verificar se o app instala, inicia, digita, envia para a API, abre o menu e agenda notificações.
4. Testar Android 16 em tablet/dobrável com rotação e multi-janela; testar alto contraste e TalkBack.

> A disponibilidade do servidor publicado e do serviço de IA precisa ser confirmada no seu ambiente; o frontend não controla a saúde nem o contrato do backend.

### Tema escuro OLED

Ao selecionar **Escuro** em Configurações, o fundo do aplicativo fica preto puro (`#000000`), com cartões em cinza neutro quase preto. As cinco cores de destaque permanecem independentes do tema e continuam aparecendo nos botões, ícones e seleções.
