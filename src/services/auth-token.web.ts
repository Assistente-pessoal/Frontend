import { createTokenStore } from './token-store';

/** Browser reloads intentionally discard the token; never persist it in localStorage. */
const store = createTokenStore({
  read: async () => null,
  write: async () => {},
  remove: async () => {},
});

export const { getAccessToken, restoreAccessToken, saveAccessToken, clearAccessToken, subscribeSessionExpired, expireSessionIfCurrent } = store;
