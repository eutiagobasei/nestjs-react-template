import { SetMetadata } from '@nestjs/common';
import { OrgRole } from '../dto/invite-member.dto';

export const ORG_ROLES_KEY = 'orgRoles';
export const OrgRoles = (...roles: OrgRole[]) => SetMetadata(ORG_ROLES_KEY, roles);
