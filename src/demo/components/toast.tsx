import { useAppState } from '../state.tsx';

export function ToastStack() {
	const { toasts, dismissToast } = useAppState();
	if (toasts.length === 0) return null;
	return (
		<div class="toast-stack">
			{toasts.map((t) => (
				<button
					type="button"
					key={t.id}
					class={`toast ${t.variant === 'err' ? 'toast-err' : 'toast-ok'}`}
					onClick={() => dismissToast(t.id)}
				>
					{t.message}
				</button>
			))}
		</div>
	);
}
