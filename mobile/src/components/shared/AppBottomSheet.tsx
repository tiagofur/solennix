import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface AppBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    snapPoints?: (string | number)[];
    children: React.ReactNode;
    enableDynamicSizing?: boolean;
    scrollable?: boolean;
}

export function AppBottomSheet({
    visible,
    onClose,
    snapPoints: customSnapPoints,
    children,
    enableDynamicSizing = true,
    scrollable = false,
}: AppBottomSheetProps) {
    const bottomSheetRef = useRef<BottomSheet>(null);

    const snapPoints = useMemo(
        () => customSnapPoints || ['25%', '50%'],
        [customSnapPoints]
    );

    useEffect(() => {
        if (visible) {
            bottomSheetRef.current?.expand();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [visible]);

    const handleSheetChanges = useCallback(
        (index: number) => {
            if (index === -1) {
                onClose();
            }
        },
        [onClose]
    );

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    );

    if (!visible) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={enableDynamicSizing ? undefined : snapPoints}
            enableDynamicSizing={enableDynamicSizing}
            enablePanDownToClose
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={styles.handle}
            backgroundStyle={styles.background}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
        >
            {scrollable ? (
                <BottomSheetScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </BottomSheetScrollView>
            ) : (
                <BottomSheetView style={styles.contentContainer}>
                    {children}
                </BottomSheetView>
            )}
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    background: {
        backgroundColor: colors.light.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handle: {
        backgroundColor: colors.light.border,
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    contentContainer: {
        paddingBottom: spacing.xxxl,
    },
    scrollContent: {
        paddingBottom: spacing.xxxl,
    },
});
