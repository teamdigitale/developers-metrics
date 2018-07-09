require("dotenv").config();

const express = require("express");
const request = require("request-promise-native");
const querystring = require("querystring");
const fs = require("fs");

const { mailupAuth, getAccessRefreshToken } = require("./services/mailup");
const { githubAuth, getAccessToken } = require("./services/github");

const { SERVER_PORT } = process.env;

const app = express();

app.get("/mailup", (req, res) => {
  return getAccessRefreshToken({ code: req.query.code })
    .then(data => {
      const message = {
        message:
          "paste these codes into `MAILUP_ACCESS_TOKEN` and `MAILUP_REFRESH_TOKEN` in your .env file"
      };
      const response = Object.assign(data, message);
      res.send(response);

      return response.message;
    })
    .then(message => {
      // Exits the local process
      mailupAuth.reject(message);
    });
});

app.get("/github", (req, res) => {
  return getAccessToken({ code: req.query.code })
    .then(data => {
      const message = {
        message: "paste this code into `GITHUB_ACCESS_TOKEN` in your .env file"
      };
      const response = Object.assign(data, message);
      res.send(response);

      return {
        message: response.message,
        access_token: response.access_token
      };
    })
    .then(({ message, access_token }) => {
      // Exits the local process
      githubAuth.reject(`${message}: ${access_token}`);
    });
});

app.listen(SERVER_PORT, () => {
  console.info(`Server listening on port ${SERVER_PORT}!`);
});
