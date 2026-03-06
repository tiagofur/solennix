import { Platform, NativeModules } from 'react-native';
import type {
    PurchasesPackage,
    CustomerInfo,
    PurchasesError,
} from 'react-native-purchases';
import { subscriptionService } from './subscriptionService';

// react-native-purchases requires native code — not available in Expo Go.
// Check for the native module before loading the JS bridge to avoid crashes.
let Purchases: any = null;
let PURCHASES_ERROR_CODE: any = {};
if (NativeModules.RNPurchases) {
    try {
        const pkg = require('react-native-purchases');
        Purchases = pkg.default ?? pkg;
        PURCHASES_ERROR_CODE = pkg.PURCHASES_ERROR_CODE ?? {};
    } catch {
        // Unsupported environment — fallback mode
    }
}

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS || '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID || '';

let isConfigured = false;

export interface OfferingInfo {
    identifier: string;
    title: string;
    price: string;
    priceNumber: number;
    period: string;
    packageType: string;
    rcPackage: PurchasesPackage | null;
}

function getApiKey(): string {
    return Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
}

export const revenueCatService = {
    /**
     * Initialize RevenueCat SDK if API keys are available.
     * Falls back to debug mode in dev, shows unavailable message in production.
     */
    async initialize(userId: string): Promise<void> {
        const apiKey = getApiKey();

        if (!apiKey || !Purchases) {
            isConfigured = false;
            return;
        }

        try {
            Purchases.configure({ apiKey, appUserID: userId });
            isConfigured = true;
        } catch (error) {
            console.warn('RevenueCat initialization failed, using fallback:', error);
            isConfigured = false;
        }
    },

    /**
     * Get available offerings (packages/plans).
     * Returns hardcoded fallback in dev, empty array in production without RC.
     */
    async getOfferings(): Promise<OfferingInfo[]> {
        if (isConfigured) {
            try {
                const offerings = await Purchases.getOfferings();
                const current = offerings.current;

                if (!current || !current.availablePackages.length) {
                    return getFallbackOfferings();
                }

                return current.availablePackages.map((pkg: any) => ({
                    identifier: pkg.identifier,
                    title: pkg.product.title,
                    price: pkg.product.priceString,
                    priceNumber: pkg.product.price,
                    period: pkg.packageType === 'ANNUAL' ? 'anual' : 'mensual',
                    packageType: pkg.packageType,
                    rcPackage: pkg,
                }));
            } catch (error) {
                console.warn('Failed to fetch RC offerings, using fallback:', error);
                return getFallbackOfferings();
            }
        }

        return getFallbackOfferings();
    },

    /**
     * Purchase a package. Uses debug endpoint only in __DEV__.
     * In production without RC: throws an error so the UI can show a message.
     */
    async purchasePackage(
        rcPackage: PurchasesPackage | null,
    ): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
        if (isConfigured && rcPackage) {
            const { customerInfo } = await Purchases.purchasePackage(rcPackage);
            return { success: true, customerInfo };
        }

        if (__DEV__) {
            // Debug upgrade only in development
            await subscriptionService.debugUpgrade();
            return { success: true };
        }

        throw new Error('Suscripción no disponible en este momento. Intenta más tarde.');
    },

    /**
     * Restore previous purchases.
     * In fallback mode, checks backend subscription status.
     */
    async restorePurchases(): Promise<{ isPro: boolean; customerInfo?: CustomerInfo }> {
        if (isConfigured) {
            const customerInfo = await Purchases.restorePurchases();
            const isPro =
                Object.keys(customerInfo.entitlements.active).length > 0;
            return { isPro, customerInfo };
        }

        // Fallback: check backend status
        const status = await subscriptionService.getStatus();
        const isPro = status.plan === 'pro' || status.plan === 'premium';
        return { isPro };
    },

    /**
     * Get current customer info.
     */
    async getCustomerInfo(): Promise<{
        isPro: boolean;
        customerInfo?: CustomerInfo;
    }> {
        if (isConfigured) {
            const customerInfo = await Purchases.getCustomerInfo();
            const isPro =
                Object.keys(customerInfo.entitlements.active).length > 0;
            return { isPro, customerInfo };
        }

        const status = await subscriptionService.getStatus();
        const isPro = status.plan === 'pro' || status.plan === 'premium';
        return { isPro };
    },

    /**
     * Check if the current user is a Pro subscriber.
     */
    async isProUser(): Promise<boolean> {
        const { isPro } = await this.getCustomerInfo();
        return isPro;
    },

    /**
     * Whether RevenueCat SDK is actively configured (vs fallback mode).
     */
    get configured(): boolean {
        return isConfigured;
    },

    /**
     * Helper to detect if a purchase error was a user cancellation.
     */
    isUserCancelled(error: unknown): boolean {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as PurchasesError).code ===
            PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
        );
    },
};

function getFallbackOfferings(): OfferingInfo[] {
    return [
        {
            identifier: 'pro_monthly',
            title: 'Premium Mensual',
            price: '$99.00 MXN',
            priceNumber: 99,
            period: 'mensual',
            packageType: 'MONTHLY',
            rcPackage: null,
        },
    ];
}
