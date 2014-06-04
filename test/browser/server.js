var Primus = require('primus')
  , PrimusCallbacks = require('../../')
  , http = require('http')
  , chai = require('chai')
  , options = {
      transformer: 'websockets',
      parser: 'JSON',
      requestTimeout: 200
  },
  expect = chai.expect
  ;

var server = http.createServer()
  , primus = Primus(server, options);

primus.use('callbacks', PrimusCallbacks);

server.listen(3000, function() {
  primus.on('connection', function(spark) {
    console.log('connection');
    spark.on('request', function(req, callback) {
      console.log('received request from client');
      if (req === 'hello from client with error') {
        callback(new Error('unknown'), 'ok');
      } else if (req === 'hello from client with data error') {
        callback(new Error('unknown'), { body: { error: new Error('data error')}});
      } else {
        callback(null, 'ok');
      }
    });
    spark.on('data', function(data) {
      if (data === 'ask me') {
        console.log('send request to client');
        spark.writeAndWait('hello from server', function (err, res) {
          console.log('received response from client');
          var envelope = {
            data: res,
            err: err
          };
          spark.write(envelope);
        });
      } else if (data === 'ask me with error') {
        console.log('send request to client');
        spark.writeAndWait('hello from server', function (err, res) {
          console.log('received response from client');
          expect(err).to.instanceOf(Error);
          expect(err.message).to.be.equal('unknown');
          expect(res.body.error).to.be.instanceOf(Error);
          expect(res.body.error.message).to.be.eql('data error');
          spark.write('ok');
        });
      }
    });
  });
});

console.log('server started at %s:%s', server.address().address, server.address().port);

primus.save(__dirname + '/primus.js', function() {
  console.log('primus library saved');
});
