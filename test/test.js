/*global describe, it */
var Primus = require('primus')
  , PrimusCallbacks = require('../')
  , http = require('http')
  , expect = require('chai').expect
  , options = {
      transformer: 'websockets',
      parser: 'JSON',
      requestTimeout: 200
    }
  , opts = {
      transformer: 'websockets',
      parser: 'JSON',
      strategy: ['online', 'disconnect'],
      requestTimeout: 200
    };

function serverFactory(httpServer, options) {
  var primus = Primus(httpServer, options);
  primus.use('callbacks', PrimusCallbacks);

  return primus;
}

function clientFactory(httpServer, primus, port) {
  var address = httpServer.address()
    , url = 'http://' + address.address + ':' + (port || address.port);

  return new primus.Socket(url, opts);
}

describe('primus-callbacks', function() {

  var httpServer
    , primus
    , requestEnvelope = {
      plugin: 'primus-callbacks'
      , requestId: 'test'
      , data: 'test'
    }
    , responseEnvelope = {
      plugin: 'primus-callbacks'
      , responseId: 'test'
      , data: 'test'
    };

  beforeEach(function() {
    httpServer = http.createServer();
    primus = serverFactory(httpServer, options);
  });

  afterEach(function() {
    if(httpServer.running) {
      httpServer.close();
    }
  });

  describe('server spark', function() {
    it('should have a writeAndWait function', function(done) {
      httpServer.listen(function() {
        primus.on('connection', function(spark) {
          expect(spark.writeAndWait).to.be.a('function');
          done();
        });
      });
      clientFactory(httpServer, primus);
    });

    it('should trigger "request" event on incoming request envelope', function(done) {
      httpServer.listen(function() {
        primus.on('connection', function(spark) {
          spark.on('request', function() {
            done();
          });
        });
      });
      var client = clientFactory(httpServer, primus);
      client.write(requestEnvelope);
    });

    it('should send response envelope with given data when request event handler executes "done()"', function(done) {
      httpServer.listen(function() {
        primus.on('connection', function(spark) {
          spark.on('request', function(data, doneCallback) {
            doneCallback(responseEnvelope.data);
          })
        });
        primus.transform('outgoing', function(packet) {
          var data = packet.data;
          expect(data).to.be.eql(responseEnvelope);
          done();
        });
      });

      var client = clientFactory(httpServer, primus);
      client.write(requestEnvelope);
    });

    it('should rise a timedout error if the client can\'t reply', function(done) {
      httpServer.listen(function() {
        primus.on('connection', function(spark) {
          spark.writeAndWait('hello from server', function(res) {
            expect(res.timeout).to.be.eql(200);
            expect(res).to.be.instanceOf(Error);
            done();
          });
        });
      });
      var client = clientFactory(httpServer, primus);
    });
  });

  describe('client', function() {
    it('should have a writeAndWait function', function(done) {
      httpServer.listen(function() {
        var client = clientFactory(httpServer, primus);
        expect(client.writeAndWait).to.be.a('function');
        done();
      });
      clientFactory(httpServer, primus);
    });

    it('should trigger "request" event on incoming request envelope', function(done) {
      httpServer.listen(function() {
        var client = clientFactory(httpServer, primus);
        client.on('request', function() {
          done();
        });
        primus.on('connection', function(spark) {
          spark.write(requestEnvelope);
        });
      });
    });

    it('should send response envelope with given data when request event handler executes "done()"', function(done) {
      httpServer.listen(function() {
        var client = clientFactory(httpServer, primus);
        client.transform('outgoing', function(packet) {
          var data = packet.data;
          expect(data).to.be.eql(responseEnvelope);
          done();
        });
        client.on('request', function(data, doneCallback) {
          doneCallback(responseEnvelope.data);
        });
        primus.on('connection', function(spark) {
          spark.write(requestEnvelope);
        });
      });
    });

    it('should rise a timedout error if the server can\'t reply', function(done) {
      httpServer.listen(function() {
        primus.on('connection', function(spark) {
          spark.on('request', function(req) {
            expect(req).to.be.eql('hello from client');
          });
        });
      });
      var client = clientFactory(httpServer, primus);
      client.writeAndWait('hello from client', function(res) {
        expect(res.timeout).to.be.eql(200);
        expect(res).to.be.instanceOf(Error);
        done();
      });
    });
  });

  describe('client and server all together', function() {
    it('should execute the handler client after a client request', function(done) {
      httpServer.listen(function() {
        primus.on('connection', function(spark) {
          spark.on('request', function(req, callback) {
            expect(req).to.be.eql('hello from client');
            callback('ok');
          });
        });
      });
      var client = clientFactory(httpServer, primus);
      client.writeAndWait('hello from client', function(res) {
        expect(res).to.be.eql('ok');
        done();
      });
    });

    it('should execute the handler server after a server request', function(done) {
      httpServer.listen(function() {
        primus.on('connection', function(spark) {
          spark.writeAndWait('hello from server', function(res) {
            expect(res).to.be.eql('ok');
            done();
          });
        });
      });
      var client = clientFactory(httpServer, primus);
      client.on('request', function(req, callback) {
        expect(req).to.be.eql('hello from server');
        callback('ok');
      });
    });

    it('should reset the timeout timer after executing the handler on the client', function(done) {
      httpServer.listen(function() {
        primus.on('connection', function(spark) {
          spark.on('request', function(req, callback) {
            expect(req).to.be.eql('hello from client');
            callback('ok');
          });
        });
      });
      var client = clientFactory(httpServer, primus);
      var counter = 0;
      client.writeAndWait('hello from client', function(res) {
        counter++;
        expect(res).to.be.eql('ok');
        // wait more than 200 ms: if the callback is called more times, the counter is wrong
        setTimeout(function() {
          expect(counter).to.be.eql(1);
          done();
        }, 500);
      });
    });

    it('should reset the timeout timer after executing the handler on the server', function(done) {
      httpServer.listen(function() {
        var counter = 0;
        primus.on('connection', function(spark) {
          spark.writeAndWait('hello from server', function(res) {
            counter++;
            expect(res).to.be.eql('ok');
            setTimeout(function() {
              expect(counter).to.be.eql(1);
              done();
            }, 500);
          });
        });
      });
      var client = clientFactory(httpServer, primus);
      client.on('request', function(req, callback) {
        expect(req).to.be.eql('hello from server');
        callback('ok');
      });
    });
  });
});