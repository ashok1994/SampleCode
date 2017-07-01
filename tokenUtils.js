// var app = require('../server');
var config = require('../config');
var jwt = require('jwt-simple');
var crypto = require('crypto');
var log = require('../logger.js');
var redisApi = require('./redisApi');
var async = require('async');
exports.getTokenArray = function () {
    return tokens;
};

exports.storeToken = function (token) {
    // TODO: Implement something that has better search efficency.
    //tokens.push(token);
};

exports.removeAuthToken = function (token) {
    // TODO: Write something better than liner search.
    // for (var counter = 0; counter < tokens.length; counter++) {
    //     if (tokens[counter] == token) {
    //         tokens.splice(counter, 1);
    //         break;
    //     }
    // }
    // 
    if (!redisApi.getStatus()) {
        log.warn('Redis Not Active . Could not remove token');
        return;
    }

    redisApi.redisDel(token, function (stat) {
        if (stat) {
            log.info('Redis Key Deleted');
        }
    });

    return 0;
};

exports.decodeToken = function (encryptedToken) {

    try {
        var token = jwt.decode(encryptedToken, config.JWT_TOKEN_SECRET);
        return token;
    } catch (err) {
        console.error("Token decode error!" + err);
    }
    return "";

};

exports.newAuthToken = function (id, cb) {
    // Fallback -- Not using a callback
    if (!cb) cb = function () { };

    var expires = new Date();
    expires.setDate((new Date()).getDate() + 1);

    var token = jwt.encode({
        id: id,
        expires: expires
    }, config.JWT_TOKEN_SECRET);

    async.waterfall([setTokenToRedis], function (err, result) {
        if (err) cb(err);
        else cb(null, result);
        // console.log(result);
    });

    function setTokenToRedis(callback) {
        if (!redisApi.getStatus()) {
            log.warn('Redis not available. Could not add token ');
            return callback(null, token);
        }

        redisApi.redisSet(token, (new Date()).getTime(), config.AUTH_TOKEN_TTL, function (result) {
            if (!result) {
                callback('Could not set token');
            } else {
                callback(null, token);
            }
        });
    }
    return token;
};

exports.getuserIdFromToken = function (encryptedToken) {
    if (!encryptedToken) return "";
    try {
        var token = jwt.decode(encryptedToken, config.JWT_TOKEN_SECRET); //decodeToken(token)
        return token.id;
    } catch (e) {
        console.log("Invalid access token");
        console.log(e);
        return null;
    }
};

exports.getuserLoginSourceFromToken = function (encryptedToken) {
    if (!encryptedToken) return "";
    var token = jwt.decode(encryptedToken, config.JWT_TOKEN_SECRET);
    return token.loginSource;
}


// Added but not tested(below)

exports.newUserToken = function (email, password, method) {
    if (!email) {
        return "";
    } else {
        if (!password) {
            return "";
        }
        var expires = new Date();
        expires.setDate((new Date()).getDate() + 1);
        var token = jwt.encode({
            userEmail: email,
            password: password,
            method: method,
            expires: expires
        }, config.JWT_USER_VERIFICATION_SECRET);
        return token;
    }
};


/*
 * Function: randomValueHex
 * Purpose: Generate a random hex string
 */
exports.randomValueHex = function (len) {

    return crypto.randomBytes(Math.ceil(len / 2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, len); // return required number of characters
}

exports.getPayLinkToken = function (data) {
    return jwt.encode(data, config.PAYMENT_LINK_VERIFICATION_SECRET);
}

exports.decodePayLinkToken = function (token) {
    var data = '';
    try {
        data = jwt.decode(token, config.PAYMENT_LINK_VERIFICATION_SECRET);
        return data;
    } catch (e) {
        return '';
    }
}

//Vendor Token - For App
exports.newVendorToken = function (id, callback) {
    //Set One Year Expiry
    var expires = new Date();
    expires.setFullYear((new Date()).getFullYear() + 1);

    // Encode with secret
    var token = jwt.encode({
        id: id,
        expires: expires
    }, config.JWT_TOKEN_SECRET);

    if (!redisApi.getStatus()) {
        log.warn('Redis Not Active . Could not remove token');
        return callback("Redis not ready");
    }
    redisApi.redisSet(token, (new Date()).getTime(), config.VENDOR_TOKEN_TTL, function (stat) {
        if (!stat) {
            return callback("Could not set");
        }
        return callback(null, token);
    })
}

exports.encodeObject = function (obj, callback) {
    var token = jwt.encode(obj, config.JWT_TOKEN_SECRET);

    if (!redisApi.getStatus()) {
        log.warn('Redis Not Active . Could not remove token');
        return callback("Redis not ready");
    }

    redisApi.redisSet(token, (new Date()).getTime(), 60 * 60 * 24 * 30, function (stat) {
        if (!stat) {
            return callback("Could not set");
        }
        return callback(null, token);
    })
}

exports.removeToken = function (token, callback) {
    if (!redisApi.getStatus()) {
        log.warn('Redis Not Active . Could not remove token');
        if (callback)
            return callback("Redis not ready");
        return;
    }
    redisApi.redisDel(token, callback);
}