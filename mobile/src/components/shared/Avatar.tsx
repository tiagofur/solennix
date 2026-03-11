import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../../theme/colors';
import { uploadService } from '../../services/uploadService';
import { useTheme } from '../../hooks/useTheme';

interface AvatarProps {
    name: string;
    photoUrl?: string | null;
    size?: number;
}

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function Avatar({ name, photoUrl, size = 44 }: AvatarProps) {
    const fullUrl = uploadService.getFullUrl(photoUrl);
    const borderRadius = size / 2;
    const { isDark } = useTheme();
    const palette = isDark ? colors.dark : colors.light;
    const styles = getStyles(palette);

    const getInitials = (n: string) => {
        const parts = n.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return n.substring(0, 2).toUpperCase();
    };

    if (fullUrl) {
        return (
            <Image
                source={{ uri: fullUrl }}
                placeholder={{ blurhash }}
                style={[styles.image, { width: size, height: size, borderRadius }]}
                contentFit="cover"
                transition={200}
            />
        );
    }

    const bgColor = palette.avatarColors[name.charCodeAt(0) % palette.avatarColors.length];
    const fontSize = size * 0.38;

    return (
        <View testID="avatar-container" style={[styles.initialsContainer, { width: size, height: size, borderRadius, backgroundColor: bgColor }]}>
            <Text style={[styles.initialsText, { fontSize }]}>{getInitials(name)}</Text>
        </View>
    );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
    image: {
        backgroundColor: palette.surface,
    },
    initialsContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        color: palette.textInverse,
        fontWeight: '700',
    },
});
