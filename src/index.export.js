require("dotenv").config();

const fs = require("fs");

const { InfluxDB } = require("influx");
const { unparse } = require("papaparse");
const Client = require("ssh2-sftp-client");

const { STATSD_HOST, STATSD_PORT, STATSD_PREFIX } = process.env;
const { GITHUB_PREFIX, DISCOURSE_PREFIX, MAILUP_PREFIX } = process.env;
const {
  INFLUX_HOST,
  INFLUX_PORT,
  INFLUX_DATABASE,
  INFLUX_USERNAME,
  INFLUX_PASSWORD
} = process.env;
const { SFTP_HOST, SFTP_PORT, SFTP_USERNAME, SFTP_PASSWORD } = process.env;

const { NODE_ENV } = process.env;

const isDev = NODE_ENV === "development";

const influx = new InfluxDB({
  host: INFLUX_HOST,
  port: INFLUX_PORT,
  database: INFLUX_DATABASE,
  username: INFLUX_USERNAME,
  password: INFLUX_PASSWORD
});

const HOURS = 1;

const METRICS = [
  "discourse-categories",
  "discourse-posts",
  "discourse-topics",
  "discourse-users",

  "github-branches",
  "github-commits",
  "github-contributors",
  "github-forks",
  "github-pullRequests",
  "github-repos",
  "github-tags",

  "mailup-lists",
  "mailup-pending",
  "mailup-subscribed",
  "mailup-unsubscribed"
];

const LOCAL_PATH = `./export/`;
const REMOTE_PATH = `/upload/`;

const promises = [];

METRICS.map(metric => {
  promises.push(
    influx.query(`
      SELECT * FROM "autogen"."${metric}"
      WHERE time > (now() - ${HOURS}h)
    `)
  );
});

Promise.all(promises)
  .then(data => {
    const output = [];

    data.map((rows, i) => {
      const metric = METRICS[i];
      rows.map(row => {
        const { time, value } = row;

        output.push({
          metric,
          time: time._nanoISO,
          value
        });
      });
    });

    return output;
  })
  .then(data => {
    const csv = unparse(data);
    const fileName = `export-${new Date().toISOString().split(".")[0]}.csv`;

    return Promise.all([fileName, writeFile(LOCAL_PATH + fileName, csv)]);
  })
  .then(([fileName]) => {
    console.info(`${fileName} was written to disk`);

    let sftp = new Client();
    return sftp
      .connect({
        host: SFTP_HOST,
        port: SFTP_PORT,
        username: SFTP_USERNAME,
        password: SFTP_PASSWORD
      })
      .then(() => {
        return sftp.put(LOCAL_PATH + fileName, REMOTE_PATH + fileName);
      })
  });

const writeFile = (path, data, opts = "utf8") => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, opts, err => {
      if (err) reject(err);
      else resolve();
    });
  });
};
