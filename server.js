const express = require("express");
const Imap = require("node-imap");

const app = express();
const port = 3000;

const imapConfig = {
  user: "alyan0332@gmail.com",
  password: "krac hfjx sdis lvgu",
  host: "imap.gmail.com",
  port: 993, // IMAP SSL port
  tls: true,
};

app.get("/retrieveEmails", (req, res) => {
  const imap = new Imap(imapConfig);

  imap.once("ready", () => {
    imap.openBox("INBOX", true, (err, box) => {
      if (err) {
        res.status(500).json({ error: "Error opening mailbox" });
        return;
      }

      // Search for all unseen emails
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const searchCriteria = [
        "ALL",
        ["SINCE", yesterday.toISOString()],
        // ["BEFORE", today.toISOString()],
      ];
      imap.search(searchCriteria, (searchErr, results) => {
        if (searchErr) {
          res.status(500).json({ error: "Error searching for emails" });
          return;
        }

        const maxEmails = 10;
        const fetch = imap.fetch(results, { bodies: "", max: maxEmails });
        const emails = [];

        fetch.on("message", (msg) => {
          const email = {};

          msg.on("body", (stream, info) => {
            console.log("INFO: ", info);
            let buffer = "";

            stream.on("data", (chunk) => {
              buffer += chunk.toString("utf8");
            });

            stream.on("end", () => {
              if (info.which === "TEXT") {
                email.content = buffer;
                console.log(buffer);
              }
            });
          });

          msg.once("attributes", (attrs) => {
            console.log("ATTRIBUTES STRUCTED: ", attrs);
            email.date = attrs?.date;
          });

          emails.push(email);
          // console.log(email);
        });

        fetch.once("end", () => {
          imap.end();
          res.json(emails);
          fetch.removeAllListeners("message");
          fetch.removeAllListeners("end");
        });
      });
    });
  });

  imap.once("error", (err) => {
    res.status(500).json({ error: "Error connecting to email server" });
  });

  imap.connect();
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
