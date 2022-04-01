
const Imap = require("imap");
const fs = require('fs');
const express = require('express');

const app = express();
require('dotenv').config();

var Config = {
    user: process.env['EMAIL'],
    password: process.env['PASSWORD'],
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
        rejectUnauthorized: false
    }
};

function initMailReader() {

    const mailServer = new Imap(Config);

    function addNewRead(date, to, from, subject) {
        let file_path = `${__dirname}/data/${new Date().toLocaleDateString().replaceAll('/', '-')}.json`;
        let meta_file_path = `${__dirname}/data/meta.json`;
        let new_read_data = {
            "Date": new Date(date),
            "To": to,
            "From": from,
            "Subject": subject
        };
        if (fs.existsSync(file_path)) {
            let raw_data = fs.readFileSync(file_path);
            let mail_reads = JSON.parse(raw_data);
            mail_reads.push(new_read_data);
            fs.writeFileSync(file_path, JSON.stringify(mail_reads));
        } else {
            let mail_reads = [new_read_data]
            fs.writeFileSync(file_path, JSON.stringify(mail_reads));
        }

        let meta_data;
        let today_date = new Date().toLocaleDateString().replaceAll('/', '-');
        if (fs.existsSync(meta_file_path)) {
            let raw_data = fs.readFileSync(meta_file_path);
            meta_data = JSON.parse(raw_data);
            meta_data['total']++;
            if (meta_data[today_date]) {
                meta_data[today_date]++;
            } else {
                meta_data[today_date] = 1;
            }
        } else {
            meta_data = { "total": 1, [today_date]: 1 }
        }
        fs.writeFileSync(meta_file_path, JSON.stringify(meta_data));

    }

    function readEmailFromInbox(mailServer, no_of_recent_emails) {
        mailServer.openBox('INBOX', false, function (err, box) {
            if (err) throw err;
            mailServer.search(["UNSEEN"], function (err, results) {
                let total_messages = box.messages.total
                var f = mailServer.seq.fetch(total_messages - no_of_recent_emails + ":*", { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], markSeen: true });
                f.on('message', function (msg, seqno) {
                    let prefix = '(#' + seqno + ') ';
                    msg.on('body', function (stream, info) {
                        let buffer = '';
                        stream.on('data', function (chunk) {
                            buffer += chunk.toString('utf8');
                        });
                        stream.once('end', function () {
                            let meta_data = Imap.parseHeader(buffer);
                            addNewRead(meta_data['date'][0], meta_data['to'][0], meta_data['from'][0], meta_data['subject'][0])
                        });
                    });

                    msg.once('attributes', function (attrs) {
                        let uid = attrs.uid;
                        mailServer.addFlags(uid, ['\\Seen'], function (err) {
                            if (err) {
                                throw err;
                            }
                        });
                    })

                });

                f.once('error', function (err) {
                    throw err;
                });
                f.once('end', function () {
                    // console.log('Done fetching all messages!');
                    //mailServer.end();
                });
            })
        });
    }

    mailServer.once('ready', (err, box) => {
        if (err) throw err;
        console.log("Successfully Connected to mail Server.");
        readEmailFromInbox(mailServer, 0)// Initially reading 10 emails
    })


    mailServer.on('mail', () => {
        readEmailFromInbox(mailServer, 0)
    })

    mailServer.connect()
}

module.exports = { initMailReader: initMailReader }