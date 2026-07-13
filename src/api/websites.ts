import client from './client';
import type { Website } from '../types';

export const listWebsites = () =>
  client.get<Website[]>('/websites/');

export const getWebsite = (id: string) =>
  client.get<Website>(`/websites/${id}`);

export const createWebsite = (name: string, url: string) =>
  client.post<Website>('/websites/', { name, url });

export const deleteWebsite = (id: string) =>
  client.delete(`/websites/${id}`);

export const renameWebsite = (id: string, name: string) =>
  client.patch<Website>(`/websites/${id}`, { name });

export const transferWebsite = (id: string, organisationId: string | null) =>
  client.post<{ id: string; organisation_id: string | null }>(`/websites/${id}/transfer`, { organisation_id: organisationId });
