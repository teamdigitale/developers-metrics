require("dotenv").config();

const fs = require("fs");

const bluebird = require("bluebird");
const { unparse } = require("papaparse");

const { github, discourse, mailup } = require("./services");

const { GITHUB_PREFIX, DISCOURSE_PREFIX, MAILUP_PREFIX } = process.env;
const { NODE_ENV } = process.env;

const isDev = NODE_ENV === "development";

const PREFIXES = [GITHUB_PREFIX, DISCOURSE_PREFIX, MAILUP_PREFIX];
const LOCAL_PATH = `./export/`;

const getFormattedTime = () => {
  const pad = number => {
    if (number < 10) {
      return "0" + number;
    }
    return number;
  };

  const date = new Date();
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate())
  ].join("-");
};

bluebird
  .each(
    [github.getReposData(), discourse.getForumData(), mailup.getMailData()],
    result => result
  )
  .then(results => {
    const metrics = [];

    const time = getFormattedTime();

    results.map((result, i) => {
      if (result) {
        const prefix = PREFIXES[i];
        Object.keys(result).map(key => {
          metrics.push({
            group: prefix.replace("-", ""),
            metric: `${prefix}${key}`,
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
