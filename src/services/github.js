require('dotenv').config();

import GitHub from 'github-api';
import Requestable from 'github-api/dist/components/Requestable';

const { GITHUB_USER, GITHUB_TOKEN } = process.env;

const token = {
  'token': GITHUB_TOKEN,
}

const github      = new GitHub(token);
const requestable = new Requestable(token);

function getReposData() {
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
  getReposData,
};
