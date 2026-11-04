import * as SecureStore from 'expo-secure-store';
import { createTokenStore } from './token-store';

const KEY = 'synapse_access_token_v1';
const store = createTokenStore({
  read: () => SecureStore.getItemAsync(KEY),
  write: (token) => SecureStore.setItemAsync(KEY, token),
  remove: () => SecureStore.deleteItemAsync(KEY),
});

export const { getAccessToken, restoreAccessToken, saveAccessToken, clearAccessToken, subscribeSessionExpired, expireSessionIfCurrent } = store;
