import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useTheme } from '../../hooks/useTheme';

interface ImagePickerSheetProps {
    onCamera: () => void;
    onGallery: () => void;
    onRemove?: () => void;
    onCancel: () => void;
    hasImage?: boolean;
}

export function ImagePickerSheet({ onCamera, onGallery, onRemove, onCancel, hasImage }: ImagePickerSheetProps) {
    const { isDark } = useTheme();
    const palette = isDark ? colors.dark : colors.light;
    const styles = getStyles(palette);

    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <Text style={styles.title}>Seleccionar Foto</Text>

            <TouchableOpacity style={styles.option} onPress={onCamera} activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: palette.primaryLight }]}>
                    <Camera color={palette.primary} size={22} />
                </View>
                <Text style={styles.optionText}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={onGallery} activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: palette.infoBg }]}>
                    <ImageIcon color={palette.info} size={22} />
                </View>
                <Text style={styles.optionText}>Elegir de Galería</Text>
            </TouchableOpacity>

            {hasImage && onRemove && (
                <TouchableOpacity style={styles.option} onPress={onRemove} activeOpacity={0.7}>
                    <View style={[styles.iconContainer, { backgroundColor: palette.errorBg }]}>
                        <X color={palette.error} size={22} />
                    </View>
                    <Text style={[styles.optionText, { color: palette.error }]}>Eliminar Foto</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
        </View>
    );
}

const getStyles = (palette: typeof colors.light) => StyleSheet.create({
    container: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: palette.border,
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    title: {
        ...typography.headline,
        color: palette.text,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.separator,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionText: {
        ...typography.body,
        color: palette.text,
        fontWeight: '500',
    },
    cancelButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadius.md,
        backgroundColor: palette.surface,
        alignItems: 'center',
    },
    cancelText: {
        ...typography.headline,
        color: palette.textSecondary,
    },
});
