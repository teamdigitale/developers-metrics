require('dotenv').config();

import request from 'request-promise-native';

const { MAILUP_URL, MAILUP_USERNAME, MAILUP_PASSWORD, MAILUP_CLIENT_ID, MAILUP_CLIENT_SECRET } = process.env;

const CONSOLE_URL = 'API/v1.1/Rest/ConsoleService.svc/Console';

function auth({ endpoint }) {
  return request({
    'method'          : 'POST',
    'url'             : `${MAILUP_URL}/${endpoint}`,
    'json'            : true,
    'form': {
      'grant_type'    : 'password',
      'username'      : MAILUP_USERNAME,
      'password'      : MAILUP_PASSWORD,
      'client_id'     : MAILUP_CLIENT_ID,
      'client_secret' : MAILUP_CLIENT_SECRET,
    }
  });
}

function get({ endpoint, token }) {
  return request({
    'method'          : 'GET',
    'uri'             : `${MAILUP_URL}/${endpoint}`,
    'headers': {
      'Authorization' : `Bearer ${token}`,
    },
    'json'            : true,
  });
}

function getLists({ access_token }) {
  return Promise.all([
    get({
      'endpoint': `${CONSOLE_URL}/List`,
      'token'   : access_token,
    }),
    access_token
  ]);
}

function getListsRecipients([ listsData, access_token ]) {
  const listsItems    = listsData.Items;

  const pending       = [];
  const subscribed    = [];
  const unsubscribed  = [];

  const token         = access_token;

  listsItems.map((list) => {
    const { IdList } = list;

    pending.push(get({ 'endpoint': `${CONSOLE_URL}/List/${IdList}/Recipients/Pending`, token }));
    subscribed.push(get({ 'endpoint': `${CONSOLE_URL}/List/${IdList}/Recipients/Subscribed`, token }));
    unsubscribed.push(get({ 'endpoint': `${CONSOLE_URL}/List/${IdList}/Recipients/Unsubscribed`, token }));
  });

  return Promise.all([
    listsItems,
    Promise.all(pending),
    Promise.all(subscribed),
    Promise.all(unsubscribed),
    access_token
  ]);
}

function getMailData() {
  return auth({ 'endpoint': '/Authorization/OAuth/Token' })
    .then(getLists)
    .then(getListsRecipients)
    .then(getMailAggregateData)
}

function getMailAggregateData([
  lists,
  pending,
  subscribed,
  unsubscribed
]) {
  return {
    'lists'       : lists.length,
    'pending'     : pending.reduce(accumulateItemsLength, 0),
    'subscribed'  : subscribed.reduce(accumulateItemsLength, 0),
    'unsubscribed': unsubscribed.reduce(accumulateItemsLength, 0),
  }
}

function accumulateItemsLength(acc, object) {
  return (acc + object.Items.length);
}

module.exports = {
  getMailData,
};
