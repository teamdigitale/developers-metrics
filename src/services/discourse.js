require("dotenv").config();

const request = require("request-promise-native");

const { DISCOURSE_URL } = process.env;
const PAGE_SIZE = 50;

const get = ({ endpoint }) => {
  return request({
    method: "GET",
    uri: `${DISCOURSE_URL}/${endpoint}`,
    headers: {},
    json: true
  });
};

const paginate = async ({ endpoint, page = 0, data = [] }) => {
  let response = await get({
    endpoint: `${endpoint}&page=${page}`
  });

  let { directory_items } = response;
  data = data.concat(directory_items);

  while (directory_items.length === PAGE_SIZE) {
    response = await get({
      endpoint: `${endpoint}&page=${page}`,
      page: ++page,
      data
    });
    directory_items = response.directory_items;
    data = data.concat(directory_items);
  }

  return {
    directory_items: data
  };
};

function getForumData() {
  return Promise.all([
    get({ endpoint: "categories.json" }),
    paginate({
      endpoint: "directory_items.json?period=all"
    })
  ]).then(getForumAggregateData);
}

function getForumAggregateData([categoriesData, usersData]) {
  const categories = categoriesData.category_list.categories;
  const users = usersData.directory_items;

  return {
    categories: categories.length,
    topics: categories
      .map(category => category.topic_count)
      .reduce(accumulateCount, 0),
    posts: categories
      .map(category => category.post_count)
      .reduce(accumulateCount, 0),
    users: users.length
  };
}

function accumulateCount(acc, count) {
  return acc + count;
}

module.exports = {
  getForumData
};
