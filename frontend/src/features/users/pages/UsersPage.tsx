import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { Button, ConfirmDialog, DataTable, Heading, Input, Modal, Notice, Pagination, Select, Text } from "@/components/ui";
import { getRequestErrorNotice } from "@/fetch";
import { useAdminListState, useRoles, useUserManagement, useUserRole } from "@/hooks";
import { releaseActiveElementFocus } from "@/lib/release-active-element-focus";

type CreateUserFormState = {
	email: string;
	name: string;
	password: string;
	username: string;
};

type EditUserFormState = {
	email: string;
	name: string;
	username: string;
};

const emptyCreateForm: CreateUserFormState = {
	email: "",
	name: "",
	password: "",
	username: "",
};

const emptyEditForm: EditUserFormState = {
	email: "",
	name: "",
	username: "",
};

type UserTableRow = {
	email: string;
	name: string;
	provider: string;
	roleName: string;
	uuid: string;
	username: string;
};

export const UsersPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { page, searchDraft, setPage, setSearchDraft } = useAdminListState("users");
	const itemsPerPage = 10;
	const {
		createUser,
		deleteUser,
		error,
		isCreating,
		isDeleting,
		isLoading,
		isUpdating,
		response,
		updateUser,
		users,
	} = useUserManagement(page, itemsPerPage);
	const { error: rolesError, isLoading: isRolesLoading, roles } = useRoles();
	const [createForm, setCreateForm] = useState<CreateUserFormState>(emptyCreateForm);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editForm, setEditForm] = useState<EditUserFormState>(emptyEditForm);
	const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
	const [selectedRoleUuid, setSelectedRoleUuid] = useState<string>("");
	const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
	const {
		error: userRoleError,
		isLoading: isUserRoleLoading,
		isUpdating: isUpdatingRole,
		role,
		updateUserRole,
	} = useUserRole(modalMode === "edit" ? selectedUsername : null);
	const selectedUser = users.find((user) => user.uuid === selectedUsername) ?? null;
	const currentRoleName = role?.name ?? t("users.noRole");
	const combinedError = error ?? rolesError ?? userRoleError;
	const errorNotice = getRequestErrorNotice(combinedError, {
		bodyKey: "users.errorBody",
		titleKey: "users.errorTitle",
	});
	const isBusy = isLoading || isRolesLoading;
	const userRows: Array<UserTableRow> = users.map((user) => ({
		email: user.email,
		name: user.name,
		provider: user.auth_provider ?? t("users.noProvider"),
		roleName: roles.find((entry) => entry.uuid === user.role_uuid)?.name ?? (user.role_uuid == null ? t("users.noRole") : t("users.manageRoleTitle")),
		uuid: user.uuid,
		username: user.username,
	}));
	const userColumns: Array<DataTableColumn<UserTableRow>> = [
		{ field: "name", headerName: t("users.nameLabel"), pinned: "left" },
		{ field: "username", headerName: t("users.usernameLabel") },
		{ field: "email", headerName: t("users.emailLabel") },
		{ field: "provider", headerName: "Provider" },
		{ field: "roleName", headerName: t("users.roleLabel") },
	];
	const totalPages = response ? Math.max(1, Math.ceil(response.total_count / response.items_per_page)) : 1;

	useEffect(() => {
		setSelectedRoleUuid(selectedUser?.role_uuid ?? "");
	}, [selectedUser]);

	useEffect(() => {
		if (modalMode !== "edit" && !deleteDialogOpen) {
			return;
		}

		if (!selectedUsername || users.some((user) => user.uuid === selectedUsername)) {
			return;
		}

		setDeleteDialogOpen(false);
		setEditForm(emptyEditForm);
		setModalMode(null);
		setSelectedRoleUuid("");
		setSelectedUsername(null);
	}, [deleteDialogOpen, modalMode, selectedUsername, users]);

	const closeModal = (): void => {
		setModalMode(null);
		setCreateForm(emptyCreateForm);
		setDeleteDialogOpen(false);
		setEditForm(emptyEditForm);
		setSelectedRoleUuid("");
		setSelectedUsername(null);
	};

	const openCreateModal = (): void => {
		releaseActiveElementFocus();
		setCreateForm(emptyCreateForm);
		setSelectedUsername(null);
		setSelectedRoleUuid("");
		setModalMode("create");
	};

	const openEditModal = (userUuid: string): void => {
		const user = users.find((entry) => entry.uuid === userUuid);

		if (!user) {
			return;
		}

		releaseActiveElementFocus();
		setEditForm({
			email: user.email,
			name: user.name,
			username: user.username,
		});
		setSelectedUsername(user.uuid);
		setModalMode("edit");
	};

	const handleCreateUser = async (): Promise<void> => {
		await createUser(createForm);
		setPage(1);
		closeModal();
	};

	const handleUpdateUser = async (): Promise<void> => {
		if (!selectedUser) {
			return;
		}

		await updateUser(selectedUser.uuid, editForm);
		setPage(1);
		closeModal();
	};

	const handleDeleteUser = async (): Promise<void> => {
		if (!selectedUser) {
			return;
		}

		await deleteUser(selectedUser.uuid);
		setPage(1);
		closeModal();
	};

	const handleSaveRole = async (): Promise<void> => {
		if (!selectedUser) {
			return;
		}

		await updateUserRole(selectedUser.uuid, {
			role_uuid: selectedRoleUuid.length > 0 ? selectedRoleUuid : null,
		});
		setPage(1);
	};

	const isModalOpen = modalMode !== null;
	const modalTitle = modalMode === "create" ? t("users.createTitle") : t("users.editTitle");
	const saveActionLabel = modalMode === "create"
		? (isCreating ? t("users.creatingAction") : t("users.createAction"))
		: (isUpdating ? t("users.savingAction") : t("users.saveAction"));

	return (
		<CenteredPageLayout className="max-w-5xl">
			<Heading tag="h1">{t("users.title")}</Heading>
			<Text>{t("users.summary")}</Text>

			{isBusy ? (
				<Notice noticeRole="info" noticeTitle={t("users.loadingTitle")} noticeTitleTag="h2">
					<Text>{t("users.loadingBody")}</Text>
				</Notice>
			) : null}

			{errorNotice ? (
				<Notice noticeRole={errorNotice.noticeRole} noticeTitle={t(errorNotice.titleKey as never)} noticeTitleTag="h2">
					<Text>{t(errorNotice.bodyKey as never)}</Text>
				</Notice>
			) : null}

			{!isBusy && !combinedError && users.length === 0 ? (
				<Notice noticeRole="warning" noticeTitle={t("users.emptyTitle")} noticeTitleTag="h2">
					<Text>{t("users.emptyBody")}</Text>
				</Notice>
			) : null}

			{users.length > 0 ? (
				<div className="grid gap-300">
					<DataTable
						action={{
							buttonId: (row) => `manage-user-${row.uuid}`,
							buttonLabel: t("users.manageAction"),
							onAction: (row) => {
								openEditModal(row.uuid);
							},
							screenReaderLabel: (row) => row.name,
						}}
						columns={userColumns}
						exportFileName="users.csv"
						getRowId={(row) => row.uuid}
						itemLabel="users"
						pagination={false}
						primaryAction={{
							buttonId: "open-create-user-modal",
							buttonLabel: t("users.createAction"),
							onAction: openCreateModal,
						}}
						rows={userRows}
						searchQuery={searchDraft}
						searchLabel="Search users"
						onSearchChange={setSearchDraft}
						searchPlaceholder="Filter by name, email, provider, or role"
						pageNumber={response?.page ?? page}
						title={t("users.title")}
					/>
					<Pagination currentPage={page} label="Users pagination" onPageChange={setPage} totalPages={totalPages} />
				</div>
			) : null}

			<Modal
				footer={(
					<>
						<Button buttonRole="secondary" onGcdsClick={closeModal} type="button">
							{t("users.cancelAction")}
						</Button>
						{modalMode === "edit" ? (
							<Button buttonRole="danger" onGcdsClick={() => {
								releaseActiveElementFocus();
								setDeleteDialogOpen(true);
							}} type="button">
								{t("users.deleteAction")}
							</Button>
						) : null}
						<Button disabled={modalMode === "create" ? isCreating : isUpdating} onGcdsClick={() => {
							if (modalMode === "create") {
								void handleCreateUser();
								return;
							}

							void handleUpdateUser();
						}} type="button">
							{saveActionLabel}
						</Button>
					</>
				)}
				isOpen={isModalOpen}
				onClose={closeModal}
				size="wide"
				title={modalTitle}
			>
				{modalMode === "create" ? (
					<div className="grid gap-200 md:grid-cols-2">
						<Input inputId="create-user-name" label={t("users.nameLabel")} name="name" onInput={(event): void => {
							setCreateForm((current) => ({ ...current, name: event.target.value }));
						}} value={createForm.name} />
						<Input inputId="create-user-username" label={t("users.usernameLabel")} name="username" onInput={(event): void => {
							setCreateForm((current) => ({ ...current, username: event.target.value }));
						}} value={createForm.username} />
						<Input inputId="create-user-email" label={t("users.emailLabel")} name="email" onInput={(event): void => {
							setCreateForm((current) => ({ ...current, email: event.target.value }));
						}} type="email" value={createForm.email} />
						<Input inputId="create-user-password" label={t("users.passwordLabel")} name="password" onInput={(event): void => {
							setCreateForm((current) => ({ ...current, password: event.target.value }));
						}} type="password" value={createForm.password} />
					</div>
				) : (
					<div className="grid gap-300">
						<div className="grid gap-200 md:grid-cols-2">
							<Input inputId="edit-user-name" label={t("users.nameLabel")} name="edit-name" onInput={(event): void => {
								setEditForm((current) => ({ ...current, name: event.target.value }));
							}} value={editForm.name} />
							<Input inputId="edit-user-username" label={t("users.usernameLabel")} name="edit-username" onInput={(event): void => {
								setEditForm((current) => ({ ...current, username: event.target.value }));
							}} value={editForm.username} />
							<Input inputId="edit-user-email" label={t("users.emailLabel")} name="edit-email" onInput={(event): void => {
								setEditForm((current) => ({ ...current, email: event.target.value }));
							}} type="email" value={editForm.email} />
						</div>
						<div className="grid gap-200 border-t border-[var(--gcds-border-default)] pt-250">
							<Heading tag="h2">{t("users.manageRoleTitle")}</Heading>
							{isUserRoleLoading ? <Text>{t("users.loadingRoleBody")}</Text> : null}
							<Text>{t("users.role", { value: currentRoleName })}</Text>
							<Select label={t("users.roleLabel")} name="role" onInput={(event): void => {
								setSelectedRoleUuid(event.target.value);
							}} selectId="user-role-select" value={selectedRoleUuid}>
								<option value="">{t("users.noRole")}</option>
								{roles.map((entry) => (
									<option key={entry.uuid} value={entry.uuid}>{entry.name}</option>
								))}
							</Select>
							<Button buttonId="save-user-role-action" disabled={isUpdatingRole || isUserRoleLoading} onGcdsClick={() => {
								void handleSaveRole();
							}} type="button">
								{isUpdatingRole ? t("users.savingRoleAction") : t("users.roleSaveAction")}
							</Button>
						</div>
					</div>
				)}
			</Modal>

			<ConfirmDialog
				cancelLabel={t("users.cancelAction")}
				confirmLabel={isDeleting ? t("users.deletingAction") : t("users.confirmDeleteAction")}
				description={t("users.deleteConfirmBody", { username: selectedUser?.username ?? "" })}
				isOpen={deleteDialogOpen}
				isPending={isDeleting}
				onClose={() => {
					setDeleteDialogOpen(false);
				}}
				onConfirm={() => {
					void handleDeleteUser();
				}}
				title={t("users.deleteConfirmTitle")}
			/>
		</CenteredPageLayout>
	);
};