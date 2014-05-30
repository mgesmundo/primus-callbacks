var Primus = require('primus')
  , PrimusCallbacks = require('../../')
  , http = require('http')
  , options = {
      transformer: 'websockets',
      parser: 'JSON',
      requestTimeout: 200
    };

var server = http.createServer()
  , primus = Primus(server, options);

primus.use('callbacks', PrimusCallbacks);

server.listen(3000, function() {
  primus.on('connection', function(spark) {
    console.log('connection');
    spark.on('request', function(req, callback) {
      console.log('received request from client');
      callback('ok');
    });
    spark.on('data', function(data) {
      if (data === 'ask me') {
        console.log('send request to client');
        spark.writeAndWait('hello from server', function (res) {
          console.log('received response from client');
          spark.write(res);
        });
      }
    });
  });
});

console.log('server started at %s:%s', server.address().address, server.address().port);

primus.save(__dirname + '/primus.js', function() {
  console.log('primus library saved');
});
