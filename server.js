const express = require("express");
const bodyParser = require("body-parser");
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const app = express();
const port = 3000;
const he = require("he");

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date = new Date(today);
    date.setDate(today.getDate() - 5);

    let lock = await client.getMailboxLock("INBOX");
    try {
      for await (let message of client.fetch(
        {
          sentSince: date.toISOString(),
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
        const parsedEmail = await simpleParser(message.source);

        const bodyText =
          Buffer.from(message?.bodyParts?.get("text"))?.toString("ascii") || "";
        const data = parsePlainTextData(bodyText);

        const vehicleQueryRegex = /you have a new vehicle inquiry/gi;
        const autoTraderRegex = /\*autotrader\*/gi;

        let htmlToTextData = null;
        if (parsedEmail?.textAsHtml?.match(vehicleQueryRegex)) {
          htmlToTextData = parseHtmlToTextData(parsedEmail?.textAsHtml);
        } else if (parsedEmail?.textAsHtml?.match(autoTraderRegex)) {
          htmlToTextData = parseAutoTraderHtmlToTextData(
            parsedEmail?.textAsHtml
          );
        }

        emails.push({
          uid: message?.uid,
          date: message?.envelope?.date,
          subject: message?.envelope?.subject,
          form: message?.envelope?.form?.address,
          data,
          htmlToTextData,
        });
      }
    } finally {
      lock.release();
    }

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
      ? parseFloat(dealerPriceMatch[1].replace(/,/g, ""))
      : null,
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
    Source: customerMatch ? customerMatch[2].trim() : null,
  };

  return {
    Date: date,
    Vehicle: vehicleObject,
    Customer: customerObject,
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
    fullName: /<br\/>[a-z]*\s*[a-z]*\s*[a-z]*\s*<br\/>/gi,
  };

  const yearResult = text.match(regex.year);
  const year = yearResult && yearResult[0]?.split(":")[1]?.trim();

  const makeResult = text.match(regex.make);
  const make = makeResult && he.decode(makeResult[0]?.split(":")[1]?.trim());

  const modelResult = text.match(regex.model);
  const model = modelResult && he.decode(modelResult[0]?.split(":")[1]?.trim());

  const colorResult = text.match(regex.color);
  const color = colorResult && he.decode(colorResult[0]?.split(":")[1]?.trim());

  const priceResult = text.match(regex.price);
  const price = priceResult && priceResult[0]?.split(":")[1]?.trim();

  const mileageResult = text.match(regex.mileage);
  const mileage =
    mileageResult && he.decode(mileageResult[0]?.split(":")[1]?.trim());

  const stockNumberResult = text.match(regex.stockNumber);
  const stockNumber =
    stockNumberResult && he.decode(stockNumberResult[0]?.split(":")[1]?.trim());

  const lotResult = text.match(regex.lot);
  const lot = lotResult && he.decode(lotResult[0]?.split(":")[1]?.trim());

  const customerMetaDataString = text.match(regex.customerMetaData);

  const commentResult = customerMetaDataString[0]?.match(regex.comment);
  const comment =
    commentResult && he.decode(commentResult[0]?.split("<br/>")[1]?.trim());

  const phoneNumberResult = customerMetaDataString[0].match(regex.phoneNumber);
  const phoneNumber =
    phoneNumberResult && phoneNumberResult[0]?.split("<br/>")[1]?.trim();

  const fullNameResult = customerMetaDataString[0].match(regex.fullName);
  const fullName =
    fullNameResult && he.decode(fullNameResult[0]?.split("<br/>")[1]?.trim());

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
    phoneNumber: phoneNumber || null,
  };
};

const parseAutoTraderHtmlToTextData = (text) => {
  if (!text) return null;

  regex = {
    customerName: /\*name:\*\s*([a-z]+\.?\s*)+/gi,
    email:
      /\*E-Mail Address:\* <a\s*href="mailto:([\w.-]+@([\w-]+\.)+[\w-]{2,4})/gi,
    phoneNumber: /\*phone:\*\s\*((?!<br\/>).)+\*/gi,
    bestContactTime: /\*Best Contact Time:\*\s\*((?!<br\/>).)+\*/,
    zipcode: /\*zip\s*code:\*\s*[0-9]{5}/gi,
    comment: /\*buyer\s*comments:\*<\/p><p>((?!<\/p>).)+/gi,
    vehicleMake: /\*make:\*\s*([a-z]+\.?\s*)+/gi,
    vehicleModel: /\*model:\*\s*([a-z]+\.?\s*)+/gi,
    vehicleYear: /\*year:\*\s*([0-9]+)+/gi,
    vehiclePrice: /\*price:\*\s*\$([0-9,.]+)+/gi,
    vehicleMileage: /\*mileage:\*\s*([0-9,.]+)+/gi,
    vehicleBodyStyle: /\*body\s*style:\*\s*[a-z\s,]+/gi,
    vehicleVin: /\*vin:\*\s*[a-z0-9]+/gi,
    vehicleTrim: /\*trim:\*\s*[a-z0-9/\s.,]+/gi,
    vehicleColor: /\*color:\*\s*[a-z/\s.,]+/gi,
    vehicleCylinders: /\*cylinders:\*\s*[a-z0-9-/\s.,]+/gi,
    vehicleTransmission: /\*transmission:\*\s*[a-z-/\s.,]+/gi,
    vehicleStockId: /\*stock\s*id:\*\s*[a-z0-9]+/gi,
    vehicleDescription: /\*vehicle\s*description:\*<\/p><p>((?!<\/p>).)+/gi,
  };

  const fullNameResult = text.match(regex.customerName);
  const fullName = fullNameResult[0]?.split(/\*name:\*/gi)[1]?.trim();

  const emailResult = text.match(regex.email);
  const email = emailResult && emailResult[0]?.split("mailto:")[1]?.trim();

  const phoneNumberResult = text.match(regex.phoneNumber);
  let phoneNumber =
    phoneNumberResult && phoneNumberResult[0]?.split(/\*phone:\*/gi)[1]?.trim();

  if (phoneNumber.match(/\*Customer did not specify\*/gi)) {
    phoneNumber = null;
  }

  const bestContactTimeResult = text.match(regex.bestContactTime);
  let bestContactTime =
    bestContactTimeResult &&
    bestContactTimeResult[0]?.split(/\*Best Contact Time:\*/gi)?.[1].trim();

  if (bestContactTime.match(/\*Customer did not specify\*/gi)) {
    bestContactTime = null;
  }

  const zipcodeResult = text.match(regex.zipcode);
  const zipcode =
    zipcodeResult && zipcodeResult[0]?.split(/\*zip\s*code:\*/gi)[1]?.trim();

  const commentResult = text.match(regex.comment);
  const comment =
    commentResult &&
    commentResult[0]?.split(/\*buyer\s*comments:\*\s*<\/p><p>/gi)[1]?.trim();

  const vehicleMakeResult = text.match(regex.vehicleMake);
  const vehicleMake =
    vehicleMakeResult && vehicleMakeResult[0]?.split(/\*make:\*/gi)[1]?.trim();

  const vehicleModelResult = text.match(regex.vehicleModel);
  const vehicleModel =
    vehicleModelResult &&
    vehicleModelResult[0]?.split(/\*model:\*/gi)[1]?.trim();

  const vehicleYearResult = text.match(regex.vehicleYear);
  const vehicleYear =
    vehicleYearResult && vehicleYearResult[0]?.split(/\*year:\*/gi)[1]?.trim();

  const vehiclePriceResult = text.match(regex.vehiclePrice);
  const vehiclePrice =
    vehiclePriceResult &&
    vehiclePriceResult[0]?.split(/\*price:\*/gi)[1]?.trim();

  const vehicleMileageResult = text.match(regex.vehicleMileage);
  const vehicleMileage =
    vehicleMileageResult &&
    vehicleMileageResult[0]?.split(/\*mileage:\*/gi)[1]?.trim();

  const vehicleBodyStyleResult = text.match(regex.vehicleBodyStyle);
  const vehicleBodyStyle =
    vehicleBodyStyleResult &&
    vehicleBodyStyleResult[0]?.split(/\*body\s*style:\*/gi)[1]?.trim();

  const vehicleVinResult = text.match(regex.vehicleVin);
  const vehicleVin =
    vehicleVinResult && vehicleVinResult[0]?.split(/\*vin:\*/gi)[1]?.trim();

  const vehicleTrimResult = text.match(regex.vehicleTrim);
  const vehicleTrim =
    vehicleTrimResult && vehicleTrimResult[0]?.split(/\*trim:\*/gi)[1]?.trim();

  const vehicleColorResult = text.match(regex.vehicleColor);
  const vehicleColor =
    vehicleColorResult &&
    vehicleColorResult[0]?.split(/\*color:\*/gi)[1]?.trim();

  const vehicleCylindersResult = text.match(regex.vehicleCylinders);
  const vehicleCylinders =
    vehicleCylindersResult &&
    vehicleCylindersResult[0]?.split(/\*cylinders:\*/gi)[1]?.trim();

  const vehicleTransmissionResult = text.match(regex.vehicleTransmission);
  const vehicleTransmission =
    vehicleTransmissionResult &&
    vehicleTransmissionResult[0]?.split(/\*transmission:\*/gi)[1]?.trim();

  const vehicleStockIdResult = text.match(regex.vehicleStockId);
  const vehicleStockId =
    vehicleStockIdResult &&
    vehicleStockIdResult[0]?.split(/\*stock\s*id:\*/gi)[1]?.trim();

  const vehicleDescriptionResult = text.match(regex.vehicleDescription);
  const vehicleDescription =
    vehicleDescriptionResult &&
    vehicleDescriptionResult[0]
      ?.split(/\*vehicle\s*description:\*\s*<\/p><p>/gi)[1]
      ?.trim();

  return {
    customerName: fullName || null,
    customerEmail: email || null,
    customerPhone: phoneNumber || null,
    bestContactTime: bestContactTime || null,
    zipcode: parseInt(zipcode) || null,
    customerComments: comment || null,
    vehicleMake: vehicleMake || null,
    vehicleModel: vehicleModel || null,
    vehicleYear: parseInt(vehicleYear) || null,
    vehiclePrice: vehiclePrice || null,
    vehicleMileage: vehicleMileage || null,
    vehicleBodyStyle: vehicleBodyStyle || null,
    vehicleVin: vehicleVin || null,
    vehicleTrim: vehicleTrim || null,
    vehicleColor: vehicleColor || null,
    vehicleCylinders: vehicleCylinders || null,
    vehicleTransmission: vehicleTransmission || null,
    vehicleStockId: vehicleStockId || null,
    vehicleDescription: vehicleDescription || null,
  };
};
