import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@tests/customRender";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ClientPortalPage } from "./ClientPortalPage";
import paymentSubmissionService from "@/services/paymentSubmissionService";

vi.mock("@/services/paymentSubmissionService", () => ({
	default: {
		getSubmissionHistory: vi.fn(),
		submitPaymentFromPortal: vi.fn(),
	},
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: "es-MX" },
	}),
}));

describe("ClientPortalPage", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", fetchMock);
	});

	it("does not render a receipt download link when public receipt downloads are disabled", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				portal_tier: "pro",
				capabilities: {
					can_submit_payment: true,
					can_view_submission_history: true,
					can_view_rich_event_details: true,
					can_view_milestones: true,
					can_download_receipt_files: false,
				},
				event: {
					id: "event-1",
					event_date: "2026-06-10",
					status: "confirmed",
				},
				organizer: {
					brand_color: "#C4A265",
				},
				client: {
					id: "client-1",
					name: "Ana",
				},
				payment: {
					total: 10000,
					paid: 2500,
					remaining: 7500,
					currency: "MXN",
				},
				milestones: [],
			}),
		});

		(paymentSubmissionService.getSubmissionHistory as any).mockResolvedValue([
			{
				id: "ps-1",
				amount: 2500,
				status: "approved",
				submitted_at: "2026-05-23T00:00:00Z",
				receipt_file_url: "/payment-submissions/ps-1/receipt/proof.png",
			},
		]);

		render(
			<MemoryRouter initialEntries={["/organizer/event/token-123"]}>
				<Routes>
					<Route
						path="/organizer/event/:token"
						element={<ClientPortalPage />}
					/>
				</Routes>
			</MemoryRouter>,
		);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalled();
		});

		fireEvent.click(
			screen.getByRole("button", { name: "portal.payments.tab_historial" }),
		);

		await waitFor(() => {
			expect(
				paymentSubmissionService.getSubmissionHistory,
			).toHaveBeenCalledWith("token-123", "event-1", "client-1");
		});

		expect(
			screen.getByText("portal.payments.receipt_file_received"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "portal.payments.view_receipt" }),
		).not.toBeInTheDocument();
	});
});
