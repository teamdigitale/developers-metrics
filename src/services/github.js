require('dotenv').config();

import GitHub from 'github-api';
import Requestable from 'github-api/dist/components/Requestable';
import request from 'request-promise-native';
import querystring from 'querystring';
import opn from 'opn';

const { GITHUB_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
const { GITHUB_ACCESS_TOKEN, GITHUB_USER } = process.env;
const { SERVER_URL, SERVER_PORT, REFRESH_TOKEN_PATH } = process.env;

const AUTH_URL  = 'login/oauth/authorize';
const TOKEN_URL = 'login/oauth/access_token';

const token = {
  'token': GITHUB_ACCESS_TOKEN,
}

const github      = new GitHub(token);
const requestable = new Requestable(token);

const githubAuth  = Promise.defer();

function checkAuth(endpoint = AUTH_URL) {
  if (!GITHUB_ACCESS_TOKEN) {
    // No token/refresh pair is found in .env
    const qs = querystring.stringify({
      'client_id'     : GITHUB_CLIENT_ID,
      'redirect_uri'  : `${SERVER_URL}/github`,
      'scope'         : '',
    });

    // Try to open into a Browser
    opn(`${GITHUB_URL}/${endpoint}?${qs}`);

    console.info('Visit this URL in order to obtain your access token:');
    console.info(`${GITHUB_URL}/${endpoint}?${qs}`);

    return githubAuth.promise;
  } else {
    // token/refresh pair have already been setup in .env
    return getReposDataWithToken();
  }
}

function getAccessToken({ code }) {
  return request({
    'method'          : 'POST',
    'url'             : `${GITHUB_URL}/${TOKEN_URL}`,
    'json'            : true,
    'form': {
      'client_id'     : GITHUB_CLIENT_ID,
      'client_secret' : GITHUB_CLIENT_SECRET,
      'redirect_uri'  : `${SERVER_URL}/github`,
      'code'          : code,
    }
  });
}

function getReposData() {
  return checkAuth();
}

function getReposDataWithToken() {
  return github.getUser(GITHUB_USER).listRepos()
    .then(getReposDetails);
}

function getReposDetails({ data }) {
  const contributors  = [];
  const branches      = [];
  const commits       = [];
  const forks         = [];
  const pullRequests  = [];
  const tags          = [];

  (data).map((repo) => {
    const getRepo   = github.getRepo(GITHUB_USER, repo.name);
    const fullname  = `${GITHUB_USER}/${repo.name}`;

    contributors.push(requestable._requestAllPages(`/repos/${fullname}/contributors`));
    branches.push(requestable._requestAllPages(`/repos/${fullname}/branches`));
    commits.push(getRepo.listCommits());
    // commits.push(requestable._requestAllPages(`/repos/${fullname}/commits`));
    forks.push(requestable._requestAllPages(`/repos/${fullname}/forks`));
    pullRequests.push(requestable._requestAllPages(`/repos/${fullname}/pulls`));
    // tags.push(requestable._requestAllPages(`/repos/${fullname}/tags`));
  });

  return Promise.all([
    data,
    Promise.all(contributors),
    Promise.all(branches),
    Promise.all(commits),
    Promise.all(forks),
    Promise.all(pullRequests),
    Promise.all(tags)
  ])
    .then(getReposAggregateData);
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
  return {
    'repos'         : repos.length,
    'contributors'  : contributors.reduce(accumulateDataLength, 0),
    'branches'      : branches.reduce(accumulateDataLength, 0),
    'commits'       : commits.reduce(accumulateDataLength, 0),
    'forks'         : forks.reduce(accumulateDataLength, 0),
    'pullRequests'  : pullRequests.reduce(accumulateDataLength, 0),
    // 'tags'          : tags.reduce(accumulateDataLength, 0),
  }
}

function accumulateDataLength(acc, object) {
  return (acc + object.data.length);
}

module.exports = {
  githubAuth,
  getAccessToken,
  getReposData,
};
