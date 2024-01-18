const express = require("express");
const bodyParser = require("body-parser");
const { ImapFlow } = require("imapflow");

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.get("/fetch-emails", async (req, res) => {
  // Create an IMAP connection using imapflow
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: "alyan0332@gmail.com",
      pass: "krac hfjx sdis lvgu",
    },
  });

  try {
    // Wait until client connects and authorizes
    await client.connect();

    const emails = [];
    // Select and lock a mailbox. Throws if mailbox does not exist
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to the beginning of the day

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1); // Set to the beginning of the next day

    let lock = await client.getMailboxLock("INBOX");
    try {
      for await (let message of client.fetch(
        {
          sentSince: yesterday.toISOString(),
        },
        {
          envelope: true,
          uid: true,
          flags: true,
          internalDate: true,
          size: true,
          source: true,
          threadId: true,
          labels: true,
          headers: true,

          bodyParts: ["TEXT"],
        }
      )) {
        console.log("BODY PARTS: ", message.bodyParts);
        const bodyText =
          Buffer.from(message?.bodyParts?.get("text"))?.toString("ascii") || "";

        const dateMatch = bodyText.match(/Date: ([^\n]+)/);
        const date = dateMatch ? dateMatch[1].trim() : null;

        // Extract vehicle information
        const vinMatch = bodyText.match(/VIN: ([^\n]+)/);
        const yearMatch = bodyText.match(/Year: (\d+)/);
        const makeMatch = bodyText.match(/Make: ([^\n]+)/);
        const modelMatch = bodyText.match(/Model: ([^\n]+)/);
        const stockMatch = bodyText.match(/Stock: ([^\n]+)/);
        const trimMatch = bodyText.match(/Trim: ([^\n]+)/);
        const interiorColorMatch = bodyText.match(/Interior color: ([^\n]+)/);
        const exteriorColorMatch = bodyText.match(/Exterior color: ([^\n]+)/);
        const dealerPriceMatch = bodyText.match(/Dealer Price: \$([\d,]+)/);

        const vehicleObject = {
          VIN: vinMatch ? vinMatch[1].trim() : null,
          Year: yearMatch ? parseInt(yearMatch[1]) : null,
          Make: makeMatch ? makeMatch[1].trim() : null,
          Model: modelMatch ? modelMatch[1].trim() : null,
          Stock: stockMatch ? stockMatch[1].trim() : null,
          Trim: trimMatch ? trimMatch[1].trim() : null,
          InteriorColor: interiorColorMatch
            ? interiorColorMatch[1].trim()
            : null,
          ExteriorColor: exteriorColorMatch
            ? exteriorColorMatch[1].trim()
            : null,
          DealerPrice: dealerPriceMatch
            ? parseFloat(dealerPriceMatch[1].replace(/,/g, ""))
            : null,
        };

        // Extract customer information
        const customerMatch = bodyText.match(
          /Customer([\s\S]+?)Source="([^"]+)"/
        );
        const firstNameMatch = bodyText.match(/First name: (\S+)/);
        const lastNameMatch = bodyText.match(/Last name: (\S+)/);
        const emailMatch = bodyText.match(/E-mail: (\S+)/);
        const phoneMatch = bodyText.match(/Phone: (\S+)/);
        const cityMatch = bodyText.match(/City: (\S+)/);
        const stateMatch = bodyText.match(/State: (\S+)/);
        const postalCodeMatch = bodyText.match(/Postal Code: (\S+)/);
        const commentsMatch = bodyText.match(/Comments: ([^\n]+)/);

        const customerObject = {
          FirstName: firstNameMatch ? firstNameMatch[1].trim() : null,
          LastName: lastNameMatch ? lastNameMatch[1].trim() : null,
          Email: emailMatch ? emailMatch[1].trim() : null,
          Phone: phoneMatch ? phoneMatch[1].trim() : null,
          City: cityMatch ? cityMatch[1].trim() : null,
          State: stateMatch ? stateMatch[1].trim() : null,
          PostalCode: postalCodeMatch ? postalCodeMatch[1].trim() : null,
          Comments: commentsMatch ? commentsMatch[1].trim() : null,
          Source: customerMatch ? customerMatch[2].trim() : null,
        };

        console.log("MESSAGE: ", message);

        emails.push({
          uid: message?.uid,
          date: message?.envelope?.date,
          subject: message?.envelope?.subject,
          form: message?.envelope?.form?.address,
          bodyText: bodyText,
          data: {
            Date: date,
            Vehicle: vehicleObject,
            Customer: customerObject,
          },
        });
      }

      // console.log(emails);
    } finally {
      // Make sure the lock is released; otherwise, the next `getMailboxLock()` never returns
      lock.release();
    }

    // Log out and close connection
    await client.logout();

    res.json(emails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching emails" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
