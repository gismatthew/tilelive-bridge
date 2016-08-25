var express = require('express');
var http = require('http');
var app = express();
var tilelive = require('tilelive');
var Bridge = require('..');
Bridge.registerProtocols(tilelive);

tilelive.load('bridge:///Users/mel044/Documents/GitHub/tilelive-bridge/matt/nigeria.xml', function(err, source) {

    if (err) {
        throw err;
    }
    app.set('port', 8081);

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.get(/^\/nigeria\/(\d+)\/(\d+)\/(\d+)$/, function(req, res){

        var z = req.params[0];
        var x = req.params[1];
        var y = req.params[2];

		console.log('---------------------------');
        console.log('  get tile %d, %d, %d', z, x, y);

        source.getTile(z, x, y, function(err, tile, headers) {

            if (err) {
                res.status(204);
				/* res.set(headers);
				res.send(); */
                console.log('  err:' + err.message);
				// console.log(headers);
            } else {
              res.set(headers);
              // res.header("Content-Type", "application/x-protobuf");
              res.send(tile);
              // console.log('ok:', err);

            }
        });
    });

    http.createServer(app).listen(app.get('port'), function() {
        console.log('Express server listening on port ' + app.get('port'));
    });
});
