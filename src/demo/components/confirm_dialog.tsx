interface ConfirmDialogProps {
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
	return (
		<div class="confirm-inline">
			<span style={{ flex: 1 }}>{message}</span>
			<button type="button" class="btn btn-sm btn-danger" onClick={onConfirm}>
				Confirm
			</button>
			<button type="button" class="btn btn-sm btn-muted" onClick={onCancel}>
				Cancel
			</button>
		</div>
	);
}
