const nodemailer = require('nodemailer');
const os = require("os");
const hostname = os.hostname();
const homedir = os.homedir();
const tokens = require(`${homedir}/.token.json`);
const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
    tokens.clientID,
    tokens.clientSecret,
    tokens.redirectURL
);

oauth2Client.setCredentials({
    refresh_token: tokens.refresh_token,
});

async function mailer(model) {
    const accessToken = await oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.tormail,
            clientId: tokens.clientID,
            clientSecret: tokens.clientSecret,
            refreshToken: tokens.refresh_token,
            accessToken: accessToken.token,
            pool: true,
        },
    });

    const mailOptions = {
        from: `${model.fromText} <${process.env.tormail}>`,
        to: model.to,
        cc: model.cc,
        bcc: model.bcc,
        subject: model.subject,
        generateTextFromHTML: true,
        html: model.html,
        attachments: model.attachments ? model.attachments : null
    };

    try {
        let response = await smtpTransport.sendMail(mailOptions);
        console.log("Email sent:", response);
        smtpTransport.close();
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        smtpTransport.close();
        return false;
    }
}

async function sendErrorEmail(error) {
    if (hostname.includes("local")) return console.log("Localhost, no email sent");
    try {
        const model = {
            fromText: "Error",
            to: "filatei@torama.ng",
            cc: null,
            bcc: null,
            subject: `MONGODB Error in ${hostname}`,
            html: `<h1>There was a database error in ${hostname}</h1><p>${error}</p>`,
            attachments: null
        };
        await mailer(model);

    } catch (error) {
        console.error("Error in sendErrorEmail function:", error);
    }

}

module.exports = sendErrorEmail;
