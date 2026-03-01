import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert, Platform } from 'react-native';

interface UseImagePickerOptions {
    maxWidth?: number;
    quality?: number;
    allowsMultiple?: boolean;
}

interface PickedImage {
    uri: string;
    width: number;
    height: number;
}

export function useImagePicker(options: UseImagePickerOptions = {}) {
    const { maxWidth = 800, quality = 0.6, allowsMultiple = false } = options;
    const [picking, setPicking] = useState(false);

    const requestCameraPermission = useCallback(async (): Promise<boolean> => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permiso requerido',
                'Necesitamos acceso a tu cámara para tomar fotos.',
                [{ text: 'OK' }]
            );
            return false;
        }
        return true;
    }, []);

    const requestMediaPermission = useCallback(async (): Promise<boolean> => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permiso requerido',
                'Necesitamos acceso a tu galería para seleccionar fotos.',
                [{ text: 'OK' }]
            );
            return false;
        }
        return true;
    }, []);

    const processImage = useCallback(async (uri: string): Promise<PickedImage> => {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: maxWidth } }],
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );
        return {
            uri: result.uri,
            width: result.width,
            height: result.height,
        };
    }, [maxWidth, quality]);

    const pickFromCamera = useCallback(async (): Promise<PickedImage[] | null> => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return null;

        setPicking(true);
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 1,
                allowsEditing: Platform.OS === 'ios',
            });

            if (result.canceled || !result.assets?.length) return null;

            const processed = await Promise.all(
                result.assets.map(asset => processImage(asset.uri))
            );
            return processed;
        } finally {
            setPicking(false);
        }
    }, [requestCameraPermission, processImage]);

    const pickFromGallery = useCallback(async (): Promise<PickedImage[] | null> => {
        const hasPermission = await requestMediaPermission();
        if (!hasPermission) return null;

        setPicking(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1,
                allowsMultipleSelection: allowsMultiple,
                selectionLimit: allowsMultiple ? 10 : 1,
            });

            if (result.canceled || !result.assets?.length) return null;

            const processed = await Promise.all(
                result.assets.map(asset => processImage(asset.uri))
            );
            return processed;
        } finally {
            setPicking(false);
        }
    }, [requestMediaPermission, processImage, allowsMultiple]);

    return {
        pickFromCamera,
        pickFromGallery,
        picking,
    };
}
