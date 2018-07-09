require("dotenv").config();
require("./server");

const bluebird = require("bluebird");
const StatsD = require("statsd-client");

const { github, discourse, mailup } = require("./services");

const { STATSD_HOST, STATSD_PORT, STATSD_PREFIX } = process.env;
const { GITHUB_PREFIX, DISCOURSE_PREFIX, MAILUP_PREFIX } = process.env;
const { NODE_ENV } = process.env;

const isDev = NODE_ENV === "development";

const statsd = new StatsD({
  host: STATSD_HOST,
  port: STATSD_PORT,
  prefix: STATSD_PREFIX,
  debug: true
});

bluebird
  .each(
    [
      github.getReposData().then(data => {
        Object.keys(data).map(key => {
          statsd.counter(`${GITHUB_PREFIX}${key}`, data[key]);
        });
      }),

      discourse.getForumData().then(data => {
        Object.keys(data).map(key => {
          statsd.counter(`${DISCOURSE_PREFIX}${key}`, data[key]);
        });
      }),

      mailup.getMailData().then(data => {
        Object.keys(data).map(key => {
          statsd.counter(`${MAILUP_PREFIX}${key}`, data[key]);
        });
      })
    ],
    result => result
  )
  .then(() => {
    // Wait for statsd operations to finish before signalling
    return bluebird.delay(2000);
  })
  .then(() => {
    statsd.close();
    process.exit();
  })
  .catch(err => {
    console.error(`An error occurred: ${err}`);
    if (isDev && err.stack) console.error(err.stack);

    statsd.close();
    process.exit(1);
  });
