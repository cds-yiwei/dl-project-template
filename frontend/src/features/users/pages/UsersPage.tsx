import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
	GcdsHeading,
	GcdsNotice,
	GcdsText,
} from "@gcds-core/components-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { Button, ConfirmDialog, DataTable, Input, Modal, Pagination, Select } from "@/components/ui";
import { isUnauthorizedRequestError } from "@/features/auth/auth-api";
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
	id: number;
	name: string;
	provider: string;
	roleName: string;
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
	const [selectedRoleId, setSelectedRoleId] = useState<string>("");
	const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
	const {
		error: userRoleError,
		isLoading: isUserRoleLoading,
		isUpdating: isUpdatingRole,
		role,
		updateUserRole,
	} = useUserRole(modalMode === "edit" ? selectedUsername : null);
	const navigate = useNavigate();
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const selectedUser = users.find((user) => user.username === selectedUsername) ?? null;
	const currentRoleName = role?.name ?? t("users.noRole");
	const combinedError = error ?? rolesError ?? userRoleError;
	const isBusy = isLoading || isRolesLoading;
	const userRows: Array<UserTableRow> = users.map((user) => ({
		email: user.email,
		id: user.id,
		name: user.name,
		provider: user.auth_provider ?? t("users.noProvider"),
		roleName: roles.find((entry) => entry.id === user.role_id)?.name ?? t("users.noRole"),
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
		setSelectedRoleId(role?.id ? String(role.id) : "");
	}, [role]);

	useEffect(() => {
		if (
			!isUnauthorizedRequestError(error)
			&& !isUnauthorizedRequestError(rolesError)
			&& !isUnauthorizedRequestError(userRoleError)
		) {
			return;
		}

		void navigate({
			replace: true,
			search: { reason: "expired", redirect: pathname },
			to: "/login",
		});
	}, [error, navigate, pathname, rolesError, userRoleError]);

	useEffect(() => {
		if (modalMode !== "edit" && !deleteDialogOpen) {
			return;
		}

		if (!selectedUsername || users.some((user) => user.username === selectedUsername)) {
			return;
		}

		setDeleteDialogOpen(false);
		setEditForm(emptyEditForm);
		setModalMode(null);
		setSelectedRoleId("");
		setSelectedUsername(null);
	}, [deleteDialogOpen, modalMode, selectedUsername, users]);

	const closeModal = (): void => {
		setModalMode(null);
		setCreateForm(emptyCreateForm);
		setDeleteDialogOpen(false);
		setEditForm(emptyEditForm);
		setSelectedRoleId("");
		setSelectedUsername(null);
	};

	const openCreateModal = (): void => {
		releaseActiveElementFocus();
		setCreateForm(emptyCreateForm);
		setSelectedUsername(null);
		setSelectedRoleId("");
		setModalMode("create");
	};

	const openEditModal = (username: string): void => {
		const user = users.find((entry) => entry.username === username);

		if (!user) {
			return;
		}

		releaseActiveElementFocus();
		setEditForm({
			email: user.email,
			name: user.name,
			username: user.username,
		});
		setSelectedUsername(user.username);
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

		await updateUser(selectedUser.username, editForm);
		setPage(1);
		closeModal();
	};

	const handleDeleteUser = async (): Promise<void> => {
		if (!selectedUser) {
			return;
		}

		await deleteUser(selectedUser.username);
		setPage(1);
		closeModal();
	};

	const handleSaveRole = async (): Promise<void> => {
		if (!selectedUser) {
			return;
		}

		await updateUserRole(selectedUser.username, {
			role_id: selectedRoleId.length > 0 ? Number(selectedRoleId) : null,
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
			<GcdsHeading tag="h1">{t("users.title")}</GcdsHeading>
			<GcdsText>{t("users.summary")}</GcdsText>

			{isBusy ? (
				<GcdsNotice noticeRole="info" noticeTitle={t("users.loadingTitle")} noticeTitleTag="h2">
					<GcdsText>{t("users.loadingBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{combinedError && !isUnauthorizedRequestError(combinedError) ? (
				<GcdsNotice noticeRole="danger" noticeTitle={t("users.errorTitle")} noticeTitleTag="h2">
					<GcdsText>{t("users.errorBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{!isBusy && !combinedError && users.length === 0 ? (
				<GcdsNotice noticeRole="warning" noticeTitle={t("users.emptyTitle")} noticeTitleTag="h2">
					<GcdsText>{t("users.emptyBody")}</GcdsText>
				</GcdsNotice>
			) : null}

			{users.length > 0 ? (
				<div className="grid gap-300">
					<DataTable
						action={{
							buttonId: (row) => `manage-user-${row.id}`,
							buttonLabel: t("users.manageAction"),
							onAction: (row) => {
								openEditModal(row.username);
							},
							screenReaderLabel: (row) => row.name,
						}}
						columns={userColumns}
						exportFileName="users.csv"
						getRowId={(row) => String(row.id)}
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
							<GcdsHeading tag="h2">{t("users.manageRoleTitle")}</GcdsHeading>
							{isUserRoleLoading ? <GcdsText>{t("users.loadingRoleBody")}</GcdsText> : null}
							<GcdsText>{t("users.role", { value: currentRoleName })}</GcdsText>
							<Select label={t("users.roleLabel")} name="role" onInput={(event): void => {
								setSelectedRoleId(event.target.value);
							}} selectId="user-role-select" value={selectedRoleId}>
								<option value="">{t("users.noRole")}</option>
								{roles.map((entry) => (
									<option key={entry.id} value={String(entry.id)}>{entry.name}</option>
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