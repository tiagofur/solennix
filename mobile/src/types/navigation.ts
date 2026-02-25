/**
 * Navigation type definitions for React Navigation.
 * Defines params for every screen in the app.
 */

// Auth stack
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

// Home stack (Dashboard tab)
export type HomeStackParamList = {
    Dashboard: undefined;
    Search: undefined;
    EventForm: { id?: string };
    EventDetail: { id: string };
};

// Calendar stack
export type CalendarStackParamList = {
    CalendarView: undefined;
    EventDetail: { id: string };
    EventForm: { id?: string };
};

// Client stack
export type ClientStackParamList = {
    ClientList: undefined;
    ClientForm: { id?: string };
    ClientDetail: { id: string };
};

// Catalog stack (Products + Inventory)
export type CatalogStackParamList = {
    ProductList: undefined;
    ProductForm: { id?: string };
    ProductDetail: { id: string };
    InventoryList: undefined;
    InventoryForm: { id?: string };
};

// Profile / More stack
export type ProfileStackParamList = {
    Settings: undefined;
    Pricing: undefined;
};

// Bottom tab navigator
export type MainTabParamList = {
    HomeTab: undefined;
    CalendarTab: undefined;
    ClientTab: undefined;
    CatalogTab: undefined;
    ProfileTab: undefined;
};

// Root navigator
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};
