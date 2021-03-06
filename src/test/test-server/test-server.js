/* ***** BEGIN LICENSE BLOCK *****
 *
 * Copyright (C) 2018 Namit Bhalla (oyenamit@gmail.com)
 * This file is part of 'Static File Server for Dummies' package.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * ***** END LICENSE BLOCK ***** */


/**
 * @file This file loads static file server package and acts as an HTTP server for test scripts
 * @copyright Copyright (C) 2018 Namit Bhalla (oyenamit@gmail.com)
 * @license GPL-3.0-or-later
 * @see test-client-http-req-resp.js
 */


var constants = require('../common/inc.js');
var express = require('express');
var fileServer = require('../../');

var app = express();

console.log('Starting Test Server');

var serverCommon = new fileServer.Server(constants.ROOT_FOLDER);

app.get('/GetMaliciousPath', function(req, res) {
    serverCommon.pipe(constants.MALICIOUS_PATH, 200, {}, req, res);
});

app.get('/GetNonExistingPath', function(req, res) {
    serverCommon.pipe(constants.NON_EXISTING_PATH, 200, {}, req, res);
});

app.get('/GetDefaultIndexFile', function(req, res) {
    serverCommon.pipe(constants.DEFAULT_INDEX_FILE_PATH, 200, {}, req, res);
});

app.get('/GetCustomIndexFile', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, { indexFiles: ['custom.html'] });
    server.pipe(constants.CUSTOM_INDEX_FILE_PATH, 200, {}, req, res);
});

app.get('/GetNonStrIndexFile', function(req, res) {
    try
    {
        var server = new fileServer.Server(constants.ROOT_FOLDER, { indexFiles: ['default.html', 100] });
    }
    catch(e)
    {
        var errorCode = (e instanceof TypeError) ? 500 : 503;
        res.writeHead(errorCode);
        res.end();

        return;
    }
    server.pipe(constants.NON_EXISTING_PATH, 200, {}, req, res);
});


app.get('/GetUndefinedIndexFile', function(req, res) {
    try
    {
        var server = new fileServer.Server(constants.ROOT_FOLDER, { indexFiles: [undefined] });
    }
    catch(e)
    {
        var errorCode = (e instanceof TypeError) ? 500 : 503;
        res.writeHead(errorCode);
        res.end();

        return;
    }
    server.pipe(constants.NON_EXISTING_PATH, 200, {}, req, res);
});


app.get('/GetFolderNoJSON', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.FOLDER_NO_JSON_PATH, 200, {}, req, res);
});

app.get('/GetFolderMalformedJSON', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.FOLDER_MALFORMED_JSON_PATH, 200, {}, req, res);
});

app.get('/GetFolderIncorrectJSON', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.FOLDER_INCORRECT_JSON_PATH, 200, {}, req, res);
});

app.get('/GetFolderMaliciousFileJSON', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.FOLDER_MALICIOUS_JSON_PATH, 200, {}, req, res);
});

app.get('/GetFolderNonExistingFileJSON', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.FOLDER_NON_EXISTING_FILE_JSON_PATH, 200, {}, req, res);
});

app.get('/GetFileRangeIsOff', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, { acceptRanges: false });
    server.pipe(constants.TEXT_FILENAME, 200, {}, req, res);
});

app.get('/GetFileDefaultHeadersOption', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.TEXT_FILENAME, 200, {'default-header': 'default-header-value'}, req, res);
});

app.get('/GetFileDefaultStatusOption', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.TEXT_FILENAME, 501, {}, req, res);
});

app.get('/GetFileServerNameHeader', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.TEXT_FILENAME, 200, {'Server': 'custom-server-name'}, req, res);
});

app.get('/GetFile*', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER);
    server.pipe(constants.TEXT_FILENAME, 200, {}, req, res);
});

app.get('/GetFolder*', function(req, res) {
    var server = new fileServer.Server(constants.ROOT_FOLDER, {});
    server.pipe(constants.FOLDER_PATH, 200, {}, req, res);
});


app.listen(3000);
