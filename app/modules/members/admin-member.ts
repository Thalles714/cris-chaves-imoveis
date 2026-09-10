import { z } from "zod";

export const adminMemberRoles = ["owner", "editor"] as const;
export const adminMemberStatuses = ["invited", "active", "disabled"] as const;

export const adminMemberRoleSchema = z.enum(adminMemberRoles);
export const adminMemberStatusSchema = z.enum(adminMemberStatuses);

const normalizedEmailSchema = z
	.string()
	.trim()
	.max(254)
	.pipe(z.email())
	.transform((value) => value.toLowerCase());

export const adminMemberInviteInputSchema = z
	.object({
		email: normalizedEmailSchema,
		role: adminMemberRoleSchema,
	})
	.strict();

export const adminMemberRoleChangeInputSchema = z
	.object({
		userId: z.uuid(),
		role: adminMemberRoleSchema,
		expectedVersion: z.coerce.number().int().positive(),
	})
	.strict();

export const adminMemberDisableInputSchema = z
	.object({
		userId: z.uuid(),
		expectedVersion: z.coerce.number().int().positive(),
		confirmation: z.literal("confirmed"),
	})
	.strict();

export const adminMemberActionIntentSchema = z.enum(["invite", "change-role", "disable"]);

const databaseTimestampSchema = z.iso.datetime({ offset: true });

export const adminMemberRowSchema = z
	.object({
		userId: z.uuid(),
		role: adminMemberRoleSchema,
		status: adminMemberStatusSchema,
		invitedAt: databaseTimestampSchema,
		activatedAt: databaseTimestampSchema.nullable(),
		disabledAt: databaseTimestampSchema.nullable(),
		version: z.number().int().positive(),
	})
	.strict();

export const adminMemberDtoSchema = adminMemberRowSchema
	.pick({
		userId: true,
		role: true,
		status: true,
		invitedAt: true,
		activatedAt: true,
		disabledAt: true,
		version: true,
	})
	.extend({ email: normalizedEmailSchema.nullable() })
	.strict();

export type AdminMemberRole = z.infer<typeof adminMemberRoleSchema>;
export type AdminMemberStatus = z.infer<typeof adminMemberStatusSchema>;
export type AdminMemberInviteInput = z.infer<typeof adminMemberInviteInputSchema>;
export type AdminMemberRoleChangeInput = z.infer<typeof adminMemberRoleChangeInputSchema>;
export type AdminMemberDisableInput = z.infer<typeof adminMemberDisableInputSchema>;
export type AdminMemberActionIntent = z.infer<typeof adminMemberActionIntentSchema>;
export type AdminMemberRow = z.infer<typeof adminMemberRowSchema>;
export type AdminMemberDto = z.infer<typeof adminMemberDtoSchema>;

export function redactAdminMemberReference(userId: string): string {
	return `…${userId.slice(-8)}`;
}
