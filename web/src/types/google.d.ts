/** Google Identity Services (GSI) type declarations */
declare namespace google {
  namespace accounts {
    namespace id {
      interface CredentialResponse {
        credential: string;
        select_by: string;
      }

      interface GsiButtonConfiguration {
        type?: "standard" | "icon";
        theme?: "outline" | "filled_blue" | "filled_black";
        size?: "large" | "medium" | "small";
        text?: "signin_with" | "signup_with" | "continue_with" | "signin";
        shape?: "rectangular" | "pill" | "circle" | "square";
        logo_alignment?: "left" | "center";
        width?: string | number;
        locale?: string;
      }

      function initialize(config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }): void;

      function renderButton(
        parent: HTMLElement,
        options: GsiButtonConfiguration
      ): void;

      function prompt(momentListener?: (notification: PromptMomentNotification) => void): void;

      interface PromptMomentNotification {
        isNotDisplayed(): boolean;
        isSkippedMoment(): boolean;
        isDismissedMoment(): boolean;
        getNotDisplayedReason(): string;
        getSkippedReason(): string;
        getDismissedReason(): string;
      }
      function disableAutoSelect(): void;
    }
  }
}
