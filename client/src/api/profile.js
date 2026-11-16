import { apiClient } from './client.js';

export const getProfile = async (signal) => {
  const response = await apiClient('/api/v1/profile/me', { signal });
  if (!response.success || !response.data?.profile) throw new Error('Profile unavailable');
  return response.data.profile;
};
export const saveProfile = async (body) => {
  const response = await apiClient('/api/v1/profile/me', { method: 'PATCH', body });
  if (!response.success || !response.data?.profile) throw new Error('Save not confirmed');
  return response.data.profile;
};
export const saveQualification = async (body, id) => {
  const response = await apiClient(`/api/v1/profile/me/education${id ? `/${encodeURIComponent(id)}` : ''}`, {
    method: id ? 'PATCH' : 'POST', body
  });
  if (!response.success || !response.data?.qualification) throw new Error('Save not confirmed');
  return response.data.qualification;
};
export const removeQualification = async (id) => {
  const response = await apiClient(`/api/v1/profile/me/education/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.success) throw new Error('Removal not confirmed');
};
