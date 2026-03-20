import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { Button, ConfirmDialog, DataTable, Heading, Input, Modal, Notice, Pagination, Text } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { getRequestErrorNotice } from "@/fetch";
import { useAdminListState, useRoleManagement } from "@/hooks";
import { releaseActiveElementFocus } from "@/lib/release-active-element-focus";

type RoleFormState = {
	description: string;
	name: string;
};

const emptyRoleForm: RoleFormState = {
	description: "",
	name: "",
};

type RoleTableRow = {
	description: string;
	id: number;
	name: string;
};

export const RolesPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { page, searchDraft, setPage, setSearchDraft } = useAdminListState("roles");
	const itemsPerPage = 10;
	const {
		createRole,
		deleteRole,
		error,
		isCreating,
		isDeleting,
		isLoading,
		isUpdating,
		response,
		roles,
		updateRole,
	} = useRoleManagement(page, itemsPerPage);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [form, setForm] = useState<RoleFormState>(emptyRoleForm);
	const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
	const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
	const errorNotice = getRequestErrorNotice(error, {
		bodyKey: "roles.errorBody",
		titleKey: "roles.errorTitle",
	});

	const selectedRole = roles.find((role) => role.name === selectedRoleName) ?? null;
	const roleRows: Array<RoleTableRow> = roles.map((role) => ({
		description: role.description ?? t("roles.noDescription"),
		id: role.id,
		name: role.name,
	}));
	const roleColumns: Array<DataTableColumn<RoleTableRow>> = [
		{ field: "name", headerName: t("roles.nameLabel"), pinned: "left" },
		{ field: "description", headerName: t("roles.descriptionLabel") },
	];
	const totalPages = response ? Math.max(1, Math.ceil(response.total_count / response.items_per_page)) : 1;

	useEffect(() => {
		if (modalMode !== "edit" && !deleteDialogOpen) {
			return;
		}

		if (!selectedRoleName || roles.some((role) => role.name === selectedRoleName)) {
			return;
		}

		setSelectedRoleName(null);
		setDeleteDialogOpen(false);
		setModalMode(null);
		setForm(emptyRoleForm);
	}, [deleteDialogOpen, modalMode, roles, selectedRoleName]);

	const closeModal = (): void => {
		setModalMode(null);
		setForm(emptyRoleForm);
	};

	const openCreateModal = (): void => {
		releaseActiveElementFocus();
		setSelectedRoleName(null);
		setForm(emptyRoleForm);
		setModalMode("create");
	};

	const openEditModal = (roleName: string): void => {
		const role = roles.find((item) => item.name === roleName);

		if (!role) {
			return;
		}

		releaseActiveElementFocus();
		setSelectedRoleName(role.name);
		setForm({
			description: role.description ?? "",
			name: role.name,
		});
		setModalMode("edit");
	};

	const handleCreateRole = async (): Promise<void> => {
		await createRole(form);
		setPage(1);
		closeModal();
	};

	const handleUpdateRole = async (): Promise<void> => {
		if (!selectedRole) {
			return;
		}

		await updateRole(selectedRole.name, form);
		setPage(1);
		closeModal();
	};

	const handleDeleteRole = async (): Promise<void> => {
		if (!selectedRole) {
			return;
		}

		await deleteRole(selectedRole.name);
		setPage(1);
		setDeleteDialogOpen(false);
		setSelectedRoleName(null);
		closeModal();
	};

	const isModalOpen = modalMode !== null;
	const isSubmitting = modalMode === "create" ? isCreating : isUpdating;

	return (
		<CenteredPageLayout className="max-w-5xl">
			<Heading tag="h1">{t("roles.title")}</Heading>
			<Text>{t("roles.summary")}</Text>

			{isLoading ? (
				<Notice noticeRole="info" noticeTitle={t("roles.loadingTitle")} noticeTitleTag="h2">
					<Text>{t("roles.loadingBody")}</Text>
				</Notice>
			) : null}

			{errorNotice ? (
				<Notice noticeRole={errorNotice.noticeRole} noticeTitle={t(errorNotice.titleKey as never)} noticeTitleTag="h2">
					<Text>{t(errorNotice.bodyKey as never)}</Text>
				</Notice>
			) : null}

			{!isLoading && !error && roles.length === 0 ? (
				<Notice noticeRole="warning" noticeTitle={t("roles.emptyTitle")} noticeTitleTag="h2">
					<Text>{t("roles.emptyBody")}</Text>
				</Notice>
			) : null}

			{roles.length > 0 ? (
				<div className="grid gap-300">
					<DataTable
						action={{
							buttonId: (row) => `manage-role-${row.id}`,
							buttonLabel: t("roles.manageAction"),
							onAction: (row) => {
								openEditModal(row.name);
							},
							screenReaderLabel: (row) => row.name,
						}}
						columns={roleColumns}
						exportFileName="roles.csv"
						getRowId={(row) => String(row.id)}
						itemLabel="roles"
						pagination={false}
						primaryAction={{
							buttonId: "open-create-role-modal",
							buttonLabel: t("roles.createAction"),
							onAction: openCreateModal,
						}}
						rows={roleRows}
						searchQuery={searchDraft}
						searchLabel="Search roles"
						onSearchChange={setSearchDraft}
						searchPlaceholder="Filter by role name or description"
						pageNumber={response?.page ?? page}
						title={t("roles.title")}
					/>
					<Pagination currentPage={page} label="Roles pagination" onPageChange={setPage} totalPages={totalPages} />
				</div>
			) : null}

			<Modal
				footer={(
					<>
						<Button buttonRole="secondary" onGcdsClick={closeModal} type="button">
							{t("roles.cancelAction")}
						</Button>
						{modalMode === "edit" ? (
							<Button buttonRole="danger" onGcdsClick={() => {
								releaseActiveElementFocus();
								setDeleteDialogOpen(true);
							}} type="button">
								{t("roles.deleteAction")}
							</Button>
						) : null}
						<Button disabled={isSubmitting} onGcdsClick={() => {
							if (modalMode === "create") {
								void handleCreateRole();
								return;
							}

							void handleUpdateRole();
						}} type="button">
							{modalMode === "create"
								? (isCreating ? t("roles.creatingAction") : t("roles.createAction"))
								: (isUpdating ? t("roles.savingAction") : t("roles.saveAction"))}
						</Button>
					</>
				)}
				isOpen={isModalOpen}
				onClose={closeModal}
				title={modalMode === "create" ? t("roles.createTitle") : t("roles.editTitle")}
			>
				<Input
					inputId={modalMode === "create" ? "create-role-name" : "edit-role-name"}
					label={t("roles.nameLabel")}
					name={modalMode === "create" ? "role-name" : "edit-role-name"}
					onInput={(event): void => {
						setForm((current) => ({ ...current, name: event.target.value }));
					}}
					value={form.name}
				/>
				<Input
					inputId={modalMode === "create" ? "create-role-description" : "edit-role-description"}
					label={t("roles.descriptionLabel")}
					name={modalMode === "create" ? "role-description" : "edit-role-description"}
					onInput={(event): void => {
						setForm((current) => ({ ...current, description: event.target.value }));
					}}
					value={form.description}
				/>
			</Modal>

			<ConfirmDialog
				cancelLabel={t("roles.cancelAction")}
				confirmLabel={isDeleting ? t("roles.deletingAction") : t("roles.confirmDeleteAction")}
				description={t("roles.deleteConfirmBody", { name: selectedRole?.name ?? "" })}
				isOpen={deleteDialogOpen}
				isPending={isDeleting}
				onClose={() => {
					setDeleteDialogOpen(false);
				}}
				onConfirm={() => {
					void handleDeleteRole();
				}}
				title={t("roles.deleteConfirmTitle")}
			/>
		</CenteredPageLayout>
	);
};