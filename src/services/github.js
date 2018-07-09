require("dotenv").config();

import request from "request-promise-native";
import querystring from "querystring";
import opn from "opn";

import GitHub from "github-api";
import bluebird from "bluebird";

const resolvePromise = promise =>
  new Promise((resolve /*, reject */) => {
    promise
      .then(result => {
        resolve({
          data: result && result.data ? result.data : [],
          errored: []
        });
      })
      .catch(error => {
        resolve({
          data: [],
          errored: [error]
        });
      });
  });

const { GITHUB_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
const { GITHUB_ACCESS_TOKEN, GITHUB_USER } = process.env;
const { SERVER_URL, SERVER_PORT, REFRESH_TOKEN_PATH } = process.env;

const AUTH_URL = "login/oauth/authorize";
const TOKEN_URL = "login/oauth/access_token";

const github = new GitHub({
  token: GITHUB_ACCESS_TOKEN
});

const githubAuth = Promise.defer();

function checkAuth(endpoint = AUTH_URL) {
  if (!GITHUB_ACCESS_TOKEN) {
    // No token/refresh pair is found in .env
    const qs = querystring.stringify({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: `${SERVER_URL}/github`,
      scope: ""
    });

    // Try to open into a Browser
    opn(`${GITHUB_URL}/${endpoint}?${qs}`);

    console.info("Visit this URL in order to obtain your access token:");
    console.info(`${GITHUB_URL}/${endpoint}?${qs}`);

    return githubAuth.promise;
  } else {
    // token/refresh pair have already been setup in .env
    return getReposDataWithToken();
  }
}

function getAccessToken({ code }) {
  return request({
    method: "POST",
    url: `${GITHUB_URL}/${TOKEN_URL}`,
    json: true,
    form: {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      redirect_uri: `${SERVER_URL}/github`,
      code: code
    }
  });
}

function getReposData() {
  return checkAuth();
}

function getReposDataWithToken() {
  return Promise.all([
    github.getOrganization(GITHUB_USER).getRepos(),
    github.getRateLimit().getRateLimit()
  ])
    .then(([{ data: repos }, { data: { resources } }]) => {
      console.info(`GitHub rate limits:`);
      console.info(JSON.stringify(resources.core));
      return repos;
    })
    .then(getReposDetails);
}

function getReposDetails(repos) {
  const contributors = [];
  const branches = [];
  const commits = [];
  const forks = [];
  const pullRequests = [];
  const tags = [];

  const callback = (result, index, length) => {
    return {
      data: result.data,
      errored: result.errored
    };
  };

  console.info(`Repositories (including forks): ${repos.length}`);
  const originals = repos.filter(repo => !repo.fork);
  console.info(`Repositories (not including forks): ${originals.length}`);

  originals.map(repo => {
    const repository = github.getRepo(GITHUB_USER, repo.name);
    const fullname = `${GITHUB_USER}/${repo.name}`;

    contributors.push(resolvePromise(repository.getContributors()));
    branches.push(resolvePromise(repository.listBranches()));
    commits.push(resolvePromise(repository.listCommits()));
    forks.push(resolvePromise(repository.listForks()));
    pullRequests.push(
      resolvePromise(
        repository.listPullRequests({
          // https://developer.github.com/v3/pulls/#list-pull-requests
          state: "all"
        })
      )
    );
    tags.push(resolvePromise(repository.listTags()));
  });

  return Promise.all([
    originals,
    bluebird.map(contributors, callback, { concurrency: 1 }),
    bluebird.map(branches, callback, { concurrency: 1 }),
    bluebird.map(commits, callback, { concurrency: 1 }),
    bluebird.map(forks, callback, { concurrency: 1 }),
    bluebird.map(pullRequests, callback, { concurrency: 1 }),
    bluebird.map(tags, callback, { concurrency: 1 })
  ]).then(getReposAggregateData);
}

function getReposAggregateData([
  repos,
  contributors,
  branches,
  commits,
  forks,
  pullRequests,
  tags,
  gql
]) {
  console.info({
    errors: {
      contributors: contributors.reduce(accumulateErroredLength, 0),
      branches: branches.reduce(accumulateErroredLength, 0),
      commits: commits.reduce(accumulateErroredLength, 0),
      forks: forks.reduce(accumulateErroredLength, 0),
      pullRequests: pullRequests.reduce(accumulateErroredLength, 0),
      tags: tags.reduce(accumulateErroredLength, 0)
    }
  });

  return {
    repos: repos.length,
    contributors: contributors.reduce(accumulateDataLength, 0),
    branches: branches.reduce(accumulateDataLength, 0),
    commits: commits.reduce(accumulateDataLength, 0),
    forks: forks.reduce(accumulateDataLength, 0),
    pullRequests: pullRequests.reduce(accumulateDataLength, 0),
    tags: tags.reduce(accumulateDataLength, 0)
  };
}

function accumulateDataLength(acc, object) {
  return acc + (object && object.data ? object.data.length : 0);
}

function accumulateErroredLength(acc, object) {
  return acc + (object && object.errored ? object.errored.length : 0);
}

module.exports = {
  githubAuth,
  getAccessToken,
  getReposData
};
