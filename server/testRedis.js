(async () => {
  const r = require('./redisClient');
  try {
    await r.set('ci_test_key', 'ok');
    const v = await r.get('ci_test_key');
    console.log('VALUE:' + v);
    await r.del('ci_test_key');
    process.exit(0);
  } catch (e) {
    console.error('ERR', e);
    process.exit(1);
  }
})();
