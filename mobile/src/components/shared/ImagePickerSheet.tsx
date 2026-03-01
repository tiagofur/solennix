import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, ImageIcon, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ImagePickerSheetProps {
    onCamera: () => void;
    onGallery: () => void;
    onRemove?: () => void;
    onCancel: () => void;
    hasImage?: boolean;
}

export function ImagePickerSheet({ onCamera, onGallery, onRemove, onCancel, hasImage }: ImagePickerSheetProps) {
    return (
        <View style={styles.container}>
            <View style={styles.handle} />
            <Text style={styles.title}>Seleccionar Foto</Text>

            <TouchableOpacity style={styles.option} onPress={onCamera} activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: colors.light.primaryLight }]}>
                    <Camera color={colors.light.primary} size={22} />
                </View>
                <Text style={styles.optionText}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={onGallery} activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: colors.light.infoBg }]}>
                    <ImageIcon color={colors.light.info} size={22} />
                </View>
                <Text style={styles.optionText}>Elegir de Galería</Text>
            </TouchableOpacity>

            {hasImage && onRemove && (
                <TouchableOpacity style={styles.option} onPress={onRemove} activeOpacity={0.7}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.light.errorBg }]}>
                        <X color={colors.light.error} size={22} />
                    </View>
                    <Text style={[styles.optionText, { color: colors.light.error }]}>Eliminar Foto</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: colors.light.border,
        alignSelf: 'center',
        marginBottom: spacing.md,
    },
    title: {
        ...typography.headline,
        color: colors.light.text,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.light.separator,
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
        color: colors.light.text,
        fontWeight: '500',
    },
    cancelButton: {
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadius.md,
        backgroundColor: colors.light.surface,
        alignItems: 'center',
    },
    cancelText: {
        ...typography.headline,
        color: colors.light.textSecondary,
    },
});
