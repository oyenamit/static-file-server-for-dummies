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
 * @file Common include file for test scripts of static file server.
 * @copyright Copyright (C) 2018 Namit Bhalla (oyenamit@gmail.com)
 * @license GPL-3.0-or-later
 */


var constants = {

    // -----------------------------------------------------------------------------------------------------------
    // constants for test-server
    // -----------------------------------------------------------------------------------------------------------
    ROOT_FOLDER: './Fixtures',
    TEXT_FILENAME: 'afile.txt',
    MALICIOUS_PATH: '../' + this.TEXT_FILENAME,
    NON_EXISTING_PATH: 'this path should not exist',
    DEFAULT_INDEX_FILE_PATH: 'GetDefaultIndexFile',
    CUSTOM_INDEX_FILE_PATH: 'GetCustomIndexFile',

    FOLDER_PATH: 'GetFolder',
    FOLDER_NO_JSON_PATH: 'GetFolderNoJSON',
    FOLDER_MALFORMED_JSON_PATH: 'GetFolderMalformedJSON',
    FOLDER_INCORRECT_JSON_PATH: 'GetFolderIncorrectJSON',
    FOLDER_MALICIOUS_JSON_PATH: 'GetFolderMaliciousPathJSON',
    FOLDER_NON_EXISTING_FILE_JSON_PATH: 'GetFolderNonExistingFileJSON',


    // -----------------------------------------------------------------------------------------------------------
    // constants for unit-tests
    // -----------------------------------------------------------------------------------------------------------
    EMPTY_OBJECT: {},
    NULL_OBJECT: null,
    EMPTY_STR: '',
    EMPTY_LIST: [],
    STR_COMMA: ',',
    STR_SEMI_COLON: ';',

    HTTP_DATE_VALID: 'Thu Dec 07 2017 18:55:12 GMT',
    HTTP_DATE_INVALID: 'abcd',
    HTTP_DATE_OLD_FORMAT: 'Thu, 14-Dec-17 08:49:37 GMT',

    HTTP_ENCODING_TYPE_VALID: 'deflate',
    HTTP_ACCEPT_ENCODING_HEADER_EMPTY: {'Accept-Encoding': ''},
    HTTP_ACCEPT_ENCODING_WEIGHT_0_A: {'Accept-Encoding': 'identity;q=0,gzip, deflate'},
    HTTP_ACCEPT_ENCODING_WEIGHT_0_B: {'Accept-Encoding': 'compress, *;q=0'},
    HTTP_ACCEPT_ENCODING_WEIGHT_0_C: {'Accept-Encoding': 'deflate;q=0'},
    HTTP_ACCEPT_ENCODING_SUPPORTED:  {'Accept-Encoding': 'deflate;q=1'},

    HTTP_HEADER_VAL_STR: 'abc, bcde  ,f',
    HTTP_HEADER_VAL_LIST: ['abc', 'bcde', 'f'],
    HTTP_HEADER_VAL_LIST_2: ['abc,bcde,f'],
    HTTP_HEADER_VAL_STR_1ITEM: 'xy z',
    HTTP_HEADER_VAL_LIST_1ITEM: ['xyz'],

    HTTP_SAMPLE_HEADER_1: {'If-None-Match': 'W/\"abc\", \"xyz\"', 'Range': 'bytes=2-5' },
    HTTP_SAMPLE_HEADER_2: {'Accept-Encoding': 'Deflate', 'Range': 'bytes=2-5', 'If-Match': 'w/\"abc\", \"15325279-10-1512653114000\"' },
    HTTP_ACCEPT_ENCODING_HEADER_STR: 'Accept-Encoding',
    HTTP_IF_MATCH_HEADER_STR: 'If-Match',
    HTTP_IF_MATCH_HEADER_VAL_ALL: '\"*\"',
    HTTP_ETAG_VALID_WEAK: 'w/\"15325279-10-1512653114000\"',

    HTTP_IF_NONE_MATCH_HEADER_VAL: 'w/\"Witness Me !!!\", w/\"15325279-10-1512653114000\"',

    HTTP_MODIFICATION_TIMESTAMP: 'Thu Dec 07 2017 10:55:12 GMT',

    HTTP_RANGE_HEADER_VAL: 'bytes=2-15',
    HTTP_RESOURCE_SIZE: 20,
    HTTP_RANGE_HEADER_VAL_INVALID_UNIT: 'range=42-88',
    HTTP_RANGE_HEADER_VAL_MULTIPLE_RANGES: 'bytes=100-200,150-188',
    HTTP_RANGE_HEADER_VAL_NON_NUMERIC: 'bytes=a-b',
    HTTP_RANGE_HEADER_VAL_NO_END: 'bytes=2-',
    HTTP_RANGE_HEADER_VAL_INVERTED: 'bytes=10-5',

    EVENT_TYPE: 'error',

    OPTIONS_INDEX_FILES_INVALID: { 'indexFiles': ['default.html', 10, 'index.html'] },
    OPTIONS_INDEX_FILES_VALID: { 'indexFiles': ['default.html', 'index.html'] },

    PATH_ROOT: '/www/public',
    PATH_FULL_MALICIOUS: '/www/home/work',
    PATH_FULL_NON_MALICIOUS: '/www/public/index.html',


    // -----------------------------------------------------------------------------------------------------------
    // constants for test-client-http-req-resp
    // -----------------------------------------------------------------------------------------------------------
    SERVER_URL: 'http://localhost:3000',

    HTTP_ACCEPT_RANGES_HEADER_NAME: 'accept-ranges',
    HTTP_ACCEPT_RANGES_HEADER_VAL : 'bytes',
    HTTP_DATE_HEADER_NAME: 'date',
    HTTP_LAST_MODIFIED_HEADER_NAME: 'last-modified',
    HTTP_ETAG_HEADER_NAME: 'etag',
    HTTP_CONTENT_LENGTH_HEADER_NAME: 'content-length',
    HTTP_CONTENT_DISPOSITION_HEADER_NAME: 'content-disposition',
    HTTP_CONTENT_TYPE_HEADER_NAME: 'content-type',

    HTTP_IF_MATCH_HEADER_NO_MATCH_VAL: 'w/\"abc\", \"this value should never be found\"',

    HTTP_IF_NONE_MATCH_HEADER_VAL_2: 'w/\"Witness Me !!!\", \"15325279-10-1512653114000\"',
    HTTP_IF_NONE_MATCH_HEADER_WEAK_VAL: 'w/\"Witness Me !!!\", w/\"15325279-10-1512653114000\"',
    HTTP_IF_NONE_MATCH_HEADER_NO_MATCH_VAL: 'w/\"Witness Me !!!\", \"this value should never be found\"',

    HTTP_OLDER_TIMESTAMP: 'Thu Dec 07 2017 02:55:12 GMT',
    HTTP_NEWER_TIMESTAMP: 'Thu Dec 07 2017 21:55:12 GMT',
    HTTP_DATE_INVALID: 'abcd',


    // -----------------------------------------------------------------------------------------------------------
    // constants common between unit-tests and test-client-http-req-resp
    // -----------------------------------------------------------------------------------------------------------
    HTTP_ETAG_VALID: '\"15325279-10-1512653114000\"',
    HTTP_ETAG_MISSING: '\"this etag should never be found\"',
    HTTP_IF_MATCH_HEADER_VAL: 'w/\"abc\", \"15325279-10-1512653114000\"',
};


constants.HTTP_IS_MODIFIED_HEADER_1 = { 'If-None-Match': constants.HTTP_IF_NONE_MATCH_HEADER_VAL, 'If-Modified-Since': constants.HTTP_MODIFICATION_TIMESTAMP };
constants.HTTP_IS_MODIFIED_HEADER_2 = { 'If-Modified-Since': constants.HTTP_MODIFICATION_TIMESTAMP };
constants.HTTP_PRECONDITION_HEADER_1 = { 'If-Match': constants.HTTP_IF_MATCH_HEADER_VAL, 'If-Unmodified-Since': constants.HTTP_MODIFICATION_TIMESTAMP };
constants.HTTP_PRECONDITION_HEADER_2 = { 'If-Unmodified-Since': constants.HTTP_MODIFICATION_TIMESTAMP };
constants.HTTP_RANGE_HEADER_VAL_NO_START = 'bytes=-' + constants.HTTP_RESOURCE_SIZE;
constants.HTTP_RANGE_HEADER_VAL_END_SIZE = 'bytes=0-' + constants.HTTP_RESOURCE_SIZE;

constants.HTTP_RANGE_HEADER_INVALID = { 'Range': constants.HTTP_RANGE_HEADER_VAL_INVERTED };
constants.HTTP_RANGE_HEADER_VALID = { 'Range': constants.HTTP_RANGE_HEADER_VAL };

constants.HTTP_RANGE_SATISFIABLE_1 = { 'If-Range': 'invalid', 'Range': constants.HTTP_RANGE_HEADER_VAL };
constants.HTTP_RANGE_SATISFIABLE_2 = { 'If-Range': 'invalid', 'Range': constants.HTTP_RANGE_HEADER_VAL_INVERTED };
constants.HTTP_RANGE_SATISFIABLE_3 = { 'If-Range': constants.HTTP_ETAG_VALID },
constants.HTTP_RANGE_SATISFIABLE_4 = { 'If-Range': constants.HTTP_ETAG_VALID, 'Range': constants.HTTP_RANGE_HEADER_VAL_NON_NUMERIC };
constants.HTTP_RANGE_SATISFIABLE_5 = { 'If-Range': constants.HTTP_ETAG_VALID, 'Range': constants.HTTP_RANGE_HEADER_VAL };



const frozenConstants = Object.freeze(constants);

module.exports = frozenConstants;
