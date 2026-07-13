import client from './client';

export type OrgRole = 'owner' | 'admin' | 'viewer';

export interface Organisation {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count: number;
  website_count: number;
  user_role: OrgRole;
}

export interface OrgDetail extends Organisation {
  websites: Array<{
    id: string
    name: string
    url: string
    last_scanned_at: string | null
    credits_used?: number
  }>
}

export interface OrgMember {
  user_id: string;
  email: string;
  role: OrgRole;
}

export interface TeamMember {
  user_id: string;
  email: string;
  organisations_count: number;
  websites_count: number;
}

export interface MemberAccess {
  org_id: string;
  org_name: string;
  website_count: number;
  role: OrgRole;
}

// Organisations
export const listOrganisations = () =>
  client.get<Organisation[]>('/organisations/');

export const createOrganisation = (name: string) =>
  client.post<Organisation>('/organisations/', { name });

export const getOrganisation = (orgId: string) =>
  client.get<OrgDetail>(`/organisations/${orgId}`);

export const updateOrganisation = (orgId: string, name: string) =>
  client.patch<Organisation>(`/organisations/${orgId}`, { name });

export const deleteOrganisation = (orgId: string) =>
  client.delete(`/organisations/${orgId}`);

// Members
export const listOrgMembers = (orgId: string) =>
  client.get<OrgMember[]>(`/organisations/${orgId}/members`);

export const addOrgMember = (orgId: string, email: string, role: Exclude<OrgRole, 'owner'>) =>
  client.post<OrgMember>(`/organisations/${orgId}/members`, { email, role });

export const updateOrgMemberRole = (orgId: string, userId: string, role: Exclude<OrgRole, 'owner'>) =>
  client.patch<{ user_id: string; role: OrgRole }>(`/organisations/${orgId}/members/${userId}`, { role });

export const removeOrgMember = (orgId: string, userId: string) =>
  client.delete(`/organisations/${orgId}/members/${userId}`);

// Team (cross-org view)
export const listTeamMembers = () =>
  client.get<TeamMember[]>('/organisations/team');

export const getMemberAccess = (userId: string) =>
  client.get<MemberAccess[]>(`/organisations/team/${userId}`);
