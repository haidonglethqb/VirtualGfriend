import api from './api';

export interface DefaultUserAvatar {
  id: string;
  url: string;
  label: string;
}

export interface UploadedUserAvatar {
  id: string;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt: string;
}

export interface UserAvatarLimits {
  used: number;
  max: number;
  canUpload: boolean;
  isUnlimited: boolean;
}

export interface UserAvatarGallery {
  activeAvatarUrl: string | null;
  defaultAvatars: DefaultUserAvatar[];
  uploadedAvatars: UploadedUserAvatar[];
  limits: UserAvatarLimits;
}

export const userAvatarApi = {
  async list() {
    const response = await api.get<UserAvatarGallery>('/users/avatars');
    return response.data;
  },

  async upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.postForm<UploadedUserAvatar>('/users/avatars/upload', formData);
    return response.data;
  },

  async selectDefault(url: string) {
    const response = await api.post<{ activeAvatarUrl: string | null }>('/users/avatars/select-default', { url });
    return response.data;
  },

  async selectUploaded(id: string) {
    const response = await api.post<{ activeAvatarUrl: string | null }>(`/users/avatars/${id}/select`);
    return response.data;
  },

  async deleteUploaded(id: string) {
    const response = await api.delete<{ activeAvatarUrl: string | null }>(`/users/avatars/${id}`);
    return response.data;
  },
};
