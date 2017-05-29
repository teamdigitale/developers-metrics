require('dotenv').config();

import StatsD from 'statsd-client';

import { github, discourse, mailup } from './services';

const { STATSD_HOST, STATSD_PORT, STATSD_PREFIX } = process.env;
const { NODE_ENV } = process.env;

const statsd = new StatsD({
  'host'  : STATSD_HOST,
  'port'  : STATSD_PORT,
  'prefix': STATSD_PREFIX,
  'debug' : NODE_ENV === 'development',
});

Promise.all([
  github.getReposData()
    .then((data) => {
      Object.keys(data).map((key) => {
        statsd.gauge(key, data[key]);
      });
    }),
  discourse.getForumData()
    .then((data) => {
      Object.keys(data).map((key) => {
        statsd.gauge(key, data[key]);
      });
    }),
  mailup.getMailData()
    .then((data) => {
      Object.keys(data).map((key) => {
        statsd.gauge(key, data[key]);
      });
    }),
])
  .then(() => {
    statsd.close();
  });
