import type { ComponentChildren } from 'preact';

interface ActionButtonProps {
	variant?: 'primary' | 'success' | 'warn' | 'danger' | 'muted';
	onClick: () => void;
	disabled?: boolean;
	children: ComponentChildren;
	small?: boolean;
}

export function ActionButton({
	variant = 'primary',
	onClick,
	disabled,
	children,
	small,
}: ActionButtonProps) {
	return (
		<button
			type="button"
			class={`btn btn-${variant} ${small ? 'btn-sm' : ''}`}
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</button>
	);
}
