# Static File Server for Dummies
This Node package is an RFC-complaint HTTP server that can be used to serve files or folders to an HTTP client (user agent). It is meant to be an introductory example for [Node.js](https://nodejs.org) and HTTP servers that respond to GET requests. Beginners can use it to understand how Node works. It does not use any middleware packages like `express`. Instead, only plain vanilla Node modules are used to develop the server.

**Note:** _This package is **not** meant for use in a production environment_.
## Serving a folder
When a request for a folder is received, the static server will attempt to serve the folder using the following sequential steps: 
1. Check if the folder contains an index file. The name of the file will depend on value of the `indexFiles` option specified in the `Server` constructor. If no value is specified `index.html` is used.
2. If no index file is found, the server will try to archive the contents of the folder and send it to the user agent as a zip file. But before that, the server will check if the user agent supports `deflate` compression. If the user agent explicitly does not support `deflate`, HTTP error `406` is sent as a response.
3. If client supports `deflate` compression, check if the folder contains a file named `index.json`. This file should contain a list of files under the folder that should be served. For example: `{ 
    "files": ["afile.txt", "error.png" ] 
}`
4. If a valid `index.json` is found, the server will archive and compress the specified files and serve the zip file to the user agent.
5. If `index.json` is also not found, HTTP error `404` is sent as a response to the user agent.


## API
### Server
This is a constructor function that is used to create an instance of the static file server.
```javascript
var serveStatic = require('<path to the package source>');

// Use this form if using as an NPM package
var serveStatic = require('static-file-server-for-dummies');

// Create a new instance of the static server
var server = new serveStatic.Server('/public', { acceptRanges: true, indexFiles: ['default.html'] });
```
#### Server(root, options)
##### root
Create a new server instance to serve files within the `root` folder. When a file is not found, the server sends `404` to the user agent. If an attempt is made to serve files outside the `root` folder, the request fails with HTTP error code `403`. If `root` is not specified, the current directory is used as the root.
##### Options
###### acceptRanges
If this option is set to `true`, the server will support ranged requests for resources. User agents can request a part of a resource using the `Range` HTTP header.
###### indexFiles
By default, when a user agent requests for a folder, the static server will try to look for `index.html` and if found, serve it. To change this behavior, this option can be set to an array of filenames in preferred order
```javascript
var server = new serveStatic.Server('/public', { acceptRanges: true, indexFiles: ['custom.html', 'default.html'] });
```
###### defaultHeaders
This object contains HTTP headers that must be sent to the user agent as part of all HTTP responses.
### Server.pipe
This method should be called to respond to a request for serving a file or a folder.
```javascript
// Create a vanilla Node.js server
http.createServer(function (req, res) {
    req.addListener('end', function() {
        // Respond to the incoming request by serving a static file 'sampleText.txt'
        server.pipe('sampleText.txt', 200, {}, req, res);
    }).resume();
}).listen(3000);
```
#### pipe(path, status, headers, request, response, zipFileName)
##### path
The path of the file or folder that should be sent to the user agent. This path is relative to the `root` folder specified in the `Server` constructor.
##### status
The default value of HTTP status code that should be returned to the user agent. If an error occurs, this code is overridden and appropriate code is sent instead.
##### headers
This object contains HTTP headers that should be sent to the user agent as part of HTTP response for this request. These headers override the `defaultHeaders` specified in the `Server` constructor.
##### request
This is the HTTP request object that represents the request from the user agent.
##### response
This is the HTTP response object that is used to send response to the user agent.
##### zipFileName
This name would be used for the archive zip file while serving a folder using `index.json`
## Sample Usage - 1
Create a `client.js` file which uses the static server package to create an HTTP file server as shown below (assume that the code for this package is saved at `/home/neo/static-server-dummies`):
```javascript
var http = require('http');

var serveStatic = require('/home/neo/static-server-dummies');

// Create a new instance of the static server
var server = new serveStatic.Server('/public', { acceptRanges: true, indexFiles: ['default.html'] });

// Create an HTTP server and listen on port 3000
http.createServer(function (req, res) {
    req.addListener('end', function() {
        // Respond to the incoming request by serving a static file 'sampleText.txt'
        server.pipe('sampleText.txt', 200, {}, req, res);
    }).resume();
}).listen(3000);
```
Run this code to start the HTTP server:

`node client.js`

Next, create a folder `/public` and place a text file inside it named `sampleText.txt`.

The server is now ready to serve files. Send an HTTP GET request to the server using the `curl` utility:

`curl -i localhost:3000`

The response from the server consists of HTTP headers followed by the contents of `sampleText.txt` file:

```
HTTP/1.1 200 OK
Server: static-file-server-for-dummies/1.0.0
Accept-Ranges: bytes
Date: Wed, 06 Jun 2018 14:18:48 GMT
Last-Modified: Mon Apr 30 2018 18:25:58 GMT+0530 (IST)
Etag: "15949175-823-1525092958000"
Content-Disposition: filename=sampleText.txt
Content-Type: text/plain; charset=UTF-8
Content-Length: 823
Connection: keep-alive
```
## Sample Usage - 2
This package contains a test server script that can be used to create an HTTP server. Run the `test-server.js` script to start the HTTP server:

`node test-server.js`

Using `curl` utility, send an HTTP GET request to the server:

`curl -i localhost:3000/GetFile`

The response from the server consists of HTTP headers followed by contents of `afile.txt` file:

```
HTTP/1.1 200 OK
X-Powered-By: Express
Server: static-file-server-for-dummies/1.0.0
Accept-Ranges: bytes
Date: Wed, 06 Jun 2018 14:33:36 GMT
Last-Modified: Thu Dec 07 2017 18:55:14 GMT+0530 (IST)
Etag: "15325279-10-1512653114000"
Content-Disposition: filename=afile.txt
Content-Type: text/plain; charset=UTF-8
Content-Length: 10
Connection: keep-alive

0123456789
```

The `test-server.js` script supports several use cases for serving file and folders including error scenarios, malicious paths, different values for options etc. Please refer to the file in the source code for more information.
## Dependencies
This package has been developed and tested using the following Node packages:
1. [archiver](https://www.npmjs.com/package/archiver) v2.1.0
2. [mime](https://www.npmjs.com/package/mime) v1.5.0

For automated testing, this package has the following dependencies:
1. [mocha](https://www.npmjs.com/package/mocha) v5.0.1
2. [express](https://www.npmjs.com/package/express) v4.16.2
3. [request](https://www.npmjs.com/package/request) v2.83.0
## Automated Testing
This package includes test scripts using the [Mocha](https://mochajs.org/) framework that can be used for automated testing of the server code using `npm test` command.


**Note:** Some of the automated tests involving conditional GET requests depend on the file system specific "inode" number and modification timestamp of files in the test fixtures. The inode numbers and timestamps would change once the code is downloaded from GitHub. As a result, some of the tests would fail. To fix this, changes need to be made to the etag values and timestamps mentioned in `inc.js` file. Future versions of this package would rectify this issue and avoid this dependency.