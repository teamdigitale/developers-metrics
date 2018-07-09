require('dotenv').config();

const { DISCOURSE_URL } = process.env;

const request = require('request-promise-native');

function get({ endpoint }) {
  return request({
    'method'  : 'GET',
    'uri'     : `${DISCOURSE_URL}/${endpoint}`,
    'headers' : {},
    'json'    : true,
  });
}

function getForumData() {
  return Promise.all([
    get({ 'endpoint': 'categories.json' }),
    get({ 'endpoint': 'directory_items.json?period=all&order=days_visited' }),
  ])
    .then(getForumAggregateData);
}

function getForumAggregateData([
  categoriesData,
  usersData,
]) {
  const categories  = categoriesData.category_list.categories;
  const users       = usersData.directory_items;

  return {
    'categories': categories.length,
    'topics'    : categories.map((category) => category.topic_count).reduce(accumulateCount, 0),
    'posts'     : categories.map((category) => category.post_count).reduce(accumulateCount, 0),
    'users'     : users.length,
  }
}

function accumulateCount(acc, count) {
  return (acc + count);
}

module.exports = {
  getForumData,
};
