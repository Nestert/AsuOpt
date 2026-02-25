describe('initializeDatabase production gating', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../src/config/env');
  });

  it('skips runtime schema migration queries in production mode', async () => {
    jest.resetModules();
    jest.doMock('../src/config/env', () => ({
      isProduction: true,
    }));

    const dbModule = require('../src/config/database') as typeof import('../src/config/database');

    const authenticateSpy = jest
      .spyOn(dbModule.sequelize, 'authenticate')
      .mockResolvedValue(undefined as never);

    const querySpy = jest
      .spyOn(dbModule.sequelize, 'query')
      .mockImplementation(async () => [] as never);

    await dbModule.initializeDatabase();

    expect(authenticateSpy).toHaveBeenCalledTimes(1);
    expect(querySpy).not.toHaveBeenCalled();

    authenticateSpy.mockRestore();
    querySpy.mockRestore();

    try {
      await dbModule.sequelize.close();
    } catch {
      // ignore close errors for isolated test instance
    }
  });
});

