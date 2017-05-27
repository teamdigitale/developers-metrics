require('dotenv').config();

import GitHub from 'github-api';

const { GITHUB_USER, GITHUB_TOKEN } = process.env;

const github = new GitHub({
  'token' : GITHUB_TOKEN,
});

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

  data.map((repo) => {
    const getRepo = github.getRepo(GITHUB_USER, repo.name);

    contributors.push(getRepo.getContributors());
    branches.push(getRepo.listBranches());
    commits.push(getRepo.listCommits());
    forks.push(getRepo.listForks());
    pullRequests.push(getRepo.listPullRequests());
    tags.push(getRepo.listTags());
  });

  return Promise.all([
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
  contributors,
  branches,
  commits,
  forks,
  pullRequests,
  tags
]) {
  return {
    'contributors'  : contributors.reduce(accumulateDataLength, 0),
    'branches'      : branches.reduce(accumulateDataLength, 0),
    'commits'       : commits.reduce(accumulateDataLength, 0),
    'forks'         : forks.reduce(accumulateDataLength, 0),
    'pullRequests'  : pullRequests.reduce(accumulateDataLength, 0),
    'tags'          : tags.reduce(accumulateDataLength, 0),
  }
}

function accumulateDataLength(acc, object) {
  return (acc + object.data.length);
}

module.exports = {
  getReposData,
};
