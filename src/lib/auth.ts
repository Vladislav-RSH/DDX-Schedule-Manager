export const telegramAuthProvider = 'custom:telegram';

export const getTelegramAuthRedirectUrl = () =>
  `${window.location.origin}${import.meta.env.BASE_URL}`;
