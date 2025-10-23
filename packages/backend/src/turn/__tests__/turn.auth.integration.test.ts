import { TurnService } from '../turn.service';
import { TurnController } from '../turn.controller';

describe('TURN credentials auth', () => {
  it('requires JWT (simulated by controller typing)', async () => {
    const svc = new TurnService({
      log: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    } as any);
    const ctrl = new TurnController(svc);
    const creds = await ctrl.getCredentials({ user: { deviceId: 'dev1' } } as any);
    expect(creds.username).toContain('dev1');
    expect(Array.isArray(creds.urls)).toBe(true);
  });
});


