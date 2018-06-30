require("dotenv").config();

import request from "request-promise-native";
import querystring from "querystring";
import opn from "opn";

const { GITHUB_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
const { GITHUB_ACCESS_TOKEN, GITHUB_USER } = process.env;
const { SERVER_URL, SERVER_PORT } = process.env;

const AUTH_URL = "login/oauth/authorize";
const TOKEN_URL = "login/oauth/access_token";

const octokit = require("@octokit/rest")({
  timeout: 0 // 0 means no request timeout
});

octokit.authenticate({
  type: "token",
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

    console.info(
      "If a browser window didn't open, visit this URL in order to obtain your access token:"
    );
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

async function paginate(method, options) {
  let data = [];
  try {
    let response = await method({ ...options, per_page: 100 });
    data = response.data || [];
    while (octokit.hasNextPage(response)) {
      try {
        response = await octokit.getNextPage(response);
        data = data.concat(response.data || []);
      } catch (error) {
        console.error(error.message);
      }
    }
    return data;
  } catch (error) {
    console.error(error.message);
  }
  return data;
}

async function getReposDataWithToken() {
  const data = await paginate(octokit.repos.getForOrg, {
    org: GITHUB_USER
  });

  return getReposDetails({ data });
}

async function getReposDetails({ data: repos }) {
  console.log("getReposDetails");

  const contributors = [];
  const branches = [];
  const commits = [];
  const forks = [];
  const pullRequests = [];
  const tags = [];

  repos.map(async repo => {
    const params = {
      owner: GITHUB_USER,
      repo: repo.name
    };

    contributors.push(paginate(octokit.repos.getContributors, params));

    branches.push(paginate(octokit.repos.getBranches, params));

    commits.push(paginate(octokit.repos.getCommits, params));

    // forks.push(paginate(octokit.repos.getForks, params));

    pullRequests.push(paginate(octokit.pullRequests.getAll, params));

    tags.push(paginate(octokit.repos.getTags, params));
  });

  return Promise.all([
    repos,
    Promise.all(contributors),
    Promise.all(branches),
    Promise.all(commits),
    Promise.all(forks),
    Promise.all(pullRequests),
    Promise.all(tags)
  ]).then(getReposAggregateData);
}

function getReposAggregateData([
  repos,
  contributors,
  branches,
  commits,
  forks,
  pullRequests,
  tags
]) {
  console.log("getReposAggregateData");
  console.log(repos.length);

  return {
    repos: repos.length,
    contributors: contributors.reduce(accumulateDataLength, 0),
    branches: branches.reduce(accumulateDataLength, 0),
    commits: commits.reduce(accumulateDataLength, 0),
    forks: forks.reduce(accumulateDataLength, 0),
    pullRequests: pullRequests.reduce(accumulateDataLength, 0),
    tags: tags.reduce(accumulateDataLength, 0),
    tags: repos.reduce((acc, object) => {
      return acc + object.forks_count;
    }, 0)
  };
}

function accumulateDataLength(acc, object) {
  return acc + object ? object.length : 0;
}

module.exports = {
  githubAuth,
  getAccessToken,
  getReposData
};
