import type {
	AdminSession,
	AdminSessionReader,
} from "../admin/server/admin-session.server";

import { AdminAccessError } from "./auth-errors.server";
import { operationRequiresAal2, roleCan, type AdminOperation } from "./permissions";

/**
 * Server-side authorization boundary for loaders/actions. Every mutation is
 * fail-closed at AAL2, including mutations otherwise permitted to an editor.
 */
export async function requireAdminOperation(
	request: Request,
	operation: AdminOperation,
	sessions: AdminSessionReader,
) {
	const session = await sessions.requireSession(request);
	if (!roleCan(session.role, operation)) {
		throw new AdminAccessError("ADMIN_ACCESS_DENIED");
	}
	if (operationRequiresAal2(operation) && session.authenticationLevel !== "aal2") {
		throw new AdminAccessError("AAL2_REQUIRED");
	}
	return session;
}

export function hasRecentSecondFactor(
	session: AdminSession,
	nowInMilliseconds = Date.now(),
	maximumAgeInSeconds = 5 * 60,
): boolean {
	return (
		session.authenticationLevel === "aal2" &&
		session.secondFactorVerifiedAt !== null &&
		nowInMilliseconds / 1000 - session.secondFactorVerifiedAt >= 0 &&
		nowInMilliseconds / 1000 - session.secondFactorVerifiedAt <= maximumAgeInSeconds
	);
}

export async function requireAdminTargetOperation(
	request: Request,
	operation: AdminOperation,
	sessions: AdminSessionReader,
	authorizeTarget: (session: AdminSession) => Promise<boolean>,
) {
	const session = await requireAdminOperation(request, operation, sessions);
	try {
		if (!(await authorizeTarget(session))) {
			throw new AdminAccessError("ADMIN_ACCESS_DENIED");
		}
	} catch {
		throw new AdminAccessError("ADMIN_ACCESS_DENIED");
	}
	return session;
}
