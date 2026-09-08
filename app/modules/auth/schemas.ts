import { z } from "zod";

export const adminRoles = ["owner", "editor"] as const;
export const authenticationLevels = ["aal1", "aal2"] as const;

export const adminRoleSchema = z.enum(adminRoles);
export const authenticationLevelSchema = z.enum(authenticationLevels);

export const verifiedAuthUserSchema = z
	.object({
		id: z.uuid(),
	})
	.strict();

export const adminMemberSchema = z
	.object({
		userId: z.uuid(),
		role: adminRoleSchema,
		active: z.boolean(),
	})
	.strict();

export const assuranceLevelSchema = z
	.object({
		currentLevel: authenticationLevelSchema,
		nextLevel: authenticationLevelSchema.nullable(),
		currentAuthenticationMethods: z
			.union([
				z.array(z.string().min(1).max(80)),
				z.array(
					z
						.object({
							method: z.string().min(1).max(80),
							timestamp: z.number().int().nonnegative(),
						})
						.strict(),
				),
			])
			.default([]),
	})
	.strict();

export type AdminRole = z.infer<typeof adminRoleSchema>;
export type AuthenticationLevel = z.infer<typeof authenticationLevelSchema>;
export type VerifiedAuthUser = z.infer<typeof verifiedAuthUserSchema>;
export type AdminMember = z.infer<typeof adminMemberSchema>;
export type AssuranceLevel = z.infer<typeof assuranceLevelSchema>;
