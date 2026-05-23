import { api } from "@/lib/api";

export interface PaymentSubmission {
	id: string;
	event_id: string;
	client_id: string;
	user_id: string;
	amount: number;
	transfer_ref?: string;
	receipt_file_url?: string;
	status: "pending" | "approved" | "rejected";
	submitted_at: string;
	reviewed_by?: string;
	reviewed_at?: string;
	rejection_reason?: string;
	linked_payment_id?: string;
	created_at: string;
	updated_at: string;
	client_name?: string;
	event_label?: string;
}

export interface CreatePaymentSubmissionRequest {
	event_id: string;
	client_id: string;
	amount: number;
	transfer_ref?: string;
	receipt_file?: File;
}

export interface ReviewPaymentSubmissionRequest {
	status: "approved" | "rejected";
	rejection_reason?: string;
}

class PaymentSubmissionService {
	/**
	 * Client submits a payment from the public portal
	 * POST /api/public/events/{token}/payment-submissions
	 */
	async submitPaymentFromPortal(
		token: string,
		eventId: string,
		clientId: string,
		amount: number,
		transferRef?: string,
		receiptFile?: File,
	): Promise<PaymentSubmission> {
		const formData = new FormData();
		formData.append("event_id", eventId);
		formData.append("client_id", clientId);
		formData.append("amount", amount.toString());
		if (transferRef) formData.append("transfer_ref", transferRef);
		if (receiptFile) formData.append("receipt_file", receiptFile);

		const response = await api.postFormData<{ data: PaymentSubmission }>(
			`/public/events/${token}/payment-submissions`,
			formData,
		);
		return response.data;
	}

	/**
	 * Get client's payment submission history from portal
	 * GET /api/public/events/{token}/payment-submissions?event_id=...&client_id=...
	 */
	async getSubmissionHistory(
		token: string,
		eventId: string,
		clientId: string,
	): Promise<PaymentSubmission[]> {
		const response = await api.get<{ data: PaymentSubmission[] }>(
			`/public/events/${token}/payment-submissions`,
			{
				event_id: eventId,
				client_id: clientId,
			},
		);
		return response.data || [];
	}

	/**
	 * Organizer gets pending payment submissions
	 * GET /api/payment-submissions
	 */
	async getPendingSubmissions(): Promise<PaymentSubmission[]> {
		const response = await api.get<{ data: PaymentSubmission[] }>(
			"/payment-submissions",
		);
		return response.data || [];
	}

	/**
	 * Organizer reviews (approves/rejects) a submission
	 * PATCH /api/payment-submissions/{id}
	 */
	async reviewSubmission(
		submissionId: string,
		status: "approved" | "rejected",
		rejectionReason?: string,
	): Promise<PaymentSubmission> {
		const response = await api.patch<{ data: PaymentSubmission }>(
			`/payment-submissions/${submissionId}`,
			{
				status,
				rejection_reason: rejectionReason,
			},
		);
		return response.data;
	}

	async downloadReceipt(submission: PaymentSubmission): Promise<void> {
		if (!submission.receipt_file_url) {
			throw new Error("Receipt file is unavailable");
		}

		const { blob, headers } = await api.getBlob(submission.receipt_file_url);
		const objectURL = URL.createObjectURL(blob);
		const disposition = headers.get("Content-Disposition") ?? "";
		const filenameMatch = disposition.match(/filename="([^"]+)"/);
		const fallbackName =
			submission.receipt_file_url.split("/").pop() ||
			`receipt-${submission.id}`;
		const filename = filenameMatch?.[1] ?? fallbackName;

		const anchor = document.createElement("a");
		anchor.href = objectURL;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(objectURL);
	}
}

export default new PaymentSubmissionService();
