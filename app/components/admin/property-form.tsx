import { useCallback, useState } from "react";
import type { FormEvent, FormHTMLAttributes, ReactNode } from "react";
import { useBeforeUnload } from "react-router";

import { Field } from "../ui";
import type { FieldProps } from "../ui";
import { cx } from "../ui/utils";

export type AdminPropertyFormField = {
	id: string;
	label: ReactNode;
	control: FieldProps["children"];
	hint?: ReactNode;
	error?: ReactNode;
	success?: ReactNode;
	optional?: boolean;
	disabled?: boolean;
	width?: "full" | "half" | "third";
};

export type AdminPropertyFormSection = {
	id: string;
	title: ReactNode;
	description?: ReactNode;
	fields?: AdminPropertyFormField[];
	content?: ReactNode;
};

export type AdminPropertyFormProps = FormHTMLAttributes<HTMLFormElement> & {
	sections: AdminPropertyFormSection[];
	actions: ReactNode;
	status?: ReactNode;
	formLabel?: string;
};

/**
 * Presentational form frame. Routes remain responsible for parsing, validating
 * and authorizing every value again on the server.
 */
export function AdminPropertyForm({
	sections,
	actions,
	status,
	formLabel = "Formulário do imóvel",
	className,
	onChange,
	onSubmit,
	...props
}: AdminPropertyFormProps) {
	const [dirty, setDirty] = useState(false);
	useBeforeUnload(
		useCallback(
			(event) => {
				if (!dirty) return;
				event.preventDefault();
				event.returnValue = "";
			},
			[dirty],
		),
	);
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		setDirty(false);
		onSubmit?.(event);
	};
	return (
		<form
			className={cx("admin-property-form", className)}
			aria-label={formLabel}
			onChange={(event) => {
				setDirty(true);
				onChange?.(event);
			}}
			onSubmit={handleSubmit}
			{...props}
		>
			<div className="admin-property-form__sections">
				{sections.map((section, index) => (
					<section
						key={section.id}
						id={section.id}
						className="admin-form-section"
						aria-labelledby={`${section.id}-title`}
					>
						<header className="admin-form-section__header">
							<span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
							<div>
								<h2 id={`${section.id}-title`}>{section.title}</h2>
								{section.description && <p>{section.description}</p>}
							</div>
						</header>
						{section.fields && section.fields.length > 0 && (
							<div className="admin-form-grid">
								{section.fields.map((field) => (
									<Field
										key={field.id}
										id={field.id}
										label={field.label}
										hint={field.hint}
										error={field.error}
										success={field.success}
										optional={field.optional}
										disabled={field.disabled}
										className={cx(
											"admin-form-field",
											`admin-form-field--${field.width ?? "full"}`,
										)}
									>
										{field.control}
									</Field>
								))}
							</div>
						)}
						{section.content && (
							<div className="admin-form-section__content">{section.content}</div>
						)}
					</section>
				))}
			</div>
			<footer className="admin-property-form__footer">
				<div className="admin-property-form__status" role="status" aria-live="polite">
					{dirty ? "Alterações ainda não salvas." : status}
				</div>
				<div className="admin-property-form__actions">{actions}</div>
			</footer>
		</form>
	);
}
