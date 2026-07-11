import React, { useCallback, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
	Inbox,
	ExternalLink,
	CheckCircle,
	XCircle,
	Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import paymentSubmissionService from "@/services/paymentSubmissionService";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { ApiHttpError } from "@/lib/api";

const QUERY_KEY = ["payment-submissions", "pending"];

export const PaymentInboxPage: React.FC = () => {
	const { t, i18n } = useTranslation(["payments", "common"]);
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const addToast = useToast((state) => state.addToast);

	const [approveId, setApproveId] = useState<string | null>(null);
	const [rejectId, setRejectId] = useState<string | null>(null);
	const [downloadingReceiptId, setDownloadingReceiptId] = useState<
		string | null
	>(null);
	const [rejectReason, setRejectReason] = useState("");
	const [rejectError, setRejectError] = useState("");

	const {
		data: submissions = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: QUERY_KEY,
		queryFn: () => paymentSubmissionService.getPendingSubmissions(),
	});

	const approveMutation = useMutation({
		mutationFn: (id: string) =>
			paymentSubmissionService.reviewSubmission(id, "approved"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY });
			setApproveId(null);
		},
		onError: () => {
			setApproveId(null);
			addToast(t("payments:errors.approve"), "error");
		},
	});

	const rejectMutation = useMutation({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			paymentSubmissionService.reviewSubmission(id, "rejected", reason),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEY });
			setRejectId(null);
			setRejectReason("");
			setRejectError("");
		},
		onError: () => {
			setRejectId(null);
			setRejectReason("");
			setRejectError("");
			addToast(t("payments:errors.reject"), "error");
		},
	});

	const handleRejectSubmit = useCallback(() => {
		if (!rejectId) return;
		if (rejectReason.trim().length < 10) {
			setRejectError(t("payments:reject.reason_min"));
			return;
		}
		rejectMutation.mutate({ id: rejectId, reason: rejectReason.trim() });
	}, [rejectId, rejectReason, rejectMutation, t]);

	const handleOpenReject = useCallback((id: string) => {
		setRejectId(id);
		setRejectReason("");
		setRejectError("");
	}, []);

	const handleDownloadReceipt = useCallback(
		async (submissionId: string) => {
			const submission = submissions.find((item) => item.id === submissionId);
			if (!submission?.receipt_file_url) return;

			setDownloadingReceiptId(submissionId);
			try {
				await paymentSubmissionService.downloadReceipt(submission);
			} catch (error) {
				addToast(
					error instanceof Error
						? error.message
						: t("common:error.background_update"),
					"error",
				);
			} finally {
				setDownloadingReceiptId(null);
			}
		},
		[addToast, submissions, t],
	);

	const formatDate = (dateStr: string) => {
		try {
			const locale = i18n.language.startsWith("en") ? undefined : es;
			return format(new Date(dateStr), "dd MMM yyyy", { locale });
		} catch {
			return dateStr;
		}
	};

	const formatCurrency = (amount: number) =>
		amount.toLocaleString(i18n.language.startsWith("en") ? "en-US" : "es-MX", {
			style: "currency",
			currency: "MXN",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});

	const normalizedPlan = String(user?.plan || "")
		.trim()
		.toLowerCase();
	const isFreePlan = ["basic", "gratis", "free", "plan_basic"].includes(
		normalizedPlan,
	);

	const shouldShowPlanLocked =
		isFreePlan ||
		(error instanceof ApiHttpError && (error.statusCode === 402 || error.statusCode === 403));

	const errorMessage = error instanceof Error ? error.message : null;

	if (error && !shouldShowPlanLocked) {
		return (
			<div className="p-6 text-center text-text-secondary">
				{errorMessage || t("common:error.loading")}
			</div>
		);
	}

	const pendingForApprove = submissions.find((s) => s.id === approveId);

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="flex items-center gap-3">
				<Inbox className="h-6 w-6 text-primary" />
				<h1 className="text-2xl font-bold text-text">
					{t("payments:inbox.title")}
				</h1>
				{submissions.length > 0 && (
					<span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary text-white text-xs font-bold">
						{submissions.length}
					</span>
				)}
			</div>

			{isLoading && !shouldShowPlanLocked ? (
				<div className="flex justify-center items-center h-48">
					<Loader2 className="h-6 w-6 animate-spin text-primary" />
				</div>
			) : shouldShowPlanLocked ? (
				<div className="flex flex-col items-center justify-center gap-3 py-20 text-text-secondary">
					<Inbox className="h-12 w-12 opacity-60" />
					<p className="text-base font-medium text-center">
						{t("payments:inbox.pro_only")}
					</p>
					<p className="text-sm text-center max-w-xl">
						{t("payments:inbox.pro_only_hint")}
					</p>
				</div>
			) : submissions.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 py-20 text-text-secondary">
					<CheckCircle className="h-12 w-12 text-green-500 opacity-60" />
					<p className="text-base font-medium">{t("payments:inbox.empty")}</p>
				</div>
			) : (
				<div className="rounded-2xl border border-border bg-surface overflow-hidden">
					<div className="overflow-x-auto">
						<table className="data-table">
							<thead>
								<tr>
									{[
										t("payments:table.client"),
										t("payments:table.event"),
										t("payments:table.amount"),
										t("payments:table.reference"),
										t("payments:table.date"),
										t("payments:table.status"),
										"",
									].map((col) => (
										<th
											key={col}
											className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider"
										>
											{col}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{submissions.map((sub) => (
									<tr
										key={sub.id}
										className="hover:bg-surface-alt/50 transition-colors"
									>
										<td className="px-4 py-3 text-sm font-medium text-text whitespace-nowrap">
											{sub.client_name ?? "—"}
										</td>
										<td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
											{sub.event_label ?? "—"}
										</td>
										<td className="px-4 py-3 text-sm font-semibold text-text whitespace-nowrap">
											{formatCurrency(sub.amount)}
										</td>
										<td className="px-4 py-3 text-sm text-text-secondary max-w-[160px] truncate">
											{sub.transfer_ref ?? "—"}
										</td>
										<td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
											{formatDate(sub.submitted_at)}
										</td>
										<td className="px-4 py-3">
											<PaymentStatusBadge status={sub.status} />
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="flex items-center gap-2">
												{sub.receipt_file_url && (
													<button
														type="button"
														onClick={() => handleDownloadReceipt(sub.id)}
														disabled={downloadingReceiptId === sub.id}
														className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-60"
													>
														<ExternalLink className="h-3.5 w-3.5" />
														{downloadingReceiptId === sub.id
															? t("common:status.loading")
															: t("payments:table.receipt")}
													</button>
												)}
												{sub.status === "pending" && (
													<>
														<button
															onClick={() => setApproveId(sub.id)}
															disabled={approveMutation.isPending}
															className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
														>
															<CheckCircle className="h-3.5 w-3.5" />
															{t("payments:actions.approve")}
														</button>
														<button
															onClick={() => handleOpenReject(sub.id)}
															className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error text-white text-xs font-semibold hover:opacity-90 transition-opacity"
														>
															<XCircle className="h-3.5 w-3.5" />
															{t("payments:actions.reject")}
														</button>
													</>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Approve confirmation dialog */}
			<ConfirmDialog
				open={approveId !== null}
				title={t("payments:dialogs.approve_title")}
				description={
					pendingForApprove
						? t("payments:dialogs.approve_description_with_client", {
								amount: formatCurrency(pendingForApprove.amount),
								client:
									pendingForApprove.client_name ??
									t("payments:dialogs.this_client"),
							})
						: t("payments:dialogs.approve_description")
				}
				confirmText={
					approveMutation.isPending
						? t("payments:dialogs.approving")
						: t("payments:actions.approve")
				}
				cancelText={t("common:actions.cancel")}
				onConfirm={() => approveId && approveMutation.mutate(approveId)}
				onCancel={() => setApproveId(null)}
			/>

			{/* Reject modal with reason */}
			<Modal
				isOpen={rejectId !== null}
				onClose={() => {
					setRejectId(null);
					setRejectReason("");
					setRejectError("");
				}}
				title={t("payments:dialogs.reject_title")}
				maxWidth="sm"
				titleId="reject-modal-title"
			>
				<div className="space-y-4">
					<p className="text-sm text-text-secondary">
						{t("payments:dialogs.reject_description")}
					</p>
					<div>
						<textarea
							value={rejectReason}
							onChange={(e) => {
								setRejectReason(e.target.value);
								setRejectError("");
							}}
							placeholder={t("payments:dialogs.reject_placeholder")}
							rows={4}
							className="w-full rounded-xl border border-border bg-surface text-text text-sm p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
						/>
						{rejectError && (
							<p className="mt-1 text-xs text-error">{rejectError}</p>
						)}
					</div>
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={() => {
								setRejectId(null);
								setRejectReason("");
								setRejectError("");
							}}
							className="px-4 py-2 rounded-xl bg-surface-alt text-text border border-border hover:bg-surface transition-colors text-sm font-medium"
						>
							{t("common:actions.cancel")}
						</button>
						<button
							type="button"
							onClick={handleRejectSubmit}
							disabled={rejectMutation.isPending}
							className="px-4 py-2 rounded-xl bg-error text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							{rejectMutation.isPending
								? t("payments:dialogs.rejecting")
								: t("payments:actions.reject")}
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
