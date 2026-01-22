import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(OrgRole)
  @IsOptional()
  role?: OrgRole = OrgRole.MEMBER;
}

export class UpdateMemberRoleDto {
  @IsEnum(OrgRole)
  role: OrgRole;
}
