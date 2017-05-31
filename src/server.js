require('dotenv').config();

import express from 'express';
import request from 'request-promise-native';
import querystring from 'querystring';
import fs from 'fs';

import { storeRefreshToken, getMailDataWithRefreshToken } from './services/mailup';

const { SERVER_PORT, REFRESH_TOKEN_PATH } = process.env;
const { MAILUP_URL } = process.env;
const ENDPOINT = 'Authorization/OAuth/Token';

const app = express();

app.get('/mailup', (req, res) => {
  const qs = querystring.stringify({
    'code'      : req.query.code,
    'grant_type': 'authorization_code',
  });

  return request({
    'method': 'GET',
    'url'   : `${MAILUP_URL}/${ENDPOINT}?${qs}`,
    'json'  : true,
  })
    .then((data) => {
      res.send(Object.assign(data, { 'message': 'paste these codes into your .env file' }));
    });
});

app.listen(SERVER_PORT, () => {
  console.log(`Server listening on port ${SERVER_PORT}!`)
});
