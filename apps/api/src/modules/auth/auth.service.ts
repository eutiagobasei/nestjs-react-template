import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, getRefreshTokenCacheKey, CACHE_TTL } from '../../cache';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cacheService: CacheService,
    private usersService: UsersService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<TokenResponse> {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create user
    const user = await this.usersService.create({
      email: registerDto.email,
      password: registerDto.password,
      name: registerDto.name,
    });

    this.logger.log(`User registered: ${user.id}`);

    // Generate tokens
    return this.generateTokens(user.id, user.email, user.role);
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<TokenResponse> {
    // Find user with password
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.id}`);

    // Generate tokens
    return this.generateTokens(user.id, user.email, user.role);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    const { refreshToken } = refreshTokenDto;

    // Check if token is blacklisted in cache (was logged out)
    const cacheKey = getRefreshTokenCacheKey(refreshToken);
    const isBlacklisted = await this.cacheService.get<boolean>(cacheKey);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Find token in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.expiresAt < new Date()) {
      // Delete expired token
      await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Delete old token
    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    this.logger.log(`Token refreshed for user: ${tokenRecord.userId}`);

    // Generate new tokens
    return this.generateTokens(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.role,
    );
  }

  /**
   * Logout user - invalidate refresh token
   */
  async logout(refreshToken: string, userId: string): Promise<void> {
    // Blacklist token in cache for quick lookup
    const cacheKey = getRefreshTokenCacheKey(refreshToken);
    await this.cacheService.set(cacheKey, true, CACHE_TTL.REFRESH_TOKEN * 1000);

    // Delete from database
    await this.prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
        userId,
      },
    });

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    // Get all user's refresh tokens
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      select: { token: true },
    });

    // Blacklist all tokens in cache
    await Promise.all(
      tokens.map((t) =>
        this.cacheService.set(
          getRefreshTokenCacheKey(t.token),
          true,
          CACHE_TTL.REFRESH_TOKEN * 1000,
        ),
      ),
    );

    // Delete all tokens from database
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    this.logger.log(`User logged out from all devices: ${userId}`);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenResponse> {
    const accessTokenExpiry = this.configService.get<string>(
      'JWT_ACCESS_EXPIRY',
      '15m',
    );
    const refreshTokenExpiry = this.configService.get<number>(
      'JWT_REFRESH_EXPIRY_DAYS',
      7,
    );

    // Generate access token
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role },
      { expiresIn: accessTokenExpiry },
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenExpiry);

    // Save refresh token to database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    // Parse expiry to seconds for response
    const expiresIn = this.parseExpiryToSeconds(accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900; // 15 minutes default
    }
  }
}
