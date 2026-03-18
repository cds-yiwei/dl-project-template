import Button from "./Button";
import Modal from "./Modal";

export type ConfirmDialogProps = {
	cancelLabel?: string;
	confirmLabel?: string;
	description: string;
	isOpen: boolean;
	isPending?: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
};

const ConfirmDialog = ({
	cancelLabel = "Cancel",
	confirmLabel = "Confirm",
	description,
	isOpen,
	isPending = false,
	onClose,
	onConfirm,
	title,
}: ConfirmDialogProps) => (
	<Modal
		description={description}
		footer={(
			<>
				<Button buttonRole="secondary" disabled={isPending} onGcdsClick={onClose} type="button">
					{cancelLabel}
				</Button>
				<Button buttonRole="danger" disabled={isPending} onGcdsClick={onConfirm} type="button">
					{confirmLabel}
				</Button>
			</>
		)}
		isOpen={isOpen}
		onClose={onClose}
		size="narrow"
		title={title}
	>
		<p>{description}</p>
	</Modal>
);

export default ConfirmDialog;