import client from './client';
import type { AuthTokens, User } from '../types';

export const login = (email: string, password: string) =>
  client.post<AuthTokens>('/auth/login', { email, password });

export const signup = (email: string, username: string, password: string) =>
  client.post<User>('/auth/signup', { email, username, password });

export const getMe = () =>
  client.get<User>('/auth/me');

export const logout = () =>
  client.post<void>('/auth/logout');
