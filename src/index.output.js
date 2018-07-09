require("dotenv").config();
require("./server");

const fs = require("fs");

const { unparse } = require("papaparse");

const { github, discourse, mailup } = require("./services");

const { GITHUB_PREFIX, DISCOURSE_PREFIX, MAILUP_PREFIX } = process.env;
const { NODE_ENV } = process.env;

const isDev = NODE_ENV === "development";

const PREFIXES = [GITHUB_PREFIX, DISCOURSE_PREFIX, MAILUP_PREFIX];
const LOCAL_PATH = `./export/`;

Promise.all([
  github.getReposData(),
  discourse.getForumData(),
  mailup.getMailData()
])
  .then(results => {
    const metrics = [];

    results.map((result, i) => {
      const time = new Date().toISOString();

      if (result) {
        Object.keys(result).map(key => {
          metrics.push({
            metric: `${PREFIXES[i]}${key}`,
            time,
            value: result[key]
          });
        });
      }
    });

    return metrics;
  })
  .then(data => {
    const csv = unparse(data);
    const fileName = `export-${new Date().toISOString().split(".")[0]}.csv`;

    return Promise.all([fileName, writeFile(LOCAL_PATH + fileName, csv)]);
  })
  .then(([fileName]) => {
    console.info(`${fileName} was written to disk`);
  })
  .then(() => {
    process.exit();
  })
  .catch(err => {
    console.error(`An error occurred: ${err}`);
    if (isDev && err.stack) console.error(err.stack);

    process.exit(1);
  });

const writeFile = (path, data, opts = "utf8") => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, opts, err => {
      if (err) reject(err);
      else resolve();
    });
  });
};
