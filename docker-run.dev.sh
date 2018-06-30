# https://github.com/samuelebistoletti/docker-statsd-influxdb-grafana

docker run --ulimit nofile=66000:66000 \
  -d \
  --name docker-statsd-influxdb-grafana \
  -p 3003:3003 \
  -p 3004:8888 \
  -p 8086:8086 \
  -p 22022:22 \
  -p 8125:8125/udp \
  samuelebistoletti/docker-statsd-influxdb-grafana:latest

echo To stop the container launch:
echo docker stop docker-statsd-influxdb-grafana

echo To start the container again launch:
echo docker start docker-statsd-influxdb-grafana
