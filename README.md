# Team 7 Chat Server

To start the server, run `docker-compose up -d`.

It runs on the port 4000 (configurable in docker-compose.yml).

## TLS config

If you want the server to use HTTPS, provide `cert.pem` and `privkey.pem` in `app/certificates`. 
The server will automatically try to load them.

### About
This projet is a Cloud Computing class exercise for Reutlingen University
