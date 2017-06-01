require('dotenv').config();

import express from 'express';
import request from 'request-promise-native';
import querystring from 'querystring';
import fs from 'fs';

import { storeRefreshToken, getMailDataWithRefreshToken } from './services/mailup';
import { githubAuth, getAccessToken } from './services/github';

const { SERVER_PORT, REFRESH_TOKEN_PATH } = process.env;
const { MAILUP_URL } = process.env;
const MAILUP_ENDPOINT = 'Authorization/OAuth/Token';

const app = express();

app.get('/mailup', (req, res) => {
  const qs = querystring.stringify({
    'code'      : req.query.code,
    'grant_type': 'authorization_code',
  });

  return request({
    'method': 'GET',
    'url'   : `${MAILUP_URL}/${MAILUP_URL}?${qs}`,
    'json'  : true,
  })
    .then((data) => {
      res.send(Object.assign(data, {
        'message': 'paste these codes into `MAILUP_ACCESS_TOKEN` and `MAILUP_REFRESH_TOKEN` in your .env file'
      }));
    });
});

app.get('/github', (req, res) => {
  return getAccessToken({ 'code': req.query.code })
    .then((data) => {
      const message = {
        'message': 'paste this code into `GITHUB_ACCESS_TOKEN` in your .env file'
      };
      const response = Object.assign(data, message);
      res.send(response);

      return response.message;
    })
    .then((message) => {
      // Exits the local process
      githubAuth.reject(message);
    });
});

app.listen(SERVER_PORT, () => {
  console.log(`Server listening on port ${SERVER_PORT}!`)
});
