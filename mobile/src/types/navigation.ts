/**
 * Navigation type definitions for React Navigation.
 * Defines params for every screen in the app.
 */

// Auth stack
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    ResetPassword: { token: string };
};

// Home stack (Dashboard tab)
export type HomeStackParamList = {
    Dashboard: undefined;
    EventForm: { id?: string; clientId?: string; eventDate?: string };
    EventDetail: { id: string };
};

// Calendar stack
export type CalendarStackParamList = {
    CalendarView: undefined;
    EventDetail: { id: string };
    EventForm: { id?: string; clientId?: string; eventDate?: string };
};

// Events stack (used in Home tab)
export type EventsStackParamList = {
    EventForm: { id?: string; clientId?: string; eventDate?: string };
    EventDetail: { id: string };
};

// Client stack
export type ClientStackParamList = {
    ClientList: undefined;
    ClientForm: { id?: string };
    ClientDetail: { id: string };
};

// Product stack (drawer screen)
export type ProductStackParamList = {
    ProductList: undefined;
    ProductForm: { id?: string };
    ProductDetail: { id: string };
};

// Inventory stack (drawer screen)
export type InventoryStackParamList = {
    InventoryList: undefined;
    InventoryDetail: { id: string };
    InventoryForm: { id?: string };
};

// Settings stack (drawer screen)
export type SettingsStackParamList = {
    Settings: undefined;
    EditProfile: undefined;
    BusinessSettings: undefined;
    ContractDefaults: undefined;
    Pricing: undefined;
    About: undefined;
    PrivacyPolicy: undefined;
    Terms: undefined;
};

// Bottom tab navigator
export type MainTabParamList = {
    HomeTab: undefined;
    CalendarTab: undefined;
    NewEventPlaceholder: undefined;
    ClientTab: undefined;
    DrawerToggle: undefined;
};

// Drawer navigator
export type DrawerParamList = {
    TabsScreen: undefined;
    ProductStack: undefined;
    InventoryStack: undefined;
    SearchScreen: undefined;
    SettingsStack: undefined;
};

// Root navigator
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};
