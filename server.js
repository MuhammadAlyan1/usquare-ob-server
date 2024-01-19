const express = require('express');
const bodyParser = require('body-parser');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const app = express();
const port = 3000;
const he = require('he');

app.use(bodyParser.json());

app.get('/fetch-emails', async (req, res) => {
  // Create an IMAP connection using imapflow
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'alyan0332@gmail.com',
      pass: 'krac hfjx sdis lvgu'
    }
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

    let lock = await client.getMailboxLock('INBOX');
    try {
      for await (let message of client.fetch(
        {
          sentSince: yesterday.toISOString()
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
          bodyParts: ['TEXT']
        }
      )) {
        console.log(message);

        const parsedEmail = await simpleParser(message.source);
        console.log('PARSED EMAIL: ', parsedEmail);

        const bodyText =
          Buffer.from(message?.bodyParts?.get('text'))?.toString('ascii') || '';
        const data = parsePlainTextData(bodyText);

        const vehicleQueryRegex = /you have a new vehicle inquiry/gi;

        let htmlToTextData = null;
        if (parsedEmail?.textAsHtml.match(vehicleQueryRegex)) {
          htmlToTextData = parseHtmlToTextData(parsedEmail?.textAsHtml);
        }

        emails.push({
          uid: message?.uid,
          date: message?.envelope?.date,
          subject: message?.envelope?.subject,
          form: message?.envelope?.form?.address,
          bodyText: bodyText,
          data,
          parsedEmail,
          htmlToTextData
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
    res.status(500).json({ error: 'Error fetching emails' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const parsePlainTextData = (bodyText) => {
  if (!bodyText) return null;

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
    InteriorColor: interiorColorMatch ? interiorColorMatch[1].trim() : null,
    ExteriorColor: exteriorColorMatch ? exteriorColorMatch[1].trim() : null,
    DealerPrice: dealerPriceMatch
      ? parseFloat(dealerPriceMatch[1].replace(/,/g, ''))
      : null
  };

  // Extract customer information
  const customerMatch = bodyText.match(/Customer([\s\S]+?)Source="([^"]+)"/);
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
    Source: customerMatch ? customerMatch[2].trim() : null
  };

  return {
    Date: date,
    Vehicle: vehicleObject,
    Customer: customerObject
  };
};

const parseHtmlToTextData = (text) => {
  if (!text) return null;

  const regex = {
    year: /year:\s*[\d]{4}/gi,
    make: /make:\s*([a-z]+\s*)*/gi,
    model: /model:\s*([a-z]+\s*)*/gi,
    color: /color:\s*([a-z]+\s*)*/gi,
    price: /price:\s*\$([\d]*,?)+/gi,
    mileage: /mileage:\s*([\d]*,?)+/gi,
    stockNumber: /stock\s*#:\s[a-z0-9]+/gi,
    lot: /Lot:\s*(.*?)(?=<\/p>)/gi,
    customerMetaData: /comments<br\/>(.*?)<br\/>\d{10}<br\/>/gi,
    comment: /comments<br\/>[a-z\s.,']*<br\/>/gi,
    phoneNumber: /<br\/>(\d*)<br\/>/gi,
    fullName: /<br\/>[a-z]*\s*[a-z]*\s*[a-z]*\s*<br\/>/gi
  };

  const yearResult = text.match(regex.year);
  const year = yearResult && yearResult[0]?.split(':')[1]?.trim();

  const makeResult = text.match(regex.make);
  const make = makeResult && he.decode(makeResult[0]?.split(':')[1]?.trim());

  const modelResult = text.match(regex.model);
  const model = modelResult && he.decode(modelResult[0]?.split(':')[1]?.trim());

  const colorResult = text.match(regex.color);
  const color = colorResult && he.decode(colorResult[0]?.split(':')[1]?.trim());

  const priceResult = text.match(regex.price);
  const price = priceResult && priceResult[0]?.split(':')[1]?.trim();

  const mileageResult = text.match(regex.mileage);
  const mileage =
    mileageResult && he.decode(mileageResult[0]?.split(':')[1]?.trim());

  const stockNumberResult = text.match(regex.stockNumber);
  const stockNumber =
    stockNumberResult && he.decode(stockNumberResult[0]?.split(':')[1]?.trim());

  const lotResult = text.match(regex.lot);
  const lot = lotResult && he.decode(lotResult[0]?.split(':')[1]?.trim());

  const customerMetaDataString = text.match(regex.customerMetaData);

  const commentResult = customerMetaDataString[0]?.match(regex.comment);
  const comment =
    commentResult && he.decode(commentResult[0]?.split('<br/>')[1]?.trim());

  const phoneNumberResult = customerMetaDataString[0].match(regex.phoneNumber);
  const phoneNumber =
    phoneNumberResult && phoneNumberResult[0]?.split('<br/>')[1]?.trim();

  const fullNameResult = customerMetaDataString[0].match(regex.fullName);
  const fullName =
    fullNameResult && he.decode(fullNameResult[0]?.split('<br/>')[1]?.trim());

  return {
    year: year || null,
    make: make || null,
    model: model || null,
    color: color || null,
    price: price || null,
    mileage: mileage || null,
    stockNumber: stockNumber || null,
    lot: lot || null,
    comment: comment || null,
    fullName: fullName || null,
    phoneNumber: phoneNumber || null
  };
};
