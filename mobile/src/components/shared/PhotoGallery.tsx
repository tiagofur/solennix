import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Plus, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { uploadService } from '../../services/uploadService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = 80;

interface PhotoGalleryProps {
    photos: string[];
    onAdd?: () => void;
    onRemove?: (index: number) => void;
    editable?: boolean;
}

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function PhotoGallery({ photos, onAdd, onRemove, editable = false }: PhotoGalleryProps) {
    const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

    return (
        <View style={styles.container}>
            <View style={styles.scrollRow}>
                {photos.map((photo, index) => {
                    const url = uploadService.getFullUrl(photo);
                    return (
                        <TouchableOpacity
                            key={index}
                            style={styles.thumbContainer}
                            activeOpacity={0.8}
                            onPress={() => setFullscreenIndex(index)}
                        >
                            <Image
                                source={{ uri: url || '' }}
                                placeholder={{ blurhash }}
                                style={styles.thumbnail}
                                contentFit="cover"
                                transition={200}
                            />
                            {editable && onRemove && (
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => onRemove(index)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <X color="#fff" size={12} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    );
                })}
                {editable && onAdd && (
                    <TouchableOpacity style={styles.addButton} onPress={onAdd} activeOpacity={0.7}>
                        <Plus color={colors.light.primary} size={24} />
                        <Text style={styles.addText}>Agregar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Fullscreen viewer */}
            {fullscreenIndex !== null && (
                <Modal visible transparent animationType="fade">
                    <View style={styles.fullscreenContainer}>
                        <TouchableOpacity style={styles.closeFullscreen} onPress={() => setFullscreenIndex(null)}>
                            <X color="#fff" size={28} />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: uploadService.getFullUrl(photos[fullscreenIndex]) || '' }}
                            style={styles.fullscreenImage}
                            contentFit="contain"
                            transition={200}
                        />
                        <Text style={styles.counter}>
                            {fullscreenIndex + 1} / {photos.length}
                        </Text>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    scrollRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    thumbContainer: {
        position: 'relative',
    },
    thumbnail: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: spacing.borderRadius.md,
        backgroundColor: colors.light.surface,
    },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.light.error,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: spacing.borderRadius.md,
        borderWidth: 2,
        borderColor: colors.light.primary,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
    },
    addText: {
        ...typography.caption1,
        color: colors.light.primary,
        fontWeight: '600',
        fontSize: 10,
    },
    fullscreenContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeFullscreen: {
        position: 'absolute',
        top: 60,
        right: spacing.lg,
        zIndex: 10,
        padding: spacing.sm,
    },
    fullscreenImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
    },
    counter: {
        color: '#fff',
        marginTop: spacing.md,
        ...typography.body,
    },
});
