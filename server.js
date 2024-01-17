const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const mapRouter = require("./routes/map");
const connectDB = require("./db/connection.js");

const { google } = require("googleapis");
const open = require("open");

connectDB();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/map", mapRouter);

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

// Load client secrets from the downloaded JSON file
const credentials = require("./client_secret_420693168755-6tipq6us357slpk0sahscs7kra4g19cu.apps.googleusercontent.com.json");
// Set up the OAuth client
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Function to list emails and return JSON response
async function listEmails(req, res) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["INBOX"],
      maxResults: 10,
    });

    const messages = response.data.messages;
    if (messages && messages.length) {
      console.log("List of emails:");

      const emailsData = [];

      for (const message of messages) {
        const email = await gmail?.users?.messages?.get({
          userId: "me",
          id: message.id,
        });

        const subjectHeader = email?.data?.payload?.headers?.find(
          (header) => header.name === "Subject"
        );
        const subject = subjectHeader ? subjectHeader.value : "No Subject";

        const bodyPart = email?.data?.payload?.parts?.find(
          (part) => part.mimeType === "text/plain"
        );
        const body = bodyPart
          ? Buffer.from(bodyPart.body.data, "base64").toString("utf-8")
          : "No Body";

        emailsData.push({ subject, body });
      }
      return emailsData;
    } else {
      console.log("No emails found.");
      res.json({ error: "No emails found." });
    }
  } catch (error) {
    console.error("Error retrieving emails:", error.message);
    res.status(500).json({ error: "Error retrieving emails." });
  }
}

app.get("/authorize", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("Authorize this app by visiting:", authUrl);
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const emailsData = await listEmails();
    res.status(200).json(emailsData);
  } catch (error) {
    console.error("Error retrieving token:", error.message);
    res.status(500).send("Error during authorization process.");
  }
});

mongoose.connection.once("open", () => {
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${process.env.PORT || 3000}`);
  });
});
