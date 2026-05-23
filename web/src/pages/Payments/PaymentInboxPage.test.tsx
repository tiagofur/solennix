import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@tests/customRender";
import { MemoryRouter } from "react-router-dom";
import { PaymentInboxPage } from "./PaymentInboxPage";
import paymentSubmissionService from "@/services/paymentSubmissionService";
import { useToast } from "@/hooks/useToast";

vi.mock("@/services/paymentSubmissionService", () => ({
	default: {
		getPendingSubmissions: vi.fn(),
		reviewSubmission: vi.fn(),
		downloadReceipt: vi.fn(),
	},
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: "es-MX" },
	}),
}));

vi.mock("@/contexts/AuthContext", () => ({
	useAuth: () => ({
		user: { plan: "pro" },
	}),
}));

vi.mock("@/hooks/useToast", () => ({
	useToast: vi.fn(),
}));

describe("PaymentInboxPage", () => {
	const addToast = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useToast).mockImplementation(
			(
				selector?: (state: {
					toasts: Array<{
						id: string;
						message: string;
						type: "success" | "error" | "info";
					}>;
					addToast: typeof addToast;
					removeToast: (id: string) => void;
				}) => unknown,
			) => {
				const state = {
					toasts: [],
					addToast,
					removeToast: vi.fn(),
				};
				return selector ? selector(state) : state;
			},
		);
	});

	it("downloads receipts through the authenticated service instead of a raw public link", async () => {
		const submission = {
			id: "ps-1",
			client_name: "Ana",
			event_label: "Boda",
			amount: 2500,
			transfer_ref: "SPEI-123",
			submitted_at: "2026-05-23T00:00:00Z",
			status: "pending",
			receipt_file_url: "/payment-submissions/ps-1/receipt/proof.png",
		};

		vi.mocked(paymentSubmissionService.getPendingSubmissions).mockResolvedValue(
			[submission as any],
		);
		vi.mocked(paymentSubmissionService.downloadReceipt).mockResolvedValue(
			undefined,
		);

		render(
			<MemoryRouter>
				<PaymentInboxPage />
			</MemoryRouter>,
		);

		await waitFor(() => {
			expect(screen.getByText("Ana")).toBeInTheDocument();
		});

		fireEvent.click(
			screen.getByRole("button", { name: "payments:table.receipt" }),
		);

		await waitFor(() => {
			expect(paymentSubmissionService.downloadReceipt).toHaveBeenCalledWith(
				submission,
			);
		});
	});

	it("shows a toast when the authenticated receipt download fails", async () => {
		const submission = {
			id: "ps-2",
			client_name: "Luis",
			event_label: "XV años",
			amount: 1800,
			transfer_ref: "SPEI-555",
			submitted_at: "2026-05-23T00:00:00Z",
			status: "pending",
			receipt_file_url: "/payment-submissions/ps-2/receipt/proof.pdf",
		};

		vi.mocked(paymentSubmissionService.getPendingSubmissions).mockResolvedValue(
			[submission as any],
		);
		vi.mocked(paymentSubmissionService.downloadReceipt).mockRejectedValue(
			new Error("Receipt download failed"),
		);

		render(
			<MemoryRouter>
				<PaymentInboxPage />
			</MemoryRouter>,
		);

		await waitFor(() => {
			expect(screen.getByText("Luis")).toBeInTheDocument();
		});

		fireEvent.click(
			screen.getByRole("button", { name: "payments:table.receipt" }),
		);

		await waitFor(() => {
			expect(addToast).toHaveBeenCalledWith("Receipt download failed", "error");
		});
	});
});
