import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../../services/logger.service';
import { UsersService } from '../../users/users.service';
import { env } from '../../env';

describe('Auth integration', () => {
  it('generates and verifies token; rejects invalid', async () => {
    const jwt = new JwtService({ secret: env.JWT_SECRET, signOptions: { expiresIn: env.JWT_EXPIRES_IN } });
    // Mock UsersService - not needed for basic token generation/validation
    const mockUsersService = {} as UsersService;
    const auth = new AuthService(jwt, new LoggerService(), mockUsersService);

    const { accessToken } = await auth.generateToken('dev1');
    const payload = await auth.validateToken(accessToken);
    expect(payload.deviceId).toBe('dev1');

    await expect(auth.validateToken('bad.token')).rejects.toBeTruthy();
  });
});


