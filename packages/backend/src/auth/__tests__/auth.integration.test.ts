import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../../services/logger.service';
import { env } from '../../env';

describe('Auth integration', () => {
  it('generates and verifies token; rejects invalid', async () => {
    const jwt = new JwtService({ secret: env.JWT_SECRET, signOptions: { expiresIn: env.JWT_EXPIRES_IN } });
    const auth = new AuthService(jwt, new LoggerService());

    const { accessToken } = await auth.generateToken('dev1');
    const payload = await auth.validateToken(accessToken);
    expect(payload.deviceId).toBe('dev1');

    await expect(auth.validateToken('bad.token')).rejects.toBeTruthy();
  });
});


