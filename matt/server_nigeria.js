var express = require('express');
var http = require('http');
var fs = require('fs');
var path = require('path');
var app = express();
var tilelive = require('tilelive');
var Bridge = require('..');
Bridge.registerProtocols(tilelive);

function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (directoryExists(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function directoryExists(path) {
    try {
        return fs.statSync(path).isDirectory();
    } catch (err) {
        return false;
    }
}

function fileExists(path) {
    try {
        fs.accessSync(path, fs.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}

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

    // requested url pattern
    app.get(/^\/nigeria\/(\d+)\/(\d+)\/(\d+)$/, function(req, res) {

        var z = req.params[0];
        var x = req.params[1];
        var y = req.params[2];

        var cache_path = path.join(__dirname, 'cache/' + z + '/' + x + '/' + y + '.pbf');
        console.log('---------------------------');

        // cache mechanism:
        // if the tile's cache exists we serve it directly without publishing it from PostGIS
        if (fileExists(cache_path)) {
            console.log('\x1b[32m', '  serve cached tile: ', z, x, y, '\x1b[0m');
            var stat = fs.statSync(cache_path);
            // the empty tile will have filesize = 0
            // otherwise, we have a valid tile, go ahead serve it
            if (stat.size > 0) {
                res.header("Content-Type", "application/x-protobuf");
                res.header("x-tilelive-contains-data", true);
                res.header("Content-Encoding", "gzip");
                res.header("Content-Length", stat.size);
                res.sendFile(cache_path);
            } else {
                res.status(204);
                res.send();
            }
        } else {
            source.getTile(z, x, y, function(err, tile, headers) {
                console.log('\x1b[31m', '  get fresh tile: ', z, x, y, '\x1b[0m');
                if (err) {
                    res.status(204); // if we have an empty tile, we throw 204 status to pacify the front-end library
                    res.send();
                    console.log('  err:' + err.message);

                    // cache this tile (status)
                    // the empty tile will have filesize = 0
                    ensureDirectoryExistence(cache_path);
                    fs.writeFile(cache_path, '', function(err) {
                        if (err) throw err;
                        console.log('  Tile cached: ' + cache_path);
                    });

                } else {
                    res.set(headers);
                    res.send(tile);

                    // cache this tile
                    ensureDirectoryExistence(cache_path);
                    fs.writeFile(cache_path, tile, function(err) {
                        if (err) throw err;
                        console.log('  Tile cached: ' + cache_path);
                    });
                }
            });
        }
    });

    http.createServer(app).listen(app.get('port'), function() {
        console.log('Express server listening on port ' + app.get('port'));
    });
});
