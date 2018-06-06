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
 * @file Main implementation file for static file server.
 * @copyright Copyright (C) 2018 Namit Bhalla (oyenamit@gmail.com)
 * @license GPL-3.0-or-later
 * @requires archiver
 * @requires mime
 */


/* jshint node: true, esversion: 6, sub:true, forin: false */


"use strict";


// ---------------------------------------------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------------------------------------------
var fs       = require('fs');
var http     = require('http');
var path     = require('path');
var archiver = require('archiver');
var mime     = require('mime');
var stream   = require('stream');
var os       = require('os');


// ---------------------------------------------------------------------------------------------------------------
// Version of this package. This is returned if client does not specify any version in the 'Server' header
// ---------------------------------------------------------------------------------------------------------------
var version = [1, 0, 0];


// ---------------------------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------------------------
var TEMP_ARCHIVE_NAME   = 'temp_archive.zip';
var TEMP_ARCHIVE_REGEXP = /^temp_archive\.zip0.[0-9]+$/;


/**
 * The interface class for static file server
 * @extends stream
 * @access public
 */
class Server extends stream
{
    /**
     * @constructor
     * @access public
     * @param {string} [root=<current directory>] - Root folder that contains resources that can be served to user agents
     * @param {object} [options=<empty object>] - Key/value pairs of options to configure the server
     * @throws {TypeError} indexFiles option must be an array of strings
     */
    constructor(root, options)
    {
        super();

        // -------------------------------------------------------------------------------------------------------
        // 'root' is expected to be a string and 'options' is expected to be an 'object'
        // If 'root' is not specified, it is assumed to be the current directory.
        // If 'options' is not specified, it is assumed to be an empty object.
        // -------------------------------------------------------------------------------------------------------
        if((undefined === root) && (undefined === options))
        {
            root    = null;
            options = {};
        }

        if(root && (typeof(root) === 'string') && (undefined === options))
        {
            options = {};
        }

        if(root && (typeof(root) === 'object'))
        {
            options = root;
            root    = null;
        }

        this.root    = path.resolve(root || '.');
        this.options = options || {};

        console.log('Initializing server with root path = ' + this.root);

        if(!validateIndexFilesList(this.options))
        {
            throw new TypeError('indexFiles must be an array of strings');
        }

        // -------------------------------------------------------------------------------------------------------
        // Set default value for indexFiles option if it was not specified by client
        // -------------------------------------------------------------------------------------------------------
        if(!('indexFiles' in options))
        {
            this.options.indexFiles = ['index.html'];
        }

        // -------------------------------------------------------------------------------------------------------
        // Copy default headers specified by client to our 'effective' defaultHeaders
        // -------------------------------------------------------------------------------------------------------
        this.defaultHeaders  = {};
        for(var h in this.options.defaultHeaders)
        {
            this.defaultHeaders[h] = this.options.defaultHeaders[h];
        }

        // -------------------------------------------------------------------------------------------------------
        // If client does not specify a 'Server' header, provide our own
        // -------------------------------------------------------------------------------------------------------
        if(!('Server' in this.defaultHeaders))
        {
            this.defaultHeaders['Server'] = 'static-file-server-for-dummies/' + version.join('.');
        }

        // -------------------------------------------------------------------------------------------------------
        // If client has not set the acceptRanges option, default it to true.
        // -------------------------------------------------------------------------------------------------------
        this.options.acceptRanges = (this.options.acceptRanges !== undefined) ? Boolean(this.options.acceptRanges) : true;

        if(this.options.acceptRanges)
        {
            this.defaultHeaders['Accept-Ranges'] = 'bytes';
        }
    }
}


/**
 * The primary interface used by clients to request a resource
 * @access public
 * @param {string} relpath - Relative path of the resource to be served
 * @param {integer} status - HTTP status code to be returned to the user agent
 * @param {object} headers - An object containing default HTTP headers for this response
 * @param {object} req - The HTTP request object
 * @param {object} res - The HTTP response object
 * @param {string} [zipFileName=undefined] - Filename to be used while serving a zipped folder
 * @returns {object} The HTTP response object
 */
Server.prototype.pipe = function(relpath, status, headers, req, res, zipFileName)
{
    var emitter = this;

    // -----------------------------------------------------------------------------------------------------------
    // This will take care of . and .. in relpath
    // -----------------------------------------------------------------------------------------------------------
    var servePath = path.resolve(path.join(this.root, relpath));

    // -----------------------------------------------------------------------------------------------------------
    // Merge default headers with specific headers sent by client for this request
    // -----------------------------------------------------------------------------------------------------------
    var effectiveHeaders = {};
    for(var h in this.defaultHeaders)
    {
        effectiveHeaders[h] = this.defaultHeaders[h];
    }

    for(var k in headers)
    {
        effectiveHeaders[k] = headers[k];
    }

    effectiveHeaders['Date'] = (new Date()).toUTCString();

    // -----------------------------------------------------------------------------------------------------------
    // Confirm that the path is under root
    // -----------------------------------------------------------------------------------------------------------
    if(isMaliciousPath(servePath, this.root))
    {
        console.error('Cannot serve from outside of root folder');
        onError(403, effectiveHeaders, res, emitter);
        return res;
    }

    fs.stat(servePath, (e, stat) => {
        if(!e)
        {
            if(stat.isFile())
            {
                serveFile(servePath, status, effectiveHeaders, req, res, this.options, stat, emitter);
            }
            else if(stat.isDirectory())
            {
                serveFolder(servePath, status, effectiveHeaders, req, res, this.options, zipFileName, emitter);
            }
            else
            {
                // -----------------------------------------------------------------------------------------------
                // Only folders and regular files are supported.
                // -----------------------------------------------------------------------------------------------
                console.error('Can serve only file or folder');
                onError(400, effectiveHeaders, res, emitter);
            }
        }
        else
        {
            // ---------------------------------------------------------------------------------------------------
            // Error returned by stat. Cannot serve this path.
            // ---------------------------------------------------------------------------------------------------
            console.error(e.message);
            onError(404, effectiveHeaders, res, emitter);
        }

    });

    // -----------------------------------------------------------------------------------------------------------
    // Return the response object. This allows client to 'chain' the pipe calls.
    // -----------------------------------------------------------------------------------------------------------
    return res;
};


/**
 * Utility function to evaluate if request to serve a file is satisfiable or not
 * @access package
 * @param {string} fullPath - Absolute path of the file that needs to be served
 * @param {integer} status - Default HTTP status code specified by the client that should be sent in the HTTP response
 * @param {object} headers - HTTP headers that should be sent along with the HTTP response
 * @param {object} req - The HTTP request object
 * @param {object} res - The HTTP response object
 * @param {object} options - The option object sent by the client during initialization of the server
 * @param {object} stat - The object returned by fs.stat()
 * @param {object} emitter - An EventEmitter object
 */
function serveFile(fullPath, status, headers, req, res, options, stat, emitter)
{
    // -----------------------------------------------------------------------------------------------------------
    // Form the etag using inode number, size and modified time.
    // Note that stringify() results in a string with quotes.
    // -----------------------------------------------------------------------------------------------------------
    var mtime = Date.parse(stat.mtime);
    var etag  = JSON.stringify([stat.ino, stat.size, mtime].join('-'));

    // -----------------------------------------------------------------------------------------------------------
    // If conditional GET headers (If-Match and If-Modified-Since) fail, respond with an error
    // -----------------------------------------------------------------------------------------------------------
    if(!isPreconditionValid(mtime, etag, req.headers))
    {
        onError(412, headers, res, emitter);
        return;
    }

    // -----------------------------------------------------------------------------------------------------------
    // If resource has been modified after the previous GET request, respond with an error
    // -----------------------------------------------------------------------------------------------------------
    if(isModified(mtime, etag, req.headers))
    {
        onError(304, headers, res, emitter);
        return;
    }

    var range = {
        valid: false,
        start: 0,
        end: 0
    };

    // -----------------------------------------------------------------------------------------------------------
    // Check if range is enabled in optios, is specified by user agent and is valid
    // -----------------------------------------------------------------------------------------------------------
    if(options.acceptRanges && !isRangeSatisfiable(req.headers, mtime, etag, stat.size, range))
    {
        onError(416, headers, res, emitter);
        return;
    }
    else if (range.valid)
    {
        headers['Content-Range'] = 'bytes ' + range.start + '-' + range.end + '/' + stat.size;
    }

    headers['Last-Modified'] = new Date((stat.mtime).toUTCString());
    headers['Etag']          = etag;

    // -----------------------------------------------------------------------------------------------------------
    // I have specified only the filename. Let browser decide if it can show it inline or not.
    // The standard does not really say that specifying 'attachment/inline' is optional but it seems to work
    // -----------------------------------------------------------------------------------------------------------
    headers['Content-Disposition'] = 'filename=' + path.basename(fullPath);

    serveFileEx(fullPath, stat.size, range, status, headers, res, emitter);
}


/**
 * Utility function to serve a folder
 * @access package
 * @param {string} servePath - Absolute path of the folder that needs to be served
 * @param {integer} status - Default HTTP status code specified by the client that should be sent in the HTTP response
 * @param {object} headers - HTTP headers that should be sent along with the HTTP response
 * @param {object} req - The HTTP request object
 * @param {object} res - The HTTP response object
 * @param {object} options - The option object sent by the client during initialization of the server
 * @param {string} zipFileName - The name to be used for the archive file that is served to the user agent which has
 * the contents of the folder being served
 * @param {object} emitter - An EventEmitter object
 */
function serveFolder(servePath, status, headers, req, res, options, zipFileName, emitter)
{
    // -----------------------------------------------------------------------------------------------------------
    // First try to serve index file if it is present
    // -----------------------------------------------------------------------------------------------------------
    if(serveIndexFile(servePath, options.indexFiles, status, headers, res, emitter))
    {
        return;
    }

    // -----------------------------------------------------------------------------------------------------------
    // No index file was found that could be served. This means that the user agent wants to retrieve
    // folder contents.
    // First confirm that the user agent is capable of accepting zip files. If it doesn't, return an error.
    // -----------------------------------------------------------------------------------------------------------
    if(!userAgentSupportsEncoding(req.headers, 'deflate'))
    {
        console.error('User agent does not support deflate');
        onError(406, headers, res, emitter);
        return;
    }

    serveFolderFromJson(servePath, zipFileName, headers, status, res, emitter);
}


/**
 * Utility function to serve index file in a folder
 * @access package
 * @param {string} parentFolder - Absolute path of the folder that needs to be served
 * @param {array} index - The list of index files that can be served, as specifed by the client
 * @param {integer} status - Default HTTP status code specified by the client that should be sent in the HTTP response
 * @param {object} headers - HTTP headers that should be sent along with the HTTP response
 * @param {object} res - The HTTP response object
 * @param {object} emitter - An EventEmitter object
 * @returns {bool} true if serving of index file was completed (success or failure). false if no index file was
 * found for serving
 */
function serveIndexFile(parentFolder, index, status, headers, res, emitter)
{
    var ret  = false;
    var stat = null;

    // -----------------------------------------------------------------------------------------------------------
    // Iterate over the list of index files specified by client and check if any of them can be served.
    // -----------------------------------------------------------------------------------------------------------
    for(var f = 0; f < index.length; ++f)
    {
        var indexPath = path.join(parentFolder, index[f]);

        // -------------------------------------------------------------------------------------------------------
        // Index file names can contain '..' to create malicious paths that are outside the root folder.
        // -------------------------------------------------------------------------------------------------------
        if(isMaliciousPath(indexPath, parentFolder))
        {
            console.error('Cannot serve index file from outside the root');
            onError(403, headers, res, emitter);
            return true;
        }

        // -------------------------------------------------------------------------------------------------------
        // TODO: we are using synchronous stat here since we are running a loop.
        // Change this to async stat.
        // -------------------------------------------------------------------------------------------------------
        try
        {
            stat = fs.statSync(indexPath);
        }
        catch(e)
        {
            // ---------------------------------------------------------------------------------------------------
            // An error occured during stat for an index file.
            // Continue to check other index files.
            // ---------------------------------------------------------------------------------------------------
            continue;
        }
        if(stat)
        {
            // ---------------------------------------------------------------------------------------------------
            // An index file was found. Serve it to the user agent.
            // ---------------------------------------------------------------------------------------------------
            serveFileEx(indexPath, stat.size, {valid: false}, status, headers, res, emitter);
            ret = true;
            break;
        }
    }

    return ret;
}


/**
 * Utility function to serve files specified in a JSON file
 * @access package
 * @param {string} servePath - Absolute path of the folder that needs to be served
 * @param {string} zipFileName - The name to be used for the archive file that is served to the user agent which has
 * the contents of the folder being served
 * @param {object} headers - HTTP headers that should be sent along with the HTTP response
 * @param {integer} status - Default HTTP status code specified by the client that should be sent in the HTTP response
 * @param {object} res - The HTTP response object
 * @param {object} emitter - An EventEmitter object
 */
function serveFolderFromJson(servePath, zipFileName, headers, status, res, emitter)
{
    var jsonPath = path.join(servePath, 'index.json');

    // -----------------------------------------------------------------------------------------------------------
    // The JSON file contains a list of files under the current directory that can be served.
    // -----------------------------------------------------------------------------------------------------------
    fs.readFile(jsonPath, (e, contents) => {
        if(!e)
        {
            if(zipFileName)
            {
                headers['Content-Disposition'] = 'attachment; filename=' + zipFileName;
            }

            // ---------------------------------------------------------------------------------------------------
            // TODO: Firefox leads to error (NS_ERROR_INVALID_CONTENT_ENCODING) if I set this to deflate or gzip. 
            // headers['content-encoding'] = 'deflate';
            // ---------------------------------------------------------------------------------------------------

            var vary        = getHeaderValue(headers, 'Vary');
            headers['Vary'] = ((vary && (vary.indexOf('Accept-Encoding') == -1))? vary + ', ' : '') + 'Accept-Encoding';

            var list        = {};
            try
            {
                list = JSON.parse(contents);

                // -----------------------------------------------------------------------------------------------
                // JSON is not malformed but its contents are not in expected format
                // -----------------------------------------------------------------------------------------------
                if(undefined === list.files)
                {
                    throw new Error('JSON contents are not in expected format');
                }
            }
            catch(eJSON)
            {
                // -----------------------------------------------------------------------------------------------
                // If JSON is malformed, parsing causes an exception to be thrown
                // -----------------------------------------------------------------------------------------------
                console.error(eJSON.message);
                onError(500, headers, res, emitter);
                return;
            }

            serveFilesZip(servePath, list.files, status, headers, res, emitter);
        }
        else
        {
            // ---------------------------------------------------------------------------------------------------
            // JSON file could not be read successfully. Return error to the user agent.
            // ---------------------------------------------------------------------------------------------------
            console.error(e.message);
            onError(404, headers, res, emitter);
        }
    });
}


/**
 * Utility function to archive and serve a list of files as a zip file
 * @access package
 * @param {string} servePath - Absolute path of the folder that needs to be served
 * @param {array} filelist - List of files that need to be served
 * @param {integer} status - Default HTTP status code specified by the client that should be sent in the HTTP response
 * @param {object} headers - HTTP headers that should be sent along with the HTTP response
 * @param {object} res - The HTTP response object
 * @param {object} emitter - An EventEmitter object
 */
function serveFilesZip(servePath, filelist, status, headers, res, emitter)
{
    var tempZipPath = getTempZipPath();
    var stat        = null;

    // -----------------------------------------------------------------------------------------------------------
    // Intialize the archiver module for zipping the files and create an output stream.
    // -----------------------------------------------------------------------------------------------------------
    var archive = archiver('zip', { zlib: { level: 9 } });
    var output  = fs.createWriteStream(tempZipPath);
    archive.pipe(output);

    output.on('close', () => {
        // -------------------------------------------------------------------------------------------------------
        // Close can be called when archive::abort() is called.
        // We use size as a way to detect failure vs success
        // -------------------------------------------------------------------------------------------------------
        var size = archive.pointer();
        if (size > 0)
        {
            // ---------------------------------------------------------------------------------------------------
            // Archive is valid since it has non-zero size. Serve the zip file to user agent.
            // ---------------------------------------------------------------------------------------------------
            serveFileEx(tempZipPath, size, { valid: false }, status, headers, res, emitter);
        }
    });

    // -----------------------------------------------------------------------------------------------------------
    // Iterate over the list of files to serve and add them to the archive file
    // -----------------------------------------------------------------------------------------------------------
    var file = filelist.shift();
    while(file)
    {
        var filepath = path.join(servePath, file);

        // -------------------------------------------------------------------------------------------------------
        // File names in JSON can contain '..' to create malicious paths that are outside the root folder.
        // -------------------------------------------------------------------------------------------------------
        if(isMaliciousPath(filepath, servePath))
        {
            console.error('Cannot serve a file in json from outside of parent folder');
            archive.abort();
            deleteTempZipFile(tempZipPath);
            onError(403, headers, res, emitter);
            return;
        }

        // -------------------------------------------------------------------------------------------------------
        // TODO: we are using synchronous stat here since we are running a loop.
        // Change this to async stat.
        // -------------------------------------------------------------------------------------------------------
        try
        {
            stat = fs.statSync(filepath);
        }
        catch(eStat)
        {
            console.error(eStat.message);
            archive.abort();
            deleteTempZipFile(tempZipPath);
            onError(404, headers, res, emitter);
            return;
        }

        // -------------------------------------------------------------------------------------------------------
        // Path of the file is valid and non-malicious. Read its contents and append them to the archive file.
        // -------------------------------------------------------------------------------------------------------
        var readStr = fs.createReadStream(filepath);
        archive.append(readStr, {name: file});

        file = filelist.shift();
    }

    // -----------------------------------------------------------------------------------------------------------
    // Notify archive module that no more files have to be zipped.
    // -----------------------------------------------------------------------------------------------------------
    archive.finalize();
}


/**
 * Utility function to handle serving of full or partial files
 * @access package
 * @param {string} fullPath - Absolute path of the file that needs to be served
 * @param {integer} size - Size in bytes of the resource requested by the user agent
 * @param {object} range - An object that contains range values and indication if range is valid or not
 * @param {integer} status - Default HTTP status code specified by the client that should be sent in the HTTP response
 * @param {object} headers - HTTP headers that should be sent along with the HTTP response
 * @param {object} res - The HTTP response object
 * @param {object} emitter - An EventEmitter object
 */
function serveFileEx(fullpath, size, range, status, headers, res, emitter)
{
    var start = 0;
    var end   = 0;

    // -----------------------------------------------------------------------------------------------------------
    // If we are serving a sub-range of the resource, status code should be 206 and not 200
    // -----------------------------------------------------------------------------------------------------------
    if(range && range.valid)
    {
        start  = range.start;
        end    = range.end;
        status = 206;
    }
    else
    {
        start = 0;
        end   = size - 1;
    }

    // -----------------------------------------------------------------------------------------------------------
    // Use mime package to determine content-type and charset from the file contents.
    // -----------------------------------------------------------------------------------------------------------
    var contentType = headers['Content-Type'] || mime.lookup(fullpath) || 'application/octet-stream';
    var charset     = mime.charsets.lookup(contentType);

    headers['Content-Type']   = contentType + (charset ? '; charset=' + charset : '');
    headers['Content-Length'] = end - start + 1;

    res.writeHead(status, headers);

    streamFile(fullpath, start, end, res, (e) => {
        if(!e)
        {
            // ---------------------------------------------------------------------------------------------------
            // Once the resource has been served successfully, delete the temp zip file.
            // This will be a no-op when a file is being served.
            // ---------------------------------------------------------------------------------------------------
            deleteTempZipFile(fullpath);
            onSuccess(status, headers, res, emitter);
        }
        else
        {
            console.error(e.message);
            onError(500, headers, res, emitter);
        }
    });
}


/**
 * Utility function to read a file path and stream its data to a write stream
 * @access package
 * @param {string} path - Path should be fully qualified, normalized, resolved and valid path
 * @param {integer} start - Starting byte offset in the file contents from where streaming should start
 * @param {integer} end - Ending byte offset in the file contents
 * @param {stream} outStream - Writable stream to which file contents should be sent
 * @param {function} callback - A callback function which is invoked on success or failure
 */
function streamFile(path, start, end, outStream, callback)
{
    var readStream = fs.createReadStream(path, {
        flags: 'r',
        mode: 0o666,
        start: start,
        end: end
    });

    readStream.pipe(outStream, { end: false });

    readStream.on('close', () => {
        // -------------------------------------------------------------------------------------------------------
        // Do not call stream::end here because there might be more data to be sent.
        // Let the caller decide.
        // -------------------------------------------------------------------------------------------------------
        callback(null);
    });

    readStream.on('error', callback);
}


/**
 * Utility function to ensure that the path to a resource sent by the client is under the root folder
 * @access package
 * @param {string} fullpath - Full, absolute path to the resource
 * @param {string} root - Root path from where resources can be served
 * @returns {bool} true if the path lies outside of the root path. Else false is returned
 */
function isMaliciousPath(fullpath, root)
{
    return (fullpath.indexOf(root) !== 0);
}


/**
 * Utility function to check that names of index files provided by client in indexFiles option are of valid
 * data type
 * @access package
 * @param {object} options - The option object sent by the client during initialization of the server
 * @returns {bool} true if the index file names are of valid data type. Else, false is returned.
 */
function validateIndexFilesList(options)
{
    // -----------------------------------------------------------------------------------------------------------
    // If indexFiles is not specified in options, validation succeeds.
    // If indexxFiles option is undefined/null etc, validation fails.
    // If any value in indexFiles array is not a string, validation fails.
    // -----------------------------------------------------------------------------------------------------------
    return !('indexFiles' in options) ? true : Boolean(options.indexFiles) && options.indexFiles.every((item) => {
        return (typeof item == 'string');
    });
}


/**
 * Utility function to extract the value of a specified header from the HTTP headers sent by user agent
 * @access package
 * @param {object} headers - HTTP request headers sent by the user agent
 * @param {string} name - Name of the HTTP header whose value needs to be retrieved
 * @returns {string} Value of the specified HTTP header or null if the value was not found
 */
function getHeaderValue(headers, name)
{
    // -----------------------------------------------------------------------------------------------------------
    // Javascript property names are case-sensitive. HTTP header names are case-insensitive.
    // So, we need to search for header names case-insensitively.
    // -----------------------------------------------------------------------------------------------------------

    var headerVal = null;
    name = name.toLowerCase();

    for (var h in headers)
    {
        if(h.toLowerCase() === name)
        {
            // ---------------------------------------------------------------------------------------------------
            // Stringify the value to take care of spurious requests
            // ---------------------------------------------------------------------------------------------------
            headerVal = (headers[h] + '').toLowerCase();
            break;
        }
    }

    return headerVal;
}


/**
 * Utility function that splits header values into a list of items using the specified separator token
 * @access package
 * @param {string} headerVal - The value of an HTTP header sent by the user agent
 * @param {string} [sep=,] - The separator to be used as a delimiter for the list of values
 * @returns {array} A list of values extracted from the header. All spaces in the header value are removed
 */
function listifyHeaderValues(headerVal, sep = ',')
{
    var list     = [];
    var listTemp = headerVal.split(sep);

    for (var i = 0; i < listTemp.length; ++i)
    {
        // Remove all spaces
        var valSquished = listTemp[i].replace(/ /g, '');

        // -------------------------------------------------------------------------------------------------------
        // If header value is empty string, calling split() on it will return
        // a list with one item which is an empty string. We should ignore it.
        // -------------------------------------------------------------------------------------------------------
        if((1 === listTemp.length) && (0 === valSquished.length))
        {
            continue;
        }

        list.push(valSquished);
    }

    return list;
}


/**
 * Utility function to parse HTTP date sent by the user agent
 * @access package
 * @param {string} date - HTTP date sent by the user agent
 * @returns {integer} A number representation of the date as the number of milliseconds since January 1, 1970.
 * If the date is not valid, NaN is returned.
 */
function parseHttpDate(date)
{
    // -----------------------------------------------------------------------------------------------------------
    // Old style HTTP date contains '-' that cannot be parsed correctly.
    // Convert old style to new style before parsing.
    // -----------------------------------------------------------------------------------------------------------
    var dateNormalized = date.replace(/-/g, ' ');
    var dateMilli      = Date.parse(dateNormalized);

    return (typeof dateMilli === 'number') ? dateMilli : NaN;
}


/**
 * Utility function to parse the 'Range' header sent by user agent
 * @access package
 * @param {string} rangeHeader - Value of the range header sent by user agent
 * @param {integer} size - Size in bytes of the resource requested by the user agent
 * @returns {object} A range object which contains start and end byte offsets and indication if range is valid or not
 */
function parseRange(rangeHeader, size)
{
    var range = {
        valid: false,
        start: 0,
        end: 0
    };

    var unit = 'bytes=';

    // -----------------------------------------------------------------------------------------------------------
    // Support only 'bytes' as the unit. Multiple ranges (separated by comma) are not supported.
    // -----------------------------------------------------------------------------------------------------------
    if((rangeHeader.indexOf(unit) === 0) && (rangeHeader.indexOf(',') === -1))
    {
        var rangeVal = rangeHeader.substr(unit.length).split('-');
        range.start  = parseInt(rangeVal[0]);
        range.end    = parseInt(rangeVal[1]);

        if(isNaN(range.start) && !isNaN(range.end))
        {
            // ---------------------------------------------------------------------------------------------------
            // Here, 'bytes=a-8' is treated same as 'bytes=-8'
            // In both cases, we return the last 8 bytes of the resource.
            // ---------------------------------------------------------------------------------------------------
            range.start = size - range.end;
            range.end   = size - 1;
        }
        else if(!isNaN(range.start) && isNaN(range.end))
        {
            range.end = size - 1;
        }

        // -------------------------------------------------------------------------------------------------------
        // Validate start and end for sane values.
        // -------------------------------------------------------------------------------------------------------
        if(!isNaN(range.start) && !isNaN(range.end) && (range.start >= 0) && (range.end < size) && (range.start <= range.end))
        {
            range.valid = true;
        }

    }

    return range;
}


/**
 * Utility function to verify if the 'If-Match' HTTP header matches with resource etag
 * @access package
 * @param {string} etag - Etag value of the resource
 * @param {string} ifMatchHeader - Value of the 'If-Match' header sent by user agent
 * @returns {bool} true if a match is found, else false
 */
function checkIfMatch(etag, ifMatchHeader)
{
    var list = listifyHeaderValues(ifMatchHeader);

    // -----------------------------------------------------------------------------------------------------------
    // RFC7232: Condition is false if header value is * and server has no current 
    // representation of resource.
    //
    // RFC7232: Only strong comparison should be used.
    // -----------------------------------------------------------------------------------------------------------

    return (((ifMatchHeader == '\"*\"') && Boolean(etag)) || !(list.every((item) => {
        return (item != etag);
    })));
}


/**
 * Utiity function to verify that the 'If-None-Match' HTTP header value does not match with resource etag
 * @access package
 * @param {string} etag - Etag value of the resource
 * @param {string} ifNoneMatchHeader - Value of the 'If-None-Match' header sent by user agent
 * @returns {bool} true if no match was found, else false
 */
function checkIfNoneMatch(etag, ifNoneMatchHeader)
{
    var etagWeak = 'w/' + etag;
    var list     = listifyHeaderValues(ifNoneMatchHeader);

    return list.every((item) => {
        return ((item !== etag) && (item != etagWeak));
    });
}


/**
 * Utility function to verify if the resource was modified after the date specified in 'If-Modified-Since' HTTP header
 * @access package
 * @param {integer} mtime - Modification timestamp of the resource represented by the number of milliseconds since January 1, 1970
 * @param {string} ifModifiedSinceHeader - Value of the 'If-Modified-Since' header sent by user agent
 * @returns {bool} true if the condition check passed or date sent by user agent is invalid. The requested resource can be served. Else, false is returned. The requested resource should not be served.
 */
function checkIfModifiedSince(mtime, ifModifiedSinceHeader)
{
    var currentMill = Date.now();
    var dateMill    = parseHttpDate(ifModifiedSinceHeader);

    return (!dateMill || ((dateMill <= currentMill) && (dateMill < mtime)));
}


/**
 * Utility function to verify if the resource was not modified after the date specified in 'If-Unmodified-Since' HTTP header
 * @access package
 * @param {integer} mtime - Modification timestamp of the resource represented by the number of milliseconds since January 1, 1970
 * @param {string} ifUnmodifiedSinceHeader - Value of the 'If-Unmodified-Since' header sent by user agent
 * @returns {bool} true if the condition check passed or date sent by user agent is invalid. The requested resource can be served. Else, false is returned. The requested resource should not be served.
 */
function checkIfUnmodifiedSince(mtime, ifUnmodifiedSinceHeader)
{
    var currentMill = Date.now();
    var dateMill    = parseHttpDate(ifUnmodifiedSinceHeader);

    return (!dateMill || (dateMill <= currentMill) && (dateMill > mtime));
}


/**
 * Utility function to verify if the requested resource was not modified after the date specified in the 'If-Range' HTTP header or if the resource etag matches with the header value.
 * @access package
 * @param {integer} mtime - Modification timestamp of the resource represented by the number of milliseconds since January 1, 1970
 * @param {string} etag - Etag value of the resource
 * @param {string} ifRangeHeader - Value of the 'If-Range' header sent by the user agent
 * @returns {bool} true if validation is successful. The requested resource can be served as per the 'Range' header. Else, false is returned. Entire resource should be served.
 */
function checkIfRange(mtime, etag, ifRangeHeader)
{
    // -----------------------------------------------------------------------------------------------------------
    // RFC7233: An etag value has a DQUOTE at the beginning. A Date value does not.
    // This should be used to differentiate between the two.
    // This is implicitly implemented because date conversion will fail if header has an etag value.

    // RFC7233: if Date is weak validator, the match should fail.
    // This is implicitly implemented because we are blindly trying to convert header value to Date.
    // Date conversion fails if validator is prefixed with w/

    // We cannot blindly use checkIfUnmodifiedSince() here.
    // This is because if date is invalid, checkIfUnmodifiedSince() treats the condition check to have passed.
    // So, if user agent sends etag value, checkIfUnmodifiedSince() will always return true.
    // We must call checkIfUnmodifiedSince() only if date is valid.
    // -----------------------------------------------------------------------------------------------------------

    var dateMill = parseHttpDate(ifRangeHeader);
    return (dateMill ? checkIfUnmodifiedSince(mtime, ifRangeHeader) : checkIfMatch(etag, ifRangeHeader));
}


/**
 * Utility function that checks 'Accept-Encoding' rqeuest header value to verify if user agent allows required
 * encoding values
 * @access package
 * @param {object} headers - HTTP request headers sent by the user agent
 * @param {string} encodingType - The name of encoding that the user agent should support
 * @returns {bool} true if user agent supports encodingType. Else, false is returned
 */
function userAgentSupportsEncoding(headers, encodingType)
{
    // -----------------------------------------------------------------------------------------------------------
    // Unless user agent specifically disallows encoding, we assume that it is supported.
    // -----------------------------------------------------------------------------------------------------------
    var supported = true;

    var acceptEncodingHeaderVal = getHeaderValue(headers, 'Accept-Encoding');

    // -----------------------------------------------------------------------------------------------------------
    // If user agent does not specify any Accept-Encoding header, it means that it has no preferences
    // regarding encodings.
    // -----------------------------------------------------------------------------------------------------------
    if(acceptEncodingHeaderVal === null)
    {
        supported = true;
    }
    else if(acceptEncodingHeaderVal === '')
    {
        supported = false;
    }
    else
    {
        var encodingList = listifyHeaderValues(acceptEncodingHeaderVal);

        for(var i = 0; i < encodingList.length; ++i)
        {
            // ---------------------------------------------------------------------------------------------------
            // User agent can disallow all encodings in general (identity or *) or a specific encoding by
            // setting its weight to 0
            // ---------------------------------------------------------------------------------------------------
            if((encodingList[i] === 'identity;q=0') ||
                (encodingList[i] === '*;q=0') ||
                (encodingList[i] === encodingType + ';q=0'))
            {
                supported = false;
                break;
            }
        }
    }

    return supported;
}


/**
 * Utility function to evaluate conditional GET headers 'If-Match' and 'If-Unmodified-Since'
 * @access package
 * @param {integer} mtime - Modification timestamp of the resource represented by the number of milliseconds since January 1, 1970
 * @param {string} etag - Etag value of the resource
 * @param {object} headers - HTTP request headers sent by the user agent
 * @returns {bool} true if the pre-condition is valid and requested resource can be served. Else, false is returned.
 */
function isPreconditionValid(mtime, etag, headers)
{
    var ifMatchHeader = getHeaderValue(headers, 'If-Match');
    if(ifMatchHeader && (!checkIfMatch(etag, ifMatchHeader)))
    {
        // -------------------------------------------------------------------------------------------------------
        // User agent requested If-Match but there was no match
        // -------------------------------------------------------------------------------------------------------
        return false;
    }

    // -----------------------------------------------------------------------------------------------------------
    // Ignore If-Unmodified-Since if user agent has specified If-Match also
    // -----------------------------------------------------------------------------------------------------------
    var ifUnmodifiedSinceHeader = getHeaderValue(headers, 'If-Unmodified-Since');
    if(!ifMatchHeader && ifUnmodifiedSinceHeader && (!checkIfUnmodifiedSince(mtime, ifUnmodifiedSinceHeader)))
    {
        // -------------------------------------------------------------------------------------------------------
        // User agent sent If-Unmodified-Since but resource is modified
        // -------------------------------------------------------------------------------------------------------
        return false;
    }

    return true;
}


/**
 * Utility function to evaluate conditional GET headers 'If-None-Match' and 'If-Modified-Since'
 * @access package
 * @param {integer} mtime - Modification timestamp of the resource represented by the number of milliseconds since January 1, 1970
 * @param {string} etag - Etag value of the resource
 * @param {object} headers - HTTP request headers sent by the user agent
 * @returns {bool} true if the resource is stale and the user agent already has the requested resource. The resource should not be served again. Else, false is returned. The requested resource can be served to the user agent.
 */
function isModified(mtime, etag, headers)
{
    var ifNoneMatchHeader = getHeaderValue(headers, 'If-None-Match');
    if(ifNoneMatchHeader && (!checkIfNoneMatch(etag, ifNoneMatchHeader)))
    {
        // -------------------------------------------------------------------------------------------------------
        // User agent requested If-None-Match but there was a match
        // -------------------------------------------------------------------------------------------------------
        return true;
    }

    // -----------------------------------------------------------------------------------------------------------
    // Ignore If-Modified-Since if user agent has specified if-None-Match also
    // -----------------------------------------------------------------------------------------------------------
    var ifModifiedSinceHeader = getHeaderValue(headers, 'If-Modified-Since');
    if(!ifNoneMatchHeader && ifModifiedSinceHeader && (!checkIfModifiedSince(mtime, ifModifiedSinceHeader)))
    {
        // -------------------------------------------------------------------------------------------------------
        // User agent requested If-Modified-Since but resource is not modified
        // -------------------------------------------------------------------------------------------------------
        return true;
    }

    return false;
}


/**
 * Utility function to evaluate conditional GET header 'If-Range' and the 'Range' header
 * @access package
 * @param {object} headers - HTTP request headers sent by the user agent
 * @param {integer} mtime - Modification timestamp of the resource represented by the number of milliseconds since January 1, 1970
 * @param {string} etag - Etag value of the resource
 * @param {integer} size - Size in bytes of the resource requested by the user agent
 * @param {object} range - An out parameter which will contain parsed range values and indication if range is valid or not
 * @param {bool} range.valid - Set to true if range requset sent by user agent is valid
 * @param {integer} range.start - Start byte offset of the resource that should be served.
 * @param {integer} range.end - End byte offset of the resource that should be served.
 */
function isRangeSatisfiable(headers, mtime, etag, size, range)
{
    var ret          = true;
    var ifRangeValid = false;

    // -----------------------------------------------------------------------------------------------------------
    // Check if 'If-Range' header has been specified and if the condition is valid
    // -----------------------------------------------------------------------------------------------------------
    var ifRangeHeader = getHeaderValue(headers, 'If-Range');
    ifRangeValid      = (ifRangeHeader && (checkIfRange(mtime, etag, ifRangeHeader)));

    // -----------------------------------------------------------------------------------------------------------
    // Check if the 'Range' header is valid
    // -----------------------------------------------------------------------------------------------------------
    var rangeHeader = getHeaderValue(headers, 'Range');
    if(rangeHeader)
    {
        var parsedRange = parseRange(rangeHeader, size);
        if(!parsedRange.valid)
        {
            // ---------------------------------------------------------------------------------------------------
            // Parsing range header failed. Range is not satisfiable.
            // ---------------------------------------------------------------------------------------------------
            ret = false;
        }
        else
        {
            if(ifRangeHeader && !ifRangeValid)
            {
                // -----------------------------------------------------------------------------------------------
                // User agent specified the 'If-Range' header but it is not valid.
                // Ignore any range headers and send the entire resource.
                // -----------------------------------------------------------------------------------------------
            }
            else
            {
                // -----------------------------------------------------------------------------------------------
                // Range is valid and parsable. If-Range was either not specified or is valid
                // -----------------------------------------------------------------------------------------------
                range.valid = parsedRange.valid;
                range.start = parsedRange.start;
                range.end   = parsedRange.end;
            }
        }
    }

    return ret;
}


/**
 * Utility function that handles errors while serving a resource
 * @access package
 * @param {integer} errCode - The HTTP status code that should be sent to the user agent
 * @param {object} headers - HTTP headers that should be sent along with the HTTP response
 * @param {object} res - The HTTP response object
 * @param {object} emitter - An EventEmitter object
 * @returns {object} An object that contains information about the error and can be sent to the client
 * for informational purpose
 */
function onError(errCode, headers, res, emitter)
{
    var result = {
        code: errCode,
        headers: headers,
        msg: http.STATUS_CODES[errCode]
    };

    // -----------------------------------------------------------------------------------------------------------
    // If client has attached error listeners, then raise an event and let client decide what to do next.
    // Else, send headers and send the response.
    // -----------------------------------------------------------------------------------------------------------
    if(hasListeners(emitter, 'error'))
    {
        emitter.emit('error', result);
    }
    else
    {
        res.writeHead(errCode, headers);
        res.end();
    }

    return result;
}


/**
 * Utility function that is called when serving a resource is successful
 * @access package
 * @param {integer} status - The HTTP status code that was sent to the user agent
 * @param {object} headers - HTTP headers that were sent along with the HTTP response
 * @param {object} res - The HTTP response object
 * @param {object} emitter - An EventEmitter object
 * @returns {object} An object that contains information about the request and can be sent to the client
 * for informational purpose
 */
function onSuccess(status, headers, res, emitter)
{
    var result = {
        code: status,
        headers: headers,
        msg: http.STATUS_CODES[status]
    };

    // -----------------------------------------------------------------------------------------------------------
    // Do not send headers for success. We would have already sent it before streaming
    // -----------------------------------------------------------------------------------------------------------

    if(hasListeners(emitter, 'success'))
    {
        emitter.emit('success', result);
    }

    // -----------------------------------------------------------------------------------------------------------
    // Headers and data has already been sent. Client cannot send anything else.
    // End the response here itself.
    // -----------------------------------------------------------------------------------------------------------
    res.end();
}


/**
 * Utility function to check if an event object has listeners attached to it of the specified type.
 * @access package
 * @param {object} emitter - An EventEmitter object
 * @param {string} type - Name of the event to look for (for example, 'error' or 'close')
 * @returns {bool} true if there is at least one listener for the specified event. Else, false is returned.
 */
function hasListeners(emitter, type)
{
    var count = (typeof emitter.listenerCount !== 'function') ? emitter.listeners(type).length
        : emitter.listenerCount(type);

    return count > 0;
}


/**
 * Utility function to generate path for archive file used to temporarily hold contents of a folder being served
 * @access package
 * @returns {string} Absolute path of an archive file under the 'temp' path of the OS
 */
function getTempZipPath()
{
    return os.tmpdir() + '/' + TEMP_ARCHIVE_NAME + Math.random();
}


/**
 * Utility function to delete temporary archive file after it has been served or if an error occurs
 * @access package
 * @param {string} fullpath - Absolute path of the archive file
 */
function deleteTempZipFile(fullpath)
{
    var filename = path.basename(fullpath);

    // -----------------------------------------------------------------------------------------------------------
    // Delete only if filename conforms to temp zip filename pattern
    // -----------------------------------------------------------------------------------------------------------
    if(TEMP_ARCHIVE_REGEXP.test(filename))
    {
        fs.unlink(fullpath);
    }
}


// ---------------------------------------------------------------------------------------------------------------
// Interfaces to this package
// ---------------------------------------------------------------------------------------------------------------
exports.Server  = Server;
exports.version = version;
exports.mime    = mime;


// ---------------------------------------------------------------------------------------------------------------
// The following methods need to be exported for unit testing. That is why they are exported only when Node
// environment is set to 'development'.
// ---------------------------------------------------------------------------------------------------------------
if('development' === process.env.NODE_ENV)
{
    exports.parseHttpDate               = parseHttpDate;
    exports.userAgentSupportsEncoding   = userAgentSupportsEncoding;
    exports.listifyHeaderValues         = listifyHeaderValues;
    exports.getHeaderValue              = getHeaderValue;
    exports.checkIfMatch                = checkIfMatch;
    exports.checkIfNoneMatch            = checkIfNoneMatch;
    exports.checkIfModifiedSince        = checkIfModifiedSince;
    exports.checkIfUnmodifiedSince      = checkIfUnmodifiedSince;
    exports.isModified                  = isModified;
    exports.isPreconditionValid         = isPreconditionValid;
    exports.checkIfRange                = checkIfRange;
    exports.parseRange                  = parseRange;
    exports.isRangeSatisfiable          = isRangeSatisfiable;
    exports.hasListeners                = hasListeners;
    exports.validateIndexFilesList      = validateIndexFilesList;
    exports.isMaliciousPath             = isMaliciousPath;
}

