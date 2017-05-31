require('dotenv').config();
require('./server');

import StatsD from 'statsd-client';

import { github, discourse, mailup } from './services';

const { STATSD_HOST, STATSD_PORT, STATSD_PREFIX } = process.env;
const { GITHUB_PREFIX, DISCOURSE_PREFIX, MAILUP_PREFIX } = process.env;
const { NODE_ENV } = process.env;

const isDev = (NODE_ENV === 'development');

const statsd = new StatsD({
  'host'  : STATSD_HOST,
  'port'  : STATSD_PORT,
  'prefix': STATSD_PREFIX,
  'debug' : true,
});

Promise.all([
  github.getReposData()
    .then((data) => {
      Object.keys(data).map((key) => {
        statsd.gauge(`${GITHUB_PREFIX}${key}`, data[key]);
      });
    }),

  discourse.getForumData()
    .then((data) => {
      Object.keys(data).map((key) => {
        statsd.gauge(`${DISCOURSE_PREFIX}${key}`, data[key]);
      });
    }),

  mailup.getMailData()
    .then((data) => {
      Object.keys(data).map((key) => {
        statsd.gauge(`${MAILUP_PREFIX}${key}`, data[key]);
      });
    }),

])
  .then(() => {
    statsd.close();
    process.exit();
  })
  .catch((err) => {
    console.error(`An error occurred: ${err}`);
    statsd.close();
    process.exit(1);
  });
