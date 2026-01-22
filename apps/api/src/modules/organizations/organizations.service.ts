import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsService } from '../../jobs/jobs.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  OrgRole,
} from './dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
  ) {}

  /**
   * Create a new organization
   */
  async create(createDto: CreateOrganizationDto, userId: string) {
    // Check if slug is unique
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: createDto.slug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization with this slug already exists');
    }

    // Create organization and add creator as owner
    const organization = await this.prisma.organization.create({
      data: {
        name: createDto.name,
        slug: createDto.slug,
        description: createDto.description,
        members: {
          create: {
            userId,
            role: OrgRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Organization created: ${organization.id} by user ${userId}`);
    return organization;
  }

  /**
   * Find all organizations for a user
   */
  async findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
        isActive: true,
      },
      include: {
        members: {
          where: { userId },
          select: {
            role: true,
            joinedAt: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });
  }

  /**
   * Find organization by ID
   */
  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            invites: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Find organization by slug
   */
  async findBySlug(slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Update organization
   */
  async update(id: string, updateDto: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: updateDto,
    });

    this.logger.log(`Organization updated: ${id}`);
    return updated;
  }

  /**
   * Delete organization
   */
  async delete(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.prisma.organization.delete({ where: { id } });

    this.logger.log(`Organization deleted: ${id}`);
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  /**
   * Invite member to organization
   */
  async inviteMember(
    organizationId: string,
    inviteDto: InviteMemberDto,
    invitedByUserId: string,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: inviteDto.email },
    });

    if (existingUser) {
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId,
          },
        },
      });

      if (existingMember) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    // Check if invite already exists
    const existingInvite = await this.prisma.organizationInvite.findFirst({
      where: {
        organizationId,
        email: inviteDto.email,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvite) {
      throw new ConflictException('An active invite already exists for this email');
    }

    // Create invite (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.organizationInvite.create({
      data: {
        organizationId,
        email: inviteDto.email,
        role: inviteDto.role || OrgRole.MEMBER,
        expiresAt,
      },
    });

    // Queue email notification
    await this.jobsService.sendNotification({
      userId: invitedByUserId,
      email: inviteDto.email,
      subject: `You've been invited to join ${organization.name}`,
      message: `You have been invited to join the organization "${organization.name}". Use this token to accept: ${invite.token}`,
    });

    this.logger.log(
      `Invite created for ${inviteDto.email} to organization ${organizationId}`,
    );

    return invite;
  }

  /**
   * Accept organization invite
   */
  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.organizationInvite.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.expiresAt < new Date()) {
      await this.prisma.organizationInvite.delete({ where: { id: invite.id } });
      throw new ForbiddenException('Invite has expired');
    }

    // Get user email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify email matches invite (optional - can be removed for flexibility)
    if (user.email !== invite.email) {
      throw new ForbiddenException('This invite was sent to a different email address');
    }

    // Create membership and delete invite
    const [membership] = await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: {
          userId,
          organizationId: invite.organizationId,
          role: invite.role,
        },
        include: {
          organization: true,
        },
      }),
      this.prisma.organizationInvite.delete({ where: { id: invite.id } }),
    ]);

    this.logger.log(
      `User ${userId} joined organization ${invite.organizationId}`,
    );

    return membership;
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, memberId: string, removedByUserId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.organizationId !== organizationId) {
      throw new ForbiddenException('Member does not belong to this organization');
    }

    // Cannot remove the owner unless they're removing themselves and there's another owner
    if (membership.role === OrgRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          role: OrgRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot remove the last owner. Transfer ownership first.',
        );
      }
    }

    await this.prisma.organizationMember.delete({ where: { id: memberId } });

    this.logger.log(
      `Member ${memberId} removed from organization ${organizationId} by ${removedByUserId}`,
    );
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRole: OrgRole,
    updatedByUserId: string,
  ) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    if (membership.organizationId !== organizationId) {
      throw new ForbiddenException('Member does not belong to this organization');
    }

    // If demoting from owner, ensure there's at least one other owner
    if (membership.role === OrgRole.OWNER && newRole !== OrgRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          role: OrgRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot demote the last owner. Promote another member to owner first.',
        );
      }
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Member ${memberId} role updated to ${newRole} in organization ${organizationId}`,
    );

    return updated;
  }

  /**
   * Leave organization
   */
  async leaveOrganization(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
    }

    // If user is owner, ensure there's another owner
    if (membership.role === OrgRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          role: OrgRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot leave as the last owner. Transfer ownership or delete the organization.',
        );
      }
    }

    await this.prisma.organizationMember.delete({ where: { id: membership.id } });

    this.logger.log(`User ${userId} left organization ${organizationId}`);
  }

  /**
   * Get pending invites for organization
   */
  async getPendingInvites(organizationId: string) {
    return this.prisma.organizationInvite.findMany({
      where: {
        organizationId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Cancel invite
   */
  async cancelInvite(organizationId: string, inviteId: string) {
    const invite = await this.prisma.organizationInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.organizationId !== organizationId) {
      throw new ForbiddenException('Invite does not belong to this organization');
    }

    await this.prisma.organizationInvite.delete({ where: { id: inviteId } });

    this.logger.log(`Invite ${inviteId} cancelled for organization ${organizationId}`);
  }
}
