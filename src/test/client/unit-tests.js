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
 * @file Mocha-style unit tests for static file server. This file uses direct function calls to perform unit testing.
 * @copyright Copyright (C) 2018 Namit Bhalla (oyenamit@gmail.com)
 * @license GPL-3.0-or-later
 * @see test-client-http-req-resp.js
 */


var constants = require('../common/inc.js');
var assert = require('assert');
var fileServer = {};


describe('Unit Test Header Parsing', function() {

    // Called only once
    before(function() {
        // Set environment to Development so that server exports methods, extra logging etc.
        process.env.NODE_ENV = 'development';
        fileServer = require('../../');
    });

    describe('HTTP Date Parsing', function() {

        it('Parsing a valid date', function() {
            var parsedDate = fileServer.parseHttpDate(constants.HTTP_DATE_VALID);
            assert.deepStrictEqual((typeof parsedDate), 'number');

        }); // end it

        it('Parsing an invalid date', function() {
            var parsedDate = fileServer.parseHttpDate(constants.HTTP_DATE_INVALID);
            assert(Number.isNaN(parsedDate));

        }); // end it

        it('Parsing old format date', function() {
            var parsedDate = fileServer.parseHttpDate(constants.HTTP_DATE_OLD_FORMAT);
            assert.deepStrictEqual((typeof parsedDate), 'number');

        }); // end it

    }); // end describe


    describe('Client Encoding Support Check', function() {

        it('No encoding specified', function() {
            var supported = fileServer.userAgentSupportsEncoding(constants.EMPTY_OBJECT, constants.HTTP_ENCODING_TYPE_VALID);
            assert.deepStrictEqual(supported, true);

            supported = fileServer.userAgentSupportsEncoding(constants.NULL_OBJECT, constants.HTTP_ENCODING_TYPE_VALID);
            assert.deepStrictEqual(supported, true);

            supported = fileServer.userAgentSupportsEncoding(constants.HTTP_ACCEPT_ENCODING_HEADER_EMPTY, constants.HTTP_ENCODING_TYPE_VALID);
            assert.deepStrictEqual(supported, false);

        }); // end it
        
        it('Encoding weight set to 0', function() {
            var supported = fileServer.userAgentSupportsEncoding(constants.HTTP_ACCEPT_ENCODING_WEIGHT_0_A, constants.HTTP_ENCODING_TYPE_VALID);
            assert.deepStrictEqual(supported, false);

            supported = fileServer.userAgentSupportsEncoding(constants.HTTP_ACCEPT_ENCODING_WEIGHT_0_B, constants.HTTP_ENCODING_TYPE_VALID);
            assert.deepStrictEqual(supported, false);

            supported = fileServer.userAgentSupportsEncoding(constants.HTTP_ACCEPT_ENCODING_WEIGHT_0_C, constants.HTTP_ENCODING_TYPE_VALID);
            assert.deepStrictEqual(supported, false);

        }); // end it

        it('Encoding explicitly supported', function() {
            var supported = fileServer.userAgentSupportsEncoding(constants.HTTP_ACCEPT_ENCODING_SUPPORTED, constants.HTTP_ENCODING_TYPE_VALID);
            assert.deepStrictEqual(supported, true);

        }); // end it

    }); // end describe


    describe('Header Value parse to list', function() {

        it('Header value is invalid', function() {
            var list = fileServer.listifyHeaderValues(constants.EMPTY_STR);
            assert.deepStrictEqual(list, constants.EMPTY_LIST);
        });

        it('Header value is valid', function() {
            var list = fileServer.listifyHeaderValues(constants.HTTP_HEADER_VAL_STR);
            assert.deepStrictEqual(list, constants.HTTP_HEADER_VAL_LIST);

            list = fileServer.listifyHeaderValues(constants.HTTP_HEADER_VAL_STR, constants.STR_SEMI_COLON);
            assert.deepStrictEqual(list, constants.HTTP_HEADER_VAL_LIST_2);
            
            list = fileServer.listifyHeaderValues(constants.HTTP_HEADER_VAL_STR_1ITEM, constants.STR_COMMA);
            assert.deepStrictEqual(list, constants.HTTP_HEADER_VAL_LIST_1ITEM);
        });
    });


    describe('Extract a specified header value', function() {

        it('Header is invalid', function() {
            var headerVal = fileServer.getHeaderValue(constants.NULL_OBJECT, constants.HTTP_ACCEPT_ENCODING_HEADER_STR);
            assert.deepStrictEqual(headerVal, constants.NULL_OBJECT);

            headerVal = fileServer.getHeaderValue(constants.EMPTY_OBJECT, constants.HTTP_ACCEPT_ENCODING_HEADER_STR);
            assert.deepStrictEqual(headerVal, constants.NULL_OBJECT);
        });

        it('Header is valid but value not present', function() {
            var headerVal = fileServer.getHeaderValue(constants.HTTP_SAMPLE_HEADER_1, constants.HTTP_ACCEPT_ENCODING_HEADER_STR);
            assert.deepStrictEqual(headerVal, constants.NULL_OBJECT);
        });

        it('Header is valid and value present', function() {
            var headerVal = fileServer.getHeaderValue(constants.HTTP_SAMPLE_HEADER_2, constants.HTTP_ACCEPT_ENCODING_HEADER_STR);
            assert.deepStrictEqual(headerVal, constants.HTTP_ENCODING_TYPE_VALID);

            headerVal = fileServer.getHeaderValue(constants.HTTP_SAMPLE_HEADER_2, constants.HTTP_IF_MATCH_HEADER_STR);
            assert.deepStrictEqual(headerVal, constants.HTTP_IF_MATCH_HEADER_VAL);
        });

    });

    describe('Verify If-Match header', function() {

        it('If-Match header is *', function() {
            var ifMatch = fileServer.checkIfMatch(constants.HTTP_ETAG_VALID, constants.HTTP_IF_MATCH_HEADER_VAL_ALL);
            assert.deepStrictEqual(ifMatch, true);
        });

        it('If-Match header has a matching value', function() {
            var ifMatch = fileServer.checkIfMatch(constants.HTTP_ETAG_VALID, constants.HTTP_IF_MATCH_HEADER_VAL);
            assert.deepStrictEqual(ifMatch, true);
        });

        it('If-Match header does not have a matching value', function() {
            var ifMatch = fileServer.checkIfMatch(constants.HTTP_ETAG_MISSING, constants.HTTP_IF_MATCH_HEADER_VAL);
            assert.deepStrictEqual(ifMatch, false);
        });

    });

    describe('Verify If-None-Match header', function() {
        
        it('If-None-Match header has a matching etag - strong comparison', function() {
            var ifNoneMatch = fileServer.checkIfNoneMatch(constants.HTTP_ETAG_VALID, constants.HTTP_IF_NONE_MATCH_HEADER_VAL);
            assert.deepStrictEqual(ifNoneMatch, false);
        });

        it('If-None-Match header has a matching etag - weak comparison', function() {
            var ifNoneMatch = fileServer.checkIfNoneMatch(constants.HTTP_ETAG_VALID_WEAK, constants.HTTP_IF_NONE_MATCH_HEADER_VAL);
            assert.deepStrictEqual(ifNoneMatch, false);
        });

        it('If-None-Match header has no matching etag', function() {
            var ifNoneMatch = fileServer.checkIfNoneMatch(constants.HTTP_ETAG_MISSING, constants.HTTP_IF_NONE_MATCH_HEADER_VAL);
            assert.deepStrictEqual(ifNoneMatch, true);
        });
    });


    describe('Verify If-Modified-Since header', function() {

        it('If-Modified-Since header has older timestamp', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() + 5);

            var ifModifiedSince = fileServer.checkIfModifiedSince(Date.parse(modificationTime), constants.HTTP_MODIFICATION_TIMESTAMP);
            assert.deepStrictEqual(ifModifiedSince, true);
        });

        it('If-Modified-Since header has newer timestamp', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() - 5);

            var ifModifiedSince = fileServer.checkIfModifiedSince(Date.parse(modificationTime), constants.HTTP_MODIFICATION_TIMESTAMP);
            assert.deepStrictEqual(ifModifiedSince, false);
        });

        it('If-Modified-Since header has invalid timestamp', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);

            var ifModifiedSince = fileServer.checkIfModifiedSince(Date.parse(modificationTime), constants.HTTP_DATE_INVALID);
            assert.deepStrictEqual(ifModifiedSince, true);
            
        });
        
    });

    describe('Verify If-Unmodified-Since header', function() {

        it('If-Unmodified-Since header has older timestamp', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() + 5);

            var ifUnmodifiedSince = fileServer.checkIfUnmodifiedSince(Date.parse(modificationTime), constants.HTTP_MODIFICATION_TIMESTAMP);
            assert.deepStrictEqual(ifUnmodifiedSince, false);            
        });


        it('If-Unmodified-Since header has newer timestamp', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() - 5);

            var ifUnmodifiedSince = fileServer.checkIfUnmodifiedSince(Date.parse(modificationTime), constants.HTTP_MODIFICATION_TIMESTAMP);
            assert.deepStrictEqual(ifUnmodifiedSince, true);
        });
        
    });


    describe('Verify combination of If-None-Match and If-Modified-Since headers', function() {

        it('If-None-Match results in a match', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() - 1);

            var isModified = fileServer.isModified(Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_IS_MODIFIED_HEADER_1);
            assert.deepStrictEqual(isModified, true);
        });

        it('If-None-Match results in no match', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() + 1);

            var isModified = fileServer.isModified(Date.parse(modificationTime), constants.HTTP_ETAG_MISSING, constants.HTTP_IS_MODIFIED_HEADER_1);
            assert.deepStrictEqual(isModified, false);
        });

        it('If-None-Match is not specified and modification time is older than header time', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() - 5);

            var isModified = fileServer.isModified(Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_IS_MODIFIED_HEADER_2);
            assert.deepStrictEqual(isModified, true);

        });

        it('If-None-Match is not specified and modification time is newer than header time', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() + 5);

            var isModified = fileServer.isModified(Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_IS_MODIFIED_HEADER_2);
            assert.deepStrictEqual(isModified, false);
        });
        
    });

    describe('Verify combination of If-Match and If-Unmodified-Since headers', function() {

        it('If-Match results in a match', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() + 1);

            var isValid = fileServer.isPreconditionValid(Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_PRECONDITION_HEADER_1);
            assert.deepStrictEqual(isValid, true);
        });

        it('If-Match results in no match', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() + 1);

            var isValid = fileServer.isPreconditionValid(Date.parse(modificationTime), constants.HTTP_ETAG_MISSING, constants.HTTP_PRECONDITION_HEADER_1);
            assert.deepStrictEqual(isValid, false);
        });

        it('If-Match was not specified and modification time is older than header time', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() - 5);

            var isValid = fileServer.isPreconditionValid(Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_PRECONDITION_HEADER_2);
            assert.deepStrictEqual(isValid, true);
        });

        it('If-Match was not specified and modification time is newer than header time', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() + 5);

            var isValid = fileServer.isPreconditionValid(Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_PRECONDITION_HEADER_2);
            assert.deepStrictEqual(isValid, false);
        });
        
    });

    describe('Verify If-Range header', function() {
        
        it('Modification time is older than header time', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() - 5);

            var ifRange = fileServer.checkIfRange(Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_MODIFICATION_TIMESTAMP);
            assert.deepStrictEqual(ifRange, true);
        });

        it('Modification time is newer than header time', function() {
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            modificationTime.setDate(modificationTime.getDate() + 5);

            var ifRange = fileServer.checkIfRange(Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_MODIFICATION_TIMESTAMP);
            assert.deepStrictEqual(ifRange, false);
        });

        it('etag is found', function() {
            var ifRange = fileServer.checkIfRange(null, constants.HTTP_ETAG_VALID, constants.HTTP_IF_MATCH_HEADER_VAL);
            assert.deepStrictEqual(ifRange, true);
        });

        it('etag is not found', function() {
            var ifRange = fileServer.checkIfRange(null, constants.HTTP_ETAG_MISSING, constants.HTTP_IF_MATCH_HEADER_VAL);
            assert.deepStrictEqual(ifRange, false);
        });        
    });

    describe('Parse range sent in Range header', function() {

        it('Range unit is incorrect', function() {
            var range = fileServer.parseRange(constants.HTTP_RANGE_HEADER_VAL_INVALID_UNIT, constants.HTTP_RESOURCE_SIZE);
            assert.deepStrictEqual(range.valid, false);
        });

        it('Range has multiple ranges', function() {
            var range = fileServer.parseRange(constants.HTTP_RANGE_HEADER_VAL_MULTIPLE_RANGES, constants.HTTP_RESOURCE_SIZE);
            assert.deepStrictEqual(range.valid, false);
        });

        it('Range has non-numeric ranges', function() {
            var range = fileServer.parseRange(constants.HTTP_RANGE_HEADER_VAL_NON_NUMERIC, constants.HTTP_RESOURCE_SIZE);
            assert.deepStrictEqual(range.valid, false);
        });

        it('Range has no start value', function() {
            var range = fileServer.parseRange(constants.HTTP_RANGE_HEADER_VAL_NO_START, constants.HTTP_RESOURCE_SIZE);
            assert.deepStrictEqual(range.valid, true);
            assert.deepStrictEqual(range.start, 0);
            assert((constants.HTTP_RESOURCE_SIZE - 1) === range.end);
        });

        it('Range has no end value', function() {
            var range = fileServer.parseRange(constants.HTTP_RANGE_HEADER_VAL_NO_END, constants.HTTP_RESOURCE_SIZE);
            assert.deepStrictEqual(range.valid, true);
            assert.deepStrictEqual(range.start, 2);
            assert.deepStrictEqual(range.end, (constants.HTTP_RESOURCE_SIZE - 1));
        });

        it('Range start greater than end', function() {
            var range = fileServer.parseRange(constants.HTTP_RANGE_HEADER_VAL_INVERTED, constants.HTTP_RESOURCE_SIZE);
            assert.deepStrictEqual(range.valid, false);
        });

        it('Range end greater than size', function() {
            var range = fileServer.parseRange(constants.HTTP_RANGE_HEADER_VAL_END_SIZE, constants.HTTP_RESOURCE_SIZE);
            assert.deepStrictEqual(range.valid, false);
        });

        it('Range is valid', function() {
            var range = fileServer.parseRange(constants.HTTP_RANGE_HEADER_VAL, constants.HTTP_RESOURCE_SIZE);
            assert.deepStrictEqual(range.valid, true);
            assert.deepStrictEqual(range.start, 2);
            assert.deepStrictEqual(range.end, 15);
        });
    });

    describe('Verify combination of Range and If-Range headers', function() {

        it('If-Range is not specified, Range is not specified', function() {
            var range = { valid: false, start: 0, end: 0 };
            var isSatisfiable = fileServer.isRangeSatisfiable(constants.EMPTY_OBJECT, null, null, constants.HTTP_RESOURCE_SIZE, range);

            assert.deepStrictEqual(isSatisfiable, true);
            assert.deepStrictEqual(range.valid, false);
        })

        it('If-Range is not specified, Range is invalid', function() {
            var range = { valid: false, start: 0, end: 0 };
            var isSatisfiable = fileServer.isRangeSatisfiable(constants.HTTP_RANGE_HEADER_INVALID, null, null, constants.HTTP_RESOURCE_SIZE, range);

            assert.deepStrictEqual(isSatisfiable, false);
            assert.deepStrictEqual(range.valid, false);
        });

        it('If-Range is not specified, Range is valid', function() {
            var range = { valid: false, start: 0, end: 0 };
            var isSatisfiable = fileServer.isRangeSatisfiable(constants.HTTP_RANGE_HEADER_VALID, null, null, constants.HTTP_RESOURCE_SIZE, range);

            assert.deepStrictEqual(isSatisfiable, true);
            assert.deepStrictEqual(range.valid, true);
            assert.deepStrictEqual(range.start, 2);
            assert.deepStrictEqual(range.end, 15);
        });
        
        it('If-Range is invalid, Range is valid', function() {
            var range = { valid: false, start: 0, end: 0 };
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            var isSatisfiable = fileServer.isRangeSatisfiable(constants.HTTP_RANGE_SATISFIABLE_1, Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_RESOURCE_SIZE, range);

            assert.deepStrictEqual(isSatisfiable, true);
            assert.deepStrictEqual(range.valid, false);
        });

        it('If-Range is invalid, Range is invalid', function() {
            var range = { valid: false, start: 0, end: 0 };
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            var isSatisfiable = fileServer.isRangeSatisfiable(constants.HTTP_RANGE_SATISFIABLE_2, Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_RESOURCE_SIZE, range);

            assert.deepStrictEqual(isSatisfiable, false);
            assert.deepStrictEqual(range.valid, false);
        });

        it('If-Range is valid, Range not specified', function() {
            var range = { valid: false, start: 0, end: 0 };
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            var isSatisfiable = fileServer.isRangeSatisfiable(constants.HTTP_RANGE_SATISFIABLE_3, Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_RESOURCE_SIZE, range);

            assert.deepStrictEqual(isSatisfiable, true);
            assert.deepStrictEqual(range.valid, false);
        });

        it('If-Range is valid, Range is invalid', function() {
            var range = { valid: false, start: 0, end: 0 };
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            var isSatisfiable = fileServer.isRangeSatisfiable(constants.HTTP_RANGE_SATISFIABLE_4, Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_RESOURCE_SIZE, range);

            assert.deepStrictEqual(isSatisfiable, false);
            assert.deepStrictEqual(range.valid, false);
        });

        it('If-Range is valid, Range is valid', function() {
            var range = { valid: false, start: 0, end: 0 };
            var modificationTime = new Date(constants.HTTP_MODIFICATION_TIMESTAMP);
            var isSatisfiable = fileServer.isRangeSatisfiable(constants.HTTP_RANGE_SATISFIABLE_5, Date.parse(modificationTime), constants.HTTP_ETAG_VALID, constants.HTTP_RESOURCE_SIZE, range);

            assert.deepStrictEqual(isSatisfiable, true);
            assert.deepStrictEqual(range.valid, true);
            assert.deepStrictEqual(range.start, 2);
            assert.deepStrictEqual(range.end, 15);
        });
    });

    describe('Checking listener count', function() {

        it('Event has no listeners', function() {
            var events = require('events');
            var eventEmitter = new events.EventEmitter();

            var listeners = fileServer.hasListeners(eventEmitter, constants.EVENT_TYPE);
            assert.deepStrictEqual(listeners, false);
        });

        it('Event has one listener', function() {
            var events = require('events');
            var eventEmitter = new events.EventEmitter();

            eventEmitter.on(constants.EVENT_TYPE, function() {});

            var listeners = fileServer.hasListeners(eventEmitter, constants.EVENT_TYPE);
            assert.deepStrictEqual(listeners, true);
        });
        
    });

    describe('Validating index files list', function() {

        it('indexFiles option is not set', function() {
            var valid = fileServer.validateIndexFilesList(constants.EMPTY_OBJECT);

            assert.deepStrictEqual(valid, true);
        });

        it('indexFiles option has non-string value', function() {
            var valid = fileServer.validateIndexFilesList(constants.OPTIONS_INDEX_FILES_INVALID);

            assert.deepStrictEqual(valid, false);
        });

        it('indexFiles option has valid values', function() {
            var valid = fileServer.validateIndexFilesList(constants.OPTIONS_INDEX_FILES_VALID);

            assert.deepStrictEqual(valid, true);
        });

    });

    describe('Checking for malicious path', function() {

        it('Path is malicious', function() {
            var malicious = fileServer.isMaliciousPath(constants.PATH_FULL_MALICIOUS, constants.PATH_ROOT);

            assert.deepStrictEqual(malicious, true);
        });

        it('Path is not malicious', function() {
            var malicious = fileServer.isMaliciousPath(constants.PATH_FULL_NON_MALICIOUS, constants.PATH_ROOT);

            assert.deepStrictEqual(malicious, false);
        });
        
    });

    describe('Validating construction of Server', function() {
        
        it('indexFiles option has non-string value', function() {
            assert.throws(
                () => {
                    var server = new fileServer.Server(constants.PATH_ROOT, constants.OPTIONS_INDEX_FILES_INVALID);
                },
                function(err)
                {
                    return (err instanceof TypeError);
                }
            );
        });
    });

}); // end describe
