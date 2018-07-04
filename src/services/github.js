require("dotenv").config();

import request from "request-promise-native";
import querystring from "querystring";
import opn from "opn";

import GitHub from "github-api";

Promise.almost = requests =>
  Promise.all(
    requests.map(
      promise => (promise.catch ? promise.catch(error => error) : promise)
    )
  );

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
    github.getUser(GITHUB_USER).listRepos(),
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

  const callback = (error, result, request) => {
    if (error) {
      return { data: [] };
    }
    return result;
  };

  repos.map(repo => {
    const repository = github.getRepo(GITHUB_USER, repo.name);
    const fullname = `${GITHUB_USER}/${repo.name}`;

    contributors.push(repository.getContributors(callback));
    branches.push(repository.listBranches(callback));
    commits.push(repository.listCommits({}, callback));
    forks.push(repository.listForks(callback));
    pullRequests.push(repository.listPullRequests({}, callback));
    tags.push(repository.listTags(callback));
  });

  return Promise.almost([
    repos,
    Promise.almost(contributors),
    Promise.almost(branches),
    Promise.almost(commits),
    Promise.almost(forks),
    Promise.almost(pullRequests),
    Promise.almost(tags)
  ])
    .then(getReposAggregateData)
    .catch(e => {});
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

module.exports = {
  githubAuth,
  getAccessToken,
  getReposData
};
