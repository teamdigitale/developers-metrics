require('dotenv').config();

import statsd from 'statsd-client';

const { HOST, PORT, PREFIX, NODE_ENV } = process.env;

const client = new statsd({
  'host'  : HOST,
  'port'  : PORT,
  'prefix': PREFIX,
  'debug' : NODE_ENV === 'development',
});

client.set('developers', 35);

client.close();
