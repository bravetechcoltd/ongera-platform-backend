// Resolves which institution the caller is acting on, and whether they are an
// admin of it. The root institution account's own User.id IS the institution id;
// a delegated admin (institution_portal_role = INSTITUTION_ADMIN) acts on the
// institution referenced by primary_institution_id / institution_ids[0].
import dbConnection from "../database/db";
import {
  User,
  AccountType,
  InstitutionPortalRole,
} from "../database/models/User";

export interface InstitutionContext {
  institutionId: string | null;
  isAdmin: boolean;
  isRoot: boolean;
  caller: User | null;
}

export async function resolveInstitutionContext(
  userId: string
): Promise<InstitutionContext> {
  const userRepo = dbConnection.getRepository(User);
  const caller = await userRepo.findOne({ where: { id: userId } });

  if (!caller) {
    return { institutionId: null, isAdmin: false, isRoot: false, caller: null };
  }

  // Root institution account — its own id is the institution id.
  if (caller.account_type === AccountType.INSTITUTION) {
    return { institutionId: caller.id, isAdmin: true, isRoot: true, caller };
  }

  // Delegated institution admin — acts on the institution they administer.
  if (caller.institution_portal_role === InstitutionPortalRole.INSTITUTION_ADMIN) {
    const institutionId =
      caller.primary_institution_id ||
      (Array.isArray(caller.institution_ids) ? caller.institution_ids[0] : null) ||
      null;
    return { institutionId, isAdmin: !!institutionId, isRoot: false, caller };
  }

  return { institutionId: null, isAdmin: false, isRoot: false, caller };
}
