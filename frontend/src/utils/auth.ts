export const setToken = (token: string) => {
  localStorage.setItem('erp_token', token);
};

export const getToken = (): string | null => {
  return localStorage.getItem('erp_token');
};

export const removeToken = () => {
  localStorage.removeItem('erp_token');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const getUser = (): any => {
  const token = getToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export const getUserRole = (): string => {
  const user = getUser();
  return user?.role ? String(user.role).toUpperCase() : '';
};

export const canEdit = (): boolean => {
  const role = getUserRole();
  return role === 'ADMIN' || role === 'MANAGER';
};
