import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { Button, ConfirmDialog, DataTable, Heading, Input, Modal, Notice, Pagination, Text } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
	isForbiddenRequestError,
} from "@/fetch";
import { getRequestErrorNotice } from "@/fetch";
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
	name: string;
	uuid: string;
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
	const [selectedTierUuid, setSelectedTierUuid] = useState<string | null>(null);
	const errorNotice = error && isForbiddenRequestError(error)
		? {
			bodyKey: "tiers.forbiddenBody",
			noticeRole: "warning" as const,
			titleKey: "tiers.forbiddenTitle",
		}
		: getRequestErrorNotice(error, {
			bodyKey: "tiers.errorBody",
			titleKey: "tiers.errorTitle",
		});

	const selectedTier = tiers.find((tier) => tier.uuid === selectedTierUuid) ?? null;
	const tierRows: Array<TierTableRow> = tiers.map((tier) => ({
		createdAt: tier.created_at,
		name: tier.name,
		uuid: tier.uuid,
	}));
	const tierColumns: Array<DataTableColumn<TierTableRow>> = [
		{ field: "name", headerName: t("tiers.nameLabel"), pinned: "left" },
		{ field: "createdAt", headerName: t("tiers.createdAtLabel") },
	];
	const totalPages = response ? Math.max(1, Math.ceil(response.total_count / response.items_per_page)) : 1;

	useEffect(() => {
		if (modalMode !== "edit" && !deleteDialogOpen) {
			return;
		}

		if (!selectedTierUuid || tiers.some((tier) => tier.uuid === selectedTierUuid)) {
			return;
		}

		setSelectedTierUuid(null);
		setDeleteDialogOpen(false);
		setModalMode(null);
		setForm(emptyTierForm);
	}, [deleteDialogOpen, modalMode, selectedTierUuid, tiers]);

	const closeModal = (): void => {
		setModalMode(null);
		setForm(emptyTierForm);
	};

	const openCreateModal = (): void => {
		releaseActiveElementFocus();
		setSelectedTierUuid(null);
		setForm(emptyTierForm);
		setModalMode("create");
	};

	const openEditModal = (tierUuid: string): void => {
		const tier = tiers.find((item) => item.uuid === tierUuid);

		if (!tier) {
			return;
		}

		releaseActiveElementFocus();
		setSelectedTierUuid(tier.uuid);
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

		await updateTier(selectedTier.uuid, form);
		setPage(1);
		closeModal();
	};

	const handleDeleteTier = async (): Promise<void> => {
		if (!selectedTier) {
			return;
		}

		await deleteTier(selectedTier.uuid);
		setPage(1);
		setDeleteDialogOpen(false);
		setSelectedTierUuid(null);
		closeModal();
	};

	const isModalOpen = modalMode !== null;
	const isSubmitting = modalMode === "create" ? isCreating : isUpdating;

	return (
		<CenteredPageLayout className="max-w-5xl">
			<Heading tag="h1">{t("tiers.title")}</Heading>
			<Text>{t("tiers.summary")}</Text>

			{isLoading ? (
				<Notice noticeRole="info" noticeTitle={t("tiers.loadingTitle")} noticeTitleTag="h2">
					<Text>{t("tiers.loadingBody")}</Text>
				</Notice>
			) : null}

			{errorNotice ? (
				<Notice
					noticeRole={errorNotice.noticeRole}
					noticeTitle={t(errorNotice.titleKey as never)}
					noticeTitleTag="h2"
				>
					<Text>{t(errorNotice.bodyKey as never)}</Text>
				</Notice>
			) : null}

			{!isLoading && !error && tiers.length === 0 ? (
				<Notice noticeRole="warning" noticeTitle={t("tiers.emptyTitle")} noticeTitleTag="h2">
					<Text>{t("tiers.emptyBody")}</Text>
				</Notice>
			) : null}

			{tiers.length > 0 ? (
				<div className="grid gap-300">
					<DataTable
						action={{
							buttonId: (row) => `manage-tier-${row.uuid}`,
							buttonLabel: t("tiers.manageAction"),
							onAction: (row) => {
								openEditModal(row.uuid);
							},
							screenReaderLabel: (row) => row.name,
						}}
						columns={tierColumns}
						exportFileName="tiers.csv"
						getRowId={(row) => row.uuid}
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