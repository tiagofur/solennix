import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
const TOKEN_KEY = 'auth_token';

export interface UploadResult {
    url: string;
    thumbnail_url: string;
    filename: string;
}

export const uploadService = {
    async uploadImage(localUri: string): Promise<UploadResult> {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) throw new Error('Not authenticated');

        const result = await FileSystem.uploadAsync(
            `${API_URL}/uploads/image`,
            localUri,
            {
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: 'file',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (result.status !== 200) {
            const error = JSON.parse(result.body || '{}');
            throw new Error(error.error || 'Upload failed');
        }

        return JSON.parse(result.body);
    },

    getFullUrl(path: string | null | undefined): string | null {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        // Remove /api prefix if the path already starts with /api
        const baseUrl = API_URL.replace(/\/api$/, '');
        return `${baseUrl}${path}`;
    },
};
