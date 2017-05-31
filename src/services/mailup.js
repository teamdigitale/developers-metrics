require('dotenv').config();

import request from 'request-promise-native';
import ngrok from 'ngrok';
import querystring from 'querystring';
import opn from 'opn';
import fs from 'fs';
import bluebird from 'bluebird';

const connect   = bluebird.promisify(ngrok.connect);
const readFile  = bluebird.promisify(fs.readFile);
const writeFile = bluebird.promisify(fs.writeFile);

const { MAILUP_URL, MAILUP_CLIENT_ID, MAILUP_CLIENT_SECRET } = process.env;
const { MAILUP_ACCESS_TOKEN, MAILUP_REFRESH_TOKEN } = process.env;
const { SERVER_PORT, REFRESH_TOKEN_PATH } = process.env;

const LOGON_URL   = 'Authorization/OAuth/LogOn';
const TOKEN_URL   = 'Authorization/OAuth/Token';
const CONSOLE_URL = 'API/v1.1/Rest/ConsoleService.svc/Console';

function checkAuth(endpoint = LOGON_URL) {
  if (!MAILUP_ACCESS_TOKEN || !MAILUP_REFRESH_TOKEN) {
    // No token/refresh pair is found in .env
    return connect({
      'proto': 'http',
      'addr' : SERVER_PORT,
    })
      .then((url) => {
        console.info(`Reverse proxy listening on ${url}`);

        const qs = querystring.stringify({
          'response_type' : 'code',
          'client_id'     : MAILUP_CLIENT_ID,
          'client_secret' : MAILUP_CLIENT_SECRET,
          'redirect_uri'  : `${url}/mailup`,
        });

        // Try to open into a Browser
        opn(`${MAILUP_URL}/${endpoint}?${qs}`);

        console.info('Visit this URL in order to obtain your access token:');
        console.info(`${MAILUP_URL}/${endpoint}?${qs}`);

        return new Promise().reject();
      });
  } else {
    // token/refresh pair have already been setup in .env
    return getMailDataWithRefreshToken();
  }
}

function refreshToken() {
  // Tries to retrieve the refreshed token from fs
  return readFile(REFRESH_TOKEN_PATH, 'utf8')
    .then((refresh_token) => {
      return request({
        'method'          : 'POST',
        'url'             : `${MAILUP_URL}/${TOKEN_URL}`,
        'json'            : true,
        'form': {
          'grant_type'    : 'refresh_token',
          'client_id'     : MAILUP_CLIENT_ID,
          'client_secret' : MAILUP_CLIENT_SECRET,
          // Defaults to the .env refresh token
          'refresh_token' : refresh_token || MAILUP_REFRESH_TOKEN,
        }
      });
    });
}

function storeRefreshToken({ access_token, refresh_token }) {
  return writeFile(REFRESH_TOKEN_PATH, refresh_token)
    .then(() => {
      return ({ access_token, refresh_token })
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
  return checkAuth();
}

function getMailDataWithRefreshToken() {
  return refreshToken()
    .then(storeRefreshToken)
    .then(getLists)
    .then(getListsRecipients)
    .then(getMailAggregateData);
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
  storeRefreshToken,
  getMailDataWithRefreshToken,
};
