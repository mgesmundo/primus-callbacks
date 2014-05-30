/*global describe, it, Primus */

var expect = chai.expect
  , options = {
      transformer: 'websockets',
      parser: 'JSON',
      strategy: ['online', 'disconnect'],
      requestTimeout: 200
    };

describe('primus-callbacks', function() {
  it('should execute the handler client after a client request', function(done) {
    var primus = Primus.connect('http://localhost:3000', options);
    primus.on('open', function () {
      console.log('open');
      primus.writeAndWait('hello from client', function (res) {
        expect(res).to.be.eql('ok');
        primus.end();
        done();
      });
    });
  });

  it('should execute the handler server after a server request', function(done) {
    var primus = Primus.connect('http://localhost:3000', options);
    primus.on('open', function () {
      console.log('open');
      primus.write('ask me');
    });
    primus.on('request', function (req, callback) {
      expect(req).to.be.eql('hello from server');
      callback('ok');
    });
    primus.on('data', function (data) {
      expect(data).to.be.eql('ok');
      primus.end();
      done();
    });
  });
});
