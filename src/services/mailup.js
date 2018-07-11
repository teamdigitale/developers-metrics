require("dotenv").config();

const fs = require("fs");
const request = require("request-promise-native");
const querystring = require("querystring");
// const opn = require("opn");
const bluebird = require("bluebird");

const readFile = bluebird.promisify(fs.readFile);
const writeFile = bluebird.promisify(fs.writeFile);

const { MAILUP_URL, MAILUP_CLIENT_ID, MAILUP_CLIENT_SECRET } = process.env;
const { MAILUP_ACCESS_TOKEN, MAILUP_REFRESH_TOKEN } = process.env;
const { SERVER_URL, SERVER_PORT, REFRESH_TOKEN_PATH } = process.env;

const LOGON_URL = "Authorization/OAuth/LogOn";
const TOKEN_URL = "Authorization/OAuth/Token";
const CONSOLE_URL = "API/v1.1/Rest/ConsoleService.svc/Console";

const mailupAuth = Promise.defer();

function checkAuth(endpoint = LOGON_URL) {
  if (!MAILUP_ACCESS_TOKEN || !MAILUP_REFRESH_TOKEN) {
    // No token/refresh pair is found in .env
    const qs = querystring.stringify({
      response_type: "code",
      client_id: MAILUP_CLIENT_ID,
      client_secret: MAILUP_CLIENT_SECRET,
      redirect_uri: `${SERVER_URL}/mailup`
    });

    // Try to open into a Browser
    // opn(`${MAILUP_URL}/${endpoint}?${qs}`);

    console.info("Visit this URL in order to obtain your access token:");
    console.info(`${MAILUP_URL}/${endpoint}?${qs}`);

    return mailupAuth.promise;
  } else {
    // token/refresh pair have already been setup in .env
    return getMailDataWithRefreshToken();
  }
}

function getAccessRefreshToken({ code }) {
  const qs = querystring.stringify({
    code: code,
    grant_type: "authorization_code"
  });

  return request({
    method: "GET",
    url: `${MAILUP_URL}/${TOKEN_URL}?${qs}`,
    json: true
  });
}

function refreshToken() {
  // Tries to retrieve the refreshed token from fs
  return readFile(REFRESH_TOKEN_PATH, "utf8").then(refresh_token => {
    return request({
      method: "POST",
      url: `${MAILUP_URL}/${TOKEN_URL}`,
      json: true,
      form: {
        grant_type: "refresh_token",
        client_id: MAILUP_CLIENT_ID,
        client_secret: MAILUP_CLIENT_SECRET,
        // Defaults to the .env refresh token
        refresh_token: refresh_token || MAILUP_REFRESH_TOKEN
      }
    });
  });
}

function storeRefreshToken({ access_token, refresh_token }) {
  return writeFile(REFRESH_TOKEN_PATH, refresh_token).then(() => {
    return { access_token, refresh_token };
  });
}

function get({ endpoint, token }) {
  return request({
    method: "GET",
    uri: `${MAILUP_URL}/${endpoint}`,
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  });
}

function getLists({ access_token }) {
  return Promise.all([
    get({
      endpoint: `${CONSOLE_URL}/List`,
      token: access_token
    }),
    access_token
  ]);
}

function getListsRecipients([listsData, access_token]) {
  const listsItems = listsData.Items;

  const pending = [];
  const subscribed = [];
  const unsubscribed = [];

  const token = access_token;

  listsItems.map(list => {
    const { IdList } = list;

    pending.push(
      get({
        endpoint: `${CONSOLE_URL}/List/${IdList}/Recipients/Pending`,
        token
      })
    );
    subscribed.push(
      get({
        endpoint: `${CONSOLE_URL}/List/${IdList}/Recipients/Subscribed`,
        token
      })
    );
    unsubscribed.push(
      get({
        endpoint: `${CONSOLE_URL}/List/${IdList}/Recipients/Unsubscribed`,
        token
      })
    );
  });

  return Promise.all([
    listsData,
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

function getMailAggregateData([lists, pending, subscribed, unsubscribed]) {
  return {
    lists: lists.TotalElementsCount,
    pending: pending.reduce(accumulateTotalElementsCount, 0),
    subscribed: subscribed.reduce(accumulateTotalElementsCount, 0),
    unsubscribed: unsubscribed.reduce(accumulateTotalElementsCount, 0)
  };
}

function accumulateTotalElementsCount(acc, object) {
  return acc + object.TotalElementsCount;
}

module.exports = {
  mailupAuth,
  getAccessRefreshToken,
  getMailData,
  getMailDataWithRefreshToken
};
