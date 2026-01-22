import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, getUserCacheKey, getUserByEmailCacheKey, CACHE_TTL } from '../../cache';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Type for user without password
type UserWithoutPassword = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Cache the new user
    await this.cacheService.set(
      getUserCacheKey(user.id),
      user,
      CACHE_TTL.USER * 1000,
    );
    await this.cacheService.set(
      getUserByEmailCacheKey(user.email),
      user,
      CACHE_TTL.USER_BY_EMAIL * 1000,
    );

    this.logger.log(`User created: ${user.id}`);
    return user;
  }

  /**
   * Find all users
   */
  async findAll(): Promise<UserWithoutPassword[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find user by ID with cache
   */
  async findById(id: string): Promise<UserWithoutPassword> {
    const cacheKey = getUserCacheKey(id);

    // Try cache first
    const cached = await this.cacheService.get<UserWithoutPassword>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cache the result
    await this.cacheService.set(cacheKey, user, CACHE_TTL.USER * 1000);

    return user;
  }

  /**
   * Find user by email with cache
   */
  async findByEmail(email: string): Promise<UserWithoutPassword | null> {
    const cacheKey = getUserByEmailCacheKey(email);

    // Try cache first
    const cached = await this.cacheService.get<UserWithoutPassword>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user) {
      // Cache the result
      await this.cacheService.set(cacheKey, user, CACHE_TTL.USER_BY_EMAIL * 1000);
    }

    return user;
  }

  /**
   * Find user by email with password (for authentication)
   * This method does NOT cache as it includes sensitive data
   */
  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Invalidate and update cache
    await this.cacheService.del(getUserCacheKey(id));
    await this.cacheService.del(getUserByEmailCacheKey(user.email));
    await this.cacheService.set(
      getUserCacheKey(id),
      updatedUser,
      CACHE_TTL.USER * 1000,
    );
    await this.cacheService.set(
      getUserByEmailCacheKey(updatedUser.email),
      updatedUser,
      CACHE_TTL.USER_BY_EMAIL * 1000,
    );

    this.logger.log(`User updated: ${id}`);
    return updatedUser;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });

    // Invalidate cache
    await this.cacheService.del(getUserCacheKey(id));
    await this.cacheService.del(getUserByEmailCacheKey(user.email));

    this.logger.log(`User deleted: ${id}`);
  }
}
