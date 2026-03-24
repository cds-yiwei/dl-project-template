import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { CenteredPageLayout } from "@/components/layout";
import { Button, ConfirmDialog, DataTable, Heading, Input, Modal, Notice, Pagination, Text } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { getRequestErrorNotice } from "@/fetch";
import type { DepartmentCreate, DepartmentRead } from "@/fetch/departments";
import { useAdminListState, useDepartmentManagement } from "@/hooks";
import { releaseActiveElementFocus } from "@/lib/release-active-element-focus";

type DepartmentFormState = {
	abbreviation: string;
	abbreviation_fr: string;
	gc_org_id: string;
	lead_department_name: string;
	lead_department_name_fr: string;
	name: string;
	name_fr: string;
};

const createEmptyDepartmentForm = (): DepartmentFormState => ({
	abbreviation: "",
	abbreviation_fr: "",
	gc_org_id: "",
	lead_department_name: "",
	lead_department_name_fr: "",
	name: "",
	name_fr: "",
});

const toOptionalString = (value: string): string | null => {
	const normalizedValue = value.trim();

	return normalizedValue.length > 0 ? normalizedValue : null;
};

const toOptionalInteger = (value: string): number | null => {
	const normalizedValue = value.trim();

	if (normalizedValue.length === 0) {
		return null;
	}

	const parsedValue = Number.parseInt(normalizedValue, 10);

	return Number.isNaN(parsedValue) ? null : parsedValue;
};

const toDepartmentFormState = (department: DepartmentRead): DepartmentFormState => ({
	abbreviation: department.abbreviation ?? "",
	abbreviation_fr: department.abbreviation_fr ?? "",
	gc_org_id: department.gc_org_id === null ? "" : String(department.gc_org_id),
	lead_department_name: department.lead_department_name ?? "",
	lead_department_name_fr: department.lead_department_name_fr ?? "",
	name: department.name,
	name_fr: department.name_fr ?? "",
});

const toDepartmentPayload = (form: DepartmentFormState): DepartmentCreate => ({
	abbreviation: toOptionalString(form.abbreviation),
	abbreviation_fr: toOptionalString(form.abbreviation_fr),
	gc_org_id: toOptionalInteger(form.gc_org_id),
	lead_department_name: toOptionalString(form.lead_department_name),
	lead_department_name_fr: toOptionalString(form.lead_department_name_fr),
	name: form.name.trim(),
	name_fr: toOptionalString(form.name_fr),
});

type DepartmentTableRow = {
	abbreviation: string;
	createdAt: string;
	name: string;
	uuid: string;
};

export const DepartmentsPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { page, searchDraft, setPage, setSearchDraft } = useAdminListState("departments");
	const itemsPerPage = 10;
	const {
		createDepartment,
		deleteDepartment,
		departments,
		error,
		isCreating,
		isDeleting,
		isLoading,
		isUpdating,
		response,
		updateDepartment,
	} = useDepartmentManagement(page, itemsPerPage);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [form, setForm] = useState<DepartmentFormState>(createEmptyDepartmentForm);
	const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
	const [selectedDepartmentUuid, setSelectedDepartmentUuid] = useState<string | null>(null);
	const errorNotice = getRequestErrorNotice(error, {
		bodyKey: "departments.errorBody",
		titleKey: "departments.errorTitle",
	});

	const selectedDepartment = departments.find((department) => department.uuid === selectedDepartmentUuid) ?? null;
	const departmentRows: Array<DepartmentTableRow> = departments.map((department) => ({
		abbreviation: department.abbreviation ?? "",
		createdAt: department.created_at,
		name: department.name,
		uuid: department.uuid,
	}));
	const departmentColumns: Array<DataTableColumn<DepartmentTableRow>> = [
		{ field: "abbreviation", headerName: t("departments.abbreviationLabel"), pinned: "left" },
		{ field: "name", headerName: t("departments.nameLabel") },
	];
	const totalPages = response ? Math.max(1, Math.ceil(response.total_count / response.items_per_page)) : 1;

	useEffect(() => {
		if (modalMode !== "edit" && !deleteDialogOpen) {
			return;
		}

		if (!selectedDepartmentUuid || departments.some((department) => department.uuid === selectedDepartmentUuid)) {
			return;
		}

		setSelectedDepartmentUuid(null);
		setDeleteDialogOpen(false);
		setModalMode(null);
		setForm(createEmptyDepartmentForm());
	}, [deleteDialogOpen, departments, modalMode, selectedDepartmentUuid]);

	const closeModal = (): void => {
		setModalMode(null);
		setForm(createEmptyDepartmentForm());
	};

	const openCreateModal = (): void => {
		releaseActiveElementFocus();
		setSelectedDepartmentUuid(null);
		setForm(createEmptyDepartmentForm());
		setModalMode("create");
	};

	const openEditModal = (departmentUuid: string): void => {
		const department = departments.find((item) => item.uuid === departmentUuid);

		if (!department) {
			return;
		}

		releaseActiveElementFocus();
		setSelectedDepartmentUuid(department.uuid);
		setForm(toDepartmentFormState(department));
		setModalMode("edit");
	};

	const handleCreateDepartment = async (): Promise<void> => {
		await createDepartment(toDepartmentPayload(form));
		setPage(1);
		closeModal();
	};

	const handleUpdateDepartment = async (): Promise<void> => {
		if (!selectedDepartment) {
			return;
		}

		await updateDepartment(selectedDepartment.uuid, toDepartmentPayload(form));
		setPage(1);
		closeModal();
	};

	const updateFormField = (field: keyof DepartmentFormState, value: string): void => {
		setForm((currentForm) => ({ ...currentForm, [field]: value }));
	};

	const handleDeleteDepartment = async (): Promise<void> => {
		if (!selectedDepartment) {
			return;
		}

		await deleteDepartment(selectedDepartment.uuid);
		setPage(1);
		setDeleteDialogOpen(false);
		setSelectedDepartmentUuid(null);
		closeModal();
	};

	const isModalOpen = modalMode !== null;
	const isSubmitting = modalMode === "create" ? isCreating : isUpdating;

	return (
		<CenteredPageLayout className="max-w-5xl">
			<Heading tag="h1">{t("departments.title")}</Heading>
			<Text>{t("departments.summary")}</Text>

			{isLoading ? (
				<Notice noticeRole="info" noticeTitle={t("departments.loadingTitle")} noticeTitleTag="h2">
					<Text>{t("departments.loadingBody")}</Text>
				</Notice>
			) : null}

			{errorNotice ? (
				<Notice noticeRole={errorNotice.noticeRole} noticeTitle={t(errorNotice.titleKey as never)} noticeTitleTag="h2">
					<Text>{t(errorNotice.bodyKey as never)}</Text>
				</Notice>
			) : null}

			{!isLoading && !error && departments.length === 0 ? (
				<Notice noticeRole="warning" noticeTitle={t("departments.emptyTitle")} noticeTitleTag="h2">
					<Text>{t("departments.emptyBody")}</Text>
				</Notice>
			) : null}

			{departments.length > 0 ? (
				<div className="grid gap-300">
					<DataTable
						action={{
							buttonId: (row) => `manage-department-${row.uuid}`,
							buttonLabel: t("departments.manageAction"),
							onAction: (row) => {
								openEditModal(row.uuid);
							},
							screenReaderLabel: (row) => row.name,
						}}
						columns={departmentColumns}
						exportFileName="departments.csv"
						getRowId={(row) => row.uuid}
						itemLabel="departments"
						pagination={false}
						primaryAction={{
							buttonId: "open-create-department-modal",
							buttonLabel: t("departments.createAction"),
							onAction: openCreateModal,
						}}
						rows={departmentRows}
						searchQuery={searchDraft}
						searchLabel="Search departments"
						onSearchChange={setSearchDraft}
						searchPlaceholder="Filter by abbreviation or department name"
						pageNumber={response?.page ?? page}
						title={t("departments.title")}
					/>
					<Pagination currentPage={page} label="Departments pagination" onPageChange={setPage} totalPages={totalPages} />
				</div>
			) : null}

			<Modal
				footer={(
					<>
						<Button buttonRole="secondary" onGcdsClick={closeModal} type="button">
							{t("departments.cancelAction")}
						</Button>
						{modalMode === "edit" ? (
							<Button buttonRole="danger" onGcdsClick={() => {
								releaseActiveElementFocus();
								setDeleteDialogOpen(true);
							}} type="button">
								{t("departments.deleteAction")}
							</Button>
						) : null}
						<Button disabled={isSubmitting} onGcdsClick={() => {
							if (modalMode === "create") {
								void handleCreateDepartment();
								return;
							}

							void handleUpdateDepartment();
						}} type="button">
							{modalMode === "create"
								? (isCreating ? t("departments.creatingAction") : t("departments.createAction"))
								: (isUpdating ? t("departments.savingAction") : t("departments.saveAction"))}
						</Button>
					</>
				)}
				isOpen={isModalOpen}
				onClose={closeModal}
				title={modalMode === "create" ? t("departments.createTitle") : t("departments.editTitle")}
			>
				<div className="grid gap-300 md:grid-cols-2">
					<Input
						inputId={modalMode === "create" ? "create-department-name" : "edit-department-name"}
						label={t("departments.nameLabel")}
						name={modalMode === "create" ? "department-name" : "edit-department-name"}
						onInput={(event): void => {
							updateFormField("name", event.target.value);
						}}
						value={form.name}
					/>
					<Input
						inputId={modalMode === "create" ? "create-department-name-fr" : "edit-department-name-fr"}
						label={t("departments.nameFrLabel")}
						name={modalMode === "create" ? "department-name-fr" : "edit-department-name-fr"}
						onInput={(event): void => {
							updateFormField("name_fr", event.target.value);
						}}
						value={form.name_fr}
					/>
					<Input
						inputId={modalMode === "create" ? "create-department-abbreviation" : "edit-department-abbreviation"}
						label={t("departments.abbreviationLabel")}
						name={modalMode === "create" ? "department-abbreviation" : "edit-department-abbreviation"}
						onInput={(event): void => {
							updateFormField("abbreviation", event.target.value);
						}}
						value={form.abbreviation}
					/>
					<Input
						inputId={modalMode === "create" ? "create-department-abbreviation-fr" : "edit-department-abbreviation-fr"}
						label={t("departments.abbreviationFrLabel")}
						name={modalMode === "create" ? "department-abbreviation-fr" : "edit-department-abbreviation-fr"}
						onInput={(event): void => {
							updateFormField("abbreviation_fr", event.target.value);
						}}
						value={form.abbreviation_fr}
					/>
					<Input
						inputId={modalMode === "create" ? "create-department-gc-org-id" : "edit-department-gc-org-id"}
						label={t("departments.gcOrgIdLabel")}
						name={modalMode === "create" ? "department-gc-org-id" : "edit-department-gc-org-id"}
						onInput={(event): void => {
							updateFormField("gc_org_id", event.target.value);
						}}
						type="number"
						value={form.gc_org_id}
					/>
					<Input
						inputId={modalMode === "create" ? "create-department-lead-name" : "edit-department-lead-name"}
						label={t("departments.leadDepartmentNameLabel")}
						name={modalMode === "create" ? "department-lead-name" : "edit-department-lead-name"}
						onInput={(event): void => {
							updateFormField("lead_department_name", event.target.value);
						}}
						value={form.lead_department_name}
					/>
					<Input
						inputId={modalMode === "create" ? "create-department-lead-name-fr" : "edit-department-lead-name-fr"}
						label={t("departments.leadDepartmentNameFrLabel")}
						name={modalMode === "create" ? "department-lead-name-fr" : "edit-department-lead-name-fr"}
						onInput={(event): void => {
							updateFormField("lead_department_name_fr", event.target.value);
						}}
						value={form.lead_department_name_fr}
					/>
				</div>
			</Modal>

			<ConfirmDialog
				cancelLabel={t("departments.cancelAction")}
				confirmLabel={isDeleting ? t("departments.deletingAction") : t("departments.confirmDeleteAction")}
				description={t("departments.deleteConfirmBody", { name: selectedDepartment?.name ?? "" })}
				isOpen={deleteDialogOpen}
				isPending={isDeleting}
				onClose={() => {
					setDeleteDialogOpen(false);
				}}
				onConfirm={() => {
					void handleDeleteDepartment();
				}}
				title={t("departments.deleteConfirmTitle")}
			/>
		</CenteredPageLayout>
	);
};