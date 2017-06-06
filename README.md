# StatsD metrics for developers.italia.it

## Requirements
- [Node v6.9.0+](https://nodejs.org/en/download/releases/)
- npm (or [yarn](https://yarnpkg.com/))

### Setup
```
$ brew install nodenv
# or brew install nvm
```

## Development

### Start Telegraf (StatsD), InfluxDB and Grafana
In order to setup a [StatsD](https://github.com/etsy/statsd) instance locally, with [Docker](https://www.docker.com/get-docker) installed, run:

```
$ ./docker-run.dev.sh
```

[Grafana](https://github.com/grafana/grafana) will run at `http://localhost:3003` (root/root).
[InfluxDB](https://github.com/influxdata/influxdb) will run at `http://localhost:3004` (root/root);
You can setup your `InfluxDB` data source into `Grafana` as described [here](https://github.com/samuelebistoletti/docker-statsd-influxdb-grafana#add-data-source-on-grafana).
You can import the [dashboard](http://localhost:3003/dashboard/db/developers-metrics) by using the provided JSON in `export/developers-metrics.json`.

### <a name="node"></a> Start the Node app

```
$ npm install
# or yarn install
```

```
$ npm run dev
# or yarn run dev
```

## External Services (APIs)
- [GitHub](http://github-tools.github.io/github/docs/3.1.0/index.html)
- [Discourse](http://docs.discourse.org/)
- [MailUp](http://help.mailup.com/display/mailupapi/REST+API) ([operations](https://services.mailup.com/API/v1.1/Rest/ConsoleService.svc/help))

### API Keys (.env)

```
$ cp .env.mock .env
```

Setup your GitHub client/secret obtained from the [app page](https://github.com/settings/applications/new) (use `http://localhost:3000` as `Authorization callback URL`) into `GITHUB_TOKEN`.

Setup your MailUp client/secret obtained from the [developers console](http://help.mailup.com/display/mailupapi/Get+a+Developer+Account) into `MAILUP_CLIENT_ID` and `MAILUP_CLIENT_SECRET`.

#### GitHub access token
GitHub will require a one-time [authorization code grant](https://developer.github.com/apps/building-integrations/setting-up-and-registering-oauth-apps/about-authorization-options-for-oauth-apps/).
[Start the Node app](#node) and follow the authorization flow:
- Authorize the GitHub application from the provided browser window (check the link into the console otherwise)
- Setup your `GITHUB_ACCESS_TOKEN`

#### MailUp access token
MailUp will require a one-time [authorization code grant](http://help.mailup.com/display/mailupapi/Authenticating+with+OAuth+v2).
[Start the Node app](#node) and follow the authorization flow:
- Login into MailUp from the provided browser window (check the link into the console otherwise)
- Setup your `MAILUP_ACCESS_TOKEN` and `MAILUP_REFRESH_TOKEN`

## Production

```
$ npm start
# or yarn start
```
