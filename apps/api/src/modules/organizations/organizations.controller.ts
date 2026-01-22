import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  OrgRole,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { OrganizationGuard } from './guards/organization.guard';
import { OrgRoles } from './decorators/org-roles.decorator';
import { CurrentOrg, CurrentOrgData } from './decorators/current-org.decorator';

@Controller('organizations')
@UseGuards(ThrottlerGuard, JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateOrganizationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.organizationsService.create(createDto, user.id);
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.organizationsService.findAllForUser(user.id);
  }

  @Get('by-slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }

  @Get(':id')
  @UseGuards(OrganizationGuard)
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Put(':id')
  @UseGuards(OrganizationGuard)
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(OrganizationGuard)
  @OrgRoles(OrgRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.organizationsService.delete(id);
  }

  // Member management
  @Get(':id/members')
  @UseGuards(OrganizationGuard)
  async getMembers(@Param('id') id: string) {
    return this.organizationsService.getMembers(id);
  }

  @Post(':id/members')
  @UseGuards(OrganizationGuard)
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Param('id') id: string,
    @Body() inviteDto: InviteMemberDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.organizationsService.inviteMember(id, inviteDto, user.id);
  }

  @Put(':id/members/:memberId/role')
  @UseGuards(OrganizationGuard)
  @OrgRoles(OrgRole.OWNER)
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.organizationsService.updateMemberRole(
      id,
      memberId,
      updateRoleDto.role,
      user.id,
    );
  }

  @Delete(':id/members/:memberId')
  @UseGuards(OrganizationGuard)
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.organizationsService.removeMember(id, memberId, user.id);
  }

  @Post(':id/leave')
  @UseGuards(OrganizationGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveOrganization(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.organizationsService.leaveOrganization(id, user.id);
  }

  // Invite management
  @Get(':id/invites')
  @UseGuards(OrganizationGuard)
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  async getPendingInvites(@Param('id') id: string) {
    return this.organizationsService.getPendingInvites(id);
  }

  @Delete(':id/invites/:inviteId')
  @UseGuards(OrganizationGuard)
  @OrgRoles(OrgRole.OWNER, OrgRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvite(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.organizationsService.cancelInvite(id, inviteId);
  }

  // Accept invite (doesn't require OrganizationGuard since user isn't member yet)
  @Post('invites/:token/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.organizationsService.acceptInvite(token, user.id);
  }
}
