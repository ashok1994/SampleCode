/**
 * Firebase Database Util to use realtime features available
 */

var config = require('../config');
var log = require('../logger');
var admin = require("firebase-admin");
var serviceAccount = require("../firebase-config.json");
var Ticket = require('../dbschema/Ticket');

var ticketRootKey = config.FIREBASE_ROOT_TICKET_KEY;

function checkAccepted(vendorResponses) {
    var accepted = false;
    if (Array.isArray(vendorResponses)) {
        accepted = vendorResponses.some(function (vResponse) {
            return vResponse.acceptStatus == true;
        });
    }

    return accepted;
}

function mappedVendorResponse(vendorResponses) {
    var fireb_vendor_response = {};
    if (!Array.isArray(vendorResponses)) {
        return fireb_vendor_response;
    }

    vendorResponses.forEach(function (vResponse) {
        fireb_vendor_response[vResponse._id.toString()] = {
            responseText: vResponse.responseText,
            responseImages: vResponse.responseImages.length,
            price: vResponse.price,
            acceptStatus: vResponse.acceptStatus

        }
    });

    return fireb_vendor_response;
}

function FirebaseTicket(ticket) {
    this.shortId = ticket.shortId || "NA";
    this.city = ticket.city || "NA";
    this.title = ticket.title || "NA";
    this.query = ticket.query[ticket.query.length - 1].text || "NA";
    this.queryImages = ticket.queryImages.length || 0;
    this.dateCreated = ticket.dateCreated.toGMTString() || "NA";
    this.accepted = checkAccepted(ticket.vendorResponse);
    this.forum = ticket.forum.length || 0;
    this.status = ticket.ticketStatus || "NA";
    this.vendorResponses = mappedVendorResponse(ticket.vendorResponse);

}


exports.updateTickets = function () {
    log.info("FIREBASE UPDATE TICKETS CALLED");
    var db = admin.database();
    var ref = db.ref(ticketRootKey);
    Ticket
        .find({})
        .sort('-dateCreated')
        .lean()
        .exec(function (err, tickets) {
            if (err) {
                return log.error(err);
            }

            var firebaseTickets = {};
            tickets.forEach(function (ticket) {
                firebaseTickets[ticket._id.toString()] = new FirebaseTicket(ticket);
            }, this);

            ref.set(firebaseTickets, function (err) {
                if (err) {
                    return log.error(err);
                }
                return log.info('Tickets synced');
            });
        });

}

exports.updateTicket = function (id) {
    log.info("FIREBASE UPDATE TICKET " + id);
    var db = admin.database();
    var ref = db.ref(ticketRootKey + "/" + id);
    Ticket.findById(id)
        .lean()
        .exec(function (err, ticket) {
            if (err) {
                return log.error(err);
            }

            var firebaseTicket = new FirebaseTicket(ticket);
            ref.update(firebaseTicket, function (err) {
                if (err) {
                    return log.error(err);
                }
                return log.info("Ticket Updated : ID - " + id);
            });

        });
}


exports.deleteTicket = function (id) {
    var db = admin.database();
    var ref = db.ref(ticketRootKey + "/" + id);
    ref.remove(function (err) {
        if (err) {
            return log.error(err);
        }
        return log.info("Ticket Removed ID - " + id);
    });
}