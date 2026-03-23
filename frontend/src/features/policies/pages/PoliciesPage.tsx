import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { Button, ConfirmDialog, DataTable, Heading, Input, Modal, Notice, Pagination, Text } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { getRequestErrorNotice } from "@/fetch";
import { useAdminListState, usePolicyManagement } from "@/hooks";
import { releaseActiveElementFocus } from "@/lib/release-active-element-focus";

type PolicyFormState = {
	action: string;
	resource: string;
	subject: string;
};

const emptyPolicyForm: PolicyFormState = {
	action: "",
	resource: "",
	subject: "",
};

type PolicyTableRow = {
	action: string;
	resource: string;
	subject: string;
	uuid: string;
};

export const PoliciesPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { page, searchDraft, setPage, setSearchDraft } = useAdminListState("policies");
	const itemsPerPage = 10;
	const {
		createPolicy,
		deletePolicy,
		error,
		isCreating,
		isDeleting,
		isLoading,
		isUpdating,
		policies,
		response,
		updatePolicy,
	} = usePolicyManagement(page, itemsPerPage);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [form, setForm] = useState<PolicyFormState>(emptyPolicyForm);
	const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
	const [selectedPolicyUuid, setSelectedPolicyUuid] = useState<string | null>(null);
	const errorNotice = getRequestErrorNotice(error, {
		bodyKey: "policies.errorBody",
		titleKey: "policies.errorTitle",
	});

	const selectedPolicy = policies.find((policy) => policy.uuid === selectedPolicyUuid) ?? null;
	const policyRows: Array<PolicyTableRow> = policies.map((policy) => ({
		action: policy.action,
		resource: policy.resource,
		subject: policy.subject,
		uuid: policy.uuid,
	}));
	const policyColumns: Array<DataTableColumn<PolicyTableRow>> = [
		{ field: "subject", headerName: t("policies.subjectLabel"), pinned: "left" },
		{ field: "resource", headerName: t("policies.resourceLabel") },
		{ field: "action", headerName: t("policies.actionLabel") },
	];
	const totalPages = response ? Math.max(1, Math.ceil(response.total_count / response.items_per_page)) : 1;

	useEffect(() => {
		if (modalMode !== "edit" && !deleteDialogOpen) {
			return;
		}

		if (!selectedPolicyUuid || policies.some((policy) => policy.uuid === selectedPolicyUuid)) {
			return;
		}

		setSelectedPolicyUuid(null);
		setDeleteDialogOpen(false);
		setModalMode(null);
		setForm(emptyPolicyForm);
	}, [deleteDialogOpen, modalMode, policies, selectedPolicyUuid]);

	const closeModal = (): void => {
		setModalMode(null);
		setForm(emptyPolicyForm);
	};

	const openCreateModal = (): void => {
		releaseActiveElementFocus();
		setSelectedPolicyUuid(null);
		setForm(emptyPolicyForm);
		setModalMode("create");
	};

	const openEditModal = (policyUuid: string): void => {
		const policy = policies.find((item) => item.uuid === policyUuid);

		if (!policy) {
			return;
		}

		releaseActiveElementFocus();
		setSelectedPolicyUuid(policy.uuid);
		setForm({
			action: policy.action,
			resource: policy.resource,
			subject: policy.subject,
		});
		setModalMode("edit");
	};

	const handleCreatePolicy = async (): Promise<void> => {
		await createPolicy(form);
		setPage(1);
		closeModal();
	};

	const handleUpdatePolicy = async (): Promise<void> => {
		if (!selectedPolicy) {
			return;
		}

		await updatePolicy(selectedPolicy.uuid, form);
		setPage(1);
		closeModal();
	};

	const handleDeletePolicy = async (): Promise<void> => {
		if (!selectedPolicy) {
			return;
		}

		await deletePolicy(selectedPolicy.uuid);
		setPage(1);
		setDeleteDialogOpen(false);
		setSelectedPolicyUuid(null);
		closeModal();
	};

	const isModalOpen = modalMode !== null;
	const isSubmitting = modalMode === "create" ? isCreating : isUpdating;

	return (
		<CenteredPageLayout className="max-w-5xl">
			<Heading tag="h1">{t("policies.title")}</Heading>
			<Text>{t("policies.summary")}</Text>

			{isLoading ? (
				<Notice noticeRole="info" noticeTitle={t("policies.loadingTitle")} noticeTitleTag="h2">
					<Text>{t("policies.loadingBody")}</Text>
				</Notice>
			) : null}

			{errorNotice ? (
				<Notice noticeRole={errorNotice.noticeRole} noticeTitle={t(errorNotice.titleKey as never)} noticeTitleTag="h2">
					<Text>{t(errorNotice.bodyKey as never)}</Text>
				</Notice>
			) : null}

			{!isLoading && !error && policies.length === 0 ? (
				<Notice noticeRole="warning" noticeTitle={t("policies.emptyTitle")} noticeTitleTag="h2">
					<Text>{t("policies.emptyBody")}</Text>
				</Notice>
			) : null}

			{policies.length > 0 ? (
				<div className="grid gap-300">
					<DataTable
						action={{
							buttonId: (row) => `manage-policy-${row.uuid}`,
							buttonLabel: t("policies.manageAction"),
							onAction: (row) => {
								openEditModal(row.uuid);
							},
							screenReaderLabel: (row) => `${row.subject} ${row.resource}`,
						}}
						columns={policyColumns}
						exportFileName="policies.csv"
						getRowId={(row) => row.uuid}
						itemLabel="policies"
						pagination={false}
						primaryAction={{
							buttonId: "open-create-policy-modal",
							buttonLabel: t("policies.createAction"),
							onAction: openCreateModal,
						}}
						rows={policyRows}
						searchQuery={searchDraft}
						searchLabel="Search policies"
						onSearchChange={setSearchDraft}
						searchPlaceholder="Filter by subject, resource, or action"
						pageNumber={response?.page ?? page}
						title={t("policies.title")}
					/>
					<Pagination currentPage={page} label="Policies pagination" onPageChange={setPage} totalPages={totalPages} />
				</div>
			) : null}

			<Modal
				footer={(
					<>
						<Button buttonRole="secondary" onGcdsClick={closeModal} type="button">
							{t("policies.cancelAction")}
						</Button>
						{modalMode === "edit" ? (
							<Button buttonRole="danger" onGcdsClick={() => {
								releaseActiveElementFocus();
								setDeleteDialogOpen(true);
							}} type="button">
								{t("policies.deleteAction")}
							</Button>
						) : null}
						<Button disabled={isSubmitting} onGcdsClick={() => {
							if (modalMode === "create") {
								void handleCreatePolicy();
								return;
							}

							void handleUpdatePolicy();
						}} type="button">
							{modalMode === "create"
								? (isCreating ? t("policies.creatingAction") : t("policies.createAction"))
								: (isUpdating ? t("policies.savingAction") : t("policies.saveAction"))}
						</Button>
					</>
				)}
				isOpen={isModalOpen}
				onClose={closeModal}
				size="wide"
				title={modalMode === "create" ? t("policies.createTitle") : t("policies.editTitle")}
			>
				<div className="grid gap-200 md:grid-cols-3">
					<Input inputId={modalMode === "create" ? "create-policy-subject" : "edit-policy-subject"} label={t("policies.subjectLabel")} name={modalMode === "create" ? "subject" : "edit-subject"} onInput={(event): void => {
						setForm((current) => ({ ...current, subject: event.target.value }));
					}} value={form.subject} />
					<Input inputId={modalMode === "create" ? "create-policy-resource" : "edit-policy-resource"} label={t("policies.resourceLabel")} name={modalMode === "create" ? "resource" : "edit-resource"} onInput={(event): void => {
						setForm((current) => ({ ...current, resource: event.target.value }));
					}} value={form.resource} />
					<Input inputId={modalMode === "create" ? "create-policy-action" : "edit-policy-action"} label={t("policies.actionLabel")} name={modalMode === "create" ? "action" : "edit-action"} onInput={(event): void => {
						setForm((current) => ({ ...current, action: event.target.value }));
					}} value={form.action} />
				</div>
			</Modal>

			<ConfirmDialog
				cancelLabel={t("policies.cancelAction")}
				confirmLabel={isDeleting ? t("policies.deletingAction") : t("policies.confirmDeleteAction")}
				description={t("policies.deleteConfirmBody", {
					action: selectedPolicy?.action ?? "",
					resource: selectedPolicy?.resource ?? "",
					subject: selectedPolicy?.subject ?? "",
				})}
				isOpen={deleteDialogOpen}
				isPending={isDeleting}
				onClose={() => {
					setDeleteDialogOpen(false);
				}}
				onConfirm={() => {
					void handleDeletePolicy();
				}}
				title={t("policies.deleteConfirmTitle")}
			/>
		</CenteredPageLayout>
	);
};