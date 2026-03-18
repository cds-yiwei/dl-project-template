import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { GcdsHeading, GcdsNotice, GcdsText } from "@gcds-core/components-react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { Button, ConfirmDialog, DataTable, Input, Modal, Pagination } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
	isForbiddenRequestError,
	isUnauthorizedRequestError,
} from "@/features/auth/auth-api";
import { useAdminListState, useTierManagement } from "@/hooks";
import { releaseActiveElementFocus } from "@/lib/release-active-element-focus";

type TierFormState = {
	name: string;
};

const emptyTierForm: TierFormState = {
	name: "",
};

type TierTableRow = {
	createdAt: string;
	id: number;
	name: string;
};

export const TiersPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { page, searchDraft, setPage, setSearchDraft } = useAdminListState("tiers");
	const itemsPerPage = 10;
	const {
		createTier,
		deleteTier,
		error,
		isCreating,
		isDeleting,
		isLoading,
		isUpdating,
		response,
		tiers,
		updateTier,
	} = useTierManagement(page, itemsPerPage);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [form, setForm] = useState<TierFormState>(emptyTierForm);
	const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
	const [selectedTierName, setSelectedTierName] = useState<string | null>(null);
	const navigate = useNavigate();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	const selectedTier = tiers.find((tier) => tier.name === selectedTierName) ?? null;
	const tierRows: Array<TierTableRow> = tiers.map((tier) => ({
		createdAt: tier.created_at,
		id: tier.id,
		name: tier.name,
	}));
	const tierColumns: Array<DataTableColumn<TierTableRow>> = [
		{ field: "name", headerName: t("tiers.nameLabel"), pinned: "left" },
		{ field: "createdAt", headerName: t("tiers.createdAtLabel") },
	];
	const totalPages = response ? Math.max(1, Math.ceil(response.total_count / response.items_per_page)) : 1;

	useEffect(() => {
		if (!isUnauthorizedRequestError(error)) {
			return;
		}

		void navigate({
			replace: true,
			search: { reason: "expired", redirect: pathname },
			to: "/login",
		});
	}, [error, navigate, pathname]);

	useEffect(() => {
		if (modalMode !== "edit" && !deleteDialogOpen) {
			return;
		}

		if (!selectedTierName || tiers.some((tier) => tier.name === selectedTierName)) {
			return;
		}

		setSelectedTierName(null);
		setDeleteDialogOpen(false);
		setModalMode(null);
		setForm(emptyTierForm);
	}, [deleteDialogOpen, modalMode, selectedTierName, tiers]);

	const closeModal = (): void => {
		setModalMode(null);
		setForm(emptyTierForm);
	};

	const openCreateModal = (): void => {
		releaseActiveElementFocus();
		setSelectedTierName(null);
		setForm(emptyTierForm);
		setModalMode("create");
	};

	const openEditModal = (tierName: string): void => {
		const tier = tiers.find((item) => item.name === tierName);

		if (!tier) {
			return;
		}

		releaseActiveElementFocus();
		setSelectedTierName(tier.name);
		setForm({ name: tier.name });
		setModalMode("edit");
	};

	const handleCreateTier = async (): Promise<void> => {
		await createTier(form);
		setPage(1);
		closeModal();
	};

	const handleUpdateTier = async (): Promise<void> => {
		if (!selectedTier) {
			return;
		}

		await updateTier(selectedTier.name, form);
		setPage(1);
		closeModal();
	};

	const handleDeleteTier = async (): Promise<void> => {
		if (!selectedTier) {
			return;
		}

		await deleteTier(selectedTier.name);
		setPage(1);
		setDeleteDialogOpen(false);
		setSelectedTierName(null);
		closeModal();
	};

	const isModalOpen = modalMode !== null;
	const isSubmitting = modalMode === "create" ? isCreating : isUpdating;

	return (
		<CenteredPageLayout className="max-w-5xl">
			<GcdsHeading tag="h1">{t("tiers.title")}</GcdsHeading>
			<GcdsText>{t("tiers.summary")}</GcdsText>

			{isLoading ? (
				<GcdsNotice noticeRole="info" noticeTitle={t("tiers.loadingTitle")} noticeTitleTag="h2">
					<GcdsText>{t("tiers.loadingBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{error && !isUnauthorizedRequestError(error) ? (
				<GcdsNotice
					noticeRole={isForbiddenRequestError(error) ? "warning" : "danger"}
					noticeTitle={isForbiddenRequestError(error) ? t("tiers.forbiddenTitle") : t("tiers.errorTitle")}
					noticeTitleTag="h2"
				>
					<GcdsText>{isForbiddenRequestError(error) ? t("tiers.forbiddenBody") : t("tiers.errorBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{!isLoading && !error && tiers.length === 0 ? (
				<GcdsNotice noticeRole="warning" noticeTitle={t("tiers.emptyTitle")} noticeTitleTag="h2">
					<GcdsText>{t("tiers.emptyBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{tiers.length > 0 ? (
				<div className="grid gap-300">
					<DataTable
						action={{
							buttonId: (row) => `manage-tier-${row.id}`,
							buttonLabel: t("tiers.manageAction"),
							onAction: (row) => {
								openEditModal(row.name);
							},
							screenReaderLabel: (row) => row.name,
						}}
						columns={tierColumns}
						exportFileName="tiers.csv"
						getRowId={(row) => String(row.id)}
						itemLabel="tiers"
						pagination={false}
						primaryAction={{
							buttonId: "open-create-tier-modal",
							buttonLabel: t("tiers.createAction"),
							onAction: openCreateModal,
						}}
						rows={tierRows}
						searchQuery={searchDraft}
						searchLabel="Search tiers"
						onSearchChange={setSearchDraft}
						searchPlaceholder="Filter by tier name or creation date"
						pageNumber={response?.page ?? page}
						title={t("tiers.title")}
					/>
					<Pagination currentPage={page} label="Tiers pagination" onPageChange={setPage} totalPages={totalPages} />
				</div>
			) : null}

			<Modal
				footer={(
					<>
						<Button buttonRole="secondary" onGcdsClick={closeModal} type="button">
							{t("tiers.cancelAction")}
						</Button>
						{modalMode === "edit" ? (
							<Button buttonRole="danger" onGcdsClick={() => {
								releaseActiveElementFocus();
								setDeleteDialogOpen(true);
							}} type="button">
								{t("tiers.deleteAction")}
							</Button>
						) : null}
						<Button disabled={isSubmitting} onGcdsClick={() => {
							if (modalMode === "create") {
								void handleCreateTier();
								return;
							}

							void handleUpdateTier();
						}} type="button">
							{modalMode === "create"
								? (isCreating ? t("tiers.creatingAction") : t("tiers.createAction"))
								: (isUpdating ? t("tiers.savingAction") : t("tiers.saveAction"))}
						</Button>
					</>
				)}
				isOpen={isModalOpen}
				onClose={closeModal}
				title={modalMode === "create" ? t("tiers.createTitle") : t("tiers.editTitle")}
			>
				<Input
					inputId={modalMode === "create" ? "create-tier-name" : "edit-tier-name"}
					label={t("tiers.nameLabel")}
					name={modalMode === "create" ? "tier-name" : "edit-tier-name"}
					onInput={(event): void => {
						setForm({ name: event.target.value });
					}}
					value={form.name}
				/>
			</Modal>

			<ConfirmDialog
				cancelLabel={t("tiers.cancelAction")}
				confirmLabel={isDeleting ? t("tiers.deletingAction") : t("tiers.confirmDeleteAction")}
				description={t("tiers.deleteConfirmBody", { name: selectedTier?.name ?? "" })}
				isOpen={deleteDialogOpen}
				isPending={isDeleting}
				onClose={() => {
					setDeleteDialogOpen(false);
				}}
				onConfirm={() => {
					void handleDeleteTier();
				}}
				title={t("tiers.deleteConfirmTitle")}
			/>
		</CenteredPageLayout>
	);
};