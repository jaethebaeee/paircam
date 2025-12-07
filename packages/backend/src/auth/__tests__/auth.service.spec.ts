import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService, JwtPayload } from '../auth.service';
import { LoggerService } from '../../services/logger.service';

jest.mock('../../env', () => ({
  env: {
    JWT_EXPIRATION: '24h',
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    logger = module.get(LoggerService);
  });

  describe('generateToken', () => {
    it('should generate JWT token for device', async () => {
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.generateToken('device-123');

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        expiresIn: '24h',
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'device-123',
        deviceId: 'device-123',
      });
    });

    it('should log token generation', async () => {
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      await service.generateToken('device-123');

      expect(logger.debug).toHaveBeenCalledWith('Generated JWT token', { deviceId: 'device-123' });
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid token', async () => {
      const mockPayload: JwtPayload = {
        sub: 'device-123',
        deviceId: 'device-123',
        iat: Date.now(),
        exp: Date.now() + 86400000,
      };
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.validateToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid signature'));

      await expect(service.validateToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should log warning for invalid token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      await expect(service.validateToken('expired-token')).rejects.toThrow();

      expect(logger.warn).toHaveBeenCalledWith('Invalid JWT token', expect.any(Object));
    });

    it('should throw UnauthorizedException for expired token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.validateToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should generate new token for device', async () => {
      jwtService.signAsync.mockResolvedValue('new-jwt-token');

      const result = await service.refreshToken('device-123');

      expect(result).toEqual({
        accessToken: 'new-jwt-token',
        expiresIn: '24h',
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = service.extractTokenFromHeader('Bearer my-jwt-token');

      expect(token).toBe('my-jwt-token');
    });

    it('should return null for missing header', () => {
      const token = service.extractTokenFromHeader('');

      expect(token).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const token = service.extractTokenFromHeader('Basic credentials');

      expect(token).toBeNull();
    });

    it('should return null for undefined header', () => {
      const token = service.extractTokenFromHeader(undefined as any);

      expect(token).toBeNull();
    });

    it('should handle Bearer without token', () => {
      const token = service.extractTokenFromHeader('Bearer ');

      expect(token).toBe('');
    });
  });
});
